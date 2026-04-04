export const SCORE_DIMENSION_KEYS = [
  "firstScreenProfessionalism",
  "scannability",
  "projectSelection",
  "roleClarity",
  "problemDefinition",
  "resultEvidence",
  "authenticity",
  "jobFit",
] as const;

export type ScoreDimensionKey = (typeof SCORE_DIMENSION_KEYS)[number];

export const SCORE_DIMENSION_WEIGHTS: Record<ScoreDimensionKey, number> = {
  firstScreenProfessionalism: 15,
  scannability: 15,
  projectSelection: 10,
  roleClarity: 15,
  problemDefinition: 20,
  resultEvidence: 15,
  authenticity: 5,
  jobFit: 5,
};

export type ScoreDimensionLike = {
  score: number;
};

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function computeWeightedDimensionScore(score: number, weight: number) {
  return Math.round((score * weight) / 100);
}

export function computeDimensionScoreSum(
  dimensions: Record<ScoreDimensionKey, ScoreDimensionLike>
) {
  return SCORE_DIMENSION_KEYS.reduce((sum, key) => sum + dimensions[key].score, 0);
}

export function computeTotalScoreFromDimensions(
  dimensions: Record<ScoreDimensionKey, ScoreDimensionLike>
) {
  return SCORE_DIMENSION_KEYS.reduce((sum, key) => {
    return sum + computeWeightedDimensionScore(dimensions[key].score, SCORE_DIMENSION_WEIGHTS[key]);
  }, 0);
}

export function shouldNormalizeContributionStyleDimensionScores(
  dimensions: Record<ScoreDimensionKey, ScoreDimensionLike>,
  referenceTotalScore: number | null | undefined
) {
  if (typeof referenceTotalScore !== "number" || !Number.isFinite(referenceTotalScore)) {
    return false;
  }

  const rawSum = computeDimensionScoreSum(dimensions);
  const weightedTotal = computeTotalScoreFromDimensions(dimensions);

  return (
    Math.abs(rawSum - referenceTotalScore) <= 6 &&
    Math.abs(weightedTotal - referenceTotalScore) >= 15
  );
}

export function normalizeContributionStyleDimensionScore(score: number, weight: number) {
  if (!Number.isFinite(score)) {
    return score;
  }

  if (weight <= 0) {
    return clampPercentage(score);
  }

  return clampPercentage(Math.round((score / weight) * 100));
}

export function normalizeDimensionScoresForComputation<T extends ScoreDimensionLike>(
  dimensions: Record<ScoreDimensionKey, T>,
  referenceTotalScore?: number | null
): Record<ScoreDimensionKey, T> {
  if (!shouldNormalizeContributionStyleDimensionScores(dimensions, referenceTotalScore)) {
    return dimensions;
  }

  return SCORE_DIMENSION_KEYS.reduce((normalized, key) => {
    normalized[key] = {
      ...dimensions[key],
      score: normalizeContributionStyleDimensionScore(
        dimensions[key].score,
        SCORE_DIMENSION_WEIGHTS[key]
      ),
    };
    return normalized;
  }, {} as Record<ScoreDimensionKey, T>);
}
