import { describe, expect, it } from "vitest";
import {
  computeTotalScoreFromDimensions,
  normalizeDimensionScoresForComputation,
  shouldNormalizeContributionStyleDimensionScores,
} from "./score-math";

const contributionStyleDimensions = {
  firstScreenProfessionalism: { score: 12 },
  scannability: { score: 11 },
  projectSelection: { score: 8 },
  roleClarity: { score: 10 },
  problemDefinition: { score: 15 },
  resultEvidence: { score: 10 },
  authenticity: { score: 4 },
  jobFit: { score: 8 },
};

describe("normalizeDimensionScoresForComputation", () => {
  it("keeps percentage-style dimension scores unchanged", () => {
    const dimensions = {
      firstScreenProfessionalism: { score: 80 },
      scannability: { score: 75 },
      projectSelection: { score: 70 },
      roleClarity: { score: 82 },
      problemDefinition: { score: 78 },
      resultEvidence: { score: 74 },
      authenticity: { score: 68 },
      jobFit: { score: 72 },
    };

    expect(
      normalizeDimensionScoresForComputation(
        dimensions,
        computeTotalScoreFromDimensions(dimensions)
      )
    ).toEqual(dimensions);
  });

  it("detects contribution-style scores when the reported total matches the raw sum", () => {
    expect(
      shouldNormalizeContributionStyleDimensionScores(contributionStyleDimensions, 78)
    ).toBe(true);
  });

  it("normalizes contribution-style scores back to percentage form before weighting", () => {
    const normalized = normalizeDimensionScoresForComputation(
      contributionStyleDimensions,
      78
    );

    expect(normalized).toEqual({
      firstScreenProfessionalism: { score: 80 },
      scannability: { score: 73 },
      projectSelection: { score: 80 },
      roleClarity: { score: 67 },
      problemDefinition: { score: 75 },
      resultEvidence: { score: 67 },
      authenticity: { score: 80 },
      jobFit: { score: 100 },
    });
    expect(computeTotalScoreFromDimensions(normalized)).toBe(75);
  });
});
