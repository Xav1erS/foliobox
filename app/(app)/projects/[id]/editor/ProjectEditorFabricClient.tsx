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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
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
  Check,
  Plus,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
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
      fontSize: number;
      fontWeight: number;
      color: string;
      opacity: number;
    }
  | {
      kind: "image";
      id: string;
      assetId: string | null;
      opacity: number;
    }
  | {
      kind: "shape";
      id: string;
      shape: ProjectShapeType;
      fill: string;
      stroke: string | null;
      strokeWidth: number;
      opacity: number;
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
type RightRailPanel = "inspector" | "ai";

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

const STAGE_PADDING = 88;
const STAGE_TOP_INSET = 108;
const STAGE_SIDE_INSET = 28;
const STAGE_BOTTOM_INSET = 136;
const editorPanelCardClass =
  "rounded-[20px] border border-white/[0.08] bg-[#171411] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
const editorPanelMutedCardClass =
  "rounded-[18px] border border-white/[0.08] bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]";
const editorFloatingSurfaceClass =
  "rounded-[22px] border border-[#d8cfc4] bg-[#f4efe7] text-neutral-950 shadow-[0_18px_36px_-26px_rgba(0,0,0,0.32)]";
const editorPopupSurfaceClass =
  "rounded-[20px] border border-[#ddd3c8] bg-[#f4efe7] text-neutral-950 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.28)]";
const editorPopupItemClass =
  "flex w-full items-center justify-between rounded-[14px] px-3 py-2.5 text-left text-[13px] text-neutral-700 transition-colors hover:bg-[#ebe4da] hover:text-neutral-950";

function packageModeLabel(mode: string | null) {
  if (mode === "DEEP") return "深讲";
  if (mode === "LIGHT") return "浅讲";
  if (mode === "SUPPORTIVE") return "补充展示";
  return "待判断";
}

function syncCanvasDomSizing(canvas: FabricCanvas) {
  const runtimeCanvas = canvas as unknown as {
    wrapperEl?: HTMLDivElement;
    lowerCanvasEl?: HTMLCanvasElement;
    upperCanvasEl?: HTMLCanvasElement;
  };

  if (runtimeCanvas.wrapperEl) {
    runtimeCanvas.wrapperEl.style.position = "absolute";
    runtimeCanvas.wrapperEl.style.inset = "0";
    runtimeCanvas.wrapperEl.style.width = "100%";
    runtimeCanvas.wrapperEl.style.height = "100%";
    runtimeCanvas.wrapperEl.style.display = "block";
  }

  if (runtimeCanvas.lowerCanvasEl) {
    runtimeCanvas.lowerCanvasEl.style.width = "100%";
    runtimeCanvas.lowerCanvasEl.style.height = "100%";
    runtimeCanvas.lowerCanvasEl.style.display = "block";
  }

  if (runtimeCanvas.upperCanvasEl) {
    runtimeCanvas.upperCanvasEl.style.width = "100%";
    runtimeCanvas.upperCanvasEl.style.height = "100%";
    runtimeCanvas.upperCanvasEl.style.display = "block";
  }
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
  const [zoom, setZoom] = useState(1);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [projectFactsDraft, setProjectFactsDraft] = useState(initialData.facts);
  const [factsSaveState, setFactsSaveState] = useState<"saved" | "saving" | "dirty" | "error">(
    "saved"
  );
  const [structureSaveState, setStructureSaveState] = useState<
    "saved" | "saving" | "dirty" | "error"
  >("saved");
  const [applyingStructure, setApplyingStructure] = useState(false);
  const [rightPanel, setRightPanel] = useState<RightRailPanel>("inspector");
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
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const assetUploadRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const boardBackgroundRef = useRef<FabricObject | null>(null);
  const clipboardRef = useRef<FabricObject | ActiveSelection | null>(null);
  const hydratingRef = useRef(false);
  const boardLoadTokenRef = useRef(0);
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
        const assetId = getBoardThumbnailAssetId(board);
        return [board.id, assetId ? assetMap.get(assetId)?.imageUrl ?? null : null] as const;
      })
    );
  }, [assetMap, scene.boards]);
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
  const hasFloatingContext =
    activeMeta.kind === "text" || activeMeta.kind === "image" || activeMeta.kind === "shape";
  const showRightRail = hasActiveInspector || rightPanel === "ai";
  const currentLeftPanelLabel =
    LEFT_PANEL_ITEMS.find((item) => item.key === leftPanel)?.label ?? "工具栏";
  const currentLeftPanelMeta = LEFT_PANEL_ITEMS.find((item) => item.key === leftPanel) ?? null;
  const selectedImageAsset =
    activeMeta.kind === "image" && activeMeta.assetId
      ? assetMap.get(activeMeta.assetId) ?? null
      : null;
  const hasStructureInputs =
    assets.length > 0 ||
    Boolean(projectFactsDraft.projectType.trim()) ||
    Boolean(projectFactsDraft.industry.trim()) ||
    Boolean(projectFactsDraft.roleTitle.trim()) ||
    Boolean(projectFactsDraft.background.trim()) ||
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

  function toggleLeftPanel(panel: LeftPanelKey) {
    setLeftPanel((current) => (current === panel ? null : panel));
  }

  function createBoard() {
    const board = createProjectBoard({
      name: `画板 ${scene.boards.length + 1}`,
      intent: `${initialData.name} 的新画板`,
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

  function toggleBoardInSelection(boardId: string) {
    setScene((current) => {
      const currentIds =
        current.generationScope.mode === "selected"
          ? current.generationScope.boardIds
          : [boardId];
      const exists = currentIds.includes(boardId);
      const nextIds = exists
        ? currentIds.filter((value) => value !== boardId)
        : [...currentIds, boardId];

      if (nextIds.length === 0) {
        return normalizeProjectEditorScene({
          ...current,
          generationScope: { mode: "current", boardIds: [current.activeBoardId] },
        });
      }

      return normalizeProjectEditorScene({
        ...current,
        generationScope: { mode: "selected", boardIds: nextIds },
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
    const objects = (canvas.getObjects() as FabricSceneObject[]).filter(
      (object) => object !== boardBackgroundRef.current
    );
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
    const backgroundIndex = boardBackgroundRef.current
      ? objects.indexOf(boardBackgroundRef.current)
      : -1;
    const bottomIndex = backgroundIndex >= 0 ? backgroundIndex + 1 : 0;
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
    if (boardBackgroundRef.current) {
      canvas.sendObjectToBack(boardBackgroundRef.current);
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
    const objects = (canvas.getObjects() as FabricSceneObject[]).filter(
      (object) => object !== boardBackgroundRef.current
    );
    const objectMap = new Map(objects.map((object) => [object.data?.nodeId, object]));
    const orderedBottomToTop = [...nextItems].reverse();
    orderedBottomToTop.forEach((item, index) => {
      const object = objectMap.get(item.id);
      if (object) {
        const mover = object as unknown as { moveTo: (value: number) => void };
        mover.moveTo(index);
      }
    });
    if (boardBackgroundRef.current) {
      canvas.sendObjectToBack(boardBackgroundRef.current);
    }
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
    setRightPanel("ai");
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
      setRightPanel("ai");
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

  useEffect(() => {
    if (hasActiveInspector) {
      setRightPanel("inspector");
    }
  }, [hasActiveInspector]);

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
    if (data?.nodeType === "image") {
      setActiveMeta({
        kind: "image",
        id: data.nodeId ?? "image",
        assetId: data.assetId ?? null,
        opacity: typeof current.opacity === "number" ? current.opacity : 1,
      });
      return;
    }

    if (data?.nodeType === "text" || current.type === "textbox") {
      const textbox = current as unknown as Textbox;
      setActiveMeta({
        kind: "text",
        id: data?.nodeId ?? "text",
        text: textbox.text ?? "",
        fontSize: Number(textbox.fontSize) || 32,
        fontWeight: Number(textbox.fontWeight) || 500,
        color: String(textbox.fill ?? "#111111"),
        opacity: typeof textbox.opacity === "number" ? textbox.opacity : 1,
      });
      return;
    }

    if (data?.nodeType === "shape") {
      setActiveMeta({
        kind: "shape",
        id: data.nodeId ?? "shape",
        shape: data.shapeType ?? "rect",
        fill: typeof current.fill === "string" ? current.fill : "#111111",
        stroke: typeof current.stroke === "string" ? current.stroke : null,
        strokeWidth: typeof current.strokeWidth === "number" ? current.strokeWidth : 0,
        opacity: typeof current.opacity === "number" ? current.opacity : 1,
      });
      return;
    }

    setActiveMeta({ kind: "none" });
  }

  function applyCenteredZoom(canvas: FabricCanvas, nextZoom: number) {
    const width = workspaceRef.current?.clientWidth || canvas.getWidth();
    const height = workspaceRef.current?.clientHeight || canvas.getHeight();

    if (canvas.getWidth() !== width || canvas.getHeight() !== height) {
      canvas.setDimensions({ width, height });
      syncCanvasDomSizing(canvas);
    }

    const x = (width - PROJECT_BOARD_WIDTH * nextZoom) / 2;
    const y = (height - PROJECT_BOARD_HEIGHT * nextZoom) / 2;
    canvas.setViewportTransform([nextZoom, 0, 0, nextZoom, x, y]);
    canvas.calcOffset();
    setZoom(nextZoom);
    canvas.requestRenderAll();
  }

  function fitBoard(canvas: FabricCanvas) {
    const width = workspaceRef.current?.clientWidth || canvas.getWidth();
    const height = workspaceRef.current?.clientHeight || canvas.getHeight();
    const availableWidth = Math.max(width - STAGE_PADDING * 2, 240);
    const availableHeight = Math.max(height - STAGE_PADDING * 2, 240);
    const zoomToFit = Math.min(
      availableWidth / PROJECT_BOARD_WIDTH,
      availableHeight / PROJECT_BOARD_HEIGHT
    );
    applyCenteredZoom(canvas, clamp(zoomToFit, 0.2, 1.5));
  }

  function applyObjectChrome(target: FabricSceneObject) {
    target.set({
      borderColor: "rgba(244, 239, 232, 0.92)",
      borderScaleFactor: 1.2,
      borderOpacityWhenMoving: 0.95,
      cornerColor: "#f7f2eb",
      cornerStrokeColor: "#1a1714",
      transparentCorners: false,
      cornerStyle: "circle",
      cornerSize: 11,
      padding: 3,
      lockRotation: true,
    });
  }

  function serializeBoardFromCanvas(canvas: FabricCanvas, board: ProjectBoard): ProjectBoard {
    const objects = (canvas.getObjects() as FabricSceneObject[]).filter(
      (object) => object !== boardBackgroundRef.current
    );

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
            lineHeight: Number(textbox.lineHeight) || 1.3,
            align: (textbox.textAlign as ProjectBoardTextNode["align"]) ?? "left",
            color: String(textbox.fill ?? "#111111"),
            zIndex: index + 1,
          })
        );
        return acc;
      }

      if (data?.nodeType === "shape") {
        acc.push(
          createProjectShapeNode(data.shapeType ?? "rect", {
            id: data.nodeId ?? newNodeId("shape"),
            x: Math.round(left),
            y: Math.round(top),
            width: Math.round(width),
            height: Math.round(height),
            fill: typeof object.fill === "string" ? object.fill : "#111111",
            stroke: typeof object.stroke === "string" ? object.stroke : null,
            strokeWidth: typeof object.strokeWidth === "number" ? object.strokeWidth : 0,
            opacity: typeof object.opacity === "number" ? object.opacity : 1,
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
    canvas.backgroundColor = "#141311";

    const background = new fabric.Rect({
      left: 0,
      top: 0,
      width: PROJECT_BOARD_WIDTH,
      height: PROJECT_BOARD_HEIGHT,
      fill: "#ffffff",
      selectable: false,
      evented: false,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.22)",
        blur: 26,
        offsetX: 0,
        offsetY: 18,
      }),
    });
    boardBackgroundRef.current = background;
    canvas.add(background);
    canvas.sendObjectToBack(background);

    for (const node of board.nodes.sort((a, b) => a.zIndex - b.zIndex)) {
      if (node.type === "text") {
        const textbox = new fabric.Textbox(node.text, {
          left: node.x,
          top: node.y,
          width: node.width,
          fontSize: node.fontSize,
          fontWeight: String(node.fontWeight),
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
        applyObjectChrome(textbox);
        canvas.add(textbox);
        continue;
      }

      if (node.type === "shape") {
        let shape: FabricSceneObject | null = null;
        const base = {
          left: node.x,
          top: node.y,
          fill: node.fill,
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
          shape = new fabric.Rect({
            ...base,
            width: node.width,
            height: node.height,
            rx: node.shape === "square" ? 0 : 0,
            ry: node.shape === "square" ? 0 : 0,
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
    fitBoard(canvas);
    requestAnimationFrame(() => {
      if (canvasRef.current === canvas) {
        fitBoard(canvas);
      }
    });
    updateSelectionSummary(canvas);
    hydratingRef.current = false;
  }

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function mountCanvas() {
      if (!hostRef.current || !workspaceRef.current) return;
      const fabric = await import("fabric");
      if (disposed || !hostRef.current || !workspaceRef.current) return;

      fabricRef.current = fabric;
      const canvas = new fabric.Canvas(hostRef.current, {
        width: workspaceRef.current.clientWidth,
        height: workspaceRef.current.clientHeight,
        preserveObjectStacking: true,
        selection: true,
      });
      canvasRef.current = canvas;
      syncCanvasDomSizing(canvas);

      const resize = () => {
        if (!workspaceRef.current || !canvasRef.current) return;
        canvasRef.current.setDimensions({
          width: workspaceRef.current.clientWidth,
          height: workspaceRef.current.clientHeight,
        });
        syncCanvasDomSizing(canvasRef.current);
        fitBoard(canvasRef.current);
        requestAnimationFrame(() => {
          if (canvasRef.current) fitBoard(canvasRef.current);
        });
      };

      canvas.on("selection:created", () => updateSelectionSummary(canvas));
      canvas.on("selection:updated", () => updateSelectionSummary(canvas));
      canvas.on("selection:cleared", () => updateSelectionSummary(canvas));
      canvas.on("object:modified", () => {
        syncActiveBoardFromCanvas();
        refreshLayerState(canvas);
      });
      canvas.on("object:added", () => {
        syncActiveBoardFromCanvas();
        refreshLayerState(canvas);
      });
      canvas.on("object:removed", () => {
        syncActiveBoardFromCanvas();
        refreshLayerState(canvas);
      });
      canvas.on("text:changed", () => {
        syncActiveBoardFromCanvas();
        refreshLayerState(canvas);
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

      const observer = new ResizeObserver(resize);
      observer.observe(workspaceRef.current);

      setCanvasReady(true);
      if (activeBoard) {
        await loadBoardIntoCanvas(activeBoard);
      }

      cleanup = () => {
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
      fill: "#111111",
      editable: true,
    }) as unknown as FabricSceneObject;
    textbox.data = {
      nodeId: newNodeId("text"),
      nodeType: "text",
      role: "title",
    };
    applyObjectChrome(textbox);
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
        if (canvasRef.current) fitBoard(canvasRef.current);
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
      <EditorScaffold
      objectLabel=""
      objectName={initialData.name}
      backHref="/projects"
      backLabel="全部项目"
      statusLabel=""
      statusMeta=""
      topNote={`${sceneSaveLabel} · ${factsSaveLabel}`}
      primaryAction={
        <Button
          className="h-10 gap-2 rounded-full border border-white/[0.08] bg-[#f4efe8] px-4 text-neutral-950 shadow-[0_16px_28px_-18px_rgba(0,0,0,0.52)] hover:bg-[#f7f3ed]"
          onClick={() => void handleOpenGenerate()}
          disabled={generating || diagnosing}
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          生成排版
        </Button>
      }
      secondaryAction={
        <EditorChromeButton
          className="h-10 gap-2 border-white/[0.08] bg-white/[0.04] px-4 text-white/82 hover:bg-white/[0.08] hover:text-white"
          onClick={() => void handleRunDiagnosis()}
          disabled={diagnosing || generating}
        >
          {diagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
          项目诊断
        </EditorChromeButton>
      }
      planSummary={planSummary}
      leftRailLabel={currentLeftPanelLabel}
      rightRailLabel="属性"
      leftRailWidthClass={leftPanel ? "w-[448px]" : "w-[88px]"}
      hideLeftRailHeader
      leftRail={
        <div className="flex h-full min-h-0">
          <div className="flex w-[88px] shrink-0 flex-col items-center gap-2.5 border-r border-white/[0.05] bg-[#110f0d] px-2.5 py-3.5 shadow-[inset_-1px_0_0_rgba(255,255,255,0.02)]">
            {LEFT_PANEL_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = leftPanel === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleLeftPanel(item.key)}
                  title={item.label}
                  className={cn(
                    "group relative flex w-full flex-col items-center gap-1.5 rounded-[22px] border px-2 py-3.5 text-[11px] font-medium transition-all duration-200",
                    active
                      ? "translate-x-[1px] border-white/[0.14] bg-white/[0.09] text-white shadow-[0_18px_30px_-22px_rgba(0,0,0,0.9)]"
                      : "border-white/[0.06] bg-white/[0.02] text-white/52 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1/2 h-10 w-1 -translate-y-1/2 rounded-r-full transition-opacity duration-200",
                      active ? "bg-white/80 opacity-100" : "opacity-0 group-hover:opacity-60"
                    )}
                  />
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-[16px] border transition-all duration-200",
                      active
                        ? "border-white/[0.12] bg-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        : "border-white/[0.05] bg-transparent group-hover:border-white/[0.08] group-hover:bg-white/[0.04]"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="tracking-[0.02em]">{item.label}</span>
                </button>
              );
            })}
          </div>

          {leftPanel ? (
            <div className="min-w-0 flex-1 overflow-y-auto animate-in fade-in-0 slide-in-from-left-2 duration-200">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.05] bg-[#15120f] px-5 py-2 shadow-[0_10px_24px_-22px_rgba(0,0,0,0.82)]">
                <div className="min-w-0">
                  <p className="text-[10px] tracking-[0.18em] text-white/30">
                    {currentLeftPanelMeta?.label ?? "面板"}
                  </p>
                  {currentLeftPanelMeta ? (
                    <p className="mt-0.5 truncate text-[11px] text-white/36">{currentLeftPanelMeta.hint}</p>
                  ) : null}
                </div>
                <EditorChromeIconButton
                  className="h-8 w-8 border-white/[0.08] bg-white/[0.035] text-white/56 hover:bg-white/[0.08] hover:text-white"
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
                            <p className="mt-0.5 text-[11px] text-white/38">
                              这里的内容会直接作为诊断和排版生成的上下文。
                            </p>
                          </div>
                          <span
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px]",
                              factsSaveState === "error"
                                ? "border-red-300/20 bg-red-400/10 text-red-100"
                                : "border-white/[0.08] bg-white/[0.04] text-white/54"
                            )}
                          >
                            {factsSaveLabel}
                          </span>
                        </div>
                      </div>
                      <div className={cn(editorPanelCardClass, "space-y-1.5 p-3")}>
                        <div>
                          <label className="text-[11px] text-white/42">项目类型</label>
                          <Input
                            value={projectFactsDraft.projectType}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                projectType: event.target.value,
                              }))
                            }
                            placeholder="例如 SaaS 后台、品牌官网、移动端应用"
                            className="mt-1.5 h-9 rounded-2xl border-white/[0.08] bg-[#191613] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-white/42">所属行业</label>
                          <Input
                            value={projectFactsDraft.industry}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                industry: event.target.value,
                              }))
                            }
                            placeholder="例如 AI、教育、金融、消费品"
                            className="mt-1.5 h-9 rounded-2xl border-white/[0.08] bg-[#191613] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-white/42">我的角色</label>
                          <Input
                            value={projectFactsDraft.roleTitle}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                roleTitle: event.target.value,
                              }))
                            }
                            placeholder="例如 产品设计负责人、全栈开发、独立设计师"
                            className="mt-1.5 h-9 rounded-2xl border-white/[0.08] bg-[#191613] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-white/42">背景摘要</label>
                          <Textarea
                            value={projectFactsDraft.background}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                background: event.target.value,
                              }))
                            }
                            placeholder="说明项目背景、业务目标、目标用户、约束和挑战。"
                            className="mt-1.5 min-h-[96px] rounded-[20px] border-white/[0.08] bg-[#191613] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-white/42">结果摘要</label>
                          <Textarea
                            value={projectFactsDraft.resultSummary}
                            onChange={(event) =>
                              setProjectFactsDraft((current) => ({
                                ...current,
                                resultSummary: event.target.value,
                              }))
                            }
                            placeholder="补充最终结果、影响、亮点与可量化成果。"
                            className="mt-1.5 min-h-[88px] rounded-[20px] border-white/[0.08] bg-[#191613] text-white"
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
                        <p className="text-sm font-medium text-white">先导入设计图</p>
                        <p className="mt-1.5 text-xs leading-6 text-white/42">
                          这里上传的设计图会进入当前项目素材库，后续可直接插入画板，也会作为 AI 生成结构建议的重要上下文。
                        </p>
                        <Button
                          type="button"
                          onClick={handleOpenAssetUpload}
                          disabled={uploadingAssets}
                          className="mt-4 h-10 w-full rounded-2xl bg-white text-neutral-950 hover:bg-neutral-100"
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
                        className="h-10 rounded-2xl border-white/[0.08] bg-[#171411] text-white placeholder:text-white/28"
                      />
                      {pendingRecognitionAssets.length > 0 ? (
                        <div className={cn(editorPanelCardClass, "px-4 py-4")}>
                          <p className="text-sm font-medium text-white">有新增素材还没纳入识别</p>
                          <p className="mt-1.5 text-xs leading-6 text-white/42">
                            当前有 {pendingRecognitionAssets.length} 张新图还没被系统理解。建议先做增量识别，再决定是否刷新结构。
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {pendingRecognitionAssets.slice(0, 4).map((asset) => (
                              <span
                                key={asset.id}
                                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/58"
                              >
                                {asset.title ?? asset.id}
                              </span>
                            ))}
                          </div>
                          <Button
                            type="button"
                            onClick={() => void handleRecognizeIncrementalMaterials()}
                            disabled={recognizingIncremental}
                            className="mt-4 h-10 w-full rounded-2xl bg-white text-neutral-950 hover:bg-neutral-100"
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
                            className="group overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.03] text-left transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] hover:shadow-[0_18px_32px_-24px_rgba(0,0,0,0.82)]"
                          >
                            <div className="aspect-[4/3] overflow-hidden bg-black/30">
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
                          className="group overflow-hidden rounded-[16px] border border-white/[0.08] bg-white/[0.03] text-left transition-all duration-200 hover:border-white/[0.14] hover:bg-white/[0.06] hover:shadow-[0_18px_32px_-24px_rgba(0,0,0,0.82)]"
                        >
                          <div className="aspect-[4/3] overflow-hidden bg-black/30">
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
                      <div className="rounded-[18px] border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-6 text-sm text-white/46">
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
                        <p className="text-sm font-medium text-white">先让系统说它看到了什么</p>
                        <p className="mt-1.5 text-xs leading-6 text-white/42">
                          导入首批设计图后，先做一轮轻识别，判断这批素材更像什么、哪些更适合作为主讲位，以及当前最明显还缺什么。
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                            背景 {projectFactsDraft.background.trim() ? "已填写" : "待补充"}
                          </span>
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                            素材 {assets.length} 张
                          </span>
                          <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1">
                            诊断 {boundaryAnalysis || completenessAnalysis || packageRecommendation ? "已运行" : "未运行"}
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => void handleRecognizeMaterials()}
                          disabled={!hasStructureInputs || recognizingMaterials}
                          className="mt-4 h-10 w-full rounded-2xl bg-white text-neutral-950 hover:bg-neutral-100"
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
                            <p className="mt-2 text-[11px] text-white/34">
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
                                  className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/58"
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
                            <p>建议下一步：{materialRecognition.suggestedNextStep}</p>
                          </div>
                          {materialRecognition.lastIncrementalDiff ? (
                            <div className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
                              <p className="text-xs font-medium text-white">最近一次增量变化</p>
                              <p className="mt-1.5 text-xs leading-6 text-white/48">
                                {materialRecognition.lastIncrementalDiff.summary}
                              </p>
                              {materialRecognition.lastIncrementalDiff.changes.length > 0 ? (
                                <div className="mt-3 space-y-1.5">
                                  {materialRecognition.lastIncrementalDiff.changes.map((change) => (
                                    <p key={change} className="text-[11px] leading-5 text-white/38">
                                      • {change}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                              <p className="mt-3 text-[11px] text-white/34">
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
                        <p className="text-sm font-medium text-white">先确认结构，再进入排版</p>
                        <p className="mt-1.5 text-xs leading-6 text-white/42">
                          轻识别后，AI 会结合项目背景、导入的设计图、当前画板上下文和诊断结果，给出这个项目在作品集里的结构分组建议。
                        </p>
                        <Button
                          type="button"
                          onClick={() => void handleSuggestStructure()}
                          disabled={!canSuggestStructure || suggestingStructure}
                          className="mt-4 h-10 w-full rounded-2xl bg-white text-neutral-950 hover:bg-neutral-100 disabled:bg-white/20 disabled:text-white/50"
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
                          <p className="mt-3 text-[11px] leading-5 text-white/34">
                            建议先完成一轮“识别这批素材”，再让 AI 起结构草稿。
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
                              <p className="text-sm font-medium text-white">先把结构草稿收成你认可的版本</p>
                              <p className="mt-1 text-xs leading-6 text-white/42">
                                这里可以删改分组、小节和叙事说明。确认后，后续落板和生成都优先参考当前结构。
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className="rounded-full border-white/[0.08] bg-white/[0.03] text-white/66"
                            >
                              {structureDraft.status === "confirmed" ? "已确认" : "草稿"}
                            </Badge>
                          </div>

                          <div className="space-y-3 rounded-[18px] border border-white/[0.06] bg-white/[0.02] p-3.5">
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
                                className="mt-1.5 min-h-[88px] rounded-[18px] border-white/[0.08] bg-[#1b1815] text-white"
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
                                className="mt-1.5 h-10 rounded-2xl border-white/[0.08] bg-[#1b1815] text-white"
                              />
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              onClick={() => void saveStructureDraft()}
                              disabled={structureSaveState === "saving"}
                              className="h-10 rounded-2xl bg-white text-neutral-950 hover:bg-neutral-100"
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
                              className="h-10 rounded-2xl border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.06]"
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
                              className="h-10 rounded-2xl border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.06] disabled:bg-white/[0.02] disabled:text-white/34"
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
                            <span className="text-[11px] text-white/34">{structureSaveLabel}</span>
                          </div>

                          <p className="text-[11px] leading-5 text-white/30">
                            结构确认后，系统会按分组和小节生成画板列表，并自动把建议素材放进对应画板。
                          </p>

                          <p className="text-[11px] text-white/30">
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
                              className="h-9 rounded-2xl border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.06]"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              新增分组
                            </Button>
                          </div>
                          {structureDraft.groups.map((group, index) => (
                            <div
                              key={group.id}
                              className="rounded-[22px] border border-white/[0.08] bg-[#171411] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] tracking-[0.16em] text-white/30">
                                    GROUP {index + 1}
                                  </p>
                                  <Input
                                    value={group.label}
                                    onChange={(event) =>
                                      updateStructureGroup(group.id, {
                                        label: event.target.value,
                                      })
                                    }
                                    className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-[#1b1815] text-sm font-semibold text-white"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-white/[0.08] bg-white/[0.03] text-white/66"
                                  >
                                    {group.narrativeRole}
                                  </Badge>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => mergeStructureGroupIntoPrevious(group.id)}
                                    disabled={index === 0}
                                    className="h-9 w-9 rounded-2xl text-white/56 hover:bg-white/[0.06] hover:text-white disabled:text-white/20"
                                  >
                                    <GripVertical className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteStructureGroup(group.id)}
                                    className="h-9 w-9 rounded-2xl text-white/56 hover:bg-white/[0.06] hover:text-white"
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
                                    className="mt-1.5 h-10 rounded-2xl border-white/[0.08] bg-[#1b1815] text-white"
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
                                    className="mt-1.5 min-h-[84px] rounded-[18px] border-white/[0.08] bg-[#1b1815] text-white"
                                  />
                                </div>
                              </div>

                              <div className="mt-4 space-y-2.5">
                                {group.sections.map((section) => (
                                  <div
                                    key={section.id}
                                    className="rounded-[18px] border border-white/[0.06] bg-white/[0.02] px-3.5 py-3"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0 flex-1">
                                        <label className="text-[11px] text-white/34">小节标题</label>
                                        <Input
                                          value={section.title}
                                          onChange={(event) =>
                                            updateStructureSection(group.id, section.id, {
                                              title: event.target.value,
                                            })
                                          }
                                          className="mt-1.5 h-10 rounded-2xl border-white/[0.08] bg-[#1b1815] text-white"
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteStructureSection(group.id, section.id)}
                                        className="mt-5 h-9 w-9 rounded-2xl text-white/56 hover:bg-white/[0.06] hover:text-white"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <div className="mt-3">
                                      <label className="text-[11px] text-white/34">这一小节要讲什么</label>
                                      <Textarea
                                        value={section.purpose}
                                        onChange={(event) =>
                                          updateStructureSection(group.id, section.id, {
                                            purpose: event.target.value,
                                          })
                                        }
                                        className="mt-1.5 min-h-[84px] rounded-[18px] border-white/[0.08] bg-[#1b1815] text-white"
                                      />
                                    </div>
                                    <div className="mt-3">
                                      <label className="text-[11px] text-white/34">建议内容点</label>
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
                                        className="mt-1.5 min-h-[88px] rounded-[18px] border-white/[0.08] bg-[#1b1815] text-white"
                                      />
                                    </div>
                                    <div className="mt-3">
                                      <label className="text-[11px] text-white/34">建议素材</label>
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
                                        className="mt-1.5 h-10 rounded-2xl border-white/[0.08] bg-[#1b1815] text-white"
                                      />
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => addStructureSection(group.id)}
                                  className="h-9 w-full rounded-2xl border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.06]"
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
                          <div className="rounded-[18px] border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-6 text-sm text-white/46">
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
                      <EditorChromeButton className="h-10 w-full justify-center" onClick={createBoard}>
                        新建画板
                      </EditorChromeButton>
                      <div className={cn(editorPanelCardClass, "px-3 py-2 text-xs text-white/52")}>
                        当前共有 {scene.boards.length} 张画板，底部缩略图负责快速切换。
                      </div>
                    </div>
                  </EditorRailSection>
                  <EditorRailSection title="画板列表">
                    <div className="space-y-2">
                      {scene.boardOrder.map((boardId, index) => {
                        const board = scene.boards.find((item) => item.id === boardId);
                        if (!board) return null;
                        const thumbnailUrl = boardThumbnailMap.get(board.id) ?? null;
                        return (
                          <button
                            key={board.id}
                            type="button"
                            onClick={() => selectBoard(board.id)}
                            className={cn(
                              "group flex w-full items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition-all duration-200",
                              scene.activeBoardId === board.id
                                ? "border-white/[0.16] bg-white/[0.08] text-white shadow-[0_18px_30px_-24px_rgba(0,0,0,0.86)]"
                                : "border-white/[0.08] bg-white/[0.03] text-white/72 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white/84"
                            )}
                          >
                            <div
                              className={cn(
                                "flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[12px] border bg-[#0b0b0a] transition-all duration-200",
                                scene.activeBoardId === board.id
                                  ? "border-white/[0.16] shadow-[0_10px_18px_-14px_rgba(255,255,255,0.18)]"
                                  : "border-white/[0.08] group-hover:border-white/[0.12]"
                              )}
                            >
                              {thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={buildPrivateBlobProxyUrl(thumbnailUrl)}
                                  alt={board.name}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                />
                              ) : (
                                <div className="h-full w-full bg-white" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white">
                                {index + 1}. {board.name}
                              </p>
                              <p className="mt-1 truncate text-xs text-white/44">
                                {board.intent || "未填写意图"}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </EditorRailSection>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      }
      center={
        <div className="flex h-full min-h-0 flex-col">
          <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
            <div className={cn("pointer-events-auto flex items-center gap-1 px-1.5 py-1.5", editorFloatingSurfaceClass)}>
              {activeMeta.kind === "text" ? (
                <div className="flex items-center gap-1.5 rounded-full border border-black/8 bg-white/70 px-2 py-1">
                  <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold">
                    文本
                  </span>
                  <Input
                    type="number"
                    value={activeMeta.fontSize}
                    onChange={(event) =>
                      updateActiveObject({ fontSize: Number(event.target.value) || 16 })
                    }
                    className="h-8 w-[76px] rounded-full border-black/10 bg-white text-sm text-neutral-800"
                  />
                  <Input
                    type="color"
                    value={activeMeta.color}
                    onChange={(event) => updateActiveObject({ fill: event.target.value })}
                    className="h-8 w-11 rounded-full border-black/10 bg-white p-1"
                  />
                </div>
              ) : activeMeta.kind === "image" ? (
                <div className="flex items-center gap-1.5 rounded-full border border-black/8 bg-white/70 px-2 py-1">
                  <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold">
                    图片
                  </span>
                  <span className="text-xs text-neutral-500">透明度</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={activeMeta.opacity}
                    onChange={(event) =>
                      updateActiveObject({ opacity: Number(event.target.value) })
                    }
                  />
                </div>
              ) : activeMeta.kind === "shape" ? (
                <div className="flex items-center gap-1.5 rounded-full border border-black/8 bg-white/70 px-2 py-1">
                  <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold">
                    形状
                  </span>
                  <Input
                    type="color"
                    value={activeMeta.fill}
                    onChange={(event) => updateActiveObject({ fill: event.target.value })}
                    className="h-8 w-11 rounded-full border-black/10 bg-white p-1"
                  />
                  <Input
                    type="color"
                    value={activeMeta.stroke ?? "#000000"}
                    onChange={(event) => updateActiveObject({ stroke: event.target.value })}
                    className="h-8 w-11 rounded-full border-black/10 bg-white p-1"
                  />
                </div>
              ) : null}
              {hasFloatingContext ? <div className="h-7 w-px bg-black/10" /> : null}
              <div className="flex items-center gap-1 rounded-full border border-black/8 bg-white/60 px-1.5 py-1">
                <EditorChromeButton
                  className="h-8 gap-1.5 border-black/8 bg-white px-3 text-neutral-700 shadow-none hover:bg-neutral-100 hover:text-neutral-950"
                  onClick={() => {
                    setLeftPanel("assets");
                    setShapeMenuOpen(false);
                  }}
                >
                  <ImageIcon className="h-4 w-4" />
                  插入图片
                </EditorChromeButton>
                <Button
                  className="h-8 gap-1.5 rounded-full border border-black/8 bg-white px-3 text-neutral-950 shadow-none hover:bg-neutral-100"
                  onClick={addTextObject}
                >
                  <Type className="h-4 w-4" />
                  添加文本
                </Button>
                <div className="relative">
                  <EditorChromeButton
                    className="h-8 gap-1.5 border-black/8 bg-white px-3 text-neutral-700 shadow-none hover:bg-neutral-100 hover:text-neutral-950"
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
              <div className="h-7 w-px bg-black/10" />
              <div className="flex items-center gap-1 rounded-full border border-black/8 bg-white/60 px-1.5 py-1">
                <EditorChromeButton
                  className="h-8 border-black/8 bg-white px-3 text-neutral-700 shadow-none hover:bg-neutral-100 hover:text-neutral-950"
                  onClick={() => {
                    setLeftPanel("layers");
                  }}
                >
                  <Layers className="h-4 w-4" />
                  调整图层
                </EditorChromeButton>
                <EditorChromeButton
                  className="h-8 border-black/8 bg-white px-3 text-neutral-700 shadow-none hover:bg-neutral-100 hover:text-neutral-950"
                  onClick={() => canvasRef.current && fitBoard(canvasRef.current)}
                >
                  适应画板
                </EditorChromeButton>
              </div>
              <div className="h-7 w-px bg-black/10" />
              <div className="flex items-center gap-1 rounded-full border border-black/8 bg-white/60 px-1.5 py-1">
                <EditorChromeButton
                  className="h-8 w-8 border-black/8 bg-white text-neutral-700 shadow-none hover:bg-neutral-100 hover:text-neutral-950"
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const nextZoom = clamp(canvas.getZoom() - 0.1, 0.2, 3);
                    applyCenteredZoom(canvas, nextZoom);
                  }}
                >
                  <ZoomOut className="h-4 w-4" />
                </EditorChromeButton>
                <span className="inline-flex h-8 items-center rounded-full border border-black/8 bg-white px-3 text-sm font-medium text-neutral-700">
                  {Math.round(zoom * 100)}%
                </span>
                <EditorChromeButton
                  className="h-8 w-8 border-black/8 bg-white text-neutral-700 shadow-none hover:bg-neutral-100 hover:text-neutral-950"
                  onClick={() => {
                    const canvas = canvasRef.current;
                    if (!canvas) return;
                    const nextZoom = clamp(canvas.getZoom() + 0.1, 0.2, 3);
                    applyCenteredZoom(canvas, nextZoom);
                  }}
                >
                  <ZoomIn className="h-4 w-4" />
                </EditorChromeButton>
              </div>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            <input
              ref={assetUploadRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(event) => void handleAssetFilesPicked(event.target.files)}
            />
            <div
              ref={workspaceRef}
              className="absolute overflow-hidden rounded-[28px]"
              style={{
                top: STAGE_TOP_INSET,
                left: STAGE_SIDE_INSET,
                right: STAGE_SIDE_INSET,
                bottom: STAGE_BOTTOM_INSET,
              }}
              onContextMenu={(event) => event.preventDefault()}
            >
              <canvas ref={hostRef} className="absolute inset-0 block h-full w-full" />
            </div>
            {!canvasReady ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white/62">
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
                    <div key={item.id} className="my-2 h-px bg-black/[0.08]" />
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
                        <span className="text-xs text-neutral-400">{item.shortcut}</span>
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
                    "rounded-full border px-4 py-2 text-sm shadow-[0_20px_40px_-28px_rgba(0,0,0,0.65)] backdrop-blur",
                    actionMessage.tone === "error"
                      ? "border-red-300/20 bg-red-400/10 text-red-100"
                      : "border-white/[0.08] bg-[#181715]/88 text-white/82"
                  )}
                >
                  {actionMessage.text}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      }
      rightRail={
        showRightRail ? (
          <div className="flex h-full flex-col">
            <Tabs
              value={rightPanel}
              onValueChange={(value) => setRightPanel(value as RightRailPanel)}
              className="flex h-full min-h-0 flex-col"
            >
              <div className="sticky top-0 z-10 border-b border-white/[0.05] bg-[#171411] px-4 py-3 shadow-[0_14px_30px_-24px_rgba(0,0,0,0.85)]">
                <EditorTabsList className="grid h-11 grid-cols-2 rounded-[18px] bg-white/[0.03]">
                  <EditorTabsTrigger value="inspector">Inspector</EditorTabsTrigger>
                  <EditorTabsTrigger value="ai">AI</EditorTabsTrigger>
                </EditorTabsList>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <TabsContent value="inspector" className="mt-0">
                  {hasActiveInspector ? (
                    <div className="h-full overflow-y-auto">
                      <EditorRailSection title="属性编辑">
                        <div className="space-y-4 rounded-[22px] border border-white/[0.08] bg-[#1a1714] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <div className="flex items-center justify-between rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
                            <div>
                              <p className="text-[11px] tracking-[0.16em] text-white/34">选中对象</p>
                              <p className="mt-1 text-sm text-white/64">
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
                            <span className="rounded-full border border-white/[0.08] bg-[#14110f] px-2.5 py-1 text-[11px] text-white/52">
                              {activeMeta.kind === "multi" ? `${activeMeta.count} items` : "single"}
                            </span>
                          </div>
                          {activeMeta.kind === "multi" ? (
                            <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-white/52">
                              已选 {activeMeta.count} 个对象，可先调整层级或重新选择单个对象编辑属性。
                            </div>
                          ) : null}

                          {activeMeta.kind === "text" ? (
                            <div className="space-y-3">
                              <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-3">
                                <p className="mb-2 text-[11px] tracking-[0.16em] text-white/34">内容</p>
                                <label className="text-xs text-white/50">文本内容</label>
                                <Textarea
                                  value={activeMeta.text}
                                  onChange={(event) => updateActiveObject({ text: event.target.value })}
                                  className="mt-2 min-h-[84px] rounded-2xl border-white/[0.08] bg-[#171411] text-white"
                                />
                              </div>
                              <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-3">
                                <p className="mb-2 text-[11px] tracking-[0.16em] text-white/34">样式</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-white/50">字号</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.fontSize}
                                      onChange={(event) =>
                                        updateActiveObject({ fontSize: Number(event.target.value) || 16 })
                                      }
                                      className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-[#171411] text-white"
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
                                      className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-[#171411] text-white"
                                    />
                                  </div>
                                </div>
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-white/50">颜色</label>
                                    <Input
                                      type="color"
                                      value={activeMeta.color}
                                      onChange={(event) => updateActiveObject({ fill: event.target.value })}
                                      className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-[#171411] p-1"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">透明度</label>
                                    <Input
                                      type="range"
                                      min={0}
                                      max={1}
                                      step={0.05}
                                      value={activeMeta.opacity}
                                      onChange={(event) =>
                                        updateActiveObject({ opacity: Number(event.target.value) })
                                      }
                                      className="mt-3"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}

                          {activeMeta.kind === "image" ? (
                            <div className="space-y-3">
                              {selectedImageAsset ? (
                                <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-3">
                                  <p className="mb-2 text-[11px] tracking-[0.16em] text-white/34">素材语义</p>
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
                                    className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-[#171411] text-white"
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
                                    className="mt-2 min-h-[96px] rounded-2xl border-white/[0.08] bg-[#171411] text-white"
                                  />
                                  <Button
                                    type="button"
                                    onClick={() => void saveSelectedImageDetails()}
                                    disabled={assetDetailsSaving}
                                    className="mt-3 h-10 w-full gap-2 rounded-2xl bg-white text-neutral-950 hover:bg-neutral-100"
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
                              <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-3">
                                <p className="mb-2 text-[11px] tracking-[0.16em] text-white/34">显示</p>
                                <label className="text-xs text-white/50">透明度</label>
                                <Input
                                  type="range"
                                  min={0}
                                  max={1}
                                  step={0.05}
                                  value={activeMeta.opacity}
                                  onChange={(event) =>
                                    updateActiveObject({ opacity: Number(event.target.value) })
                                  }
                                  className="mt-3"
                                />
                              </div>
                            </div>
                          ) : null}

                          {activeMeta.kind === "shape" ? (
                            <div className="space-y-3">
                              <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] p-3">
                                <p className="mb-2 text-[11px] tracking-[0.16em] text-white/34">样式</p>
                                <label className="text-xs text-white/50">填充色</label>
                                <Input
                                  type="color"
                                  value={activeMeta.fill}
                                  onChange={(event) => updateActiveObject({ fill: event.target.value })}
                                  className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-[#171411] p-1"
                                />
                                <label className="mt-3 block text-xs text-white/50">描边色</label>
                                <Input
                                  type="color"
                                  value={activeMeta.stroke ?? "#000000"}
                                  onChange={(event) => updateActiveObject({ stroke: event.target.value })}
                                  className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-[#171411] p-1"
                                />
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-white/50">描边宽度</label>
                                    <Input
                                      type="number"
                                      value={activeMeta.strokeWidth}
                                      onChange={(event) =>
                                        updateActiveObject({ strokeWidth: Number(event.target.value) || 0 })
                                      }
                                      className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-[#171411] text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-white/50">透明度</label>
                                    <Input
                                      type="range"
                                      min={0}
                                      max={1}
                                      step={0.05}
                                      value={activeMeta.opacity}
                                      onChange={(event) =>
                                        updateActiveObject({ opacity: Number(event.target.value) })
                                      }
                                      className="mt-3"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </EditorRailSection>

                      <EditorRailSection title="图层排布">
                        <div className="grid grid-cols-2 gap-2">
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
                  ) : (
                    <div className="p-4">
                      <EditorEmptyState>选中画板中的元素后，这里会显示可编辑属性。</EditorEmptyState>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="ai" className="mt-0">
                  <div className="h-full overflow-y-auto">
                    <EditorRailSection title="看到了什么">
                      <Card className="border-white/[0.08] bg-white/[0.03] shadow-none">
                        <CardContent className="p-4 text-sm leading-7 text-white/74">
                          {currentConclusion}
                        </CardContent>
                      </Card>
                    </EditorRailSection>

                    <EditorRailSection title="亮点">
                      <div className="space-y-2">
                        {aiHighlights.length > 0 ? (
                          aiHighlights.map((point) => (
                            <Card key={point} className="border-white/[0.08] bg-white/[0.03] shadow-none">
                              <CardContent className="p-4 text-sm leading-7 text-white/74">
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
                            <Card key={point} className="border-white/[0.08] bg-white/[0.03] shadow-none">
                              <CardContent className="p-4 text-sm leading-7 text-white/74">
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
                      <Card className="border-white/[0.08] bg-white/[0.03] shadow-none">
                        <CardContent className="p-4 text-sm leading-7 text-white/74">
                          {nextStepConclusion}
                        </CardContent>
                      </Card>
                    </EditorRailSection>

                    <EditorRailSection title="和上次相比">
                      {aiHistory.length > 1 ? (
                        <Card className="border-white/[0.08] bg-white/[0.03] shadow-none">
                          <CardContent className="p-4 text-sm leading-7 text-white/74">
                            已累计 {aiHistory.length} 条 AI 结果。当前最新结论会优先参考你正在编辑的画板范围。
                          </CardContent>
                        </Card>
                      ) : (
                        <EditorEmptyState>还没有形成可比较的历史版本。</EditorEmptyState>
                      )}
                    </EditorRailSection>

                    <EditorRailSection title="是否可继续排版">
                      <Card className="border-white/[0.08] bg-white/[0.03] shadow-none">
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
                              "rounded-full border-white/10 px-3 py-1 text-white",
                              (layout?.pages?.length || completenessAnalysis?.canProceed) &&
                                "border-white/[0.18] bg-white/[0.08] text-white"
                            )}
                          >
                            {layout?.pages?.length
                              ? "Ready"
                              : completenessAnalysis?.canProceed
                                ? "Proceed"
                                : "Needs work"}
                          </Badge>
                        </CardContent>
                      </Card>
                    </EditorRailSection>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : null
      }
      bottomStrip={
        <div className="mx-auto flex w-[calc(100%-56px)] items-center gap-1.5 overflow-x-auto rounded-[24px] border border-white/[0.06] bg-[#14110f] p-1.5 shadow-[0_24px_64px_-42px_rgba(0,0,0,0.82)]">
          <div className="shrink-0 px-2.5">
            <p className="text-sm font-medium text-white/44">{scene.boards.length} 张画板</p>
            <p className="mt-1 text-[11px] text-white/26">
              范围：{scene.generationScope.mode === "all" ? "全部" : scene.generationScope.mode === "selected" ? "已选" : "当前"}
            </p>
          </div>
          {scene.boardOrder.map((boardId) => {
            const board = scene.boards.find((item) => item.id === boardId);
            if (!board) return null;
            const thumbnailUrl = boardThumbnailMap.get(board.id) ?? null;
            const selectedForScope =
              scene.generationScope.mode === "all" ||
              (scene.generationScope.mode === "selected" &&
                scene.generationScope.boardIds.includes(board.id)) ||
              (scene.generationScope.mode === "current" && scene.activeBoardId === board.id);
            return (
              <div key={board.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleBoardInSelection(board.id);
                  }}
                  className={cn(
                    "absolute right-1.5 top-1.5 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] transition-colors",
                    selectedForScope
                      ? "border-white/[0.18] bg-[#0f0f0e] text-white"
                      : "border-white/[0.08] bg-[#14110f]/90 text-white/42 hover:text-white/72"
                  )}
                  aria-label={selectedForScope ? "取消加入生成范围" : "加入生成范围"}
                >
                  {selectedForScope ? "✓" : "+"}
                </button>
                <EditorStripButton
                  active={scene.activeBoardId === board.id}
                  className={cn(
                    "group relative w-[88px] rounded-[16px] p-1.5 transition-all duration-200",
                    scene.activeBoardId === board.id && "translate-y-[-1px] shadow-[0_14px_26px_-18px_rgba(255,255,255,0.12)]",
                    selectedForScope && "border-white/[0.16] ring-1 ring-white/[0.08]"
                  )}
                  onClick={() =>
                    setScene((current) =>
                      normalizeProjectEditorScene({ ...current, activeBoardId: board.id })
                    )
                  }
                >
                  <div
                    className={cn(
                      "overflow-hidden rounded-[12px] border bg-[#0b0b0a] transition-all duration-200",
                      scene.activeBoardId === board.id
                        ? "border-white/[0.18] shadow-[0_12px_18px_-14px_rgba(255,255,255,0.16)]"
                        : "border-white/[0.08] group-hover:border-white/[0.12]"
                    )}
                  >
                    {thumbnailUrl ? (
                      <div className="aspect-video">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={buildPrivateBlobProxyUrl(thumbnailUrl)}
                          alt={board.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-[#f4f3ef] p-2.5">
                        <div className="h-full w-full rounded-[8px] border border-black/6 bg-white" />
                      </div>
                    )}
                  </div>
                  {scene.activeBoardId === board.id ? (
                    <div className="pointer-events-none absolute inset-x-5 bottom-0.5 h-[2px] rounded-full bg-white/70" />
                  ) : null}
                </EditorStripButton>
              </div>
            );
          })}
        </div>
      }
      />
      {actionError ? (
        <div className="border-t border-red-300/12 bg-red-400/8 px-4 py-3 text-sm text-red-100">
          {actionError}
        </div>
      ) : null}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-2xl border-white/[0.08] bg-[#161311] text-white">
          <DialogHeader>
            <DialogTitle>生成排版</DialogTitle>
            <DialogDescription className="text-white/56">
              系统会基于当前画板范围、项目上下文和包装模式生成新的排版建议，不会覆盖你已经摆好的单画板内容。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-white/70">
            <Card className="border-white/[0.08] bg-white/[0.03] shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.04] text-white">
                    生成范围
                  </Badge>
                  <Button
                    variant="outline"
                    className="h-9 rounded-full border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08]"
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
                        "rounded-2xl border px-3 py-3 text-left transition-colors",
                        scene.generationScope.mode === item.mode
                          ? "border-white/[0.16] bg-white/[0.1] text-white"
                          : "border-white/[0.08] bg-[#14110f] text-white/70 hover:bg-white/[0.05]"
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

            <Card className="border-white/[0.08] bg-white/[0.03] shadow-none">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.04] text-white">
                    预检
                  </Badge>
                  {generatePrecheck?.suggestedMode === "reuse" ? (
                    <Badge variant="outline" className="rounded-full border-white/[0.08] bg-white/[0.04] text-white">
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

            <Card className="border-white/[0.08] bg-white/[0.03] shadow-none">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm font-medium text-white">风格参考</p>
                  <p className="mt-1 text-sm leading-6 text-white/50">
                    风格参考只影响标题层级、留白密度和包装样式，不改变当前画板结构。
                  </p>
                </div>
                <Separator className="my-4 bg-white/[0.06]" />

                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    type="button"
                    className={cn(
                      "rounded-2xl border px-3 py-3 text-left transition-colors",
                      styleSelection.source === "none"
                        ? "border-white/[0.16] bg-white/[0.1] text-white"
                        : "border-white/[0.08] bg-[#14110f] text-white/70 hover:bg-white/[0.05]"
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
                        "rounded-2xl border px-3 py-3 text-left transition-colors",
                        styleSelection.source === "preset" && styleSelection.presetKey === preset.key
                          ? "border-white/[0.16] bg-white/[0.1] text-white"
                          : "border-white/[0.08] bg-[#14110f] text-white/70 hover:bg-white/[0.05]"
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
                        "rounded-2xl border px-3 py-3 text-left transition-colors md:col-span-2",
                        styleSelection.source === "reference_set" && styleSelection.referenceSetId === set.id
                          ? "border-white/[0.16] bg-white/[0.1] text-white"
                          : "border-white/[0.08] bg-[#14110f] text-white/70 hover:bg-white/[0.05]"
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
              className="rounded-full border-white/[0.08] bg-white/[0.03] text-white hover:bg-white/[0.08]"
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
          ? "border-white/40 bg-white/[0.09] text-white shadow-[0_16px_30px_-22px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.06]"
          : "border-white/[0.08] bg-white/[0.02] text-white/72 hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white/82",
        isDragging ? "scale-[1.01] opacity-80 shadow-[0_20px_36px_-22px_rgba(0,0,0,0.9)]" : "opacity-100"
      )}
      role="listitem"
    >
      <button
        type="button"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-xl border transition-colors",
          selected
            ? "border-white/[0.12] bg-white/[0.09] text-white"
            : "border-white/[0.06] bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
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
            "flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl border bg-[#14110f] text-[10px] font-semibold transition-all",
            selected
              ? "border-white/[0.18] text-white shadow-[0_10px_16px_-14px_rgba(255,255,255,0.18)]"
              : "border-white/[0.08] text-white/70 group-hover:border-white/[0.12]"
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
          <p className="mt-0.5 text-[11px] text-white/36">
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
            ? "border-white/[0.12] bg-white/[0.08] text-white"
            : "border-white/[0.08] bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:text-white"
        )}
        aria-label="更多操作"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
