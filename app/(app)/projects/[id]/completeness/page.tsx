import { notFound } from "next/navigation";
import Link from "next/link";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { InlineTip } from "@/components/app/InlineTip";
import { CompletenessClient } from "./CompletenessClient";

const COMPLETENESS_DIMENSIONS = [
  {
    key: "boundary",
    label: "项目边界完整度",
    hint: "项目类型、行业、上线状态是否清晰",
    fields: ["projectType", "industry", "hasLaunched", "timeline"],
  },
  {
    key: "problem",
    label: "问题链条完整度",
    hint: "背景、目标用户、商业目标是否可构成完整问题链",
    fields: ["background", "targetUsers", "businessGoal"],
  },
  {
    key: "role",
    label: "角色事实完整度",
    hint: "你的职责范围、参与程度、核心贡献是否说得清楚",
    fields: ["roleTitle", "involvementLevel", "keyContribution"],
  },
  {
    key: "evidence",
    label: "方案证据完整度",
    hint: "最大挑战和解决思路是否有可信的说法",
    fields: ["biggestChallenge"],
  },
  {
    key: "result",
    label: "结果证据完整度",
    hint: "结果摘要和可量化影响是否有数据支撑",
    fields: ["resultSummary", "measurableImpact"],
  },
] as const;

type FactsData = {
  projectType?: string | null;
  industry?: string | null;
  timeline?: string | null;
  hasLaunched?: boolean | null;
  background?: string | null;
  targetUsers?: string | null;
  businessGoal?: string | null;
  roleTitle?: string | null;
  involvementLevel?: string | null;
  keyContribution?: string | null;
  biggestChallenge?: string | null;
  resultSummary?: string | null;
  measurableImpact?: string | null;
};

function scoreDimension(facts: FactsData | null, fields: readonly string[]): "complete" | "partial" | "missing" {
  if (!facts) return "missing";
  const filled = fields.filter((f) => {
    const val = (facts as Record<string, unknown>)[f];
    return val !== null && val !== undefined && val !== "";
  });
  if (filled.length === 0) return "missing";
  if (filled.length < fields.length) return "partial";
  return "complete";
}

const STATUS_CONFIG = {
  complete: { label: "已填写", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  partial: { label: "部分填写", className: "bg-amber-50 text-amber-700 border-amber-200" },
  missing: { label: "未填写", className: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

export default async function CompletenessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/projects/${id}/completeness`);

  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    include: {
      _count: { select: { assets: true } },
      facts: true,
    },
  });

  if (!project) notFound();

  const facts = project.facts as FactsData | null;

  const dimensionResults = COMPLETENESS_DIMENSIONS.map((dim) => ({
    ...dim,
    status: scoreDimension(facts, dim.fields),
  }));

  const completeCount = dimensionResults.filter((d) => d.status === "complete").length;
  const missingCount = dimensionResults.filter((d) => d.status === "missing").length;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 pb-28">
      <PageHeader
        eyebrow={`项目 · ${project.name} · 环节 2/4`}
        title="完整度检查"
        description="系统会检查你的项目关键信息是否足够支撑作品集表达。补齐越多，生成质量越高。"
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* 主内容区 */}
        <div className="space-y-6">
          <InlineTip>
            AI 完整度分析正在建设中。当前基于你已填写的项目事实给出初步判断，点击「确认完整度」即可继续到骨架定稿。
          </InlineTip>

          <SectionCard title="五维度完整度检查">
            <div className="space-y-3">
              {dimensionResults.map((dim) => {
                const config = STATUS_CONFIG[dim.status];
                return (
                  <div
                    key={dim.key}
                    className="flex items-start justify-between gap-4 border border-neutral-200 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{dim.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-neutral-500">{dim.hint}</p>
                    </div>
                    <span className={`shrink-0 border px-2 py-0.5 text-[11px] ${config.className}`}>
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </SectionCard>

          {missingCount > 0 && (
            <SectionCard title="建议补充">
              <div className="space-y-2">
                {dimensionResults
                  .filter((d) => d.status !== "complete")
                  .map((dim) => (
                    <div key={dim.key} className="flex items-center gap-2 text-sm">
                      <span className="h-1.5 w-1.5 shrink-0 bg-amber-400" />
                      <span className="text-neutral-700">{dim.label}</span>
                      <span className="text-neutral-400">—</span>
                      <span className="text-neutral-500">{dim.hint}</span>
                    </div>
                  ))}
              </div>
              <div className="mt-4">
                <Link
                  href={`/projects/${id}/facts`}
                  className="inline-flex items-center gap-1 border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50"
                >
                  去补充项目事实
                </Link>
              </div>
            </SectionCard>
          )}
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-4">
          <SectionCard title="完整度摘要">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">完整维度</span>
                <span className="font-medium text-neutral-900">{completeCount} / 5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">素材数量</span>
                <span className="font-medium text-neutral-900">{project._count.assets} 张</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">当前阶段</span>
                <span className="font-medium text-neutral-900">完整度检查</span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="分诊说明">
            <p className="text-xs leading-6 text-neutral-500">
              {completeCount >= 4
                ? "关键信息较为完整，可以直接进入骨架定稿，AI 能给出更准确的讲法建议。"
                : completeCount >= 2
                ? "已有基础信息，建议先补充缺失维度，再进入骨架定稿，有助于提升生成质量。"
                : "当前信息较少，建议先回去补充项目事实。即使不完整也可以继续，但生成结果会更保守。"}
            </p>
          </SectionCard>
        </div>
      </div>

      <CompletenessClient projectId={id} />
    </div>
  );
}
