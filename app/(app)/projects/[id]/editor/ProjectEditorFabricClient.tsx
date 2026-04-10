"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
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
  FolderOpen,
  ImageIcon,
  LayoutTemplate,
  Loader2,
  Minus,
  PencilLine,
  Sparkles,
  Square,
  Trash2,
  Triangle,
  Type,
  Layers,
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EditorChromeButton,
  EditorInfoList,
  EditorRailSection,
  EditorScaffold,
  EditorStripButton,
} from "@/components/editor/EditorScaffold";
import type { PlanSummaryCopy } from "@/lib/entitlement";
import {
  createProjectBoard,
  createProjectImageNode,
  markBoardsAfterGeneration,
  markBoardsAsAnalyzed,
  createProjectShapeNode,
  createProjectTextNode,
  getSceneBoardById,
  normalizeProjectEditorScene,
  PROJECT_BOARD_HEIGHT,
  PROJECT_BOARD_WIDTH,
  PROJECT_SHAPE_TYPES,
  resolveProjectEditorScene,
  resolveProjectAssetMeta,
  type ProjectBoard,
  type ProjectBoardImageNode,
  type ProjectBoardNode,
  type ProjectBoardTextNode,
  type ProjectEditorScene,
  type ProjectShapeType,
} from "@/lib/project-editor-scene";
import { cn } from "@/lib/utils";
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

type LeftPanelKey = "project" | "layers" | "boards";

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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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

