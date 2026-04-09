import Link from "next/link";
import { BookOpen, PlusCircle, ArrowRight } from "lucide-react";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import {
  getPortfolioContinuePath,
  PORTFOLIO_STATUS_LABEL,
} from "@/lib/portfolio-workflow";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";

export default async function PortfoliosPage() {
  const session = await getRequiredSession("/portfolios");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="px-6 py-10">
      <PageHeader
        eyebrow="Portfolios"
        title="我的作品集"
        description="每份作品集是一个独立的组装对象。选入 Project、确认结构、生成前后页、修改并发布。"
        actions={
          <Button asChild className="h-11 rounded-none px-5">
            <Link href="/portfolios/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              新建作品集
            </Link>
          </Button>
        }
      />

      {/* 2px structural divider */}
      <div className="mt-6 -mx-6 border-t-2 border-black" />

      <div className="mt-6">
        {portfolios.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6 text-neutral-400" />}
            title="还没有作品集"
            description="作品集是把多个项目组装成一份完整作品集的地方。先把项目做到可进入作品集阶段，再来这里创建。"
            action={
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button asChild className="h-11 rounded-none px-5">
                  <Link href="/portfolios/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新建作品集
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-none px-5">
                  <Link href="/projects">先去整理项目</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <div>
            {/* Meta row */}
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">
                全部作品集 · {portfolios.length} 份
              </p>
              {portfolios[0] && portfolios[0].status !== "DRAFT" ? (
                <Link
                  href={getPortfolioContinuePath(portfolios[0]).href}
                  className="group inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900"
                >
                  继续：{portfolios[0].name}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {portfolios.map((portfolio) => {
                const continuePath = getPortfolioContinuePath(portfolio);
                const statusLabel = PORTFOLIO_STATUS_LABEL[portfolio.status] ?? portfolio.status;
                const projectCount = portfolio.projectIds.length;

                return (
                  <Link
                    key={portfolio.id}
                    href={continuePath.href}
                    className="group relative flex flex-col border border-neutral-300 bg-white/88 p-5 backdrop-blur-sm transition-colors hover:bg-white"
                  >
                    <span className="absolute left-0 top-0 h-full w-[2px] bg-transparent transition-colors group-hover:bg-brand-red" />
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-medium text-neutral-900">
                          {portfolio.name}
                        </p>
                        <p className="mt-1 text-xs font-mono text-neutral-400">
                          {portfolio.updatedAt.toLocaleDateString("zh-CN", {
                            month: "short",
                            day: "numeric",
                          })} 更新
                        </p>
                      </div>
                      <span className="shrink-0 border border-neutral-200 px-2 py-0.5 text-xs font-mono uppercase tracking-wide text-neutral-500">
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
                      <p className="text-xs text-neutral-500">
                        {projectCount > 0
                          ? `已选入 ${projectCount} 个项目`
                          : "尚未选入项目"}
                      </p>
                      <ArrowRight className="h-3.5 w-3.5 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
