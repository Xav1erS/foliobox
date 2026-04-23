import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasRemainingQuota, requirePlan } from "@/lib/entitlement";
import { resolvePortfolioEditorState, resolvePortfolioPackagingContent } from "@/lib/portfolio-editor";
import {
  getPortfolioPublishBlockReason,
  validatePortfolioPackaging,
} from "@/lib/portfolio-editor-validation";
import { renderPortfolioPublishedHtml } from "@/lib/portfolio-publishing";

function generateSlug(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let slug = "";
  for (let i = 0; i < 8; i++) slug += chars[Math.floor(Math.random() * chars.length)];
  return slug;
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await requirePlan(session.user.id, "publish_link");
  if (!allowed) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const quotaResult = await hasRemainingQuota(session.user.id, "publishLinks");
  const { id } = await params;

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      projectIds: true,
      outlineJson: true,
      contentJson: true,
      status: true,
    },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existingPublished = await db.publishedPortfolio.findFirst({
    where: { userId: session.user.id, portfolioId: portfolio.id },
    orderBy: { updatedAt: "desc" },
  });

  if (!existingPublished && !quotaResult.allowed) {
    return NextResponse.json(
      { error: "quota_exceeded", summary: quotaResult.summary },
      { status: 403 }
    );
  }

  const [selectedProjects] = await Promise.all([
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

  const publishedHtml = renderPortfolioPublishedHtml({
    portfolioName: portfolio.name,
    content: content!,
  });

  let slug = existingPublished?.slug ?? generateSlug();
  let attempts = 0;
  while (attempts < 5) {
    const collision = await db.publishedPortfolio.findFirst({
      where: {
        slug,
        NOT: existingPublished ? { id: existingPublished.id } : undefined,
      },
      select: { id: true },
    });
    if (!collision) break;
    slug = generateSlug();
    attempts += 1;
  }

  if (attempts >= 5) {
    return NextResponse.json({ error: "生成链接失败，请重试" }, { status: 500 });
  }

  const published = existingPublished
    ? await db.publishedPortfolio.update({
        where: { id: existingPublished.id },
        data: {
          slug,
          publishedHtml,
          isPublished: true,
          portfolioId: portfolio.id,
          draftId: null,
        },
      })
    : await db.publishedPortfolio.create({
        data: {
          userId: session.user.id,
          portfolioId: portfolio.id,
          slug,
          publishedHtml,
          isPublished: true,
        },
      });

  await db.portfolio.update({
    where: { id: portfolio.id },
    data: { status: "PUBLISHED" },
  });

  return NextResponse.json({ slug: published.slug });
}

