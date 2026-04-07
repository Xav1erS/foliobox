import { notFound } from "next/navigation";
import { getRequiredSession } from "@/lib/required-session";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/PageHeader";
import { CompletenessClient } from "./CompletenessClient";
import type { CompletenessAnalysis } from "@/app/api/projects/[id]/completeness/analyze/route";

const COMPLETENESS_DIMENSIONS = [
  {
    key: "boundary",
    label: "项目边界",
    hint: "项目类型、行业、上线状态是否清晰",
    fields: ["projectType", "industry", "hasLaunched", "timeline"],
  },
  {
    key: "problem",
    label: "问题链条",
    hint: "背景、目标用户、商业目标是否可构成完整问题链",
    fields: ["background", "targetUsers", "businessGoal"],
  },
  {
    key: "role",
    label: "角色事实",
    hint: "职责范围、参与程度、核心贡献是否说得清楚",
    fields: ["roleTitle", "involvementLevel", "keyContribution"],
  },
  {
    key: "evidence",
    label: "方案证据",
    hint: "最大挑战和解决思路是否有可信的说法",
    fields: ["biggestChallenge"],
  },
  {
    key: "result",
    label: "结果证据",
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
  complete: { label: "已填写", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  partial: { label: "部分填写", className: "bg-amber-50 text-amber-700 border border-amber-200" },
  missing: { label: "未填写", className: "bg-neutral-50 text-neutral-500 border border-neutral-200" },
};

export default async function CompletenessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getRequiredSession(`/projects/${id}/completeness`);

  const [project, facts] = await Promise.all([
    db.project.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        name: true,
        completenessJson: true,
        _count: { select: { assets: true } },
      },
    }),
    db.projectFact.findUnique({ where: { projectId: id } }),
  ]);

  if (!project) notFound();

  const factsData = facts as FactsData | null;
  const completenessAnalysis = project.completenessJson as CompletenessAnalysis | null;

  const dimensionResults = COMPLETENESS_DIMENSIONS.map((dim) => ({
    ...dim,
    status: scoreDimension(factsData, dim.fields),
  }));

  const completeCount = dimensionResults.filter((d) => d.status === "complete").length;
  const incompleteItems = dimensionResults.filter((d) => d.status !== "complete");

  return (
    <div className="px-6 py-10 pb-28">
      <PageHeader
        eyebrow={`项目 · ${project.name} · 环节 2/4`}
        title="完整度检查"
        description="系统会检查你的项目关键信息是否足够支撑作品集表达。补齐越多，生成质量越高。"
      />

      {/* 2px structural divider */}
      <div className="-mx-6 mt-6 border-t-2 border-black" />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* 主内容区 */}
        <div>
          {/* 五维度检查 */}
          <div className="mt-6 border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-6 py-4">
              <h2 className="text-[15px] font-semibold text-neutral-900">五维度完整度检查</h2>
            </div>
            <div className="divide-y divide-neutral-100">
              {dimensionResults.map((dim, i) => {
                const config = STATUS_CONFIG[dim.status];
                return (
                  <div key={dim.key} className="flex items-start justify-between gap-4 px-6 py-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="mt-0.5 shrink-0 text-xs font-mono text-neutral-400">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-900">{dim.label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-neutral-500">{dim.hint}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-mono ${config.className}`}>
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 建议补充 */}
          {incompleteItems.length > 0 && (
            <div className="mt-4 border border-neutral-300 bg-white">
              <div className="border-b border-neutral-300 px-6 py-4">
                <h2 className="text-[15px] font-semibold text-neutral-900">建议补充</h2>
              </div>
              <div className="divide-y divide-neutral-100">
                {incompleteItems.map((dim) => (
                  <div key={dim.key} className="flex items-start gap-3 px-6 py-3">
                    <span className="mt-1.5 h-1 w-1 shrink-0 bg-neutral-400" />
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-neutral-700">{dim.label}</span>
                      <span className="mx-1.5 text-neutral-300">—</span>
                      <span className="text-sm text-neutral-500">{dim.hint}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-neutral-100 px-6 py-3">
                <p className="text-xs text-neutral-400">
                  缺失维度不影响继续流程，但会降低后续生成质量。可以先继续，后续通过重新生成补回。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 右侧信息栏 */}
        <div className="space-y-4">
          {/* 完整度摘要 */}
          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-5 py-4">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">完整度摘要</p>
            </div>
            <div className="divide-y divide-neutral-100 px-5">
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-neutral-500">完整维度</span>
                <span className="text-sm font-semibold text-neutral-900">{completeCount} / 5</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-neutral-500">素材数量</span>
                <span className="text-sm font-semibold text-neutral-900">{project._count.assets} 张</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-neutral-500">当前环节</span>
                <span className="border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-mono text-neutral-600">
                  完整度检查
                </span>
              </div>
            </div>
          </div>

          {/* 分诊说明 */}
          <div className="border border-neutral-300 bg-white">
            <div className="border-b border-neutral-300 px-5 py-4">
              <p className="text-xs font-mono uppercase tracking-[0.2em] text-neutral-400">分诊结论</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs leading-6 text-neutral-500">
                {completeCount >= 4
                  ? "关键信息较为完整，可以直接进入骨架定稿，AI 能给出更准确的讲法建议。"
                  : completeCount >= 2
                  ? "已有基础信息，建议先补充缺失维度，再进入骨架定稿，有助于提升生成质量。"
                  : "当前信息较少，建议先回去补充项目事实。即使不完整也可以继续，但生成结果会更保守。"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <CompletenessClient projectId={id} initialAnalysis={completenessAnalysis} />
    </div>
  );
}
