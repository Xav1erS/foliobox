import { notFound } from "next/navigation";
import Link from "next/link";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
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
      contentJson: true,
      projectIds: true,
    },
  });

  if (!portfolio) notFound();

  const published = await db.publishedPortfolio.findFirst({
    where: { userId: session.user.id, portfolioId: portfolio.id, isPublished: true },
    orderBy: { updatedAt: "desc" },
    select: { slug: true },
  });

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
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
          <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
            <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-neutral-400">
              Projects
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
              {portfolio.projectIds.length}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-500">当前纳入这份作品集的项目数量。</p>
          </div>
          <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
            <p className="text-eyebrow font-mono uppercase tracking-[0.18em] text-neutral-400">
              Packaging
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
              {portfolio.contentJson ? "Ready" : "Pending"}
            </p>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              {portfolio.contentJson ? "已生成作品集包装结果，可继续发布与导出。" : "还没有作品集包装结果，建议先回编辑器生成。"}
            </p>
          </div>
          <div className="border border-neutral-300 bg-neutral-950 px-4 py-4 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.65)]">
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
          hasPackaging={Boolean(portfolio.contentJson)}
          initialSlug={published?.slug ?? null}
        />
      </div>
    </div>
  );
}
