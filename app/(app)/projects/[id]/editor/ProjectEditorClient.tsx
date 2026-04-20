"use client";

import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import type {
  ComponentType,
  PointerEvent as ReactPointerEvent,
  ReactNode,
  WheelEvent as ReactWheelEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Copy,
  FolderOpen,
  GripVertical,
  History,
  ImageIcon,
  LayoutTemplate,
  Loader2,
  Plus,
  Save,
  Search,
  Sparkles,
  StickyNote,
  Trash2,
  Type,
  Upload,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { uploadFilesFromBrowser } from "@/lib/blob-client-upload";
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
  editorFieldClass,
  EditorInfoList,
  EditorRailSection,
  EditorScaffold,
  EditorStripButton,
  EditorSurfaceButton,
  EditorTabsList,
  EditorTabsTrigger,
} from "@/components/editor/EditorScaffold";
import type { ObjectActionQuota, PlanSummaryCopy } from "@/lib/entitlement";
import type { BoundaryAnalysis } from "@/app/api/projects/[id]/boundary/analyze/route";
import type { CompletenessAnalysis } from "@/app/api/projects/[id]/completeness/analyze/route";
import type { PackageRecommendation } from "@/app/api/projects/[id]/package/recommend/route";
import type { LayoutJson } from "@/app/api/projects/[id]/layout/generate/route";
import {
  DEFAULT_BOARD_BACKGROUND,
  getGenerationScopeBoardIds,
  getSceneBoardById,
  mergeProjectAssetMeta,
  mergeProjectLayoutDocument,
  normalizeProjectEditorScene,
  PROJECT_BOARD_HEIGHT,
  PROJECT_BOARD_STATUSES,
  PROJECT_BOARD_WIDTH,
  PROJECT_IMAGE_ROLE_TAGS,
  PROJECT_TEXT_ROLES,
  resolveProjectAssetMeta,
  resolveProjectEditorScene,
  type GenerationScope,
  type ProjectBoard,
  type ProjectBoardImageNode,
  type ProjectBoardNode,
  type ProjectBoardShapeNode,
  type ProjectBoardStatus,
  type ProjectBoardTextNode,
  type ProjectEditorScene,
  type ProjectImageRoleTag,
  type ProjectTextRole,
  createProjectBoard,
  createProjectImageNode,
  createProjectShapeNode,
  createProjectTextNode,
  markBoardsAsAnalyzed,
} from "@/lib/project-editor-scene";
import {
  STYLE_PRESETS,
  type StyleProfile,
  type StyleReferenceSelection,
} from "@/lib/style-reference-presets";
import {
  PROJECT_STAGE_LABEL,
  PROJECT_STATUS_LABEL,
} from "@/lib/project-workflow";
import { cn } from "@/lib/utils";

type ProjectAsset = {
  id: string;
  imageUrl: string;
  title: string | null;
  selected: boolean;
  isCover: boolean;
  sortOrder: number;
  metaJson?: unknown;
};

type InvolvementLevelValue = "" | "LEAD" | "CORE" | "SUPPORT";

type AudienceValue = "" | "TO_C" | "TO_B" | "TO_G" | "INTERNAL";
type PlatformValue =
  | ""
  | "WEB"
  | "MOBILE"
  | "DESKTOP"
  | "AUTOMOTIVE"
  | "LARGE_SCREEN"
  | "CROSS_PLATFORM";
type ProjectNatureValue =
  | ""
  | "NEW_BUILD"
  | "MAJOR_REDESIGN"
  | "ITERATION"
  | "DESIGN_SYSTEM"
  | "CONCEPT";

type ProjectFactsForm = {
  // legacy free-text field kept only for the legacy editor (?engine=legacy)
  projectType: string;
  // new locked-on-creation client conditions used by Fabric editor
  audience: AudienceValue;
  platform: PlatformValue;
  industry: string;
  projectNature: ProjectNatureValue;
  involvementLevel: InvolvementLevelValue;
  roleTitle: string;
  timeline: string;
  background: string;
  businessGoal: string;
  biggestChallenge: string;
  resultSummary: string;
};

type StyleReferenceSetOption = {
  id: string;
  name: string;
  description: string | null;
  imageUrls: string[];
};

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

type LeftRailPanel = "project" | "assets" | "notes" | "boards" | "history";
type RightRailPanel = "inspector" | "ai";
type SceneSelection = { kind: "board" } | { kind: "node"; nodeId: string };

type InteractionState = {
  mode: "move" | "resize";
  nodeId: string;
  startClientX: number;
  startClientY: number;
  originNode: ProjectBoardNode;
};

type BoardRenderMetrics = {
  width: number;
  height: number;
};

export type ProjectEditorInitialData = {
  id: string;
  name: string;
  sourceType: string;
  sourceUrl: string | null;
  stage: string;
  importStatus: string;
  packageMode: string | null;
  updatedAt: string;
  facts: ProjectFactsForm;
  assets: ProjectAsset[];
  boundaryAnalysis: BoundaryAnalysis | null;
  completenessAnalysis: CompletenessAnalysis | null;
  packageRecommendation: PackageRecommendation | null;
  layout: LayoutJson | null;
  actionSummary: {
    layoutGenerations: ObjectActionQuota;
    layoutRegenerations: ObjectActionQuota;
  };
  styleReferenceSets: StyleReferenceSetOption[];
};

const LEFT_PANEL_ITEMS: Array<{
  key: LeftRailPanel;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "project", label: "项目", icon: FolderOpen },
  { key: "assets", label: "素材", icon: ImageIcon },
  { key: "notes", label: "备注", icon: StickyNote },
  { key: "boards", label: "画板", icon: LayoutTemplate },
  { key: "history", label: "历史", icon: History },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function useEffectEvent<T extends (...args: Parameters<T>) => ReturnType<T>>(handler: T): T {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  return useRef(((...args: Parameters<T>) => handlerRef.current(...args)) as T).current;
}

function packageModeLabel(mode: string | null) {
  if (mode === "DEEP") return "深讲";
  if (mode === "LIGHT") return "浅讲";
  if (mode === "SUPPORTIVE") return "补充展示";
  return "待判断";
}

function sourceTypeLabel(sourceType: string) {
  if (sourceType === "FIGMA") return "Figma 链接";
  if (sourceType === "IMAGES") return "图片上传";
  return "手动创建";
}

function verdictLabel(verdict: string | undefined) {
  if (verdict === "ready") return "可继续";
  if (verdict === "almost_ready") return "接近可继续";
  if (verdict === "needs_work") return "仍需补充";
  if (verdict === "insufficient") return "信息不足";
  return "待判断";
}

function boardStatusLabel(status: ProjectBoardStatus) {
  if (status === "empty") return "空白";
  if (status === "draft") return "草稿";
  if (status === "analyzed") return "已诊断";
  if (status === "needs_attention") return "待补强";
  return "可继续";
}

function getBoardThumbnailAssetId(board: ProjectBoard) {
  if (board.thumbnailAssetId) return board.thumbnailAssetId;
  const imageNode = board.nodes.find(
    (node): node is ProjectBoardImageNode => node.type === "image"
  );
  return imageNode?.assetId ?? null;
}

function duplicateBoard(board: ProjectBoard) {
  return createProjectBoard({
    name: `${board.name} Copy`,
    intent: board.intent,
    status: board.nodes.length > 0 ? "draft" : "empty",
    thumbnailAssetId: getBoardThumbnailAssetId(board),
    aiMarkers: {
      hasAnalysis: false,
      hasPendingSuggestion: board.aiMarkers.hasPendingSuggestion,
    },
    nodes: board.nodes.map((node) => {
      if (node.type === "text") {
        return createProjectTextNode({
          text: node.text,
          role: node.role,
          x: node.x + 48,
          y: node.y + 48,
          width: node.width,
          height: node.height,
          fontSize: node.fontSize,
          fontWeight: node.fontWeight,
          lineHeight: node.lineHeight,
          align: node.align,
          color: node.color,
          zIndex: node.zIndex,
        });
      }
      if (node.type === "image") {
        return createProjectImageNode(node.assetId, {
          x: node.x + 48,
          y: node.y + 48,
          width: node.width,
          height: node.height,
          fit: node.fit,
          crop: node.crop,
          note: node.note,
          roleTag: node.roleTag,
          zIndex: node.zIndex,
        });
      }
      return createProjectShapeNode(node.shape, {
        x: node.x + 48,
        y: node.y + 48,
        width: node.width,
        height: node.height,
        fill: node.fill,
        stroke: node.stroke,
        strokeWidth: node.strokeWidth,
        opacity: node.opacity,
        zIndex: node.zIndex,
      });
    }),
  });
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
    return "先把素材上传进左侧素材库，再拖到中间画板里梳理内容。";
  }
  if (!boundaryAnalysis || !completenessAnalysis || !packageRecommendation) {
    return "先运行项目诊断，让系统基于当前画板上下文补齐边界、完整度和包装模式判断。";
  }
  if (!completenessAnalysis.canProceed) {
    return completenessAnalysis.prioritySuggestions[0] ?? "先把当前画板里的关键信息补齐，再继续排版。";
  }
  if (!packageMode) {
    return `建议先确认“${packageModeLabel(packageRecommendation.recommendedMode)}”模式，再生成排版建议。`;
  }
  return "当前信息已经够用，可以直接以当前画板范围继续生成排版建议。";
}

async function parseJsonResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (data as { error?: string }).error === "quota_exceeded"
        ? "当前排版次数已用完，请先前往权益页查看剩余次数。"
        : (data as { error?: string }).error === "upgrade_required"
          ? "当前套餐还不能执行这个高成本动作，请先升级后再继续。"
          : (data as { error?: string }).error ?? "请求失败，请稍后重试";
    throw new Error(message);
  }
  return data;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size] as const;
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs text-white/42">
      {children}
    </p>
  );
}

function EditorPanelCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "rounded-[24px] border-white/8 bg-[#1b1a18] text-white shadow-[0_18px_44px_-34px_rgba(0,0,0,0.68)]",
        className
      )}
    >
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

function LeftRailIconButton({
  active,
  label,
  icon: Icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex w-full flex-col items-center gap-2 rounded-[18px] border px-2 py-3 text-xs transition-colors",
        active
          ? "border-white/[0.14] bg-white/8 text-white shadow-[0_16px_32px_-24px_rgba(0,0,0,0.6)]"
          : "border-white/8 bg-white/[0.018] text-white/42 hover:bg-white/5 hover:text-white/78"
      )}
      aria-label={label}
      title={label}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-current/20 bg-black/10">
        <Icon className="h-4 w-4" />
      </span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

