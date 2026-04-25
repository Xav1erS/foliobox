import {
  resolveProjectAssetMeta,
  type ProjectBoard,
  type ProjectMaterialRecognition,
  type ProjectSceneSeedAsset,
  type ProjectStructureSuggestion,
} from "./project-editor-scene";

export type AssetReasoningSource =
  | "ai_generated"
  | "keyword"
  | "preferred"
  | "recognition_hero"
  | "recognition_support"
  | "recognition_decorative"
  | "cover"
  | "fallback";

export type AssetReasoningBucket = "hero" | "support" | "decorative" | "risk" | "untagged";

export type BoardAssetReasoning = {
  assetId: string;
  assetTitle: string;
  bucket: AssetReasoningBucket;
  source: AssetReasoningSource;
  matchedKeywords: string[];
  sourceLabel: string;
  bucketLabel: string;
  detail: string;
};

const BUCKET_LABEL: Record<AssetReasoningBucket, string> = {
  hero: "主视觉",
  support: "辅助素材",
  decorative: "点缀",
  risk: "需确认",
  untagged: "未分类",
};

const SOURCE_LABEL: Record<AssetReasoningSource, string> = {
  ai_generated: "AI 生成",
  keyword: "关键词匹配",
  preferred: "AI 指定",
  recognition_hero: "识别为主视觉",
  recognition_support: "识别为辅助",
  recognition_decorative: "识别为点缀",
  cover: "封面候选",
  fallback: "兜底占位",
};

function inferBucketFromAsset(
  asset: ProjectSceneSeedAsset,
  recognition?: ProjectMaterialRecognition | null
): AssetReasoningBucket {
  const meta = resolveProjectAssetMeta(asset.metaJson);
  const roleTag = meta.roleTag;
  if (roleTag === "main") return "hero";
  if (roleTag === "support") return "support";
  if (roleTag === "decorative") return "decorative";
  if (roleTag === "risk") return "risk";

  if (!recognition) return "untagged";
  if (recognition.heroAssetIds?.includes(asset.id)) return "hero";
  if (recognition.supportingAssetIds?.includes(asset.id)) return "support";
  if (recognition.decorativeAssetIds?.includes(asset.id)) return "decorative";
  if (recognition.riskyAssetIds?.includes(asset.id)) return "risk";
  return "untagged";
}

function findSectionForBoard(
  board: ProjectBoard,
  suggestion?: ProjectStructureSuggestion | null
) {
  if (!suggestion || !board.structureSource?.sectionId) return null;
  for (const group of suggestion.groups) {
    const section = group.sections.find(
      (item) => item.id === board.structureSource?.sectionId
    );
    if (section) return { group, section };
  }
  return null;
}

function readAiGeneratedMeta(asset: ProjectSceneSeedAsset) {
  if (!asset.metaJson || typeof asset.metaJson !== "object") return null;
  const meta = asset.metaJson as Record<string, unknown>;
  if (!meta.aiGenerated) return null;
  return {
    visualKind: typeof meta.visualKind === "string" ? meta.visualKind : null,
    sourceSectionId:
      typeof meta.sourceSectionId === "string" ? meta.sourceSectionId : null,
  };
}

function getVisualKindLabel(kind: string | null) {
  if (!kind) return "AI 视觉";
  if (kind === "flow_diagram") return "流程图";
  if (kind === "persona_board") return "用户画像";
  if (kind === "journey_map") return "体验地图";
  if (kind === "system_map") return "规则映射图";
  if (kind === "evidence_board") return "证据图";
  return "AI 视觉";
}

