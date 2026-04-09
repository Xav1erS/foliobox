import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasRemainingQuota } from "@/lib/entitlement";
import {
  resolvePortfolioEditorState,
  type PortfolioPackagingContent,
  type PortfolioPackagingPage,
} from "@/lib/portfolio-editor";

function packageModeLabel(mode: string | null | undefined) {
  if (mode === "DEEP") return "深讲";
  if (mode === "LIGHT") return "浅讲";
  if (mode === "SUPPORTIVE") return "补充展示";
  return "待判断";
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quotaResult = await hasRemainingQuota(session.user.id, "portfolioPackagings");
  if (!quotaResult.allowed) {
    return NextResponse.json(
      { error: "quota_exceeded", summary: quotaResult.summary },
      { status: 403 }
    );
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
  };

  const task = await db.generationTask.create({
    data: {
      userId: session.user.id,
      objectType: "portfolio",
      objectId: portfolio.id,
      actionType: "portfolio_packaging_generation",
      usageClass: "high_cost",
      status: "running",
      provider: "system",
    },
  });

  try {
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

