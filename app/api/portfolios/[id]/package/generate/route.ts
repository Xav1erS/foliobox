import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getEntitlementSummary,
  getPortfolioActionSummary,
} from "@/lib/entitlement";
import {
  findReusableGeneratedDraft,
  hashGenerationInput,
  writePrecheckLog,
} from "@/lib/generation-precheck";
import {
  mergePortfolioEditorState,
  resolvePortfolioEditorState,
  resolvePortfolioPackagingContent,
  type PortfolioPackagingContent,
  type PortfolioPackagingPage,
} from "@/lib/portfolio-editor";
import {
  buildPortfolioPackagingProjectSnapshots,
  resolvePortfolioProjectAdmissions,
  stampPortfolioValidationFailure,
  validatePortfolioPackaging,
} from "@/lib/portfolio-editor-validation";
import {
  resolveStyleProfile,
  type StyleReferenceSelection,
} from "@/lib/style-reference-presets";

function packageModeLabel(mode: string | null | undefined) {
  if (mode === "DEEP") return "深讲";
  if (mode === "LIGHT") return "浅讲";
  if (mode === "SUPPORTIVE") return "补充展示";
  return "待判断";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    styleSelection?: StyleReferenceSelection | null;
  };
  const styleSelection = body.styleSelection ?? { source: "none" as const };
  const styleProfile = resolveStyleProfile(styleSelection);
  if (styleSelection.source === "reference_set" && styleSelection.referenceSetId) {
    await db.styleReferenceSet.updateMany({
      where: { id: styleSelection.referenceSetId, userId: session.user.id },
      data: { lastUsedAt: new Date() },
    });
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
  if (portfolio.projectIds.length === 0) {
    return NextResponse.json({ error: "请先选入至少一个项目" }, { status: 400 });
  }

  const [entitlementSummary, portfolioActionSummary, selectedProjects] = await Promise.all([
    getEntitlementSummary(session.user.id),
    getPortfolioActionSummary(session.user.id, portfolio.id),
    db.project.findMany({
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
    }),
  ]);

  const actionType = portfolioActionSummary.packagingGenerations.used > 0
    ? "portfolio_packaging_regeneration"
    : "portfolio_packaging_generation";
  const actionQuota =
    actionType === "portfolio_packaging_regeneration"
      ? portfolioActionSummary.packagingRegenerations
      : portfolioActionSummary.packagingGenerations;

  const orderedProjects = portfolio.projectIds
    .map((projectId) => selectedProjects.find((project) => project.id === projectId) ?? null)
    .filter(Boolean);
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
  const admissionsByProjectId = new Map(
    resolvePortfolioProjectAdmissions(orderedProjectInputs).map((item) => [item.projectId, item])
  );
  const eligibleProjects = orderedProjects.filter((project) => {
    const status = admissionsByProjectId.get(project!.id)?.status ?? "block";
    return status === "pass" || status === "warn";
  });
  const eligibleProjectInputs = orderedProjectInputs.filter((project) => {
    const status = admissionsByProjectId.get(project.id)?.status ?? "block";
    return status === "pass" || status === "warn";
  });

  const editorState = resolvePortfolioEditorState(portfolio.outlineJson);
  const requestHash = hashGenerationInput({
    actionType,
    portfolioId: portfolio.id,
    projectIds: portfolio.projectIds,
    fixedPages: editorState.fixedPages,
    selectedProjects: orderedProjects.map((project) => ({
      id: project?.id,
      layout: project?.layoutJson,
      packageMode: project?.packageMode,
    })),
    styleSelection,
  });
  let reusable = await findReusableGeneratedDraft({
    userId: session.user.id,
    objectType: "portfolio",
    objectId: portfolio.id,
    requestHash,
    draftType: "packaging",
  });

  if (!reusable && actionQuota.remaining <= 0) {
    return NextResponse.json(
      { error: "quota_exceeded", summary: entitlementSummary },
      { status: 403 }
    );
  }
  if (eligibleProjects.length === 0) {
    return NextResponse.json(
      { error: "当前选入项目都还不适合进入作品集，建议先回 Project Editor 完成项目包装。" },
      { status: 400 }
    );
  }

  if (reusable) {
    const reusablePackaging = resolvePortfolioPackagingContent(reusable.draft.contentJson);
    const reusableValidation = validatePortfolioPackaging({
      selectedProjectIds: portfolio.projectIds,
      fixedPages: editorState.fixedPages,
      projects: orderedProjectInputs,
      packaging: reusablePackaging,
    });

    if (reusableValidation.portfolioState !== "not_ready" && reusablePackaging) {
      await writePrecheckLog({
        userId: session.user.id,
        objectType: "portfolio",
        objectId: portfolio.id,
        actionType,
        budgetStatus: "healthy",
        suggestedMode: "reuse",
        reusableDraftId: reusable.draft.id,
      });

      await db.generationTask.create({
        data: {
          userId: session.user.id,
          objectType: "portfolio",
          objectId: portfolio.id,
          actionType,
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

      await db.portfolio.update({
        where: { id: portfolio.id },
        data: {
          contentJson: reusablePackaging as unknown as Prisma.InputJsonValue,
          outlineJson: mergePortfolioEditorState(portfolio.outlineJson, {
            validation: reusableValidation,
          }) as unknown as Prisma.InputJsonValue,
          status: "EDITOR",
        },
      });

      return NextResponse.json({
        packaging: reusablePackaging,
        validation: reusableValidation,
        reused: true,
        precheck: {
          suggestedMode: "reuse",
          failureCounts: false,
          consumesQuota: false,
        },
      });
    }

    reusable = null;
  }

  if (!reusable && actionQuota.remaining <= 0) {
    return NextResponse.json(
      { error: "quota_exceeded", summary: entitlementSummary },
      { status: 403 }
    );
  }

  const pages: PortfolioPackagingPage[] = [];

  editorState.fixedPages
    .filter((page) => page.enabled)
    .forEach((page) => {
      pages.push({
        id: `fixed-${page.id}`,
        type: "fixed",
        pageRole: page.id,
        title: page.label,
        summary:
          page.id === "cover"
            ? `作为《${portfolio.name}》的开场页，快速建立整份作品集的主叙事。`
            : page.id === "about"
              ? "补充个人定位、角色侧重和求职目标，帮助读者快速建立背景。"
              : "作为收束页，承接联系信息或整体反思，完成作品集闭环。",
        pageCountSuggestion: "1 页",
      });
    });

  eligibleProjects.forEach((project, index) => {
    const layout = project?.layoutJson as
      | { narrativeSummary?: string; totalPages?: number }
      | null;

    pages.push({
      id: `project-${project!.id}`,
      type: "project",
      pageRole: "project_case",
      title: project!.name,
      summary:
        layout?.narrativeSummary ??
        project!.facts?.resultSummary ??
        project!.facts?.background ??
        "当前项目还缺少稳定摘要，建议先完善项目排版后再进一步细化。",
      projectId: project!.id,
      pageCountSuggestion:
        layout?.totalPages != null
          ? `${layout.totalPages} 页参考`
          : index === 0
            ? "3-5 页"
            : "2-3 页",
    });
  });

  const packaging: PortfolioPackagingContent = {
    narrativeSummary: `这份作品集以 ${eligibleProjects
      .slice(0, 2)
      .map((project) => project?.name)
      .filter(Boolean)
      .join("、")} 为核心案例，结合固定页组织出完整的开场、主体与收束节奏。`,
    pages,
    qualityNotes: [
      eligibleProjects.some((project) => !project?.layoutJson)
        ? "仍有项目缺少稳定排版结果，后续可优先补齐项目级 narrative。"
        : "当前项目都具备基础排版结果，可继续细化页面顺序与内容密度。",
      eligibleProjects.length < orderedProjects.length
        ? `当前有 ${orderedProjects.length - eligibleProjects.length} 个项目暂不建议纳入本次包装，系统已先跳过。`
        : "当前已选项目都可进入整份作品集包装。",
      `当前项目包装模式分布：${eligibleProjects
        .map((project) => `${project?.name}（${packageModeLabel(project?.packageMode)}）`)
        .join("、")}`,
    ],
    generatedAt: new Date().toISOString(),
    styleProfile,
    projectSnapshots: buildPortfolioPackagingProjectSnapshots(eligibleProjectInputs),
  };

  const validation = validatePortfolioPackaging({
    selectedProjectIds: portfolio.projectIds,
    fixedPages: editorState.fixedPages,
    projects: orderedProjectInputs,
    packaging,
  });

  const task = await db.generationTask.create({
    data: {
      userId: session.user.id,
      objectType: "portfolio",
      objectId: portfolio.id,
      actionType,
      usageClass: "high_cost",
      status: "running",
      provider: "system",
      requestHash,
      styleReferenceSetHash:
        styleSelection.source === "reference_set"
          ? styleSelection.referenceSetId ?? undefined
          : styleSelection.source === "preset"
            ? styleSelection.presetKey ?? undefined
            : undefined,
    },
  });

  try {
    await writePrecheckLog({
      userId: session.user.id,
      objectType: "portfolio",
      objectId: portfolio.id,
      actionType,
      budgetStatus: actionQuota.remaining <= 1 ? "near_limit" : "healthy",
      suggestedMode: "continue",
    });

    if (validation.portfolioState === "not_ready") {
      const fallbackPackaging = resolvePortfolioPackagingContent(portfolio.contentJson);
      const fallbackValidation = stampPortfolioValidationFailure({
        packaging: fallbackPackaging,
        validation: validatePortfolioPackaging({
          selectedProjectIds: portfolio.projectIds,
          fixedPages: editorState.fixedPages,
          projects: orderedProjectInputs,
          packaging: fallbackPackaging,
        }),
        summary: "本次作品集包装未完成，已保留原内容。",
      });

      await db.portfolio.update({
        where: { id: portfolio.id },
        data: {
          outlineJson: mergePortfolioEditorState(portfolio.outlineJson, {
            validation: fallbackValidation,
          }) as unknown as Prisma.InputJsonValue,
        },
      });

      await db.generationTask.update({
        where: { id: task.id },
        data: { status: "failed", wasSuccessful: false, countedToBudget: false },
      });

      return NextResponse.json({
        rolledBack: true,
        message: "本次作品集包装未完成，已保留原内容。",
        validation: fallbackValidation,
      });
    }

    await db.portfolio.update({
      where: { id: portfolio.id },
      data: {
        contentJson: packaging as unknown as Prisma.InputJsonValue,
        outlineJson: mergePortfolioEditorState(portfolio.outlineJson, {
          validation,
        }) as unknown as Prisma.InputJsonValue,
        status: "EDITOR",
      },
    });

    const draft = await db.generatedDraft.create({
      data: {
        userId: session.user.id,
        objectType: "portfolio",
        objectId: portfolio.id,
        sourceTaskId: task.id,
        draftType: "packaging",
        versionNumber: 1,
        contentJson: packaging as unknown as Prisma.InputJsonValue,
        isReusable: true,
      },
    });

    await db.generationTask.update({
      where: { id: task.id },
      data: { status: "done", wasSuccessful: true, countedToBudget: true },
    });

    return NextResponse.json({ packaging, validation, taskId: task.id, draftId: draft.id });
  } catch (error) {
    await db.generationTask.update({
      where: { id: task.id },
      data: { status: "failed", wasSuccessful: false, countedToBudget: false },
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "作品集包装生成失败" },
      { status: 500 }
    );
  }
}
