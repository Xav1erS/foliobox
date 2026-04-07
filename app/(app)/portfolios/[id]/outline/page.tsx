import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { InlineTip } from "@/components/app/InlineTip";
import { Button } from "@/components/ui/button";
import { PROJECT_STAGE_LABEL, PROJECT_STATUS_LABEL } from "@/lib/project-workflow";

export default async function PortfolioOutlinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/portfolios/${id}/outline`);

  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!portfolio) notFound();

  // Fetch user's ready projects (V3: stage=READY, or any for now as V3 flow builds out)
  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, stage: true, importStatus: true, updatedAt: true },
  });

  const selectedIds = portfolio.projectIds ?? [];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 pb-24">
      <PageHeader
        eyebrow={`作品集 · ${portfolio.name}`}
        title="选择项目与结构确认"
        description="选择要放入这份作品集的项目，确认排列顺序，系统将据此生成作品集结构。"
      />

      <div className="mt-8 space-y-6">
        <InlineTip>
          V3 项目包装流程正在建设中。目前可以先将项目加入作品集，后续排版与包装能力陆续上线。
        </InlineTip>

        <SectionCard>
          <div className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-neutral-900">选择要加入的项目</p>
              <span className="text-xs text-neutral-400">
                已选 {selectedIds.length} / 共 {projects.length} 个
              </span>
            </div>

            {projects.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm text-neutral-500">还没有可选的项目</p>
                <Button asChild variant="outline" className="h-9 rounded-none px-4 text-xs">
                  <Link href="/projects/new">去导入第一个项目</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((project) => {
                  const isSelected = selectedIds.includes(project.id);
                  return (
                    <div
                      key={project.id}
                      className={`flex items-center justify-between border px-4 py-3 ${
                        isSelected
                          ? "border-neutral-400 bg-neutral-50"
                          : "border-neutral-200"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">
                          {project.name}
                        </p>
                        <p className="mt-0.5 text-xs text-neutral-400">
                          {project.updatedAt.toLocaleDateString("zh-CN", {
                            month: "short",
                            day: "numeric",
                          })} 更新
                        </p>
                      </div>
                      <span className="ml-3 shrink-0 border border-neutral-200 bg-white px-2 py-0.5 text-xs font-mono text-neutral-500">
                        {project.stage && project.stage !== "DRAFT"
                          ? (PROJECT_STAGE_LABEL[project.stage]?.label ?? project.stage)
                          : (PROJECT_STATUS_LABEL[project.importStatus]?.label ?? "草稿")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SectionCard>

        <p className="text-center text-xs text-neutral-400">
          项目选择与顺序编辑能力正在建设中，后续版本将支持拖拽排序和包装模式确认。
        </p>
      </div>
    </div>
  );
}
