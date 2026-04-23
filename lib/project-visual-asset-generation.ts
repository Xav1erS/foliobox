import {
  inferProjectPageType,
  type ProjectPackageMode,
  type ProjectPageType,
  type ProjectPrototypeBoardDraft,
  type ProjectSceneSeedAsset,
  type ProjectStructureSuggestion,
} from "./project-editor-scene";

export type GeneratedVisualKind =
  | "flow_diagram"
  | "persona_board"
  | "journey_map"
  | "system_map"
  | "evidence_board";

export type PrototypeVisualAssetPlan = {
  sectionId: string;
  sectionTitle: string;
  pageType: ProjectPageType;
  visualKind: GeneratedVisualKind;
  title: string;
  prompt: string;
};

function hasExistingSectionVisual(
  sectionId: string,
  assets: ProjectSceneSeedAsset[]
) {
  return assets.some((asset) => {
    const meta =
      asset.metaJson && typeof asset.metaJson === "object"
        ? (asset.metaJson as Record<string, unknown>)
        : {};
    return (
      Boolean(meta.aiGenerated) &&
      meta.sourceSectionId === sectionId
    );
  });
}

function isEligibleVisualPageType(pageType: ProjectPageType) {
  return (
    pageType === "用户 / 流程 / 关键洞察" ||
    pageType === "流程 / 任务链优化页" ||
    pageType === "设计目标 / 设计策略" ||
    pageType === "全局结构优化" ||
    pageType === "结果 / 价值证明" ||
    pageType === "结果 / 简短总结"
  );
}

function inferVisualKind(pageType: ProjectPageType, draft: ProjectPrototypeBoardDraft): GeneratedVisualKind | null {
  const signal = [draft.title, draft.summary, draft.narrative, ...draft.keyPoints, draft.missingAssetNote]
    .filter(Boolean)
    .join(" ");
  if (pageType === "全局结构优化") return "system_map";
  if (pageType === "结果 / 价值证明" || pageType === "结果 / 简短总结") return "evidence_board";
  if (/画像|persona|角色|用户画像/i.test(signal)) return "persona_board";
  if (/旅程|journey|体验地图|路径|场景链/i.test(signal)) return "journey_map";
  if (
    pageType === "用户 / 流程 / 关键洞察" ||
    pageType === "流程 / 任务链优化页" ||
    pageType === "设计目标 / 设计策略"
  ) {
    return "flow_diagram";
  }
  return null;
}

function getVisualKindLabel(kind: GeneratedVisualKind) {
  if (kind === "flow_diagram") return "流程图";
  if (kind === "persona_board") return "用户画像";
  if (kind === "journey_map") return "体验地图";
  if (kind === "system_map") return "规则映射图";
  return "证据图";
}

function buildVisualPrompt(params: {
  projectName: string;
  sectionTitle: string;
  pageType: ProjectPageType;
  draft: ProjectPrototypeBoardDraft;
  factsSummary: string;
  visualKind: GeneratedVisualKind;
}) {
  const kindInstruction = {
    flow_diagram:
      "Create a clean editorial flow diagram that explains sequence, branching, state change, and recovery. Use minimal short labels only where necessary. Do not render dense body copy.",
    persona_board:
      "Create a compact persona board with portrait-free symbolic identity cues, behavior traits, goals, and pain points. Keep it diagrammatic rather than photoreal.",
    journey_map:
      "Create a journey-map style board with stages, actions, friction points, and emotional rhythm. Use clear segments and directional progression.",
    system_map:
      "Create a structured system / mapping diagram showing modules, rules, reuse, and relationships. It should feel like a design systems artifact, not a UI screenshot.",
    evidence_board:
      "Create an evidence board that feels like a product proof sheet: charts, callouts, badges, and feedback snippets. Do not invent literal numeric claims in the image.",
  }[params.visualKind];

  return `Design a single editorial visual asset for a UX case-study portfolio page.

Project: ${params.projectName}
Section: ${params.sectionTitle}
Page type: ${params.pageType}
Visual kind: ${getVisualKindLabel(params.visualKind)}

Known facts:
${params.factsSummary || "No additional facts provided."}

Page summary:
${params.draft.summary}

Narrative:
${params.draft.narrative || "Use the summary and key points."}

Key points:
${params.draft.keyPoints.join(" | ") || "No key points provided."}

Visual brief:
${params.draft.visualBrief || params.draft.missingAssetNote || "Create a supporting narrative visual."}

Requirements:
- Match a case-study portfolio visual language.
- Use an off-white background, restrained black typography/linework, and one subtle accent color.
- Make it feel like a designed artifact, not a marketing poster.
- Prefer clear structure, labels, blocks, arrows, annotations, and evidence framing.
- Avoid photoreal hero imagery unless the section clearly implies product proof.
- Avoid fake product screenshots, fake metrics, fake logos, or fake quoted user feedback.
- Avoid long paragraphs of tiny text.
- Deliver one landscape visual asset that can sit inside a 16:9 portfolio board.

${kindInstruction}`;
}

export function planPrototypeVisualAssets(params: {
  projectName: string;
  suggestion: ProjectStructureSuggestion;
  packageMode?: ProjectPackageMode;
  contentDrafts: ProjectPrototypeBoardDraft[];
  assets: ProjectSceneSeedAsset[];
  factsSummary: string;
}) {
  const draftBySectionId = new Map(params.contentDrafts.map((draft) => [draft.sectionId, draft]));
  const totalBoards = params.suggestion.groups.reduce((sum, group) => sum + group.sections.length, 0);
  const plans: PrototypeVisualAssetPlan[] = [];
  let boardIndex = 0;

  for (const group of params.suggestion.groups) {
    for (const section of group.sections) {
      const pageType = inferProjectPageType({
        group,
        section,
        boardIndex,
        totalBoards,
        packageMode: params.packageMode,
      });
      boardIndex += 1;
      const draft = draftBySectionId.get(section.id);
      if (!draft) continue;
      if (!isEligibleVisualPageType(pageType)) continue;
      if (draft.preferredAssetIds.length > 0) continue;
      if (hasExistingSectionVisual(section.id, params.assets)) continue;
      const visualKind = inferVisualKind(pageType, draft);
      if (!visualKind) continue;
      plans.push({
        sectionId: section.id,
        sectionTitle: section.title,
        pageType,
        visualKind,
        title: `${section.title} · AI${getVisualKindLabel(visualKind)}`,
        prompt: buildVisualPrompt({
          projectName: params.projectName,
          sectionTitle: section.title,
          pageType,
          draft,
          factsSummary: params.factsSummary,
          visualKind,
        }),
      });
    }
  }

  return plans;
}
