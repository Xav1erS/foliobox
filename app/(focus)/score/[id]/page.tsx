import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";
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
  computeTotalScoreFromDimensions,
  computeWeightedDimensionScore,
  normalizeDimensionScoresForComputation,
  SCORE_DIMENSION_WEIGHTS,
} from "@/lib/score-math";
import {
  getScoreNextStep,
  isProfileReadyForGeneration,
} from "@/lib/score-next-step";
import { StepHeader } from "@/components/app/StepHeader";
import { PermissionGate } from "@/components/app/PermissionGate";
import { ScoreResultPrimaryAction } from "@/components/focus/ScoreResultPrimaryAction";

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
  { key: "firstScreenProfessionalism", label: "首屏专业感", weight: SCORE_DIMENSION_WEIGHTS.firstScreenProfessionalism },
  { key: "roleClarity", label: "角色清晰度", weight: SCORE_DIMENSION_WEIGHTS.roleClarity },
  { key: "scannability", label: "可扫描性", weight: SCORE_DIMENSION_WEIGHTS.scannability },
  { key: "problemDefinition", label: "问题定义与设计判断", weight: SCORE_DIMENSION_WEIGHTS.problemDefinition },
  { key: "resultEvidence", label: "结果与价值证明", weight: SCORE_DIMENSION_WEIGHTS.resultEvidence },
  { key: "projectSelection", label: "项目选择质量", weight: SCORE_DIMENSION_WEIGHTS.projectSelection },
  { key: "authenticity", label: "真实性与可信度", weight: SCORE_DIMENSION_WEIGHTS.authenticity },
  { key: "jobFit", label: "投递适配度", weight: SCORE_DIMENSION_WEIGHTS.jobFit },
];

const FREE_SUMMARY_LIMIT = 2;
const FULL_SUMMARY_LIMIT = 5;
const FULL_ACTION_LIMIT = 5;

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

