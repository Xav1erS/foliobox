import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowRight, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserPlan } from "@/lib/entitlement";
import {
  SCORE_ANONYMOUS_SESSION_COOKIE,
  type JudgementState,
  type ScoreCoverage,
  type ScoreProcessingMeta,
} from "@/lib/score-contract";
import {
  canAccessPortfolioScore,
  claimPortfolioScoreForUser,
} from "@/lib/score-access";
import {
  PORTFOLIO_SCORE_LEVEL_CONFIG,
  resolvePortfolioScoreLevel,
} from "@/lib/portfolio-score-level";
import {
  getScoreNextStep,
  isProfileReadyForGeneration,
} from "@/lib/score-next-step";
import { StepHeader } from "@/components/app/StepHeader";
import { PermissionGate } from "@/components/app/PermissionGate";

interface DimensionScore {
  score: number;
  comment: string;
  judgementState: JudgementState;
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

function coverageUnitLabel(inputType: ScoreCoverage["inputType"]) {
  if (inputType === "images") return "张";
  if (inputType === "link") return "页";
  return "页";
}

function scoringSourceLabel(source: ScoreCoverage["scoringSources"][number]) {
  if (source === "overall_structure_summary") return "整体结构摘要";
  if (source === "page_level_summaries") return "页面级摘要";
  if (source === "project_level_summaries") return "项目级摘要";
  return "视觉锚点页";
}

function scoreColor(score: number) {
  if (score >= 85) return "bg-emerald-500/70";
  if (score >= 70) return "bg-amber-500/70";
  if (score >= 50) return "bg-orange-500/70";
  return "bg-red-500/70";
}

function judgementLabel(state: JudgementState) {
  if (state === "full_judgement") return "完整判断";
  if (state === "limited_judgement") return "判断有限";
  return "证据不足";
}

function judgementClassName(state: JudgementState) {
  if (state === "full_judgement") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
  }
  if (state === "limited_judgement") {
    return "border-amber-500/20 bg-amber-500/10 text-amber-300";
  }
  return "border-white/10 bg-white/5 text-white/45";
}

function judgementSummary(dims: DimensionScores) {
  const values = Object.values(dims);
  return {
    full: values.filter((dim) => dim.judgementState === "full_judgement").length,
    limited: values.filter((dim) => dim.judgementState === "limited_judgement").length,
    insufficient: values.filter((dim) => dim.judgementState === "insufficient_evidence").length,
  };
}

