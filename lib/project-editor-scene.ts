import { z } from "zod";

export const PROJECT_BOARD_WIDTH = 1920;
export const PROJECT_BOARD_HEIGHT = 1080;
export const DEFAULT_BOARD_BACKGROUND = "#ffffff";
export const DEFAULT_TEXT_COLOR = "#111111";
const LEGACY_EMPTY_BOARD_BACKGROUND = "#17191d";

export const PROJECT_IMAGE_ROLE_TAGS = [
  "main",
  "support",
  "decorative",
  "risk",
] as const;
export type ProjectImageRoleTag = (typeof PROJECT_IMAGE_ROLE_TAGS)[number];

export const PROJECT_TEXT_ROLES = [
  "title",
  "body",
  "caption",
  "note",
  "metric",
] as const;
export type ProjectTextRole = (typeof PROJECT_TEXT_ROLES)[number];

export const PROJECT_SHAPE_TYPES = [
  "rect",
  "square",
  "circle",
  "triangle",
  "line",
] as const;
export type ProjectShapeType = (typeof PROJECT_SHAPE_TYPES)[number];

export const PROJECT_BOARD_STATUSES = [
  "empty",
  "draft",
  "analyzed",
  "needs_attention",
  "ready",
] as const;
export type ProjectBoardStatus = (typeof PROJECT_BOARD_STATUSES)[number];

export const GenerationScopeSchema = z.object({
  mode: z.enum(["current", "selected", "all"]),
  boardIds: z.array(z.string()),
});

export type GenerationScope = z.infer<typeof GenerationScopeSchema>;

export const ProjectAssetMetaSchema = z
  .object({
    note: z.string().nullable().optional(),
    roleTag: z.enum(PROJECT_IMAGE_ROLE_TAGS).nullable().optional(),
  })
  .passthrough();

export type ProjectAssetMeta = z.infer<typeof ProjectAssetMetaSchema>;

const ProjectBoardTextNodeSchema = z.object({
  id: z.string(),
  type: z.literal("text"),
  text: z.string(),
  role: z.enum(PROJECT_TEXT_ROLES),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fontSize: z.number(),
  fontWeight: z.number(),
  lineHeight: z.number(),
  align: z.enum(["left", "center", "right"]),
  color: z.string(),
  zIndex: z.number(),
});

const ProjectBoardImageNodeSchema = z.object({
  id: z.string(),
  type: z.literal("image"),
  assetId: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fit: z.enum(["fill", "fit"]),
  crop: z.object({
    x: z.number(),
    y: z.number(),
    scale: z.number(),
  }),
  note: z.string().nullable(),
  roleTag: z.enum(PROJECT_IMAGE_ROLE_TAGS).nullable(),
  zIndex: z.number(),
});

const ProjectBoardShapeNodeSchema = z.object({
  id: z.string(),
  type: z.literal("shape"),
  shape: z.enum(PROJECT_SHAPE_TYPES),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fill: z.string(),
  stroke: z.string().nullable(),
  strokeWidth: z.number(),
  opacity: z.number(),
  zIndex: z.number(),
});

export const ProjectBoardNodeSchema = z.discriminatedUnion("type", [
  ProjectBoardTextNodeSchema,
  ProjectBoardImageNodeSchema,
  ProjectBoardShapeNodeSchema,
]);

export type ProjectBoardNode = z.infer<typeof ProjectBoardNodeSchema>;
export type ProjectBoardTextNode = z.infer<typeof ProjectBoardTextNodeSchema>;
export type ProjectBoardImageNode = z.infer<typeof ProjectBoardImageNodeSchema>;
export type ProjectBoardShapeNode = z.infer<typeof ProjectBoardShapeNodeSchema>;

export const ProjectBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  intent: z.string(),
  status: z.enum(PROJECT_BOARD_STATUSES),
  frame: z.object({
    width: z.literal(PROJECT_BOARD_WIDTH),
    height: z.literal(PROJECT_BOARD_HEIGHT),
    background: z.string(),
  }),
  thumbnailAssetId: z.string().nullable(),
  nodes: z.array(ProjectBoardNodeSchema),
  aiMarkers: z.object({
    hasAnalysis: z.boolean(),
    hasPendingSuggestion: z.boolean(),
  }),
});

