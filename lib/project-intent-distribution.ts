import type { ProjectBoard } from "./project-editor-scene";
import {
  PROJECT_LAYOUT_INTENTS,
  type ProjectLayoutIntent,
} from "./project-editor-scene";

const INTENT_LABEL: Record<ProjectLayoutIntent, string> = {
  hero: "hero",
  split_2_1: "split_2_1",
  grid_3: "grid_3",
  grid_2x2: "grid_2x2",
  timeline: "timeline",
  narrative: "narrative",
  showcase: "showcase",
};

export type IntentDistributionEntry = {
  intent: ProjectLayoutIntent;
  count: number;
};

export type IntentDistribution = {
  total: number;
  unknown: number;
  distinct: number;
  entries: IntentDistributionEntry[];
};

export function computeIntentDistribution(boards: ProjectBoard[]): IntentDistribution {
  const counts = new Map<ProjectLayoutIntent, number>();
  let unknown = 0;
  let total = 0;

  for (const board of boards) {
    if (board.phase !== "prototype") continue;
    total += 1;
    const intent = board.layoutIntent;
    if (!intent) {
      unknown += 1;
      continue;
    }
    counts.set(intent, (counts.get(intent) ?? 0) + 1);
  }

  const entries: IntentDistributionEntry[] = PROJECT_LAYOUT_INTENTS.filter((intent) =>
    counts.has(intent)
  )
    .map((intent) => ({ intent, count: counts.get(intent) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return {
    total,
    unknown,
    distinct: entries.length,
    entries,
  };
}

export function summarizeIntentDistribution(distribution: IntentDistribution): string {
  if (distribution.total === 0) return "暂无内容稿";
  if (distribution.entries.length === 0) return "意图未记录";
  const parts = distribution.entries.map(
    (entry) => `${INTENT_LABEL[entry.intent]}×${entry.count}`
  );
  if (distribution.unknown > 0) parts.push(`未标注×${distribution.unknown}`);
  return parts.join(" · ");
}