function deriveReasoningForAsset(params: {
  asset: ProjectSceneSeedAsset;
  board: ProjectBoard;
  suggestion?: ProjectStructureSuggestion | null;
  recognition?: ProjectMaterialRecognition | null;
  boardIndex: number;
}): BoardAssetReasoning {
  const { asset, board, suggestion, recognition, boardIndex } = params;
  const bucket = inferBucketFromAsset(asset, recognition);
  const assetTitle = asset.title ?? asset.id;
  const sectionRef = findSectionForBoard(board, suggestion);
  const matchedKeywords: string[] = [];

  const aiMeta = readAiGeneratedMeta(asset);
  if (
    aiMeta &&
    (!aiMeta.sourceSectionId || aiMeta.sourceSectionId === board.structureSource?.sectionId)
  ) {
    const kindLabel = getVisualKindLabel(aiMeta.visualKind);
    return {
      assetId: asset.id,
      assetTitle,
      bucket,
      source: "ai_generated",
      matchedKeywords: [],
      sourceLabel: SOURCE_LABEL.ai_generated,
      bucketLabel: BUCKET_LABEL[bucket],
      detail: `AI 根据本页结构补了一张${kindLabel}。`,
    };
  }

  if (sectionRef) {
    const haystack = [asset.title ?? "", asset.id].join(" ").toLowerCase();
    const keywords = sectionRef.section.suggestedAssets
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    for (const keyword of keywords) {
      if (haystack.includes(keyword) || keyword.includes(haystack)) {
        matchedKeywords.push(keyword);
      }
    }
  }

  if (matchedKeywords.length > 0) {
    return {
      assetId: asset.id,
      assetTitle,
      bucket,
      source: "keyword",
      matchedKeywords,
      sourceLabel: SOURCE_LABEL.keyword,
      bucketLabel: BUCKET_LABEL[bucket],
      detail: `标题命中章节关键词：${matchedKeywords.join("、")}`,
    };
  }

  if (recognition?.heroAssetIds?.includes(asset.id)) {
    return {
      assetId: asset.id,
      assetTitle,
      bucket,
      source: "recognition_hero",
      matchedKeywords: [],
      sourceLabel: SOURCE_LABEL.recognition_hero,
      bucketLabel: BUCKET_LABEL[bucket],
      detail: "AI 识别为项目的主视觉候选。",
    };
  }
  if (recognition?.supportingAssetIds?.includes(asset.id)) {
    return {
      assetId: asset.id,
      assetTitle,
      bucket,
      source: "recognition_support",
      matchedKeywords: [],
      sourceLabel: SOURCE_LABEL.recognition_support,
      bucketLabel: BUCKET_LABEL[bucket],
      detail: "AI 识别为辅助说明类素材。",
    };
  }
  if (recognition?.decorativeAssetIds?.includes(asset.id)) {
    return {
      assetId: asset.id,
      assetTitle,
      bucket,
      source: "recognition_decorative",
      matchedKeywords: [],
      sourceLabel: SOURCE_LABEL.recognition_decorative,
      bucketLabel: BUCKET_LABEL[bucket],
      detail: "AI 识别为点缀/氛围类素材。",
    };
  }

  if (boardIndex === 0 && asset.isCover) {
    return {
      assetId: asset.id,
      assetTitle,
      bucket,
      source: "cover",
      matchedKeywords: [],
      sourceLabel: SOURCE_LABEL.cover,
      bucketLabel: BUCKET_LABEL[bucket],
      detail: "作为开篇封面候选。",
    };
  }

  return {
    assetId: asset.id,
    assetTitle,
    bucket,
    source: "fallback",
    matchedKeywords: [],
    sourceLabel: SOURCE_LABEL.fallback,
    bucketLabel: BUCKET_LABEL[bucket],
    detail: "暂未找到更契合的素材，先用该图占位。",
  };
}

export function deriveBoardAssetReasoning(params: {
  board: ProjectBoard;
  boardIndex: number;
  assets: ProjectSceneSeedAsset[];
  suggestion?: ProjectStructureSuggestion | null;
  recognition?: ProjectMaterialRecognition | null;
  /** sidecar: 优先级最高的视觉理由，key=`${sectionId}::${assetId}` */
  visionReasoning?: Record<string, string> | null;
}): BoardAssetReasoning[] {
  const { board, boardIndex, assets, suggestion, recognition, visionReasoning } = params;
  const assetById = new Map(assets.map((asset) => [asset.id, asset]));
  const ids = new Set<string>();
  const ordered: string[] = [];
  const pushId = (id: string | null | undefined) => {
    if (!id) return;
    if (ids.has(id)) return;
    if (!assetById.has(id)) return;
    ids.add(id);
    ordered.push(id);
  };

  if (board.thumbnailAssetId) pushId(board.thumbnailAssetId);
  for (const node of board.nodes) {
    if (node.type === "image" && !node.placeholder) {
      pushId(node.assetId);
    }
  }

  const sectionId = board.structureSource?.sectionId ?? null;
  return ordered.map((assetId) => {
    const base = deriveReasoningForAsset({
      asset: assetById.get(assetId) as ProjectSceneSeedAsset,
      board,
      suggestion,
      recognition,
      boardIndex,
    });
    if (sectionId && visionReasoning) {
      const key = `${sectionId}::${assetId}`;
      const visionDetail = visionReasoning[key];
      if (visionDetail) {
        return {
          ...base,
          detail: visionDetail,
        };
      }
    }
    return base;
  });
}

export type BoardVisualSuggestion = {
  id: string;
  kind: "visual_generation" | "text";
  label: string;
  description: string;
  actionLabel?: string;
};

export function deriveBoardContentSuggestions(params: {
  board: ProjectBoard;
  suggestion?: ProjectStructureSuggestion | null;
}): BoardVisualSuggestion[] {
  const { board } = params;
  const items: BoardVisualSuggestion[] = [];
  const base = board.contentSuggestions ?? [];
  base.forEach((text, index) => {
    items.push({
      id: `text-${index}`,
      kind: "text",
      label: text,
      description: "",
    });
  });

  const hasImageNode = board.nodes.some(
    (node) => node.type === "image" && !node.placeholder
  );
  if (!hasImageNode && !board.thumbnailAssetId) {
    items.push({
      id: "missing_visual",
      kind: "visual_generation",
      label: "本页暂无视觉素材",
      description: "可以让 AI 根据本页结构补一张说明图。",
      actionLabel: "生成补图",
    });
  }

  return items;
}
