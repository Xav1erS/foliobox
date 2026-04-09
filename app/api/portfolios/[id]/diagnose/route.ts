import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  mergePortfolioEditorState,
  resolvePortfolioEditorState,
  type PortfolioDiagnosis,
} from "@/lib/portfolio-editor";

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
    },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const selectedProjects =
    portfolio.projectIds.length > 0
      ? await db.project.findMany({
          where: { id: { in: portfolio.projectIds }, userId: session.user.id },
          select: {
            id: true,
            name: true,
            stage: true,
            packageMode: true,
            layoutJson: true,
          },
        })
      : [];

  const orderedProjects = portfolio.projectIds
    .map((projectId) => selectedProjects.find((project) => project.id === projectId))
    .filter(Boolean);

  const editorState = resolvePortfolioEditorState(portfolio.outlineJson);
  const enabledFixedPages = editorState.fixedPages.filter((page) => page.enabled);
  const layoutReadyCount = orderedProjects.filter(
    (project) => project?.stage === "READY" || project?.layoutJson
  ).length;
  const packageReadyCount = orderedProjects.filter(
    (project) => project?.packageMode || project?.layoutJson
  ).length;

  const overallVerdict: PortfolioDiagnosis["overallVerdict"] =
    orderedProjects.length === 0
      ? "insufficient"
      : layoutReadyCount === orderedProjects.length && enabledFixedPages.length >= 2
        ? "ready"
        : packageReadyCount >= Math.max(1, Math.ceil(orderedProjects.length / 2))
          ? "almost_ready"
          : "needs_work";

  const diagnosis: PortfolioDiagnosis = {
    overallVerdict,
    summary:
      overallVerdict === "insufficient"
        ? "这份作品集还没有选入项目，当前不足以进入整份包装。"
        : overallVerdict === "ready"
          ? "当前项目选择、固定页和项目就绪度已经足够，可以进入作品集包装生成。"
          : overallVerdict === "almost_ready"
            ? "作品集已经具备初步包装基础，但仍有部分项目缺少稳定的排版结果。"
            : "当前已选项目还不够稳定，建议先补齐项目排版与固定页设置，再进入作品集包装。",
    checks: [
      {
        key: "selection",
        label: "项目选择",
        status:
          orderedProjects.length >= 3
            ? "strong"
            : orderedProjects.length >= 1
              ? "adequate"
              : "missing",
        comment:
          orderedProjects.length === 0
            ? "还没有选入项目。"
            : `当前已选 ${orderedProjects.length} 个项目。`,
      },
      {
        key: "project_readiness",
        label: "项目就绪度",
        status:
          layoutReadyCount === orderedProjects.length && orderedProjects.length > 0
            ? "strong"
            : packageReadyCount > 0
              ? "adequate"
              : orderedProjects.length > 0
                ? "weak"
                : "missing",
        comment:
          orderedProjects.length === 0
            ? "没有可判断的项目。"
            : `${layoutReadyCount}/${orderedProjects.length} 个项目已有排版结果，${packageReadyCount}/${orderedProjects.length} 个项目已有包装结论。`,
      },
      {
        key: "fixed_pages",
        label: "固定页组织",
        status:
          enabledFixedPages.length >= 3
            ? "strong"
            : enabledFixedPages.length >= 2
              ? "adequate"
              : enabledFixedPages.length >= 1
                ? "weak"
                : "missing",
        comment:
          enabledFixedPages.length > 0
            ? `已启用 ${enabledFixedPages.length} 个固定页。`
            : "还没有启用固定页。",
      },
    ],
    suggestions: [
      orderedProjects.length === 0 ? "先从项目池中选入 2-4 个最能代表能力面的项目。" : null,
      layoutReadyCount < orderedProjects.length
        ? "优先补齐未生成排版的项目，避免作品集节奏和信息密度失衡。"
        : null,
      enabledFixedPages.length < 2 ? "至少保留封面和结尾页，保证整份作品集有开场和收束。" : null,
    ].filter(Boolean) as string[],
    updatedAt: new Date().toISOString(),
  };

  const nextEditorState = mergePortfolioEditorState(portfolio.outlineJson, {
    diagnosis,
  });

  await db.portfolio.update({
    where: { id: portfolio.id },
    data: {
      outlineJson: nextEditorState as unknown as Prisma.InputJsonValue,
      status: orderedProjects.length > 0 ? "OUTLINE" : "DRAFT",
    },
  });

  return NextResponse.json({ diagnosis });
}

