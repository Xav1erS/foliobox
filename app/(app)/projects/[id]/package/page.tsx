import { notFound } from "next/navigation";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { WorkflowProgressBar } from "@/components/app/WorkflowProgressBar";
import { PackageClient } from "./PackageClient";

const PACKAGE_MODE_DETAIL = [
  {
    value: "DEEP",
    label: "深讲",
    pageRange: "8–10 页",
    description: "完整呈现问题 → 方案 → 结果全链路，是作品集主项目的标准讲法。",
    suitable: "角色清晰、有完整问题链和结果证据的核心项目",
  },
  {
    value: "LIGHT",
    label: "浅讲",
    pageRange: "3–5 页",
    description: "聚焦关键判断和核心成果，适合补充能力面、不需要铺全过程的项目。",
    suitable: "参与程度较高但非主导、或问题链不完整的项目",
  },
  {
    value: "SUPPORTIVE",
    label: "补充展示",
    pageRange: "1–3 页",
    description: "以视觉展示为主，起丰富度作用，不做完整叙事。",
    suitable: "素材质量好但背景信息较少、或纯视觉类项目",
  },
] as const;

export default async function PackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/projects/${id}/package`);

  const [project, facts] = await Promise.all([
    db.project.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        name: true,
        packageMode: true,
        _count: { select: { assets: true } },
      },
    }),
    db.projectFact.findUnique({
      where: { projectId: id },
      select: {
        projectType: true,
        involvementLevel: true,
        roleTitle: true,
        resultSummary: true,
      },
    }),
  ]);

  if (!project) notFound();

  return (
    <div className="px-6 py-10 pb-28">
      <PageHeader
        eyebrow={`项目 · ${project.name} · 环节 3/4`}
        title="骨架与包装定稿"
        description="确认这个项目该怎么讲——深讲、浅讲还是补充展示。这个选择会决定后续排版的页数和叙事结构。"
      />

      {/* 2px structural divider */}
      <div className="-mx-6 mt-6 border-t-2 border-black" />

      <WorkflowProgressBar currentStep={3} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* 主内容区 */}
        <div>
          {/* 选择包装模式 */}
          <div className="mt-6 border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-6 py-4">
              <h2 className="text-[15px] font-semibold text-neutral-900">选择包装模式</h2>
              <p className="mt-1 text-sm text-neutral-500">
                包装模式决定这个项目在作品集里的讲法深度和页数范围。
              </p>
            </div>
            <div className="p-6">
              <PackageClient
                projectId={id}
                initialMode={project.packageMode ?? null}
              />
            </div>
          </div>

          {/* 项目基本信息参考 */}
          {facts && (facts.projectType || facts.roleTitle || facts.involvementLevel || facts.resultSummary) && (
            <div className="mt-4 border border-neutral-300 bg-white">
              <div className="border-b border-neutral-300 px-6 py-4">
                <h2 className="text-[15px] font-semibold text-neutral-900">项目信息参考</h2>
              </div>
              <div className="divide-y divide-neutral-100 px-6">
                {facts.projectType && (
                  <div className="flex gap-8 py-3">
                    <span className="w-20 shrink-0 text-xs font-mono text-neutral-400">项目类型</span>
                    <span className="text-sm text-neutral-900">{facts.projectType}</span>
                  </div>
                )}
                {facts.roleTitle && (
                  <div className="flex gap-8 py-3">
                    <span className="w-20 shrink-0 text-xs font-mono text-neutral-400">我的角色</span>
                    <span className="text-sm text-neutral-900">{facts.roleTitle}</span>
                  </div>
                )}
                {facts.involvementLevel && (
                  <div className="flex gap-8 py-3">
                    <span className="w-20 shrink-0 text-xs font-mono text-neutral-400">参与程度</span>
                    <span className="text-sm text-neutral-900">
                      {facts.involvementLevel === "LEAD"
                        ? "主导"
                        : facts.involvementLevel === "CORE"
                        ? "核心成员"
                        : "参与协作"}
                    </span>
                  </div>
                )}
                {facts.resultSummary && (
                  <div className="flex gap-8 py-3">
                    <span className="w-20 shrink-0 text-xs font-mono text-neutral-400">结果摘要</span>
                    <span className="line-clamp-2 text-sm text-neutral-900">{facts.resultSummary}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-4">
          {/* 包装模式对照 */}
          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-5 py-4">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">模式说明</p>
            </div>
            <div className="divide-y divide-neutral-100">
              {PACKAGE_MODE_DETAIL.map((mode) => (
                <div key={mode.value} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-neutral-900">{mode.label}</p>
                    <span className="text-xs font-mono text-neutral-400">{mode.pageRange}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">{mode.description}</p>
                  <p className="mt-1 text-xs text-neutral-400">适合：{mode.suitable}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 当前状态 */}
          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-5 py-4">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">当前状态</p>
            </div>
            <div className="divide-y divide-neutral-100 px-5">
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-neutral-500">素材数量</span>
                <span className="text-sm font-semibold text-neutral-900">{project._count.assets} 张</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-neutral-500">当前环节</span>
                <span className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-mono text-neutral-600">
                  骨架定稿
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
