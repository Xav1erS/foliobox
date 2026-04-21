import { z } from "zod";
import type { StyleProfile } from "./style-reference-presets";

export const PROJECT_BOARD_WIDTH = 1920;
export const PROJECT_BOARD_HEIGHT = 1080;
/**
 * 当前版本单个 Project 的画板数量硬上限。
 * 参见 spec-system-v3/04 §4.5 与 spec-system-v3/09：
 * - 用户手动新建达到上限时按钮置灰并显示剩余数
 * - Setup 阶段 AI 建议的章节数不得超过该上限
 * - 服务端生成 / 落板必须校验该上限
 */
export const MAX_PROJECT_BOARDS = 12;
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

export const PROJECT_PAGE_TYPES = [
  "项目定位 / 背景页",
  "业务背景 / 问题背景",
  "用户 / 流程 / 关键洞察",
  "设计目标 / 设计策略",
  "全局结构优化",
  "关键模块优化",
  "流程 / 任务链优化页",
  "结果 / 价值证明",
  "总结 / 反思",
  "项目定位 / 背景",
  "问题与目标",
  "核心方案 / 关键界面",
  "before / after 或流程优化",
  "结果 / 简短总结",
  "作品定位 / 题材说明",
  "关键视觉或关键界面",
  "简短说明 / 角色说明",
] as const;
export type ProjectPageType = (typeof PROJECT_PAGE_TYPES)[number];
export const ProjectPageTypeSchema = z.enum(PROJECT_PAGE_TYPES);

export const PROJECT_BOARD_PHASES = ["prototype", "generated"] as const;
export type ProjectBoardPhase = (typeof PROJECT_BOARD_PHASES)[number];
export const ProjectBoardPhaseSchema = z.enum(PROJECT_BOARD_PHASES);

export const PROJECT_VALIDATION_STATES = [
  "unknown",
  "pass",
  "pass_with_notes",
  "not_ready",
] as const;
export type ProjectValidationState = (typeof PROJECT_VALIDATION_STATES)[number];
export const ProjectValidationStateSchema = z.enum(PROJECT_VALIDATION_STATES);

export const PROJECT_VALIDATION_VERDICTS = [
  "可进入作品集",
  "可进入，但建议先补充",
  "暂不建议进入作品集",
] as const;
export type ProjectValidationVerdict = (typeof PROJECT_VALIDATION_VERDICTS)[number];
export const ProjectValidationVerdictSchema = z.enum(PROJECT_VALIDATION_VERDICTS);

export const PROJECT_VALIDATION_CAUSES = [
  "system_generation_failed",
  "missing_user_material",
  "user_modified_regression",
] as const;
export type ProjectValidationCause = (typeof PROJECT_VALIDATION_CAUSES)[number];
export const ProjectValidationCauseSchema = z.enum(PROJECT_VALIDATION_CAUSES);

export const PROJECT_BOARD_VALIDATION_STATUSES = ["pass", "warn", "block"] as const;
export type ProjectBoardValidationStatus = (typeof PROJECT_BOARD_VALIDATION_STATUSES)[number];
export const ProjectBoardValidationStatusSchema = z.enum(PROJECT_BOARD_VALIDATION_STATUSES);

export type ProjectPackageMode = "DEEP" | "LIGHT" | "SUPPORTIVE";

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
  fontFamily: z.string().optional().default("Inter"),
  lineHeight: z.number(),
  align: z.enum(["left", "center", "right"]),
  color: z.string(),
  zIndex: z.number(),
  placeholder: z.boolean().optional().default(false),
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
  placeholder: z.boolean().optional().default(false),
});

const GradientStopSchema = z.object({
  offset: z.number(),
  color: z.string(),
});

const GradientConfigSchema = z
  .object({
    angle: z.number().default(90),
    stops: z.array(GradientStopSchema).min(2),
  })
  .nullable()
  .optional();

