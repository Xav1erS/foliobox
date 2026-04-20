"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import type { ActiveSelection, Canvas as FabricCanvas, FabricObject, Textbox } from "fabric";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  Circle,
  Copy,
  GripVertical,
  FolderOpen,
  ImageIcon,
  LayoutTemplate,
  Loader2,
  Minus,
  PanelLeftClose,
  PencilLine,
  Sparkles,
  Square,
  Trash2,
  Triangle,
  Type,
  Layers,
  Lock,
  Check,
  Plus,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  EditorChromeButton,
  EditorChromeIconButton,
  EditorEmptyState,
  EditorRailSection,
  EditorScaffold,
  EditorStripButton,
  EditorTabsList,
  EditorTabsTrigger,
} from "@/components/editor/EditorScaffold";
import {
  ColorPickerPopover,
  fabricFillToColorValue,
  gradientConfigToFabricOptions,
  hexToRgba,
  parseColorString,
  type ColorValue,
  type GradientConfig,
} from "@/components/editor/ColorPickerPopover";
import { ProjectSetupWizard } from "@/components/editor/ProjectSetupWizard";
import {
  computeSetupCompleteness,
  SETUP_STRUCTURE_GATE,
} from "@/lib/setup-completeness-score";
import {
  ProjectCreationGate,
  AUDIENCE_OPTIONS,
  PLATFORM_OPTIONS,
  INDUSTRY_OPTIONS,
  PROJECT_NATURE_OPTIONS,
  INVOLVEMENT_OPTIONS,
  type ProjectCreationGatePayload,
} from "@/components/editor/ProjectCreationGate";
import type { PlanSummaryCopy } from "@/lib/entitlement";
import type { LayoutJson } from "@/app/api/projects/[id]/layout/generate/route";
import {
  buildProjectSceneFromStructureSuggestion,
  createProjectBoard,
  createProjectImageNode,
  getSceneBoardGroupRuns,
  MAX_PROJECT_BOARDS,
  markBoardsAfterGeneration,
  createProjectShapeNode,
  createProjectTextNode,
  getGenerationScopeBoardIds,
  getSceneBoardById,
  mergeProjectLayoutDocument,
  normalizeProjectEditorScene,
  PROJECT_BOARD_HEIGHT,
  PROJECT_BOARD_WIDTH,
  PROJECT_IMAGE_ROLE_TAGS,
  PROJECT_SHAPE_TYPES,
  resolveProjectEditorScene,
  resolveProjectAssetMeta,
  type GenerationScope,
  type ProjectBoard,
  type ProjectBoardGroupRun,
  type ProjectBoardImageNode,
  type ProjectImageRoleTag,
  type ProjectMaterialRecognition,
  type ProjectBoardNode,
  type ProjectStructureGroup,
  type ProjectStructureSection,
  type ProjectStructureSuggestion,
  type ProjectBoardTextNode,
  type ProjectEditorScene,
  type ProjectShapeType,
} from "@/lib/project-editor-scene";
import {
  STYLE_PRESETS,
  type StyleProfile,
  type StyleReferenceSelection,
} from "@/lib/style-reference-presets";
import { cn } from "@/lib/utils";
import { uploadFilesFromBrowser } from "@/lib/blob-client-upload";
import type { ProjectEditorInitialData } from "./ProjectEditorClient";

type FabricModule = typeof import("fabric");

type ActiveObjectMeta =
  | { kind: "none" }
  | { kind: "multi"; count: number }
  | {
      kind: "text";
      id: string;
      text: string;
      fontFamily: string;
      fontSize: number;
      fontWeight: number;
      lineHeight: number;
      textAlign: "left" | "center" | "right";
      color: string;
      opacity: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      kind: "image";
      id: string;
      assetId: string | null;
      fit: "fill" | "fit";
      crop: {
        x: number;
        y: number;
        scale: number;
      };
      opacity: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      kind: "shape";
      id: string;
      shape: ProjectShapeType;
      fill: string;
      fillAlpha: number;
      gradient: import("@/components/editor/ColorPickerPopover").GradientConfig | null;
      stroke: string | null;
      strokeAlpha: number;
      strokeWidth: number;
      opacity: number;
      rx: number;
      x: number;
      y: number;
      width: number;
      height: number;
    };

type LayerItem = {
  id: string;
  label: string;
  type: "text" | "image" | "shape";
  shape?: ProjectShapeType;
  assetId?: string;
  previewUrl?: string | null;
};

type ContextMenuState = {
  open: boolean;
  x: number;
  y: number;
};

type LeftPanelKey = "project" | "assets" | "structure" | "layers" | "boards";

type GeneratePrecheck = {
  actionType: string;
  styleProfile: StyleProfile;
  isHighCostAction: boolean;
  actionLabel: string;
  suggestedMode: "continue" | "reuse" | "block";
  blockReason: "active_project_limit" | "action_quota_exhausted" | null;
  consumesQuota: boolean;
  failureCounts: boolean;
  projectActivated: boolean;
  activeProjectRemaining: number;
  actionRemaining: number;
  remainingAfterAction: number;
  reusableDraftId: string | null;
  reusableTaskId?: string | null;
  generationScope?: GenerationScope;
};

const PROJECT_IMAGE_ROLE_LABELS: Record<ProjectImageRoleTag, string> = {
  main: "主讲",
  support: "补充",
  decorative: "装饰",
  risk: "风险",
};

const SHAPE_LABELS: Record<ProjectShapeType, string> = {
  rect: "矩形",
  square: "正方形",
  circle: "圆形",
  triangle: "三角形",
  line: "线段",
};

const LEFT_PANEL_ITEMS: Array<{
  key: LeftPanelKey;
  label: string;
  icon: typeof FolderOpen;
  hint: string;
}> = [
  { key: "project", label: "项目", icon: FolderOpen, hint: "项目背景与上下文" },
  { key: "assets", label: "素材", icon: ImageIcon, hint: "上传设计图并插入当前画板" },
  { key: "structure", label: "结构", icon: Sparkles, hint: "基于背景和素材生成结构建议" },
  { key: "layers", label: "图层", icon: Layers, hint: "对象层级与管理" },
  { key: "boards", label: "画板", icon: LayoutTemplate, hint: "新增与切换画板" },
];

type FabricSceneObject = FabricObject & {
  data?: {
    nodeId?: string;
    nodeType?: "text" | "image" | "shape";
    assetId?: string;
    fit?: "fill" | "fit";
    frameWidth?: number;
    frameHeight?: number;
    crop?: {
      x: number;
      y: number;
      scale: number;
    };
    shapeType?: ProjectShapeType;
    role?: ProjectBoardTextNode["role"];
  };
};

function newNodeId(prefix: "text" | "image" | "shape") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function newStructureId(prefix: "group" | "section") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const SURFACE_FIT_PADDING = 48;

// 正文字体
const EDITOR_FONTS_BODY = [
  { label: "思源黑体", value: "Noto Sans SC" },
  { label: "思源宋体", value: "Noto Serif SC" },
  { label: "阿里巴巴普惠体", value: "Alibaba PuHuiTi" },
  { label: "站酷小薇体", value: "ZCOOL XiaoWei" },
] as const;

// 展示/艺术字体
const EDITOR_FONTS_DISPLAY = [
  { label: "得意黑", value: "Smiley Sans" },
  { label: "站酷庆科黄油体", value: "ZCOOL QingKe HuangYou" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "Bebas Neue", value: "Bebas Neue" },
  { label: "Syne", value: "Syne" },
] as const;

const EDITOR_FONTS = [...EDITOR_FONTS_BODY, ...EDITOR_FONTS_DISPLAY];

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;700&family=ZCOOL+XiaoWei&family=ZCOOL+QingKe+HuangYou&family=Playfair+Display:wght@400;700&family=Cormorant+Garamond:wght@400;600&family=Bebas+Neue&family=Syne:wght@400;700;800&display=swap";

// 得意黑 + 阿里普惠体通过各自 CDN 加载（自托管字体，无 Google Fonts 收录）
const SMILEY_SANS_URL =
  "https://cdn.jsdelivr.net/gh/atelier-anchor/smiley-sans@1.1.1/demo/SmileySans-Oblique.woff2";
const ALIBABA_PUHUITI_URL =
  "https://puhuiti.oss-cn-hangzhou.aliyuncs.com/AlibabaPuHuiTi-2/AlibabaPuHuiTi-2-55-Regular/AlibabaPuHuiTi-2-55-Regular.woff2";
// 画板数量硬上限：see spec-system-v3/04 §4.5。
const PROJECT_BOARD_MAX = MAX_PROJECT_BOARDS;
const editorPanelCardClass =
  "rounded-[20px] border border-white/8 bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
const editorPanelMutedCardClass =
  "rounded-[18px] border border-white/8 bg-white/3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]";
const editorFloatingSurfaceClass =
  "rounded-[22px] border border-white/8 bg-card text-white shadow-[0_20px_48px_-28px_rgba(0,0,0,0.86)]";
const editorPopupSurfaceClass =
  "rounded-[20px] border border-white/8 bg-card text-white shadow-[0_24px_56px_-24px_rgba(0,0,0,0.9)]";
const editorPopupItemClass =
  "flex w-full items-center justify-between rounded-[14px] px-3 py-2.5 text-left text-sm text-white/72 transition-colors hover:bg-white/[0.07] hover:text-white";

function isEditableCanvasTarget(target: FabricObject | null | undefined) {
  if (!target) return false;
  if (target.type === "activeSelection") return true;
  const typed = target as FabricSceneObject;
  return Boolean(typed.data?.nodeType) || target.type === "textbox";
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "请求失败");
  }
  return data;
}

function getBoardThumbnailAssetId(board: ProjectBoard) {
  if (board.thumbnailAssetId) return board.thumbnailAssetId;
  const imageNode = board.nodes.find(
    (node): node is ProjectBoardImageNode => node.type === "image"
  );
  return imageNode?.assetId ?? null;
}

function getBoardGroupRunLabel(
  run: ProjectBoardGroupRun,
  options: { showUngrouped: boolean }
) {
  if (run.label) return run.label;
  return options.showUngrouped ? "未分组" : null;
}

function getImageFrameMeta(object: FabricSceneObject) {
  const scaledWidth =
    typeof object.getScaledWidth === "function" ? object.getScaledWidth() : object.width ?? 0;
  const scaledHeight =
    typeof object.getScaledHeight === "function" ? object.getScaledHeight() : object.height ?? 0;
  const fit = object.data?.fit ?? "fill";
  const frameWidth =
    typeof object.data?.frameWidth === "number" ? object.data.frameWidth : scaledWidth;
  const frameHeight =
    typeof object.data?.frameHeight === "number" ? object.data.frameHeight : scaledHeight;
  const frameX =
    fit === "fit" ? (object.left ?? 0) - Math.max(frameWidth - scaledWidth, 0) / 2 : object.left ?? 0;
  const frameY =
    fit === "fit" ? (object.top ?? 0) - Math.max(frameHeight - scaledHeight, 0) / 2 : object.top ?? 0;

  return {
    fit,
    frameWidth,
    frameHeight,
    frameX,
    frameY,
    scaledWidth,
    scaledHeight,
  };
}

function getImageCropMeta(object: FabricSceneObject) {
  return object.data?.crop ?? { x: 0.5, y: 0.5, scale: 1 };
}

function approximatelyEqual(a: number, b: number, tolerance = 0.5) {
  return Math.abs(a - b) <= tolerance;
}

