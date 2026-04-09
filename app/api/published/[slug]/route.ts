import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { PortfolioPackagingContent } from "@/lib/portfolio-editor";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portfolio = await db.publishedPortfolio.findUnique({
    where: { slug, isPublished: true },
    include: {
      portfolio: {
        select: {
          id: true,
          name: true,
          contentJson: true,
        },
      },
    },
  });
  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    portfolio: {
      id: portfolio.id,
      slug: portfolio.slug,
      isPublished: portfolio.isPublished,
      portfolioId: portfolio.portfolioId,
      publishedHtml: portfolio.publishedHtml,
      structured:
        portfolio.portfolio && portfolio.portfolio.contentJson
          ? {
              name: portfolio.portfolio.name,
              content: portfolio.portfolio.contentJson as PortfolioPackagingContent,
            }
          : null,
    },
  });
}