function scoreTextColor(score: number) {
  if (score >= 85) return "text-emerald-300";
  if (score >= 70) return "text-amber-300";
  if (score >= 50) return "text-orange-300";
  return "text-red-300";
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

function sortPriorityDimensions(dims: DimensionScores) {
  return [...DIMENSIONS].sort((a, b) => {
    const aDim = dims[a.key];
    const bDim = dims[b.key];
    const stateRank = (state: JudgementState) =>
      state === "full_judgement" ? 0 : state === "limited_judgement" ? 1 : 2;
    const byState = stateRank(aDim.judgementState) - stateRank(bDim.judgementState);
    if (byState !== 0) return byState;
    return aDim.score - bDim.score;
  });
}

function resultConclusion(levelLabel: string, totalScore: number) {
  if (totalScore >= 85) {
    return `这份作品集当前已经${levelLabel}，重点是继续确认细节，而不是重做整份内容。`;
  }
  if (totalScore >= 70) {
    return `这份作品集当前${levelLabel}，但还有几处关键问题值得先局部优化。`;
  }
  if (totalScore >= 50) {
    return `这份作品集当前${levelLabel}，更适合先带着问题继续整理，再进入下一轮投递。`;
  }
  return `这份作品集当前${levelLabel}，建议先回到项目表达和结构本身补齐核心信息。`;
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

  const dims = normalizeDimensionScoresForComputation(
    score.dimensionScores as unknown as DimensionScores,
    score.totalScore
  ) as DimensionScores;
  const displayTotalScore = computeTotalScoreFromDimensions(dims);
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
  const resolvedLevel = resolvePortfolioScoreLevel(displayTotalScore, score.level);
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
  const priorityDimensions = sortPriorityDimensions(dims);
  const previewDimensions = priorityDimensions.slice(0, 3);
  const judgementCounts = judgementSummary(dims);
  const profileReady = isProfileReadyForGeneration(profile);
  const nextStep = getScoreNextStep({
    scoreId: id,
    level: resolvedLevel,
    coverage,
    isLoggedIn,
    profileReady,
  });
  const mainIssuePoints = score.summaryPoints.slice(
    0,
    canViewFull ? FULL_SUMMARY_LIMIT : FREE_SUMMARY_LIMIT
  );
  const actionItems = score.recommendedActions.slice(0, FULL_ACTION_LIMIT);
  const isDegradedParse = Boolean(processing.parseFallbackUsed);
  const heroTitle = canViewFull
    ? nextStep.primaryLabel
    : isDegradedParse
    ? "重新评分"
    : isLoggedIn
    ? "解锁完整结果"
    : "登录后继续解锁";
  const levelConclusion = resultConclusion(level.label, displayTotalScore);
  const paywallTitle = "解锁完整结果，继续这次评分任务";
  const paywallDescription = isDegradedParse
    ? "你当前看到的是降级解析后的简版结果。解锁不会修复本次解析质量，建议先重新评分；如仍需继续，也可解锁查看完整 8 维分析、问题摘要与改进建议。"
    : "你当前看到的是简版结果。解锁后会立刻获得完整 8 维分析、3–5 条核心问题摘要、3–5 条可执行改进建议，并可把本次评分继续带入整理流程。";
  const nextStepTitle = isDegradedParse ? "先重新评分，确认这次结果是否可靠" : nextStep.title;
  const nextStepDescription = isDegradedParse
    ? "这次 PDF 评分已退回本地文本结构扫描，当前结果更适合用来发现大致问题方向。建议先重新评分，确认外部文档解析恢复正常后，再决定是否继续解锁或进入整理。"
    : nextStep.description;
  const paywallActionLabel = isLoggedIn ? "解锁完整结果" : "登录后继续解锁流程";

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <StepHeader
        backHref="/score"
        backLabel="重新评分"
        step="Focus"
        title="评分结果"
        description="先看这份作品集当前是否拿得出手，再决定是否解锁完整分析或继续整理。"
        status={canViewFull ? "完整结果" : "免费简版结果"}
        statusTone={canViewFull ? "success" : "muted"}
      />

      <div className="mt-10 space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/3 p-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">结果结论</p>
              {isDegradedParse ? (
                <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">
                    当前结果为降级解析结果
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/70">
                    外部 PDF 解析本次超时或不可用，系统已退回本地文本结构扫描。当前分数、识别项目数和判断状态都仅供参考，可能低估作品集的真实质量。
                  </p>
                  <p className="mt-2 text-xs leading-5 text-amber-200/80">
                    建议稍后重新评分确认，再决定是否解锁完整结果或继续整理。
                  </p>
                </div>
              ) : null}
              <div className="mt-4 flex items-end gap-3">
                <span className="text-7xl font-bold leading-none text-white">{displayTotalScore}</span>
                <span className="mb-2 text-2xl text-white/30">/100</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${level.badgeClassName}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${level.indicatorClassName}`} />
                  {level.label}
                </span>
                <span className="text-xs text-white/35">{level.rangeLabel}</span>
              </div>
              <p className="mt-5 text-lg font-medium leading-8 text-white">{levelConclusion}</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">{level.description}</p>
              {isDegradedParse ? (
                <p className="mt-3 text-xs leading-5 text-amber-200/80">
                  当前综合分仅用于快速定位问题，不建议直接把本次结果视为最终结论。
                </p>
              ) : null}
              <div className="mt-8">
                {isDegradedParse ? (
                  <Link
                    href="/score"
                    className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
                  >
                    {heroTitle}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <ScoreResultPrimaryAction
                    canViewFull={canViewFull}
                    href={nextStep.primaryHref}
                    label={heroTitle}
                    loginHref={canViewFull || isLoggedIn ? undefined : loginHref}
                  />
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/35">一句话结论</p>
              <p className="mt-3 text-sm leading-6 text-white/65">
                {isDegradedParse
                  ? "你现在看到的是降级解析后的结果，用来先判断当前问题大致集中在哪些位置。建议优先重试评分，再决定是否继续后续动作。"
                  : canViewFull
                  ? "你现在看到的是完整评分结果，重点不是继续读报告，而是带着这次判断进入下一步整理。"
                  : "你现在看到的是简版结果，用来先判断这份作品集现在能不能投，以及最该先改什么。"}
              </p>
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">当前开放内容</p>
                <p className="mt-3 text-sm leading-6 text-white/55">
                  {canViewFull
                    ? "完整 8 维分析、3–5 条问题摘要、3–5 条改进建议，以及将本次评分继续带入整理流程。"
                    : "总分、等级、一句话结论、3 个优先维度预览、1–2 条核心问题摘要和覆盖范围说明。"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/3 p-6">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold text-white/80">判断依据</h2>
                {!canViewFull ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/45">
                    简版结果
                  </span>
                ) : null}
              </div>
              <div className="mt-5 space-y-4">
                {(canViewFull ? DIMENSIONS : previewDimensions).map(({ key, label, weight }) => {
                  const dim = dims[key];
                  if (!dim) return null;
                  const weighted = computeWeightedDimensionScore(dim.score, weight);
                  const isReference =
                    dim.judgementState === "limited_judgement" ||
                    dim.judgementState === "insufficient_evidence";
                  return (
                    <div key={key} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-white/85">{label}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-xs ${judgementClassName(
                                dim.judgementState
                              )}`}
                            >
                              {judgementLabel(dim.judgementState)}
                            </span>
                            <span className={`text-xs ${scoreTextColor(dim.score)}`}>
                              {isReference ? "参考分" : "判断分"} {weighted}/{weight}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${scoreColor(dim.score)}`}
                          style={{ width: `${dim.score}%` }}
                        />
                      </div>
                      {canViewFull ? (
                        <p className="mt-3 text-xs leading-5 text-white/50">{dim.comment}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              {!canViewFull ? (
                <p className="mt-5 text-xs leading-5 text-white/45">
                  免费版先展示 3 个最优先维度预览。若维度为“判断有限”或“证据不足”，当前分数仅作为参考，不代表确定结论。
                </p>
              ) : null}
            </section>

            <section className="rounded-3xl border border-white/10 bg-white/3 p-6">
              <h2 className="text-sm font-semibold text-white/80">
                {canViewFull ? "问题摘要" : "核心问题摘要"}
              </h2>
              <ul className="mt-4 space-y-3">
                {mainIssuePoints.map((point, index) => (
                  <li key={index} className="flex gap-2.5 text-sm text-white/60">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
                    {point}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/3 p-6">
            <h2 className="text-sm font-semibold text-white/80">本次评分覆盖范围</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">扫描总量</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {coverage.totalUnits} {coverageUnitLabel(coverage.inputType)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">覆盖状态</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {coverage.isFullCoverage
                    ? isDegradedParse
                      ? "整份已扫描，但当前为降级解析"
                      : "已覆盖整份输入"
                    : "当前为有限覆盖"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">识别项目数</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {coverage.detectedProjects || 0}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-white/35">视觉锚点</p>
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
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55"
                >
                  {scoringSourceLabel(source)}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-white/45">
              {isDegradedParse
                ? "本次结论基于整份输入的本地文本结构扫描完成，当前未成功使用外部文档解析服务，因此可信度低于正常完整解析结果。"
                : "本次结论基于整份输入的结构理解完成，并结合有限视觉证据补充，不是仅基于前几页内容得出。"}
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

            <section className="rounded-3xl border border-white/10 bg-white/3 p-6">
              <h2 className="text-sm font-semibold text-white/80">判断状态</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/60">完整判断</p>
                  <p className="mt-2 text-lg font-semibold text-white">{judgementCounts.full}</p>
                </div>
                <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-amber-300/70">判断有限</p>
                  <p className="mt-2 text-lg font-semibold text-white">{judgementCounts.limited}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/35">证据不足</p>
                  <p className="mt-2 text-lg font-semibold text-white">{judgementCounts.insufficient}</p>
                </div>
              </div>
            <p className="mt-4 text-xs leading-5 text-white/45">
              如果某个维度显示“判断有限”或“证据不足”，当前页面会先显示判断状态，再展示参考分，避免把证据不足直接表现成低分。
            </p>
            {isDegradedParse ? (
              <p className="mt-2 text-xs leading-5 text-amber-200/80">
                本次降级解析会进一步提高“判断有限 / 证据不足”的出现概率，请优先参考判断状态而不是单独看分数。
              </p>
            ) : null}
          </section>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-3xl border border-white/10 bg-white/3 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-white/35">下一步动作</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">{nextStepTitle}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">{nextStepDescription}</p>

            {canViewFull ? (
              <>
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <h3 className="text-sm font-semibold text-white/80">改进建议</h3>
                  <ul className="mt-4 space-y-3">
                    {actionItems.map((action, index) => (
                      <li key={index} className="flex gap-2.5 text-sm text-white/60">
                        <span className="mt-0.5 shrink-0 font-mono text-xs text-emerald-400/70">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
                {nextStep.secondaryHref ? (
                  <Link
                    href={nextStep.secondaryHref}
                    className="mt-5 inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {nextStep.secondaryLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </>
            ) : (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                  <h3 className="text-sm font-semibold text-white/80">为什么当前是简版结果</h3>
                  <p className="mt-3 text-sm leading-6 text-white/55">
                    {isDegradedParse
                      ? "当前这次评分同时处于免费简版结果和降级解析状态。免费版只先帮助你快速定位问题，而这次解析又未成功命中外部文档服务，所以更适合作为参考结果。"
                      : "免费版先帮助你快速判断这份作品集当前能不能投，以及最该优先修改的少数问题。完整 8 维分析、完整问题摘要和改进建议需要解锁后查看。"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white/80">解锁后立刻获得什么</h3>
                    <span className="rounded-full border border-amber-500/15 bg-amber-500/5 px-2.5 py-1 text-xs text-amber-200/80">
                      默认推荐 Pro
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-white/55">
                    <li>完整 8 维分析与判断状态说明</li>
                    <li>3–5 条更完整的问题摘要</li>
                    <li>3–5 条可执行改进建议</li>
                    <li>把这次评分继续带入整理作品集流程</li>
                  </ul>
                </div>
                {isDegradedParse ? (
                  <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-5">
                    <h3 className="text-sm font-semibold text-white/80">这次结果还缺什么</h3>
                    <p className="mt-3 text-sm leading-6 text-white/55">
                      这次未成功命中外部 PDF 解析服务，解锁后虽然能看到更多内容，但不会自动修复当前解析质量。更可信的做法是先重新评分，再决定是否解锁。
                    </p>
                    <Link
                      href="/score"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-amber-200 transition-colors hover:text-white"
                    >
                      重新评分
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                ) : null}
                <PermissionGate
                  allowed={false}
                  loginHref={isLoggedIn ? undefined : loginHref}
                  scene="score_detail"
                  title={paywallTitle}
                  description={paywallDescription}
                  actionLabel={paywallActionLabel}
                >
                  <></>
                </PermissionGate>
                {nextStep.secondaryHref ? (
                  <Link
                    href={nextStep.secondaryHref}
                    className="inline-flex items-center gap-2 text-sm text-white/55 transition-colors hover:text-white"
                  >
                    {nextStep.secondaryLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null}
              </div>
            )}
          </section>

        </section>
      </div>
    </div>
  );
}