function DraggableAssetCard({
  asset,
  active,
  used,
  onToggleSelected,
  onSetCover,
}: {
  asset: ProjectAsset;
  active?: boolean;
  used: boolean;
  onToggleSelected: (assetId: string) => void;
  onSetCover: (assetId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `asset:${asset.id}`,
    data: { type: "asset", assetId: asset.id },
  });
  const meta = resolveProjectAssetMeta(asset.metaJson);

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transform
          ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
          : undefined,
      }}
      className={cn(
        "overflow-hidden rounded-[22px] border transition-all",
        active
          ? "border-white/18 bg-white/8 shadow-[0_18px_36px_-26px_rgba(0,0,0,0.75)]"
          : "border-white/8 bg-[#1b1a18]",
        isDragging && "opacity-70"
      )}
    >
      <div
        className="block w-full cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <div className="relative">
          <div className="aspect-4/3 overflow-hidden bg-black/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={buildPrivateBlobProxyUrl(asset.imageUrl)}
              alt={asset.title ?? "素材"}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5">
            {asset.selected ? <Badge className="border-none bg-white text-neutral-950">已纳入</Badge> : null}
            {used ? <Badge variant="outline" className="border-white/18 text-white">已上板</Badge> : null}
            {asset.isCover ? <Badge variant="outline" className="border-white/18 text-white/70">封面</Badge> : null}
          </div>
          {meta.roleTag ? (
            <div className="absolute bottom-2 left-2 rounded-full border border-white/8 bg-black/55 px-2 py-1 text-xs text-white/72 backdrop-blur-sm">
              {meta.roleTag}
            </div>
          ) : null}
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-medium text-white">
            {asset.title ?? "未命名素材"}
          </p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/42">
            {meta.note ?? "拖到中央画板即可加入当前页。"}
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleSelected(asset.id);
              }}
              className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-xs text-white/62 transition-colors hover:bg-white/8 hover:text-white"
            >
              {asset.selected ? "移出生成" : "纳入生成"}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSetCover(asset.id);
              }}
              className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-xs text-white/62 transition-colors hover:bg-white/8 hover:text-white"
            >
              设为封面
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SortableBoardStripItem({
  board,
  active,
  selectedForScope,
  thumbnailUrl,
  onClick,
  onToggleScope,
}: {
  board: ProjectBoard;
  active: boolean;
  selectedForScope: boolean;
  thumbnailUrl: string | null;
  onClick: () => void;
  onToggleScope: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: board.id,
    data: { type: "board" },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn("shrink-0", isDragging && "opacity-60")}
    >
      <EditorStripButton
        active={active}
        className="relative w-[104px] overflow-hidden rounded-[22px] p-1.5"
        onClick={onClick}
      >
        <div className="absolute left-3 top-3 z-10">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleScope();
            }}
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border",
              selectedForScope
                ? "border-white/16 bg-white text-neutral-950"
                : "border-white/8 bg-black/30 text-white/50"
            )}
            aria-label="加入批量范围"
          >
            <span className="h-2 w-2 rounded-full bg-current" />
          </button>
        </div>
        <div className="absolute right-3 top-3 z-10">
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            className="rounded-full border border-white/8 bg-black/30 p-1 text-white/50"
            aria-label="拖拽排序"
            {...attributes}
            {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
        </div>
        <div>
          <div className="overflow-hidden rounded-[18px] border border-white/8 bg-[#0b0b0a]">
            {thumbnailUrl ? (
              <div className="aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={buildPrivateBlobProxyUrl(thumbnailUrl)}
                  alt={board.name}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-[#f4f3ef] p-3">
                <div className="h-full w-full rounded-[12px] border border-black/6 bg-white shadow-[inset_0_0_0_1px_rgba(17,17,17,0.02)]" />
              </div>
            )}
          </div>
        </div>
      </EditorStripButton>
    </div>
  );
}

