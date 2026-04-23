import { notFound } from "next/navigation";
import Link from "next/link";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { resolvePortfolioEditorState, resolvePortfolioPackagingContent } from "@/lib/portfolio-editor";
import { validatePortfolioPackaging } from "@/lib/portfolio-editor-validation";
import { PageHeader } from "@/components/app/PageHeader";
import { InlineTip } from "@/components/app/InlineTip";
import { Button } from "@/components/ui/button";
import { PortfolioPublishClient } from "./PortfolioPublishClient";

export default async function PortfolioPublishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/portfolios/${id}/publish`);

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      outlineJson: true,
      contentJson: true,
      projectIds: true,
    },
  });

  if (!portfolio) notFound();

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
  const packaging = resolvePortfolioPackagingContent(portfolio.contentJson);
  const validation = validatePortfolioPackaging({
    selectedProjectIds: portfolio.projectIds,
    fixedPages: resolvePortfolioEditorState(portfolio.outlineJson).fixedPages,
    projects: orderedProjects,
    packaging,
  });

  const published = await db.publishedPortfolio.findFirst({
    where: { userId: session.user.id, portfolioId: portfolio.id, isPublished: true },
    orderBy: { updatedAt: "desc" },
    select: { slug: true },
  });

  return (
    <div className="mx-auto max-w-[1480px] px-6 py-10">
      <PageHeader
        eyebrow={`作品集 · ${portfolio.name}`}
        title="发布与导出"
        description="直接基于当前 Portfolio 包装结果生成公开链接，或导出正式 PDF。"
        actions={
          <Button asChild className="h-10 px-4">
            <Link href={`/portfolios/${portfolio.id}/editor`}>返回作品集编辑器</Link>
          </Button>
        }
      />

      <div className="mt-8 space-y-4">
        <InlineTip>
          发布主对象已经迁到 Portfolio。这里生成的公开页和正式 PDF 都直接读取当前作品集包装结果。
        </InlineTip>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="app-panel px-4 py-4">
            <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Projects
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {portfolio.projectIds.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">当前纳入这份作品集的项目数量。</p>
          </div>
          <div className="app-panel px-4 py-4">
            <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-muted-foreground">
              Packaging
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
              {validation.portfolioState === "not_ready"
                ? "Review"
                : packaging?.pages?.length
                  ? "Ready"
                  : "Pending"}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {validation.summary}
            </p>
          </div>
          <div className="app-panel-highlight px-4 py-4 text-white">
            <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-white/40">
              Output
            </p>
            <p className="mt-2 text-base font-medium leading-7">
              当前页负责公开链接和正式 PDF 的最后一步输出。
            </p>
          </div>
        </div>

        <PortfolioPublishClient
          portfolioId={portfolio.id}
          hasPackaging={Boolean(packaging?.pages?.length)}
          validation={validation}
          initialSlug={published?.slug ?? null}
        />
      </div>
    </div>
  );
}