export default async function ScoreResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [score, session, cookieStore] = await Promise.all([
    db.portfolioScore.findUnique({ where: { id } }),
    auth(),
    cookies(),
  ]);

  if (!score) notFound();
  const anonymousSessionId =
    cookieStore.get(SCORE_ANONYMOUS_SESSION_COOKIE)?.value ?? null;

  if (session?.user?.id) {
    await claimPortfolioScoreForUser({
      scoreId: score.id,
      currentUserId: session.user.id,
      scoreUserId: score.userId,
      scoreAnonymousSessionId: score.anonymousSessionId,
      anonymousSessionId,
    });
  }

  const allowed = canAccessPortfolioScore({
    scoreUserId: score.userId,
    scoreAnonymousSessionId: score.anonymousSessionId,
    currentUserId: session?.user?.id ?? null,
    anonymousSessionId,
  });
  if (!allowed) {
    if (session?.user?.id) notFound();
    redirect(`/login?next=${encodeURIComponent(`/score/${id}`)}`);
  }

  const dims = score.dimensionScores as unknown as DimensionScores;
  const coverage = ((score.coverageJson ?? {
    inputType: score.inputType.toLowerCase(),
    totalUnits: 0,
    isFullCoverage: false,
    detectedProjects: 0,
    scoringSources: [],
    visualAnchorUnits: [],
  }) as unknown) as ScoreCoverage;
  const processing = ((score.processingJson ?? {
    strategy: "unknown",
    notes: [],
    scanResult: coverage,
  }) as unknown) as ScoreProcessingMeta;
  const resolvedLevel = resolvePortfolioScoreLevel(score.totalScore, score.level);
  const level = PORTFOLIO_SCORE_LEVEL_CONFIG[resolvedLevel];
  let planType: Awaited<ReturnType<typeof getUserPlan>> = "FREE";
  let profile: {
    currentTitle: string | null;
    yearsOfExperience: string | null;
    targetRole: string | null;
    specialties: string[];
    strengths: string[];
  } | null = null;

  if (session?.user?.id) {
    const [resolvedPlanType, resolvedProfile] = await Promise.all([
      getUserPlan(session.user.id),
      db.designerProfile.findUnique({
        where: { userId: session.user.id },
        select: {
          currentTitle: true,
          yearsOfExperience: true,
          targetRole: true,
          specialties: true,
          strengths: true,
        },
      }),
    ]);
    planType = resolvedPlanType;
    profile = resolvedProfile;
  }
  const canViewFull = planType !== "FREE";
  const isLoggedIn = !!session?.user?.id;
  const loginHref = `/login?next=${encodeURIComponent(`/score/${id}`)}`;
  const previewDimensions = DIMENSIONS.slice(0, 3);
  const judgementCounts = judgementSummary(dims);
  const profileReady = isProfileReadyForGeneration(profile);
  const nextStep = getScoreNextStep({
    scoreId: id,
    level: resolvedLevel,
    coverage,
    isLoggedIn,
    profileReady,
  });

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
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${level.badgeClassName}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${level.indicatorClassName}`} />
              {level.label}
            </span>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/55">{level.description}</p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">下一步</p>
            <h2 className="mt-3 text-lg font-semibold text-white">{nextStep.title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/55">{nextStep.description}</p>
            {!canViewFull ? (
              <p className="mt-3 text-xs leading-5 text-white/40">
                当前免费态已开放：综合得分、主要问题摘要、覆盖范围说明，以及 3 个维度预览。
              </p>
            ) : null}
          </div>

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
              href={nextStep.primaryHref}
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              {nextStep.primaryLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {nextStep.secondaryHref ? (
              <Link
                href={nextStep.secondaryHref}
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-white/10 px-5 text-sm text-white/70 transition-colors hover:border-white/20 hover:text-white"
              >
                {nextStep.secondaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            {!canViewFull ? (
              <span className="inline-flex h-12 items-center rounded-xl border border-white/10 px-4 text-sm text-white/45">
                完整 8 维分析与改进建议需解锁后查看
              </span>
            ) : null}
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-sm font-semibold text-white/80">本次评分覆盖范围</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">扫描总量</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {coverage.totalUnits} {coverageUnitLabel(coverage.inputType)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">覆盖状态</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {coverage.isFullCoverage ? "已覆盖整份输入" : "当前为有限覆盖"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">识别项目数</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {coverage.detectedProjects || 0}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">视觉锚点</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {coverage.visualAnchorUnits.length > 0
                    ? `${coverage.visualAnchorUnits.length} 个关键页面`
                    : "当前未使用"}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {coverage.scoringSources.map((source) => (
                <span
                  key={source}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/55"
                >
                  {scoringSourceLabel(source)}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/45">
              本次结论基于整份输入的结构理解完成，并结合有限视觉证据补充，不是仅基于前几页内容得出。
            </p>
            {processing.parseProvider ? (
              <p className="mt-2 text-xs leading-5 text-white/35">
                当前解析链路：
                {processing.parseProviderDisplayName ??
                  (processing.parseProvider === "mistral_ocr"
                    ? "外部文档解析服务"
                    : "本地 PDF 解析 fallback")}
                {processing.parseFallbackUsed ? "（已启用降级）" : ""}
                {typeof processing.parseEstimatedCostUsd === "number"
                  ? ` · 解析成本估算 $${processing.parseEstimatedCostUsd.toFixed(4)}`
                  : ""}
              </p>
            ) : null}
            {processing.parseProviderRegion || processing.parseProviderNetworkProfile || processing.parseProviderStabilityTier ? (
              <p className="mt-2 text-xs leading-5 text-white/35">
                {processing.parseProviderRegion ? `区域：${processing.parseProviderRegion}` : null}
                {processing.parseProviderRegion && processing.parseProviderNetworkProfile ? " · " : null}
                {processing.parseProviderNetworkProfile
                  ? `链路画像：${processing.parseProviderNetworkProfile}`
                  : null}
                {(processing.parseProviderRegion || processing.parseProviderNetworkProfile) &&
                processing.parseProviderStabilityTier
                  ? " · "
                  : null}
                {processing.parseProviderStabilityTier
                  ? `稳定性分层：${processing.parseProviderStabilityTier}`
                  : null}
              </p>
            ) : null}
            {coverage.visualAnchorUnits.length > 0 ? (
              <p className="mt-2 text-xs leading-5 text-white/35">
                本次补充查看了第 {coverage.visualAnchorUnits.join("、")} 页的视觉锚点。
              </p>
            ) : null}
            {processing.notes.length > 0 ? (
              <ul className="mt-3 space-y-2 text-xs leading-5 text-white/40">
                {processing.notes.slice(0, 2).map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-sm font-semibold text-white/80">判断状态</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/60">完整判断</p>
                <p className="mt-2 text-lg font-semibold text-white">{judgementCounts.full}</p>
              </div>
              <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-300/70">判断有限</p>
                <p className="mt-2 text-lg font-semibold text-white">{judgementCounts.limited}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/35">证据不足</p>
                <p className="mt-2 text-lg font-semibold text-white">{judgementCounts.insufficient}</p>
              </div>
            </div>
            <p className="mt-4 text-xs leading-5 text-white/45">
              如果某个维度显示“判断有限”或“证据不足”，表示系统已尽量避免用缺少证据的内容做过强结论。
            </p>
          </section>

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
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] ${judgementClassName(
                            dim.judgementState
                          )}`}
                        >
                          {judgementLabel(dim.judgementState)}
                        </span>
                        <span className="font-mono text-xs text-white/40">
                          {weighted}/{weight}
                        </span>
                      </div>
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
            {!canViewFull ? (
              <p className="mt-5 text-xs leading-5 text-white/45">
                免费态先开放 3 个高优先级维度预览。登录或解锁后，可继续查看完整 8 维细项与逐项建议。
              </p>
            ) : null}
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
