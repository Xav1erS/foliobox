import { notFound } from "next/navigation";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { InlineTip } from "@/components/app/InlineTip";
import { PackageClient } from "./PackageClient";

const PACKAGE_MODES = [
  {
    value: "DEEP",
    label: "深讲",
    description: "完整呈现项目从问题到方案到结果的全链路，适合作为作品集主项目。默认 8–10 页。",
    suitable: "角色清晰、有完整问题链和结果证据的核心项目",
  },
  {
    value: "LIGHT",
    label: "浅讲",
    description: "聚焦关键判断和核心成果，不铺全量过程，适合补充能力面的次要项目。默认 3–5 页。",
    suitable: "参与程度较高但非主导、或问题链不完整的项目",
  },
  {
    value: "SUPPORTIVE",
    label: "补充展示",
    description: "主要以视觉展示为主，不做叙事，起丰富度作用。默认 1–3 页。",
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

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      name: true,
      packageMode: true,
      _count: { select: { assets: true } },
      facts: {
        select: {
          projectType: true,
          involvementLevel: true,
          roleTitle: true,
          resultSummary: true,
        },
      },
    },
  });

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-28">
      <PageHeader
        eyebrow={`项目 · ${project.name} · 环节 3/4`}
        title="骨架与包装定稿"
        description="确认这个项目该怎么讲——深讲、浅讲还是补充展示。这个选择会决定后续排版的页数和叙事结构。"
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* 主内容区 */}
        <div className="space-y-6">
          <InlineTip>
            AI 骨架分析正在建设中。你可以先手动选择包装模式，后续 AI 分析上线后会在此给出更具体的骨架建议和 page plan。
          </InlineTip>

          <SectionCard
            title="选择包装模式"
            description="包装模式决定这个项目在作品集里的讲法深度和页数范围。可以根据项目的完整度和作品集地位来判断。"
          >
            <PackageClient
              projectId={id}
              initialMode={project.packageMode ?? null}
            />
          </SectionCard>

          {project.facts && (
            <SectionCard title="项目基本信息参考">
              <div className="space-y-3 text-sm">
                {project.facts.projectType && (
                  <div className="flex gap-4">
                    <span className="w-20 shrink-0 text-neutral-400">项目类型</span>
                    <span className="text-neutral-900">{project.facts.projectType}</span>
                  </div>
                )}
                {project.facts.roleTitle && (
                  <div className="flex gap-4">
                    <span className="w-20 shrink-0 text-neutral-400">我的角色</span>
                    <span className="text-neutral-900">{project.facts.roleTitle}</span>
                  </div>
                )}
                {project.facts.involvementLevel && (
                  <div className="flex gap-4">
                    <span className="w-20 shrink-0 text-neutral-400">参与程度</span>
                    <span className="text-neutral-900">
                      {project.facts.involvementLevel === "LEAD"
                        ? "主导"
                        : project.facts.involvementLevel === "CORE"
                        ? "核心成员"
                        : "参与协作"}
                    </span>
                  </div>
                )}
                {project.facts.resultSummary && (
                  <div className="flex gap-4">
                    <span className="w-20 shrink-0 text-neutral-400">结果摘要</span>
                    <span className="line-clamp-2 text-neutral-900">{project.facts.resultSummary}</span>
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-4">
          <SectionCard title="包装模式对照">
            <div className="space-y-4">
              {PACKAGE_MODES.map((mode) => (
                <div key={mode.value} className="space-y-1">
                  <p className="text-xs font-semibold text-neutral-900">{mode.label}</p>
                  <p className="text-xs leading-5 text-neutral-500">{mode.description}</p>
                  <p className="text-[11px] text-neutral-400">适合：{mode.suitable}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="当前状态">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">素材数量</span>
                <span className="font-medium text-neutral-900">{project._count.assets} 张</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">当前阶段</span>
                <span className="font-medium text-neutral-900">骨架定稿</span>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
