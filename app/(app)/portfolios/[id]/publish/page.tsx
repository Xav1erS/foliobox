import { notFound } from "next/navigation";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { InlineTip } from "@/components/app/InlineTip";

export default async function PortfolioPublishPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/portfolios/${id}/publish`);

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!portfolio) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <PageHeader
        eyebrow={`作品集 · ${portfolio.name}`}
        title="发布与导出"
        description="生成分享链接或导出 PDF，发给目标公司的招聘方。"
      />

      <div className="mt-8">
        <InlineTip>
          发布功能（Portfolio 对象发布）正在建设中，即将上线。
        </InlineTip>
      </div>
    </div>
  );
}
