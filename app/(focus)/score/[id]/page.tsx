import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserPlan } from "@/lib/entitlement";
import { StepHeader } from "@/components/app/StepHeader";
import { PermissionGate } from "@/components/app/PermissionGate";

interface DimensionScore {
  score: number;
  comment: string;
}

interface DimensionScores {
  firstScreenProfessionalism: DimensionScore;
  scannability: DimensionScore;
  projectSelection: DimensionScore;
  roleClarity: DimensionScore;
  problemDefinition: DimensionScore;
  resultEvidence: DimensionScore;
  authenticity: DimensionScore;
  jobFit: DimensionScore;
}

const DIMENSIONS: { key: keyof DimensionScores; label: string; weight: number }[] = [
  { key: "firstScreenProfessionalism", label: "首屏专业感", weight: 15 },
  { key: "roleClarity", label: "角色清晰度", weight: 15 },
  { key: "scannability", label: "可扫描性", weight: 15 },
  { key: "problemDefinition", label: "问题定义与设计判断", weight: 20 },
  { key: "resultEvidence", label: "结果与价值证明", weight: 15 },
  { key: "projectSelection", label: "项目选择质量", weight: 10 },
  { key: "authenticity", label: "真实性与可信度", weight: 5 },
  { key: "jobFit", label: "投递适配度", weight: 5 },
];

const LEVEL_CONFIG = {
  READY: {
    label: "可直接投递",
    badge: "bg-emerald-500/15 border-emerald-500/20 text-emerald-400",
    bar: "bg-emerald-500",
    desc: "这份作品集已经具备较强的投递完成度，可以继续确认细节后正式使用。",
  },
  NEEDS_IMPROVEMENT: {
    label: "建议改进后投递",
    badge: "bg-amber-500/15 border-amber-500/20 text-amber-400",
    bar: "bg-amber-500",
    desc: "你已经有一版可用基础，但还有几处关键问题值得先修正再投递。",
  },
  NOT_READY: {
    label: "暂不建议投递",
    badge: "bg-red-500/15 border-red-500/20 text-red-400",
    bar: "bg-red-500",
    desc: "建议先整理项目表达与结构，再生成一版更完整的作品集初稿。",
  },
};

function scoreColor(score: number) {
  if (score >= 70) return "bg-emerald-500/70";
  if (score >= 50) return "bg-amber-500/70";
  return "bg-red-500/70";
}

export default async function ScoreResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [score, session] = await Promise.all([
    db.portfolioScore.findUnique({ where: { id } }),
    auth(),
  ]);

  if (!score) notFound();

  const dims = score.dimensionScores as unknown as DimensionScores;
  const level = LEVEL_CONFIG[score.level];
  const planType = session?.user?.id ? await getUserPlan(session.user.id) : "FREE";
  const canViewFull = planType !== "FREE";
  const isLoggedIn = !!session?.user?.id;
  const loginHref = `/login?next=${encodeURIComponent(`/score/${id}`)}`;
  const previewDimensions = DIMENSIONS.slice(0, 3);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <StepHeader
        backHref="/score"
        backLabel="重新评分"
        step="Focus"
        title="评分结果"
        description="先看这份作品集当前是否拿得出手，再决定是否解锁完整分析或继续整理。"
        status={canViewFull ? "完整结果" : "免费简版结果"}
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
          <p className="text-xs uppercase tracking-[0.18em] text-white/35">综合得分</p>
          <div className="mt-4 flex items-end gap-3">
            <span className="text-7xl font-bold leading-none text-white">{score.totalScore}</span>
            <span className="mb-2 text-2xl text-white/30">/100</span>
          </div>
          <div className="mt-5">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${level.badge}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${level.bar}`} />
              {level.label}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/55">{level.desc}</p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <h2 className="text-sm font-semibold text-white/80">主要问题摘要</h2>
            <ul className="mt-4 space-y-3">
              {score.summaryPoints.slice(0, 5).map((point, index) => (
                <li key={index} className="flex gap-2.5 text-sm text-white/60">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={isLoggedIn ? "/projects/new" : `/login?next=${encodeURIComponent("/projects/new")}`}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              继续整理这份作品集
              <ArrowRight className="h-4 w-4" />
            </Link>
            {!canViewFull ? (
              <span className="inline-flex h-12 items-center rounded-xl border border-white/10 px-4 text-sm text-white/45">
                完整 8 维分析与改进建议需解锁后查看
              </span>
            ) : null}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold text-white/80">8 维评分</h2>
              {!canViewFull ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/45">
                  <Lock className="h-3 w-3" />
                  完整版已锁定
                </span>
              ) : null}
            </div>

            <div className="mt-5 space-y-4">
              {(canViewFull ? DIMENSIONS : previewDimensions).map(({ key, label, weight }) => {
                const dim = dims[key];
                if (!dim) return null;
                const weighted = Math.round((dim.score * weight) / 100);
                return (
                  <div key={key}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm text-white/75">{label}</span>
                      <span className="font-mono text-xs text-white/40">
                        {weighted}/{weight}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className={`h-full rounded-full ${scoreColor(dim.score)}`} style={{ width: `${dim.score}%` }} />
                    </div>
                    {canViewFull ? (
                      <p className="mt-2 text-xs leading-5 text-white/45">{dim.comment}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <PermissionGate
            allowed={canViewFull}
            loginHref={isLoggedIn ? undefined : loginHref}
            scene="score_detail"
            title={isLoggedIn ? "解锁完整结果，继续当前评分任务" : "登录后查看完整评分结果"}
            description={
              isLoggedIn
                ? "你已经拿到了免费简版结果。解锁后可查看完整 8 维细项、改进建议，并继续把这份作品集整理成第一版。"
                : "当前展示的是免费简版结果。登录后可继续查看完整分析，并把这份作品集带入后续整理流程。"
            }
            actionLabel={isLoggedIn ? "解锁完整结果" : "登录后继续"}
          >
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-sm font-semibold text-white/80">改进建议</h2>
              <ul className="mt-4 space-y-3">
                {score.recommendedActions.map((action, index) => (
                  <li key={index} className="flex gap-2.5 text-sm text-white/60">
                    <span className="mt-0.5 shrink-0 font-mono text-xs text-emerald-400/70">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </section>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
}