export type ProjectBoard = z.infer<typeof ProjectBoardSchema>;

export const ProjectEditorSceneSchema = z.object({
  version: z.literal(1),
  activeBoardId: z.string(),
  boardOrder: z.array(z.string()),
  boards: z.array(ProjectBoardSchema),
  generationScope: GenerationScopeSchema,
  viewport: z.object({
    zoom: z.number(),
    panX: z.number(),
    panY: z.number(),
  }),
});

export type ProjectEditorScene = z.infer<typeof ProjectEditorSceneSchema>;

export const ProjectStructureSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  purpose: z.string(),
  recommendedContent: z.array(z.string()),
  suggestedAssets: z.array(z.string()),
});

export const ProjectStructureGroupSchema = z.object({
  id: z.string(),
  label: z.string(),
  rationale: z.string(),
  narrativeRole: z.string(),
  sections: z.array(ProjectStructureSectionSchema),
});

export const ProjectStructureSuggestionSchema = z.object({
  generatedAt: z.string().optional().default(""),
  summary: z.string(),
  narrativeArc: z.string(),
  status: z.enum(["draft", "confirmed"]).optional().default("draft"),
  confirmedAt: z.string().nullable().optional().default(null),
  groups: z.array(ProjectStructureGroupSchema),
});

export type ProjectStructureSection = z.infer<typeof ProjectStructureSectionSchema>;
export type ProjectStructureGroup = z.infer<typeof ProjectStructureGroupSchema>;
export type ProjectStructureSuggestion = z.infer<typeof ProjectStructureSuggestionSchema>;

export const ProjectRecognitionDiffSchema = z.object({
  generatedAt: z.string().optional().default(""),
  newAssetIds: z.array(z.string()),
  summary: z.string(),
  changes: z.array(z.string()),
  shouldRefreshStructure: z.boolean(),
});

export type ProjectRecognitionDiff = z.infer<typeof ProjectRecognitionDiffSchema>;

export const ProjectMaterialRecognitionSchema = z.object({
  generatedAt: z.string().optional().default(""),
  summary: z.string(),
  recognizedTypes: z.array(z.string()),
  heroAssetIds: z.array(z.string()),
  supportingAssetIds: z.array(z.string()),
  decorativeAssetIds: z.array(z.string()),
  riskyAssetIds: z.array(z.string()),
  missingInfo: z.array(z.string()),
  suggestedNextStep: z.string(),
  recognizedAssetIds: z.array(z.string()).optional().default([]),
  lastIncrementalDiff: ProjectRecognitionDiffSchema.nullable().optional().default(null),
});

export type ProjectMaterialRecognition = z.infer<typeof ProjectMaterialRecognitionSchema>;

export type GeneratedLayoutPageSeed = {
  pageNumber: number;
  type: string;
  titleSuggestion: string;
  contentGuidance: string;
  keyPoints: string[];
  assetHint?: string;
  wordCountGuideline?: string;
};

export type ProjectSceneSeedAsset = {
  id: string;
  title?: string | null;
  imageUrl?: string;
  selected?: boolean;
  isCover?: boolean;
  metaJson?: unknown;
};

export type ProjectLayoutDocument = Record<string, unknown> & {
  packageMode?: "DEEP" | "LIGHT" | "SUPPORTIVE";
  totalPages?: number;
  narrativeSummary?: string;
  pages?: GeneratedLayoutPageSeed[];
  qualityNotes?: string[];
  editorScene?: ProjectEditorScene;
  materialRecognition?: ProjectMaterialRecognition;
  structureSuggestion?: ProjectStructureSuggestion;
};

function createSceneId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveProjectAssetMeta(metaJson: unknown): ProjectAssetMeta {
  const parsed = ProjectAssetMetaSchema.safeParse(metaJson);
  return {
    note: parsed.success ? parsed.data.note ?? null : null,
    roleTag: parsed.success ? parsed.data.roleTag ?? null : null,
  };
}

export function mergeProjectAssetMeta(
  metaJson: unknown,
  patch: Partial<ProjectAssetMeta>
): ProjectAssetMeta {
  const current = resolveProjectAssetMeta(metaJson);
  return {
    ...current,
    ...patch,
    note: patch.note === undefined ? current.note ?? null : patch.note ?? null,
    roleTag:
      patch.roleTag === undefined ? current.roleTag ?? null : patch.roleTag ?? null,
  };
}

