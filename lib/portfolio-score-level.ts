export type PortfolioScoreLevel =
  | "READY"
  | "NEEDS_IMPROVEMENT"
  | "DRAFT"
  | "NOT_READY";

type PortfolioScoreLevelConfig = {
  rangeLabel: string;
  label: string;
  description: string;
  badgeClassName: string;
  indicatorClassName: string;
};

export const PORTFOLIO_SCORE_LEVEL_ORDER: PortfolioScoreLevel[] = [
  "READY",
  "NEEDS_IMPROVEMENT",
  "DRAFT",
  "NOT_READY",
];

export const PORTFOLIO_SCORE_LEVEL_CONFIG: Record<
  PortfolioScoreLevel,
  PortfolioScoreLevelConfig
> = {
  READY: {
    rangeLabel: "85–100 分",
    label: "可直接投递",
    description:
      "这份作品集已经具备较强的投递完成度，可以继续确认细节后正式使用。",
    badgeClassName:
      "bg-emerald-500/15 border-emerald-500/20 text-emerald-400",
    indicatorClassName: "bg-emerald-500",
  },
  NEEDS_IMPROVEMENT: {
    rangeLabel: "70–84 分",
    label: "具备投递价值，但建议局部优化",
    description:
      "这份作品集已经具备一定投递价值，但还有几处关键问题值得先局部优化后再投递。",
    badgeClassName: "bg-amber-500/15 border-amber-500/20 text-amber-400",
    indicatorClassName: "bg-amber-500",
  },
  DRAFT: {
    rangeLabel: "50–69 分",
    label: "可作为草稿，不建议直接投递",
    description:
      "当前更适合作为草稿继续整理，建议先补齐项目表达与结构，再生成一版更完整的作品集初稿。",
    badgeClassName: "bg-orange-500/15 border-orange-500/20 text-orange-400",
    indicatorClassName: "bg-orange-500",
  },
  NOT_READY: {
    rangeLabel: "50 分以下",
    label: "不建议直接投递",
    description:
      "建议先回到项目表达与结构本身，优先补齐关键信息后再进入下一轮整理与评分。",
    badgeClassName: "bg-red-500/15 border-red-500/20 text-red-400",
    indicatorClassName: "bg-red-500",
  },
};

export function getPortfolioScoreLevelFromTotalScore(
  totalScore: number
): PortfolioScoreLevel {
  if (totalScore >= 85) return "READY";
  if (totalScore >= 70) return "NEEDS_IMPROVEMENT";
  if (totalScore >= 50) return "DRAFT";
  return "NOT_READY";
}

export function resolvePortfolioScoreLevel(
  totalScore: number,
  level: string
): PortfolioScoreLevel {
  const normalized = level.toUpperCase();

  if (normalized === "DRAFT") return "DRAFT";

  if (
    normalized === "READY" ||
    normalized === "NEEDS_IMPROVEMENT" ||
    normalized === "NOT_READY"
  ) {
    if (normalized === "NOT_READY" && totalScore >= 50 && totalScore < 70) {
      return "DRAFT";
    }

    return normalized;
  }

  return getPortfolioScoreLevelFromTotalScore(totalScore);
}
