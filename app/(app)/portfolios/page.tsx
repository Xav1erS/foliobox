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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
        description="每份作品集都是一个独立组装对象。你会在里面选入项目、确认结构、生成包装、发布与导出。"
        actions={
          <Button asChild className="h-11 px-5">
            <Link href="/portfolios/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              新建作品集
            </Link>
          </Button>
        }
      />

      {/* 2px structural divider */}
      <div className="app-section-divider mt-6 -mx-6" />

      <div className="mt-6">
        {portfolios.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6 text-neutral-400" />}
            title="还没有作品集"
            description="作品集负责把多个项目收成一个完整输出对象。先准备好项目池，或者直接新建一份空白作品集开始组装。"
            action={
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Button asChild className="h-11 px-5">
                  <Link href="/portfolios/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新建作品集
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 px-5">
                  <Link href="/projects">先去整理项目</Link>
                </Button>
              </div>
            }
          />
        ) : (
          <div className="space-y-6">
            <Card className="border-border/70 bg-card/95 shadow-xs">
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-[11px]">
                      全部作品集
                    </Badge>
                    <span className="text-sm text-muted-foreground">{portfolios.length} 份</span>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    作品集阶段只保留 editor、publish 和 print 主链路。旧的结构兼容页已经退出实际工作流程。
                  </p>
                </div>
                {portfolios[0] ? (
                  <Button asChild variant="outline" className="h-10 px-4">
                    <Link href={getPortfolioContinuePath(portfolios[0]).href}>
                      继续最近：{portfolios[0].name}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                ) : null}
              </CardContent>
            </Card>

            <Separator />

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {portfolios.map((portfolio) => {
                const continuePath = getPortfolioContinuePath(portfolio);
                const statusLabel = PORTFOLIO_STATUS_LABEL[portfolio.status] ?? portfolio.status;
                const projectCount = portfolio.projectIds.length;

                return (
                  <Card
                    key={portfolio.id}
                    className="group border-border/70 bg-card/95 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-semibold text-card-foreground">
                            {portfolio.name}
                          </p>
                          <p className="mt-1 text-xs font-mono text-muted-foreground">
                            {portfolio.updatedAt.toLocaleDateString("zh-CN", {
                              month: "short",
                              day: "numeric",
                            })} 更新
                          </p>
                        </div>
                        <Badge variant="secondary" className="rounded-md px-2 py-0.5 font-mono text-[11px]">
                          {statusLabel}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                            项目池
                          </p>
                          <p className="mt-1 text-sm text-foreground/88">
                            {projectCount > 0 ? `已选入 ${projectCount} 个项目` : "尚未选入项目"}
                          </p>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{continuePath.label}</p>
                      </div>
                    </CardContent>

                    <Separator />

                    <CardFooter className="p-4">
                      <Button asChild variant="ghost" className="h-9 px-0 text-sm font-medium hover:bg-transparent">
                        <Link href={continuePath.href}>
                          继续编辑
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