export function hasGeneratedLayoutData(layoutJson: unknown) {
  if (!layoutJson || typeof layoutJson !== "object" || Array.isArray(layoutJson)) {
    return false;
  }

  const raw = layoutJson as Record<string, unknown>;
  return (
    typeof raw.packageMode === "string" &&
    typeof raw.totalPages === "number" &&
    typeof raw.narrativeSummary === "string" &&
    Array.isArray(raw.pages)
  );
}

export function resolveProjectLayoutDocument(layoutJson: unknown): ProjectLayoutDocument {
  if (!layoutJson || typeof layoutJson !== "object" || Array.isArray(layoutJson)) {
    return {};
  }

  const raw = layoutJson as ProjectLayoutDocument;
  const parsedScene = ProjectEditorSceneSchema.safeParse(raw.editorScene);
  const parsedMaterialRecognition = ProjectMaterialRecognitionSchema.safeParse(
    raw.materialRecognition
  );
  const parsedStructureSuggestion = ProjectStructureSuggestionSchema.safeParse(
    raw.structureSuggestion
  );

  return {
    ...raw,
    editorScene: parsedScene.success ? normalizeProjectEditorScene(parsedScene.data) : undefined,
    materialRecognition: parsedMaterialRecognition.success
      ? parsedMaterialRecognition.data
      : undefined,
    structureSuggestion: parsedStructureSuggestion.success
      ? parsedStructureSuggestion.data
      : undefined,
  };
}

export function mergeProjectLayoutDocument(
  layoutJson: unknown,
  patch: Partial<ProjectLayoutDocument>
): ProjectLayoutDocument {
  const current = resolveProjectLayoutDocument(layoutJson);
  return {
    ...current,
    ...patch,
    editorScene:
      patch.editorScene === undefined
        ? current.editorScene
        : normalizeProjectEditorScene(patch.editorScene),
  };
}

export function createProjectTextNode(
  patch: Partial<ProjectBoardTextNode> & Pick<ProjectBoardTextNode, "text" | "role">
): ProjectBoardTextNode {
  return {
    id: patch.id ?? createSceneId("text"),
    type: "text",
    text: patch.text,
    role: patch.role,
    x: patch.x ?? 128,
    y: patch.y ?? 128,
    width: patch.width ?? 640,
    height: patch.height ?? 120,
    fontSize: patch.fontSize ?? (patch.role === "title" ? 72 : patch.role === "metric" ? 56 : 28),
    fontWeight: patch.fontWeight ?? (patch.role === "title" ? 700 : patch.role === "metric" ? 600 : 400),
    lineHeight: patch.lineHeight ?? (patch.role === "title" ? 1.08 : 1.45),
    align: patch.align ?? "left",
    color: patch.color ?? DEFAULT_TEXT_COLOR,
    zIndex: patch.zIndex ?? 1,
  };
}

export function createProjectImageNode(
  assetId: string,
  patch?: Partial<ProjectBoardImageNode>
): ProjectBoardImageNode {
  return {
    id: patch?.id ?? createSceneId("image"),
    type: "image",
    assetId,
    x: patch?.x ?? 1056,
    y: patch?.y ?? 160,
    width: patch?.width ?? 704,
    height: patch?.height ?? 560,
    fit: patch?.fit ?? "fill",
    crop: patch?.crop ?? { x: 0.5, y: 0.5, scale: 1 },
    note: patch?.note ?? null,
    roleTag: patch?.roleTag ?? null,
    zIndex: patch?.zIndex ?? 2,
  };
}

