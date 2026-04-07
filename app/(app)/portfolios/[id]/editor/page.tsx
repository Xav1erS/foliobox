import { notFound } from "next/navigation";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { InlineTip } from "@/components/app/InlineTip";

export default async function PortfolioEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/portfolios/${id}/editor`);

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!portfolio) notFound();

  return (
    <div className="px-6 py-10">
      <PageHeader
        eyebrow={`作品集 · ${portfolio.name}`}
        title="指导式修改"
        description="在这里对生成结果进行局部修改，系统会在修改后给出验证结论。"
      />

      <div className="mt-6 -mx-6 border-t-2 border-black" />

      <div className="mt-6">
        <InlineTip>
          指导式修改工作台（V3 修改验证层）正在建设中，即将上线。
        </InlineTip>
      </div>
    </div>
  );
}