export function ProjectEditorFabricClient({
  initialData,
  planSummary,
}: {
  initialData: ProjectEditorInitialData;
  planSummary: PlanSummaryCopy;
}) {
  const [scene, setScene] = useState<ProjectEditorScene>(() =>
    resolveProjectEditorScene(initialData.layout, {
      assets: initialData.assets,
      projectName: initialData.name,
    })
  );
  const [canvasReady, setCanvasReady] = useState(false);
  const [assets, setAssets] = useState(initialData.assets);
  const [activeMeta, setActiveMeta] = useState<ActiveObjectMeta>({ kind: "none" });
  const [assetSearch, setAssetSearch] = useState("");
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");
  const [diagnosing, setDiagnosing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [assetDetailsSaving, setAssetDetailsSaving] = useState(false);
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
  const canvasRef = useRef<FabricCanvas | null>(null);
  const fabricRef = useRef<FabricModule | null>(null);
  const boardBackgroundRef = useRef<FabricObject | null>(null);
  const clipboardRef = useRef<FabricObject | ActiveSelection | null>(null);
  const hydratingRef = useRef(false);
  const boardLoadTokenRef = useRef(0);
  const lastSavedSceneRef = useRef(JSON.stringify(scene));
  const didHydrateSceneRef = useRef(false);

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
  const hasActiveInspector = activeMeta.kind !== "none";
  const factsSnapshot = [
    { label: "项目类型", value: initialData.facts.projectType.trim() || "待补充" },
    { label: "所属行业", value: initialData.facts.industry.trim() || "待补充" },
    { label: "我的角色", value: initialData.facts.roleTitle.trim() || "待补充" },
    { label: "背景摘要", value: initialData.facts.background.trim() || "待补充" },
    { label: "结果摘要", value: initialData.facts.resultSummary.trim() || "待补充" },
  ];
  const currentLeftPanelLabel =
    LEFT_PANEL_ITEMS.find((item) => item.key === leftPanel)?.label ?? "工具栏";
  const sourceLabel =
    initialData.sourceType === "FIGMA"
      ? "Figma"
      : initialData.sourceType === "IMAGES"
        ? "图片导入"
        : "手动创建";
  const packageModeLabel =
    initialData.packageMode === "DEEP"
      ? "深讲"
      : initialData.packageMode === "LIGHT"
        ? "浅讲"
        : initialData.packageMode === "SUPPORTIVE"
          ? "补充展示"
          : "待判断";
  const currentLeftPanelMeta = LEFT_PANEL_ITEMS.find((item) => item.key === leftPanel) ?? null;
  const selectedImageAsset =
    activeMeta.kind === "image" && activeMeta.assetId
      ? assetMap.get(activeMeta.assetId) ?? null
      : null;

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

  function getCurrentGenerationScope() {
    const boardId = activeBoard?.id ?? scene.activeBoardId;
    return {
      mode: "current" as const,
      boardIds: boardId ? [boardId] : [],
    };
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
    setSaveState("saved");
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

  async function persistCurrentSceneForAction() {
    try {
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
    setActionMessage(null);

    try {
      await persistCurrentSceneForAction();
      const generationScope = getCurrentGenerationScope();
      const payload = JSON.stringify({ generationScope });
      const [boundaryResult, completenessResult, packageResult] =
        await Promise.allSettled([
          parseJsonResponse(await fetch(`/api/projects/${initialData.id}/boundary/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          })),
          parseJsonResponse(await fetch(`/api/projects/${initialData.id}/completeness/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          })),
          parseJsonResponse(await fetch(`/api/projects/${initialData.id}/package/recommend`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
          })),
        ]);

      const failures = [boundaryResult, completenessResult, packageResult].filter(
        (item) => item.status === "rejected"
      ) as PromiseRejectedResult[];

      const nextStatus = failures.length > 0 ? "needs_attention" : "analyzed";
      setScene((current) =>
        markBoardsAsAnalyzed(current, generationScope.boardIds, nextStatus)
      );
      setActionMessage({
        tone: failures.length > 0 ? "error" : "info",
        text:
          failures.length > 0
            ? `项目诊断部分完成：${failures
                .map((item) =>
                  item.reason instanceof Error ? item.reason.message : "请求失败"
                )
                .join("；")}`
            : "项目诊断已完成",
      });
    } catch (error) {
      setActionMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "项目诊断失败，请稍后重试",
      });
    } finally {
      setDiagnosing(false);
    }
  }

  async function handleGenerateLayout() {
    if (!activeBoard || generating) return;
    setGenerating(true);
    setActionMessage(null);

    try {
      await persistCurrentSceneForAction();
      const generationScope = getCurrentGenerationScope();
      await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/layout/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ generationScope }),
        })
      );
      setScene((current) => markBoardsAfterGeneration(current, generationScope.boardIds));
      setActionMessage({
        tone: "info",
        text: "生成排版已提交，当前画板保持不变，可继续手动微调。",
      });
    } catch (error) {
      setActionMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "生成排版失败，请稍后重试",
      });
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
    if (!assetPickerOpen) return;
    const handler = () => setAssetPickerOpen(false);
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [assetPickerOpen]);

  useEffect(() => {
    if (!actionMessage || actionMessage.tone === "error") return;
    const timeout = window.setTimeout(() => setActionMessage(null), 3200);
    return () => window.clearTimeout(timeout);
  }, [actionMessage]);

  useEffect(() => {
    if (!selectedImageAsset) return;
    const meta = resolveProjectAssetMeta(selectedImageAsset.metaJson);
    setImageDetailsDraft({
      title: selectedImageAsset.title ?? "",
      note: meta.note ?? "",
    });
  }, [selectedImageAsset]);

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
    const width = canvas.getWidth();
    const height = canvas.getHeight();
    const x = (width - PROJECT_BOARD_WIDTH * nextZoom) / 2;
    const y = (height - PROJECT_BOARD_HEIGHT * nextZoom) / 2;
    canvas.setViewportTransform([nextZoom, 0, 0, nextZoom, x, y]);
    setZoom(nextZoom);
    canvas.requestRenderAll();
  }

  function fitBoard(canvas: FabricCanvas) {
    const width = canvas.getWidth();
    const height = canvas.getHeight();
    const zoomToFit = Math.min(
      (width - 120) / PROJECT_BOARD_WIDTH,
      (height - 120) / PROJECT_BOARD_HEIGHT
    );
    applyCenteredZoom(canvas, clamp(zoomToFit, 0.2, 1.5));
  }

  function applyObjectChrome(target: FabricSceneObject) {
    target.set({
      borderColor: "#111111",
      cornerColor: "#ffffff",
      cornerStrokeColor: "#111111",
      transparentCorners: false,
      cornerStyle: "circle",
      cornerSize: 12,
      padding: 4,
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

      const resize = () => {
        if (!workspaceRef.current || !canvasRef.current) return;
        canvasRef.current.setDimensions({
          width: workspaceRef.current.clientWidth,
          height: workspaceRef.current.clientHeight,
        });
        fitBoard(canvasRef.current);
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
        if (event.target) {
          canvas.setActiveObject(event.target as FabricObject);
          updateSelectionSummary(canvas);
        }
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
    setAssetPickerOpen(false);
    setActionMessage({ tone: "info", text: "图片已插入当前画板" });
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
    <EditorScaffold
      objectLabel=""
      objectName={initialData.name}
      backHref="/projects"
      backLabel="全部项目"
      statusLabel=""
      statusMeta=""
      primaryAction={
        <Button
          className="h-10 gap-2 rounded-full border border-white/[0.08] bg-white px-4 text-neutral-950 hover:bg-white/90"
          onClick={() => void handleGenerateLayout()}
          disabled={generating || diagnosing}
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          生成排版
        </Button>
      }
      secondaryAction={
        <EditorChromeButton
          className="h-10 gap-2 px-4"
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
      leftRailWidthClass={leftPanel ? "w-[368px]" : "w-[92px]"}
      leftRail={
        <div className="flex h-full min-h-0">
          <div className="flex w-[92px] shrink-0 flex-col items-center gap-3 border-r border-white/[0.05] bg-[#11100f] px-3 py-4">
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
                    "group relative flex w-full flex-col items-center gap-2 rounded-[24px] border px-2 py-4 text-[11px] font-medium transition-all duration-200",
                    active
                      ? "border-white/[0.14] bg-white/[0.09] text-white shadow-[0_18px_30px_-22px_rgba(0,0,0,0.9)]"
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
                      "flex h-11 w-11 items-center justify-center rounded-[18px] border transition-colors",
                      active
                        ? "border-white/[0.12] bg-white/[0.08]"
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
              {currentLeftPanelMeta ? (
                <div className="border-b border-white/[0.05] bg-white/[0.02] px-5 py-4">
                  <p className="text-[11px] tracking-[0.18em] text-white/36">
                    {currentLeftPanelMeta.label}
                  </p>
                  <p className="mt-2 text-sm text-white/58">{currentLeftPanelMeta.hint}</p>
                </div>
              ) : null}
              {leftPanel === "project" ? (
                <>
                  <EditorRailSection title="项目概况">
                    <EditorInfoList
                      items={[
                        { label: "导入方式", value: sourceLabel },
                        { label: "包装模式", value: packageModeLabel },
                        { label: "素材数量", value: `${initialData.assets.length} 张` },
                        { label: "当前画板", value: activeBoard?.name ?? "未命名" },
                      ]}
                    />
                  </EditorRailSection>
                  <EditorRailSection title="项目背景信息">
                    <div className="space-y-3">
                      {factsSnapshot.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-3"
                        >
                          <p className="text-xs text-white/40">{item.label}</p>
                          <p className="mt-2 text-sm leading-6 text-white/82">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </EditorRailSection>
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
                      <div className="rounded-[18px] border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/52">
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
                              "flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition-colors",
                              scene.activeBoardId === board.id
                                ? "border-white/[0.14] bg-white/[0.08] text-white"
                                : "border-white/[0.08] bg-white/[0.03] text-white/72 hover:bg-white/[0.05]"
                            )}
                          >
                            <div className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#0b0b0a]">
                              {thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={buildPrivateBlobProxyUrl(thumbnailUrl)}
                                  alt={board.name}
                                  className="h-full w-full object-cover"
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
          <div className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2">
            <div className="pointer-events-auto flex items-center gap-2 rounded-[22px] border border-black/6 bg-[#f1eee8]/94 px-3 py-2 text-neutral-950 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.42)] backdrop-blur">
              {activeMeta.kind === "text" ? (
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold">
                    文本
                  </span>
                  <Input
                    type="number"
                    value={activeMeta.fontSize}
                    onChange={(event) =>
                      updateActiveObject({ fontSize: Number(event.target.value) || 16 })
                    }
                    className="h-9 w-[84px] rounded-full border-black/10 bg-white text-sm text-neutral-800"
                  />
                  <Input
                    type="color"
                    value={activeMeta.color}
                    onChange={(event) => updateActiveObject({ fill: event.target.value })}
                    className="h-9 w-12 rounded-full border-black/10 bg-white p-1"
                  />
                </div>
              ) : activeMeta.kind === "image" ? (
                <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-black/10 bg-white px-3 py-1 text-xs font-semibold">
                    形状
                  </span>
                  <Input
                    type="color"
                    value={activeMeta.fill}
                    onChange={(event) => updateActiveObject({ fill: event.target.value })}
                    className="h-9 w-12 rounded-full border-black/10 bg-white p-1"
                  />
                  <Input
                    type="color"
                    value={activeMeta.stroke ?? "#000000"}
                    onChange={(event) => updateActiveObject({ stroke: event.target.value })}
                    className="h-9 w-12 rounded-full border-black/10 bg-white p-1"
                  />
                </div>
              ) : (
                <div className="min-w-0 pr-1">
                  <p className="max-w-[220px] truncate text-sm font-semibold">
                    {activeBoard?.name ?? "未命名画板"}
                  </p>
                  <p className="max-w-[280px] truncate text-[11px] text-neutral-500">
                    插入图片、添加文本，使用按钮缩放。
                  </p>
                </div>
              )}
              <div className="h-8 w-px bg-black/8" />
              <EditorChromeButton
                className="h-10 gap-2 border-black/8 bg-white px-4 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                onClick={() => {
                  setAssetPickerOpen((prev) => !prev);
                  setShapeMenuOpen(false);
                }}
              >
                <ImageIcon className="h-4 w-4" />
                插入图片
              </EditorChromeButton>
              <Button
                className="h-10 gap-2 rounded-full border border-black/8 bg-white px-4 text-neutral-950 hover:bg-neutral-100"
                onClick={addTextObject}
              >
                <Type className="h-4 w-4" />
                添加文本
              </Button>
              <div className="relative">
                <EditorChromeButton
                  className="h-10 gap-2 border-black/8 bg-white px-4 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                  onClick={() => setShapeMenuOpen((prev) => !prev)}
                >
                  <Square className="h-4 w-4" />
                  形状
                  <ChevronDown className="h-4 w-4" />
                </EditorChromeButton>
                {shapeMenuOpen ? (
                  <div
                    className="absolute left-0 top-12 z-30 w-48 rounded-2xl border border-white/[0.08] bg-[#151413] p-2 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.65)]"
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
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
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
              <EditorChromeButton
                className="h-10 border-black/8 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                onClick={() => {
                  setLeftPanel("layers");
                }}
              >
                <Layers className="h-4 w-4" />
                调整图层
              </EditorChromeButton>
              <EditorChromeButton
                className="h-10 border-black/8 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                onClick={() => canvasRef.current && fitBoard(canvasRef.current)}
              >
                适应画板
              </EditorChromeButton>
              <EditorChromeButton
                className="h-10 border-black/8 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
                onClick={() => {
                  const canvas = canvasRef.current;
                  if (!canvas) return;
                  const nextZoom = clamp(canvas.getZoom() - 0.1, 0.2, 3);
                  applyCenteredZoom(canvas, nextZoom);
                }}
              >
                <ZoomOut className="h-4 w-4" />
              </EditorChromeButton>
              <span className="inline-flex h-10 items-center rounded-full border border-black/8 bg-white px-3 text-sm text-neutral-700">
                {Math.round(zoom * 100)}%
              </span>
              <EditorChromeButton
                className="h-10 border-black/8 bg-white text-neutral-700 hover:bg-neutral-100 hover:text-neutral-950"
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

          <div
            ref={workspaceRef}
            className="relative flex-1 overflow-hidden"
            onContextMenu={(event) => event.preventDefault()}
          >
            {!canvasReady ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white/62">
                  <Loader2 className="mr-2 inline-flex h-4 w-4 animate-spin" />
                  正在初始化 Fabric 引擎…
                </div>
              </div>
            ) : null}
            <canvas ref={hostRef} />
            {assetPickerOpen ? (
              <div
                className="absolute left-6 top-6 z-30 w-[356px] animate-in fade-in-0 slide-in-from-top-2 duration-200"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="rounded-[28px] border border-white/[0.08] bg-[#141311]/96 p-4 shadow-[0_30px_80px_-36px_rgba(0,0,0,0.85)] backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">插入图片</p>
                      <p className="mt-1 text-xs text-white/46">从当前项目素材中挑一张放进画板。</p>
                    </div>
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-white/54">
                      {visibleAssets.length} 张
                    </span>
                  </div>
                  <Input
                    value={assetSearch}
                    onChange={(event) => setAssetSearch(event.target.value)}
                    placeholder="搜索素材标题或 ID"
                    className="mt-4 h-10 rounded-2xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/28"
                  />
                  <div className="mt-4 max-h-[440px] space-y-4 overflow-y-auto pr-1">
                    {featuredAssets.length > 0 ? (
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[11px] font-medium tracking-[0.18em] text-white/36">
                            当前画板已用
                          </p>
                          <span className="text-xs text-white/34">{featuredAssets.length}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {featuredAssets.map((asset) => (
                            <button
                              key={asset.id}
                              type="button"
                              onClick={() => void addAssetToCanvas(asset.id)}
                              className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.03] text-left transition-colors hover:bg-white/[0.06]"
                            >
                              <div className="aspect-square overflow-hidden bg-black/30">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                                  alt={asset.title ?? "素材"}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="px-2 py-2">
                                <p className="truncate text-xs font-medium text-white/82">
                                  {asset.title ?? "未命名"}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[11px] font-medium tracking-[0.18em] text-white/36">
                          项目素材库
                        </p>
                        <span className="text-xs text-white/34">{libraryAssets.length}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {libraryAssets.map((asset) => (
                          <button
                            key={asset.id}
                            type="button"
                            onClick={() => void addAssetToCanvas(asset.id)}
                            className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-white/[0.03] text-left transition-colors hover:bg-white/[0.06]"
                          >
                            <div className="aspect-square overflow-hidden bg-black/30">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                                alt={asset.title ?? "素材"}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            <div className="px-2 py-2">
                              <p className="truncate text-xs font-medium text-white/82">
                                {asset.title ?? "未命名"}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {visibleAssets.length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-8 text-center text-sm text-white/46">
                        没有匹配的素材。
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}
            {contextMenu.open ? (
              <div
                className="fixed z-50 w-56 rounded-2xl border border-white/[0.08] bg-[#151413] p-2 text-sm text-white/88 shadow-[0_20px_48px_-24px_rgba(0,0,0,0.7)]"
                style={{ left: contextMenu.x, top: contextMenu.y }}
                onMouseDown={(event) => event.stopPropagation()}
              >
                {contextMenuItems.map((item) =>
                  "type" in item && item.type === "sep" ? (
                    <div key={item.id} className="my-2 h-px bg-white/[0.06]" />
                  ) : (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
                      onClick={() => {
                        closeContextMenu();
                        void handleContextAction(item.id);
                      }}
                    >
                      <span>{item.label}</span>
                      {"shortcut" in item ? (
                        <span className="text-xs text-white/40">{item.shortcut}</span>
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
        hasActiveInspector ? (
          <div className="h-full overflow-y-auto">
            <EditorRailSection title="属性编辑">
              <div className="space-y-4 rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                {activeMeta.kind === "multi" ? (
                  <div className="text-sm text-white/52">
                    已选 {activeMeta.count} 个对象，可先调整层级或重新选择单个对象编辑属性。
                  </div>
                ) : null}

                {activeMeta.kind === "text" ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/50">文本内容</label>
                      <Textarea
                        value={activeMeta.text}
                        onChange={(event) => updateActiveObject({ text: event.target.value })}
                        className="mt-2 min-h-[84px] rounded-2xl border-white/[0.08] bg-white/[0.04] text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-white/50">字号</label>
                        <Input
                          type="number"
                          value={activeMeta.fontSize}
                          onChange={(event) =>
                            updateActiveObject({ fontSize: Number(event.target.value) || 16 })
                          }
                          className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-white/[0.04] text-white"
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
                          className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-white/[0.04] text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-white/50">颜色</label>
                        <Input
                          type="color"
                          value={activeMeta.color}
                          onChange={(event) => updateActiveObject({ fill: event.target.value })}
                          className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-white/[0.04] p-1"
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
                ) : null}

                {activeMeta.kind === "image" ? (
                  <div className="space-y-3">
                    {selectedImageAsset ? (
                      <>
                        <div>
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
                            className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-white/[0.04] text-white"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-white/50">图片描述</label>
                          <Textarea
                            value={imageDetailsDraft.note}
                            onChange={(event) =>
                              setImageDetailsDraft((current) => ({
                                ...current,
                                note: event.target.value,
                              }))
                            }
                            placeholder="描述这张图的内容、用途或希望 AI 理解的重点"
                            className="mt-2 min-h-[96px] rounded-2xl border-white/[0.08] bg-white/[0.04] text-white"
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => void saveSelectedImageDetails()}
                          disabled={assetDetailsSaving}
                          className="h-10 w-full gap-2 rounded-2xl bg-white text-neutral-950 hover:bg-neutral-100"
                        >
                          {assetDetailsSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <PencilLine className="h-4 w-4" />
                          )}
                          保存图片信息
                        </Button>
                      </>
                    ) : null}
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
                ) : null}

                {activeMeta.kind === "shape" ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/50">填充色</label>
                      <Input
                        type="color"
                        value={activeMeta.fill}
                        onChange={(event) => updateActiveObject({ fill: event.target.value })}
                        className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-white/[0.04] p-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-white/50">描边色</label>
                      <Input
                        type="color"
                        value={activeMeta.stroke ?? "#000000"}
                        onChange={(event) => updateActiveObject({ stroke: event.target.value })}
                        className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-white/[0.04] p-1"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-white/50">描边宽度</label>
                        <Input
                          type="number"
                          value={activeMeta.strokeWidth}
                          onChange={(event) =>
                            updateActiveObject({ strokeWidth: Number(event.target.value) || 0 })
                          }
                          className="mt-2 h-10 rounded-2xl border-white/[0.08] bg-white/[0.04] text-white"
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
        ) : null
      }
      bottomStrip={
        <div className="mx-auto flex max-w-[1280px] items-center gap-2 overflow-x-auto rounded-[30px] border border-white/[0.06] bg-[#171614] p-2 shadow-[0_24px_64px_-42px_rgba(0,0,0,0.82)]">
          <div className="shrink-0 px-3 text-sm font-medium text-white/56">
            {scene.boards.length} 张画板
          </div>
          {scene.boardOrder.map((boardId) => {
            const board = scene.boards.find((item) => item.id === boardId);
            if (!board) return null;
            const thumbnailUrl = boardThumbnailMap.get(board.id) ?? null;
            return (
              <EditorStripButton
                key={board.id}
                active={scene.activeBoardId === board.id}
                className="w-[104px] p-1.5"
                onClick={() =>
                  setScene((current) =>
                    normalizeProjectEditorScene({ ...current, activeBoardId: board.id })
                  )
                }
              >
                <div className="overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#0b0b0a]">
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
                      <div className="h-full w-full rounded-[12px] border border-black/6 bg-white" />
                    </div>
                  )}
                </div>
              </EditorStripButton>
            );
          })}
        </div>
      }
    />
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
        "flex items-center gap-2 rounded-2xl border px-2 py-2 transition-colors",
        selected
          ? "border-white/40 bg-white/[0.08] text-white"
          : "border-white/[0.08] bg-white/[0.02] text-white/72 hover:bg-white/[0.05]",
        isDragging ? "opacity-70" : "opacity-100"
      )}
      role="listitem"
    >
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-white/60"
        {...attributes}
        {...listeners}
        aria-label="拖拽排序"
      >
        <div className="grid grid-cols-2 gap-[3px]">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className="h-1 w-1 rounded-full bg-white/40" />
          ))}
        </div>
      </button>

      <button
        type="button"
        onClick={() => onSelect(item.id)}
        className="flex flex-1 items-center gap-2 text-left"
      >
        <div className="flex h-10 w-12 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] text-[10px] font-semibold text-white/70">
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
        </div>
      </button>

      <button
        type="button"
        onClick={onOpenMenu}
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
        aria-label="更多操作"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
