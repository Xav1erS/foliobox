import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Navbar } from "@/components/marketing/Navbar";
import { ArrowRight, ChevronLeft, RotateCcw } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

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
    desc: "这份作品集已具备直接投递的质量，可以考虑直接发送给招聘方。",
  },
  NEEDS_IMPROVEMENT: {
    label: "建议改进后投递",
    badge: "bg-amber-500/15 border-amber-500/20 text-amber-400",
    bar: "bg-amber-500",
    desc: "已具备投递价值，但有几个关键问题值得在投递前修改。",
  },
  NOT_READY: {
    label: "暂不建议投递",
    badge: "bg-red-500/15 border-red-500/20 text-red-400",
    bar: "bg-red-500",
    desc: "作品集还有较大提升空间，建议重制后再正式投递。",
  },
};

function scoreColor(score: number) {
  if (score >= 70) return "bg-emerald-500/60";
  if (score >= 50) return "bg-amber-500/60";
  return "bg-red-500/50";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
  const isLoggedIn = !!session?.user?.id;

  return (
    <>
      <Navbar />
      <main className="mx-auto px-6 pb-24 pt-24" style={{ maxWidth: 760 }}>
        {/* Back */}
        <Link
          href="/score"
          className="mb-10 inline-flex items-center gap-1.5 text-xs text-white/35 transition-colors hover:text-white/60"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          重新评分
        </Link>

        {/* ── Score header ── */}
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-white/35">综合得分</p>
            <div className="flex items-baseline gap-3">
              <span className="text-7xl font-bold tabular-nums text-white leading-none">
                {score.totalScore}
              </span>
              <span className="text-2xl text-white/30">/100</span>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${level.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${level.bar}`} />
              {level.label}
            </span>
            <p className="max-w-[240px] text-right text-xs leading-relaxed text-white/40 sm:block hidden">
              {level.desc}
            </p>
          </div>
        </div>
        <p className="mb-10 text-sm leading-relaxed text-white/50 sm:hidden">{level.desc}</p>

        {/* ── Dimensions ── */}
        <div className="mb-10 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
          <h2 className="mb-6 text-sm font-semibold text-white/70">8 维度评分</h2>
          <div className="flex flex-col gap-5">
            {DIMENSIONS.map(({ key, label, weight }) => {
              const dim = dims[key];
              if (!dim) return null;
              const weighted = Math.round((dim.score * weight) / 100);
              return (
                <div key={key}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/80">{label}</span>
                      <span className="text-[10px] text-white/30">{weight} 分权重</span>
                    </div>
                    <span className="font-mono text-sm text-white/60">
                      {weighted}
                      <span className="text-white/25">/{weight}</span>
                    </span>
                  </div>
                  <div className="mb-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className={`h-full rounded-full transition-all ${scoreColor(dim.score)}`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                  {dim.comment && (
                    <p className="text-xs leading-relaxed text-white/40">{dim.comment}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Summary & Actions ── */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2">
          {/* Summary points */}
          {score.summaryPoints.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <h2 className="mb-4 text-sm font-semibold text-white/70">主要问题</h2>
              <ul className="flex flex-col gap-3">
                {score.summaryPoints.map((point, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-white/55">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/60" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended actions */}
          {score.recommendedActions.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <h2 className="mb-4 text-sm font-semibold text-white/70">改进建议</h2>
              <ul className="flex flex-col gap-3">
                {score.recommendedActions.map((action, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-white/55">
                    <span className="mt-0.5 shrink-0 font-mono text-xs text-emerald-400/70">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── CTA ── */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          {isLoggedIn ? (
            <>
              <h3 className="mb-2 text-lg font-bold text-white">开始重制这份作品集</h3>
              <p className="mb-6 text-sm text-white/50">
                导入设计稿，补充项目事实，AI 生成可投递初稿。
              </p>
              <Link
                href="/projects/new"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-white/90"
              >
                导入项目，开始重制
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : (
            <>
              <h3 className="mb-2 text-lg font-bold text-white">用 FolioBox 重制这份作品集</h3>
              <p className="mb-2 text-sm text-white/55">
                注册后导入设计稿，AI 帮你整理结构、生成第一版初稿。
              </p>
              <p className="mb-6 text-xs text-white/35">
                免费开始 · 10–20 分钟内完成第一版
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href={`/login?next=/projects/new`}
                  className="inline-flex h-12 min-w-[180px] items-center justify-center gap-2 rounded-xl bg-white px-8 text-sm font-semibold text-black transition-colors hover:bg-white/90"
                >
                  注册并开始重制
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/score"
                  className="inline-flex h-12 min-w-[140px] items-center justify-center gap-2 rounded-xl border border-white/15 px-6 text-sm text-white/60 transition-colors hover:border-white/30 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  重新评分
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