export function ProjectEditorFabricClient({
  initialData,
  planSummary,
}: {
  initialData: ProjectEditorInitialData;
  planSummary: PlanSummaryCopy;
}) {
  const router = useRouter();
  const [scene, setScene] = useState<ProjectEditorScene>(() =>
    resolveProjectEditorScene(initialData.layout, {
      assets: initialData.assets,
      projectName: initialData.name,
    })
  );
  const [stage, setStage] = useState(initialData.stage);
  const [packageMode, setPackageMode] = useState(initialData.packageMode);
  const [layout, setLayout] = useState<LayoutJson | null>(initialData.layout);
  const [materialRecognition, setMaterialRecognition] =
    useState<ProjectMaterialRecognition | null>(initialData.layout?.materialRecognition ?? null);
  const [structureSuggestion, setStructureSuggestion] = useState<ProjectStructureSuggestion | null>(
    initialData.layout?.structureSuggestion ?? null
  );
  const [structureDraft, setStructureDraft] = useState<ProjectStructureSuggestion | null>(
    initialData.layout?.structureSuggestion ?? null
  );
  const [canvasReady, setCanvasReady] = useState(false);
  const [assets, setAssets] = useState(initialData.assets);
  const [activeMeta, setActiveMeta] = useState<ActiveObjectMeta>({ kind: "none" });
  const [assetSearch, setAssetSearch] = useState("");
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [recognizingMaterials, setRecognizingMaterials] = useState(false);
  const [recognizingIncremental, setRecognizingIncremental] = useState(false);
  const [suggestingStructure, setSuggestingStructure] = useState(false);
  // 向导模式：项目未完成准备阶段时展示引导，而不是画布
  // 判定依据：setup.completedAt（新口径，只有向导"进入排版"会写入）
  // 兼容老项目：若 structureSuggestion.confirmedAt 已存在视为已完成
  const [setupMode, setSetupMode] = useState(() => {
    const setupCompleted = Boolean(initialData.layout?.setup?.completedAt);
    const legacyConfirmed = Boolean(initialData.layout?.structureSuggestion?.confirmedAt);
    return !(setupCompleted || legacyConfirmed);
  });
  const [confirmingStructure, setConfirmingStructure] = useState(false);
  const [surfaceScale, setSurfaceScale] = useState(1);
  const [liveThumbnails, setLiveThumbnails] = useState<Record<string, string>>({});
  const thumbnailCaptureRef = useRef<number | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [projectFactsDraft, setProjectFactsDraft] = useState(initialData.facts);
  const [factsSaveState, setFactsSaveState] = useState<"saved" | "saving" | "dirty" | "error">(
    "saved"
  );
  // 创建门:受众、平台、行业、性质、职责必须在进入前确定,且一旦确定不可更改。
  const [creationGateSubmitting, setCreationGateSubmitting] = useState(false);
  const [creationGateError, setCreationGateError] = useState("");
  const needsCreationGate =
    !projectFactsDraft.audience ||
    !projectFactsDraft.platform ||
    !projectFactsDraft.industry.trim() ||
    !projectFactsDraft.projectNature ||
    !projectFactsDraft.involvementLevel;
  const [structureSaveState, setStructureSaveState] = useState<
    "saved" | "saving" | "dirty" | "error"
  >("saved");
  const [applyingStructure, setApplyingStructure] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [checkingPrecheck, setCheckingPrecheck] = useState(false);
  const [generatePrecheck, setGeneratePrecheck] = useState<GeneratePrecheck | null>(null);
  const [styleSelection, setStyleSelection] = useState<StyleReferenceSelection>(() => {
    const styleProfile = initialData.layout?.styleProfile;
    if (styleProfile?.source === "preset" && styleProfile.presetKey) {
      return { source: "preset", presetKey: styleProfile.presetKey };
    }
    if (styleProfile?.source === "reference_set" && styleProfile.referenceSetId) {
      return {
        source: "reference_set",
        referenceSetId: styleProfile.referenceSetId,
        referenceSetName: styleProfile.referenceSetName ?? null,
      };
    }
    return { source: "none" };
  });
  const [assetDetailsSaving, setAssetDetailsSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionMessage, setActionMessage] = useState<{
    tone: "info" | "error";
    text: string;
  } | null>(null);
  // 排版阶段左侧栏不再包含 project tab；直接进排版时默认落在画板面板
  const [leftPanel, setLeftPanel] = useState<LeftPanelKey | null>(() => {
    const setupCompleted = Boolean(initialData.layout?.setup?.completedAt);
    const legacyConfirmed = Boolean(initialData.layout?.structureSuggestion?.confirmedAt);
    return setupCompleted || legacyConfirmed ? "boards" : "project";
  });
  const [layerItems, setLayerItems] = useState<LayerItem[]>([]);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    x: 0,
    y: 0,
  });

  const hostRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const assetUploadRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const clipboardRef = useRef<FabricObject | ActiveSelection | null>(null);
  const hydratingRef = useRef(false);
  const boardLoadTokenRef = useRef(0);
  const fitFrameRef = useRef<number | null>(null);
  const lastSavedSceneRef = useRef(JSON.stringify(scene));
  const lastSavedFactsRef = useRef(JSON.stringify(initialData.facts));
  const didHydrateSceneRef = useRef(false);
  const didHydrateFactsRef = useRef(false);

  const [imageDetailsDraft, setImageDetailsDraft] = useState<{
    title: string;
    note: string;
    roleTag: ProjectImageRoleTag | "none";
  }>({
    title: "",
    note: "",
    roleTag: "none",
  });
  const assetMap = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets]
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );
  const activeBoard = useMemo(
    () => getSceneBoardById(scene, scene.activeBoardId) ?? scene.boards[0] ?? null,
    [scene]
  );
  const visibleAssets = useMemo(() => {
    const keyword = assetSearch.trim().toLowerCase();
    if (!keyword) return assets;
    return assets.filter((asset) =>
      [asset.title ?? "", asset.id].join(" ").toLowerCase().includes(keyword)
    );
  }, [assetSearch, assets]);
  const activeBoardAssetIds = useMemo(() => {
    if (!activeBoard) return new Set<string>();
    return new Set(
      activeBoard.nodes.flatMap((node) => (node.type === "image" ? [node.assetId] : []))
    );
  }, [activeBoard]);
  const featuredAssets = useMemo(
    () => visibleAssets.filter((asset) => activeBoardAssetIds.has(asset.id)),
    [activeBoardAssetIds, visibleAssets]
  );
  const libraryAssets = useMemo(
    () => visibleAssets.filter((asset) => !activeBoardAssetIds.has(asset.id)),
    [activeBoardAssetIds, visibleAssets]
  );
  const boardThumbnailMap = useMemo(() => {
    return new Map(
      scene.boards.map((board) => {
        const live = liveThumbnails[board.id];
        if (live) return [board.id, live] as const;
        const assetId = getBoardThumbnailAssetId(board);
        return [board.id, assetId ? assetMap.get(assetId)?.imageUrl ?? null : null] as const;
      })
    );
  }, [assetMap, scene.boards, liveThumbnails]);
  const boardGroupRuns = useMemo(() => getSceneBoardGroupRuns(scene), [scene]);
  const showBoardGroupHeaders = useMemo(
    () =>
      boardGroupRuns.length > 1 ||
      boardGroupRuns.some((run) => Boolean(run.structureGroupId)),
    [boardGroupRuns]
  );
  const normalizedGenerationScope = useMemo<GenerationScope>(
    () =>
      scene.generationScope.mode === "all"
        ? { mode: "all", boardIds: scene.boardOrder }
        : { mode: "current", boardIds: [scene.activeBoardId] },
    [scene.activeBoardId, scene.boardOrder, scene.generationScope.mode]
  );
  const generationBoardIds = useMemo(
    () => getGenerationScopeBoardIds({ ...scene, generationScope: normalizedGenerationScope }),
    [normalizedGenerationScope, scene]
  );
  const generationScopeSummary = useMemo(() => {
    if (normalizedGenerationScope.mode === "current") {
      return "本轮生成当前画板";
    }
    return "本轮生成全部未锁定画板";
  }, [
    normalizedGenerationScope.mode,
  ]);
  // 生成确认面板需要显式列出被锁定、将从本次 AI 写操作中跳过的画板。
  const skippedLockedBoardsInScope = useMemo(
    () =>
      generationBoardIds
        .map((boardId) => scene.boards.find((board) => board.id === boardId))
        .filter(
          (board): board is ProjectBoard => Boolean(board) && Boolean(board?.locked)
        ),
    [generationBoardIds, scene.boards]
  );
  const selectedAssets = useMemo(() => assets.filter((asset) => asset.selected), [assets]);
  const recognizedAssetIdSet = useMemo(
    () => new Set(materialRecognition?.recognizedAssetIds ?? []),
    [materialRecognition]
  );
  const pendingRecognitionAssets = useMemo(
    () => selectedAssets.filter((asset) => !recognizedAssetIdSet.has(asset.id)),
    [recognizedAssetIdSet, selectedAssets]
  );
  const hasActiveInspector = activeMeta.kind !== "none";
  const activeBoardNodeStats = useMemo(() => {
    if (!activeBoard) return { text: 0, image: 0, shape: 0 };
    return activeBoard.nodes.reduce(
      (acc, node) => {
        if (node.type === "text") acc.text += 1;
        else if (node.type === "image") acc.image += 1;
        else if (node.type === "shape") acc.shape += 1;
        return acc;
      },
      { text: 0, image: 0, shape: 0 }
    );
  }, [activeBoard]);
  const activeBoardIndex = useMemo(
    () => (activeBoard ? scene.boardOrder.indexOf(activeBoard.id) : -1),
    [activeBoard, scene.boardOrder]
  );
  const activeBoardIncludedInGeneration = useMemo(
    () => Boolean(activeBoard) && generationBoardIds.includes(activeBoard.id),
    [activeBoard, generationBoardIds]
  );
  const activeBoardStructureLabel = useMemo(() => {
    if (!activeBoard?.structureSource) return null;
    return (
      activeBoard.structureSource.sectionTitle ??
      activeBoard.structureSource.groupLabel ??
      null
    );
  }, [activeBoard]);
  const activeBoardAiStateLabel = useMemo(() => {
    if (!activeBoard) return "";
    if (activeBoard.locked) return "已锁定 AI 写操作";
    if (activeBoard.aiMarkers.hasPendingSuggestion) return "有待处理建议";
    if (activeBoard.aiMarkers.hasAnalysis) return "已完成分析";
    return "尚未生成建议";
  }, [activeBoard]);
  function updateActiveBoard(patch: Partial<Pick<ProjectBoard, "name" | "intent" | "locked">> & {
    frameBackground?: string;
  }) {
    setScene((current) =>
      normalizeProjectEditorScene({
        ...current,
        boards: current.boards.map((board) =>
          board.id === current.activeBoardId
            ? {
                ...board,
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.intent !== undefined ? { intent: patch.intent } : {}),
                ...(patch.locked !== undefined ? { locked: patch.locked } : {}),
                ...(patch.frameBackground !== undefined
                  ? { frame: { ...board.frame, background: patch.frameBackground } }
                  : {}),
              }
            : board
        ),
      })
    );
  }
  const currentLeftPanelLabel =
    LEFT_PANEL_ITEMS.find((item) => item.key === leftPanel)?.label ?? "工具栏";
  const currentLeftPanelMeta = LEFT_PANEL_ITEMS.find((item) => item.key === leftPanel) ?? null;
  const selectedImageAsset =
    activeMeta.kind === "image" && activeMeta.assetId
      ? assetMap.get(activeMeta.assetId) ?? null
      : null;
  const hasStructureInputs =
    assets.length > 0 ||
    Boolean(projectFactsDraft.audience) ||
    Boolean(projectFactsDraft.industry.trim()) ||
    Boolean(projectFactsDraft.background.trim()) ||
    Boolean(projectFactsDraft.businessGoal.trim()) ||
    Boolean(projectFactsDraft.resultSummary.trim());
  const canSuggestStructure =
    hasStructureInputs && Boolean(materialRecognition || structureSuggestion);
  const factsSaveLabel =
    factsSaveState === "saving"
      ? "正在保存"
      : factsSaveState === "error"
        ? "保存失败"
        : factsSaveState === "dirty"
          ? "待保存"
          : "已保存";
  const sceneSaveLabel =
    saveState === "saving"
      ? "画板保存中"
      : saveState === "error"
        ? "画板保存失败"
        : saveState === "dirty"
          ? "画板待保存"
          : "画板已保存";
  const structureSaveLabel =
    structureSaveState === "saving"
      ? "结构保存中"
      : structureSaveState === "error"
        ? "结构保存失败"
        : structureSaveState === "dirty"
          ? "结构待保存"
        : structureDraft?.status === "confirmed"
            ? "结构已确认"
            : "结构已保存";
  const topStatusLabel =
    saveState === "saved" && factsSaveState === "saved"
      ? "已保存"
      : saveState === "error" || factsSaveState === "error"
        ? "保存失败"
        : saveState === "saving" || factsSaveState === "saving"
          ? "保存中"
          : "待保存";

  function toggleLeftPanel(panel: LeftPanelKey) {
    setLeftPanel((current) => (current === panel ? null : panel));
  }

  function createBoard() {
    if (scene.boards.length >= PROJECT_BOARD_MAX) return;
    const board = createProjectBoard({
      name: `画板 ${scene.boards.length + 1}`,
      intent: "",
    });
    setScene((current) =>
      normalizeProjectEditorScene({
        ...current,
        activeBoardId: board.id,
        boardOrder: [...current.boardOrder, board.id],
        boards: [...current.boards, board],
      })
    );
    setLeftPanel("boards");
  }

  function deleteBoard(boardId: string) {
    setScene((current) => {
      if (current.boards.length <= 1) return current;
      const nextBoards = current.boards.filter((board) => board.id !== boardId);
      const nextOrder = current.boardOrder.filter((id) => id !== boardId);
      const wasActive = current.activeBoardId === boardId;
      const nextActiveId = wasActive
        ? nextOrder[0] ?? nextBoards[0]?.id ?? current.activeBoardId
        : current.activeBoardId;
      const nextScope =
        current.generationScope.mode === "all"
          ? { mode: "all" as const, boardIds: nextOrder }
          : { mode: "current" as const, boardIds: [nextActiveId] };
      return normalizeProjectEditorScene({
        ...current,
        boards: nextBoards,
        boardOrder: nextOrder,
        activeBoardId: nextActiveId,
        generationScope: nextScope,
      });
    });
    setLiveThumbnails((prev) => {
      if (!(boardId in prev)) return prev;
      const next = { ...prev };
      delete next[boardId];
      return next;
    });
  }

  function handleBoardDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;
    const oldIndex = scene.boardOrder.indexOf(activeId);
    const newIndex = scene.boardOrder.indexOf(overId);
    if (oldIndex === -1 || newIndex === -1) return;
    const nextOrder = arrayMove(scene.boardOrder, oldIndex, newIndex);
    setScene((current) =>
      normalizeProjectEditorScene({ ...current, boardOrder: nextOrder })
    );
  }

  function captureBoardThumbnail() {
    const canvas = canvasRef.current;
    const board = activeBoard;
    if (!canvas || !board) return;
    try {
      const srcCanvas = canvas.lowerCanvasEl;
      const srcW = canvas.getWidth();
      const srcH = canvas.getHeight();
      if (srcW <= 0 || srcH <= 0) return;

      // 缩略图目标宽度 220px，等比缩放
      const scale = Math.min(1, 220 / srcW);
      const dstW = Math.round(srcW * scale);
      const dstH = Math.round(srcH * scale);

      // 离屏 canvas：先填白板背景色，再叠 Fabric lower canvas
      // 避免 JPEG 将透明区域渲染成黑色
      const offscreen = document.createElement("canvas");
      offscreen.width = dstW;
      offscreen.height = dstH;
      const ctx = offscreen.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = board.frame.background || "#ffffff";
      ctx.fillRect(0, 0, dstW, dstH);
      ctx.drawImage(srcCanvas, 0, 0, dstW, dstH);

      const dataUrl = offscreen.toDataURL("image/jpeg", 0.6);
      setLiveThumbnails((prev) =>
        prev[board.id] === dataUrl ? prev : { ...prev, [board.id]: dataUrl }
      );
    } catch {
      // ignore capture errors (e.g., tainted canvas from cross-origin images)
    }
  }

  function scheduleThumbnailCapture() {
    if (thumbnailCaptureRef.current !== null) {
      window.clearTimeout(thumbnailCaptureRef.current);
    }
    thumbnailCaptureRef.current = window.setTimeout(() => {
      thumbnailCaptureRef.current = null;
      captureBoardThumbnail();
    }, 350);
  }

  function selectBoard(boardId: string) {
    setScene((current) =>
      normalizeProjectEditorScene({ ...current, activeBoardId: boardId })
    );
  }

  function setGenerationMode(mode: GenerationScope["mode"]) {
    setScene((current) => {
      if (mode === "all") {
        return normalizeProjectEditorScene({
          ...current,
          generationScope: { mode: "all", boardIds: current.boardOrder },
        });
      }

      return normalizeProjectEditorScene({
        ...current,
        generationScope: { mode: "current", boardIds: [current.activeBoardId] },
      });
    });
  }

  async function ensureLayoutStage(mode: string) {
    let currentStage = stage;
    let guard = 0;

    while (!["LAYOUT", "READY"].includes(currentStage) && guard < 6) {
      const response = await parseJsonResponse<{ stage: string; packageMode?: string }>(
        await fetch(`/api/projects/${initialData.id}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentStage === "PACKAGE" ? { packageMode: mode } : {}),
        })
      );

      currentStage = response.stage;
      setStage(currentStage);
      if (response.packageMode) {
        setPackageMode(response.packageMode);
      }
      guard += 1;
    }

    return currentStage;
  }

  function getResolvedStyleSelection() {
    if (styleSelection.source === "reference_set") {
      const matched = initialData.styleReferenceSets.find(
        (item) => item.id === styleSelection.referenceSetId
      );
      return {
        source: "reference_set" as const,
        referenceSetId: matched?.id ?? styleSelection.referenceSetId ?? null,
        referenceSetName: matched?.name ?? styleSelection.referenceSetName ?? null,
      };
    }

    if (styleSelection.source === "preset") {
      return {
        source: "preset" as const,
        presetKey: styleSelection.presetKey ?? null,
      };
    }

    return { source: "none" as const };
  }

  async function refreshGeneratePrecheck() {
    setCheckingPrecheck(true);
    setActionError("");
    try {
      await persistCurrentSceneForAction();
      const data = await parseJsonResponse<GeneratePrecheck>(
        await fetch(`/api/projects/${initialData.id}/layout/precheck`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleSelection: getResolvedStyleSelection(),
            generationScope: normalizedGenerationScope,
          }),
        })
      );
      setGeneratePrecheck(data);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "生成预检失败");
      setGeneratePrecheck(null);
    } finally {
      setCheckingPrecheck(false);
    }
  }

  async function handleOpenGenerate() {
    setGenerateOpen(true);
    await refreshGeneratePrecheck();
  }

  function closeGenerateDialog() {
    setGenerateOpen(false);
  }

  function openGenerateFollowup(path: string) {
    setGenerateOpen(false);
    router.push(path);
  }

  function getLayerItemsFromCanvas(canvas: FabricCanvas) {
    const objects = canvas.getObjects() as FabricSceneObject[];
    const ordered = [...objects].reverse();
    return ordered.map((object) => {
      const data = object.data ?? {};
      if (!object.data) {
        object.data = data;
      }
      const nodeType =
        data.nodeType ??
        (object.type === "textbox" ? "text" : object.type === "image" ? "image" : "shape");
      const nodeId = data.nodeId ?? newNodeId(nodeType);
      if (!data.nodeId) {
        data.nodeId = nodeId;
      }

      let label = "图层";
      let previewUrl: string | null | undefined = undefined;
      let shape: ProjectShapeType | undefined;

      if (nodeType === "text") {
        const text = (object as unknown as Textbox).text ?? "文本";
        label = text.length > 16 ? `${text.slice(0, 16)}…` : text;
      } else if (nodeType === "image") {
        const asset = data.assetId ? assetMap.get(data.assetId) : null;
        label = asset?.title ?? "图片";
        previewUrl = asset?.imageUrl ?? null;
      } else {
        shape = data.shapeType ?? "rect";
        label = SHAPE_LABELS[shape] ?? "形状";
      }

      return {
        id: nodeId,
        label,
        type: nodeType,
        shape,
        assetId: data.assetId,
        previewUrl,
      } satisfies LayerItem;
    });
  }

  function refreshLayerState(canvas: FabricCanvas | null) {
    if (!canvas) return;
    setLayerItems(getLayerItemsFromCanvas(canvas));
    const activeObjects = canvas.getActiveObjects() as FabricSceneObject[];
    const ids = activeObjects
      .map((object) => object.data?.nodeId)
      .filter((id): id is string => Boolean(id));
    setSelectedLayerIds(ids);
  }

  function openContextMenuAt(x: number, y: number) {
    setContextMenu({ open: true, x, y });
  }

  function closeContextMenu() {
    setContextMenu((prev) => (prev.open ? { ...prev, open: false } : prev));
  }

  function updateActiveObject(patch: Partial<FabricObject> & Partial<Textbox>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject() as FabricObject | ActiveSelection | null;
    if (!activeObject || activeObject.type === "activeSelection") return;
    activeObject.set(patch);
    activeObject.setCoords();
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
  }

  function setActiveObjectFill(colorValue: ColorValue) {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;
    const activeObject = canvas.getActiveObject() as FabricObject | null;
    if (!activeObject || activeObject.type === "activeSelection") return;

    if (colorValue.mode === "solid") {
      activeObject.set({ fill: hexToRgba(colorValue.hex, colorValue.alpha) });
    } else {
      const opts = gradientConfigToFabricOptions(colorValue.gradient);
      const grad = new (fabric as unknown as Record<string, new (o: unknown) => unknown>).Gradient(opts);
      activeObject.set({ fill: grad as unknown as string });
    }
    activeObject.setCoords();
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
  }

  function applyImagePresentation(
    image: FabricSceneObject,
    options: {
      fit: "fill" | "fit";
      frameWidth: number;
      frameHeight: number;
      frameX: number;
      frameY: number;
      crop: {
        x: number;
        y: number;
        scale: number;
      };
    }
  ) {
    const naturalWidth = image.width || 1;
    const naturalHeight = image.height || 1;
    const frameWidth = Math.max(1, options.frameWidth);
    const frameHeight = Math.max(1, options.frameHeight);
    const crop = {
      x: Math.min(Math.max(options.crop.x, 0), 1),
      y: Math.min(Math.max(options.crop.y, 0), 1),
      scale: Math.min(Math.max(options.crop.scale, 1), 4),
    };

    if (!image.data) {
      image.data = {};
    }
    image.data.fit = options.fit;
    image.data.frameWidth = frameWidth;
    image.data.frameHeight = frameHeight;
    image.data.crop = crop;

    if (options.fit === "fit") {
      const scale = Math.min(frameWidth / naturalWidth, frameHeight / naturalHeight);
      const renderWidth = naturalWidth * scale;
      const renderHeight = naturalHeight * scale;
      image.set({
        left: options.frameX + (frameWidth - renderWidth) / 2,
        top: options.frameY + (frameHeight - renderHeight) / 2,
        width: naturalWidth,
        height: naturalHeight,
        cropX: 0,
        cropY: 0,
        scaleX: scale,
        scaleY: scale,
      });
      return;
    }

    const baseScale = Math.max(frameWidth / naturalWidth, frameHeight / naturalHeight);
    const visibleWidth = Math.min(
      naturalWidth,
      frameWidth / (baseScale * crop.scale)
    );
    const visibleHeight = Math.min(
      naturalHeight,
      frameHeight / (baseScale * crop.scale)
    );
    const cropX = Math.min(
      Math.max(naturalWidth * crop.x - visibleWidth / 2, 0),
      Math.max(naturalWidth - visibleWidth, 0)
    );
    const cropY = Math.min(
      Math.max(naturalHeight * crop.y - visibleHeight / 2, 0),
      Math.max(naturalHeight - visibleHeight, 0)
    );

    image.set({
      left: options.frameX,
      top: options.frameY,
      width: visibleWidth,
      height: visibleHeight,
      cropX,
      cropY,
      scaleX: frameWidth / visibleWidth,
      scaleY: frameHeight / visibleHeight,
    });
  }

  function normalizeImageObjectAfterTransform(image: FabricSceneObject) {
    const fit = image.data?.fit ?? "fill";
    const crop = getImageCropMeta(image);
    const naturalWidth = image.width || 1;
    const naturalHeight = image.height || 1;
    const actualWidth =
      typeof image.getScaledWidth === "function" ? image.getScaledWidth() : image.width ?? 0;
    const actualHeight =
      typeof image.getScaledHeight === "function" ? image.getScaledHeight() : image.height ?? 0;
    const storedFrameWidth =
      typeof image.data?.frameWidth === "number" ? image.data.frameWidth : actualWidth;
    const storedFrameHeight =
      typeof image.data?.frameHeight === "number" ? image.data.frameHeight : actualHeight;

    if (fit === "fill") {
      applyImagePresentation(image, {
        fit,
        frameX: image.left ?? 0,
        frameY: image.top ?? 0,
        frameWidth: actualWidth,
        frameHeight: actualHeight,
        crop,
      });
      image.setCoords();
      return;
    }

    const storedScale = Math.min(storedFrameWidth / naturalWidth, storedFrameHeight / naturalHeight);
    const expectedRenderWidth = naturalWidth * storedScale;
    const expectedRenderHeight = naturalHeight * storedScale;
    const scaleRatioX = actualWidth / Math.max(expectedRenderWidth, 1);
    const scaleRatioY = actualHeight / Math.max(expectedRenderHeight, 1);
    const movedOnly =
      approximatelyEqual(actualWidth, expectedRenderWidth) &&
      approximatelyEqual(actualHeight, expectedRenderHeight);
    const nextRatio = movedOnly ? 1 : Math.max(0.05, (scaleRatioX + scaleRatioY) / 2);
    const nextFrameWidth = storedFrameWidth * nextRatio;
    const nextFrameHeight = storedFrameHeight * nextRatio;

    applyImagePresentation(image, {
      fit,
      frameX: (image.left ?? 0) - Math.max(nextFrameWidth - actualWidth, 0) / 2,
      frameY: (image.top ?? 0) - Math.max(nextFrameHeight - actualHeight, 0) / 2,
      frameWidth: nextFrameWidth,
      frameHeight: nextFrameHeight,
      crop,
    });
    image.setCoords();
  }

  function updateActiveDimensions(patch: { x?: number; y?: number; width?: number; height?: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject() as FabricSceneObject | null;
    if (!activeObject || activeObject.type === "activeSelection") return;

    if (activeObject.data?.nodeType === "image") {
      const frame = getImageFrameMeta(activeObject);
      applyImagePresentation(activeObject, {
        fit: frame.fit,
        frameX: patch.x ?? frame.frameX,
        frameY: patch.y ?? frame.frameY,
        frameWidth: patch.width ?? frame.frameWidth,
        frameHeight: patch.height ?? frame.frameHeight,
        crop: getImageCropMeta(activeObject),
      });
      activeObject.setCoords();
      canvas.requestRenderAll();
      syncActiveBoardFromCanvas();
      updateSelectionSummary(canvas);
      return;
    }

    const updates: Record<string, number> = {};
    if (patch.x !== undefined) updates.left = patch.x;
    if (patch.y !== undefined) updates.top = patch.y;
    if (patch.width !== undefined) {
      const naturalW = activeObject.width ?? 1;
      if (activeObject.type === "textbox") {
        updates.width = Math.max(1, patch.width);
      } else {
        updates.scaleX = Math.max(0.001, patch.width / naturalW);
      }
    }
    if (patch.height !== undefined) {
      const naturalH = activeObject.height ?? 1;
      updates.scaleY = Math.max(0.001, patch.height / naturalH);
    }

    activeObject.set(updates as Partial<FabricObject>);
    activeObject.setCoords();
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
  }

  function getCanvasObjectById(canvas: FabricCanvas, id: string) {
    return (canvas.getObjects() as FabricSceneObject[]).find(
      (object) => object.data?.nodeId === id
    );
  }

  function selectLayerById(id: string) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const object = getCanvasObjectById(canvas, id);
    if (!object) return;
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    updateSelectionSummary(canvas);
  }

  function arrangeActiveObject(action: "forward" | "backward" | "front" | "back") {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject() as FabricObject | ActiveSelection | null;
    if (!activeObject || activeObject.type === "activeSelection") return;
    const objects = canvas.getObjects();
    const currentIndex = objects.indexOf(activeObject);
    const bottomIndex = 0;
    const topIndex = objects.length - 1;

    const moveToIndex = (object: FabricObject, index: number) => {
      const mover = object as unknown as { moveTo: (value: number) => void };
      mover.moveTo(index);
    };

    if (action === "front") {
      moveToIndex(activeObject, topIndex);
    } else if (action === "back") {
      moveToIndex(activeObject, bottomIndex);
    } else if (action === "forward") {
      moveToIndex(activeObject, Math.min(currentIndex + 1, topIndex));
    } else {
      moveToIndex(activeObject, Math.max(currentIndex - 1, bottomIndex));
    }
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    refreshLayerState(canvas);
  }

  function handleLayerDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId) return;
    const oldIndex = layerItems.findIndex((item) => item.id === activeId);
    const newIndex = layerItems.findIndex((item) => item.id === overId);
    if (oldIndex === -1 || newIndex === -1) return;

    const nextItems = arrayMove(layerItems, oldIndex, newIndex);
    setLayerItems(nextItems);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects() as FabricSceneObject[];
    const objectMap = new Map(objects.map((object) => [object.data?.nodeId, object]));
    const orderedBottomToTop = [...nextItems].reverse();
    orderedBottomToTop.forEach((item, index) => {
      const object = objectMap.get(item.id);
      if (object) {
        const mover = object as unknown as { moveTo: (value: number) => void };
        mover.moveTo(index);
      }
    });
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
  }

  async function persistScene(
    sceneToSave: ProjectEditorScene,
    force = false,
    options: { markSetupCompleted?: boolean } = {}
  ) {
    const serialized = JSON.stringify(sceneToSave);
    if (!force && serialized === lastSavedSceneRef.current && !options.markSetupCompleted) {
      setSaveState("saved");
      return;
    }

    setSaveState("saving");
    const response = await fetch(`/api/projects/${initialData.id}/layout/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        editorScene: sceneToSave,
        ...(options.markSetupCompleted ? { markSetupCompleted: true } : {}),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((data as { error?: string }).error ?? "画板保存失败");
    }

    lastSavedSceneRef.current = serialized;
    setLayout((current) =>
      mergeProjectLayoutDocument(current, {
        editorScene: sceneToSave,
        ...(options.markSetupCompleted
          ? { setup: { completedAt: new Date().toISOString() } }
          : {}),
      }) as LayoutJson
    );
    setSaveState("saved");
  }

  async function handleCreationGateSubmit(payload: ProjectCreationGatePayload) {
    if (creationGateSubmitting) return;
    setCreationGateSubmitting(true);
    setCreationGateError("");
    try {
      const response = await fetch(`/api/projects/${initialData.id}/facts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(data.message ?? data.error ?? "锁定失败,请稍后重试");
      }
      const nextFacts = {
        ...projectFactsDraft,
        audience: payload.audience,
        platform: payload.platform,
        industry: payload.industry,
        projectNature: payload.projectNature,
        involvementLevel: payload.involvementLevel,
      };
      setProjectFactsDraft(nextFacts);
      lastSavedFactsRef.current = JSON.stringify(nextFacts);
      setFactsSaveState("saved");
      setSetupMode(true);
      setLeftPanel("project");
    } catch (error) {
      setCreationGateError(
        error instanceof Error ? error.message : "锁定失败,请稍后重试"
      );
    } finally {
      setCreationGateSubmitting(false);
    }
  }

  async function persistProjectFacts(
    factsToSave: ProjectEditorInitialData["facts"],
    force = false
  ) {
    const serialized = JSON.stringify(factsToSave);
    if (!force && serialized === lastSavedFactsRef.current) {
      setFactsSaveState("saved");
      return;
    }

    setFactsSaveState("saving");
    await parseJsonResponse(
      await fetch(`/api/projects/${initialData.id}/facts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(factsToSave),
      })
    );
    lastSavedFactsRef.current = serialized;
    setFactsSaveState("saved");
  }

  const queueScenePersist = useEffectEvent((sceneToSave: ProjectEditorScene) => {
    persistScene(sceneToSave).catch(() => setSaveState("error"));
  });

  const queueFactsPersist = useEffectEvent((factsToSave: ProjectEditorInitialData["facts"]) => {
    persistProjectFacts(factsToSave).catch(() => setFactsSaveState("error"));
  });

  useEffect(() => {
    if (!didHydrateSceneRef.current) {
      didHydrateSceneRef.current = true;
      return;
    }

    const serialized = JSON.stringify(scene);
    if (serialized === lastSavedSceneRef.current) return;

    setSaveState("dirty");
    const timeout = window.setTimeout(() => {
      queueScenePersist(scene);
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [queueScenePersist, scene]);

  useEffect(() => {
    if (!didHydrateFactsRef.current) {
      didHydrateFactsRef.current = true;
      return;
    }

    const serialized = JSON.stringify(projectFactsDraft);
    if (serialized === lastSavedFactsRef.current) return;

    setFactsSaveState("dirty");
    const timeout = window.setTimeout(() => {
      queueFactsPersist(projectFactsDraft);
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [projectFactsDraft, queueFactsPersist]);

  async function persistCurrentSceneForAction() {
    try {
      await persistProjectFacts(projectFactsDraft, true);
      if (structureDraft && structureSaveState !== "saved") {
        await saveStructureDraft();
      }
      await persistScene(scene, true);
    } catch (error) {
      setActionMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "画板保存失败，请稍后重试",
      });
      throw error;
    }
  }

  async function handleSuggestStructure() {
    if (suggestingStructure) return;

    setSuggestingStructure(true);
    setActionError("");
    setActionMessage(null);

    try {
      await persistCurrentSceneForAction();
      const data = await parseJsonResponse<{ suggestion: ProjectStructureSuggestion }>(
        await fetch(`/api/projects/${initialData.id}/structure/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );

      setStructureSuggestion(data.suggestion);
      setStructureDraft(data.suggestion);
      setStructureSaveState("saved");
      setLayout((current) =>
        mergeProjectLayoutDocument(current, {
          structureSuggestion: data.suggestion,
        }) as LayoutJson
      );
      setActionMessage({ tone: "info", text: "结构建议已更新" });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "结构建议生成失败，请稍后重试");
    } finally {
      setSuggestingStructure(false);
    }
  }

  // 向导专用：串联识别 → 结构建议，识别失败立即中止，不继续生成结构
  async function handleWizardAiUnderstand() {
    if (recognizingMaterials || suggestingStructure) return;
    setActionError("");

    // Step 1: 素材识别
    setRecognizingMaterials(true);
    let latestRecognition: ProjectMaterialRecognition | null = null;
    try {
      await persistCurrentSceneForAction();
      const recData = await parseJsonResponse<{ recognition: ProjectMaterialRecognition }>(
        await fetch(`/api/projects/${initialData.id}/recognition/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
      latestRecognition = recData.recognition;
      setMaterialRecognition(recData.recognition);
      setLayout((current) =>
        mergeProjectLayoutDocument(current, { materialRecognition: recData.recognition }) as LayoutJson
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "AI 理解失败，请稍后重试");
      setRecognizingMaterials(false);
      return; // 识别失败 → 中止，不执行结构生成
    }
    setRecognizingMaterials(false);

    // Gate: 仅在 Setup 完整度 ≥ 80 时自动继续生成结构（§14.3 Scoring Strategy v3）
    const completeness = computeSetupCompleteness({
      facts: {
        timeline: projectFactsDraft.timeline,
        roleTitle: projectFactsDraft.roleTitle,
        background: projectFactsDraft.background,
        businessGoal: projectFactsDraft.businessGoal,
        biggestChallenge: projectFactsDraft.biggestChallenge,
        resultSummary: projectFactsDraft.resultSummary,
      },
      assets,
      materialRecognition: latestRecognition,
    });
    if (completeness.totalScore < SETUP_STRUCTURE_GATE) return;

    // Step 2: 结构建议（仅在识别成功后执行）
    setSuggestingStructure(true);
    try {
      await persistCurrentSceneForAction();
      const strData = await parseJsonResponse<{ suggestion: ProjectStructureSuggestion }>(
        await fetch(`/api/projects/${initialData.id}/structure/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
      setStructureDraft(strData.suggestion);
      setStructureSuggestion(strData.suggestion);
      setLayout((current) =>
        mergeProjectLayoutDocument(current, { structureSuggestion: strData.suggestion }) as LayoutJson
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "结构建议生成失败，请稍后重试");
    } finally {
      setSuggestingStructure(false);
    }
  }

  // 向导专用：确认结构 + 创建画板 + 退出向导
  async function handleWizardConfirmAndEnter() {
    if (!structureDraft || confirmingStructure) return;
    setConfirmingStructure(true);
    setActionError("");
    try {
      // 1. 保存确认后的结构
      const confirmedSuggestion: ProjectStructureSuggestion = {
        ...structureDraft,
        status: "confirmed",
        confirmedAt: new Date().toISOString(),
      };
      await saveStructureDraft(confirmedSuggestion);

      // 2. 创建画板组（无需 window.confirm，向导本身已有确认语义）
      const nextScene = buildProjectSceneFromStructureSuggestion({
        suggestion: confirmedSuggestion,
        assets,
        projectName: initialData.name,
        recognition: materialRecognition ?? undefined,
      });
      setScene(nextScene);
      lastSavedSceneRef.current = JSON.stringify(nextScene);
      // 持久化画板 + 标记 setup 已完成（退出重进将跳过向导）
      await persistScene(nextScene, true, { markSetupCompleted: true });

      // 3. 进入画布编辑模式
      setSetupMode(false);
      setLeftPanel("boards");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "创建画板失败，请稍后重试");
    } finally {
      setConfirmingStructure(false);
    }
  }

  async function handleRecognizeMaterials() {
    if (recognizingMaterials) return;

    setRecognizingMaterials(true);
    setActionError("");
    setActionMessage(null);

    try {
      await persistCurrentSceneForAction();
      const data = await parseJsonResponse<{ recognition: ProjectMaterialRecognition }>(
        await fetch(`/api/projects/${initialData.id}/recognition/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );

      setMaterialRecognition(data.recognition);
      setLayout((current) =>
        mergeProjectLayoutDocument(current, {
          materialRecognition: data.recognition,
        }) as LayoutJson
      );
      setActionMessage({ tone: "info", text: "轻识别已更新" });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "轻识别失败，请稍后重试");
    } finally {
      setRecognizingMaterials(false);
    }
  }

  async function handleRecognizeIncrementalMaterials() {
    if (recognizingIncremental || pendingRecognitionAssets.length === 0) return;

    setRecognizingIncremental(true);
    setActionError("");
    setActionMessage(null);

    try {
      await persistCurrentSceneForAction();
      const data = await parseJsonResponse<{ recognition: ProjectMaterialRecognition }>(
        await fetch(`/api/projects/${initialData.id}/recognition/incremental`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetIds: pendingRecognitionAssets.map((asset) => asset.id),
          }),
        })
      );

      setMaterialRecognition(data.recognition);
      setLayout((current) =>
        mergeProjectLayoutDocument(current, {
          materialRecognition: data.recognition,
        }) as LayoutJson
      );
      setActionMessage({
        tone: "info",
        text:
          data.recognition.lastIncrementalDiff?.summary ??
          "新增素材已纳入当前项目理解。",
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "增量识别失败，请稍后重试");
    } finally {
      setRecognizingIncremental(false);
    }
  }

  function mutateStructureDraft(
    updater: (current: ProjectStructureSuggestion) => ProjectStructureSuggestion
  ) {
    setStructureDraft((current) => {
      if (!current) return current;
      const next = updater(current);
      return {
        ...next,
        status: "draft",
        confirmedAt: null,
      };
    });
    setStructureSaveState("dirty");
  }

  function updateStructureGroup(
    groupId: string,
    patch: Partial<ProjectStructureGroup>
  ) {
    mutateStructureDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id === groupId ? { ...group, ...patch } : group
      ),
    }));
  }

  function updateStructureSection(
    groupId: string,
    sectionId: string,
    patch: Partial<ProjectStructureSection>
  ) {
    mutateStructureDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              sections: group.sections.map((section) =>
                section.id === sectionId ? { ...section, ...patch } : section
              ),
            }
      ),
    }));
  }

  function deleteStructureGroup(groupId: string) {
    mutateStructureDraft((current) => ({
      ...current,
      groups: current.groups.filter((group) => group.id !== groupId),
    }));
  }

  function mergeStructureGroupIntoPrevious(groupId: string) {
    mutateStructureDraft((current) => {
      const groupIndex = current.groups.findIndex((group) => group.id === groupId);
      if (groupIndex <= 0) return current;
      const previous = current.groups[groupIndex - 1];
      const target = current.groups[groupIndex];
      return {
        ...current,
        groups: current.groups.flatMap((group, index) => {
          if (index === groupIndex - 1) {
            return [
              {
                ...previous,
                sections: [...previous.sections, ...target.sections],
              },
            ];
          }
          if (index === groupIndex) return [];
          return [group];
        }),
      };
    });
  }

  function addStructureGroup() {
    mutateStructureDraft((current) => ({
      ...current,
      groups: [
        ...current.groups,
        {
          id: newStructureId("group"),
          label: `新分组 ${current.groups.length + 1}`,
          rationale: "补充这一组要讲清的主线。",
          narrativeRole: "承接",
          sections: [
            {
              id: newStructureId("section"),
              title: "新小节",
              purpose: "说明这个小节要承载的信息。",
              recommendedContent: [],
              suggestedAssets: [],
            },
          ],
        },
      ],
    }));
  }

  function addStructureSection(groupId: string) {
    mutateStructureDraft((current) => ({
      ...current,
      groups: current.groups.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              sections: [
                ...group.sections,
                {
                  id: newStructureId("section"),
                  title: `小节 ${group.sections.length + 1}`,
                  purpose: "说明这个小节要讲什么。",
                  recommendedContent: [],
                  suggestedAssets: [],
                },
              ],
            }
      ),
    }));
  }

  function deleteStructureSection(groupId: string, sectionId: string) {
    mutateStructureDraft((current) => ({
      ...current,
      groups: current.groups
        .map((group) =>
          group.id !== groupId
            ? group
            : {
                ...group,
                sections: group.sections.filter((section) => section.id !== sectionId),
              }
        )
        .filter((group) => group.sections.length > 0),
    }));
  }

  async function saveStructureDraft(nextSuggestion?: ProjectStructureSuggestion) {
    const suggestion = nextSuggestion ?? structureDraft;
    if (!suggestion) return;

    setStructureSaveState("saving");
    setActionError("");
    try {
      const data = await parseJsonResponse<{ suggestion: ProjectStructureSuggestion }>(
        await fetch(`/api/projects/${initialData.id}/structure`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suggestion }),
        })
      );
      setStructureSuggestion(data.suggestion);
      setStructureDraft(data.suggestion);
      setLayout((current) =>
        mergeProjectLayoutDocument(current, {
          structureSuggestion: data.suggestion,
        }) as LayoutJson
      );
      setStructureSaveState("saved");
      return data.suggestion;
    } catch (error) {
      setStructureSaveState("error");
      setActionMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "结构保存失败，请稍后重试",
      });
      throw error;
    }
  }

  async function confirmStructureDraft() {
    if (!structureDraft) return;
    const confirmedSuggestion: ProjectStructureSuggestion = {
      ...structureDraft,
      status: "confirmed",
      confirmedAt: new Date().toISOString(),
    };
    await saveStructureDraft(confirmedSuggestion);
    setActionMessage({ tone: "info", text: "当前结构已确认，可继续按结构落板。" });
  }

  async function applyStructureToBoards() {
    if (!structureDraft || structureDraft.groups.length === 0 || applyingStructure) return;

    if (structureDraft.status !== "confirmed") {
      setActionMessage({
        tone: "error",
        text: "请先确认当前结构，再按结构创建画板组。",
      });
      return;
    }

    const shouldContinue = window.confirm(
      "这会按当前确认结构重建画板列表，并替换当前画板内容。确认继续吗？"
    );
    if (!shouldContinue) return;

    setApplyingStructure(true);
    setActionError("");
    setActionMessage(null);

    try {
      const nextScene = buildProjectSceneFromStructureSuggestion({
        suggestion: structureDraft,
        assets,
        projectName: initialData.name,
        recognition: materialRecognition ?? undefined,
      });

      setScene(nextScene);
      setLeftPanel("boards");
      lastSavedSceneRef.current = JSON.stringify(nextScene);
      await persistScene(nextScene, true);
      setActionMessage({ tone: "info", text: "已按当前结构创建画板组。" });
    } catch (error) {
      setActionMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "结构落板失败，请稍后重试",
      });
    } finally {
      setApplyingStructure(false);
    }
  }

  async function handleGenerateLayout() {
    if (!activeBoard || generating) return;
    setGenerating(true);
    setActionError("");
    setActionMessage(null);

    try {
      // 项目准备 阶段完成后由骨架流程写入 packageMode；若尚未写入，默认走 DEEP。
      const resolvedMode = packageMode ?? "DEEP";

      await persistCurrentSceneForAction();
      if (!packageMode) {
        const stageData = await parseJsonResponse<{ packageMode?: string; stage?: string }>(
          await fetch(`/api/projects/${initialData.id}/stage`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageMode: resolvedMode, preserveStage: true }),
          })
        );

        if (stageData.packageMode) {
          setPackageMode(stageData.packageMode);
        }
        if (stageData.stage) {
          setStage(stageData.stage);
        }
      }

      await ensureLayoutStage(resolvedMode);

      const data = await parseJsonResponse<{
        layoutJson: LayoutJson;
        reused?: boolean;
      }>(
        await fetch(`/api/projects/${initialData.id}/layout/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleSelection: getResolvedStyleSelection(),
            generationScope: normalizedGenerationScope,
          }),
        })
      );

      const nextLayout = data.layoutJson;
      setLayout(nextLayout);
      setStructureSuggestion(nextLayout.structureSuggestion ?? structureSuggestion);
      if (nextLayout.editorScene) {
        const nextScene = resolveProjectEditorScene(nextLayout, {
          assets,
          projectName: initialData.name,
        });
        setScene(nextScene);
        lastSavedSceneRef.current = JSON.stringify(nextScene);
      } else {
        setScene((current) => markBoardsAfterGeneration(current, generationBoardIds));
      }

      if (data.reused) {
        setActionMessage({ tone: "info", text: "命中可复用排版结果，本次没有额外计次。" });
      } else {
        setActionMessage({ tone: "info", text: "排版建议已生成，可继续结合单画板细调。" });
      }
      setGenerateOpen(false);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "生成排版失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!contextMenu.open) return;
    const handler = () => closeContextMenu();
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [contextMenu.open]);

  useEffect(() => {
    if (!shapeMenuOpen) return;
    const handler = () => setShapeMenuOpen(false);
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [shapeMenuOpen]);

  useEffect(() => {
    if (!actionMessage || actionMessage.tone === "error") return;
    const timeout = window.setTimeout(() => setActionMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  useEffect(() => {
    setStructureDraft(structureSuggestion);
    setStructureSaveState("saved");
  }, [structureSuggestion]);

  useEffect(() => {
    if (!selectedImageAsset) return;
    const meta = resolveProjectAssetMeta(selectedImageAsset.metaJson);
    setImageDetailsDraft({
      title: selectedImageAsset.title ?? "",
      note: meta.note ?? "",
      roleTag: meta.roleTag ?? "none",
    });
  }, [selectedImageAsset]);

  function scheduleFitSurface(explicitScale?: number) {
    if (fitFrameRef.current !== null) {
      cancelAnimationFrame(fitFrameRef.current);
    }
    fitFrameRef.current = requestAnimationFrame(() => {
      fitFrameRef.current = requestAnimationFrame(() => {
        fitFrameRef.current = null;
        fitSurface(explicitScale);
      });
    });
  }


  function updateSelectionSummary(canvas: FabricCanvas | null) {
    if (!canvas) {
      setActiveMeta({ kind: "none" });
      return;
    }

    const activeObjects = canvas.getActiveObjects() as FabricSceneObject[];
    refreshLayerState(canvas);
    if (activeObjects.length === 0) {
      setActiveMeta({ kind: "none" });
      return;
    }

    if (activeObjects.length > 1) {
      setActiveMeta({ kind: "multi", count: activeObjects.length });
      return;
    }

    const current = activeObjects[0];
    const data = current.data;
    const scaledW = typeof current.getScaledWidth === "function" ? current.getScaledWidth() : (current.width ?? 0);
    const scaledH = typeof current.getScaledHeight === "function" ? current.getScaledHeight() : (current.height ?? 0);
    const objX = current.left ?? 0;
    const objY = current.top ?? 0;

    if (data?.nodeType === "image") {
      const frame = getImageFrameMeta(current);
      setActiveMeta({
        kind: "image",
        id: data.nodeId ?? "image",
        assetId: data.assetId ?? null,
        fit: frame.fit,
        crop: getImageCropMeta(current),
        opacity: typeof current.opacity === "number" ? current.opacity : 1,
        x: Math.round(frame.frameX),
        y: Math.round(frame.frameY),
        width: Math.round(frame.frameWidth),
        height: Math.round(frame.frameHeight),
      });
      return;
    }

    if (data?.nodeType === "text" || current.type === "textbox") {
      const textbox = current as unknown as Textbox;
      const tb = textbox as unknown as Record<string, unknown>;
      setActiveMeta({
        kind: "text",
        id: data?.nodeId ?? "text",
        text: textbox.text ?? "",
        fontFamily: String(tb.fontFamily ?? "Inter"),
        fontSize: Number(textbox.fontSize) || 32,
        fontWeight: Number(textbox.fontWeight) || 500,
        lineHeight: Number(tb.lineHeight) || 1.3,
        textAlign: (tb.textAlign as "left" | "center" | "right") ?? "left",
        color: String(textbox.fill ?? "#111111"),
        opacity: typeof textbox.opacity === "number" ? textbox.opacity : 1,
        x: Math.round(objX),
        y: Math.round(objY),
        width: Math.round(scaledW),
        height: Math.round(scaledH),
      });
      return;
    }

    if (data?.nodeType === "shape") {
      const shapeObj = current as unknown as Record<string, unknown>;
      const shapeRx = data.shapeType === "rect" || data.shapeType === "square"
        ? (Number(shapeObj.rx) || 0)
        : 0;
      const colorValue = fabricFillToColorValue(current.fill);
      const strokeRaw = typeof current.stroke === "string" ? current.stroke : null;
      const strokeParsed = strokeRaw ? parseColorString(strokeRaw) : { hex: "#000000", alpha: 1 };
      setActiveMeta({
        kind: "shape",
        id: data.nodeId ?? "shape",
        shape: data.shapeType ?? "rect",
        fill: colorValue.mode === "solid" ? colorValue.hex : "#111111",
        fillAlpha: colorValue.mode === "solid" ? colorValue.alpha : 1,
        gradient: colorValue.mode === "gradient" ? colorValue.gradient : null,
        stroke: strokeParsed.hex,
        strokeAlpha: strokeParsed.alpha,
        strokeWidth: typeof current.strokeWidth === "number" ? current.strokeWidth : 0,
        opacity: typeof current.opacity === "number" ? current.opacity : 1,
        rx: shapeRx,
        x: Math.round(objX),
        y: Math.round(objY),
        width: Math.round(scaledW),
        height: Math.round(scaledH),
      });
      return;
    }

    setActiveMeta({ kind: "none" });
  }

  // Single fit entry point. The DOM owns layout: the surface div has explicit width/height
  // and is centered by viewport flexbox. Fabric only sizes its drawing buffer to match
  // and applies a pure-zoom viewport transform with origin (0, 0). No tx/ty math.
  function fitSurface(explicitScale?: number) {
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !viewport) return;

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (vw <= 0 || vh <= 0) return;

    let scale: number;
    if (explicitScale !== undefined) {
      scale = clamp(explicitScale, 0.1, 4);
    } else {
      const availW = Math.max(vw - SURFACE_FIT_PADDING * 2, 120);
      const availH = Math.max(vh - SURFACE_FIT_PADDING * 2, 120);
      scale = clamp(
        Math.min(availW / PROJECT_BOARD_WIDTH, availH / PROJECT_BOARD_HEIGHT),
        0.1,
        4,
      );
    }

    const renderW = Math.round(PROJECT_BOARD_WIDTH * scale);
    const renderH = Math.round(PROJECT_BOARD_HEIGHT * scale);

    setSurfaceScale(scale);
    canvas.setDimensions({ width: renderW, height: renderH });
    canvas.setZoom(scale);
    canvas.calcOffset();
    canvas.requestRenderAll();
  }

  function applyObjectChrome(target: FabricSceneObject) {
    target.set({
      borderColor: "rgba(255, 255, 255, 0.92)",
      borderScaleFactor: 1.2,
      borderOpacityWhenMoving: 0.95,
      cornerColor: "#fafafa",
      cornerStrokeColor: "#171717",
      transparentCorners: false,
      cornerStyle: "circle",
      cornerSize: 11,
      padding: 3,
      lockRotation: true,
    });
    // 隐藏旋转手柄（lockRotation=true 但 mtr 仍会显示，隐藏避免误解）
    target.setControlsVisibility({ mtr: false });
  }

  function applyTextChrome(target: FabricSceneObject) {
    applyObjectChrome(target);
    // 文本禁止竖向拉伸：隐藏上下中间手柄，锁定 Y 轴缩放
    target.set({ lockScalingY: true });
    target.setControlsVisibility({ mt: false, mb: false });
  }

  function serializeBoardFromCanvas(canvas: FabricCanvas, board: ProjectBoard): ProjectBoard {
    const objects = canvas.getObjects() as FabricSceneObject[];

    const nextNodes = objects.reduce<ProjectBoardNode[]>((acc, object, index) => {
      const data = object.data;
      const left = object.left ?? 0;
      const top = object.top ?? 0;
      const width = typeof object.getScaledWidth === "function" ? object.getScaledWidth() : object.width ?? 0;
      const height =
        typeof object.getScaledHeight === "function" ? object.getScaledHeight() : object.height ?? 0;

      if (data?.nodeType === "image" && data.assetId) {
        const frame = getImageFrameMeta(object);
        const asset = assetMap.get(data.assetId);
        const meta = asset ? resolveProjectAssetMeta(asset.metaJson) : { note: null, roleTag: null };
        acc.push(
          createProjectImageNode(data.assetId, {
            id: data.nodeId ?? newNodeId("image"),
            x: Math.round(frame.frameX),
            y: Math.round(frame.frameY),
            width: Math.round(frame.frameWidth),
            height: Math.round(frame.frameHeight),
            fit: frame.fit,
            crop: getImageCropMeta(object),
            note: meta.note ?? null,
            roleTag: meta.roleTag ?? null,
            zIndex: index + 1,
          })
        );
        return acc;
      }

      if (data?.nodeType === "text") {
        const textbox = object as unknown as Textbox;
        const tb = textbox as unknown as Record<string, unknown>;
        acc.push(
          createProjectTextNode({
            id: data.nodeId ?? newNodeId("text"),
            text: textbox.text ?? "文本",
            role: data.role ?? "body",
            x: Math.round(left),
            y: Math.round(top),
            width: Math.round(width),
            height: Math.round(height),
            fontSize: Number(textbox.fontSize) || 32,
            fontWeight: Number(textbox.fontWeight) || 500,
            fontFamily: String(tb.fontFamily ?? "Inter"),
            lineHeight: Number(textbox.lineHeight) || 1.3,
            align: (textbox.textAlign as ProjectBoardTextNode["align"]) ?? "left",
            color: String(textbox.fill ?? "#111111"),
            zIndex: index + 1,
          })
        );
        return acc;
      }

      if (data?.nodeType === "shape") {
        const shapeObjRaw = object as unknown as Record<string, unknown>;
        const shapeType = data.shapeType ?? "rect";
        const serializedRx = (shapeType === "rect" || shapeType === "square")
          ? (Number(shapeObjRaw.rx) || 0)
          : 0;
        const colorValue = fabricFillToColorValue(object.fill);
        acc.push(
          createProjectShapeNode(shapeType, {
            id: data.nodeId ?? newNodeId("shape"),
            x: Math.round(left),
            y: Math.round(top),
            width: Math.round(width),
            height: Math.round(height),
            fill: colorValue.mode === "solid" ? hexToRgba(colorValue.hex, colorValue.alpha) : "#111111",
            gradient: colorValue.mode === "gradient" ? colorValue.gradient : null,
            stroke: typeof object.stroke === "string" ? object.stroke : null,
            strokeWidth: typeof object.strokeWidth === "number" ? object.strokeWidth : 0,
            opacity: typeof object.opacity === "number" ? object.opacity : 1,
            rx: serializedRx,
            zIndex: index + 1,
          })
        );
        return acc;
      }

      return acc;
    }, []);

    const thumbnailAssetId =
      nextNodes.find((node): node is ProjectBoardImageNode => node.type === "image")?.assetId ?? null;

    return {
      ...board,
      frame: { ...board.frame, background: "#ffffff" },
      status: nextNodes.length > 0 ? "draft" : "empty",
      thumbnailAssetId,
      nodes: nextNodes,
    };
  }

  function syncActiveBoardFromCanvas() {
    const canvas = canvasRef.current;
    const board = activeBoard;
    if (!canvas || !board || hydratingRef.current) return;

    const nextBoard = serializeBoardFromCanvas(canvas, board);
    setScene((current) =>
      normalizeProjectEditorScene({
        ...current,
        boards: current.boards.map((item) => (item.id === board.id ? nextBoard : item)),
      })
    );
  }

  const loadBoardIntoCanvas = useEffectEvent(async (board: ProjectBoard) => {
    const canvas = canvasRef.current;
    const fabric = fabricRef.current;
    if (!canvas || !fabric) return;

    hydratingRef.current = true;
    boardLoadTokenRef.current += 1;
    const token = boardLoadTokenRef.current;

    canvas.clear();

    for (const node of board.nodes.sort((a, b) => a.zIndex - b.zIndex)) {
      if (node.type === "text") {
        const textbox = new fabric.Textbox(node.text, {
          left: node.x,
          top: node.y,
          width: node.width,
          fontSize: node.fontSize,
          fontWeight: String(node.fontWeight),
          fontFamily: node.fontFamily ?? "Inter",
          lineHeight: node.lineHeight,
          textAlign: node.align,
          fill: node.color,
          editable: true,
        }) as unknown as FabricSceneObject;
        textbox.data = {
          nodeId: node.id,
          nodeType: "text",
          role: node.role,
        };
        applyTextChrome(textbox);
        canvas.add(textbox);
        continue;
      }

      if (node.type === "shape") {
        let shape: FabricSceneObject | null = null;
        // Resolve fill: prefer gradient over solid if present
        let resolvedFill: unknown = node.fill;
        if (node.gradient) {
          const opts = gradientConfigToFabricOptions(node.gradient);
          resolvedFill = new (fabric as unknown as Record<string, new (o: unknown) => unknown>).Gradient(opts);
        }
        const base = {
          left: node.x,
          top: node.y,
          fill: resolvedFill as string,
          stroke: node.stroke ?? undefined,
          strokeWidth: node.strokeWidth,
          opacity: node.opacity,
        };

        if (node.shape === "circle") {
          shape = new fabric.Ellipse({
            ...base,
            rx: node.width / 2,
            ry: node.height / 2,
          }) as unknown as FabricSceneObject;
        } else if (node.shape === "triangle") {
          shape = new fabric.Triangle({
            ...base,
            width: node.width,
            height: node.height,
          }) as unknown as FabricSceneObject;
        } else if (node.shape === "line") {
          shape = new fabric.Line([0, 0, node.width, 0], {
            ...base,
            fill: undefined,
            stroke: node.stroke ?? "#111111",
            strokeWidth: node.strokeWidth || 4,
            strokeLineCap: "round",
            strokeUniform: true,
          }) as unknown as FabricSceneObject;
        } else {
          const cornerR = node.rx ?? 0;
          shape = new fabric.Rect({
            ...base,
            width: node.width,
            height: node.height,
            rx: cornerR,
            ry: cornerR,
          }) as unknown as FabricSceneObject;
        }

        shape.data = {
          nodeId: node.id,
          nodeType: "shape",
          shapeType: node.shape,
        };
        applyObjectChrome(shape);
        canvas.add(shape);
        continue;
      }

      const asset = assetMap.get(node.assetId);
      if (!asset) continue;

      const image = (await fabric.FabricImage.fromURL(buildPrivateBlobProxyUrl(asset.imageUrl))) as FabricSceneObject;
      if (token !== boardLoadTokenRef.current) return;

      image.data = {
        nodeId: node.id,
        nodeType: "image",
        assetId: node.assetId,
        fit: node.fit,
        frameWidth: node.width,
        frameHeight: node.height,
        crop: node.crop,
      };
      applyImagePresentation(image, {
        fit: node.fit,
        frameWidth: node.width,
        frameHeight: node.height,
        frameX: node.x,
        frameY: node.y,
        crop: node.crop,
      });
      applyObjectChrome(image);
      canvas.add(image);
    }

    canvas.discardActiveObject();
    updateSelectionSummary(canvas);
    hydratingRef.current = false;
    scheduleFitSurface();
    scheduleThumbnailCapture();
  });

  const handleCanvasResize = useEffectEvent(() => {
    scheduleFitSurface();
  });

  const handleCanvasSelectionChange = useEffectEvent((canvas: FabricCanvas) => {
    updateSelectionSummary(canvas);
  });

  const handleCanvasMutation = useEffectEvent((
    canvas: FabricCanvas,
    target?: FabricSceneObject
  ) => {
    if (target?.data?.nodeType === "image" && target.type !== "activeSelection") {
      normalizeImageObjectAfterTransform(target);
    }
    syncActiveBoardFromCanvas();
    refreshLayerState(canvas);
    scheduleThumbnailCapture();
  });

  const handleCanvasContextMenu = useEffectEvent((
    canvas: FabricCanvas,
    event: { e: globalThis.MouseEvent; target?: FabricObject }
  ) => {
    const nativeEvent = event.e;
    if (nativeEvent.button !== 2) return;
    nativeEvent.preventDefault();
    nativeEvent.stopPropagation();
    if (!isEditableCanvasTarget(event.target as FabricObject | undefined)) {
      closeContextMenu();
      return;
    }
    canvas.setActiveObject(event.target as FabricObject);
    updateSelectionSummary(canvas);
    openContextMenuAt(nativeEvent.clientX, nativeEvent.clientY);
  });

  useEffect(() => {
    // 只有进入画布模式才挂载（setupMode=true 时 viewportRef 不在 DOM 中）。
    if (setupMode) return;
    if (canvasRef.current) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function mountCanvas() {
      // 等到 viewport DOM 已挂载且有实际布局尺寸才继续。
      let attempts = 0;
      while (
        !disposed &&
        (!hostRef.current ||
          !viewportRef.current ||
          viewportRef.current.clientWidth <= 0 ||
          viewportRef.current.clientHeight <= 0) &&
        attempts < 30
      ) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        attempts += 1;
      }
      if (disposed || !hostRef.current || !viewportRef.current) return;

      const fabric = await import("fabric");
      if (disposed || !hostRef.current || !viewportRef.current) return;

      fabricRef.current = fabric;
      const vp = viewportRef.current;

      const vw = vp.clientWidth || 800;
      const vh = vp.clientHeight || 600;
      const initScale = clamp(
        Math.min(
          (vw - SURFACE_FIT_PADDING * 2) / PROJECT_BOARD_WIDTH,
          (vh - SURFACE_FIT_PADDING * 2) / PROJECT_BOARD_HEIGHT,
        ),
        0.1,
        4,
      );
      const initRenderW = Math.round(PROJECT_BOARD_WIDTH * initScale);
      const initRenderH = Math.round(PROJECT_BOARD_HEIGHT * initScale);

      const canvas = new fabric.Canvas(hostRef.current, {
        width: initRenderW,
        height: initRenderH,
        preserveObjectStacking: true,
        selection: true,
        backgroundColor: "#ffffff",
      });
      canvasRef.current = canvas;
      setSurfaceScale(initScale);
      canvas.setZoom(initScale);

      const observer = new ResizeObserver(() => handleCanvasResize());
      observer.observe(vp);

      canvas.on("selection:created", () => handleCanvasSelectionChange(canvas));
      canvas.on("selection:updated", () => handleCanvasSelectionChange(canvas));
      canvas.on("selection:cleared", () => handleCanvasSelectionChange(canvas));
      canvas.on("object:modified", (event) => {
        const target = event.target as FabricSceneObject | undefined;
        handleCanvasMutation(canvas, target);
      });
      canvas.on("object:added", () => {
        handleCanvasMutation(canvas);
      });
      canvas.on("object:removed", () => {
        handleCanvasMutation(canvas);
      });
      canvas.on("text:changed", () => {
        handleCanvasMutation(canvas);
      });
      canvas.on("mouse:down", (event) => {
        handleCanvasContextMenu(canvas, {
          e: event.e as globalThis.MouseEvent,
          target: event.target as FabricObject | undefined,
        });
      });

      setCanvasReady(true);
      // 挂载完立刻 fit 一次，确保首帧 zoom/size 与 DOM 同步。
      fitSurface();

      cleanup = () => {
        if (fitFrameRef.current !== null) {
          cancelAnimationFrame(fitFrameRef.current);
          fitFrameRef.current = null;
        }
        if (thumbnailCaptureRef.current !== null) {
          window.clearTimeout(thumbnailCaptureRef.current);
          thumbnailCaptureRef.current = null;
        }
        observer.disconnect();
        canvas.dispose();
        canvasRef.current = null;
        fabricRef.current = null;
        setCanvasReady(false);
      };
    }

    void mountCanvas();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [
    handleCanvasContextMenu,
    handleCanvasMutation,
    handleCanvasResize,
    handleCanvasSelectionChange,
    setupMode,
  ]);

  useEffect(() => {
    // 加载自托管字体（得意黑 + 阿里普惠体）
    const fonts = [
      { family: "Smiley Sans", url: SMILEY_SANS_URL },
      { family: "Alibaba PuHuiTi", url: ALIBABA_PUHUITI_URL },
    ];
    fonts.forEach(({ family, url }) => {
      if (document.fonts.check(`16px "${family}"`)) return;
      const face = new FontFace(family, `url(${url})`, { display: "swap" });
      face.load().then((loaded) => {
        document.fonts.add(loaded);
      }).catch(() => {
        // 网络不通时静默失败，不影响编辑器使用
      });
    });
  }, []);

  useEffect(() => {
    if (!canvasReady || !activeBoard) return;
    void loadBoardIntoCanvas(activeBoard);
  }, [activeBoard, canvasReady, loadBoardIntoCanvas]);

  async function cloneActiveObject() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const activeObject = canvas.getActiveObject() as FabricObject | ActiveSelection | null;
    if (!activeObject) return null;
    const clone = await activeObject.clone(["data"]);
    clipboardRef.current = clone;
    return clone;
  }

  function reseedObjectData(object: FabricSceneObject) {
    if (!object.data?.nodeType) return;
    object.data = {
      ...object.data,
      nodeId: newNodeId(object.data.nodeType),
    };
  }

  async function pasteClipboard() {
    const canvas = canvasRef.current;
    if (!canvas || !clipboardRef.current) return;

    const clone = (await clipboardRef.current.clone(["data"])) as FabricObject | ActiveSelection;
    canvas.discardActiveObject();

    if (clone.type === "activeSelection") {
      const selection = clone as ActiveSelection;
      selection.canvas = canvas;
      selection.forEachObject((object) => {
        const typed = object as FabricSceneObject;
        reseedObjectData(typed);
        typed.set({
          left: (typed.left ?? 0) + 28,
          top: (typed.top ?? 0) + 28,
        });
        canvas.add(typed);
      });
      selection.setCoords();
      canvas.setActiveObject(selection);
    } else {
      const typed = clone as FabricSceneObject;
      reseedObjectData(typed);
      typed.set({
        left: (typed.left ?? 0) + 28,
        top: (typed.top ?? 0) + 28,
      });
      canvas.add(typed);
      canvas.setActiveObject(typed);
    }

    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
  }

  async function duplicateSelection() {
    const cloned = await cloneActiveObject();
    if (!cloned) return;
    await pasteClipboard();
  }

  async function addTextObject() {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;

    const textbox = new fabric.Textbox("新文本", {
      left: 140,
      top: 140,
      width: 520,
      fontSize: 64,
      fontWeight: "700",
      fontFamily: "Inter",
      fill: "#111111",
      editable: true,
    }) as unknown as FabricSceneObject;
    textbox.data = {
      nodeId: newNodeId("text"),
      nodeType: "text",
      role: "title",
    };
    applyTextChrome(textbox);
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
  }

  async function addShapeObject(shape: ProjectShapeType) {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    if (!fabric || !canvas) return;

    const base = {
      left: 220,
      top: 180,
      fill: "#111111",
      stroke: undefined,
      strokeWidth: 0,
      opacity: 1,
    };

    let object: FabricSceneObject | null = null;

    if (shape === "circle") {
      object = new fabric.Ellipse({
        ...base,
        rx: 140,
        ry: 140,
      }) as unknown as FabricSceneObject;
    } else if (shape === "triangle") {
      object = new fabric.Triangle({
        ...base,
        width: 280,
        height: 240,
      }) as unknown as FabricSceneObject;
    } else if (shape === "line") {
      object = new fabric.Line([0, 0, 320, 0], {
        ...base,
        fill: undefined,
        stroke: "#111111",
        strokeWidth: 6,
        strokeLineCap: "round",
        strokeUniform: true,
      }) as unknown as FabricSceneObject;
    } else {
      const size = shape === "square" ? 240 : 320;
      object = new fabric.Rect({
        ...base,
        width: size,
        height: shape === "square" ? size : 220,
      }) as unknown as FabricSceneObject;
    }

    object.data = {
      nodeId: newNodeId("shape"),
      nodeType: "shape",
      shapeType: shape,
    };
    applyObjectChrome(object);
    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
  }

  async function addAssetToCanvas(assetId: string) {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    const asset = assetMap.get(assetId);
    if (!fabric || !canvas || !asset) return;

    const image = (await fabric.FabricImage.fromURL(buildPrivateBlobProxyUrl(asset.imageUrl))) as FabricSceneObject;
    const naturalWidth = image.width || 1280;
    const naturalHeight = image.height || 720;
    const scale = Math.min(640 / naturalWidth, 420 / naturalHeight, 1);

    image.set({
      left: 180,
      top: 180,
      scaleX: scale,
      scaleY: scale,
    });
    image.data = {
      nodeId: newNodeId("image"),
      nodeType: "image",
      assetId,
      fit: "fill",
      frameWidth: naturalWidth * scale,
      frameHeight: naturalHeight * scale,
      crop: { x: 0.5, y: 0.5, scale: 1 },
    };
    applyObjectChrome(image);
    canvas.add(image);
    canvas.setActiveObject(image);
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
    setActionMessage({ tone: "info", text: "图片已插入当前画板" });
  }

  function updateActiveImageFit(nextFit: "fill" | "fit") {
    const canvas = canvasRef.current;
    const activeObject = canvas?.getActiveObject() as FabricSceneObject | null;
    if (!canvas || !activeObject || activeObject.type === "activeSelection") return;
    if (activeObject.data?.nodeType !== "image") return;

    const frame = getImageFrameMeta(activeObject);
    applyImagePresentation(activeObject, {
      fit: nextFit,
      frameWidth: frame.frameWidth,
      frameHeight: frame.frameHeight,
      frameX: frame.frameX,
      frameY: frame.frameY,
      crop: getImageCropMeta(activeObject),
    });
    activeObject.setCoords();
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
  }

  function updateActiveImageCrop(
    patch: Partial<{
      x: number;
      y: number;
      scale: number;
    }>
  ) {
    const canvas = canvasRef.current;
    const activeObject = canvas?.getActiveObject() as FabricSceneObject | null;
    if (!canvas || !activeObject || activeObject.type === "activeSelection") return;
    if (activeObject.data?.nodeType !== "image") return;

    const frame = getImageFrameMeta(activeObject);
    const crop = getImageCropMeta(activeObject);
    applyImagePresentation(activeObject, {
      fit: frame.fit,
      frameWidth: frame.frameWidth,
      frameHeight: frame.frameHeight,
      frameX: frame.frameX,
      frameY: frame.frameY,
      crop: {
        x: patch.x ?? crop.x,
        y: patch.y ?? crop.y,
        scale: patch.scale ?? crop.scale,
      },
    });
    activeObject.setCoords();
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
  }

  async function replaceActiveImageAsset(nextAssetId: string) {
    const fabric = fabricRef.current;
    const canvas = canvasRef.current;
    const activeObject = canvas?.getActiveObject() as FabricSceneObject | null;
    const nextAsset = assetMap.get(nextAssetId);
    if (!fabric || !canvas || !activeObject || !nextAsset) return;
    if (activeObject.type === "activeSelection" || activeObject.data?.nodeType !== "image") return;
    if (activeObject.data.assetId === nextAssetId) return;

    const frame = getImageFrameMeta(activeObject);
    const objects = canvas.getObjects();
    const currentIndex = objects.indexOf(activeObject);
    const replacement = (await fabric.FabricImage.fromURL(
      buildPrivateBlobProxyUrl(nextAsset.imageUrl)
    )) as FabricSceneObject;

    replacement.data = {
      ...activeObject.data,
      assetId: nextAssetId,
      fit: frame.fit,
      frameWidth: frame.frameWidth,
      frameHeight: frame.frameHeight,
      crop: getImageCropMeta(activeObject),
    };
    applyImagePresentation(replacement, {
      fit: frame.fit,
      frameWidth: frame.frameWidth,
      frameHeight: frame.frameHeight,
      frameX: frame.frameX,
      frameY: frame.frameY,
      crop: getImageCropMeta(activeObject),
    });
    applyObjectChrome(replacement);

    canvas.remove(activeObject);
    canvas.add(replacement);
    if (currentIndex >= 0) {
      const mover = replacement as unknown as { moveTo: (value: number) => void };
      mover.moveTo(currentIndex);
    }
    canvas.setActiveObject(replacement);
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
    setActionMessage({ tone: "info", text: "已替换当前图片素材" });
  }

  async function refreshAssets() {
    const response = await parseJsonResponse<{
      assets: ProjectEditorInitialData["assets"];
    }>(await fetch(`/api/projects/${initialData.id}/assets`));
    setAssets(response.assets);
    return response.assets;
  }

  async function handleUploadAssets(files: File[]) {
    if (files.length === 0) return;
    const existingIds = new Set(assets.map((asset) => asset.id));
    setUploadingAssets(true);
    setActionMessage(null);

    try {
      setLeftPanel("assets");
      const uploadedFiles = await uploadFilesFromBrowser({
        files,
        folder: "project-assets",
        kind: "project-image",
      });

      await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/assets/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: uploadedFiles }),
        })
      );

      const nextAssets = await refreshAssets();
      const newlyUploaded = nextAssets.filter((asset) => !existingIds.has(asset.id));
      // 排版阶段上传的素材不自动重跑 AI 理解，避免影响已生成的结构建议
      const layoutNote = !setupMode
        ? "（不影响已生成的结构建议，如需让 AI 重新理解项目请回到项目准备）"
        : "";
      if (newlyUploaded.length === 1) {
        await addAssetToCanvas(newlyUploaded[0].id);
        setActionMessage({ tone: "info", text: `图片已上传并插入当前画板${layoutNote}` });
      } else {
        setActionMessage({
          tone: "info",
          text: `已上传 ${newlyUploaded.length || files.length} 张图片，可继续插入到当前画板${layoutNote}`,
        });
      }
    } catch (error) {
      setActionMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "图片上传失败，请稍后重试",
      });
    } finally {
      setUploadingAssets(false);
    }
  }

  function handleOpenAssetUpload() {
    assetUploadRef.current?.click();
  }

  async function handleAssetFilesPicked(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    await handleUploadAssets(selectedFiles);
    if (assetUploadRef.current) {
      assetUploadRef.current.value = "";
    }
  }

  async function saveSelectedImageDetails() {
    if (!selectedImageAsset || assetDetailsSaving) return;

    setAssetDetailsSaving(true);
    try {
      const response = await parseJsonResponse<{
        asset: ProjectEditorInitialData["assets"][number];
      }>(
        await fetch(`/api/projects/${initialData.id}/assets/${selectedImageAsset.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: imageDetailsDraft.title.trim() || null,
            note: imageDetailsDraft.note.trim() || null,
            roleTag: imageDetailsDraft.roleTag === "none" ? null : imageDetailsDraft.roleTag,
          }),
        })
      );

      setAssets((current) =>
        current.map((asset) => (asset.id === response.asset.id ? response.asset : asset))
      );
      setActionMessage({ tone: "info", text: "图片信息已保存" });
    } catch (error) {
      setActionMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "保存图片信息失败，请稍后重试",
      });
    } finally {
      setAssetDetailsSaving(false);
    }
  }

  async function handleAssetInlineUpdate(
    assetId: string,
    patch: { title?: string | null; note?: string | null }
  ) {
    try {
      const response = await parseJsonResponse<{
        asset: ProjectEditorInitialData["assets"][number];
      }>(
        await fetch(`/api/projects/${initialData.id}/assets/${assetId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
      );
      setAssets((current) =>
        current.map((asset) => (asset.id === response.asset.id ? response.asset : asset))
      );
    } catch (error) {
      setActionMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "保存素材信息失败，请稍后重试",
      });
    }
  }

  async function handleRenameAsset(assetId: string, title: string) {
    await handleAssetInlineUpdate(assetId, { title: title.trim() || null });
  }

  async function handleUpdateAssetNote(assetId: string, note: string) {
    await handleAssetInlineUpdate(assetId, { note: note.trim() || null });
  }

  async function handleDeleteAsset(assetId: string) {
    try {
      const response = await fetch(
        `/api/projects/${initialData.id}/assets/${assetId}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || "删除素材失败");
      }
      await refreshAssets();
      setActionMessage({ tone: "info", text: "素材已删除" });
    } catch (error) {
      setActionMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "删除素材失败，请稍后重试",
      });
    }
  }

  function deleteSelection() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    activeObjects.forEach((object) => canvas.remove(object));
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
  }

  async function handleContextAction(action: string) {
    if (action === "copy") {
      await cloneActiveObject();
      return;
    }
    if (action === "paste") {
      await pasteClipboard();
      return;
    }
    if (action === "duplicate") {
      await duplicateSelection();
      return;
    }
    if (action === "delete") {
      deleteSelection();
      return;
    }
    if (action === "front") {
      arrangeActiveObject("front");
      return;
    }
    if (action === "back") {
      arrangeActiveObject("back");
      return;
    }
    if (action === "forward") {
      arrangeActiveObject("forward");
      return;
    }
    if (action === "backward") {
      arrangeActiveObject("backward");
      return;
    }
    if (action === "layers-panel") {
      setLeftPanel("layers");
    }
  }

  const handleCanvasKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName?.toLowerCase();
    const isTyping =
      tagName === "input" ||
      tagName === "textarea" ||
      target?.isContentEditable === true;
    if (isTyping) return;

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
      event.preventDefault();
      void cloneActiveObject();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
      event.preventDefault();
      void pasteClipboard();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d") {
      event.preventDefault();
      void duplicateSelection();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key === "0") {
      event.preventDefault();
      fitSurface();
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      deleteSelection();
    }
  });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      handleCanvasKeyDown(event);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeBoard?.id, handleCanvasKeyDown]);

  const contextMenuItems = [
    { id: "copy", label: "复制", shortcut: "⌘C" },
    { id: "paste", label: "粘贴", shortcut: "⌘V" },
    { id: "duplicate", label: "创建副本", shortcut: "⌘D" },
    { id: "delete", label: "删除", shortcut: "DELETE" },
    { id: "sep-1", type: "sep" as const },
    { id: "forward", label: "上移一层" },
    { id: "backward", label: "下移一层" },
    { id: "front", label: "移至最前" },
    { id: "back", label: "移至最底" },
    { id: "sep-2", type: "sep" as const },
    { id: "layers-panel", label: "图层面板" },
  ];
  const canArrange =
    activeMeta.kind === "text" || activeMeta.kind === "image" || activeMeta.kind === "shape";

  return (
    <>
      <link rel="stylesheet" href={GOOGLE_FONTS_URL} />
      {needsCreationGate ? (
        <ProjectCreationGate
          projectName={initialData.name}
          submitting={creationGateSubmitting}
          error={creationGateError}
          onSubmit={handleCreationGateSubmit}
        />
      ) : null}
      <EditorScaffold
      objectLabel=""
      objectName={initialData.name}
      backHref="/projects"
      backLabel="全部项目"
      statusLabel=""
      statusMeta=""
      topNote={topStatusLabel}
      primaryAction={
        setupMode ? null : (
          <Button
            className="h-10 gap-2 rounded-full border border-white/10 bg-primary px-4 text-primary-foreground shadow-[0_16px_28px_-18px_rgba(0,0,0,0.52)] hover:bg-primary/90 disabled:opacity-40"
            onClick={() => void handleOpenGenerate()}
            disabled={generating}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            生成排版
          </Button>
        )
      }
      secondaryAction={
        <div className="flex items-center gap-2">
          {/* 画布模式：查看项目准备 */}
          {setupMode ? null : (
            <EditorChromeButton
              className="h-10 gap-2 border-white/8 bg-white/4 px-4 text-white/60 hover:bg-white/8 hover:text-white"
              onClick={() => {
                setSetupMode(true);
                setActionError("");
                // 进入向导时重置到项目面板，避免结构/图层面板并行暴露
                setLeftPanel("project");
              }}
            >
              项目准备
            </EditorChromeButton>
          )}
        </div>
      }
      planSummary={planSummary}
      leftRailLabel={currentLeftPanelLabel}
      rightRailLabel="信息与编辑"
      leftRailWidthClass={setupMode ? "w-[272px]" : leftPanel ? "w-[336px]" : "w-[56px]"}
      rightRailWidthClass="w-[320px]"
      hideLeftRailHeader
      leftRail={setupMode ? (
        <SetupContextSidebar projectName={initialData.name} facts={projectFactsDraft} />
      ) : (
        <div className="flex h-full min-h-0">
          <div className="flex w-[56px] shrink-0 flex-col items-center gap-2 border-r border-white/5 bg-background px-1.5 py-3.5 shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)]">
            {(setupMode
              ? LEFT_PANEL_ITEMS.filter((i) => i.key === "project" || i.key === "assets")
              : // 排版阶段：项目背景改由顶部"项目准备"按钮承载，不在左侧常驻
                LEFT_PANEL_ITEMS.filter((i) => i.key !== "project")
            ).map((item) => {
              const Icon = item.icon;
              const active = leftPanel === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleLeftPanel(item.key)}
                  title={item.label}
                  className={cn(
                    "group relative flex h-11 w-11 items-center justify-center rounded-[14px] transition-all duration-200",
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/52 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-[-6px] top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full transition-opacity duration-200",
                      active ? "bg-white opacity-100" : "opacity-0"
                    )}
                  />
                  <Icon className="h-[18px] w-[18px]" />
                </button>
              );
            })}
          </div>

          {leftPanel ? (
            <div className="min-w-0 flex-1 overflow-y-auto animate-in fade-in-0 slide-in-from-left-2 duration-200">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-card px-5 py-2 shadow-[0_10px_24px_-22px_rgba(0,0,0,0.82)]">
                <div className="min-w-0">
                  <p className="text-xs tracking-[0.18em] text-white/30">
                    {currentLeftPanelMeta?.label ?? "面板"}
                  </p>
                </div>
                <EditorChromeIconButton
                  className="h-8 w-8 border-white/8 bg-white/[0.035] text-white/56 hover:bg-white/8 hover:text-white"
                  onClick={() => setLeftPanel(null)}
                  aria-label="收起左侧面板"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </EditorChromeIconButton>
              </div>
              {leftPanel === "project" ? (
                <>
                  <EditorRailSection title="项目背景与上下文">
                    <div className="space-y-2">
                      <div className={cn(editorPanelCardClass, "px-3.5 py-2.5")}>
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-white">输入项目背景</p>
                            <p className="mt-0.5 text-xs text-white/38">
                              这里的内容会直接作为项目准备与排版生成的上下文。
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-xs",
                              factsSaveState === "error"
                                ? "border-red-300/20 bg-red-400/10 text-red-100"
                                : "border-white/8 bg-white/4 text-white/54"
                            )}
                          >
                            {factsSaveLabel}
                          </span>
                        </div>
                      </div>
                      <div className={cn(editorPanelCardClass, "space-y-2.5 p-3")}>
                        <div
                          className="rounded-xl border border-white/10 bg-white/[0.04] p-2.5"
                          title="这些客观条件一经确定不可更改，如需修改请删除项目后重建"
                        >
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-xs uppercase tracking-wider text-white/40">
                              项目客观条件
                            </span>
                            <Lock className="h-3 w-3 text-white/30" />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <LockedChip
                              label="受众"
                              value={
                                AUDIENCE_OPTIONS.find(
                                  (o) => o.value === projectFactsDraft.audience
                                )?.label ?? "—"
                              }
                            />
                            <LockedChip
                              label="平台"
                              value={
                                PLATFORM_OPTIONS.find(
                                  (o) => o.value === projectFactsDraft.platform
                                )?.label ?? "—"
                              }
                            />
                            <LockedChip
                              label="行业"
                              value={
                                INDUSTRY_OPTIONS.find(
                                  (o) => o.value === projectFactsDraft.industry
                                )?.label ?? projectFactsDraft.industry ?? "—"
                              }
                            />
                            <LockedChip
                              label="性质"
                              value={
                                PROJECT_NATURE_OPTIONS.find(
                                  (o) => o.value === projectFactsDraft.projectNature
                                )?.label ?? "—"
                              }
                            />
                            <LockedChip
                              className="col-span-2"
                              label="我的职责"
                              value={
                                INVOLVEMENT_OPTIONS.find(
                                  (o) => o.value === projectFactsDraft.involvementLevel
                                )?.label ?? "—"
                              }
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-white/42">
                            项目周期 <span className="text-amber-300/80">*</span>
                          </label>
                          <Input
                            value={projectFactsDraft.timeline}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                timeline: event.target.value,
                              }))
                            }
                            placeholder="例如 2024 Q1 - Q2、共 3 个月"
                            className="mt-1.5 h-9 rounded-xl border-white/8 bg-secondary text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/42">头衔 / Title</label>
                          <Input
                            value={projectFactsDraft.roleTitle}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                roleTitle: event.target.value,
                              }))
                            }
                            placeholder="例如 高级产品设计师、独立设计师"
                            className="mt-1.5 h-9 rounded-xl border-white/8 bg-secondary text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/42">
                            项目背景 <span className="text-amber-300/80">*</span>
                          </label>
                          <Textarea
                            value={projectFactsDraft.background}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                background: event.target.value,
                              }))
                            }
                            placeholder="说明项目起因、所在业务环境、目标用户和主要约束。"
                            className="mt-1.5 min-h-[96px] rounded-[20px] border-white/8 bg-secondary text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/42">
                            业务目标 <span className="text-amber-300/80">*</span>
                          </label>
                          <Textarea
                            value={projectFactsDraft.businessGoal}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                businessGoal: event.target.value,
                              }))
                            }
                            placeholder="这个项目要解决的业务问题、期望达成的结果或核心指标。"
                            className="mt-1.5 min-h-[80px] rounded-[20px] border-white/8 bg-secondary text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/42">最大挑战</label>
                          <Textarea
                            value={projectFactsDraft.biggestChallenge}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                biggestChallenge: event.target.value,
                              }))
                            }
                            placeholder="项目中最棘手的问题、权衡或需要说服的对象。"
                            className="mt-1.5 min-h-[72px] rounded-[20px] border-white/8 bg-secondary text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/42">结果与成果</label>
                          <Textarea
                            value={projectFactsDraft.resultSummary}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                resultSummary: event.target.value,
                              }))
                            }
                            placeholder="最终上线效果、可量化指标、评价反馈或奖项。"
                            className="mt-1.5 min-h-[72px] rounded-[20px] border-white/8 bg-secondary text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </EditorRailSection>
                </>
              ) : null}

              {leftPanel === "assets" ? (
                <>
                  <EditorRailSection title="导入素材">
                    <div className="space-y-3">
                      <div className={cn(editorPanelCardClass, "px-4 py-4")}>
                        <p className="text-sm font-medium text-white">上传设计图</p>
                        <p className="mt-1.5 text-xs leading-6 text-white/42">
                          上传后可直接插入画板，也会进入结构识别。
                        </p>
                        <Button
                          type="button"
                          onClick={handleOpenAssetUpload}
                          disabled={uploadingAssets}
                          className="mt-4 h-10 w-full rounded-xl bg-white text-neutral-950 hover:bg-neutral-100"
                        >
                          {uploadingAssets ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              上传中
                            </>
                          ) : (
                            <>
                              <ImageIcon className="mr-2 h-4 w-4" />
                              上传本地图片
                            </>
                          )}
                        </Button>
                      </div>
                      <Input
                        value={assetSearch}
                        onChange={(event) => setAssetSearch(event.target.value)}
                        placeholder="搜索素材标题或 ID"
                        className="h-10 rounded-xl border-white/8 bg-secondary text-white placeholder:text-white/28"
                      />
                      {pendingRecognitionAssets.length > 0 ? (
                        <div className={cn(editorPanelCardClass, "px-4 py-4")}>
                          <p className="text-sm font-medium text-white">
                            {pendingRecognitionAssets.length} 张新素材待识别
                          </p>
                          <p className="mt-1.5 text-xs leading-6 text-white/42">
                            先做增量识别，再决定是否刷新结构。
                          </p>
                          <Button
                            type="button"
                            onClick={() => void handleRecognizeIncrementalMaterials()}
                            disabled={recognizingIncremental}
                            className="mt-4 h-10 w-full rounded-xl bg-white text-neutral-950 hover:bg-neutral-100"
                          >
                            {recognizingIncremental ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                增量识别中
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                只识别新增素材
                              </>
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </EditorRailSection>

                  {featuredAssets.length > 0 ? (
                    <EditorRailSection title="当前画板已用">
                      <div className="grid grid-cols-2 gap-3">
                        {featuredAssets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => void addAssetToCanvas(asset.id)}
                            className="group overflow-hidden rounded-[16px] border border-white/8 bg-white/3 text-left transition-all duration-200 hover:border-white/[0.14] hover:bg-white/6 hover:shadow-[0_18px_32px_-24px_rgba(0,0,0,0.82)]"
                          >
                            <div className="aspect-4/3 overflow-hidden bg-black/30">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                                alt={asset.title ?? "素材"}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                              />
                            </div>
                            <div className="px-3 py-2.5">
                              <p className="truncate text-xs font-medium text-white/80 transition-colors group-hover:text-white">
                                {asset.title ?? "未命名素材"}
                              </p>
                              {resolveProjectAssetMeta(asset.metaJson).roleTag ? (
                                <p className="mt-1 text-[11px] text-white/44">
                                  {PROJECT_IMAGE_ROLE_LABELS[
                                    resolveProjectAssetMeta(asset.metaJson).roleTag as ProjectImageRoleTag
                                  ]}
                                </p>
                              ) : null}
                            </div>
                          </button>
                        ))}
                      </div>
                    </EditorRailSection>
                  ) : null}

                  <EditorRailSection title="项目素材库">
                    <div className="grid grid-cols-2 gap-3">
                      {libraryAssets.map((asset) => (
                        <button
                          key={asset.id}
                          type="button"
                          onClick={() => void addAssetToCanvas(asset.id)}
                          className="group overflow-hidden rounded-[16px] border border-white/8 bg-white/3 text-left transition-all duration-200 hover:border-white/[0.14] hover:bg-white/6 hover:shadow-[0_18px_32px_-24px_rgba(0,0,0,0.82)]"
                        >
                          <div className="aspect-4/3 overflow-hidden bg-black/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                              alt={asset.title ?? "素材"}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            />
                          </div>
                          <div className="px-3 py-2.5">
                            <p className="truncate text-xs font-medium text-white/80 transition-colors group-hover:text-white">
                              {asset.title ?? "未命名素材"}
                            </p>
                            {resolveProjectAssetMeta(asset.metaJson).roleTag ? (
                              <p className="mt-1 text-[11px] text-white/44">
                                {PROJECT_IMAGE_ROLE_LABELS[
                                  resolveProjectAssetMeta(asset.metaJson).roleTag as ProjectImageRoleTag
                                ]}
                              </p>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                    {visibleAssets.length === 0 ? (
                      <div className="rounded-[18px] border border-dashed border-white/10 bg-white/2 px-4 py-6 text-sm text-white/46">
                        还没有素材。先上传设计图，再把关键图插入当前画板。
                      </div>
                    ) : null}
                  </EditorRailSection>
                </>
              ) : null}

              {leftPanel === "structure" ? (
                <>
                  <EditorRailSection title="导入后轻识别">
                    <div className="space-y-3">
                      <div className={cn(editorPanelCardClass, "px-4 py-4")}>
                        <p className="text-sm font-medium text-white">识别素材</p>
                        <p className="mt-1.5 text-xs leading-6 text-white/42">
                          先判断这批图更像什么、哪些适合主讲、还缺什么。
                        </p>
                        <Button
                          type="button"
                          onClick={() => void handleRecognizeMaterials()}
                          disabled={!hasStructureInputs || recognizingMaterials}
                          className="mt-4 h-10 w-full rounded-xl bg-white text-neutral-950 hover:bg-neutral-100"
                        >
                          {recognizingMaterials ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              识别中
                            </>
                          ) : materialRecognition ? (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              重新识别这批素材
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              识别这批素材
                            </>
                          )}
                        </Button>
                      </div>

                      {!hasStructureInputs ? (
                        <EditorEmptyState>
                          先填写项目背景或上传设计图，系统才有足够上下文做轻识别。
                        </EditorEmptyState>
                      ) : null}

                      {materialRecognition ? (
                        <div className={cn(editorPanelCardClass, "space-y-3 p-4")}>
                          <div>
                            <p className="text-sm font-medium text-white">{materialRecognition.summary}</p>
                            <p className="mt-2 text-xs text-white/34">
                              更新于{" "}
                              {materialRecognition.generatedAt
                                ? new Date(materialRecognition.generatedAt).toLocaleString("zh-CN")
                                : "刚刚"}
                            </p>
                          </div>
                          {materialRecognition.recognizedTypes.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {materialRecognition.recognizedTypes.map((type) => (
                                <span
                                  key={type}
                                  className="rounded-full border border-white/8 bg-white/3 px-2.5 py-1 text-xs text-white/58"
                                >
                                  {type}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          <div className="space-y-2 text-xs leading-6 text-white/52">
                            <p>
                              主讲素材：
                              {materialRecognition.heroAssetIds.length > 0
                                ? materialRecognition.heroAssetIds
                                    .map((id) => assetMap.get(id)?.title ?? id)
                                    .join("、")
                                : " 暂无明确主讲素材"}
                            </p>
                            <p>
                              缺失信息：
                              {materialRecognition.missingInfo.length > 0
                                ? materialRecognition.missingInfo.join("、")
                                : " 当前没有明显缺口"}
                            </p>
                            <p>下一步：{materialRecognition.suggestedNextStep}</p>
                          </div>
                          {materialRecognition.lastIncrementalDiff ? (
                            <div className="rounded-[18px] border border-white/6 bg-white/2 px-3.5 py-3">
                              <p className="text-xs font-medium text-white">最近一次变化</p>
                              <p className="mt-1.5 text-xs leading-6 text-white/48">
                                {materialRecognition.lastIncrementalDiff.summary}
                              </p>
                              {materialRecognition.lastIncrementalDiff.changes.length > 0 ? (
                                <div className="mt-3 space-y-1.5">
                                  {materialRecognition.lastIncrementalDiff.changes.map((change) => (
                                    <p key={change} className="text-xs leading-5 text-white/38">
                                      • {change}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                              <p className="mt-3 text-xs text-white/34">
                                {materialRecognition.lastIncrementalDiff.shouldRefreshStructure
                                  ? "这次增量建议刷新结构建议。"
                                  : "这次增量还不需要重做结构。"}
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </EditorRailSection>

                  <EditorRailSection title="结构建议">
                    <div className="space-y-3">
                      <div className={cn(editorPanelCardClass, "px-4 py-4")}>
                        <p className="text-sm font-medium text-white">生成结构建议</p>
                        <p className="mt-1.5 text-xs leading-6 text-white/42">
                          先起一版结构草稿，再决定怎么落成画板。
                        </p>
                        <Button
                          type="button"
                          onClick={() => void handleSuggestStructure()}
                          disabled={!canSuggestStructure || suggestingStructure}
                          className="mt-4 h-10 w-full rounded-xl bg-white text-neutral-950 hover:bg-neutral-100 disabled:bg-white/20 disabled:text-white/50"
                        >
                          {suggestingStructure ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              生成中
                            </>
                          ) : structureSuggestion ? (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              重新生成结构建议
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-4 w-4" />
                              生成结构建议
                            </>
                          )}
                        </Button>
                        {!materialRecognition ? (
                          <p className="mt-3 text-xs leading-5 text-white/34">
                            先识别素材，再起结构草稿。
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </EditorRailSection>

                  {structureDraft ? (
                    <>
                      <EditorRailSection title="结构摘要">
                        <div className={cn(editorPanelCardClass, "space-y-3 p-4")}>
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-white">确认当前结构</p>
                            </div>
                            <Badge
                              variant="outline"
                              className="rounded-full border-white/8 bg-white/3 text-white/66"
                            >
                              {structureDraft.status === "confirmed" ? "已确认" : "草稿"}
                            </Badge>
                          </div>

                          <div className="space-y-3 rounded-[18px] border border-white/6 bg-white/2 p-3.5">
                            <div>
                              <label className="text-xs text-white/44">结构总述</label>
                              <Textarea
                                value={structureDraft.summary}
                                onChange={(event) =>
                                  mutateStructureDraft((current) => ({
                                    ...current,
                                    summary: event.target.value,
                                  }))
                                }
                                className="mt-1.5 min-h-[88px] rounded-[18px] border-white/8 bg-secondary text-white"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-white/44">叙事弧线</label>
                              <Input
                                value={structureDraft.narrativeArc}
                                onChange={(event) =>
                                  mutateStructureDraft((current) => ({
                                    ...current,
                                    narrativeArc: event.target.value,
                                  }))
                                }
                                className="mt-1.5 h-10 rounded-xl border-white/8 bg-secondary text-white"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              onClick={() => void saveStructureDraft()}
                              disabled={structureSaveState === "saving"}
                              className="h-10 rounded-xl bg-white text-neutral-950 hover:bg-neutral-100"
                            >
                              {structureSaveState === "saving" ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  保存中
                                </>
                              ) : (
                                <>
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  保存结构
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void confirmStructureDraft()}
                              disabled={structureSaveState === "saving"}
                              className="h-10 rounded-xl border-white/8 bg-white/3 text-white hover:bg-white/6"
                            >
                              <Check className="mr-2 h-4 w-4" />
                              确认当前结构
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void applyStructureToBoards()}
                              disabled={
                                structureSaveState === "saving" ||
                                applyingStructure ||
                                structureDraft.status !== "confirmed" ||
                                structureDraft.groups.length === 0
                              }
                              className="h-10 rounded-xl border-white/8 bg-white/3 text-white hover:bg-white/6 disabled:bg-white/2 disabled:text-white/34"
                            >
                              {applyingStructure ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  落板中
                                </>
                              ) : (
                                <>
                                  <LayoutTemplate className="mr-2 h-4 w-4" />
                                  按当前结构创建画板组
                                </>
                              )}
                            </Button>
                            <span className="text-xs text-white/34">{structureSaveLabel}</span>
                          </div>

                          {typeof structureDraft.unlockedChapterLimit === "number" ? (
                            <p className="flex items-start gap-1.5 rounded-[14px] border border-white/6 bg-white/3 px-3 py-2 text-xs leading-5 text-white/60">
                              <Lock className="mt-0.5 h-3 w-3 flex-none" />
                              免费层仅落地前 {structureDraft.unlockedChapterLimit} 章对应的画板；升级后可一键补齐剩余章节，不再消耗次数。
                            </p>
                          ) : null}

                          <p className="text-xs text-white/30">
                            更新于{" "}
                            {structureDraft.generatedAt
                              ? new Date(structureDraft.generatedAt).toLocaleString("zh-CN")
                              : "刚刚"}
                          </p>
                        </div>
                      </EditorRailSection>

                      <EditorRailSection title="结构分组">
                        <div className="space-y-3">
                          <div className="flex justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={addStructureGroup}
                              className="h-9 rounded-xl border-white/8 bg-white/3 text-white hover:bg-white/6"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              新增分组
                            </Button>
                          </div>
                          {structureDraft.groups.map((group, index) => (
                            <div
                              key={group.id}
                              className="rounded-[22px] border border-white/8 bg-secondary p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs tracking-[0.16em] text-white/30">
                                    GROUP {index + 1}
                                  </p>
                                  <Input
                                    value={group.label}
                                    onChange={(event) =>
                                      updateStructureGroup(group.id, {
                                        label: event.target.value,
                                      })
                                    }
                                    className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-sm font-semibold text-white"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-white/8 bg-white/3 text-white/66"
                                  >
                                    {group.narrativeRole}
                                  </Badge>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => mergeStructureGroupIntoPrevious(group.id)}
                                    disabled={index === 0}
                                    className="h-9 w-9 rounded-xl text-white/56 hover:bg-white/6 hover:text-white disabled:text-white/20"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteStructureGroup(group.id)}
                                    className="h-9 w-9 rounded-xl text-white/56 hover:bg-white/6 hover:text-white"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="mt-3 space-y-3">
                                <div>
                                  <label className="text-xs text-white/40">分组作用</label>
                                  <Input
                                    value={group.narrativeRole}
                                    onChange={(event) =>
                                      updateStructureGroup(group.id, {
                                        narrativeRole: event.target.value,
                                      })
                                    }
                                    className="mt-1.5 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-white/40">保留理由</label>
                                  <Textarea
                                    value={group.rationale}
                                    onChange={(event) =>
                                      updateStructureGroup(group.id, {
                                        rationale: event.target.value,
                                      })
                                    }
                                    className="mt-1.5 min-h-[84px] rounded-[18px] border-white/8 bg-secondary text-white"
                                  />
                                </div>
                              </div>

                              <div className="mt-4 space-y-2.5">
                                {group.sections.map((section) => {
                                  const isLocked = Boolean(section.locked);
                                  return (
                                  <div
                                    key={section.id}
                                    className={cn(
                                      "rounded-[18px] border border-white/6 bg-white/2 px-3.5 py-3",
                                      isLocked && "opacity-80"
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                          <label className="text-xs text-white/34">小节标题</label>
                                          {isLocked ? (
                                            <Badge
                                              variant="outline"
                                              className="h-5 gap-1 rounded-full border-white/10 bg-white/5 px-2 text-[10px] text-white/70"
                                            >
                                              <Lock className="h-3 w-3" />
                                              升级查看细节
                                            </Badge>
                                          ) : null}
                                        </div>
                                        <Input
                                          value={section.title}
                                          onChange={(event) =>
                                            updateStructureSection(group.id, section.id, {
                                              title: event.target.value,
                                            })
                                          }
                                          disabled={isLocked}
                                          className="mt-1.5 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteStructureSection(group.id, section.id)}
                                        disabled={isLocked}
                                        className="mt-5 h-9 w-9 rounded-xl text-white/56 hover:bg-white/6 hover:text-white"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    {isLocked ? (
                                      <p className="mt-3 rounded-[14px] border border-white/6 bg-white/3 px-3 py-2 text-xs leading-5 text-white/60">
                                        免费层仅解锁前 {structureDraft.unlockedChapterLimit ?? 2} 章的细节与落板。升级后可查看本章内容指导并一键补齐剩余章节。
                                      </p>
                                    ) : (
                                      <>
                                        <div className="mt-3">
                                          <label className="text-xs text-white/34">这一小节要讲什么</label>
                                          <Textarea
                                            value={section.purpose}
                                            onChange={(event) =>
                                              updateStructureSection(group.id, section.id, {
                                                purpose: event.target.value,
                                              })
                                            }
                                            className="mt-1.5 min-h-[84px] rounded-[18px] border-white/8 bg-secondary text-white"
                                          />
                                        </div>
                                        <div className="mt-3">
                                          <label className="text-xs text-white/34">建议内容点</label>
                                          <Textarea
                                            value={section.recommendedContent.join("\n")}
                                            onChange={(event) =>
                                              updateStructureSection(group.id, section.id, {
                                                recommendedContent: event.target.value
                                                  .split("\n")
                                                  .map((item) => item.trim())
                                                  .filter(Boolean),
                                              })
                                            }
                                            placeholder="每行一条建议内容点"
                                            className="mt-1.5 min-h-[88px] rounded-[18px] border-white/8 bg-secondary text-white"
                                          />
                                        </div>
                                        <div className="mt-3">
                                          <label className="text-xs text-white/34">建议素材</label>
                                          <Input
                                            value={section.suggestedAssets.join("、")}
                                            onChange={(event) =>
                                              updateStructureSection(group.id, section.id, {
                                                suggestedAssets: event.target.value
                                                  .split(/[,，]/)
                                                  .map((item) => item.trim())
                                                  .filter(Boolean),
                                              })
                                            }
                                            placeholder="用逗号分隔建议素材标题或类型"
                                            className="mt-1.5 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                          />
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  );
                                })}
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => addStructureSection(group.id)}
                                  className="h-9 w-full rounded-xl border-white/8 bg-white/3 text-white hover:bg-white/6"
                                >
                                  <Plus className="mr-2 h-4 w-4" />
                                  在这一组里新增小节
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </EditorRailSection>
                    </>
                  ) : null}
                </>
              ) : null}

              {leftPanel === "layers" ? (
                <EditorRailSection title="图层管理">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleLayerDragEnd}
                  >
                    <SortableContext
                      items={layerItems.map((item) => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {layerItems.map((item) => (
                          <SortableLayerRow
                            key={item.id}
                            item={item}
                            selected={selectedLayerIds.includes(item.id)}
                            onSelect={selectLayerById}
                            onOpenMenu={(event) => {
                              event.stopPropagation();
                              selectLayerById(item.id);
                              openContextMenuAt(event.clientX, event.clientY);
                            }}
                          />
                        ))}
                        {layerItems.length === 0 ? (
                          <div className="rounded-[18px] border border-dashed border-white/10 bg-white/2 px-4 py-6 text-sm text-white/46">
                            当前画板还没有图层。
                          </div>
                        ) : null}
                      </div>
                    </SortableContext>
                  </DndContext>
                </EditorRailSection>
              ) : null}

              {leftPanel === "boards" ? (
                <>
                  <EditorRailSection title="画板管理">
                    <div className="space-y-3">
                      <EditorChromeButton
                        className="h-10 w-full justify-center"
                        onClick={createBoard}
                        disabled={scene.boards.length >= PROJECT_BOARD_MAX}
                      >
                        新建画板
                      </EditorChromeButton>
                      <div className="flex items-center justify-between px-1 text-xs text-white/52">
                        <span>已用画板</span>
                        <span className="text-white/78">
                          {scene.boards.length} / {PROJECT_BOARD_MAX}
                        </span>
                      </div>
                    </div>
                  </EditorRailSection>
                  <EditorRailSection title="画板导航">
                    <div className={cn(editorPanelMutedCardClass, "mb-3 px-3.5 py-3 text-xs leading-5 text-white/44")}>
                      左侧负责查看标题、状态、分组并调整顺序。底部只保留缩略图预览和本轮生成范围。
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleBoardDragEnd}
                    >
                      <SortableContext
                        items={scene.boardOrder}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {boardGroupRuns.map((run) => (
                            <div key={run.key} className="space-y-2">
                              {getBoardGroupRunLabel(run, {
                                showUngrouped: showBoardGroupHeaders,
                              }) ? (
                                <div className="flex items-center gap-2 px-1">
                                  <p className="text-[11px] font-medium tracking-[0.16em] text-white/38">
                                    {getBoardGroupRunLabel(run, {
                                      showUngrouped: showBoardGroupHeaders,
                                    })}
                                  </p>
                                  <div className="h-px flex-1 bg-white/8" />
                                </div>
                              ) : null}
                              <div className="space-y-2">
                                {run.boards.map((board) => {
                                  const index = scene.boardOrder.indexOf(board.id);
                                  const thumbnailUrl = boardThumbnailMap.get(board.id) ?? null;
                                  const isLive = Boolean(liveThumbnails[board.id]);
                                  return (
                                    <BoardListRow
                                      key={board.id}
                                      board={board}
                                      index={index}
                                      thumbnailUrl={thumbnailUrl}
                                      isLive={isLive}
                                      active={scene.activeBoardId === board.id}
                                      canDelete={scene.boards.length > 1}
                                      onSelect={() => selectBoard(board.id)}
                                      onDelete={() => deleteBoard(board.id)}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </EditorRailSection>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
      center={
        <>
        <input
          ref={assetUploadRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(event) => void handleAssetFilesPicked(event.target.files)}
        />
        {setupMode ? (
          <div className="relative flex h-full w-full flex-col overflow-hidden bg-card">
            <ProjectSetupWizard
              projectName={initialData.name}
              facts={{
                timeline: projectFactsDraft.timeline,
                roleTitle: projectFactsDraft.roleTitle,
                background: projectFactsDraft.background,
                businessGoal: projectFactsDraft.businessGoal,
                biggestChallenge: projectFactsDraft.biggestChallenge,
                resultSummary: projectFactsDraft.resultSummary,
              }}
              onFactsChange={(patch) =>
                setProjectFactsDraft((current) => ({ ...current, ...patch }))
              }
              factsSaveLabel={factsSaveLabel}
              assets={assets}
              materialRecognition={materialRecognition}
              structureDraft={structureDraft}
              isStructureConfirmed={Boolean(structureDraft?.confirmedAt)}
              recognizingMaterials={recognizingMaterials}
              suggestingStructure={suggestingStructure}
              confirmingStructure={confirmingStructure}
              uploadingAssets={uploadingAssets}
              actionError={actionError}
              hasExistingBoards={
                scene.boards.length > 1 ||
                scene.boards.some((board) => board.nodes.length > 0)
              }
              onAiUnderstand={() => void handleWizardAiUnderstand()}
              onGenerateStructure={() => void handleSuggestStructure()}
              onConfirmAndEnter={() => void handleWizardConfirmAndEnter()}
              onUploadAssets={handleOpenAssetUpload}
              onUpdateAssetTitle={handleRenameAsset}
              onUpdateAssetNote={handleUpdateAssetNote}
              onDeleteAsset={(assetId) => void handleDeleteAsset(assetId)}
              onReturnToCanvas={() => { setSetupMode(false); setActionError(""); }}
              onStructureChange={(next) => mutateStructureDraft(() => next)}
            />
          </div>
        ) : (
        <div
          ref={viewportRef}
          className="relative flex h-full w-full items-center justify-center overflow-hidden"
          style={{
            backgroundColor: "#0a0a0a",
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1.5px)",
            backgroundSize: "20px 20px",
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2">
            <div
              className={cn(
                "pointer-events-auto flex items-center gap-1 px-1.5 py-1.5",
                editorFloatingSurfaceClass
              )}
            >
              <div className="flex items-center gap-1 px-0.5">
                <EditorChromeButton
                  className="h-8 gap-1.5 border-white/6 bg-white/6 px-3 text-white/78 shadow-none hover:bg-white/10 hover:text-white"
                  onClick={() => {
                    setLeftPanel("assets");
                    setShapeMenuOpen(false);
                  }}
                >
                  <ImageIcon className="h-4 w-4" />
                  插入图片
                </EditorChromeButton>
                <EditorChromeButton
                  className="h-8 gap-1.5 border-white/6 bg-white/6 px-3 text-white/78 shadow-none hover:bg-white/10 hover:text-white"
                  onClick={addTextObject}
                >
                  <Type className="h-4 w-4" />
                  添加文本
                </EditorChromeButton>
                <div className="relative">
                  <EditorChromeButton
                    className="h-8 gap-1.5 border-white/6 bg-white/6 px-3 text-white/78 shadow-none hover:bg-white/10 hover:text-white"
                    onClick={() => setShapeMenuOpen((prev) => !prev)}
                  >
                    <Square className="h-4 w-4" />
                    形状
                    <ChevronDown className="h-4 w-4" />
                  </EditorChromeButton>
                  {shapeMenuOpen ? (
                    <div
                      className={cn("absolute left-0 top-11 z-30 w-48 p-2", editorPopupSurfaceClass)}
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      {PROJECT_SHAPE_TYPES.map((shape) => (
                        <button
                          key={shape}
                          type="button"
                          onClick={() => {
                            void addShapeObject(shape);
                            setShapeMenuOpen(false);
                          }}
                          className={cn(editorPopupItemClass, "items-center gap-2 text-sm")}
                        >
                          {shape === "circle" ? (
                            <Circle className="h-4 w-4" />
                          ) : shape === "triangle" ? (
                            <Triangle className="h-4 w-4" />
                          ) : shape === "line" ? (
                            <Minus className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                          {SHAPE_LABELS[shape]}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="h-5 w-px bg-white/8" />
              <div className="flex items-center gap-1 px-0.5">
                <EditorChromeButton
                  className="h-8 border-white/6 bg-white/6 px-3 text-white/78 shadow-none hover:bg-white/10 hover:text-white"
                  onClick={() => fitSurface()}
                >
                  适应画板
                </EditorChromeButton>
              </div>
              <div className="h-5 w-px bg-white/8" />
              <div className="flex items-center gap-1 px-0.5">
                <EditorChromeButton
                  className="h-8 w-8 border-white/6 bg-white/6 text-white/78 shadow-none hover:bg-white/10 hover:text-white"
                  onClick={() => fitSurface(clamp(surfaceScale - 0.1, 0.1, 4))}
                >
                  <ZoomOut className="h-4 w-4" />
                </EditorChromeButton>
                <span className="inline-flex h-8 items-center rounded-full border border-white/6 px-3 text-sm font-medium text-white/60">
                  {Math.round(surfaceScale * 100)}%
                </span>
                <EditorChromeButton
                  className="h-8 w-8 border-white/6 bg-white/6 text-white/78 shadow-none hover:bg-white/10 hover:text-white"
                  onClick={() => fitSurface(clamp(surfaceScale + 0.1, 0.1, 4))}
                >
                  <ZoomIn className="h-4 w-4" />
                </EditorChromeButton>
              </div>
            </div>
          </div>

          <div
            ref={surfaceRef}
            className="relative overflow-hidden rounded-[12px] shadow-[0_28px_80px_-32px_rgba(0,0,0,0.75)]"
            style={{
              width: `${Math.round(PROJECT_BOARD_WIDTH * surfaceScale)}px`,
              height: `${Math.round(PROJECT_BOARD_HEIGHT * surfaceScale)}px`,
              backgroundColor: "#ffffff",
            }}
          >
            <canvas ref={hostRef} className="block h-full w-full" />
          </div>

          {!canvasReady ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm text-white/62">
                <Loader2 className="mr-2 inline-flex h-4 w-4 animate-spin" />
                正在初始化 Fabric 引擎…
              </div>
            </div>
          ) : null}
          {contextMenu.open ? (
            <div
              className={cn("fixed z-50 w-56 p-2 text-sm", editorPopupSurfaceClass)}
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onMouseDown={(event) => event.stopPropagation()}
            >
              {contextMenuItems.map((item) =>
                "type" in item && item.type === "sep" ? (
                  <div key={item.id} className="my-1.5 h-px bg-white/6" />
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    className={editorPopupItemClass}
                    onClick={() => {
                      closeContextMenu();
                      void handleContextAction(item.id);
                    }}
                  >
                    <span>{item.label}</span>
                    {"shortcut" in item ? (
                      <span className="text-xs text-white/36">{item.shortcut}</span>
                    ) : null}
                  </button>
                )
              )}
            </div>
          ) : null}
          {actionMessage ? (
            <div className="pointer-events-none absolute bottom-6 left-1/2 z-30 -translate-x-1/2">
              <div
                className={cn(
                  "rounded-full border px-4 py-2 text-sm shadow-[0_20px_40px_-28px_rgba(0,0,0,0.65)] backdrop-blur-sm",
                  actionMessage.tone === "error"
                    ? "border-red-300/20 bg-red-400/10 text-red-100"
                    : "border-white/8 bg-card/88 text-white/82"
                )}
              >
                {actionMessage.text}
              </div>
            </div>
          ) : null}
        </div>
        )}
        </>}
      rightRail={setupMode ? undefined : (
        <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mt-0">
                  {activeBoard ? (
                    <EditorRailSection title="当前画板">
                      <div className={cn(editorPanelCardClass, "space-y-3 p-4")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 text-[11px] leading-5 text-white/36">
                              <span>第 {activeBoardIndex + 1} / {scene.boardOrder.length} 张</span>
                              {activeBoardStructureLabel ? (
                                <span className="max-w-[180px] truncate" title={activeBoardStructureLabel}>
                                  来源：{activeBoardStructureLabel}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 truncate text-sm font-semibold text-white">
                              {activeBoard.name}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/46">
                              {activeBoard.intent.trim()
                                ? activeBoard.intent
                                : "这张画板还没写讲述目标，AI 生成和更新时会缺少上下文。"}
                            </p>
                          </div>
                          <div className="shrink-0">
                            <BoardStatusBadge board={activeBoard} />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className={cn(editorPanelMutedCardClass, "px-3 py-2.5")}>
                            <p className="text-[11px] tracking-[0.14em] text-white/34">尺寸</p>
                            <p className="mt-1 text-sm text-white/78">
                              {activeBoard.frame.width} × {activeBoard.frame.height}
                            </p>
                          </div>
                          <div className={cn(editorPanelMutedCardClass, "px-3 py-2.5")}>
                            <p className="text-[11px] tracking-[0.14em] text-white/34">内容</p>
                            <p className="mt-1 text-sm text-white/78">
                              {activeBoardNodeStats.text} 文本 · {activeBoardNodeStats.image} 图片 · {activeBoardNodeStats.shape} 形状
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-[11px] leading-5 text-white/48">
                          <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5">
                            {activeBoardIncludedInGeneration ? "已纳入本轮生成" : "当前不在本轮生成范围"}
                          </span>
                          <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5">
                            {activeBoard.locked ? "AI 已锁定" : "可参与 AI"}
                          </span>
                          <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5">
                            {activeBoardAiStateLabel}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <EditorChromeButton
                            className="h-10 justify-center"
                            onClick={() => setGenerationMode("current")}
                          >
                            仅生成当前页
                          </EditorChromeButton>
                          <EditorChromeButton
                            className="h-10 justify-center"
                            onClick={() => setGenerationMode("all")}
                          >
                            生成全部未锁定
                          </EditorChromeButton>
                        </div>
                      </div>
                    </EditorRailSection>
                  ) : null}
                  {hasActiveInspector ? (
                    <div className="h-full overflow-y-auto">
                      <EditorRailSection title="对象编辑">
                        <div className={cn(editorPanelCardClass, "space-y-4 p-4")}>
                          <div className={cn(editorPanelMutedCardClass, "flex items-center justify-between px-3 py-2.5")}>
                            <div>
                              <p className="text-sm text-white/78">
                                {activeMeta.kind === "text"
                                  ? "文本"
                                  : activeMeta.kind === "image"
                                    ? "图片"
                                    : activeMeta.kind === "shape"
                                      ? "形状"
                                      : activeMeta.kind === "multi"
                                        ? "多选"
                                        : "对象"}
                              </p>
                            </div>
                            <span className="rounded-full border border-white/8 bg-background px-2.5 py-1 text-xs text-white/52">
                              {activeMeta.kind === "multi" ? `${activeMeta.count} 项` : "单个"}
                            </span>
                          </div>
                          {activeMeta.kind === "multi" ? (
                            <div className={cn(editorPanelMutedCardClass, "px-4 py-3 text-sm text-white/52")}>
                              已选 {activeMeta.count} 个对象，可先调整层级或重新选择单个对象编辑属性。
                            </div>
                          ) : null}

                          {activeMeta.kind === "text" ? (
                            <div className="space-y-3">
                              <div className={cn(editorPanelMutedCardClass, "p-3")}>
                                <p className="mb-2 text-xs tracking-[0.16em] text-white/34">内容</p>
                                <Textarea
                                  value={activeMeta.text}
                                  onChange={(event) => updateActiveObject({ text: event.target.value })}
                                  className="min-h-[80px] rounded-xl border-white/8 bg-secondary text-white"
                                />
                              </div>
                              <div className={cn(editorPanelMutedCardClass, "p-3")}>
                                <p className="mb-2.5 text-xs tracking-[0.16em] text-white/34">字体</p>
                                <Select
                                  value={activeMeta.fontFamily}
                                  onValueChange={(value) => updateActiveObject({ fontFamily: value })}
                                >
                                  <SelectTrigger className="h-10 rounded-xl border-white/8 bg-secondary text-sm text-white focus:ring-white/20">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="border-white/8 bg-card text-white">
                                    <div className="px-2 pb-1 pt-2 text-xs font-medium tracking-[0.14em] text-white/36">
                                      正文字体
                                    </div>
                                    {EDITOR_FONTS_BODY.map((font) => (
                                      <SelectItem
                                        key={font.value}
                                        value={font.value}
                                        className="focus:bg-white/[0.07] focus:text-white"
                                        style={{ fontFamily: font.value }}
                                      >
                                        {font.label}
                                      </SelectItem>
                                    ))}
                                    <div className="mx-2 my-1.5 h-px bg-white/6" />
                                    <div className="px-2 pb-1 text-xs font-medium tracking-[0.14em] text-white/36">
                                      展示 / 艺术字体
                                    </div>
                                    {EDITOR_FONTS_DISPLAY.map((font) => (
                                      <SelectItem
                                        key={font.value}
                                        value={font.value}
                                        className="focus:bg-white/[0.07] focus:text-white"
                                        style={{ fontFamily: font.value }}
                                      >
                                        {font.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className={cn(editorPanelMutedCardClass, "p-3")}>
                                <p className="mb-2 text-xs tracking-[0.16em] text-white/34">样式</p>
                                {/* 对齐 */}
                                <label className="text-xs text-white/50">对齐</label>
                                <div className="mt-2 flex gap-1">
                                  {(["left", "center", "right"] as const).map((align) => (
                                    <button
                                      key={align}
                                      type="button"
                                      onClick={() => updateActiveObject({ textAlign: align })}
                                      className={cn(
                                        "flex h-8 flex-1 items-center justify-center rounded-lg transition-colors",
                                        activeMeta.textAlign === align
                                          ? "bg-white/15 text-white"
                                          : "text-white/40 hover:bg-white/[0.07] hover:text-white/70"
                                      )}
                                    >
                                      {align === "left" ? (
                                        <AlignLeft className="h-3.5 w-3.5" />
                                      ) : align === "center" ? (
                                        <AlignCenter className="h-3.5 w-3.5" />
                                      ) : (
                                        <AlignRight className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                                {/* 字号 / 字重 */}
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-white/50">字号</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.fontSize}
                                      onChange={(event) =>
                                        updateActiveObject({ fontSize: Number(event.target.value) || 16 })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">字重</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.fontWeight}
                                      onChange={(event) =>
                                        updateActiveObject({ fontWeight: Number(event.target.value) || 400 })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                </div>
                                {/* 颜色 / 行高 */}
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-white/50">颜色</label>
                                    <div className="mt-2 flex items-center gap-2">
                                      <ColorPickerPopover
                                        value={{ mode: "solid", hex: activeMeta.color, alpha: 1 }}
                                        onChange={(colorValue) => {
                                          if (colorValue.mode === "solid") {
                                            updateActiveObject({ fill: colorValue.hex });
                                          }
                                        }}
                                        side="left"
                                        align="start"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">行高</label>
                                    <Input
                                      type="number"
                                      min={0.8}
                                      max={4}
                                      step={0.05}
                                      value={activeMeta.lineHeight}
                                      onChange={(event) =>
                                        updateActiveObject({ lineHeight: Number(event.target.value) || 1.3 })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                </div>
                                {/* 透明度 */}
                                <div className="mt-3">
                                  <label className="text-xs text-white/50">透明度</label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Input
                                      type="range"
                                      min={0}
                                      max={1}
                                      step={0.01}
                                      value={activeMeta.opacity}
                                      onChange={(event) =>
                                        updateActiveObject({ opacity: Number(event.target.value) })
                                      }
                                      className="h-8 flex-1"
                                    />
                                    <span className="w-9 shrink-0 text-right text-sm tabular-nums text-white/60">
                                      {Math.round(activeMeta.opacity * 100)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {/* 位置与尺寸 */}
                              <div className={cn(editorPanelMutedCardClass, "p-3")}>
                                <p className="mb-2 text-xs tracking-[0.16em] text-white/34">位置与尺寸</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-white/50">宽 W</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.width}
                                      onChange={(event) =>
                                        updateActiveDimensions({ width: Number(event.target.value) || 1 })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">高 H</label>
                                    <Input
                                      type="number"
                                      readOnly
                                      value={activeMeta.height}
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white/40"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">X</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.x}
                                      onChange={(event) =>
                                        updateActiveDimensions({ x: Number(event.target.value) })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">Y</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.y}
                                      onChange={(event) =>
                                        updateActiveDimensions({ y: Number(event.target.value) })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {activeMeta.kind === "image" ? (
                            <div className="space-y-3">
                              {selectedImageAsset ? (
                                <div className={cn(editorPanelMutedCardClass, "p-3")}>
                                  <p className="mb-2 text-xs tracking-[0.16em] text-white/34">素材语义</p>
                                  <label className="text-xs text-white/50">图片名称</label>
                                  <Input
                                    value={imageDetailsDraft.title}
                                    onChange={(event) =>
                                      setImageDetailsDraft((current) => ({
                                        ...current,
                                        title: event.target.value,
                                      }))
                                    }
                                    placeholder="给这张图片一个更清晰的名称"
                                    className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                  />
                                  <label className="mt-3 block text-xs text-white/50">图片描述</label>
                                  <Textarea
                                    value={imageDetailsDraft.note}
                                    onChange={(event) =>
                                      setImageDetailsDraft((current) => ({
                                        ...current,
                                        note: event.target.value,
                                      }))
                                    }
                                    placeholder="描述这张图的内容、用途或希望 AI 理解的重点"
                                    className="mt-2 min-h-[96px] rounded-xl border-white/8 bg-secondary text-white"
                                  />
                                  <label className="mt-3 block text-xs text-white/50">素材角色</label>
                                  <Select
                                    value={imageDetailsDraft.roleTag}
                                    onValueChange={(value) =>
                                      setImageDetailsDraft((current) => ({
                                        ...current,
                                        roleTag: value as ProjectImageRoleTag | "none",
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-sm text-white focus:ring-white/20">
                                      <SelectValue placeholder="选择这张图在项目讲述中的角色" />
                                    </SelectTrigger>
                                  <SelectContent className="border-white/8 bg-card text-white">
                                      <SelectItem
                                        value="none"
                                        className="focus:bg-white/[0.07] focus:text-white"
                                      >
                                        未指定
                                      </SelectItem>
                                      {PROJECT_IMAGE_ROLE_TAGS.map((role) => (
                                        <SelectItem
                                          key={role}
                                          value={role}
                                          className="focus:bg-white/[0.07] focus:text-white"
                                        >
                                          {PROJECT_IMAGE_ROLE_LABELS[role]}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <label className="mt-3 block text-xs text-white/50">替换图片</label>
                                  <Select
                                    value={selectedImageAsset.id}
                                    onValueChange={(value) => {
                                      if (value !== selectedImageAsset.id) {
                                        void replaceActiveImageAsset(value);
                                      }
                                    }}
                                  >
                                    <SelectTrigger className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-sm text-white focus:ring-white/20">
                                      <SelectValue placeholder="从当前项目素材库替换" />
                                    </SelectTrigger>
                                    <SelectContent className="border-white/8 bg-card text-white">
                                      {assets.map((asset) => (
                                        <SelectItem
                                          key={asset.id}
                                          value={asset.id}
                                          className="focus:bg-white/[0.07] focus:text-white"
                                        >
                                          {asset.title ?? "未命名素材"}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    onClick={() => void saveSelectedImageDetails()}
                                    disabled={assetDetailsSaving}
                                    className="mt-3 h-10 w-full gap-2 rounded-xl bg-white text-neutral-950 hover:bg-neutral-100"
                                  >
                                    {assetDetailsSaving ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <PencilLine className="h-4 w-4" />
                                    )}
                                    保存图片信息
                                  </Button>
                                </div>
                              ) : null}
                              <div className={cn(editorPanelMutedCardClass, "p-3")}>
                                <p className="mb-2 text-xs tracking-[0.16em] text-white/34">显示</p>
                                <label className="text-xs text-white/50">填充方式</label>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {[
                                    { key: "fill", label: "Fill" },
                                    { key: "fit", label: "Fit" },
                                  ].map((item) => (
                                    <button
                                      key={item.key}
                                      type="button"
                                      onClick={() =>
                                        updateActiveImageFit(item.key as "fill" | "fit")
                                      }
                                      className={cn(
                                        "rounded-xl border px-3 py-2 text-sm transition-colors",
                                        activeMeta.fit === item.key
                                          ? "border-white/16 bg-white/10 text-white"
                                          : "border-white/8 bg-background text-white/64 hover:bg-white/5"
                                      )}
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                                {activeMeta.fit === "fill" ? (
                                  <div className="mt-3 space-y-3">
                                    <div>
                                      <label className="text-xs text-white/50">裁切缩放</label>
                                      <div className="mt-2 flex items-center gap-2">
                                        <Input
                                          type="range"
                                          min={1}
                                          max={3}
                                          step={0.01}
                                          value={activeMeta.crop.scale}
                                          onChange={(event) =>
                                            updateActiveImageCrop({
                                              scale: Number(event.target.value),
                                            })
                                          }
                                          className="h-8 flex-1"
                                        />
                                        <span className="w-12 shrink-0 text-right text-sm tabular-nums text-white/60">
                                          {activeMeta.crop.scale.toFixed(2)}x
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs text-white/50">水平焦点</label>
                                      <div className="mt-2 flex items-center gap-2">
                                        <Input
                                          type="range"
                                          min={0}
                                          max={1}
                                          step={0.01}
                                          value={activeMeta.crop.x}
                                          onChange={(event) =>
                                            updateActiveImageCrop({
                                              x: Number(event.target.value),
                                            })
                                          }
                                          className="h-8 flex-1"
                                        />
                                        <span className="w-10 shrink-0 text-right text-sm tabular-nums text-white/60">
                                          {Math.round(activeMeta.crop.x * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-xs text-white/50">垂直焦点</label>
                                      <div className="mt-2 flex items-center gap-2">
                                        <Input
                                          type="range"
                                          min={0}
                                          max={1}
                                          step={0.01}
                                          value={activeMeta.crop.y}
                                          onChange={(event) =>
                                            updateActiveImageCrop({
                                              y: Number(event.target.value),
                                            })
                                          }
                                          className="h-8 flex-1"
                                        />
                                        <span className="w-10 shrink-0 text-right text-sm tabular-nums text-white/60">
                                          {Math.round(activeMeta.crop.y * 100)}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-3 text-xs leading-5 text-white/42">
                                    当前是 Fit 模式，切到 Fill 后可裁切并调整焦点。
                                  </p>
                                )}
                                <label className="mt-3 block text-xs text-white/50">透明度</label>
                                <div className="mt-2 flex items-center gap-2">
                                  <Input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    value={activeMeta.opacity}
                                    onChange={(event) =>
                                      updateActiveObject({ opacity: Number(event.target.value) })
                                    }
                                    className="h-8 flex-1"
                                  />
                                  <span className="w-9 shrink-0 text-right text-sm tabular-nums text-white/60">
                                    {Math.round(activeMeta.opacity * 100)}%
                                  </span>
                                </div>
                              </div>
                              {/* 位置与尺寸 */}
                              <div className={cn(editorPanelMutedCardClass, "p-3")}>
                                <p className="mb-2 text-xs tracking-[0.16em] text-white/34">位置与尺寸</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-white/50">宽 W</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.width}
                                      onChange={(event) =>
                                        updateActiveDimensions({ width: Number(event.target.value) || 1 })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">高 H</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.height}
                                      onChange={(event) =>
                                        updateActiveDimensions({ height: Number(event.target.value) || 1 })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">X</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.x}
                                      onChange={(event) =>
                                        updateActiveDimensions({ x: Number(event.target.value) })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">Y</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.y}
                                      onChange={(event) =>
                                        updateActiveDimensions({ y: Number(event.target.value) })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {activeMeta.kind === "shape" ? (
                            <div className="space-y-3">
                              <div className={cn(editorPanelMutedCardClass, "p-3")}>
                                <p className="mb-2 text-xs tracking-[0.16em] text-white/34">样式</p>
                                {/* 填充 */}
                                <label className="text-xs text-white/50">填充</label>
                                <div className="mt-2 flex items-center gap-2">
                                  <ColorPickerPopover
                                    value={
                                      activeMeta.gradient
                                        ? { mode: "gradient", gradient: activeMeta.gradient }
                                        : { mode: "solid", hex: activeMeta.fill, alpha: activeMeta.fillAlpha }
                                    }
                                    onChange={(colorValue) => setActiveObjectFill(colorValue)}
                                    side="left"
                                    align="start"
                                  />
                                  <span className="truncate text-sm text-white/60">
                                    {activeMeta.gradient
                                      ? "渐变"
                                      : activeMeta.fillAlpha < 1
                                        ? `${activeMeta.fill.toUpperCase()} ${Math.round(activeMeta.fillAlpha * 100)}%`
                                        : activeMeta.fill.toUpperCase()}
                                  </span>
                                </div>
                                {/* 描边 */}
                                <label className="mt-3 block text-xs text-white/50">描边色</label>
                                <div className="mt-2 flex items-center gap-2">
                                  <ColorPickerPopover
                                    value={{ mode: "solid", hex: activeMeta.stroke ?? "#000000", alpha: activeMeta.strokeAlpha }}
                                    onChange={(colorValue) => {
                                      if (colorValue.mode === "solid") {
                                        updateActiveObject({ stroke: hexToRgba(colorValue.hex, colorValue.alpha) });
                                      }
                                    }}
                                    side="left"
                                    align="start"
                                  />
                                  <span className="truncate text-sm text-white/60">
                                    {activeMeta.strokeAlpha < 1
                                      ? `${(activeMeta.stroke ?? "#000000").toUpperCase()} ${Math.round(activeMeta.strokeAlpha * 100)}%`
                                      : (activeMeta.stroke ?? "#000000").toUpperCase()}
                                  </span>
                                </div>
                                {/* 描边宽度 / 圆角 */}
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-white/50">描边宽度</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.strokeWidth}
                                      onChange={(event) =>
                                        updateActiveObject({ strokeWidth: Number(event.target.value) || 0 })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                  {(activeMeta.shape === "rect" || activeMeta.shape === "square") ? (
                                    <div>
                                      <label className="text-xs text-white/50">圆角</label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={500}
                                        value={activeMeta.rx}
                                        onChange={(event) => {
                                          const r = Number(event.target.value) || 0;
                                          updateActiveObject({ rx: r, ry: r } as unknown as Partial<FabricObject> & Partial<Textbox>);
                                        }}
                                        className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                      />
                                    </div>
                                  ) : null}
                                </div>
                                {/* 透明度 */}
                                <div className="mt-3">
                                  <label className="text-xs text-white/50">透明度</label>
                                  <div className="mt-2 flex items-center gap-2">
                                    <Input
                                      type="range"
                                      min={0}
                                      max={1}
                                      step={0.01}
                                      value={activeMeta.opacity}
                                      onChange={(event) =>
                                        updateActiveObject({ opacity: Number(event.target.value) })
                                      }
                                      className="h-8 flex-1"
                                    />
                                    <span className="w-9 shrink-0 text-right text-sm tabular-nums text-white/60">
                                      {Math.round(activeMeta.opacity * 100)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {/* 位置与尺寸 */}
                              <div className={cn(editorPanelMutedCardClass, "p-3")}>
                                <p className="mb-2 text-xs tracking-[0.16em] text-white/34">位置与尺寸</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-white/50">宽 W</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.width}
                                      onChange={(event) =>
                                        updateActiveDimensions({ width: Number(event.target.value) || 1 })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">高 H</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.height}
                                      onChange={(event) =>
                                        updateActiveDimensions({ height: Number(event.target.value) || 1 })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">X</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.x}
                                      onChange={(event) =>
                                        updateActiveDimensions({ x: Number(event.target.value) })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">Y</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.y}
                                      onChange={(event) =>
                                        updateActiveDimensions({ y: Number(event.target.value) })
                                      }
                                      className="mt-2 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </EditorRailSection>

                      <EditorRailSection title="层级调整">
                        <div className={cn(editorPanelCardClass, "grid grid-cols-2 gap-2 p-3")}>
                          <EditorChromeButton
                            className="h-10 justify-center"
                            onClick={() => arrangeActiveObject("forward")}
                            disabled={!canArrange}
                          >
                            上移
                          </EditorChromeButton>
                          <EditorChromeButton
                            className="h-10 justify-center"
                            onClick={() => arrangeActiveObject("backward")}
                            disabled={!canArrange}
                          >
                            下移
                          </EditorChromeButton>
                          <EditorChromeButton
                            className="h-10 justify-center"
                            onClick={() => arrangeActiveObject("front")}
                            disabled={!canArrange}
                          >
                            移至最前
                          </EditorChromeButton>
                          <EditorChromeButton
                            className="h-10 justify-center"
                            onClick={() => arrangeActiveObject("back")}
                            disabled={!canArrange}
                          >
                            移至最底
                          </EditorChromeButton>
                        </div>
                      </EditorRailSection>
                    </div>
                  ) : activeBoard ? (
                    <Tabs defaultValue="properties" className="flex h-full flex-col">
                      <div className="shrink-0 border-b border-white/6 px-5 pt-3 pb-2">
                        <EditorTabsList className="grid w-full grid-cols-2">
                          <EditorTabsTrigger value="properties">基础</EditorTabsTrigger>
                          <EditorTabsTrigger value="ai">讲述</EditorTabsTrigger>
                        </EditorTabsList>
                      </div>
                      <TabsContent
                        value="properties"
                        className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5"
                      >
                        <div className="space-y-1.5">
                          <p className="text-xs text-white/40">画板名称</p>
                          <Input
                            value={activeBoard.name}
                            onChange={(event) =>
                              updateActiveBoard({ name: event.target.value })
                            }
                            className="h-10 rounded-xl border-white/8 bg-secondary text-sm text-white"
                            placeholder="画板名称"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-white/50">
                          <span>尺寸</span>
                          <span className="text-white/78">
                            {activeBoard.frame.width} × {activeBoard.frame.height}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/50">底色</span>
                          <ColorPickerPopover
                            value={{ mode: "solid", ...parseColorString(activeBoard.frame.background) }}
                            onChange={(cv) => {
                              if (cv.mode === "solid") {
                                updateActiveBoard({ frameBackground: hexToRgba(cv.hex, cv.alpha) });
                              }
                            }}
                            side="left"
                            align="start"
                          />
                          <span className="truncate text-sm text-white/60">
                            {parseColorString(activeBoard.frame.background).hex.toUpperCase()}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-white/50">
                          <span>画面内容</span>
                          <span className="text-white/78">
                            {activeBoardNodeStats.text} 文本 · {activeBoardNodeStats.image} 图片 · {activeBoardNodeStats.shape} 形状
                          </span>
                        </div>

                        {activeBoardStructureLabel ? (
                          <div className="flex items-center gap-3 text-xs text-white/50">
                            <span>结构来源</span>
                            <span className="truncate text-white/78" title={activeBoardStructureLabel}>
                              {activeBoardStructureLabel}
                            </span>
                          </div>
                        ) : null}

                        {/* 画板锁定：开启后不参与任何 AI 写操作 */}
                        <button
                          type="button"
                          onClick={() =>
                            updateActiveBoard({ locked: !activeBoard.locked })
                          }
                          aria-pressed={Boolean(activeBoard.locked)}
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                            activeBoard.locked
                              ? "border-white/14 bg-white/8 text-white"
                              : "border-white/6 bg-white/2 text-white/70 hover:bg-white/4 hover:text-white"
                          )}
                        >
                          <span className="flex items-center gap-2 text-sm">
                            <Lock className="h-3.5 w-3.5" />
                            画板锁定
                          </span>
                          <span
                            className={cn(
                              "relative h-5 w-9 rounded-full border transition-colors",
                              activeBoard.locked
                                ? "border-white/20 bg-white/80"
                                : "border-white/10 bg-white/8"
                            )}
                          >
                            <span
                              className={cn(
                                "absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all",
                                activeBoard.locked ? "left-[18px]" : "left-[2px]"
                              )}
                            />
                          </span>
                        </button>
                        <p className="-mt-2 text-xs leading-relaxed text-white/36">
                          锁定后，该画板不参与生成排版 / 更新排版 / 重新生成等任何 AI 写操作。
                        </p>

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => deleteBoard(activeBoard.id)}
                            disabled={scene.boards.length <= 1}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/4 px-3 text-xs text-red-200/80 transition-colors hover:border-red-400/40 hover:bg-red-400/8 hover:text-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            删除当前画板
                          </button>
                        </div>
                      </TabsContent>

                      <TabsContent
                        value="ai"
                        className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-5"
                      >
                        <div className="space-y-1.5">
                          <p className="text-xs text-white/40">讲述目标</p>
                          <Textarea
                            value={activeBoard.intent}
                            onChange={(event) =>
                              updateActiveBoard({ intent: event.target.value })
                            }
                            className="min-h-[96px] rounded-xl border-white/8 bg-secondary text-sm text-white"
                            placeholder="写清这张画板要交代什么、重点结论是什么、希望读者先看到什么"
                          />
                          <p className="text-[11px] leading-relaxed text-white/36">
                            这里写的是给 AI 的讲述目标，不会直接显示在画板上。
                          </p>
                        </div>

                        {(activeBoard.contentSuggestions?.length ?? 0) > 0 ? (
                          <div className="rounded-xl border border-white/6 bg-white/2.5 p-3">
                            <p className="mb-2 text-xs tracking-[0.16em] text-white/30">推荐补充内容</p>
                            <ul className="space-y-1.5">
                              {activeBoard.contentSuggestions!.map((item, i) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <span className="mt-0.5 shrink-0 text-xs text-white/20">·</span>
                                  <span className="text-xs leading-relaxed text-white/55">{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <EditorEmptyState>
                            暂无内容建议。先补充讲述目标，或在左侧结构面板确认大纲后再回来查看。
                          </EditorEmptyState>
                        )}
                      </TabsContent>
                    </Tabs>
                  ) : (
                    <div className="p-4">
                      <EditorEmptyState>尚未选择画板。</EditorEmptyState>
                    </div>
                  )}
              </div>
            </div>
        </div>
      )}
      bottomStrip={setupMode ? undefined : (
        <div className="mx-auto flex w-[calc(100%-40px)] flex-col overflow-hidden rounded-[22px] border border-white/6 bg-background shadow-[0_24px_64px_-42px_rgba(0,0,0,0.82)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/6 px-4 py-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
              <div className="rounded-[12px] border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white/76">
                缩略图预览
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-[11px] leading-5 text-white/42">
                <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5 text-white/70">
                  {generationScopeSummary}
                </span>
                <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5">
                  共 {scene.boardOrder.length} 张
                </span>
                {showBoardGroupHeaders ? (
                  <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5">
                    已按结构分组
                  </span>
                ) : null}
                {activeBoard ? (
                  <span
                    className="max-w-[220px] truncate rounded-full border border-white/8 bg-white/4 px-2.5 py-0.5"
                    title={activeBoard.name}
                  >
                    当前编辑：{activeBoard.name}
                  </span>
                ) : null}
              </div>
            </div>
            <p className="basis-full text-[11px] leading-5 text-white/38">
              底部只负责预览当前顺序和勾选本轮生成范围；标题、状态和分组信息请在左侧查看。
            </p>
          </div>
          <div className="overflow-x-auto px-4 py-4">
            <div className="flex items-stretch gap-2">
              {boardGroupRuns.map((run) => (
                <div key={run.key} className="flex shrink-0 flex-col gap-1.5">
                  {getBoardGroupRunLabel(run, {
                    showUngrouped: showBoardGroupHeaders,
                  }) ? (
                    <div className="px-1">
                      <p className="truncate text-[11px] font-medium tracking-[0.16em] text-white/36">
                        {getBoardGroupRunLabel(run, {
                          showUngrouped: showBoardGroupHeaders,
                        })}
                      </p>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-1.5">
                    {run.boards.map((board) => {
                      const index = scene.boardOrder.indexOf(board.id);
                      const thumbnailUrl = boardThumbnailMap.get(board.id) ?? null;
                      const isLive = Boolean(liveThumbnails[board.id]);
                      return (
                        <FilmstripCard
                          key={board.id}
                          board={board}
                          index={index}
                          thumbnailUrl={thumbnailUrl}
                          isLive={isLive}
                          active={scene.activeBoardId === board.id}
                          canDelete={scene.boards.length > 1}
                          onSelect={() =>
                            setScene((current) =>
                              normalizeProjectEditorScene({ ...current, activeBoardId: board.id })
                            )
                          }
                          onDelete={() => deleteBoard(board.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      />
      {/* 错误 bar 只在画布模式下显示；向导模式下错误已在向导内部展示 */}
      {!setupMode && actionError ? (
        <div className="border-t border-red-300/12 bg-red-400/8 px-4 py-3 text-sm text-red-100">
          {actionError}
        </div>
      ) : null}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-2xl border-white/8 bg-card text-white">
          <DialogHeader>
            <DialogTitle>生成排版</DialogTitle>
            <DialogDescription className="text-white/56">
              系统会基于当前画板范围、项目上下文和包装模式生成新的排版建议，不会覆盖你已经摆好的单画板内容。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-white/70">
            <Card className="border-white/8 bg-white/3 shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="rounded-full border-white/8 bg-white/4 text-white">
                    生成范围
                  </Badge>
                  <Button
                    variant="outline"
                    className="h-9 rounded-full border-white/8 bg-white/4 text-white hover:bg-white/8"
                    onClick={() => void refreshGeneratePrecheck()}
                  >
                    重新检查
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {[
                    { mode: "current", label: "当前画板", detail: activeBoard?.name ?? "当前页" },
                    {
                      mode: "all",
                      label: "全部未锁定画板",
                      detail:
                        skippedLockedBoardsInScope.length > 0
                          ? `${Math.max(scene.boardOrder.length - skippedLockedBoardsInScope.length, 0)} 张会参与`
                          : `${scene.boardOrder.length} 张会参与`,
                    },
                  ].map((item) => (
                    <button
                      key={item.mode}
                      type="button"
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition-colors",
                        normalizedGenerationScope.mode === item.mode
                          ? "border-white/16 bg-white/10 text-white"
                          : "border-white/8 bg-background text-white/70 hover:bg-white/5"
                      )}
                      onClick={() => setGenerationMode(item.mode as "current" | "all")}
                    >
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-white/44">{item.detail}</p>
                    </button>
                  ))}
                </div>
                {skippedLockedBoardsInScope.length > 0 ? (
                  <div className="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-xs leading-5 text-white/70">
                    <div className="flex items-center gap-1.5 text-white/82">
                      <Lock className="h-3 w-3" />
                      <span>将跳过 {skippedLockedBoardsInScope.length} 个锁定画板</span>
                    </div>
                    <p className="mt-1 text-white/50">
                      {skippedLockedBoardsInScope.map((b) => b.name).join("、")}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-white/3 shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="rounded-full border-white/8 bg-white/4 text-white">
                    预检
                  </Badge>
                  {generatePrecheck ? (
                    <Badge variant="outline" className="rounded-full border-white/8 bg-white/4 text-white">
                      {generatePrecheck.suggestedMode === "reuse"
                        ? "可复用"
                        : generatePrecheck.suggestedMode === "block"
                          ? "当前受限"
                          : "可继续"}
                    </Badge>
                  ) : null}
                </div>
                {checkingPrecheck ? (
                  <div className="flex items-center gap-2 text-white/54">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在检查当前输入是否可复用、是否会计次。
                  </div>
                ) : generatePrecheck ? (
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "rounded-xl border px-3 py-3 text-sm leading-6",
                        generatePrecheck.suggestedMode === "block"
                          ? "border-amber-300/14 bg-amber-400/8 text-amber-50"
                          : "border-white/8 bg-background text-white/76"
                      )}
                    >
                      <p className="font-medium text-white">
                        {generatePrecheck.suggestedMode === "reuse"
                          ? "当前命中了可复用排版结果。"
                          : generatePrecheck.suggestedMode === "block"
                            ? generatePrecheck.blockReason === "active_project_limit"
                              ? "当前账期可激活 Project 已用完。"
                              : "当前 Project 的排版次数已用完。"
                            : `本次属于高成本动作：${generatePrecheck.actionLabel}`}
                      </p>
                      <p className="mt-1 text-white/58">
                        {generatePrecheck.suggestedMode === "reuse"
                          ? "系统会优先回到上一版可复用结果，本次不会额外计次。"
                          : generatePrecheck.suggestedMode === "block"
                            ? generatePrecheck.blockReason === "active_project_limit"
                              ? "需要先补充可激活项目额度，才能正式执行排版生成。"
                              : "需要先补充当前 Project 的排版额度，或先继续手动整理。"
                            : "若继续执行，系统会基于当前范围、当前风格和项目上下文生成新的排版建议。"}
                      </p>
                    </div>

                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="rounded-xl border border-white/8 bg-background px-3 py-3">
                        <p className="text-xs text-white/38">本次会消耗</p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {generatePrecheck.consumesQuota
                            ? `${generatePrecheck.actionLabel} 1 次`
                            : "命中复用，不额外计次"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-background px-3 py-3">
                        <p className="text-xs text-white/38">执行后剩余</p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {generatePrecheck.remainingAfterAction} 次
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-background px-3 py-3">
                        <p className="text-xs text-white/38">失败是否计次</p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {generatePrecheck.failureCounts ? "失败也计次" : "失败不计次"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/8 bg-background px-3 py-3">
                        <p className="text-xs text-white/38">
                          {generatePrecheck.projectActivated ? "当前 Project 剩余" : "当前账期剩余可激活 Project"}
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {generatePrecheck.projectActivated
                            ? `${generatePrecheck.actionRemaining} 次`
                            : `${generatePrecheck.activeProjectRemaining} 个`}
                        </p>
                      </div>
                    </div>

                    {generatePrecheck.reusableDraftId ? (
                      <p className="text-xs leading-5 text-white/46">
                        已找到一版可复用结果。点击主按钮时，系统会优先复用，而不是盲目重跑。
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p>打开弹窗后会自动做一次预检。</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-white/3 shadow-none">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm font-medium text-white">风格参考</p>
                  <p className="mt-1 text-sm leading-6 text-white/50">
                    风格参考只影响标题层级、留白密度和包装样式，不改变当前画板结构。
                  </p>
                </div>
                <Separator className="my-4 bg-white/6" />

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      styleSelection.source === "none"
                        ? "border-white/16 bg-white/10 text-white"
                        : "border-white/8 bg-background text-white/70 hover:bg-white/5"
                    )}
                    onClick={() => setStyleSelection({ source: "none" })}
                  >
                    <p className="text-sm font-medium">不使用风格参考</p>
                    <p className="mt-1 text-xs leading-5 text-white/44">保持默认中性风格，优先稳定生成结构。</p>
                  </button>
                  {STYLE_PRESETS.slice(0, 3).map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition-colors",
                        styleSelection.source === "preset" && styleSelection.presetKey === preset.key
                          ? "border-white/16 bg-white/10 text-white"
                          : "border-white/8 bg-background text-white/70 hover:bg-white/5"
                      )}
                      onClick={() => setStyleSelection({ source: "preset", presetKey: preset.key })}
                    >
                      <p className="text-sm font-medium">{preset.label}</p>
                      <p className="mt-1 text-xs leading-5 text-white/44">{preset.description}</p>
                    </button>
                  ))}
                  {initialData.styleReferenceSets.slice(0, 2).map((set) => (
                    <button
                      key={set.id}
                      type="button"
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition-colors md:col-span-2",
                        styleSelection.source === "reference_set" && styleSelection.referenceSetId === set.id
                          ? "border-white/16 bg-white/10 text-white"
                          : "border-white/8 bg-background text-white/70 hover:bg-white/5"
                      )}
                      onClick={() =>
                        setStyleSelection({
                          source: "reference_set",
                          referenceSetId: set.id,
                          referenceSetName: set.name,
                        })
                      }
                    >
                      <p className="text-sm font-medium">{set.name}</p>
                      <p className="mt-1 text-xs leading-5 text-white/44">
                        {set.description ?? `引用 ${set.imageUrls.length} 张风格参考图。`}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button
              variant="outline"
              className="rounded-full border-white/8 bg-white/3 text-white hover:bg-white/8"
              onClick={() => closeGenerateDialog()}
            >
              先继续手动整理
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-white/8 bg-white/3 text-white hover:bg-white/8"
              onClick={() => openGenerateFollowup(planSummary.href)}
            >
              {planSummary.ctaLabel}
            </Button>
            {generatePrecheck?.suggestedMode === "block" ? (
              <Button
                variant="outline"
                className="rounded-full border-white/8 bg-white/3 text-white hover:bg-white/8"
                onClick={() => openGenerateFollowup("/pricing")}
              >
                去补充 / 升级
              </Button>
            ) : null}
            <Button
              className="rounded-full bg-white text-neutral-950 hover:bg-neutral-100"
              onClick={() => void handleGenerateLayout()}
              disabled={
                generating ||
                checkingPrecheck ||
                generatePrecheck?.suggestedMode === "block"
              }
            >
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {generatePrecheck?.suggestedMode === "reuse"
                ? "复用结果"
                : generatePrecheck?.actionLabel ?? "开始生成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function LockedChip({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/6 bg-white/[0.04] px-3.5 py-2.5",
        className
      )}
    >
      <div className="text-xs text-white/35">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-white/84">{value}</div>
    </div>
  );
}

function SetupContextSidebar({
  projectName,
  facts,
}: {
  projectName: string;
  facts: ProjectEditorInitialData["facts"];
}) {
  const audienceLabel =
    AUDIENCE_OPTIONS.find((o) => o.value === facts.audience)?.label ?? "—";
  const platformLabel =
    PLATFORM_OPTIONS.find((o) => o.value === facts.platform)?.label ?? "—";
  const industryLabel =
    INDUSTRY_OPTIONS.find((o) => o.value === facts.industry)?.label ??
    facts.industry ??
    "—";
  const natureLabel =
    PROJECT_NATURE_OPTIONS.find((o) => o.value === facts.projectNature)?.label ?? "—";
  const involvementLabel =
    INVOLVEMENT_OPTIONS.find((o) => o.value === facts.involvementLevel)?.label ?? "—";

  return (
    <div className="flex h-full flex-col gap-5 px-5 py-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-white/30">
          项目准备阶段
        </p>
        <h2 className="mt-2 text-[17px] font-semibold leading-tight text-white/92">
          {projectName}
        </h2>
      </div>
      <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.14em] text-white/40">
            客观条件
          </span>
          <Lock className="h-3 w-3 text-white/30" />
        </div>
        <div className="space-y-2">
          <LockedChip label="受众" value={audienceLabel} />
          <LockedChip label="平台" value={platformLabel} />
          <LockedChip label="行业" value={industryLabel} />
          <LockedChip label="项目性质" value={natureLabel} />
          <LockedChip label="我的职责" value={involvementLabel} />
        </div>
        <p className="mt-4 text-xs leading-relaxed text-white/30">
          这些条件在创建项目时已锁定，不可更改。
        </p>
      </div>
    </div>
  );
}

function BoardThumbnailPlaceholder({
  board,
  index,
  variant,
}: {
  board: ProjectBoard;
  index: number;
  variant: "row" | "strip";
}) {
  // 优先展示画板里第一个 title/caption 文字，没有则回退到画板名。
  const titleNode = board.nodes.find(
    (node): node is ProjectBoardTextNode =>
      node.type === "text" && (node.role === "title" || node.role === "caption")
  );
  const previewText = titleNode?.text.trim() || board.name.trim() || "";
  const bg = board.frame.background || "#ffffff";
  const textSize = variant === "row" ? "text-[10px] leading-tight" : "text-[11px] leading-snug";
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden p-1.5"
      style={{ backgroundColor: bg }}
    >
      <span className="text-[9px] font-semibold tracking-[0.08em] text-black/35">
        {index + 1}
      </span>
      <span
        className={cn(
          "mt-0.5 line-clamp-2 break-words font-medium text-black/62",
          textSize
        )}
      >
        {previewText || "（空画板）"}
      </span>
    </div>
  );
}

function getBoardStatusLabel(status: ProjectBoard["status"]) {
  switch (status) {
    case "ready":
      return "已就绪";
    case "analyzed":
      return "已分析";
    case "needs_attention":
      return "待处理";
    case "draft":
      return "草稿";
    default:
      return "空白";
  }
}

function BoardStatusBadge({ board }: { board: ProjectBoard }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] leading-none",
        board.status === "ready"
          ? "border-emerald-300/18 bg-emerald-400/10 text-emerald-100"
          : board.status === "needs_attention"
            ? "border-amber-300/18 bg-amber-400/10 text-amber-100"
            : "border-white/8 bg-white/6 text-white/52"
      )}
    >
      {board.aiMarkers.hasPendingSuggestion ? <Sparkles className="h-2.5 w-2.5" /> : null}
      {getBoardStatusLabel(board.status)}
    </span>
  );
}

function BoardListRow({
  board,
  index,
  thumbnailUrl,
  isLive,
  active,
  canDelete,
  onSelect,
  onDelete,
}: {
  board: ProjectBoard;
  index: number;
  thumbnailUrl: string | null;
  isLive: boolean;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: board.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const resolvedThumb = thumbnailUrl
    ? isLive
      ? thumbnailUrl
      : buildPrivateBlobProxyUrl(thumbnailUrl)
    : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-2 rounded-[18px] border px-2 py-2 transition-all duration-150",
        active
          ? "border-white/16 bg-white/8 text-white shadow-[0_18px_30px_-24px_rgba(0,0,0,0.86)]"
          : "border-white/8 bg-white/3 text-white/72 hover:border-white/12 hover:bg-white/5 hover:text-white/84",
        isDragging && "scale-[1.01] opacity-80 shadow-[0_20px_36px_-22px_rgba(0,0,0,0.9)]"
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex h-8 min-w-8 shrink-0 cursor-grab items-center justify-center rounded-lg border border-white/8 bg-white/4 px-2 text-[11px] text-white/54 transition-colors hover:border-white/14 hover:text-white/82 active:cursor-grabbing",
          active && "border-white/14 text-white/74"
        )}
        {...attributes}
        {...listeners}
        aria-label="拖拽调整画板顺序"
      >
        {index + 1}
      </button>

      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <div
          className={cn(
            "flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border bg-background transition-all duration-200",
            active
              ? "border-white/16 shadow-[0_10px_18px_-14px_rgba(255,255,255,0.18)]"
              : "border-white/8 group-hover:border-white/12"
          )}
        >
          {resolvedThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resolvedThumb}
              alt={board.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <BoardThumbnailPlaceholder board={board} index={index} variant="row" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {board.name}
          </p>
          <p className="mt-1 truncate text-xs text-white/44">
            {board.intent || "未填写意图"}
          </p>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        {board.locked ? (
          <span className="inline-flex h-7 items-center rounded-full border border-white/10 bg-white/4 px-2 text-[10px] text-white/52">
            <Lock className="mr-1 h-3 w-3" />
            已锁定
          </span>
        ) : null}
        <BoardStatusBadge board={board} />
      </div>

      {canDelete ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/40 opacity-0 transition-all duration-150 hover:bg-white/8 hover:text-red-300 group-hover:opacity-100"
          aria-label="删除画板"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

function FilmstripCard({
  board,
  index,
  thumbnailUrl,
  isLive,
  active,
  canDelete,
  onSelect,
  onDelete,
}: {
  board: ProjectBoard;
  index: number;
  thumbnailUrl: string | null;
  isLive: boolean;
  active: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const resolvedThumb = thumbnailUrl
    ? isLive
      ? thumbnailUrl
      : buildPrivateBlobProxyUrl(thumbnailUrl)
    : null;

  return (
    <div
      className="group relative shrink-0"
    >
      <EditorStripButton
        active={active}
        className={cn(
          "relative w-[88px] rounded-[16px] p-1.5 transition-all duration-200",
          active && "-translate-y-px shadow-[0_14px_26px_-18px_rgba(255,255,255,0.12)]"
        )}
        onClick={onSelect}
      >
        <div
          className={cn(
            "overflow-hidden rounded-[12px] border bg-background transition-all duration-200",
            active
              ? "border-white/18 shadow-[0_12px_18px_-14px_rgba(255,255,255,0.16)]"
              : "border-white/8 group-hover:border-white/12"
          )}
        >
          {resolvedThumb ? (
            <div className="aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedThumb}
                alt={board.name}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="aspect-video">
              <BoardThumbnailPlaceholder board={board} index={index} variant="strip" />
            </div>
          )}
        </div>
        <p className="mt-1 truncate text-xs text-white/46">{index + 1}</p>
        {active ? (
          <div className="pointer-events-none absolute inset-x-5 bottom-4 h-[2px] rounded-full bg-white/70" />
        ) : null}
      </EditorStripButton>
      {canDelete ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/12 bg-background/95 text-white/60 opacity-0 transition-all duration-150 hover:border-red-300/40 hover:text-red-300 group-hover:opacity-100"
          aria-label="删除画板"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

function SortableLayerRow({
  item,
  selected,
  onSelect,
  onOpenMenu,
}: {
  item: LayerItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpenMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 rounded-[18px] border px-2 py-2 transition-all duration-150",
        selected
          ? "border-white/40 bg-white/9 text-white shadow-[0_16px_30px_-22px_rgba(0,0,0,0.8)] ring-1 ring-white/6"
          : "border-white/8 bg-white/2 text-white/72 hover:border-white/12 hover:bg-white/5 hover:text-white/82",
        isDragging ? "scale-[1.01] opacity-80 shadow-[0_20px_36px_-22px_rgba(0,0,0,0.9)]" : "opacity-100"
      )}
      role="listitem"
    >
      <button
        type="button"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl border transition-colors",
          selected
            ? "border-white/12 bg-white/9 text-white"
            : "border-white/6 bg-white/4 text-white/60 hover:bg-white/8 hover:text-white"
        )}
        {...attributes}
        {...listeners}
        aria-label="拖拽排序"
      >
        <div className="grid grid-cols-2 gap-[3px]">
          {Array.from({ length: 6 }).map((_, index) => (
            <span
              key={index}
              className={cn("h-1 w-1 rounded-full transition-colors", selected ? "bg-white/70" : "bg-white/40")}
            />
          ))}
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="flex flex-1 items-center gap-2 text-left"
      >
        <div
          className={cn(
            "flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl border bg-background text-xs font-semibold transition-all",
            selected
              ? "border-white/18 text-white shadow-[0_10px_16px_-14px_rgba(255,255,255,0.18)]"
              : "border-white/8 text-white/70 group-hover:border-white/12"
          )}
        >
          {item.type === "image" && item.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={buildPrivateBlobProxyUrl(item.previewUrl)}
              alt={item.label}
              className="h-full w-full object-cover"
            />
          ) : item.type === "text" ? (
            "T"
          ) : (
            SHAPE_LABELS[item.shape ?? "rect"].slice(0, 1)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.label}</p>
          <p className="mt-0.5 text-xs text-white/36">
            {item.type === "image" ? "图片" : item.type === "text" ? "文本" : "形状"}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onOpenMenu}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-colors",
          selected
            ? "border-white/12 bg-white/8 text-white"
            : "border-white/8 bg-white/3 text-white/60 hover:bg-white/8 hover:text-white"
        )}
        aria-label="更多操作"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