export function ProjectEditorClient({
  initialData,
  planSummary,
}: {
  initialData: ProjectEditorInitialData;
  planSummary: PlanSummaryCopy;
}) {
  const router = useRouter();
  const [facts, setFacts] = useState<ProjectFactsForm>(initialData.facts);
  const [assets, setAssets] = useState<ProjectAsset[]>(initialData.assets);
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
  const [scene, setScene] = useState<ProjectEditorScene>(() =>
    resolveProjectEditorScene(initialData.layout, {
      assets: initialData.assets,
      projectName: initialData.name,
    })
  );
  const [selection, setSelection] = useState<SceneSelection>({ kind: "board" });
  const [leftPanel, setLeftPanel] = useState<LeftRailPanel>("assets");
  const [rightPanel, setRightPanel] = useState<RightRailPanel>("inspector");
  const [savingFacts, setSavingFacts] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [factsMessage, setFactsMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [assetSearch, setAssetSearch] = useState("");
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [updatingAssetFlags, setUpdatingAssetFlags] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatingLayout, setGeneratingLayout] = useState(false);
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
  const [sceneSaveState, setSceneSaveState] = useState<"saved" | "saving" | "dirty" | "error">(
    "saved"
  );
  const [editingTextNodeId, setEditingTextNodeId] = useState<string | null>(null);
  const [editingTextDraft, setEditingTextDraft] = useState("");
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [assetMetaSaving, setAssetMetaSaving] = useState(false);

  const [boardViewportRef, boardViewportSize] = useElementSize<HTMLDivElement>();
  const boardDropRef = useRef<HTMLDivElement | null>(null);
  const assetPickerRef = useRef<HTMLInputElement | null>(null);
  const lastSavedSceneRef = useRef(JSON.stringify(scene));
  const didHydrateSceneRef = useRef(false);

  const stageInfo =
    stage && stage !== "DRAFT"
      ? PROJECT_STAGE_LABEL[stage]
      : PROJECT_STATUS_LABEL[initialData.importStatus] ?? PROJECT_STATUS_LABEL.DRAFT;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const assetMap = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets]
  );
  const usedAssetIds = useMemo(() => {
    return new Set(
      scene.boards.flatMap((board) =>
        board.nodes
          .filter((node): node is ProjectBoardImageNode => node.type === "image")
          .map((node) => node.assetId)
      )
    );
  }, [scene.boards]);
  const selectedAssets = useMemo(
    () => assets.filter((asset) => asset.selected),
    [assets]
  );
  const visibleAssets = useMemo(() => {
    const keyword = assetSearch.trim().toLowerCase();
    if (!keyword) return assets;

    return assets.filter((asset) => {
      const meta = resolveProjectAssetMeta(asset.metaJson);
      const haystack = [
        asset.title ?? "",
        meta.note ?? "",
        meta.roleTag ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [assetSearch, assets]);
  const activeBoard = useMemo(
    () => getSceneBoardById(scene, scene.activeBoardId) ?? scene.boards[0] ?? null,
    [scene]
  );
  const selectedNode = useMemo(() => {
    if (!activeBoard || selection.kind !== "node") return null;
    return (
      activeBoard.nodes.find((node) => node.id === selection.nodeId) ?? null
    );
  }, [activeBoard, selection]);
  const selectedAsset = useMemo(() => {
    if (!selectedNode || selectedNode.type !== "image") return null;
    return assetMap.get(selectedNode.assetId) ?? null;
  }, [assetMap, selectedNode]);
  const boardThumbnailMap = useMemo(() => {
    const entries = scene.boards.map((board) => {
      const assetId = getBoardThumbnailAssetId(board);
      return [board.id, assetId ? assetMap.get(assetId)?.imageUrl ?? null : null] as const;
    });
    return new Map(entries);
  }, [assetMap, scene.boards]);
  const generationBoardIds = useMemo(() => getGenerationScopeBoardIds(scene), [scene]);
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
  const boardRender = useMemo<BoardRenderMetrics>(() => {
    const paddingX = 120;
    const paddingY = 136;
    const fitWidth = Math.max(boardViewportSize.width - paddingX, 320);
    const fitHeight = Math.max(boardViewportSize.height - paddingY, 220);
    const baseScale = Math.min(fitWidth / PROJECT_BOARD_WIDTH, fitHeight / PROJECT_BOARD_HEIGHT, 1);
    const zoom = scene.viewport.zoom || 1;
    return {
      width: Math.round(PROJECT_BOARD_WIDTH * baseScale * zoom),
      height: Math.round(PROJECT_BOARD_HEIGHT * baseScale * zoom),
    };
  }, [boardViewportSize.height, boardViewportSize.width, scene.viewport.zoom]);

  useEffect(() => {
    if (!activeBoard) return;
    if (selection.kind === "node") {
      const exists = activeBoard.nodes.some((node) => node.id === selection.nodeId);
      if (!exists) {
        setSelection({ kind: "board" });
      }
    }
  }, [activeBoard, selection]);

  useEffect(() => {
    if (!editingTextNodeId) return;
    if (!selectedNode || selectedNode.type !== "text" || selectedNode.id !== editingTextNodeId) {
      setEditingTextNodeId(null);
      setEditingTextDraft("");
    }
  }, [editingTextNodeId, selectedNode]);

  async function persistScene(sceneToSave: ProjectEditorScene, force = false) {
    const serialized = JSON.stringify(sceneToSave);
    if (!force && serialized === lastSavedSceneRef.current) {
      setSceneSaveState("saved");
      return;
    }

    setSceneSaveState("saving");
    await parseJsonResponse(
      await fetch(`/api/projects/${initialData.id}/layout/scene`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorScene: sceneToSave }),
      })
    );
    lastSavedSceneRef.current = serialized;
    setLayout((current) =>
      mergeProjectLayoutDocument(current, { editorScene: sceneToSave }) as LayoutJson
    );
    setSceneSaveState("saved");
  }

  const queueScenePersist = useEffectEvent((sceneToSave: ProjectEditorScene) => {
    persistScene(sceneToSave).catch((error) => {
      console.error("Project scene save error:", error);
      setSceneSaveState("error");
    });
  });

  useEffect(() => {
    if (!didHydrateSceneRef.current) {
      didHydrateSceneRef.current = true;
      return;
    }
    const serialized = JSON.stringify(scene);
    if (serialized === lastSavedSceneRef.current) return;

    setSceneSaveState("dirty");
    const timeout = window.setTimeout(() => {
      queueScenePersist(scene);
    }, 600);

    return () => window.clearTimeout(timeout);
  }, [queueScenePersist, scene]);

  useEffect(() => {
    if (!interaction || !activeBoard) return;

    const onPointerMove = (event: PointerEvent) => {
      const scaleX = PROJECT_BOARD_WIDTH / Math.max(boardRender.width, 1);
      const scaleY = PROJECT_BOARD_HEIGHT / Math.max(boardRender.height, 1);
      const deltaX = (event.clientX - interaction.startClientX) * scaleX;
      const deltaY = (event.clientY - interaction.startClientY) * scaleY;

      setScene((currentScene) =>
        normalizeProjectEditorScene({
          ...currentScene,
          boards: currentScene.boards.map((board) => {
            if (board.id !== currentScene.activeBoardId) return board;
            return {
              ...board,
              nodes: board.nodes.map((node) => {
                if (node.id !== interaction.nodeId) return node;
                if (interaction.mode === "move") {
                  const nextX = clamp(
                    interaction.originNode.x + deltaX,
                    0,
                    PROJECT_BOARD_WIDTH - interaction.originNode.width
                  );
                  const nextY = clamp(
                    interaction.originNode.y + deltaY,
                    0,
                    PROJECT_BOARD_HEIGHT - interaction.originNode.height
                  );
                  return { ...node, x: nextX, y: nextY };
                }

                if (node.type !== "image" || interaction.originNode.type !== "image") {
                  return node;
                }

                const nextWidth = clamp(interaction.originNode.width + deltaX, 120, PROJECT_BOARD_WIDTH);
                const nextHeight = clamp(
                  interaction.originNode.height + deltaY,
                  120,
                  PROJECT_BOARD_HEIGHT
                );

                return {
                  ...node,
                  width: Math.min(nextWidth, PROJECT_BOARD_WIDTH - node.x),
                  height: Math.min(nextHeight, PROJECT_BOARD_HEIGHT - node.y),
                };
              }),
            };
          }),
        })
      );
    };

    const onPointerUp = () => {
      setInteraction(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [activeBoard, boardRender.height, boardRender.width, interaction]);

  function updateScene(updater: (current: ProjectEditorScene) => ProjectEditorScene) {
    setScene((current) => normalizeProjectEditorScene(updater(current)));
  }

  function updateActiveBoard(
    updater: (board: ProjectBoard) => ProjectBoard,
    options?: { selectBoard?: boolean }
  ) {
    updateScene((current) => ({
      ...current,
      boards: current.boards.map((board) =>
        board.id === current.activeBoardId ? updater(board) : board
      ),
    }));
    if (options?.selectBoard) setSelection({ kind: "board" });
  }

  function updateSelectedNode(updater: (node: ProjectBoardNode) => ProjectBoardNode) {
    if (selection.kind !== "node") return;
    updateActiveBoard((board) => ({
      ...board,
      nodes: board.nodes.map((node) => (node.id === selection.nodeId ? updater(node) : node)),
    }));
  }

  function setActiveBoard(boardId: string) {
    updateScene((current) => ({
      ...current,
      activeBoardId: boardId,
      generationScope:
        current.generationScope.mode === "current"
          ? { mode: "current", boardIds: [boardId] }
          : current.generationScope,
    }));
    setSelection({ kind: "board" });
    setEditingTextNodeId(null);
  }

  function addBoard() {
    const newBoard = createProjectBoard({
      name: `Board ${scene.boards.length + 1}`,
      intent: "",
      status: "empty",
    });
    updateScene((current) => {
      const currentIndex = current.boardOrder.findIndex((boardId) => boardId === current.activeBoardId);
      const insertIndex = currentIndex >= 0 ? currentIndex + 1 : current.boardOrder.length;
      const nextOrder = [...current.boardOrder];
      nextOrder.splice(insertIndex, 0, newBoard.id);
      return {
        ...current,
        activeBoardId: newBoard.id,
        boardOrder: nextOrder,
        boards: [...current.boards, newBoard],
        generationScope:
          current.generationScope.mode === "current"
            ? { mode: "current", boardIds: [newBoard.id] }
            : current.generationScope,
      };
    });
    setSelection({ kind: "board" });
    setLeftPanel("boards");
  }

  function duplicateActiveBoard() {
    if (!activeBoard) return;
    const duplicated = duplicateBoard(activeBoard);
    updateScene((current) => {
      const currentIndex = current.boardOrder.findIndex((boardId) => boardId === current.activeBoardId);
      const nextOrder = [...current.boardOrder];
      nextOrder.splice(currentIndex + 1, 0, duplicated.id);
      return {
        ...current,
        activeBoardId: duplicated.id,
        boardOrder: nextOrder,
        boards: [...current.boards, duplicated],
      };
    });
    setSelection({ kind: "board" });
  }

  function deleteActiveBoard() {
    if (!activeBoard || scene.boardOrder.length <= 1) return;
    updateScene((current) => {
      const currentIndex = current.boardOrder.findIndex((boardId) => boardId === current.activeBoardId);
      const nextOrder = current.boardOrder.filter((boardId) => boardId !== current.activeBoardId);
      const nextActive = nextOrder[Math.max(currentIndex - 1, 0)] ?? nextOrder[0];
      return {
        ...current,
        activeBoardId: nextActive,
        boardOrder: nextOrder,
        boards: current.boards.filter((board) => board.id !== current.activeBoardId),
        generationScope:
          current.generationScope.mode === "selected"
            ? {
                mode: nextOrder.some((boardId) => current.generationScope.boardIds.includes(boardId))
                  ? "selected"
                  : "current",
                boardIds: current.generationScope.boardIds.filter((boardId) => boardId !== current.activeBoardId),
              }
            : current.generationScope.mode === "current"
              ? { mode: "current", boardIds: [nextActive] }
              : {
                  mode: "all",
                  boardIds: nextOrder,
                },
      };
    });
    setSelection({ kind: "board" });
    setEditingTextNodeId(null);
  }

  function addTextNode() {
    const node = createProjectTextNode({
      text: "新文本",
      role: "title",
      x: 160,
      y: 140,
      width: 720,
      height: 140,
      fontSize: 72,
      fontWeight: 700,
      lineHeight: 1.08,
      zIndex: Math.max(...(activeBoard?.nodes.map((item) => item.zIndex) ?? [0])) + 1,
    });
    updateActiveBoard(
      (board) => ({
        ...board,
        status: board.nodes.length === 0 ? "draft" : board.status,
        nodes: [...board.nodes, node],
      }),
      { selectBoard: false }
    );
    setSelection({ kind: "node", nodeId: node.id });
    setEditingTextNodeId(node.id);
    setEditingTextDraft(node.text);
  }

  function removeSelectedNode() {
    if (selection.kind !== "node") return;
    updateActiveBoard((board) => {
      const target = board.nodes.find((node) => node.id === selection.nodeId);
      const nextNodes = board.nodes.filter((node) => node.id !== selection.nodeId);
      const nextThumbnail =
        target?.type === "image" && board.thumbnailAssetId === target.assetId
          ? nextNodes.find((node): node is ProjectBoardImageNode => node.type === "image")?.assetId ?? null
          : board.thumbnailAssetId;
      return {
        ...board,
        nodes: nextNodes,
        thumbnailAssetId: nextThumbnail,
        status: nextNodes.length === 0 ? "empty" : board.status,
      };
    });
    setSelection({ kind: "board" });
    setEditingTextNodeId(null);
  }

  function moveSelectedNodeZ(direction: "front" | "back") {
    if (!activeBoard || selection.kind !== "node") return;
    const sorted = [...activeBoard.nodes].sort((a, b) => a.zIndex - b.zIndex);
    const currentIndex = sorted.findIndex((node) => node.id === selection.nodeId);
    if (currentIndex < 0) return;
    const targetIndex =
      direction === "front"
        ? Math.min(sorted.length - 1, currentIndex + 1)
        : Math.max(0, currentIndex - 1);
    if (targetIndex === currentIndex) return;

    const reordered = arrayMove(sorted, currentIndex, targetIndex).map((node, index) => ({
      ...node,
      zIndex: index + 1,
    }));
    updateActiveBoard((board) => ({ ...board, nodes: reordered }));
  }

  function setGenerationMode(mode: GenerationScope["mode"]) {
    updateScene((current) => {
      if (mode === "all") {
        return {
          ...current,
          generationScope: { mode: "all", boardIds: current.boardOrder },
        };
      }

      if (mode === "selected") {
        const selectedIds =
          current.generationScope.mode === "selected" && current.generationScope.boardIds.length > 0
            ? current.generationScope.boardIds
            : [current.activeBoardId];
        return {
          ...current,
          generationScope: { mode: "selected", boardIds: selectedIds },
        };
      }

      return {
        ...current,
        generationScope: { mode: "current", boardIds: [current.activeBoardId] },
      };
    });
  }

  function toggleBoardInSelection(boardId: string) {
    updateScene((current) => {
      const currentIds =
        current.generationScope.mode === "selected"
          ? current.generationScope.boardIds
          : [boardId];
      const exists = currentIds.includes(boardId);
      const nextIds = exists
        ? currentIds.filter((value) => value !== boardId)
        : [...currentIds, boardId];

      if (nextIds.length === 0) {
        return {
          ...current,
          generationScope: { mode: "current", boardIds: [current.activeBoardId] },
        };
      }

      return {
        ...current,
        generationScope: { mode: "selected", boardIds: nextIds },
      };
    });
  }

  function applyZoom(nextZoom: number, origin?: { clientX: number; clientY: number }) {
    const container = boardViewportRef.current;
    if (!container) {
      updateScene((current) => ({
        ...current,
        viewport: {
          ...current.viewport,
          zoom: nextZoom,
        },
      }));
      return;
    }

    const rect = container.getBoundingClientRect();
    const fallbackX = rect.left + rect.width / 2;
    const fallbackY = rect.top + rect.height / 2;
    const originX = origin?.clientX ?? fallbackX;
    const originY = origin?.clientY ?? fallbackY;
    const contentRatioX =
      container.scrollWidth > 0
        ? (container.scrollLeft + (originX - rect.left)) / container.scrollWidth
        : 0.5;
    const contentRatioY =
      container.scrollHeight > 0
        ? (container.scrollTop + (originY - rect.top)) / container.scrollHeight
        : 0.5;

    updateScene((current) => ({
      ...current,
      viewport: {
        ...current.viewport,
        zoom: nextZoom,
      },
    }));

    window.requestAnimationFrame(() => {
      container.scrollLeft = container.scrollWidth * contentRatioX - (originX - rect.left);
      container.scrollTop = container.scrollHeight * contentRatioY - (originY - rect.top);
    });
  }

  function setZoom(delta: number, origin?: { clientX: number; clientY: number }) {
    applyZoom(clamp(scene.viewport.zoom + delta, 0.55, 1.8), origin);
  }

  function resetZoom() {
    applyZoom(1);
  }

  function handleBoardViewportWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    const nextDelta = event.deltaY < 0 ? 0.08 : -0.08;
    setZoom(nextDelta, { clientX: event.clientX, clientY: event.clientY });
  }

  function startNodeMove(event: ReactPointerEvent<HTMLButtonElement>, node: ProjectBoardNode) {
    event.preventDefault();
    event.stopPropagation();
    setSelection({ kind: "node", nodeId: node.id });
    setInteraction({
      mode: "move",
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originNode: node,
    });
  }

  function startNodeResize(event: ReactPointerEvent<HTMLButtonElement>, node: ProjectBoardImageNode) {
    event.preventDefault();
    event.stopPropagation();
    setSelection({ kind: "node", nodeId: node.id });
    setInteraction({
      mode: "resize",
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originNode: node,
    });
  }

  function beginInlineTextEdit(node: ProjectBoardTextNode) {
    setSelection({ kind: "node", nodeId: node.id });
    setEditingTextNodeId(node.id);
    setEditingTextDraft(node.text);
  }

  function commitInlineTextEdit() {
    if (!editingTextNodeId) return;
    const nextValue = editingTextDraft.trim();
    if (!nextValue) return;
    updateSelectedNode((node) =>
      node.type === "text" && node.id === editingTextNodeId
        ? { ...node, text: nextValue }
        : node
    );
    setEditingTextNodeId(null);
    setEditingTextDraft("");
  }

  async function refreshAssets() {
    const response = await fetch(`/api/projects/${initialData.id}/assets`);
    const data = await parseJsonResponse(response);
    setAssets(data.assets as ProjectAsset[]);
  }

  async function saveAssetFlags(nextAssets: ProjectAsset[]) {
    setUpdatingAssetFlags(true);
    try {
      await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/assets`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assets: nextAssets.map((asset, index) => ({
              id: asset.id,
              selected: asset.selected,
              sortOrder: asset.sortOrder ?? index,
              isCover: asset.isCover,
            })),
          }),
        })
      );
      setAssets(nextAssets);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "素材状态更新失败");
    } finally {
      setUpdatingAssetFlags(false);
    }
  }

  function handleToggleAssetSelected(assetId: string) {
    const nextAssets = assets.map((asset) =>
      asset.id === assetId ? { ...asset, selected: !asset.selected } : asset
    );
    void saveAssetFlags(nextAssets);
  }

  function handleSetAssetCover(assetId: string) {
    const nextAssets = assets.map((asset) => ({
      ...asset,
      isCover: asset.id === assetId,
    }));
    void saveAssetFlags(nextAssets);
  }

  async function handleSaveFacts() {
    setSavingFacts(true);
    setFactsMessage("");
    setActionError("");

    try {
      await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/facts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(facts),
        })
      );
      setFactsMessage("项目信息已保存");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "保存失败，请稍后重试");
    } finally {
      setSavingFacts(false);
    }
  }

  async function handleUploadAssets(files: File[]) {
    if (files.length === 0) return;
    setUploadingAssets(true);
    setActionError("");

    try {
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

      await refreshAssets();
      setLeftPanel("assets");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "素材上传失败，请稍后重试");
    } finally {
      setUploadingAssets(false);
    }
  }

  function handleOpenAssetPicker() {
    assetPickerRef.current?.click();
  }

  async function handleAssetFilesPicked(files: FileList | null) {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    await handleUploadAssets(selectedFiles);
    if (assetPickerRef.current) {
      assetPickerRef.current.value = "";
    }
  }

  async function persistCurrentSceneForAction() {
    try {
      await persistScene(scene, true);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "画板保存失败，请稍后重试");
      throw error;
    }
  }

  async function handleRunDiagnosis() {
    setDiagnosing(true);
    setActionError("");
    setRightPanel("ai");

    try {
      await persistCurrentSceneForAction();

      const payload = JSON.stringify({ generationScope: scene.generationScope });
      const [boundaryResult, completenessResult, packageResult] = await Promise.allSettled([
        parseJsonResponse(
          await fetch(`/api/projects/${initialData.id}/boundary/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          })
        ),
        parseJsonResponse(
          await fetch(`/api/projects/${initialData.id}/completeness/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          })
        ),
        parseJsonResponse(
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
        nextBoundary = boundaryResult.value.analysis as BoundaryAnalysis;
        setBoundaryAnalysis(nextBoundary);
        successCount += 1;
      } else {
        failures.push(
          `边界分析：${boundaryResult.reason instanceof Error ? boundaryResult.reason.message : "失败"}`
        );
      }

      if (completenessResult.status === "fulfilled") {
        nextCompleteness = completenessResult.value.analysis as CompletenessAnalysis;
        setCompletenessAnalysis(nextCompleteness);
        successCount += 1;
      } else {
        failures.push(
          `完整度检查：${completenessResult.reason instanceof Error ? completenessResult.reason.message : "失败"}`
        );
      }

      if (packageResult.status === "fulfilled") {
        setPackageRecommendation(packageResult.value.recommendation as PackageRecommendation);
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
        const markedScene = markBoardsAsAnalyzed(scene, generationBoardIds, nextStatus);
        setScene(markedScene);
      }

      if (failures.length > 0) {
        setActionError(
          successCount > 0 ? `部分诊断已完成；${failures.join("；")}` : failures.join("；")
        );
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "项目诊断失败，请稍后重试");
    } finally {
      setDiagnosing(false);
    }
  }

  async function ensureLayoutStage(mode: string) {
    let currentStage = stage;
    let guard = 0;

    while (!["LAYOUT", "READY"].includes(currentStage) && guard < 6) {
      const response = await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentStage === "PACKAGE" ? { packageMode: mode } : {}),
        })
      );

      currentStage = response.stage as string;
      setStage(currentStage);

      if (response.packageMode) {
        setPackageMode(response.packageMode as string);
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
      const data = await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/layout/precheck`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleSelection: getResolvedStyleSelection(),
            generationScope: scene.generationScope,
          }),
        })
      );
      setGeneratePrecheck(data as GeneratePrecheck);
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

  async function handleGenerateLayout() {
    const resolvedMode = packageMode ?? packageRecommendation?.recommendedMode ?? null;

    if (!resolvedMode) {
      setActionError("请先运行项目诊断，拿到包装模式建议后再生成排版。");
      return;
    }

    setGeneratingLayout(true);
    setActionError("");

    try {
      await persistCurrentSceneForAction();

      if (!packageMode) {
        const stageData = await parseJsonResponse(
          await fetch(`/api/projects/${initialData.id}/stage`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageMode: resolvedMode, preserveStage: true }),
          })
        );

        if (stageData.packageMode) {
          setPackageMode(stageData.packageMode as string);
        }
        if (stageData.stage) {
          setStage(stageData.stage as string);
        }
      }

      await ensureLayoutStage(resolvedMode);

      const data = await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/layout/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleSelection: getResolvedStyleSelection(),
            generationScope: scene.generationScope,
          }),
        })
      );

      const nextLayout = data.layoutJson as LayoutJson;
      setLayout(nextLayout);
      if (nextLayout.editorScene) {
        setScene(resolveProjectEditorScene(nextLayout, { assets, projectName: initialData.name }));
        lastSavedSceneRef.current = JSON.stringify(
          resolveProjectEditorScene(nextLayout, { assets, projectName: initialData.name })
        );
      }
      if ((data as { reused?: boolean }).reused) {
        setFactsMessage("命中可复用排版结果，本次没有额外计次。");
      }
      setGenerateOpen(false);
      setRightPanel("ai");
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "排版生成失败，请稍后重试");
    } finally {
      setGeneratingLayout(false);
    }
  }

  async function handleSaveSelectedAssetMeta() {
    if (!selectedAsset || !selectedNode || selectedNode.type !== "image") return;
    setAssetMetaSaving(true);
    setActionError("");

    const meta = resolveProjectAssetMeta(selectedAsset.metaJson);
    const note = selectedNode.note ?? meta.note ?? null;
    const roleTag = selectedNode.roleTag ?? meta.roleTag ?? null;

    try {
      const data = await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/assets/${selectedAsset.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: selectedAsset.title ?? "",
            note,
            roleTag,
          }),
        })
      );

      setAssets((current) =>
        current.map((asset) => (asset.id === selectedAsset.id ? (data.asset as ProjectAsset) : asset))
      );
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "素材备注保存失败");
    } finally {
      setAssetMetaSaving(false);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const dragType = event.active.data.current?.type;
    if (!event.over) return;

    if (dragType === "board" && event.active.id !== event.over.id) {
      const oldIndex = scene.boardOrder.findIndex((boardId) => boardId === event.active.id);
      const newIndex = scene.boardOrder.findIndex((boardId) => boardId === event.over?.id);
      if (oldIndex >= 0 && newIndex >= 0) {
        updateScene((current) => ({
          ...current,
          boardOrder: arrayMove(current.boardOrder, oldIndex, newIndex),
        }));
      }
      return;
    }

    if (dragType !== "asset" || event.over.id !== "project-board-drop" || !boardDropRef.current) {
      return;
    }

    const assetId = event.active.data.current?.assetId as string | undefined;
    const asset = assetId ? assetMap.get(assetId) : null;
    if (!asset || !activeBoard) return;

    const boardRect = boardDropRef.current.getBoundingClientRect();
    const translatedRect = event.active.rect.current.translated ?? event.active.rect.current.initial;
    if (!translatedRect) return;
    const centerX = translatedRect.left + translatedRect.width / 2;
    const centerY = translatedRect.top + translatedRect.height / 2;
    const relativeX = clamp((centerX - boardRect.left) / Math.max(boardRect.width, 1), 0.08, 0.92);
    const relativeY = clamp((centerY - boardRect.top) / Math.max(boardRect.height, 1), 0.08, 0.92);
    const meta = resolveProjectAssetMeta(asset.metaJson);
    const node = createProjectImageNode(asset.id, {
      x: clamp(relativeX * PROJECT_BOARD_WIDTH - 320, 32, PROJECT_BOARD_WIDTH - 640),
      y: clamp(relativeY * PROJECT_BOARD_HEIGHT - 220, 32, PROJECT_BOARD_HEIGHT - 440),
      width: 640,
      height: 440,
      note: meta.note ?? null,
      roleTag: meta.roleTag ?? null,
      zIndex: Math.max(...activeBoard.nodes.map((item) => item.zIndex), 0) + 1,
    });

    updateActiveBoard((board) => ({
      ...board,
      status: board.nodes.length === 0 ? "draft" : board.status,
      thumbnailAssetId: board.thumbnailAssetId ?? asset.id,
      nodes: [...board.nodes, node],
    }));
    setSelection({ kind: "node", nodeId: node.id });
    setRightPanel("inspector");
  }

  const factsSnapshot = [
    { label: "项目类型", value: facts.projectType.trim() || "待补充" },
    { label: "所属行业", value: facts.industry.trim() || "待补充" },
    { label: "我的角色", value: facts.roleTitle.trim() || "待补充" },
    { label: "背景摘要", value: facts.background.trim() ? "已补充背景" : "待补充" },
    { label: "结果摘要", value: facts.resultSummary.trim() ? "已补充结果" : "待补充" },
  ];

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <EditorScaffold
          objectLabel="项目"
          objectName={initialData.name}
          backHref="/projects"
          backLabel="全部项目"
          statusLabel={stageInfo?.label ?? "草稿"}
          statusMeta={`${scene.boards.length} 张画板 · ${assets.length} 张素材`}
          primaryAction={
            <Button
              className="h-10 gap-2 rounded-full border border-white/8 bg-white px-4 text-neutral-950 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.55)] hover:bg-white/90"
              onClick={handleOpenGenerate}
            >
              <Wand2 className="h-4 w-4" />
              生成排版
            </Button>
          }
          secondaryAction={
            <EditorChromeButton
              className="h-10 gap-2 px-4"
              onClick={handleRunDiagnosis}
              disabled={diagnosing}
            >
              {diagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              项目诊断
            </EditorChromeButton>
          }
          planSummary={planSummary}
          leftRailLabel="素材与项目"
          rightRailLabel="属性与 AI"
          leftRail={
            <div className="flex h-full min-h-0">
              <div className="flex w-[82px] shrink-0 flex-col gap-2 border-r border-white/6 bg-[#121110] p-3">
                {LEFT_PANEL_ITEMS.map((item) => (
                  <LeftRailIconButton
                    key={item.key}
                    active={leftPanel === item.key}
                    label={item.label}
                    icon={item.icon}
                    onClick={() => setLeftPanel(item.key)}
                  />
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {leftPanel === "project" ? (
                  <>
                    <EditorRailSection title="项目状态">
                      <EditorInfoList
                        items={[
                          { label: "导入方式", value: sourceTypeLabel(initialData.sourceType) },
                          { label: "项目阶段", value: stageInfo?.label ?? "草稿" },
                          { label: "包装模式", value: packageModeLabel(packageMode) },
                          { label: "排版次数", value: `${initialData.actionSummary.layoutGenerations.remaining} 次剩余` },
                        ]}
                      />
                    </EditorRailSection>

                    <EditorRailSection title="项目事实">
                      <div className="grid gap-2">
                        {factsSnapshot.map((item) => (
                          <EditorPanelCard key={item.label} className="bg-white/2">
                            <FieldLabel>{item.label}</FieldLabel>
                            <p className="mt-2 text-sm text-white/78">{item.value}</p>
                          </EditorPanelCard>
                        ))}
                      </div>
                    </EditorRailSection>

                    <EditorRailSection title="编辑项目">
                      <div className="space-y-3">
                        <Input
                          value={facts.projectType}
                          onChange={(event) =>
                            setFacts((current) => ({ ...current, projectType: event.target.value }))
                          }
                          placeholder="项目类型"
                          className={cn("h-10", editorFieldClass)}
                        />
                        <Input
                          value={facts.industry}
                          onChange={(event) =>
                            setFacts((current) => ({ ...current, industry: event.target.value }))
                          }
                          placeholder="所属行业"
                          className={cn("h-10", editorFieldClass)}
                        />
                        <Input
                          value={facts.roleTitle}
                          onChange={(event) =>
                            setFacts((current) => ({ ...current, roleTitle: event.target.value }))
                          }
                          placeholder="我的角色"
                          className={cn("h-10", editorFieldClass)}
                        />
                        <Textarea
                          value={facts.background}
                          onChange={(event) =>
                            setFacts((current) => ({ ...current, background: event.target.value }))
                          }
                          placeholder="项目背景"
                          className={cn("min-h-28", editorFieldClass)}
                        />
                        <Textarea
                          value={facts.resultSummary}
                          onChange={(event) =>
                            setFacts((current) => ({ ...current, resultSummary: event.target.value }))
                          }
                          placeholder="结果摘要"
                          className={cn("min-h-24", editorFieldClass)}
                        />
                        <Button
                          variant="outline"
                          className="h-11 w-full rounded-full border-white/8 bg-white text-neutral-950 hover:bg-white/90"
                          onClick={handleSaveFacts}
                          disabled={savingFacts}
                        >
                          {savingFacts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          保存项目信息
                        </Button>
                        {factsMessage ? <p className="text-xs text-white/56">{factsMessage}</p> : null}
                      </div>
                    </EditorRailSection>
                  </>
                ) : null}

                {leftPanel === "assets" ? (
                  <>
                    <EditorRailSection title="上传素材">
                      <input
                        ref={assetPickerRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        multiple
                        className="hidden"
                        onChange={(event) => {
                          void handleAssetFilesPicked(event.target.files);
                        }}
                      />
                      <Button
                        className="h-11 w-full rounded-full border border-white/8 bg-white text-neutral-950 hover:bg-white/90"
                        onClick={handleOpenAssetPicker}
                        disabled={uploadingAssets}
                      >
                        {uploadingAssets ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {!uploadingAssets ? <Upload className="h-4 w-4" /> : null}
                        上传素材
                      </Button>
                      <p className="mt-3 text-xs leading-5 text-white/36">
                        支持 JPG / PNG / WebP。点击按钮选择文件后会直接上传到素材库。
                      </p>
                    </EditorRailSection>

                    <EditorRailSection title="素材墙" className="flex-1">
                      <div className="relative mb-3">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/28" />
                        <Input
                          placeholder="搜索素材标题或备注"
                          value={assetSearch}
                          onChange={(event) => setAssetSearch(event.target.value)}
                          className={cn("col-span-2 h-10 pl-9", editorFieldClass)}
                        />
                      </div>
                      <div className="col-span-2 mb-1 flex items-center justify-between text-xs text-white/38">
                        <span>已显示 {visibleAssets.length} / {assets.length} 张素材</span>
                        <span>{usedAssetIds.size} 张已在画板中使用</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        {visibleAssets.length > 0 ? (
                          visibleAssets.map((asset) => (
                            <DraggableAssetCard
                              key={asset.id}
                              asset={asset}
                              active={activeDragId === `asset:${asset.id}`}
                              used={usedAssetIds.has(asset.id)}
                              onToggleSelected={handleToggleAssetSelected}
                              onSetCover={handleSetAssetCover}
                            />
                          ))
                        ) : (
                          <EditorEmptyState className="col-span-2">
                            {assets.length > 0
                              ? "没有匹配的素材。试试别的关键词，或清空搜索。"
                              : "还没有素材。先上传过程图、关键界面或结果画面，再拖进当前画板。"}
                          </EditorEmptyState>
                        )}
                        {updatingAssetFlags ? (
                          <p className="col-span-2 text-xs text-white/42">正在同步素材状态…</p>
                        ) : null}
                      </div>
                    </EditorRailSection>
                  </>
                ) : null}

                {leftPanel === "notes" ? (
                  <>
                    <EditorRailSection title="临时备注">
                      <Textarea
                        value={notesDraft}
                        onChange={(event) => setNotesDraft(event.target.value)}
                        placeholder="记录这次调整的思路、缺口或后续要追问的事实"
                        className={cn("min-h-40", editorFieldClass)}
                      />
                      <p className="mt-3 text-xs leading-5 text-white/34">
                        这里目前是本地临时便签位，不会参与 AI 生成。等 editor 交互定型后，再拆成正式备注对象。
                      </p>
                    </EditorRailSection>
                    <EditorRailSection title="当前画板意图">
                      {activeBoard ? (
                        <EditorPanelCard>
                          <FieldLabel>{activeBoard.name}</FieldLabel>
                          <p className="mt-2 text-sm leading-6 text-white/68">
                            {activeBoard.intent || "这张画板还没有明确意图。"}
                          </p>
                        </EditorPanelCard>
                      ) : (
                        <EditorEmptyState>当前没有可编辑的画板。</EditorEmptyState>
                      )}
                    </EditorRailSection>
                  </>
                ) : null}

                {leftPanel === "boards" ? (
                  <>
                    <EditorRailSection title="画板操作">
                      <div className="grid grid-cols-2 gap-2">
                        <EditorChromeButton className="h-10 justify-start px-3" onClick={addBoard}>
                          <Plus className="h-4 w-4" />
                          新建
                        </EditorChromeButton>
                        <EditorChromeButton
                          className="h-10 justify-start px-3"
                          onClick={duplicateActiveBoard}
                          disabled={!activeBoard}
                        >
                          <Copy className="h-4 w-4" />
                          复制
                        </EditorChromeButton>
                        <EditorChromeButton className="h-10 justify-start px-3" onClick={addTextNode}>
                          <Type className="h-4 w-4" />
                          文本
                        </EditorChromeButton>
                        <EditorChromeButton
                          className="h-10 justify-start px-3"
                          onClick={deleteActiveBoard}
                          disabled={scene.boardOrder.length <= 1}
                        >
                          <Trash2 className="h-4 w-4" />
                          删除
                        </EditorChromeButton>
                      </div>
                    </EditorRailSection>

                    <EditorRailSection title="画板列表">
                      <div className="space-y-2">
                        {scene.boardOrder.map((boardId) => {
                          const board = scene.boards.find((item) => item.id === boardId);
                          if (!board) return null;
                          const thumbnailAssetId = getBoardThumbnailAssetId(board);
                          const thumbnailAsset = thumbnailAssetId ? assetMap.get(thumbnailAssetId) : null;
                          return (
                            <EditorSurfaceButton
                              key={board.id}
                              active={scene.activeBoardId === board.id}
                              onClick={() => setActiveBoard(board.id)}
                            >
                              <div className="flex items-start gap-3">
                                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                                  {thumbnailAsset ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={buildPrivateBlobProxyUrl(thumbnailAsset.imageUrl)}
                                      alt={board.name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <div className="flex h-full items-center justify-center text-xs text-white/28">
                                      16:9
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-white">{board.name}</p>
                                  <p className="mt-1 truncate text-xs text-white/46">
                                    {board.intent || "暂无页面意图"}
                                  </p>
                                </div>
                              </div>
                            </EditorSurfaceButton>
                          );
                        })}
                      </div>
                    </EditorRailSection>
                  </>
                ) : null}

                {leftPanel === "history" ? (
                  <>
                    <EditorRailSection title="AI 历史">
                      <div className="space-y-3">
                        {aiHistory.length > 0 ? (
                          aiHistory.map((item) => (
                            <EditorPanelCard key={item.key}>
                              <FieldLabel>{item.label}</FieldLabel>
                              <p className="mt-2 text-sm leading-6 text-white/68">{item.summary}</p>
                            </EditorPanelCard>
                          ))
                        ) : (
                          <EditorEmptyState>
                            还没有历史结果。先运行一次项目诊断或排版生成。
                          </EditorEmptyState>
                        )}
                      </div>
                    </EditorRailSection>
                  </>
                ) : null}
              </div>
            </div>
          }
          center={
            <div className="relative flex h-full min-h-0 flex-col">
              <div className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2">
                <div className="pointer-events-auto flex items-center gap-2 rounded-[22px] border border-black/6 bg-[#f1eee8]/94 px-3 py-2 text-neutral-950 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.42)] backdrop-blur-sm">
                  <div className="min-w-0 pr-1">
                    <p className="max-w-[180px] truncate text-sm font-semibold">
                      {activeBoard?.name ?? "Untitled board"}
                    </p>
                    <p className="max-w-[220px] truncate text-xs text-neutral-500">
                      {activeBoard?.intent || "把左侧素材拖进画板，先搭出这一页的主结构。"}
                    </p>
                  </div>
                  <div className="h-8 w-px bg-black/8" />
                  <span className="inline-flex items-center rounded-full border border-black/8 bg-white/85 px-3 py-1 text-xs text-neutral-700">
                    {boardStatusLabel(activeBoard?.status ?? "empty")}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-black/8 bg-white/85 px-3 py-1 text-xs text-neutral-700">
                    {scene.generationScope.mode === "current"
                      ? "当前页"
                      : scene.generationScope.mode === "selected"
                        ? `已选 ${generationBoardIds.length}`
                        : `全部 ${scene.boardOrder.length}`}
                  </span>
                  <div className="h-8 w-px bg-black/8" />
                  <EditorChromeButton
                    className="h-10 gap-2 border-black/8 bg-white px-4 text-neutral-950 hover:bg-neutral-100 hover:text-neutral-950"
                    onClick={addTextNode}
                  >
                    <Type className="h-4 w-4" />
                    添加文本
                  </EditorChromeButton>
                  <div className="h-8 w-px bg-black/8" />
                  <EditorChromeIconButton
                    className="border-black/8 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                    onClick={() => setZoom(-0.1)}
                    aria-label="缩小画板"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </EditorChromeIconButton>
                  <button
                    type="button"
                    onClick={resetZoom}
                    className="inline-flex h-10 items-center rounded-full border border-black/8 bg-white px-3 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-950"
                  >
                    {Math.round(scene.viewport.zoom * 100)}%
                  </button>
                  <EditorChromeIconButton
                    className="border-black/8 bg-white text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                    onClick={() => setZoom(0.1)}
                    aria-label="放大画板"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </EditorChromeIconButton>
                </div>
              </div>

              <div
                ref={boardViewportRef}
                onWheel={handleBoardViewportWheel}
                className="relative flex-1 overflow-auto px-10 pb-8 pt-24"
              >
                <div className="flex min-h-full min-w-full items-center justify-center">
                  <div className="relative" style={{ width: boardRender.width, height: boardRender.height }}>
                    <BoardDropSurface
                      ref={boardDropRef}
                      board={activeBoard}
                      assets={assetMap}
                      render={boardRender}
                      selection={selection}
                      editingTextNodeId={editingTextNodeId}
                      editingTextDraft={editingTextDraft}
                      onEditingTextChange={setEditingTextDraft}
                      onCommitInlineText={commitInlineTextEdit}
                      onCancelInlineText={() => {
                        setEditingTextNodeId(null);
                        setEditingTextDraft("");
                      }}
                      onSelectBoard={() => {
                        setSelection({ kind: "board" });
                        setEditingTextNodeId(null);
                      }}
                      onSelectNode={(nodeId) => {
                        setSelection({ kind: "node", nodeId });
                        setRightPanel("inspector");
                      }}
                      onStartMove={startNodeMove}
                      onStartResize={startNodeResize}
                      onBeginInlineEdit={beginInlineTextEdit}
                    />
                  </div>
                </div>
              </div>
            </div>
          }
          rightRail={
            <Tabs value={rightPanel} onValueChange={(value) => setRightPanel(value as RightRailPanel)} className="flex h-full flex-col">
              <div className="border-b border-white/6 p-3">
                <EditorTabsList className="grid w-full grid-cols-2">
                  <EditorTabsTrigger value="inspector">属性</EditorTabsTrigger>
                  <EditorTabsTrigger value="ai">AI</EditorTabsTrigger>
                </EditorTabsList>
              </div>

              <TabsContent value="inspector" className="mt-0 flex-1 overflow-y-auto">
                {selection.kind === "board" && activeBoard ? (
                  <>
                    <EditorRailSection title="画板属性">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <FieldLabel>名称</FieldLabel>
                          <Input
                            value={activeBoard.name}
                            onChange={(event) =>
                              updateActiveBoard((board) => ({ ...board, name: event.target.value }))
                            }
                            className={cn("h-10", editorFieldClass)}
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel>页面意图</FieldLabel>
                          <Textarea
                            value={activeBoard.intent}
                            onChange={(event) =>
                              updateActiveBoard((board) => ({ ...board, intent: event.target.value }))
                            }
                            className={cn("min-h-24", editorFieldClass)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <FieldLabel>背景色</FieldLabel>
                            <label className="flex h-10 items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-3">
                              <input
                                type="color"
                                value={activeBoard.frame.background ?? DEFAULT_BOARD_BACKGROUND}
                                onChange={(event) =>
                                  updateActiveBoard((board) => ({
                                    ...board,
                                    frame: { ...board.frame, background: event.target.value },
                                  }))
                                }
                                className="h-5 w-5 rounded border-none bg-transparent p-0"
                              />
                              <span className="text-sm text-white/72">
                                {activeBoard.frame.background ?? DEFAULT_BOARD_BACKGROUND}
                              </span>
                            </label>
                          </div>
                          <div className="space-y-2">
                            <FieldLabel>状态</FieldLabel>
                            <Select
                              value={activeBoard.status}
                              onValueChange={(value) =>
                                updateActiveBoard((board) => ({
                                  ...board,
                                  status: value as ProjectBoardStatus,
                                }))
                              }
                            >
                              <SelectTrigger className={cn("h-10 border-white/10 bg-white/3 text-white")}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PROJECT_BOARD_STATUSES.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {boardStatusLabel(status)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </EditorRailSection>

                    <EditorRailSection title="项目概况">
                      <EditorInfoList
                        items={[
                          { label: "素材数量", value: `${assets.length} 张` },
                          { label: "已上板素材", value: `${usedAssetIds.size} 张` },
                          { label: "包装模式", value: packageModeLabel(packageMode) },
                          { label: "自动保存", value: sceneSaveState === "error" ? "失败" : sceneSaveState },
                        ]}
                      />
                    </EditorRailSection>
                  </>
                ) : null}

                {selection.kind === "node" && selectedNode?.type === "image" ? (
                  <>
                    <EditorRailSection title="图片节点">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <FieldLabel>素材标题</FieldLabel>
                          <Input
                            value={selectedAsset?.title ?? ""}
                            onChange={(event) =>
                              setAssets((current) =>
                                current.map((asset) =>
                                  asset.id === selectedNode.assetId
                                    ? { ...asset, title: event.target.value }
                                    : asset
                                )
                              )
                            }
                            className={cn("h-10", editorFieldClass)}
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel>适配方式</FieldLabel>
                          <Select
                            value={selectedNode.fit}
                            onValueChange={(value) =>
                              updateSelectedNode((node) =>
                                node.type === "image"
                                  ? { ...node, fit: value as ProjectBoardImageNode["fit"] }
                                  : node
                              )
                            }
                          >
                            <SelectTrigger className={cn("h-10 border-white/10 bg-white/3 text-white")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fill">fill</SelectItem>
                              <SelectItem value="fit">fit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <FieldLabel>角色标签</FieldLabel>
                          <Select
                            value={selectedNode.roleTag ?? "none"}
                            onValueChange={(value) => {
                              const nextRoleTag = (value === "none" ? null : value) as ProjectImageRoleTag | null;
                              updateSelectedNode((node) =>
                                node.type === "image" ? { ...node, roleTag: nextRoleTag } : node
                              );
                              setAssets((current) =>
                                current.map((asset) =>
                                  asset.id === selectedNode.assetId
                                    ? {
                                        ...asset,
                                        metaJson: mergeProjectAssetMeta(asset.metaJson, {
                                          roleTag: nextRoleTag,
                                        }),
                                      }
                                    : asset
                                )
                              );
                            }}
                          >
                            <SelectTrigger className={cn("h-10 border-white/10 bg-white/3 text-white")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">未设置</SelectItem>
                              {PROJECT_IMAGE_ROLE_TAGS.map((tag) => (
                                <SelectItem key={tag} value={tag}>
                                  {tag}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <FieldLabel>备注</FieldLabel>
                          <Textarea
                            value={selectedNode.note ?? ""}
                            onChange={(event) => {
                              updateSelectedNode((node) =>
                                node.type === "image" ? { ...node, note: event.target.value } : node
                              );
                              setAssets((current) =>
                                current.map((asset) =>
                                  asset.id === selectedNode.assetId
                                    ? {
                                        ...asset,
                                        metaJson: mergeProjectAssetMeta(asset.metaJson, {
                                          note: event.target.value,
                                        }),
                                      }
                                    : asset
                                )
                              );
                            }}
                            className={cn("min-h-24", editorFieldClass)}
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel>替换素材</FieldLabel>
                          <Select
                            value={selectedNode.assetId}
                            onValueChange={(value) => {
                              const nextAsset = assetMap.get(value);
                              const nextMeta = nextAsset ? resolveProjectAssetMeta(nextAsset.metaJson) : null;
                              updateActiveBoard((board) => ({
                                ...board,
                                thumbnailAssetId:
                                  board.thumbnailAssetId === selectedNode.assetId ? value : board.thumbnailAssetId,
                                nodes: board.nodes.map((node) =>
                                  node.id === selectedNode.id && node.type === "image"
                                    ? {
                                        ...node,
                                        assetId: value,
                                        note: nextMeta?.note ?? null,
                                        roleTag: nextMeta?.roleTag ?? null,
                                      }
                                    : node
                                ),
                              }));
                            }}
                          >
                            <SelectTrigger className={cn("h-10 border-white/10 bg-white/3 text-white")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {assets.map((asset) => (
                                <SelectItem key={asset.id} value={asset.id}>
                                  {asset.title ?? "未命名素材"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </EditorRailSection>

                    <EditorRailSection title="裁切">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <FieldLabel>缩放</FieldLabel>
                          <input
                            type="range"
                            min="1"
                            max="2"
                            step="0.05"
                            value={selectedNode.crop.scale}
                            onChange={(event) =>
                              updateSelectedNode((node) =>
                                node.type === "image"
                                  ? {
                                      ...node,
                                      crop: { ...node.crop, scale: Number(event.target.value) },
                                    }
                                  : node
                              )
                            }
                            className="w-full accent-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel>水平重心</FieldLabel>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={selectedNode.crop.x}
                            onChange={(event) =>
                              updateSelectedNode((node) =>
                                node.type === "image"
                                  ? {
                                      ...node,
                                      crop: { ...node.crop, x: Number(event.target.value) },
                                    }
                                  : node
                              )
                            }
                            className="w-full accent-white"
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel>垂直重心</FieldLabel>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={selectedNode.crop.y}
                            onChange={(event) =>
                              updateSelectedNode((node) =>
                                node.type === "image"
                                  ? {
                                      ...node,
                                      crop: { ...node.crop, y: Number(event.target.value) },
                                    }
                                  : node
                              )
                            }
                            className="w-full accent-white"
                          />
                        </div>
                      </div>
                    </EditorRailSection>

                    <EditorRailSection title="节点操作">
                      <div className="grid grid-cols-2 gap-2">
                        <EditorChromeButton className="h-10 justify-start px-3" onClick={() => moveSelectedNodeZ("front")}>
                          <Plus className="h-4 w-4" />
                          前移
                        </EditorChromeButton>
                        <EditorChromeButton className="h-10 justify-start px-3" onClick={() => moveSelectedNodeZ("back")}>
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                          后移
                        </EditorChromeButton>
                        <EditorChromeButton
                          className="h-10 justify-start px-3"
                          onClick={handleSaveSelectedAssetMeta}
                          disabled={assetMetaSaving}
                        >
                          {assetMetaSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          保存素材
                        </EditorChromeButton>
                        <EditorChromeButton className="h-10 justify-start px-3" onClick={removeSelectedNode}>
                          <Trash2 className="h-4 w-4" />
                          删除节点
                        </EditorChromeButton>
                      </div>
                    </EditorRailSection>
                  </>
                ) : null}

                {selection.kind === "node" && selectedNode?.type === "text" ? (
                  <>
                    <EditorRailSection title="文本节点">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <FieldLabel>内容</FieldLabel>
                          <Textarea
                            value={selectedNode.text}
                            onChange={(event) =>
                              updateSelectedNode((node) =>
                                node.type === "text" ? { ...node, text: event.target.value } : node
                              )
                            }
                            className={cn("min-h-28", editorFieldClass)}
                          />
                        </div>
                        <div className="space-y-2">
                          <FieldLabel>文本角色</FieldLabel>
                          <Select
                            value={selectedNode.role}
                            onValueChange={(value) =>
                              updateSelectedNode((node) =>
                                node.type === "text"
                                  ? { ...node, role: value as ProjectTextRole }
                                  : node
                              )
                            }
                          >
                            <SelectTrigger className={cn("h-10 border-white/10 bg-white/3 text-white")}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PROJECT_TEXT_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {role}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <FieldLabel>字号</FieldLabel>
                            <Input
                              type="number"
                              value={selectedNode.fontSize}
                              onChange={(event) =>
                                updateSelectedNode((node) =>
                                  node.type === "text"
                                    ? { ...node, fontSize: Number(event.target.value) || node.fontSize }
                                    : node
                                )
                              }
                              className={cn("h-10", editorFieldClass)}
                            />
                          </div>
                          <div className="space-y-2">
                            <FieldLabel>字重</FieldLabel>
                            <Input
                              type="number"
                              value={selectedNode.fontWeight}
                              onChange={(event) =>
                                updateSelectedNode((node) =>
                                  node.type === "text"
                                    ? { ...node, fontWeight: Number(event.target.value) || node.fontWeight }
                                    : node
                                )
                              }
                              className={cn("h-10", editorFieldClass)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <FieldLabel>行高</FieldLabel>
                            <Input
                              type="number"
                              step="0.05"
                              value={selectedNode.lineHeight}
                              onChange={(event) =>
                                updateSelectedNode((node) =>
                                  node.type === "text"
                                    ? { ...node, lineHeight: Number(event.target.value) || node.lineHeight }
                                    : node
                                )
                              }
                              className={cn("h-10", editorFieldClass)}
                            />
                          </div>
                          <div className="space-y-2">
                            <FieldLabel>颜色</FieldLabel>
                            <label className="flex h-10 items-center gap-3 rounded-xl border border-white/10 bg-white/3 px-3">
                              <input
                                type="color"
                                value={selectedNode.color}
                                onChange={(event) =>
                                  updateSelectedNode((node) =>
                                    node.type === "text"
                                      ? { ...node, color: event.target.value }
                                      : node
                                  )
                                }
                                className="h-5 w-5 rounded border-none bg-transparent p-0"
                              />
                              <span className="text-sm text-white/72">{selectedNode.color}</span>
                            </label>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <FieldLabel>对齐</FieldLabel>
                          <div className="grid grid-cols-3 gap-2">
                            <EditorChromeButton
                              className={cn("h-10", selectedNode.align === "left" && "border-white/18 bg-white/10 text-white")}
                              onClick={() =>
                                updateSelectedNode((node) =>
                                  node.type === "text" ? { ...node, align: "left" } : node
                                )
                              }
                            >
                              <AlignLeft className="h-4 w-4" />
                            </EditorChromeButton>
                            <EditorChromeButton
                              className={cn("h-10", selectedNode.align === "center" && "border-white/18 bg-white/10 text-white")}
                              onClick={() =>
                                updateSelectedNode((node) =>
                                  node.type === "text" ? { ...node, align: "center" } : node
                                )
                              }
                            >
                              <AlignCenter className="h-4 w-4" />
                            </EditorChromeButton>
                            <EditorChromeButton
                              className={cn("h-10", selectedNode.align === "right" && "border-white/18 bg-white/10 text-white")}
                              onClick={() =>
                                updateSelectedNode((node) =>
                                  node.type === "text" ? { ...node, align: "right" } : node
                                )
                              }
                            >
                              <AlignRight className="h-4 w-4" />
                            </EditorChromeButton>
                          </div>
                        </div>
                      </div>
                    </EditorRailSection>

                    <EditorRailSection title="节点操作">
                      <div className="grid grid-cols-2 gap-2">
                        <EditorChromeButton className="h-10 justify-start px-3" onClick={() => moveSelectedNodeZ("front")}>
                          <Plus className="h-4 w-4" />
                          前移
                        </EditorChromeButton>
                        <EditorChromeButton className="h-10 justify-start px-3" onClick={() => moveSelectedNodeZ("back")}>
                          <ArrowLeft className="h-4 w-4 rotate-180" />
                          后移
                        </EditorChromeButton>
                        <EditorChromeButton className="h-10 justify-start px-3" onClick={() => beginInlineTextEdit(selectedNode)}>
                          <Type className="h-4 w-4" />
                          画板编辑
                        </EditorChromeButton>
                        <EditorChromeButton className="h-10 justify-start px-3" onClick={removeSelectedNode}>
                          <Trash2 className="h-4 w-4" />
                          删除节点
                        </EditorChromeButton>
                      </div>
                    </EditorRailSection>
                  </>
                ) : null}

                {!activeBoard ? (
                  <EditorRailSection title="当前对象">
                    <EditorEmptyState>当前没有可编辑内容。</EditorEmptyState>
                  </EditorRailSection>
                ) : null}
              </TabsContent>

              <TabsContent value="ai" className="mt-0 flex-1 overflow-y-auto">
                <EditorRailSection title="看到了什么">
                  <EditorPanelCard>
                    <p className="text-sm leading-7 text-white/74">{currentConclusion}</p>
                  </EditorPanelCard>
                </EditorRailSection>

                <EditorRailSection title="亮点">
                  <div className="space-y-2">
                    {aiHighlights.length > 0 ? (
                      aiHighlights.map((point) => (
                        <EditorPanelCard key={point} className="bg-white/2">
                          {point}
                        </EditorPanelCard>
                      ))
                    ) : (
                      <EditorEmptyState>先运行项目诊断，系统会返回当前亮点和可讲的重点。</EditorEmptyState>
                    )}
                  </div>
                </EditorRailSection>

                <EditorRailSection title="问题">
                  <div className="space-y-2">
                    {aiIssues.map((point) => (
                      <EditorPanelCard key={point} className="bg-white/2">
                        {point}
                      </EditorPanelCard>
                    ))}
                    {aiIssues.length === 0 ? (
                      <EditorEmptyState>当前还没有明确问题项，或者你还没跑过诊断。</EditorEmptyState>
                    ) : null}
                  </div>
                </EditorRailSection>

                <EditorRailSection title="下一步">
                  <EditorPanelCard>
                    <p className="text-sm leading-7 text-white/74">{nextStepConclusion}</p>
                  </EditorPanelCard>
                </EditorRailSection>

                <EditorRailSection title="和上次相比">
                  {aiHistory.length > 1 ? (
                    <EditorPanelCard>
                      已累计 {aiHistory.length} 条 AI 结果。当前最新结论会优先参考你正在编辑的画板范围。
                    </EditorPanelCard>
                  ) : (
                    <EditorEmptyState>还没有形成可比较的历史版本。</EditorEmptyState>
                  )}
                </EditorRailSection>

                <EditorRailSection title="是否可继续排版">
                  <EditorPanelCard>
                    <div className="flex items-center justify-between gap-3">
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
                            "border-white/18 bg-white/8 text-white"
                        )}
                      >
                        {layout?.pages?.length
                          ? "Ready"
                          : completenessAnalysis?.canProceed
                            ? "Proceed"
                            : "Needs work"}
                      </Badge>
                    </div>
                  </EditorPanelCard>
                </EditorRailSection>
              </TabsContent>
            </Tabs>
          }
          bottomStrip={
            <div className="mx-auto flex max-w-[1280px] items-center gap-2 overflow-x-auto rounded-[30px] border border-white/6 bg-[#171614] p-2 shadow-[0_24px_64px_-42px_rgba(0,0,0,0.82)]">
              <SortableContext items={scene.boardOrder} strategy={horizontalListSortingStrategy}>
                {scene.boardOrder.map((boardId) => {
                  const board = scene.boards.find((item) => item.id === boardId);
                  if (!board) return null;
                  return (
                    <SortableBoardStripItem
                      key={board.id}
                      board={board}
                      active={scene.activeBoardId === board.id}
                      selectedForScope={
                        scene.generationScope.mode === "all" ||
                        (scene.generationScope.mode === "selected" &&
                          scene.generationScope.boardIds.includes(board.id)) ||
                        (scene.generationScope.mode === "current" && scene.activeBoardId === board.id)
                      }
                      thumbnailUrl={boardThumbnailMap.get(board.id) ?? null}
                      onClick={() => setActiveBoard(board.id)}
                      onToggleScope={() => toggleBoardInSelection(board.id)}
                    />
                  );
                })}
              </SortableContext>
              <EditorStripButton
                className="flex aspect-video w-[104px] items-center justify-center border-dashed p-0"
                onClick={addBoard}
              >
                <Plus className="h-5 w-5" />
              </EditorStripButton>
            </div>
          }
        />
      </DndContext>

      {actionError ? (
        <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:px-6">
          {actionError}
        </div>
      ) : null}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>生成排版</DialogTitle>
            <DialogDescription>
              系统会基于当前画板范围、facts 和包装模式生成新的项目排版建议，不会覆盖你已经摆好的单画板内容。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm text-neutral-600">
            <Card className="shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
                    范围
                  </Badge>
                  <Button variant="outline" className="h-9 px-3" onClick={refreshGeneratePrecheck}>
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
                          ? "border-neutral-900 bg-neutral-100"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                      )}
                      onClick={() => setGenerationMode(item.mode as GenerationScope["mode"])}
                    >
                      <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{item.detail}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-xs">
                    预检
                  </Badge>
                  {generatePrecheck?.suggestedMode === "reuse" ? (
                    <Badge variant="outline" className="rounded-full">
                      可复用
                    </Badge>
                  ) : null}
                </div>
                {checkingPrecheck ? (
                  <div className="flex items-center gap-2 text-neutral-500">
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

            <Card className="shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">风格参考</p>
                    <p className="mt-1 text-sm leading-6 text-neutral-500">
                      风格参考只影响标题层级、留白密度和包装样式，不改变当前画板结构。
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left transition-colors",
                      styleSelection.source === "none"
                        ? "border-neutral-900 bg-neutral-100"
                        : "border-neutral-200 bg-white hover:border-neutral-300"
                    )}
                    onClick={() => setStyleSelection({ source: "none" })}
                  >
                    <p className="text-sm font-medium text-neutral-900">不使用风格参考</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      保持默认中性风格，优先稳定生成结构。
                    </p>
                  </button>
                  {STYLE_PRESETS.slice(0, 3).map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition-colors",
                        styleSelection.source === "preset" && styleSelection.presetKey === preset.key
                          ? "border-neutral-900 bg-neutral-100"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
                      )}
                      onClick={() => setStyleSelection({ source: "preset", presetKey: preset.key })}
                    >
                      <p className="text-sm font-medium text-neutral-900">{preset.label}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleGenerateLayout}
              disabled={
                generatingLayout ||
                checkingPrecheck ||
                generatePrecheck?.suggestedMode === "block" ||
                (!packageMode && !packageRecommendation)
              }
            >
              {generatingLayout ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              开始生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

const BoardDropSurface = forwardRef<
  HTMLDivElement,
  {
    board: ProjectBoard | null;
    assets: Map<string, ProjectAsset>;
    render: BoardRenderMetrics;
    selection: SceneSelection;
    editingTextNodeId: string | null;
    editingTextDraft: string;
    onEditingTextChange: (value: string) => void;
    onCommitInlineText: () => void;
    onCancelInlineText: () => void;
    onSelectBoard: () => void;
    onSelectNode: (nodeId: string) => void;
    onStartMove: (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectBoardNode) => void;
    onStartResize: (event: ReactPointerEvent<HTMLButtonElement>, node: ProjectBoardImageNode) => void;
    onBeginInlineEdit: (node: ProjectBoardTextNode) => void;
  }
>(function BoardDropSurface(
  {
    board,
    assets,
    render,
    selection,
    editingTextNodeId,
    editingTextDraft,
    onEditingTextChange,
    onCommitInlineText,
    onCancelInlineText,
    onSelectBoard,
    onSelectNode,
    onStartMove,
    onStartResize,
    onBeginInlineEdit,
  },
  ref
) {
  const { isOver, setNodeRef } = useDroppable({
    id: "project-board-drop",
    data: { type: "canvas" },
  });

  function assignRefs(node: HTMLDivElement | null) {
    setNodeRef(node);
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      ref.current = node;
    }
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center">
        <EditorEmptyState className="max-w-md text-center">
          当前没有可编辑画板。先新建一张画板或从底部缩略图切换。
        </EditorEmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        ref={assignRefs}
        onClick={onSelectBoard}
        className={cn(
          "relative block overflow-hidden rounded-[32px] border bg-white text-left shadow-[0_70px_140px_-72px_rgba(0,0,0,0.45)] transition-all",
          isOver ? "border-black/18 ring-2 ring-black/12" : "border-black/8"
        )}
        style={{
          width: render.width,
          height: render.height,
          backgroundColor: board.frame.background,
        }}
      >
        <div className="pointer-events-none absolute left-6 top-6 z-1 flex items-start justify-between gap-4">
          <div className="rounded-full border border-black/8 bg-white/94 px-3 py-1.5 text-xs text-black/56 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.28)] backdrop-blur-sm">
            {board.name}
          </div>
        </div>
        <div className="pointer-events-none absolute right-6 top-6 z-1 rounded-full border border-black/8 bg-white/94 px-3 py-1.5 text-xs text-black/46 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          {PROJECT_BOARD_WIDTH} × {PROJECT_BOARD_HEIGHT}
        </div>

        {board.nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center px-10">
            <div className="max-w-lg rounded-[30px] border border-black/8 bg-[#faf8f4]/96 px-8 py-10 text-center shadow-[0_36px_80px_-54px_rgba(0,0,0,0.28)] backdrop-blur-sm">
              <p className="text-xs text-black/34">Empty board</p>
              <p className="mt-4 text-[30px] font-semibold tracking-[-0.04em] text-neutral-950">
                把第一张素材拖进来
              </p>
              <p className="mt-3 text-sm leading-7 text-black/50">
                先搭出这一页的主视觉和标题层级，底部缩略图负责切换，其余页面不会挤进主画布。
              </p>
            </div>
          </div>
        ) : null}

        {board.nodes
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((node) => {
            const selected = selection.kind === "node" && selection.nodeId === node.id;
            const nodeStyle = {
              left: `${(node.x / PROJECT_BOARD_WIDTH) * 100}%`,
              top: `${(node.y / PROJECT_BOARD_HEIGHT) * 100}%`,
              width: `${(node.width / PROJECT_BOARD_WIDTH) * 100}%`,
              height: `${(node.height / PROJECT_BOARD_HEIGHT) * 100}%`,
            };

            if (node.type === "text") {
              const isEditing = editingTextNodeId === node.id;
              return (
                <div
                  key={node.id}
                  className={cn(
                    "absolute rounded-xl transition-all",
                    selected && "ring-2 ring-black/35"
                  )}
                  style={nodeStyle}
                >
                  {isEditing ? (
                    <textarea
                      value={editingTextDraft}
                      autoFocus
                      onBlur={onCommitInlineText}
                      onChange={(event) => onEditingTextChange(event.target.value)}
                      onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                          event.preventDefault();
                          onCommitInlineText();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          onCancelInlineText();
                        }
                      }}
                      className="h-full w-full resize-none rounded-[22px] border border-black/12 bg-white/96 px-4 py-3 text-neutral-950 outline-hidden backdrop-blur-sm"
                      style={{
                        fontSize: `${(node.fontSize / PROJECT_BOARD_WIDTH) * render.width}px`,
                        fontWeight: node.fontWeight,
                        lineHeight: node.lineHeight,
                        textAlign: node.align,
                        color: node.color,
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectNode(node.id);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        onBeginInlineEdit(node);
                      }}
                      className={cn(
                        "flex h-full w-full items-start rounded-[22px] px-4 py-3 text-left transition-colors",
                        selected ? "bg-black/[0.035]" : "hover:bg-black/2"
                      )}
                      style={{
                        justifyContent:
                          node.align === "center"
                            ? "center"
                            : node.align === "right"
                              ? "flex-end"
                              : "flex-start",
                        fontSize: `${(node.fontSize / PROJECT_BOARD_WIDTH) * render.width}px`,
                        fontWeight: node.fontWeight,
                        lineHeight: node.lineHeight,
                        textAlign: node.align,
                        color: node.color,
                      }}
                    >
                      <span>{node.text}</span>
                    </button>
                  )}
                  {selected ? (
                    <button
                      type="button"
                      onPointerDown={(event) => onStartMove(event, node)}
                      className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-black/62 shadow-[0_16px_32px_-16px_rgba(0,0,0,0.28)]"
                      aria-label="拖拽文本"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              );
            }

            if (node.type !== "image") {
              return null;
            }

            const asset = assets.get(node.assetId);
            const imageScale = node.crop.scale;
            const backgroundPosition = `${node.crop.x * 100}% ${node.crop.y * 100}%`;

            return (
              <div
                key={node.id}
                className={cn(
                  "absolute overflow-hidden rounded-[26px] border bg-black/20 transition-all shadow-[0_20px_40px_-32px_rgba(0,0,0,0.6)]",
                  selected ? "border-black/16 ring-2 ring-black/10" : "border-black/8"
                )}
                style={nodeStyle}
              >
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectNode(node.id);
                  }}
                  onPointerDown={(event) => onStartMove(event, node)}
                  className="absolute inset-0 cursor-move"
                  aria-label={asset?.title ?? "图片节点"}
                >
                  {asset ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                      alt={asset.title ?? "图片节点"}
                      className="h-full w-full"
                      style={{
                        objectFit: node.fit === "fit" ? "contain" : "cover",
                        objectPosition: backgroundPosition,
                        transform: `scale(${imageScale})`,
                        transformOrigin: backgroundPosition,
                      }}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-white/50">
                      素材缺失
                    </div>
                  )}
                </button>
                {selected ? (
                  <>
                    <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-black/8 bg-white/92 px-2 py-1 text-xs text-black/65 shadow-[0_12px_28px_-18px_rgba(0,0,0,0.3)]">
                      {node.roleTag ?? "image"}
                    </div>
                    <button
                      type="button"
                      onPointerDown={(event) => onStartResize(event, node)}
                      className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border border-black/10 bg-white text-black/62 shadow-[0_16px_32px_-16px_rgba(0,0,0,0.28)]"
                      aria-label="缩放图片"
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </button>
                  </>
                ) : null}
              </div>
            );
          })}
      </div>
    </div>
  );
});