export function createProjectShapeNode(
  shape: ProjectShapeType,
  patch?: Partial<ProjectBoardShapeNode>
): ProjectBoardShapeNode {
  return {
    id: patch?.id ?? createSceneId("shape"),
    type: "shape",
    shape,
    x: patch?.x ?? 240,
    y: patch?.y ?? 220,
    width: patch?.width ?? 320,
    height: patch?.height ?? 200,
    fill: patch?.fill ?? "#111111",
    stroke: patch?.stroke ?? null,
    strokeWidth: patch?.strokeWidth ?? 0,
    opacity: patch?.opacity ?? 1,
    zIndex: patch?.zIndex ?? 3,
  };
}
export function createProjectBoard(
  patch?: Partial<ProjectBoard>
): ProjectBoard {
  return {
    id: patch?.id ?? createSceneId("board"),
    name: patch?.name ?? "Untitled board",
    intent: patch?.intent ?? "",
    status: patch?.status ?? "empty",
    frame: {
      width: PROJECT_BOARD_WIDTH,
      height: PROJECT_BOARD_HEIGHT,
      background: patch?.frame?.background ?? DEFAULT_BOARD_BACKGROUND,
    },
    thumbnailAssetId: patch?.thumbnailAssetId ?? null,
    nodes: patch?.nodes ?? [],
    aiMarkers: patch?.aiMarkers ?? { hasAnalysis: false, hasPendingSuggestion: false },
  };
}

export function createEmptyProjectEditorScene(projectName?: string): ProjectEditorScene {
  const board = createProjectBoard({
    name: "Start",
    intent: projectName
      ? `用这一页搭出 ${projectName} 的项目开场`
      : "用这一页搭出项目开场",
    status: "empty",
  });

  return {
    version: 1,
    activeBoardId: board.id,
    boardOrder: [board.id],
    boards: [board],
    generationScope: { mode: "current", boardIds: [board.id] },
    viewport: { zoom: 1, panX: 0, panY: 0 },
  };
}

function matchAssetIdForStructureSection(params: {
  section: ProjectStructureSection;
  assets: ProjectSceneSeedAsset[];
  usedAssetIds: Set<string>;
  recognition?: ProjectMaterialRecognition;
  boardIndex: number;
}) {
  const { section, assets, usedAssetIds, recognition, boardIndex } = params;
  const availableAssets = assets.filter((asset) => !usedAssetIds.has(asset.id));
  const keywords = section.suggestedAssets
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const matchedByKeyword = availableAssets.find((asset) => {
    const haystack = [asset.title ?? "", asset.id].join(" ").toLowerCase();
    return keywords.some((keyword) => haystack.includes(keyword) || keyword.includes(haystack));
  });
  if (matchedByKeyword) return matchedByKeyword.id;

  const prioritizedIds = [
    ...(recognition?.heroAssetIds ?? []),
    ...(recognition?.supportingAssetIds ?? []),
    ...(recognition?.decorativeAssetIds ?? []),
  ];
  const prioritizedAvailable = prioritizedIds.find(
    (assetId) => !usedAssetIds.has(assetId) && assets.some((asset) => asset.id === assetId)
  );
  if (prioritizedAvailable) return prioritizedAvailable;

  const coverAsset = availableAssets.find((asset) => asset.isCover);
  if (boardIndex === 0 && coverAsset) return coverAsset.id;

  return availableAssets[0]?.id ?? null;
}

