"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  horizontalListSortingStrategy,
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
  ProjectCreationGate,
  AUDIENCE_OPTIONS,
  PLATFORM_OPTIONS,
  INDUSTRY_OPTIONS,
  PROJECT_NATURE_OPTIONS,
  INVOLVEMENT_OPTIONS,
  type ProjectCreationGatePayload,
} from "@/components/editor/ProjectCreationGate";
import type { PlanSummaryCopy } from "@/lib/entitlement";
import type { BoundaryAnalysis } from "@/app/api/projects/[id]/boundary/analyze/route";
import type { CompletenessAnalysis } from "@/app/api/projects/[id]/completeness/analyze/route";
import type { PackageRecommendation } from "@/app/api/projects/[id]/package/recommend/route";
import type { LayoutJson } from "@/app/api/projects/[id]/layout/generate/route";
import {
  buildProjectSceneFromStructureSuggestion,
  createProjectBoard,
  createProjectImageNode,
  markBoardsAfterGeneration,
  markBoardsAsAnalyzed,
  createProjectShapeNode,
  createProjectTextNode,
  getGenerationScopeBoardIds,
  getSceneBoardById,
  mergeProjectLayoutDocument,
  normalizeProjectEditorScene,
  PROJECT_BOARD_HEIGHT,
  PROJECT_BOARD_WIDTH,
  PROJECT_SHAPE_TYPES,
  resolveProjectEditorScene,
  resolveProjectAssetMeta,
  type GenerationScope,
  type ProjectBoard,
  type ProjectBoardImageNode,
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
  suggestedMode: "continue" | "reuse" | "block";
  consumesQuota: boolean;
  failureCounts: boolean;
  activeProjectRemaining: number;
  actionRemaining: number;
  reusableDraftId: string | null;
  reusableTaskId?: string | null;
  generationScope?: GenerationScope;
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
const PROJECT_BOARD_MAX = 10;
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

function packageModeLabel(mode: string | null) {
  if (mode === "DEEP") return "深讲";
  if (mode === "LIGHT") return "浅讲";
  if (mode === "SUPPORTIVE") return "补充展示";
  return "待判断";
}

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

function getNextStepConclusion(params: {
  boundaryAnalysis: BoundaryAnalysis | null;
  completenessAnalysis: CompletenessAnalysis | null;
  layout: LayoutJson | null;
  packageMode: string | null;
  packageRecommendation: PackageRecommendation | null;
  selectedAssetCount: number;
}) {
  const {
    boundaryAnalysis,
    completenessAnalysis,
    layout,
    packageMode,
    packageRecommendation,
    selectedAssetCount,
  } = params;

  if (layout?.pages?.length) {
    return "当前项目已经拿到排版建议。继续细调单画板内容，再决定要不要发起新一轮生成。";
  }
  if (selectedAssetCount === 0) {
    return "先上传并插入几张关键素材，再运行项目诊断，让系统理解当前项目。";
  }
  if (!boundaryAnalysis || !completenessAnalysis || !packageRecommendation) {
    return "先运行项目诊断，让系统基于当前画板上下文补齐边界、完整度和包装模式判断。";
  }
  if (!completenessAnalysis.canProceed) {
    return (
      completenessAnalysis.prioritySuggestions[0] ??
      "先把当前画板里的关键信息补齐，再继续排版。"
    );
  }
  if (!packageMode) {
    return `建议先确认“${packageModeLabel(packageRecommendation.recommendedMode)}”模式，再生成排版建议。`;
  }
  return "当前信息已经够用，可以直接以当前画板范围继续生成排版建议。";
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
  const [boundaryAnalysis, setBoundaryAnalysis] = useState(initialData.boundaryAnalysis);
  const [completenessAnalysis, setCompletenessAnalysis] = useState(
    initialData.completenessAnalysis
  );
  const [packageRecommendation, setPackageRecommendation] = useState(
    initialData.packageRecommendation
  );
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
  const [setupMode, setSetupMode] = useState(
    () => scene.boards.length === 0 && !initialData.layout?.structureSuggestion?.confirmedAt
  );
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
  const [diagnosisDrawerOpen, setDiagnosisDrawerOpen] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
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
  const [leftPanel, setLeftPanel] = useState<LeftPanelKey | null>("project");
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

  const [imageDetailsDraft, setImageDetailsDraft] = useState({ title: "", note: "" });
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
  const generationBoardIds = useMemo(() => getGenerationScopeBoardIds(scene), [scene]);
  const selectedAssets = useMemo(() => assets.filter((asset) => asset.selected), [assets]);
  const recognizedAssetIdSet = useMemo(
    () => new Set(materialRecognition?.recognizedAssetIds ?? []),
    [materialRecognition]
  );
  const pendingRecognitionAssets = useMemo(
    () => selectedAssets.filter((asset) => !recognizedAssetIdSet.has(asset.id)),
    [recognizedAssetIdSet, selectedAssets]
  );
  const aiHistory = useMemo(
    () =>
      [
        boundaryAnalysis
          ? { key: "boundary", label: "边界分析", summary: boundaryAnalysis.projectSummary }
          : null,
        completenessAnalysis
          ? {
              key: "completeness",
              label: "完整度检查",
              summary: completenessAnalysis.overallComment,
            }
          : null,
        packageRecommendation
          ? {
              key: "package",
              label: "包装模式推荐",
              summary: packageRecommendation.reasoning,
            }
          : null,
        layout?.narrativeSummary
          ? {
              key: "layout",
              label: "排版结果",
              summary: layout.narrativeSummary,
            }
          : null,
      ].filter(Boolean) as Array<{ key: string; label: string; summary: string }>,
    [boundaryAnalysis, completenessAnalysis, layout, packageRecommendation]
  );
  const currentConclusion = useMemo(
    () =>
      layout?.narrativeSummary ??
      packageRecommendation?.reasoning ??
      completenessAnalysis?.overallComment ??
      boundaryAnalysis?.projectSummary ??
      "先运行项目诊断，系统会基于当前画板上下文返回边界、完整度和包装模式建议。",
    [boundaryAnalysis, completenessAnalysis, layout, packageRecommendation]
  );
  const nextStepConclusion = useMemo(
    () =>
      getNextStepConclusion({
        boundaryAnalysis,
        completenessAnalysis,
        layout,
        packageMode,
        packageRecommendation,
        selectedAssetCount: selectedAssets.length,
      }),
    [boundaryAnalysis, completenessAnalysis, layout, packageMode, packageRecommendation, selectedAssets.length]
  );
  const aiHighlights = useMemo(
    () =>
      [
        ...(boundaryAnalysis?.suggestions ?? []),
        ...(packageRecommendation?.reasoning ? [packageRecommendation.reasoning] : []),
      ].slice(0, 3),
    [boundaryAnalysis?.suggestions, packageRecommendation?.reasoning]
  );
  const aiIssues = useMemo(
    () =>
      [
        ...(boundaryAnalysis?.risks ?? []),
        ...(completenessAnalysis?.prioritySuggestions ?? []),
      ].slice(0, 4),
    [boundaryAnalysis?.risks, completenessAnalysis?.prioritySuggestions]
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
  function updateActiveBoard(patch: Partial<Pick<ProjectBoard, "name" | "intent">> & {
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
      let nextScope = current.generationScope;
      if (nextScope.mode === "selected") {
        const filtered = nextScope.boardIds.filter((id) => id !== boardId);
        nextScope =
          filtered.length === 0
            ? { mode: "current", boardIds: [nextActiveId] }
            : { mode: "selected", boardIds: filtered };
      } else if (nextScope.mode === "current" && wasActive) {
        nextScope = { mode: "current", boardIds: [nextActiveId] };
      } else if (nextScope.mode === "all") {
        nextScope = { mode: "all", boardIds: nextOrder };
      }
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

      if (mode === "selected") {
        const selectedIds =
          current.generationScope.mode === "selected" && current.generationScope.boardIds.length > 0
            ? current.generationScope.boardIds
            : [current.activeBoardId];
        return normalizeProjectEditorScene({
          ...current,
          generationScope: { mode: "selected", boardIds: selectedIds },
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
            generationScope: scene.generationScope,
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

  function updateActiveDimensions(patch: { x?: number; y?: number; width?: number; height?: number }) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const activeObject = canvas.getActiveObject() as FabricObject | null;
    if (!activeObject || activeObject.type === "activeSelection") return;

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

  async function persistScene(sceneToSave: ProjectEditorScene, force = false) {
    const serialized = JSON.stringify(sceneToSave);
    if (!force && serialized === lastSavedSceneRef.current) {
      setSaveState("saved");
      return;
    }

    setSaveState("saving");
    const response = await fetch(`/api/projects/${initialData.id}/layout/scene`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editorScene: sceneToSave }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((data as { error?: string }).error ?? "画板保存失败");
    }

    lastSavedSceneRef.current = serialized;
    setLayout((current) =>
      mergeProjectLayoutDocument(current, { editorScene: sceneToSave }) as LayoutJson
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

  useEffect(() => {
    if (!didHydrateSceneRef.current) {
      didHydrateSceneRef.current = true;
      return;
    }

    const serialized = JSON.stringify(scene);
    if (serialized === lastSavedSceneRef.current) return;

    setSaveState("dirty");
    const timeout = window.setTimeout(() => {
      persistScene(scene).catch(() => setSaveState("error"));
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [scene]);

  useEffect(() => {
    if (!didHydrateFactsRef.current) {
      didHydrateFactsRef.current = true;
      return;
    }

    const serialized = JSON.stringify(projectFactsDraft);
    if (serialized === lastSavedFactsRef.current) return;

    setFactsSaveState("dirty");
    const timeout = window.setTimeout(() => {
      persistProjectFacts(projectFactsDraft).catch(() => setFactsSaveState("error"));
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [projectFactsDraft]);

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

  async function handleRunDiagnosis() {
    if (!activeBoard || diagnosing) return;
    setDiagnosing(true);
    setDiagnosisDrawerOpen(true);
    setActionError("");
    setActionMessage(null);

    try {
      await persistCurrentSceneForAction();
      const generationScope = scene.generationScope;
      const payload = JSON.stringify({ generationScope });
      const [boundaryResult, completenessResult, packageResult] = await Promise.allSettled([
        parseJsonResponse<{ analysis: BoundaryAnalysis }>(
          await fetch(`/api/projects/${initialData.id}/boundary/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          })
        ),
        parseJsonResponse<{ analysis: CompletenessAnalysis }>(
          await fetch(`/api/projects/${initialData.id}/completeness/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          })
        ),
        parseJsonResponse<{ recommendation: PackageRecommendation }>(
          await fetch(`/api/projects/${initialData.id}/package/recommend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          })
        ),
      ]);

      const failures: string[] = [];
      let successCount = 0;
      let nextCompleteness: CompletenessAnalysis | null = null;
      let nextBoundary: BoundaryAnalysis | null = null;

      if (boundaryResult.status === "fulfilled") {
        nextBoundary = boundaryResult.value.analysis;
        setBoundaryAnalysis(nextBoundary);
        successCount += 1;
      } else {
        failures.push(
          `边界分析：${boundaryResult.reason instanceof Error ? boundaryResult.reason.message : "失败"}`
        );
      }

      if (completenessResult.status === "fulfilled") {
        nextCompleteness = completenessResult.value.analysis;
        setCompletenessAnalysis(nextCompleteness);
        successCount += 1;
      } else {
        failures.push(
          `完整度检查：${completenessResult.reason instanceof Error ? completenessResult.reason.message : "失败"}`
        );
      }

      if (packageResult.status === "fulfilled") {
        setPackageRecommendation(packageResult.value.recommendation);
        successCount += 1;
      } else {
        failures.push(
          `包装模式推荐：${packageResult.reason instanceof Error ? packageResult.reason.message : "失败"}`
        );
      }

      if (successCount > 0) {
        const nextStatus =
          nextCompleteness?.canProceed === false || nextBoundary?.isBoundaryClean === false
            ? "needs_attention"
            : "analyzed";
        setScene((current) => markBoardsAsAnalyzed(current, generationBoardIds, nextStatus));
      }

      if (failures.length > 0) {
        setActionError(
          successCount > 0 ? `部分诊断已完成；${failures.join("；")}` : failures.join("；")
        );
      } else {
        setActionMessage({ tone: "info", text: "项目诊断已完成" });
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "项目诊断失败，请稍后重试");
    } finally {
      setDiagnosing(false);
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
    try {
      await persistCurrentSceneForAction();
      const recData = await parseJsonResponse<{ recognition: ProjectMaterialRecognition }>(
        await fetch(`/api/projects/${initialData.id}/recognition/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
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
      await persistScene(nextScene, true);

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
      const resolvedMode = packageMode ?? packageRecommendation?.recommendedMode ?? null;
      if (!resolvedMode) {
        setActionError("请先运行项目诊断，拿到包装模式建议后再生成排版。");
        return;
      }

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
            generationScope: scene.generationScope,
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
      setDiagnosisDrawerOpen(true);
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
      setActiveMeta({
        kind: "image",
        id: data.nodeId ?? "image",
        assetId: data.assetId ?? null,
        opacity: typeof current.opacity === "number" ? current.opacity : 1,
        x: Math.round(objX),
        y: Math.round(objY),
        width: Math.round(scaledW),
        height: Math.round(scaledH),
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
        acc.push(
          createProjectImageNode(data.assetId, {
            id: data.nodeId ?? newNodeId("image"),
            x: Math.round(left),
            y: Math.round(top),
            width: Math.round(width),
            height: Math.round(height),
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

  async function loadBoardIntoCanvas(board: ProjectBoard) {
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

      const naturalWidth = image.width || node.width;
      const naturalHeight = image.height || node.height;
      image.set({
        left: node.x,
        top: node.y,
        scaleX: node.width / naturalWidth,
        scaleY: node.height / naturalHeight,
      });
      image.data = {
        nodeId: node.id,
        nodeType: "image",
        assetId: node.assetId,
      };
      applyObjectChrome(image);
      canvas.add(image);
    }

    canvas.discardActiveObject();
    updateSelectionSummary(canvas);
    hydratingRef.current = false;
    scheduleFitSurface();
    scheduleThumbnailCapture();
  }

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function mountCanvas() {
      if (!hostRef.current || !viewportRef.current) return;
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

      const observer = new ResizeObserver(() => scheduleFitSurface());
      observer.observe(vp);

      canvas.on("selection:created", () => updateSelectionSummary(canvas));
      canvas.on("selection:updated", () => updateSelectionSummary(canvas));
      canvas.on("selection:cleared", () => updateSelectionSummary(canvas));
      canvas.on("object:modified", () => {
        syncActiveBoardFromCanvas();
        refreshLayerState(canvas);
        scheduleThumbnailCapture();
      });
      canvas.on("object:added", () => {
        syncActiveBoardFromCanvas();
        refreshLayerState(canvas);
        scheduleThumbnailCapture();
      });
      canvas.on("object:removed", () => {
        syncActiveBoardFromCanvas();
        refreshLayerState(canvas);
        scheduleThumbnailCapture();
      });
      canvas.on("text:changed", () => {
        syncActiveBoardFromCanvas();
        refreshLayerState(canvas);
        scheduleThumbnailCapture();
      });
      canvas.on("mouse:down", (event) => {
        const nativeEvent = event.e as globalThis.MouseEvent;
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

      setCanvasReady(true);

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
      };
    }

    void mountCanvas();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

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
  }, [activeBoard?.id, canvasReady]);

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
    };
    applyObjectChrome(image);
    canvas.add(image);
    canvas.setActiveObject(image);
    canvas.requestRenderAll();
    syncActiveBoardFromCanvas();
    updateSelectionSummary(canvas);
    setActionMessage({ tone: "info", text: "图片已插入当前画板" });
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
      if (newlyUploaded.length === 1) {
        await addAssetToCanvas(newlyUploaded[0].id);
        setActionMessage({ tone: "info", text: "图片已上传并插入当前画板" });
      } else {
        setActionMessage({
          tone: "info",
          text: `已上传 ${newlyUploaded.length || files.length} 张图片，可继续插入到当前画板`,
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
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
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeBoard?.id]);

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
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
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
            disabled={generating || diagnosing}
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
          {setupMode ? null : (
            <EditorChromeButton
              className="h-10 gap-2 border-white/8 bg-white/4 px-4 text-white/82 hover:bg-white/8 hover:text-white"
              onClick={() => void handleRunDiagnosis()}
              disabled={diagnosing || generating}
            >
              {diagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              项目诊断
            </EditorChromeButton>
          )}
        </div>
      }
      planSummary={planSummary}
      leftRailLabel={currentLeftPanelLabel}
      rightRailLabel={hasActiveInspector ? "对象属性" : "画板属性"}
      leftRailWidthClass={setupMode ? "w-[240px]" : leftPanel ? "w-[336px]" : "w-[56px]"}
      rightRailWidthClass="w-[288px]"
      hideLeftRailHeader
      leftRail={setupMode ? (
        <SetupContextSidebar projectName={initialData.name} facts={projectFactsDraft} />
      ) : (
        <div className="flex h-full min-h-0">
          <div className="flex w-[56px] shrink-0 flex-col items-center gap-2 border-r border-white/5 bg-background px-1.5 py-3.5 shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)]">
            {(setupMode
              ? LEFT_PANEL_ITEMS.filter((i) => i.key === "project" || i.key === "assets")
              : LEFT_PANEL_ITEMS
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
                              这里的内容会直接作为诊断和排版生成的上下文。
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
                                {group.sections.map((section) => (
                                  <div
                                    key={section.id}
                                    className="rounded-[18px] border border-white/6 bg-white/2 px-3.5 py-3"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <label className="text-xs text-white/34">小节标题</label>
                                        <Input
                                          value={section.title}
                                          onChange={(event) =>
                                            updateStructureSection(group.id, section.id, {
                                              title: event.target.value,
                                            })
                                          }
                                          className="mt-1.5 h-10 rounded-xl border-white/8 bg-secondary text-white"
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteStructureSection(group.id, section.id)}
                                        className="mt-5 h-9 w-9 rounded-xl text-white/56 hover:bg-white/6 hover:text-white"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
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
                                  </div>
                                ))}
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
                  <EditorRailSection title="画板列表">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleBoardDragEnd}
                    >
                      <SortableContext
                        items={scene.boardOrder}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          {scene.boardOrder.map((boardId, index) => {
                            const board = scene.boards.find((item) => item.id === boardId);
                            if (!board) return null;
                            const thumbnailUrl = boardThumbnailMap.get(board.id) ?? null;
                            const isLive = Boolean(liveThumbnails[board.id]);
                            return (
                              <SortableBoardRow
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
              hasExistingBoards={scene.boards.length > 0}
              onAiUnderstand={() => void handleWizardAiUnderstand()}
              onConfirmAndEnter={() => void handleWizardConfirmAndEnter()}
              onUploadAssets={handleOpenAssetUpload}
              onUpdateAssetTitle={handleRenameAsset}
              onUpdateAssetNote={handleUpdateAssetNote}
              onReturnToCanvas={() => { setSetupMode(false); setActionError(""); }}
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
        )} /* end canvas viewport ternary */
        </>}
      rightRail={setupMode ? undefined : (
        <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mt-0">
                  {hasActiveInspector ? (
                    <div className="h-full overflow-y-auto">
                      <EditorRailSection title="编辑">
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

                      <EditorRailSection title="图层排布">
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
                    <div className="h-full space-y-5 overflow-y-auto px-5 py-4">
                      <div className="space-y-2">
                        <Input
                          value={activeBoard.name}
                          onChange={(event) => updateActiveBoard({ name: event.target.value })}
                          className="h-10 rounded-xl border-white/8 bg-secondary text-sm text-white"
                          placeholder="画板名称"
                        />
                        <Textarea
                          value={activeBoard.intent}
                          onChange={(event) => updateActiveBoard({ intent: event.target.value })}
                          className="min-h-[72px] rounded-xl border-white/8 bg-secondary text-sm text-white"
                          placeholder="画板意图（这张画板要讲什么）"
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
                        <span>内容</span>
                        <span className="text-white/78">
                          {activeBoardNodeStats.text} 文本 · {activeBoardNodeStats.image} 图片 · {activeBoardNodeStats.shape} 形状
                        </span>
                      </div>

                      {/* AI 内容建议（来自结构建议的 purpose + recommendedContent） */}
                      {(activeBoard.contentSuggestions?.length ?? 0) > 0 ? (
                        <div className="rounded-xl border border-white/6 bg-white/2.5 p-3">
                          <p className="mb-2 text-xs tracking-[0.16em] text-white/30">AI 内容建议</p>
                          <ul className="space-y-1.5">
                            {activeBoard.contentSuggestions!.map((item, i) => (
                              <li key={i} className="flex items-start gap-1.5">
                                <span className="mt-0.5 shrink-0 text-xs text-white/20">·</span>
                                <span className="text-xs leading-relaxed text-white/50">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

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
                    </div>
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
        <div className="mx-auto flex w-[calc(100%-40px)] items-center gap-1.5 overflow-x-auto rounded-[22px] border border-white/6 bg-background p-1.5 shadow-[0_24px_64px_-42px_rgba(0,0,0,0.82)]">
          <div className="shrink-0 px-2.5">
            <p className="text-sm font-medium text-white/44">
              {scene.boards.length} / {PROJECT_BOARD_MAX}
            </p>
            <p className="mt-1 text-xs text-white/26">画板</p>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleBoardDragEnd}
          >
            <SortableContext items={scene.boardOrder} strategy={horizontalListSortingStrategy}>
              <div className="flex items-center gap-1.5">
                {scene.boardOrder.map((boardId, index) => {
                  const board = scene.boards.find((item) => item.id === boardId);
                  if (!board) return null;
                  const thumbnailUrl = boardThumbnailMap.get(board.id) ?? null;
                  const isLive = Boolean(liveThumbnails[board.id]);
                  return (
                    <SortableFilmstripCard
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
            </SortableContext>
          </DndContext>
          <button
            type="button"
            onClick={createBoard}
            disabled={scene.boards.length >= PROJECT_BOARD_MAX}
            className="flex h-full shrink-0 items-center justify-center self-stretch rounded-[16px] border border-dashed border-white/10 bg-white/2 px-4 text-white/36 transition-colors hover:border-white/20 hover:bg-white/5 hover:text-white/62 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="新建画板"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      />
      {/* 错误 bar 只在画布模式下显示；向导模式下错误已在向导内部展示 */}
      {!setupMode && actionError ? (
        <div className="border-t border-red-300/12 bg-red-400/8 px-4 py-3 text-sm text-red-100">
          {actionError}
        </div>
      ) : null}

      {/* 诊断结果 Drawer */}
      {diagnosisDrawerOpen ? (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setDiagnosisDrawerOpen(false)}
        >
          <div
            className="absolute inset-y-0 right-0 flex w-[360px] flex-col border-l border-white/6 bg-card shadow-[-24px_0_64px_-20px_rgba(0,0,0,0.72)] animate-in slide-in-from-right-4 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-white/90">项目诊断</p>
                <p className="mt-0.5 text-xs text-white/36">
                  {diagnosing ? "正在分析…" : "基于当前画板范围的诊断结论"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDiagnosisDrawerOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/8 bg-white/3 text-white/44 transition-colors hover:bg-white/8 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 内容 */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {diagnosing ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-white/36" />
                </div>
              ) : (
                <>
                  <EditorRailSection title="现状">
                    <Card className={cn(editorPanelCardClass, "text-white shadow-none")}>
                      <CardContent className="p-4 text-sm leading-7 text-white/84">
                        {currentConclusion}
                      </CardContent>
                    </Card>
                  </EditorRailSection>

                  <EditorRailSection title="亮点">
                    <div className="space-y-2">
                      {aiHighlights.length > 0 ? (
                        aiHighlights.map((point) => (
                          <Card key={point} className={cn(editorPanelCardClass, "text-white shadow-none")}>
                            <CardContent className="p-4 text-sm leading-7 text-white/84">
                              {point}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <EditorEmptyState>先运行项目诊断，系统会返回当前亮点和可讲的重点。</EditorEmptyState>
                      )}
                    </div>
                  </EditorRailSection>

                  <EditorRailSection title="问题">
                    <div className="space-y-2">
                      {aiIssues.length > 0 ? (
                        aiIssues.map((point) => (
                          <Card key={point} className={cn(editorPanelCardClass, "text-white shadow-none")}>
                            <CardContent className="p-4 text-sm leading-7 text-white/84">
                              {point}
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <EditorEmptyState>当前还没有明确问题项，或者你还没跑过诊断。</EditorEmptyState>
                      )}
                    </div>
                  </EditorRailSection>

                  <EditorRailSection title="下一步">
                    <Card className={cn(editorPanelCardClass, "text-white shadow-none")}>
                      <CardContent className="p-4 text-sm leading-7 text-white/84">
                        {nextStepConclusion}
                      </CardContent>
                    </Card>
                  </EditorRailSection>

                  <EditorRailSection title="生成判断">
                    <Card className={cn(editorPanelCardClass, "text-white shadow-none")}>
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {layout?.pages?.length
                              ? "已有排版建议"
                              : completenessAnalysis?.canProceed
                                ? "可以继续"
                                : "建议先补强"}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-white/56">
                            {layout?.pages?.length
                              ? `当前已有 ${layout.totalPages} 页排版建议，可继续结合单画板细调。`
                              : completenessAnalysis?.canProceed
                                ? "当前材料和事实已经够用，可以继续生成。"
                                : "先补足问题链、角色事实或结果证据，再发起下一轮生成更稳。"}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 rounded-full border-white/10 px-3 py-1 text-white",
                            (layout?.pages?.length || completenessAnalysis?.canProceed) &&
                              "border-white/18 bg-white/8 text-white"
                          )}
                        >
                          {layout?.pages?.length
                            ? "可继续"
                            : completenessAnalysis?.canProceed
                              ? "可生成"
                              : "待补强"}
                        </Badge>
                      </CardContent>
                    </Card>
                  </EditorRailSection>

                  {aiHistory.length > 1 ? (
                    <EditorRailSection title="历史">
                      <Card className={cn(editorPanelCardClass, "text-white shadow-none")}>
                        <CardContent className="p-4 text-sm leading-7 text-white/84">
                          已累计 {aiHistory.length} 条诊断记录，当前展示最新一次结果。
                        </CardContent>
                      </Card>
                    </EditorRailSection>
                  ) : null}
                </>
              )}
            </div>

            {/* 底部操作 */}
            <div className="border-t border-white/5 px-4 py-3">
              <button
                type="button"
                onClick={() => void handleRunDiagnosis()}
                disabled={diagnosing}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/8 bg-white/4 text-sm text-white/72 transition-colors hover:bg-white/8 hover:text-white disabled:pointer-events-none disabled:opacity-50"
              >
                {diagnosing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                重新诊断
              </button>
            </div>
          </div>
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
                <div className="grid gap-2 md:grid-cols-3">
                  {[
                    { mode: "current", label: "当前画板", detail: activeBoard?.name ?? "当前页" },
                    {
                      mode: "selected",
                      label: "已选画板",
                      detail:
                        scene.generationScope.mode === "selected"
                          ? `${scene.generationScope.boardIds.length} 张`
                          : "从底部缩略图勾选",
                    },
                    { mode: "all", label: "全部画板", detail: `${scene.boardOrder.length} 张` },
                  ].map((item) => (
                    <button
                      key={item.mode}
                      type="button"
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition-colors",
                        scene.generationScope.mode === item.mode
                          ? "border-white/16 bg-white/10 text-white"
                          : "border-white/8 bg-background text-white/70 hover:bg-white/5"
                      )}
                      onClick={() => setGenerationMode(item.mode as GenerationScope["mode"])}
                    >
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-white/44">{item.detail}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/8 bg-white/3 shadow-none">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="rounded-full border-white/8 bg-white/4 text-white">
                    预检
                  </Badge>
                  {generatePrecheck?.suggestedMode === "reuse" ? (
                    <Badge variant="outline" className="rounded-full border-white/8 bg-white/4 text-white">
                      可复用
                    </Badge>
                  ) : null}
                </div>
                {checkingPrecheck ? (
                  <div className="flex items-center gap-2 text-white/54">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在检查当前输入是否可复用、是否会计次。
                  </div>
                ) : generatePrecheck ? (
                  <>
                    <p>
                      {generatePrecheck.suggestedMode === "reuse"
                        ? "当前命中了可复用排版结果，这次继续生成不会额外计次。"
                        : `本次会消耗：${generatePrecheck.actionRemaining > 0 ? "当前项目排版 1 次" : "当前项目排版额度已用完"}`}
                    </p>
                    <p>若失败，不计次。</p>
                  </>
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
              onClick={() => setGenerateOpen(false)}
            >
              取消
            </Button>
            <Button
              className="rounded-full bg-white text-neutral-950 hover:bg-neutral-100"
              onClick={() => void handleGenerateLayout()}
              disabled={
                generating ||
                checkingPrecheck ||
                generatePrecheck?.suggestedMode === "block" ||
                (!packageMode && !packageRecommendation)
              }
            >
              {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              开始生成
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
    <div className={cn("rounded-lg bg-white/[0.04] px-2.5 py-1.5", className)}>
      <div className="text-xs text-white/35">{label}</div>
      <div className="mt-0.5 truncate text-xs font-medium text-white/80">{value}</div>
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
    <div className="flex h-full flex-col gap-4 px-4 py-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-white/30">
          项目准备阶段
        </p>
        <h2 className="mt-1.5 truncate text-[15px] font-semibold text-white/90">
          {projectName}
        </h2>
      </div>
      <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.14em] text-white/40">
            客观条件
          </span>
          <Lock className="h-3 w-3 text-white/30" />
        </div>
        <div className="space-y-1.5">
          <LockedChip label="受众" value={audienceLabel} />
          <LockedChip label="平台" value={platformLabel} />
          <LockedChip label="行业" value={industryLabel} />
          <LockedChip label="项目性质" value={natureLabel} />
          <LockedChip label="我的职责" value={involvementLabel} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/30">
          这些条件在创建项目时已锁定，不可更改。
        </p>
      </div>
    </div>
  );
}

function SortableBoardRow({
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
        isDragging ? "scale-[1.01] opacity-80 shadow-[0_20px_36px_-22px_rgba(0,0,0,0.9)]" : "opacity-100"
      )}
    >
      <button
        type="button"
        className={cn(
          "flex h-8 w-6 shrink-0 cursor-grab items-center justify-center rounded-lg text-white/40 transition-colors hover:text-white/80 active:cursor-grabbing",
          active && "text-white/70"
        )}
        {...attributes}
        {...listeners}
        aria-label="拖拽排序"
      >
        <GripVertical className="h-4 w-4" />
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
            <div className="h-full w-full bg-white" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">
            {index + 1}. {board.name}
          </p>
          <p className="mt-1 truncate text-xs text-white/44">
            {board.intent || "未填写意图"}
          </p>
        </div>
      </button>

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

function SortableFilmstripCard({
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
      {...attributes}
      {...listeners}
      className={cn(
        "group relative shrink-0 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-80"
      )}
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
            <div className="flex aspect-video items-center justify-center bg-white" />
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
          onPointerDown={(event) => event.stopPropagation()}
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