const ProjectBoardShapeNodeSchema = z.object({
  id: z.string(),
  type: z.literal("shape"),
  shape: z.enum(PROJECT_SHAPE_TYPES),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fill: z.string(),
  gradient: GradientConfigSchema.default(null),
  stroke: z.string().nullable(),
  strokeWidth: z.number(),
  opacity: z.number(),
  rx: z.number().optional().default(0),
  zIndex: z.number(),
  placeholder: z.boolean().optional().default(false),
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

export const ProjectBoardStructureSourceSchema = z.object({
  groupId: z.string().nullable().optional().default(null),
  groupLabel: z.string().nullable().optional().default(null),
  groupIndex: z.number().int().nullable().optional().default(null),
  sectionId: z.string().nullable().optional().default(null),
  sectionTitle: z.string().nullable().optional().default(null),
  sectionIndex: z.number().int().nullable().optional().default(null),
});

export type ProjectBoardStructureSource = z.infer<
  typeof ProjectBoardStructureSourceSchema
>;

export const ProjectBoardSchema = z.object({
  id: z.string(),
  name: z.string(),
  intent: z.string(),
  frame: z.object({
    width: z.literal(PROJECT_BOARD_WIDTH),
    height: z.literal(PROJECT_BOARD_HEIGHT),
    background: z.string(),
  }),
  thumbnailAssetId: z.string().nullable(),
  nodes: z.array(ProjectBoardNodeSchema),
  structureSource: ProjectBoardStructureSourceSchema.nullable().optional().default(null),
  // AI 生成的内容建议（来自结构建议的 recommendedContent），不放画布上，显示在 Inspector
  contentSuggestions: z.array(z.string()).optional().default([]),
  // 画板锁定：开启后该画板不参与任何 AI 写操作（生成排版 / 更新排版 / 重新生成 / 局部改写）
  locked: z.boolean().optional().default(false),
  pageType: ProjectPageTypeSchema.nullable().optional().default(null),
  phase: ProjectBoardPhaseSchema.nullable().optional().default(null),
});

export type ProjectBoard = z.infer<typeof ProjectBoardSchema>;

export type ProjectBoardGroupRun = {
  key: string;
  label: string | null;
  structureGroupId: string | null;
  boards: ProjectBoard[];
};

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

export const ProjectBoardValidationSchema = z.object({
  boardId: z.string(),
  phase: ProjectBoardPhaseSchema.nullable().optional().default(null),
  status: ProjectBoardValidationStatusSchema,
  cause: ProjectValidationCauseSchema.nullable().optional().default(null),
  message: z.string(),
});

export type ProjectBoardValidation = z.infer<typeof ProjectBoardValidationSchema>;

export const ProjectLayoutValidationSchema = z.object({
  projectState: ProjectValidationStateSchema.default("unknown"),
  projectVerdict: ProjectValidationVerdictSchema.nullable().optional().default(null),
  cause: ProjectValidationCauseSchema.nullable().optional().default(null),
  summary: z.string().default(""),
  updatedAt: z.string().default(""),
  sceneHash: z.string().default(""),
  boards: z.array(ProjectBoardValidationSchema).default([]),
});

export type ProjectLayoutValidation = z.infer<typeof ProjectLayoutValidationSchema>;

export const ProjectStructureSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  purpose: z.string(),
  recommendedContent: z.array(z.string()),
  suggestedAssets: z.array(z.string()),
  /**
   * 免费层对 3+ 章节做细节锁定（参见 spec-system-v3/05 §6.1）：
   * 章节标题仍可见；但 purpose / recommendedContent / suggestedAssets 被服务端清空，
   * 客户端据此渲染升级锁定态。
   */
  locked: z.boolean().optional(),
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
  /**
   * 当前查看者在此结构中能完整使用的章节数。
   * - null / undefined：不做限制（付费层）
   * - 数值：免费层只有前 N 章可见细节 / 可一键落板
   * 参见 spec-system-v3/05 §6.1。
   */
  unlockedChapterLimit: z.number().int().nullable().optional(),
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
  boardId?: string;
  pageNumber: number;
  type: ProjectPageType;
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
  validation?: ProjectLayoutValidation;
  editorScene?: ProjectEditorScene;
  materialRecognition?: ProjectMaterialRecognition;
  structureSuggestion?: ProjectStructureSuggestion;
  /**
   * Setup 向导完成信号。只在用户手动点击"进入排版"时写入 completedAt。
   * 用于控制 setupMode 的初始值（决定退出重进是走向导还是画板）。
   */
  setup?: {
    completedAt?: string | null;
  };
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
  const parsedValidation = ProjectLayoutValidationSchema.safeParse(raw.validation);

  return {
    ...raw,
    editorScene: parsedScene.success ? normalizeProjectEditorScene(parsedScene.data) : undefined,
    materialRecognition: parsedMaterialRecognition.success
      ? parsedMaterialRecognition.data
      : undefined,
    structureSuggestion: parsedStructureSuggestion.success
      ? parsedStructureSuggestion.data
      : undefined,
    validation: parsedValidation.success ? parsedValidation.data : undefined,
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
    fontFamily: patch.fontFamily ?? "Inter",
    lineHeight: patch.lineHeight ?? (patch.role === "title" ? 1.08 : 1.45),
    align: patch.align ?? "left",
    color: patch.color ?? DEFAULT_TEXT_COLOR,
    zIndex: patch.zIndex ?? 1,
    placeholder: patch.placeholder ?? false,
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
    fit: patch?.fit ?? "fit",
    crop: patch?.crop ?? { x: 0.5, y: 0.5, scale: 1 },
    note: patch?.note ?? null,
    roleTag: patch?.roleTag ?? null,
    zIndex: patch?.zIndex ?? 2,
    placeholder: patch?.placeholder ?? false,
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
    gradient: patch?.gradient ?? null,
    stroke: patch?.stroke ?? null,
    strokeWidth: patch?.strokeWidth ?? 0,
    opacity: patch?.opacity ?? 1,
    rx: patch?.rx ?? 0,
    zIndex: patch?.zIndex ?? 3,
    placeholder: patch?.placeholder ?? false,
  };
}
export function createProjectBoard(
  patch?: Partial<ProjectBoard>
): ProjectBoard {
  return {
    id: patch?.id ?? createSceneId("board"),
    name: patch?.name ?? "Untitled board",
    intent: patch?.intent ?? "",
    frame: {
      width: PROJECT_BOARD_WIDTH,
      height: PROJECT_BOARD_HEIGHT,
      background: patch?.frame?.background ?? DEFAULT_BOARD_BACKGROUND,
    },
    thumbnailAssetId: patch?.thumbnailAssetId ?? null,
    nodes: patch?.nodes ?? [],
    structureSource: patch?.structureSource ?? null,
    contentSuggestions: patch?.contentSuggestions ?? [],
    locked: patch?.locked ?? false,
    pageType: patch?.pageType ?? null,
    phase: patch?.phase ?? null,
  };
}

export function createEmptyProjectEditorScene(projectName?: string): ProjectEditorScene {
  const board = createProjectBoard({
    name: "Start",
    intent: projectName
      ? `用这一页搭出 ${projectName} 的项目开场`
      : "用这一页搭出项目开场",
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
  return matchAssetIdsForStructureSection({ ...params, count: 1 })[0] ?? null;
}

function matchAssetIdsForStructureSection(params: {
  section: ProjectStructureSection;
  assets: ProjectSceneSeedAsset[];
  usedAssetIds: Set<string>;
  recognition?: ProjectMaterialRecognition;
  boardIndex: number;
  count: number;
}) {
  const { section, assets, usedAssetIds, recognition, boardIndex, count } = params;
  const availableAssets = assets.filter((asset) => !usedAssetIds.has(asset.id));
  if (availableAssets.length === 0 || count <= 0) return [] as string[];

  const keywords = section.suggestedAssets
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  const rankedIds: string[] = [];
  const pushId = (assetId: string | null | undefined) => {
    if (!assetId) return;
    if (usedAssetIds.has(assetId)) return;
    if (!assets.some((asset) => asset.id === assetId)) return;
    if (rankedIds.includes(assetId)) return;
    rankedIds.push(assetId);
  };

  availableAssets.forEach((asset) => {
    const haystack = [asset.title ?? "", asset.id].join(" ").toLowerCase();
    if (keywords.some((keyword) => haystack.includes(keyword) || keyword.includes(haystack))) {
      pushId(asset.id);
    }
  });

  [
    ...(recognition?.heroAssetIds ?? []),
    ...(recognition?.supportingAssetIds ?? []),
    ...(recognition?.decorativeAssetIds ?? []),
  ].forEach(pushId);

  if (boardIndex === 0) {
    pushId(availableAssets.find((asset) => asset.isCover)?.id ?? null);
  }

  availableAssets.forEach((asset) => pushId(asset.id));
  return rankedIds.slice(0, count);
}

function inferPackageModeFromSuggestion(suggestion: ProjectStructureSuggestion): ProjectPackageMode {
  void suggestion;
  return "DEEP";
}

function getSectionSearchText(params: {
  group: ProjectStructureGroup;
  section: ProjectStructureSection;
}) {
  const { group, section } = params;
  return [
    group.label,
    group.rationale,
    group.narrativeRole,
    section.title,
    section.purpose,
    ...section.recommendedContent,
    ...section.suggestedAssets,
  ]
    .join(" ")
    .toLowerCase();
}

function inferProjectPageType(params: {
  group: ProjectStructureGroup;
  section: ProjectStructureSection;
  boardIndex: number;
  totalBoards: number;
  packageMode?: ProjectPackageMode;
}): ProjectPageType {
  const { group, section, boardIndex, totalBoards } = params;
  const packageMode = params.packageMode ?? "DEEP";
  const text = getSectionSearchText({ group, section });
  const includes = (...keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

  if (packageMode === "SUPPORTIVE") {
    if (includes("角色", "职责", "说明")) return "简短说明 / 角色说明";
    if (includes("视觉", "界面", "展示", "mockup", "主视觉")) return "关键视觉或关键界面";
    if (boardIndex === totalBoards - 1 && totalBoards >= 3) return "简短说明 / 角色说明";
    return boardIndex === 0 ? "作品定位 / 题材说明" : "关键视觉或关键界面";
  }

  if (packageMode === "LIGHT") {
    if (includes("结果", "成果", "价值", "数据", "证明", "反馈")) return "结果 / 简短总结";
    if (includes("before", "after", "对比", "流程优化", "流程", "优化")) {
      return "before / after 或流程优化";
    }
    if (includes("方案", "界面", "模块", "关键", "产出")) return "核心方案 / 关键界面";
    if (includes("问题", "目标", "痛点")) return "问题与目标";
    if (boardIndex === totalBoards - 1) return "结果 / 简短总结";
    if (boardIndex === 0) return "项目定位 / 背景";
    if (boardIndex === 1) return "问题与目标";
    return "核心方案 / 关键界面";
  }

  if (includes("反思", "复盘", "总结")) return "总结 / 反思";
  if (includes("结果", "成果", "价值", "指标", "数据", "证明", "反馈")) return "结果 / 价值证明";
  if (includes("概览", "定位", "封面", "开场")) return "项目定位 / 背景页";
  if (includes("流程", "任务链", "链路", "闭环")) return "流程 / 任务链优化页";
  if (includes("模块", "界面", "before", "after", "方案", "优化")) return "关键模块优化";
  if (includes("结构", "架构", "信息架构", "全局")) return "全局结构优化";
  if (includes("目标", "策略", "原则", "取舍", "方向")) return "设计目标 / 设计策略";
  if (includes("用户", "洞察", "研究", "旅程")) return "用户 / 流程 / 关键洞察";
  if (includes("背景", "问题", "痛点", "业务")) return "业务背景 / 问题背景";

  if (boardIndex === 0) return "项目定位 / 背景页";
  if (boardIndex === totalBoards - 1) return "总结 / 反思";
  if (boardIndex >= totalBoards - 2) return "结果 / 价值证明";
  if (boardIndex === 1) return "业务背景 / 问题背景";
  if (boardIndex === 2) return "用户 / 流程 / 关键洞察";
  if (boardIndex === 3) return "设计目标 / 设计策略";
  if (boardIndex === 4) return "全局结构优化";
  return "关键模块优化";
}

function createPrototypeShape(
  patch: Partial<ProjectBoardShapeNode> &
    Pick<ProjectBoardShapeNode, "x" | "y" | "width" | "height">
) {
  return createProjectShapeNode("rect", {
    ...patch,
    fill: patch.fill ?? "#f8f4ec",
    stroke: patch.stroke ?? "#cbc1b3",
    strokeWidth: patch.strokeWidth ?? 2,
    opacity: patch.opacity ?? 1,
    rx: patch.rx ?? 28,
    placeholder: true,
  });
}

function createPrototypeText(
  patch: Partial<ProjectBoardTextNode> & Pick<ProjectBoardTextNode, "text" | "role">
) {
  return createProjectTextNode({
    ...patch,
    color:
      patch.color ??
      (patch.role === "title" ? "#42382f" : patch.role === "caption" ? "#8e8377" : "#70655b"),
    placeholder: true,
  });
}

function buildPrototypeNodesForPageType(params: {
  pageType: ProjectPageType;
  groupLabel: string;
  sectionTitle: string;
  purpose: string;
  recommendedContent: string[];
  matchedAssetTitle: string | null;
}): ProjectBoardNode[] {
  const { pageType, groupLabel, sectionTitle, purpose, recommendedContent, matchedAssetTitle } =
    params;
  const helperText = recommendedContent.slice(0, 3).join("\n");
  const assetLabel = matchedAssetTitle ? `图位待生成\n建议素材：${matchedAssetTitle}` : "图位待生成";
  const nodes: ProjectBoardNode[] = [
    createPrototypeText({
      role: "caption",
      text: `${groupLabel} · ${pageType}`,
      x: 120,
      y: 88,
      width: 760,
      height: 30,
      fontSize: 18,
      fontWeight: 600,
      lineHeight: 1.2,
      zIndex: 1,
    }),
    createPrototypeText({
      role: "title",
      text: sectionTitle,
      x: 120,
      y: 136,
      width: 760,
      height: 128,
      fontSize: 76,
      fontWeight: 700,
      lineHeight: 1.06,
      zIndex: 2,
    }),
  ];

  if (pageType === "项目定位 / 背景页" || pageType === "项目定位 / 背景") {
    nodes.push(
      createPrototypeText({
        role: "body",
        text: purpose || "这一页先建立项目边界、角色和目标。",
        x: 120,
        y: 286,
        width: 620,
        height: 132,
        fontSize: 28,
        lineHeight: 1.45,
        zIndex: 3,
      }),
      createPrototypeShape({ x: 1040, y: 132, width: 700, height: 688, zIndex: 4 }),
      createPrototypeText({
        role: "note",
        text: assetLabel,
        x: 1108,
        y: 422,
        width: 564,
        height: 96,
        fontSize: 24,
        lineHeight: 1.35,
        align: "center",
        zIndex: 5,
      }),
      createPrototypeShape({ x: 120, y: 760, width: 196, height: 156, zIndex: 4 }),
      createPrototypeShape({ x: 338, y: 760, width: 196, height: 156, zIndex: 4 }),
      createPrototypeShape({ x: 556, y: 760, width: 196, height: 156, zIndex: 4 }),
      createPrototypeText({
        role: "metric",
        text: "角色\n待生成",
        x: 148,
        y: 800,
        width: 140,
        height: 82,
        fontSize: 30,
        lineHeight: 1.2,
        align: "center",
        zIndex: 5,
      }),
      createPrototypeText({
        role: "metric",
        text: "目标\n待生成",
        x: 366,
        y: 800,
        width: 140,
        height: 82,
        fontSize: 30,
        lineHeight: 1.2,
        align: "center",
        zIndex: 5,
      }),
      createPrototypeText({
        role: "metric",
        text: "成果\n待生成",
        x: 584,
        y: 800,
        width: 140,
        height: 82,
        fontSize: 30,
        lineHeight: 1.2,
        align: "center",
        zIndex: 5,
      })
    );
    return nodes;
  }

  if (pageType === "业务背景 / 问题背景" || pageType === "问题与目标") {
    nodes.push(
      createPrototypeShape({ x: 120, y: 300, width: 520, height: 560, zIndex: 3 }),
      createPrototypeShape({ x: 680, y: 300, width: 500, height: 560, zIndex: 3 }),
      createPrototypeShape({ x: 1220, y: 300, width: 580, height: 560, zIndex: 3 }),
      createPrototypeText({
        role: "body",
        text: "背景区待生成",
        x: 168,
        y: 336,
        width: 420,
        height: 54,
        fontSize: 28,
        zIndex: 4,
      }),
      createPrototypeText({
        role: "body",
        text: "问题区待生成",
        x: 728,
        y: 336,
        width: 400,
        height: 54,
        fontSize: 28,
        zIndex: 4,
      }),
      createPrototypeText({
        role: "note",
        text: assetLabel,
        x: 1292,
        y: 536,
        width: 436,
        height: 96,
        fontSize: 24,
        lineHeight: 1.35,
        align: "center",
        zIndex: 4,
      })
    );
    return nodes;
  }

  if (pageType === "用户 / 流程 / 关键洞察" || pageType === "全局结构优化") {
    nodes.push(
      createPrototypeShape({ x: 120, y: 300, width: 640, height: 600, zIndex: 3 }),
      createPrototypeShape({ x: 812, y: 300, width: 988, height: 260, zIndex: 3 }),
      createPrototypeShape({ x: 812, y: 604, width: 304, height: 296, zIndex: 3 }),
      createPrototypeShape({ x: 1148, y: 604, width: 304, height: 296, zIndex: 3 }),
      createPrototypeShape({ x: 1484, y: 604, width: 316, height: 296, zIndex: 3 }),
      createPrototypeText({
        role: "body",
        text: pageType === "全局结构优化" ? "结构图位待生成" : "洞察 / 流程主区待生成",
        x: 184,
        y: 560,
        width: 512,
        height: 58,
        fontSize: 30,
        align: "center",
        zIndex: 4,
      }),
      createPrototypeText({
        role: "note",
        text: helperText || "关键信息卡待生成",
        x: 856,
        y: 344,
        width: 900,
        height: 150,
        fontSize: 24,
        lineHeight: 1.45,
        zIndex: 4,
      })
    );
    return nodes;
  }

  if (
    pageType === "设计目标 / 设计策略" ||
    pageType === "流程 / 任务链优化页" ||
    pageType === "before / after 或流程优化"
  ) {
    nodes.push(
      createPrototypeShape({ x: 120, y: 300, width: 520, height: 220, zIndex: 3 }),
      createPrototypeShape({ x: 120, y: 560, width: 520, height: 220, zIndex: 3 }),
      createPrototypeShape({ x: 680, y: 300, width: 520, height: 220, zIndex: 3 }),
      createPrototypeShape({ x: 680, y: 560, width: 520, height: 220, zIndex: 3 }),
      createPrototypeShape({ x: 1240, y: 300, width: 560, height: 480, zIndex: 3 }),
      createPrototypeText({
        role: "body",
        text: helperText || "策略卡 / 流程说明待生成",
        x: 164,
        y: 338,
        width: 988,
        height: 146,
        fontSize: 24,
        lineHeight: 1.45,
        zIndex: 4,
      }),
      createPrototypeText({
        role: "note",
        text: assetLabel,
        x: 1316,
        y: 494,
        width: 410,
        height: 92,
        fontSize: 24,
        lineHeight: 1.35,
        align: "center",
        zIndex: 4,
      })
    );
    return nodes;
  }

  if (
    pageType === "关键模块优化" ||
    pageType === "核心方案 / 关键界面" ||
    pageType === "关键视觉或关键界面"
  ) {
    nodes.push(
      createPrototypeShape({ x: 120, y: 300, width: 780, height: 520, zIndex: 3 }),
      createPrototypeShape({ x: 1020, y: 300, width: 780, height: 520, zIndex: 3 }),
      createPrototypeText({
        role: "note",
        text: pageType === "关键模块优化" ? "模块 A / Before" : assetLabel,
        x: 212,
        y: 534,
        width: 596,
        height: 84,
        fontSize: 28,
        lineHeight: 1.35,
        align: "center",
        zIndex: 4,
      }),
      createPrototypeText({
        role: "note",
        text: pageType === "关键模块优化" ? "模块 B / After" : "补充图位待生成",
        x: 1112,
        y: 534,
        width: 596,
        height: 84,
        fontSize: 28,
        lineHeight: 1.35,
        align: "center",
        zIndex: 4,
      }),
      createPrototypeShape({ x: 120, y: 860, width: 1680, height: 120, zIndex: 3 }),
      createPrototypeText({
        role: "body",
        text: helperText || "说明位待生成",
        x: 164,
        y: 892,
        width: 1592,
        height: 52,
        fontSize: 24,
        zIndex: 4,
      })
    );
    return nodes;
  }

  if (pageType === "结果 / 价值证明" || pageType === "结果 / 简短总结") {
    nodes.push(
      createPrototypeShape({ x: 120, y: 300, width: 260, height: 180, zIndex: 3 }),
      createPrototypeShape({ x: 416, y: 300, width: 260, height: 180, zIndex: 3 }),
      createPrototypeShape({ x: 712, y: 300, width: 260, height: 180, zIndex: 3 }),
      createPrototypeShape({ x: 1008, y: 300, width: 792, height: 580, zIndex: 3 }),
      createPrototypeText({
        role: "metric",
        text: "指标 A",
        x: 184,
        y: 358,
        width: 132,
        height: 48,
        fontSize: 38,
        zIndex: 4,
      }),
      createPrototypeText({
        role: "metric",
        text: "指标 B",
        x: 480,
        y: 358,
        width: 132,
        height: 48,
        fontSize: 38,
        zIndex: 4,
      }),
      createPrototypeText({
        role: "metric",
        text: "指标 C",
        x: 776,
        y: 358,
        width: 132,
        height: 48,
        fontSize: 38,
        zIndex: 4,
      }),
      createPrototypeText({
        role: "note",
        text: assetLabel,
        x: 1120,
        y: 556,
        width: 568,
        height: 96,
        fontSize: 24,
        lineHeight: 1.35,
        align: "center",
        zIndex: 4,
      }),
      createPrototypeText({
        role: "body",
        text: helperText || "结果说明待生成",
        x: 120,
        y: 548,
        width: 820,
        height: 220,
        fontSize: 24,
        lineHeight: 1.45,
        zIndex: 4,
      })
    );
    return nodes;
  }

  nodes.push(
    createPrototypeShape({ x: 120, y: 300, width: 980, height: 620, zIndex: 3 }),
    createPrototypeShape({ x: 1140, y: 300, width: 660, height: 300, zIndex: 3 }),
    createPrototypeShape({ x: 1140, y: 620, width: 660, height: 300, zIndex: 3 }),
    createPrototypeText({
      role: "body",
      text: purpose || "这一页用于收束项目主线。",
      x: 176,
      y: 360,
      width: 868,
      height: 186,
      fontSize: 26,
      lineHeight: 1.45,
      zIndex: 4,
    }),
    createPrototypeText({
      role: "note",
      text: helperText || "反思 / 下一步待生成",
      x: 1188,
      y: 372,
      width: 564,
      height: 136,
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 4,
    })
  );
  return nodes;
}

function getPrototypeBoardBackground(pageType: ProjectPageType) {
  if (pageType === "关键视觉或关键界面") return "#fbf6f0";
  if (pageType === "结果 / 价值证明" || pageType === "结果 / 简短总结") return "#f7f7f2";
  return "#fcfaf6";
}

export function buildProjectSceneFromStructureSuggestion(params: {
  suggestion: ProjectStructureSuggestion;
  assets: ProjectSceneSeedAsset[];
  projectName?: string;
  recognition?: ProjectMaterialRecognition;
  packageMode?: ProjectPackageMode;
}): ProjectEditorScene {
  const { suggestion, assets, projectName, recognition } = params;
  const packageMode = params.packageMode ?? inferPackageModeFromSuggestion(suggestion);
  const usedAssetIds = new Set<string>();
  const boards: ProjectBoard[] = [];

  // 免费层：仅落地前 N 章；锁定章节跳过（参见 spec-system-v3/05 §6.1）。
  const unlockedLimit =
    typeof suggestion.unlockedChapterLimit === "number"
      ? suggestion.unlockedChapterLimit
      : null;
  let flatSectionCursor = 0;

  suggestion.groups.forEach((group, groupIndex) => {
    group.sections.forEach((section, sectionIndex) => {
      const currentSectionIndex = flatSectionCursor;
      flatSectionCursor += 1;
      if (section.locked) return;
      if (unlockedLimit !== null && currentSectionIndex >= unlockedLimit) return;
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
      const pageType = inferProjectPageType({
        group,
        section,
        boardIndex: boards.length,
        totalBoards: suggestion.groups.reduce((sum, item) => sum + item.sections.length, 0),
        packageMode,
      });
      const nodes = buildPrototypeNodesForPageType({
        pageType,
        groupLabel: group.label,
        sectionTitle: section.title,
        purpose: section.purpose,
        recommendedContent: section.recommendedContent,
        matchedAssetTitle:
          assets.find((asset) => asset.id === matchedAssetId)?.title ?? matchedAssetId ?? null,
      });

      // 收集 AI 内容建议：purpose 说明 + recommendedContent 要点
      const contentSuggestions: string[] = [];
      if (section.purpose) contentSuggestions.push(section.purpose);
      contentSuggestions.push(...section.recommendedContent);

      boards.push(
        createProjectBoard({
          name:
            suggestion.groups.length > 1
              ? `${group.label} · ${section.title}`
              : section.title || `${projectName ?? "项目"} · ${sectionIndex + 1}`,
          intent: `${group.label}：${section.purpose}`,
          thumbnailAssetId: matchedAssetId,
          nodes,
          structureSource: {
            groupId: group.id,
            groupLabel: group.label,
            groupIndex,
            sectionId: section.id,
            sectionTitle: section.title,
            sectionIndex,
          },
          contentSuggestions,
          pageType,
          phase: "prototype",
          frame: {
            width: PROJECT_BOARD_WIDTH,
            height: PROJECT_BOARD_HEIGHT,
            background: getPrototypeBoardBackground(pageType),
          },
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

function findSuggestionSectionForBoard(params: {
  board: ProjectBoard;
  suggestion?: ProjectStructureSuggestion | null;
}) {
  const { board, suggestion } = params;
  if (!suggestion || !board.structureSource?.sectionId) return null;
  for (const group of suggestion.groups) {
    const section = group.sections.find((item) => item.id === board.structureSource?.sectionId);
    if (section) {
      return { group, section };
    }
  }
  return null;
}

function createGeneratedShape(
  shape: ProjectShapeType,
  patch?: Partial<ProjectBoardShapeNode>
) {
  return createProjectShapeNode(shape, {
    ...patch,
    placeholder: false,
  });
}

function createGeneratedText(
  patch: Partial<ProjectBoardTextNode> & Pick<ProjectBoardTextNode, "text" | "role">
) {
  return createProjectTextNode({
    ...patch,
    placeholder: false,
  });
}

function createGeneratedImage(
  assetId: string,
  patch?: Partial<ProjectBoardImageNode>
) {
  return createProjectImageNode(assetId, {
    ...patch,
    placeholder: false,
  });
}

function buildGeneratedBody(page: GeneratedLayoutPageSeed) {
  const lines = [page.contentGuidance.trim(), ...page.keyPoints.slice(0, 3).map((item) => `• ${item}`)];
  return lines.filter(Boolean).join("\n");
}

function buildGeneratedTitleText(page: GeneratedLayoutPageSeed, board: ProjectBoard) {
  return page.titleSuggestion.trim() || board.name.trim() || board.structureSource?.sectionTitle || "项目页面";
}

function buildGeneratedNodesForBoard(params: {
  board: ProjectBoard;
  page: GeneratedLayoutPageSeed;
  pageType: ProjectPageType;
  styleProfile: StyleProfile;
  preservedNodes: ProjectBoardNode[];
  heroAssetId: string | null;
  supportAssetId: string | null;
  assetMap: Map<string, ProjectSceneSeedAsset>;
}) {
  const {
    board,
    page,
    pageType,
    styleProfile,
    preservedNodes,
    heroAssetId,
    supportAssetId,
    assetMap,
  } = params;
  const nodes: ProjectBoardNode[] = [];
  const titleText = buildGeneratedTitleText(page, board);
  const bodyText = buildGeneratedBody(page);
  const hasPreservedTitle = preservedNodes.some(
    (node) => node.type === "text" && node.role === "title"
  );
  const hasPreservedBody = preservedNodes.some(
    (node) => node.type === "text" && node.role === "body"
  );
  const hasPreservedImage = preservedNodes.some((node) => node.type === "image");
  const heroMeta = heroAssetId ? resolveProjectAssetMeta(assetMap.get(heroAssetId)?.metaJson) : null;
  const supportMeta = supportAssetId
    ? resolveProjectAssetMeta(assetMap.get(supportAssetId)?.metaJson)
    : null;
  const accentSoft = `${styleProfile.accentColor}14`;
  const borderSoft = styleProfile.border;
  const surface = styleProfile.surface;
  const titleTone = styleProfile.titleTone;
  const bodyTone = styleProfile.bodyTone;

  nodes.push(
    createGeneratedShape("rect", {
      x: 0,
      y: 0,
      width: PROJECT_BOARD_WIDTH,
      height: PROJECT_BOARD_HEIGHT,
      fill: styleProfile.background,
      stroke: null,
      strokeWidth: 0,
      rx: 0,
      zIndex: 1,
    }),
    createGeneratedShape("rect", {
      x: 56,
      y: 56,
      width: 1808,
      height: 968,
      fill: surface,
      stroke: borderSoft,
      strokeWidth: 1,
      rx: 36,
      zIndex: 2,
    })
  );

  if (!hasPreservedTitle) {
    nodes.push(
      createGeneratedText({
        role: "caption",
        text: pageType,
        x: 120,
        y: 98,
        width: 700,
        height: 30,
        fontSize: 18,
        fontWeight: 600,
        lineHeight: 1.2,
        color: bodyTone,
        zIndex: 3,
      }),
      createGeneratedText({
        role: "title",
        text: titleText,
        x: 120,
        y: 144,
        width: 820,
        height: 126,
        fontSize: 74,
        fontWeight: 700,
        lineHeight: 1.04,
        color: titleTone,
        zIndex: 4,
      })
    );
  }

  if (
    pageType === "项目定位 / 背景页" ||
    pageType === "项目定位 / 背景" ||
    pageType === "作品定位 / 题材说明"
  ) {
    nodes.push(
      createGeneratedShape("rect", {
        x: 120,
        y: 300,
        width: 360,
        height: 220,
        fill: accentSoft,
        stroke: null,
        strokeWidth: 0,
        rx: 28,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 510,
        y: 300,
        width: 420,
        height: 220,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 28,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 120,
        y: 550,
        width: 810,
        height: 310,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 32,
        zIndex: 3,
      })
    );
    if (!hasPreservedBody) {
      nodes.push(
        createGeneratedText({
          role: "body",
          text: bodyText,
          x: 156,
          y: 590,
          width: 738,
          height: 226,
          fontSize: 28,
          lineHeight: 1.45,
          color: bodyTone,
          zIndex: 4,
        })
      );
    }
    if (!hasPreservedImage && heroAssetId) {
      nodes.push(
        createGeneratedImage(heroAssetId, {
          x: 1010,
          y: 144,
          width: 720,
          height: 720,
          note: heroMeta?.note ?? null,
          roleTag: heroMeta?.roleTag ?? "main",
          zIndex: 4,
        })
      );
    }
    return nodes;
  }

  if (
    pageType === "业务背景 / 问题背景" ||
    pageType === "问题与目标" ||
    pageType === "用户 / 流程 / 关键洞察"
  ) {
    nodes.push(
      createGeneratedShape("rect", {
        x: 120,
        y: 300,
        width: 470,
        height: 600,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 30,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 630,
        y: 300,
        width: 470,
        height: 600,
        fill: accentSoft,
        stroke: null,
        strokeWidth: 0,
        rx: 30,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 1140,
        y: 300,
        width: 660,
        height: 600,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 30,
        zIndex: 3,
      })
    );
    if (!hasPreservedBody) {
      nodes.push(
        createGeneratedText({
          role: "body",
          text: bodyText,
          x: 158,
          y: 346,
          width: 404,
          height: 520,
          fontSize: 26,
          lineHeight: 1.46,
          color: bodyTone,
          zIndex: 4,
        }),
        createGeneratedText({
          role: "note",
          text: page.keyPoints.slice(0, 3).join("\n"),
          x: 668,
          y: 346,
          width: 394,
          height: 520,
          fontSize: 28,
          lineHeight: 1.48,
          color: titleTone,
          zIndex: 4,
        })
      );
    }
    if (!hasPreservedImage && heroAssetId) {
      nodes.push(
        createGeneratedImage(heroAssetId, {
          x: 1182,
          y: 342,
          width: 576,
          height: 516,
          note: heroMeta?.note ?? null,
          roleTag: heroMeta?.roleTag ?? "support",
          zIndex: 4,
        })
      );
    }
    return nodes;
  }

  if (pageType === "设计目标 / 设计策略" || pageType === "流程 / 任务链优化页") {
    nodes.push(
      createGeneratedShape("rect", {
        x: 120,
        y: 300,
        width: 720,
        height: 600,
        fill: accentSoft,
        stroke: null,
        strokeWidth: 0,
        rx: 34,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 890,
        y: 300,
        width: 910,
        height: 240,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 28,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 890,
        y: 580,
        width: 910,
        height: 320,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 28,
        zIndex: 3,
      })
    );
    if (!hasPreservedBody) {
      nodes.push(
        createGeneratedText({
          role: "body",
          text: bodyText,
          x: 168,
          y: 356,
          width: 624,
          height: 500,
          fontSize: 27,
          lineHeight: 1.48,
          color: titleTone,
          zIndex: 4,
        }),
        createGeneratedText({
          role: "note",
          text: page.keyPoints.slice(0, 3).join("\n"),
          x: 938,
          y: 640,
          width: 814,
          height: 214,
          fontSize: 24,
          lineHeight: 1.46,
          color: bodyTone,
          zIndex: 4,
        })
      );
    }
    if (!hasPreservedImage && heroAssetId) {
      nodes.push(
        createGeneratedImage(heroAssetId, {
          x: 938,
          y: 338,
          width: 814,
          height: 164,
          note: heroMeta?.note ?? null,
          roleTag: heroMeta?.roleTag ?? "support",
          zIndex: 4,
        })
      );
    }
    return nodes;
  }

  if (
    pageType === "关键模块优化" ||
    pageType === "核心方案 / 关键界面" ||
    pageType === "关键视觉或关键界面" ||
    pageType === "before / after 或流程优化"
  ) {
    nodes.push(
      createGeneratedShape("rect", {
        x: 120,
        y: 300,
        width: 770,
        height: 520,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 30,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 910,
        y: 300,
        width: 890,
        height: 520,
        fill: accentSoft,
        stroke: null,
        strokeWidth: 0,
        rx: 30,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 120,
        y: 850,
        width: 1680,
        height: 120,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 24,
        zIndex: 3,
      })
    );
    if (!hasPreservedImage && heroAssetId) {
      nodes.push(
        createGeneratedImage(heroAssetId, {
          x: 156,
          y: 336,
          width: pageType === "before / after 或流程优化" ? 318 : 698,
          height: 448,
          note: heroMeta?.note ?? null,
          roleTag: heroMeta?.roleTag ?? "main",
          zIndex: 4,
        })
      );
      if ((pageType === "关键模块优化" || pageType === "before / after 或流程优化") && supportAssetId) {
        nodes.push(
          createGeneratedImage(supportAssetId, {
            x: 480,
            y: 336,
            width: 318,
            height: 448,
            note: supportMeta?.note ?? null,
            roleTag: supportMeta?.roleTag ?? "support",
            zIndex: 4,
          })
        );
      }
      if (pageType !== "关键模块优化" && pageType !== "before / after 或流程优化") {
        nodes.push(
          createGeneratedImage(heroAssetId, {
            x: 954,
            y: 336,
            width: 802,
            height: 448,
            note: heroMeta?.note ?? null,
            roleTag: heroMeta?.roleTag ?? "main",
            zIndex: 4,
          })
        );
      }
    }
    if (!hasPreservedBody) {
      nodes.push(
        createGeneratedText({
          role: "body",
          text: bodyText,
          x: pageType === "before / after 或流程优化" ? 954 : 954,
          y: 352,
          width: 776,
          height: 420,
          fontSize: 26,
          lineHeight: 1.46,
          color: titleTone,
          zIndex: 5,
        }),
        createGeneratedText({
          role: "note",
          text: page.keyPoints.slice(0, 3).join("  ·  "),
          x: 164,
          y: 892,
          width: 1592,
          height: 46,
          fontSize: 22,
          lineHeight: 1.3,
          color: bodyTone,
          zIndex: 4,
        })
      );
    }
    return nodes;
  }

  if (pageType === "结果 / 价值证明" || pageType === "结果 / 简短总结") {
    nodes.push(
      createGeneratedShape("rect", {
        x: 120,
        y: 300,
        width: 250,
        height: 180,
        fill: accentSoft,
        stroke: null,
        strokeWidth: 0,
        rx: 28,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 406,
        y: 300,
        width: 250,
        height: 180,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 28,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 692,
        y: 300,
        width: 250,
        height: 180,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 28,
        zIndex: 3,
      }),
      createGeneratedShape("rect", {
        x: 1000,
        y: 300,
        width: 800,
        height: 600,
        fill: "#ffffff",
        stroke: borderSoft,
        strokeWidth: 1,
        rx: 30,
        zIndex: 3,
      })
    );
    if (!hasPreservedBody) {
      nodes.push(
        createGeneratedText({
          role: "metric",
          text: page.keyPoints[0] ?? "核心指标",
          x: 152,
          y: 356,
          width: 186,
          height: 60,
          fontSize: 34,
          lineHeight: 1.2,
          color: titleTone,
          zIndex: 4,
        }),
        createGeneratedText({
          role: "metric",
          text: page.keyPoints[1] ?? "业务反馈",
          x: 438,
          y: 356,
          width: 186,
          height: 60,
          fontSize: 34,
          lineHeight: 1.2,
          color: titleTone,
          zIndex: 4,
        }),
        createGeneratedText({
          role: "metric",
          text: page.keyPoints[2] ?? "效率提升",
          x: 724,
          y: 356,
          width: 186,
          height: 60,
          fontSize: 34,
          lineHeight: 1.2,
          color: titleTone,
          zIndex: 4,
        }),
        createGeneratedText({
          role: "body",
          text: bodyText,
          x: 120,
          y: 560,
          width: 822,
          height: 300,
          fontSize: 26,
          lineHeight: 1.45,
          color: bodyTone,
          zIndex: 4,
        })
      );
    }
    if (!hasPreservedImage && heroAssetId) {
      nodes.push(
        createGeneratedImage(heroAssetId, {
          x: 1042,
          y: 342,
          width: 716,
          height: 516,
          note: heroMeta?.note ?? null,
          roleTag: heroMeta?.roleTag ?? "main",
          zIndex: 4,
        })
      );
    }
    return nodes;
  }

  nodes.push(
    createGeneratedShape("rect", {
      x: 120,
      y: 300,
      width: 960,
      height: 600,
      fill: accentSoft,
      stroke: null,
      strokeWidth: 0,
      rx: 34,
      zIndex: 3,
    }),
    createGeneratedShape("rect", {
      x: 1120,
      y: 300,
      width: 680,
      height: 600,
      fill: "#ffffff",
      stroke: borderSoft,
      strokeWidth: 1,
      rx: 34,
      zIndex: 3,
    })
  );
  if (!hasPreservedBody) {
    nodes.push(
      createGeneratedText({
        role: "body",
        text: bodyText,
        x: 172,
        y: 360,
        width: 856,
        height: 500,
        fontSize: 28,
        lineHeight: 1.5,
        color: titleTone,
        zIndex: 4,
      }),
      createGeneratedText({
        role: "note",
        text: page.keyPoints.slice(0, 3).join("\n"),
        x: 1164,
        y: 360,
        width: 592,
        height: 500,
        fontSize: 24,
        lineHeight: 1.5,
        color: bodyTone,
        zIndex: 4,
      })
    );
  }
  return nodes;
}

export function boardHasPlaceholderNodes(board: ProjectBoard) {
  return board.nodes.some((node) => node.placeholder);
}

export function isPrototypeBoard(board: ProjectBoard) {
  return board.phase === "prototype" || boardHasPlaceholderNodes(board);
}

export function applyGeneratedLayoutToScene(params: {
  scene: ProjectEditorScene;
  boardIds: string[];
  layoutPages: GeneratedLayoutPageSeed[];
  assets: ProjectSceneSeedAsset[];
  styleProfile: StyleProfile;
  suggestion?: ProjectStructureSuggestion | null;
  recognition?: ProjectMaterialRecognition | null;
}) {
  const { scene, boardIds, layoutPages, assets, styleProfile, suggestion, recognition } = params;
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const pageByBoardId = new Map(
    layoutPages
      .filter((page) => page.boardId)
      .map((page) => [page.boardId as string, page])
  );
  const orderedPages = [...layoutPages];
  const usedAssetIds = new Set<string>();
  let pageCursor = 0;

  const nextScene = {
    ...scene,
    boards: scene.boards.map((board) => {
      if (!boardIds.includes(board.id)) return board;
      if (!isPrototypeBoard(board)) return board;

      const page = pageByBoardId.get(board.id) ?? orderedPages[pageCursor] ?? null;
      pageCursor += 1;
      const structureRef = findSuggestionSectionForBoard({ board, suggestion });
      const heroAssetId = !board.nodes.some((node) => node.type === "image")
        ? matchAssetIdForStructureSection({
            section:
              structureRef?.section ?? {
                id: board.id,
                title: board.name,
                purpose: board.intent,
                recommendedContent: [],
                suggestedAssets: [],
              },
            assets,
            usedAssetIds,
            recognition: recognition ?? undefined,
            boardIndex: scene.boardOrder.indexOf(board.id),
          })
        : null;
      if (heroAssetId) {
        usedAssetIds.add(heroAssetId);
      }
      const supportAssetId =
        structureRef && heroAssetId
          ? matchAssetIdsForStructureSection({
              section: structureRef.section,
              assets,
              usedAssetIds,
              recognition: recognition ?? undefined,
              boardIndex: scene.boardOrder.indexOf(board.id),
              count: 1,
            })[0] ?? null
          : null;
      if (supportAssetId) {
        usedAssetIds.add(supportAssetId);
      }

      const preservedNodes = board.nodes.filter((node) => !node.placeholder);
      const pageType = (page?.type ?? board.pageType ?? "关键模块优化") as ProjectPageType;
      const generatedPage: GeneratedLayoutPageSeed = page ?? {
        boardId: board.id,
        pageNumber: scene.boardOrder.indexOf(board.id) + 1,
        type: pageType,
        titleSuggestion: board.name,
        contentGuidance: board.intent || "继续补齐这一页的重点内容。",
        keyPoints: board.contentSuggestions.slice(0, 3),
      };
      const generatedNodes = buildGeneratedNodesForBoard({
        board,
        page: generatedPage,
        pageType,
        styleProfile,
        preservedNodes,
        heroAssetId,
        supportAssetId,
        assetMap,
      });

      return createProjectBoard({
        ...board,
        frame: {
          width: PROJECT_BOARD_WIDTH,
          height: PROJECT_BOARD_HEIGHT,
          background: styleProfile.surface,
        },
        nodes: [...preservedNodes, ...generatedNodes],
        pageType,
        phase: "generated",
      });
    }),
  };

  return normalizeProjectEditorScene(clampSceneNodesToFrame(nextScene));
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
      thumbnailAssetId: matchedAsset?.id ?? null,
      nodes,
      pageType: page.type,
      phase: "generated",
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

function clampNum(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * AI 落版生成时，把节点坐标/尺寸夹回板内，避免首屏就越界。
 * 仅用于生成路径；用户手动编辑允许越界。
 */
export function clampSceneNodesToFrame(scene: ProjectEditorScene): ProjectEditorScene {
  return {
    ...scene,
    boards: scene.boards.map((board) => ({
      ...board,
      nodes: board.nodes.map((node) => {
        const width = clampNum(node.width, 1, PROJECT_BOARD_WIDTH);
        const height = clampNum(node.height, 1, PROJECT_BOARD_HEIGHT);
        const x = clampNum(node.x, 0, Math.max(0, PROJECT_BOARD_WIDTH - width));
        const y = clampNum(node.y, 0, Math.max(0, PROJECT_BOARD_HEIGHT - height));
        return { ...node, x, y, width, height };
      }),
    })),
  };
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
    return normalizeProjectEditorScene(clampSceneNodesToFrame(layoutDocument.editorScene));
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

export function getSceneBoardGroupRuns(scene: ProjectEditorScene): ProjectBoardGroupRun[] {
  const orderedBoards = scene.boardOrder
    .map((boardId) => getSceneBoardById(scene, boardId))
    .filter((board): board is ProjectBoard => Boolean(board));

  const runs: ProjectBoardGroupRun[] = [];
  let manualRunIndex = 0;

  orderedBoards.forEach((board) => {
    const structureGroupId = board.structureSource?.groupId ?? null;
    const label = board.structureSource?.groupLabel?.trim() || null;
    const lastRun = runs[runs.length - 1];

    if (structureGroupId && lastRun?.structureGroupId === structureGroupId) {
      lastRun.boards.push(board);
      return;
    }

    if (!structureGroupId && lastRun && lastRun.structureGroupId === null) {
      lastRun.boards.push(board);
      return;
    }

    if (!structureGroupId) {
      manualRunIndex += 1;
    }

    runs.push({
      key: structureGroupId ? `group:${structureGroupId}` : `manual:${manualRunIndex}`,
      label,
      structureGroupId,
      boards: [board],
    });
  });

  return runs;
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

/** 用户意图 scope 中被锁定、因此将从本次 AI 写操作中跳过的画板 id。 */
export function getLockedBoardIdsInScope(scene: ProjectEditorScene) {
  const scopeIds = getGenerationScopeBoardIds(scene);
  return scopeIds.filter((boardId) => {
    const board = getSceneBoardById(scene, boardId);
    return Boolean(board?.locked);
  });
}

/** 实际参与 AI 写操作的画板 id（意图 scope 去除锁定画板）。 */
export function getEffectiveGenerationBoardIds(scene: ProjectEditorScene) {
  const scopeIds = getGenerationScopeBoardIds(scene);
  return scopeIds.filter((boardId) => {
    const board = getSceneBoardById(scene, boardId);
    return Boolean(board) && !board?.locked;
  });
}

/** 实际参与本次"生成排版"的原型画板 id；已是 hi-fi 的画板明确跳过。 */
export function getPrototypeBoardIdsInScope(scene: ProjectEditorScene) {
  return getEffectiveGenerationBoardIds(scene).filter((boardId) => {
    const board = getSceneBoardById(scene, boardId);
    if (!board) return false;
    return isPrototypeBoard(board);
  });
}

export function serializeSceneForHash(scene: ProjectEditorScene) {
  // hash 只关心实际参与本次生成的原型画板；锁定和已是 hi-fi 的画板都必须排除。
  const boardIds = getPrototypeBoardIdsInScope(scene);
  return boardIds.map((boardId) => {
    const board = getSceneBoardById(scene, boardId);
    if (!board) return null;
    return {
      id: board.id,
      name: board.name,
      intent: board.intent,
      structureSource: board.structureSource
        ? {
            groupId: board.structureSource.groupId,
            groupLabel: board.structureSource.groupLabel,
            sectionId: board.structureSource.sectionId,
            sectionTitle: board.structureSource.sectionTitle,
          }
        : null,
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

  const rawBoardIds =
    scope?.mode === "all"
      ? scene.boardOrder
      : scope?.mode === "selected"
        ? scope.boardIds.filter((boardId) => scene.boardOrder.includes(boardId))
        : scope?.mode === "current"
          ? scope.boardIds.slice(0, 1)
          : getGenerationScopeBoardIds(scene);

  // 锁定画板从 AI 写操作的 scene 摘要中排除。
  const boardIds = rawBoardIds.filter((boardId) => {
    const board = getSceneBoardById(scene, boardId);
    return Boolean(board) && !board?.locked;
  });

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
        board.structureSource?.groupLabel
          ? `结构分组：${board.structureSource.groupLabel}`
          : null,
        board.structureSource?.sectionTitle
          ? `结构章节：${board.structureSource.sectionTitle}`
          : null,
        `页面意图：${board.intent || "未填写"}`,
        `文本内容：${textSummary || "无"}`,
        `引用素材：${imageSummary || "无"}`,
        `图形元素：${shapeSummary || "无"}`,
      ]
        .filter((line): line is string => Boolean(line))
        .join("\n");
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
  status?: string
) {
  return normalizeProjectEditorScene({
    ...scene,
    boards: scene.boards.map((board) =>
      boardIds.includes(board.id)
        ? { ...board }
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
            phase: "generated",
            nodes: board.nodes.map((node) => ({ ...node, placeholder: false })),
          }
        : board
    ),
  });
}