export function buildProjectSceneFromStructureSuggestion(params: {
  suggestion: ProjectStructureSuggestion;
  assets: ProjectSceneSeedAsset[];
  projectName?: string;
  recognition?: ProjectMaterialRecognition;
}): ProjectEditorScene {
  const { suggestion, assets, projectName, recognition } = params;
  const usedAssetIds = new Set<string>();
  const boards: ProjectBoard[] = [];

  suggestion.groups.forEach((group) => {
    group.sections.forEach((section, sectionIndex) => {
      const matchedAssetId = matchAssetIdForStructureSection({
        section,
        assets,
        usedAssetIds,
        recognition,
        boardIndex: boards.length,
      });

      if (matchedAssetId) {
        usedAssetIds.add(matchedAssetId);
      }

      const nodes: ProjectBoardNode[] = [
        createProjectTextNode({
          role: "caption",
          text: group.label,
          x: 128,
          y: 92,
          width: 520,
          height: 36,
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 1.2,
          color: "#6c655d",
          zIndex: 1,
        }),
        createProjectTextNode({
          role: "title",
          text: section.title,
          x: 128,
          y: 148,
          width: 880,
          height: 120,
          fontSize: 78,
          fontWeight: 700,
          lineHeight: 1.06,
          zIndex: 2,
        }),
        createProjectTextNode({
          role: "body",
          text: section.purpose,
          x: 128,
          y: 294,
          width: 720,
          height: 210,
          fontSize: 28,
          fontWeight: 400,
          lineHeight: 1.45,
          zIndex: 3,
        }),
      ];

      if (section.recommendedContent.length > 0) {
        nodes.push(
          createProjectTextNode({
            role: "note",
            text: section.recommendedContent.map((item) => `• ${item}`).join("\n"),
            x: 128,
            y: 560,
            width: 720,
            height: 220,
            fontSize: 22,
            fontWeight: 400,
            lineHeight: 1.45,
            color: "#3e3934",
            zIndex: 4,
          })
        );
      }

      if (matchedAssetId) {
        const meta = resolveProjectAssetMeta(
          assets.find((asset) => asset.id === matchedAssetId)?.metaJson
        );
        nodes.push(
          createProjectImageNode(matchedAssetId, {
            x: 1040,
            y: 148,
            width: 720,
            height: 540,
            note: meta.note ?? null,
            roleTag: meta.roleTag ?? null,
            zIndex: 5,
          })
        );
      }

      boards.push(
        createProjectBoard({
          name:
            suggestion.groups.length > 1
              ? `${group.label} · ${section.title}`
              : section.title || `${projectName ?? "项目"} · ${sectionIndex + 1}`,
          intent: `${group.label}：${section.purpose}`,
          status: "draft",
          thumbnailAssetId: matchedAssetId,
          nodes,
          aiMarkers: { hasAnalysis: false, hasPendingSuggestion: false },
        })
      );
    });
  });

  if (boards.length === 0) {
    return createEmptyProjectEditorScene(projectName);
  }

  return normalizeProjectEditorScene({
    version: 1,
    activeBoardId: boards[0].id,
    boardOrder: boards.map((board) => board.id),
    boards,
    generationScope: { mode: "all", boardIds: boards.map((board) => board.id) },
    viewport: { zoom: 1, panX: 0, panY: 0 },
  });
}

export function seedProjectEditorSceneFromLayout({
  layoutPages,
  assets,
}: {
  layoutPages: GeneratedLayoutPageSeed[];
  assets: ProjectSceneSeedAsset[];
}): ProjectEditorScene {
  const fallbackAsset = assets.find((asset) => asset.isCover) ?? assets[0] ?? null;

  const boards = layoutPages.map((page, index) => {
    const matchedAsset = assets[index] ?? fallbackAsset;
    const nodes: ProjectBoardNode[] = [
      createProjectTextNode({
        role: "title",
        text: page.titleSuggestion,
        x: 128,
        y: 112,
        width: 760,
        height: 120,
        fontSize: 82,
        fontWeight: 700,
        lineHeight: 1.05,
      }),
      createProjectTextNode({
        role: "body",
        text: page.contentGuidance,
        x: 128,
        y: 264,
        width: 760,
        height: 320,
        fontSize: 28,
        fontWeight: 400,
        lineHeight: 1.5,
      }),
    ];

    if (matchedAsset) {
      const meta = resolveProjectAssetMeta(matchedAsset.metaJson);
      nodes.push(
        createProjectImageNode(matchedAsset.id, {
          note: meta.note ?? null,
          roleTag: meta.roleTag ?? null,
        })
      );
    }

    return createProjectBoard({
      name: page.titleSuggestion || `Board ${index + 1}`,
      intent: page.contentGuidance,
      status: "draft",
      thumbnailAssetId: matchedAsset?.id ?? null,
      nodes,
      aiMarkers: { hasAnalysis: false, hasPendingSuggestion: false },
    });
  });

  const activeBoardId = boards[0]?.id ?? createEmptyProjectEditorScene().activeBoardId;

  return normalizeProjectEditorScene({
    version: 1,
    activeBoardId,
    boardOrder: boards.map((board) => board.id),
    boards,
    generationScope: { mode: "all", boardIds: boards.map((board) => board.id) },
    viewport: { zoom: 1, panX: 0, panY: 0 },
  });
}

export function resolveProjectEditorScene(
  layoutJson: unknown,
  options: {
    assets: ProjectSceneSeedAsset[];
    projectName?: string;
  }
): ProjectEditorScene {
  const layoutDocument = resolveProjectLayoutDocument(layoutJson);
  if (layoutDocument.editorScene) {
    return normalizeProjectEditorScene(layoutDocument.editorScene);
  }

  if (hasGeneratedLayoutData(layoutDocument) && Array.isArray(layoutDocument.pages)) {
    return seedProjectEditorSceneFromLayout({
      layoutPages: layoutDocument.pages,
      assets: options.assets,
    });
  }

  return createEmptyProjectEditorScene(options.projectName);
}

