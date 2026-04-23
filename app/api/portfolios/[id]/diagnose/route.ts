import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  findReusableGeneratedDraft,
  hashGenerationInput,
  writePrecheckLog,
} from "@/lib/generation-precheck";
import {
  getEntitlementSummary,
  getPortfolioActionSummary,
} from "@/lib/entitlement";
import {
  mergePortfolioEditorState,
  resolvePortfolioEditorState,
  resolvePortfolioPackagingContent,
  type PortfolioDiagnosis,
} from "@/lib/portfolio-editor";
import {
  buildPortfolioDiagnosis,
  validatePortfolioPackaging,
} from "@/lib/portfolio-editor-validation";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      projectIds: true,
      outlineJson: true,
      contentJson: true,
    },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [entitlementSummary, portfolioActionSummary] = await Promise.all([
    getEntitlementSummary(session.user.id),
    getPortfolioActionSummary(session.user.id, portfolio.id),
  ]);

  const selectedProjects =
    portfolio.projectIds.length > 0
      ? await db.project.findMany({
          where: { id: { in: portfolio.projectIds }, userId: session.user.id },
          select: {
            id: true,
            name: true,
            stage: true,
            packageMode: true,
            updatedAt: true,
            layoutJson: true,
            facts: {
              select: {
                background: true,
                resultSummary: true,
              },
            },
          },
        })
      : [];

  const orderedProjects = portfolio.projectIds
    .map((projectId) => selectedProjects.find((project) => project.id === projectId))
    .filter(Boolean);
  const editorState = resolvePortfolioEditorState(portfolio.outlineJson);
  const orderedProjectInputs = orderedProjects.map((project) => ({
    id: project!.id,
    name: project!.name,
    stage: project!.stage,
    packageMode: project!.packageMode,
    updatedAt: project!.updatedAt.toISOString(),
    layoutJson: project!.layoutJson,
    background: project!.facts?.background ?? null,
    resultSummary: project!.facts?.resultSummary ?? null,
  }));
  const diagnosis: PortfolioDiagnosis = buildPortfolioDiagnosis({
    projects: orderedProjectInputs,
    fixedPages: editorState.fixedPages,
  });
  const validation = validatePortfolioPackaging({
    selectedProjectIds: portfolio.projectIds,
    fixedPages: editorState.fixedPages,
    projects: orderedProjectInputs,
    packaging: resolvePortfolioPackagingContent(portfolio.contentJson),
  });

  const nextEditorState = mergePortfolioEditorState(portfolio.outlineJson, {
    diagnosis,
    validation,
  });

  const requestHash = hashGenerationInput({
    actionType: "portfolio_diagnosis",
    portfolioId: portfolio.id,
    projectIds: portfolio.projectIds,
    fixedPages: editorState.fixedPages,
  });

  const reusable = await findReusableGeneratedDraft({
    userId: session.user.id,
    objectType: "portfolio",
    objectId: portfolio.id,
    requestHash,
    draftType: "portfolio_diagnosis",
  });

  if (!reusable && portfolioActionSummary.diagnoses.remaining <= 0) {
    return NextResponse.json(
      { error: "quota_exceeded", summary: entitlementSummary },
      { status: 403 }
    );
  }

  if (reusable) {
    await writePrecheckLog({
      userId: session.user.id,
      objectType: "portfolio",
      objectId: portfolio.id,
      actionType: "portfolio_diagnosis",
      budgetStatus: "healthy",
      suggestedMode: "reuse",
      reusableDraftId: reusable.draft.id,
    });

    const reusedDiagnosis = reusable.draft.contentJson as PortfolioDiagnosis;
    await db.portfolio.update({
      where: { id: portfolio.id },
      data: {
        outlineJson: mergePortfolioEditorState(portfolio.outlineJson, {
          diagnosis: reusedDiagnosis,
          validation,
        }) as unknown as Prisma.InputJsonValue,
        status: orderedProjects.length > 0 ? "OUTLINE" : "DRAFT",
      },
    });

    await db.generationTask.create({
      data: {
        userId: session.user.id,
        objectType: "portfolio",
        objectId: portfolio.id,
        actionType: "portfolio_diagnosis",
        usageClass: "high_cost",
        status: "reused",
        reusedFromTaskId: reusable.task.id,
        requestHash,
        provider: reusable.task.provider,
        model: reusable.task.model,
        wasSuccessful: true,
        countedToBudget: false,
      },
    });

    return NextResponse.json({ diagnosis: reusedDiagnosis, validation, reused: true });
  }

  const task = await db.generationTask.create({
    data: {
      userId: session.user.id,
      objectType: "portfolio",
      objectId: portfolio.id,
      actionType: "portfolio_diagnosis",
      usageClass: "high_cost",
      status: "running",
      provider: "system",
      requestHash,
    },
  });

  await writePrecheckLog({
    userId: session.user.id,
    objectType: "portfolio",
    objectId: portfolio.id,
    actionType: "portfolio_diagnosis",
    budgetStatus: portfolioActionSummary.diagnoses.remaining <= 1 ? "near_limit" : "healthy",
    suggestedMode: "continue",
  });

  try {
    await db.portfolio.update({
      where: { id: portfolio.id },
      data: {
        outlineJson: nextEditorState as unknown as Prisma.InputJsonValue,
        status: orderedProjects.length > 0 ? "OUTLINE" : "DRAFT",
      },
    });

    await db.generatedDraft.create({
      data: {
        userId: session.user.id,
        objectType: "portfolio",
        objectId: portfolio.id,
        sourceTaskId: task.id,
        draftType: "portfolio_diagnosis",
        versionNumber: 1,
        contentJson: diagnosis as unknown as Prisma.InputJsonValue,
        isReusable: true,
      },
    });

    await db.generationTask.update({
      where: { id: task.id },
      data: { status: "done", wasSuccessful: true, countedToBudget: true },
    });

    return NextResponse.json({ diagnosis, validation });
  } catch (error) {
    await db.generationTask.update({
      where: { id: task.id },
      data: { status: "failed", wasSuccessful: false, countedToBudget: false },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "作品集诊断失败" },
      { status: 500 }
    );
  }
}
