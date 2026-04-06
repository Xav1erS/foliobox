import Link from "next/link";
import { BookOpen, PlusCircle, ArrowRight } from "lucide-react";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { Button } from "@/components/ui/button";

const PORTFOLIO_STATUS_LABEL: Record<string, string> = {
  DRAFT: "草稿",
  SELECTION: "选择项目",
  OUTLINE: "确认结构",
  EDITOR: "修改中",
  PUBLISHED: "已发布",
};

function getPortfolioContinuePath(portfolio: { id: string; status: string }): string {
  switch (portfolio.status) {
    case "PUBLISHED":
    case "EDITOR":
      return `/portfolios/${portfolio.id}/editor`;
    case "OUTLINE":
      return `/portfolios/${portfolio.id}/outline`;
    default:
      return `/portfolios/${portfolio.id}/outline`;
  }
}

export default async function PortfoliosPage() {
  const session = await getRequiredSession("/portfolios");

  const portfolios = await db.portfolio.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
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

      <div className="mt-8">
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
          <div className="space-y-6">
            <div className="border border-neutral-300 bg-white/88 px-6 py-5 backdrop-blur-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-neutral-900">全部作品集</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    共 {portfolios.length} 份，按最近更新时间排列。
                  </p>
                </div>
                {portfolios[0] && portfolios[0].status !== "DRAFT" ? (
                  <Link
                    href={getPortfolioContinuePath(portfolios[0])}
                    className="inline-flex items-center gap-2 text-sm font-medium text-neutral-900"
                  >
                    继续：{portfolios[0].name}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {portfolios.map((portfolio) => {
                const continuePath = getPortfolioContinuePath(portfolio);
                const statusLabel = PORTFOLIO_STATUS_LABEL[portfolio.status] ?? portfolio.status;
                const projectCount = portfolio.projectIds.length;

                return (
                  <Link
                    key={portfolio.id}
                    href={continuePath}
                    className="group flex flex-col border border-neutral-300 bg-white/88 p-5 backdrop-blur-sm transition-colors hover:border-neutral-400 hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-neutral-900">
                          {portfolio.name}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          {portfolio.updatedAt.toLocaleDateString("zh-CN", {
                            month: "short",
                            day: "numeric",
                          })} 更新
                        </p>
                      </div>
                      <span className="shrink-0 border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-500">
                        {statusLabel}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-neutral-200 pt-4">
                      <p className="text-xs text-neutral-500">
                        {projectCount > 0
                          ? `已选入 ${projectCount} 个项目`
                          : "尚未选入项目"}
                      </p>
                      <ArrowRight className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
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