export function normalizeProjectEditorScene(scene: ProjectEditorScene): ProjectEditorScene {
  const parsed = ProjectEditorSceneSchema.safeParse(scene);
  const safeScene = parsed.success ? parsed.data : createEmptyProjectEditorScene();

  const boardMap = new Map(safeScene.boards.map((board) => [board.id, board]));
  const normalizedBoards = Array.from(boardMap.values()).map((board) =>
    createProjectBoard({
      ...board,
      frame: {
        width: PROJECT_BOARD_WIDTH,
        height: PROJECT_BOARD_HEIGHT,
        background:
          board.frame.background === LEGACY_EMPTY_BOARD_BACKGROUND && board.nodes.length === 0
            ? DEFAULT_BOARD_BACKGROUND
            : board.frame.background ?? DEFAULT_BOARD_BACKGROUND,
      },
      nodes: [...board.nodes].sort((a, b) => a.zIndex - b.zIndex),
    })
  );

  if (normalizedBoards.length === 0) {
    return createEmptyProjectEditorScene();
  }

  const normalizedOrder = [
    ...safeScene.boardOrder.filter((boardId) => boardMap.has(boardId)),
    ...normalizedBoards
      .map((board) => board.id)
      .filter((boardId) => !safeScene.boardOrder.includes(boardId)),
  ];

  const activeBoardId =
    normalizedOrder.find((boardId) => boardId === safeScene.activeBoardId) ??
    normalizedOrder[0];

  const generationIds = safeScene.generationScope.boardIds.filter((boardId) =>
    normalizedOrder.includes(boardId)
  );

  return {
    version: 1,
    activeBoardId,
    boardOrder: normalizedOrder,
    boards: normalizedBoards,
    generationScope: {
      mode: safeScene.generationScope.mode,
      boardIds:
        generationIds.length > 0
          ? generationIds
          : activeBoardId
            ? [activeBoardId]
            : [],
    },
    viewport: {
      zoom: Math.min(Math.max(safeScene.viewport.zoom || 1, 0.35), 2),
      panX: safeScene.viewport.panX || 0,
      panY: safeScene.viewport.panY || 0,
    },
  };
}

export function getSceneBoardById(scene: ProjectEditorScene, boardId: string | null) {
  if (!boardId) return null;
  return scene.boards.find((board) => board.id === boardId) ?? null;
}

export function getGenerationScopeBoardIds(scene: ProjectEditorScene) {
  if (scene.generationScope.mode === "all") {
    return scene.boardOrder;
  }
  if (scene.generationScope.mode === "selected") {
    return scene.generationScope.boardIds.filter((boardId) =>
      scene.boardOrder.includes(boardId)
    );
  }
  return scene.activeBoardId ? [scene.activeBoardId] : [];
}

export function serializeSceneForHash(scene: ProjectEditorScene) {
  const boardIds = getGenerationScopeBoardIds(scene);
  return boardIds.map((boardId) => {
    const board = getSceneBoardById(scene, boardId);
    if (!board) return null;
    return {
      id: board.id,
      name: board.name,
      intent: board.intent,
      status: board.status,
      nodes: board.nodes.map((node) => {
        if (node.type === "text") {
          return {
            id: node.id,
            type: node.type,
            role: node.role,
            text: node.text,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
          };
        }
        if (node.type === "image") {
          return {
            id: node.id,
            type: node.type,
            assetId: node.assetId,
            roleTag: node.roleTag,
            note: node.note,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
          };
        }
        return {
          id: node.id,
          type: node.type,
          shape: node.shape,
          fill: node.fill,
          stroke: node.stroke,
          strokeWidth: node.strokeWidth,
          opacity: node.opacity,
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        };
      }),
    };
  });
}

