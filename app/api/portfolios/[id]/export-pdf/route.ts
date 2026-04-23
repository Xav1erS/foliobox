import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlan } from "@/lib/entitlement";
import { resolvePortfolioEditorState, resolvePortfolioPackagingContent } from "@/lib/portfolio-editor";
import {
  getPortfolioPublishBlockReason,
  validatePortfolioPackaging,
} from "@/lib/portfolio-editor-validation";
import {
  PortfolioPdfRendererUnavailableError,
  renderPortfolioPdf,
} from "@/lib/portfolio-pdf";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await requirePlan(session.user.id, "pdf_export");
  if (!allowed) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const { id } = await params;
  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, name: true, projectIds: true, outlineJson: true, contentJson: true },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const selectedProjects = await db.project.findMany({
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
  });
  const orderedProjects = portfolio.projectIds
    .map((projectId) => selectedProjects.find((project) => project.id === projectId) ?? null)
    .filter(Boolean)
    .map((project) => ({
      id: project!.id,
      name: project!.name,
      stage: project!.stage,
      packageMode: project!.packageMode,
      updatedAt: project!.updatedAt.toISOString(),
      layoutJson: project!.layoutJson,
      background: project!.facts?.background ?? null,
      resultSummary: project!.facts?.resultSummary ?? null,
    }));
  const content = resolvePortfolioPackagingContent(portfolio.contentJson);
  const editorState = resolvePortfolioEditorState(portfolio.outlineJson);
  const validation = validatePortfolioPackaging({
    selectedProjectIds: portfolio.projectIds,
    fixedPages: editorState.fixedPages,
    projects: orderedProjects,
    packaging: content,
  });
  const blockReason = getPortfolioPublishBlockReason({ packaging: content, validation });
  if (blockReason) {
    return NextResponse.json({ error: blockReason }, { status: 400 });
  }

  try {
    const pdfBuffer = await renderPortfolioPdf({
      portfolioName: portfolio.name,
      content: content!,
    });
    const filename = `${portfolio.name.replace(/[\\/:*?"<>|]/g, "-") || "portfolio"}.pdf`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof PortfolioPdfRendererUnavailableError) {
      return NextResponse.json(
        {
          error: "pdf_renderer_unavailable",
          message: "当前环境缺少 PDF 渲染器，暂时无法生成正式 PDF。",
        },
        { status: 503 }
      );
    }

    console.error("portfolio pdf export failed:", error);
    return NextResponse.json({ error: "正式 PDF 导出失败，请稍后重试" }, { status: 500 });
  }
}
