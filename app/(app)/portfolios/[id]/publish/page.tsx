import { notFound } from "next/navigation";
import Link from "next/link";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { InlineTip } from "@/components/app/InlineTip";
import { Button } from "@/components/ui/button";

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

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        eyebrow={`作品集 · ${portfolio.name}`}
        title="发布兼容页"
        description="Portfolio 发布与导出还在收口中；当前建议先在统一编辑器内完成作品集包装，再回到这里查看兼容状态。"
        actions={
          <Button asChild className="h-10 rounded-none px-4">
            <Link href={`/portfolios/${portfolio.id}/editor`}>返回作品集编辑器</Link>
          </Button>
        }
      />

      <div className="mt-8 space-y-4">
        <InlineTip>
          当前发布主对象仍在从旧 Draft 系统迁往 Portfolio 对象。这个页面暂时只保留为兼容层。
        </InlineTip>

        <div className="border border-neutral-200 bg-white px-4 py-4 text-sm leading-6 text-neutral-600">
          <p>已选项目：{portfolio.projectIds.length} 个</p>
          <p className="mt-1">
            当前包装状态：
            {portfolio.contentJson ? " 已生成作品集包装结果，可继续回编辑器调整。" : " 还没有作品集包装结果，建议先回编辑器生成。"}
          </p>
        </div>
      </div>
    </div>
  );
}
