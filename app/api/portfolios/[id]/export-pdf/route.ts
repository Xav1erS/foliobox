import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlan } from "@/lib/entitlement";
import type { PortfolioPackagingContent } from "@/lib/portfolio-editor";
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
    select: { id: true, name: true, contentJson: true },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!portfolio.contentJson) {
    return NextResponse.json({ error: "请先生成作品集包装结果" }, { status: 400 });
  }

  const content = portfolio.contentJson as PortfolioPackagingContent | null;
  if (!content?.pages?.length) {
    return NextResponse.json({ error: "请先生成作品集包装结果" }, { status: 400 });
  }

  try {
    const pdfBuffer = await renderPortfolioPdf({
      portfolioName: portfolio.name,
      content,
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
