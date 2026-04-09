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
  resolvePortfolioEditorState,
  type PortfolioPackagingContent,
  type PortfolioPackagingPage,
} from "@/lib/portfolio-editor";
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
    },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (portfolio.projectIds.length === 0) {
    return NextResponse.json({ error: "请先选入至少一个项目" }, { status: 400 });
  }

  const [entitlementSummary, portfolioActionSummary] = await Promise.all([
    getEntitlementSummary(session.user.id),
    getPortfolioActionSummary(session.user.id, portfolio.id),
  ]);

  const actionType = portfolioActionSummary.packagingGenerations.used > 0
    ? "portfolio_packaging_regeneration"
    : "portfolio_packaging_generation";
  const actionQuota =
    actionType === "portfolio_packaging_regeneration"
      ? portfolioActionSummary.packagingRegenerations
      : portfolioActionSummary.packagingGenerations;

  const selectedProjects = await db.project.findMany({
    where: { id: { in: portfolio.projectIds }, userId: session.user.id },
    select: {
      id: true,
      name: true,
      stage: true,
      packageMode: true,
      layoutJson: true,
      facts: {
        select: {
          background: true,
          resultSummary: true,
        },
      },
    },
  });

  const orderedProjects = portfolio.projectIds
    .map((projectId) => selectedProjects.find((project) => project.id === projectId))
    .filter(Boolean);

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
  const reusable = await findReusableGeneratedDraft({
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

  if (reusable) {
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

    const packaging = reusable.draft.contentJson as PortfolioPackagingContent;
    await db.portfolio.update({
      where: { id: portfolio.id },
      data: {
        contentJson: reusable.draft.contentJson as Prisma.InputJsonValue,
        status: "EDITOR",
      },
    });

    return NextResponse.json({
      packaging,
      reused: true,
      precheck: {
        suggestedMode: "reuse",
        failureCounts: false,
        consumesQuota: false,
      },
    });
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

  orderedProjects.forEach((project, index) => {
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
    narrativeSummary: `这份作品集以 ${orderedProjects
      .slice(0, 2)
      .map((project) => project?.name)
      .filter(Boolean)
      .join("、")} 为核心案例，结合固定页组织出完整的开场、主体与收束节奏。`,
    pages,
    qualityNotes: [
      orderedProjects.some((project) => !project?.layoutJson)
        ? "仍有项目缺少稳定排版结果，后续可优先补齐项目级 narrative。"
        : "当前项目都具备基础排版结果，可继续细化页面顺序与内容密度。",
      `当前项目包装模式分布：${orderedProjects
        .map((project) => `${project?.name}（${packageModeLabel(project?.packageMode)}）`)
        .join("、")}`,
    ],
    generatedAt: new Date().toISOString(),
    styleProfile,
  };

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

    await db.portfolio.update({
      where: { id: portfolio.id },
      data: {
        contentJson: packaging as unknown as Prisma.InputJsonValue,
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

    return NextResponse.json({ packaging, taskId: task.id, draftId: draft.id });
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
