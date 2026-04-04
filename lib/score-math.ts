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

export function computeWeightedDimensionScore(score: number, weight: number) {
  return Math.round((score * weight) / 100);
}

export function computeTotalScoreFromDimensions(
  dimensions: Record<ScoreDimensionKey, ScoreDimensionLike>
) {
  return SCORE_DIMENSION_KEYS.reduce((sum, key) => {
    return sum + computeWeightedDimensionScore(dimensions[key].score, SCORE_DIMENSION_WEIGHTS[key]);
  }, 0);
}