export function summarizeProjectSceneForAI({
  scene,
  assets,
  scope,
}: {
  scene: ProjectEditorScene;
  assets: ProjectSceneSeedAsset[];
  scope?: GenerationScope;
}) {
  const assetMap = new Map(
    assets.map((asset) => [
      asset.id,
      {
        title: asset.title ?? "未命名素材",
        meta: resolveProjectAssetMeta(asset.metaJson),
      },
    ])
  );

  const boardIds =
    scope?.mode === "all"
      ? scene.boardOrder
      : scope?.mode === "selected"
        ? scope.boardIds.filter((boardId) => scene.boardOrder.includes(boardId))
        : scope?.mode === "current"
          ? scope.boardIds.slice(0, 1)
          : getGenerationScopeBoardIds(scene);

  if (boardIds.length === 0) {
    return "（当前没有可分析的画板）";
  }

  return boardIds
    .map((boardId, index) => {
      const board = getSceneBoardById(scene, boardId);
      if (!board) return null;

      const textSummary = board.nodes
        .filter((node): node is ProjectBoardTextNode => node.type === "text")
        .map((node) => `${node.role}：${node.text}`)
        .filter(Boolean)
        .slice(0, 3)
        .join("；");

      const imageSummary = board.nodes
        .filter((node): node is ProjectBoardImageNode => node.type === "image")
        .map((node) => {
          const asset = assetMap.get(node.assetId);
          const note = node.note ?? asset?.meta.note ?? "";
          const roleTag = node.roleTag ?? asset?.meta.roleTag ?? "";
          return `${asset?.title ?? node.assetId}${roleTag ? `【${roleTag}】` : ""}${note ? `：${note}` : ""}`;
        })
        .slice(0, 4)
        .join("；");

      const shapeSummary = board.nodes
        .filter((node): node is ProjectBoardShapeNode => node.type === "shape")
        .map((node) => node.shape)
        .slice(0, 6)
        .join("、");

      return [
        `画板 ${index + 1}`,
        `名称：${board.name || "未命名"}`,
        `页面意图：${board.intent || "未填写"}`,
        `状态：${board.status}`,
        `文本内容：${textSummary || "无"}`,
        `引用素材：${imageSummary || "无"}`,
        `图形元素：${shapeSummary || "无"}`,
      ].join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

export function summarizeMaterialRecognitionForAI({
  recognition,
  assets,
}: {
  recognition: ProjectMaterialRecognition | null | undefined;
  assets: ProjectSceneSeedAsset[];
}) {
  if (!recognition) {
    return "（暂无轻识别结果）";
  }

  const assetMap = new Map(
    assets.map((asset) => [asset.id, asset.title ?? asset.id])
  );

  const formatAssets = (ids: string[]) =>
    ids.length > 0 ? ids.map((id) => assetMap.get(id) ?? id).join("、") : "无";

  return [
    `总结：${recognition.summary}`,
    `识别类型：${recognition.recognizedTypes.join("、") || "无"}`,
    `主讲素材：${formatAssets(recognition.heroAssetIds)}`,
    `补充素材：${formatAssets(recognition.supportingAssetIds)}`,
    `装饰素材：${formatAssets(recognition.decorativeAssetIds)}`,
    `风险素材：${formatAssets(recognition.riskyAssetIds)}`,
    `缺失信息：${recognition.missingInfo.join("、") || "无"}`,
    `建议下一步：${recognition.suggestedNextStep}`,
    `已识别素材：${formatAssets(recognition.recognizedAssetIds)}`,
    recognition.lastIncrementalDiff
      ? `最近增量变化：${recognition.lastIncrementalDiff.summary}`
      : null,
  ].join("\n");
}

export function markBoardsAsAnalyzed(
  scene: ProjectEditorScene,
  boardIds: string[],
  status: ProjectBoard["status"]
) {
  return normalizeProjectEditorScene({
    ...scene,
    boards: scene.boards.map((board) =>
      boardIds.includes(board.id)
        ? {
            ...board,
            status,
            aiMarkers: {
              hasAnalysis: true,
              hasPendingSuggestion: status === "needs_attention",
            },
          }
        : board
    ),
  });
}

export function markBoardsAfterGeneration(
  scene: ProjectEditorScene,
  boardIds: string[]
) {
  return normalizeProjectEditorScene({
    ...scene,
    boards: scene.boards.map((board) =>
      boardIds.includes(board.id)
        ? {
            ...board,
            status: board.nodes.length > 0 ? "ready" : "draft",
            aiMarkers: {
              ...board.aiMarkers,
              hasPendingSuggestion: false,
            },
          }
        : board
    ),
  });
}
