import {
  resolveProjectAssetMeta,
  type ProjectMaterialRecognition,
} from "@/lib/project-editor-scene";

export type SetupCompletenessInput = {
  facts: {
    timeline: string;
    roleTitle: string;
    background: string;
    businessGoal: string;
    biggestChallenge: string;
    resultSummary: string;
  };
  assets: Array<{ title: string | null; metaJson?: unknown }>;
  materialRecognition: ProjectMaterialRecognition | null;
};

export type SetupCompletenessDimensionKey =
  | "facts"
  | "assets"
  | "descriptions"
  | "aiFeedback";

export type SetupCompletenessDimension = {
  key: SetupCompletenessDimensionKey;
  label: string;
  score: number;
  maxScore: number;
  maxAfterFill: number;
  judgementState:
    | "full_judgement"
    | "limited_judgement"
    | "insufficient_evidence";
};

export type SetupCompletenessLevel = "ready" | "needs_improvement" | "not_ready";

export type SetupCompletenessScore = {
  totalScore: number;
  projectedScore: number;
  level: SetupCompletenessLevel;
  dimensions: SetupCompletenessDimension[];
};

const FACTS_MAX = 25;
const ASSETS_MAX = 25;
const DESCRIPTIONS_MAX = 20;
const AI_FEEDBACK_MAX = 30;

function scoreFacts(facts: SetupCompletenessInput["facts"]): number {
  let score = 0;
  const bgLen = facts.background.trim().length;
  if (bgLen >= 80) score += 10;
  else if (bgLen >= 30) score += 6;
  else if (bgLen > 0) score += 3;

  if (facts.businessGoal.trim()) score += 4;
  if (facts.biggestChallenge.trim()) score += 4;
  if (facts.resultSummary.trim()) score += 4;
  if (facts.roleTitle.trim()) score += 2;
  if (facts.timeline.trim()) score += 1;
  return score;
}

function scoreAssetsCount(count: number): number {
  if (count >= 6) return 25;
  if (count >= 3) return 18;
  if (count >= 1) return 10;
  return 0;
}

function scoreDescriptions(assets: SetupCompletenessInput["assets"]): number {
  if (assets.length === 0) return 0;
  let completed = 0;
  for (const a of assets) {
    const hasTitle = (a.title ?? "").trim().length > 0;
    const note = resolveProjectAssetMeta(a.metaJson).note ?? "";
    const hasNote = note.trim().length > 0;
    if (hasTitle && hasNote) completed += 1;
  }
  return Math.round((completed / assets.length) * DESCRIPTIONS_MAX);
}

function scoreAiFeedback(
  recognition: ProjectMaterialRecognition | null,
): { score: number; judgementState: SetupCompletenessDimension["judgementState"] } {
  if (!recognition) {
    return { score: 15, judgementState: "insufficient_evidence" };
  }
  const gaps = recognition.missingInfo?.length ?? 0;
  if (gaps === 0) return { score: 30, judgementState: "full_judgement" };
  if (gaps === 1) return { score: 25, judgementState: "limited_judgement" };
  if (gaps === 2) return { score: 20, judgementState: "limited_judgement" };
  if (gaps === 3) return { score: 15, judgementState: "limited_judgement" };
  return { score: 10, judgementState: "limited_judgement" };
}

function levelFor(total: number): SetupCompletenessLevel {
  if (total >= 85) return "ready";
  if (total >= 80) return "needs_improvement";
  return "not_ready";
}

export const SETUP_STRUCTURE_GATE = 80;

export function computeSetupCompleteness(
  input: SetupCompletenessInput,
): SetupCompletenessScore {
  const factsScore = scoreFacts(input.facts);
  const assetsScore = scoreAssetsCount(input.assets.length);
  const descScore = scoreDescriptions(input.assets);
  const ai = scoreAiFeedback(input.materialRecognition);

  const totalScore = factsScore + assetsScore + descScore + ai.score;
  const projectedScore = FACTS_MAX + assetsScore + DESCRIPTIONS_MAX + AI_FEEDBACK_MAX;

  const dimensions: SetupCompletenessDimension[] = [
    {
      key: "facts",
      label: "项目事实完整度",
      score: factsScore,
      maxScore: FACTS_MAX,
      maxAfterFill: FACTS_MAX,
      judgementState:
        factsScore >= FACTS_MAX - 3
          ? "full_judgement"
          : factsScore > 0
            ? "limited_judgement"
            : "insufficient_evidence",
    },
    {
      key: "assets",
      label: "素材数量",
      score: assetsScore,
      maxScore: ASSETS_MAX,
      maxAfterFill: assetsScore,
      judgementState:
        assetsScore >= ASSETS_MAX
          ? "full_judgement"
          : assetsScore > 0
            ? "limited_judgement"
            : "insufficient_evidence",
    },
    {
      key: "descriptions",
      label: "素材描述完整度",
      score: descScore,
      maxScore: DESCRIPTIONS_MAX,
      maxAfterFill: DESCRIPTIONS_MAX,
      judgementState:
        descScore >= DESCRIPTIONS_MAX
          ? "full_judgement"
          : descScore > 0
            ? "limited_judgement"
            : "insufficient_evidence",
    },
    {
      key: "aiFeedback",
      label: "AI 反馈回应度",
      score: ai.score,
      maxScore: AI_FEEDBACK_MAX,
      maxAfterFill: AI_FEEDBACK_MAX,
      judgementState: ai.judgementState,
    },
  ];

  return {
    totalScore,
    projectedScore,
    level: levelFor(totalScore),
    dimensions,
  };
}

export function setupLevelLabel(level: SetupCompletenessLevel): string {
  switch (level) {
    case "ready":
      return "AI 已充分理解，可开始生成结构";
    case "needs_improvement":
      return "可开始生成，建议先补充以提升效果";
    case "not_ready":
      return "信息不足，建议补充后再让 AI 理解";
  }
}
