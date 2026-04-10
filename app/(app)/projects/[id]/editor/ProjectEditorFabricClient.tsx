"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ActiveSelection, Canvas as FabricCanvas, FabricImage, FabricObject, Point, Textbox } from "fabric";
import {
  Copy,
  Loader2,
  Save,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EditorChromeButton,
  EditorInfoList,
  EditorRailSection,
  EditorScaffold,
  EditorStripButton,
} from "@/components/editor/EditorScaffold";
import type { PlanSummaryCopy } from "@/lib/entitlement";
import {
  createProjectImageNode,
  createProjectTextNode,
  getSceneBoardById,
  normalizeProjectEditorScene,
  PROJECT_BOARD_HEIGHT,
  PROJECT_BOARD_WIDTH,
  resolveProjectEditorScene,
  type ProjectBoard,
  type ProjectBoardImageNode,
  type ProjectBoardNode,
  type ProjectBoardTextNode,
  type ProjectEditorScene,
} from "@/lib/project-editor-scene";
import { cn } from "@/lib/utils";
import type { ProjectEditorInitialData } from "./ProjectEditorClient";

type FabricModule = typeof import("fabric");

type SelectionSummary =
  | { kind: "none"; label: string }
  | { kind: "single"; label: string }
  | { kind: "multi"; label: string };

type FabricSceneObject = FabricObject & {
  data?: {
    nodeId?: string;
    nodeType?: "text" | "image";
    assetId?: string;
    role?: ProjectBoardTextNode["role"];
  };
};

function newNodeId(prefix: "text" | "image") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  const [selectionSummary, setSelectionSummary] = useState<SelectionSummary>({
    kind: "none",
    label: "未选中对象",
  });
  const [assetSearch, setAssetSearch] = useState("");
  const [zoom, setZoom] = useState(1);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty" | "error">("saved");

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

  const assetMap = useMemo(
    () => new Map(initialData.assets.map((asset) => [asset.id, asset])),
    [initialData.assets]
  );
  const activeBoard = useMemo(
    () => getSceneBoardById(scene, scene.activeBoardId) ?? scene.boards[0] ?? null,
    [scene]
  );
  const visibleAssets = useMemo(() => {
    const keyword = assetSearch.trim().toLowerCase();
    if (!keyword) return initialData.assets;
    return initialData.assets.filter((asset) =>
      [asset.title ?? "", asset.id].join(" ").toLowerCase().includes(keyword)
    );
  }, [assetSearch, initialData.assets]);
  const boardThumbnailMap = useMemo(() => {
    return new Map(
      scene.boards.map((board) => {
        const assetId = getBoardThumbnailAssetId(board);
        return [board.id, assetId ? assetMap.get(assetId)?.imageUrl ?? null : null] as const;
      })
    );
  }, [assetMap, scene.boards]);

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

  function updateSelectionSummary(canvas: FabricCanvas | null) {
    if (!canvas) {
      setSelectionSummary({ kind: "none", label: "未选中对象" });
      return;
    }

    const activeObjects = canvas.getActiveObjects() as FabricSceneObject[];
    if (activeObjects.length === 0) {
      setSelectionSummary({ kind: "none", label: "未选中对象" });
      return;
    }

    if (activeObjects.length > 1) {
      setSelectionSummary({ kind: "multi", label: `已选 ${activeObjects.length} 个对象` });
      return;
    }

    const current = activeObjects[0];
    const data = current.data;
    if (data?.nodeType === "image") {
      const assetTitle = data.assetId ? assetMap.get(data.assetId)?.title : null;
      setSelectionSummary({
        kind: "single",
        label: assetTitle ? `图片 · ${assetTitle}` : "图片节点",
      });
      return;
    }

    if (data?.nodeType === "text") {
      setSelectionSummary({ kind: "single", label: "文本节点" });
      return;
    }

    setSelectionSummary({ kind: "single", label: "已选对象" });
  }

  function fitBoard(canvas: FabricCanvas) {
    const width = canvas.getWidth();
    const height = canvas.getHeight();
    const zoomToFit = Math.min(
      (width - 120) / PROJECT_BOARD_WIDTH,
      (height - 120) / PROJECT_BOARD_HEIGHT
    );
    const nextZoom = clamp(zoomToFit, 0.2, 1.5);
    const x = (width - PROJECT_BOARD_WIDTH * nextZoom) / 2;
    const y = (height - PROJECT_BOARD_HEIGHT * nextZoom) / 2;
    canvas.setViewportTransform([nextZoom, 0, 0, nextZoom, x, y]);
    setZoom(nextZoom);
    canvas.requestRenderAll();
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
      rx: 18,
      ry: 18,
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
      canvas.on("object:modified", () => syncActiveBoardFromCanvas());
      canvas.on("object:added", () => syncActiveBoardFromCanvas());
      canvas.on("object:removed", () => syncActiveBoardFromCanvas());
      canvas.on("text:changed", () => syncActiveBoardFromCanvas());
      canvas.on("mouse:wheel", (event) => {
        const nativeEvent = event.e as WheelEvent;
        nativeEvent.preventDefault();
        nativeEvent.stopPropagation();
        const point = new fabric.Point(nativeEvent.offsetX, nativeEvent.offsetY) as Point;
        const nextZoom = clamp(canvas.getZoom() * (nativeEvent.deltaY > 0 ? 0.92 : 1.08), 0.2, 3);
        canvas.zoomToPoint(point, nextZoom);
        setZoom(nextZoom);
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

  return (
    <EditorScaffold
      objectLabel="项目 · 编辑器"
      objectName={initialData.name}
      backHref="/projects"
      backLabel="全部项目"
      statusLabel="编辑中"
      statusMeta={`${scene.boards.length} 张画板 · ${initialData.assets.length} 张素材`}
      primaryAction={
        <Button
          className="h-10 gap-2 rounded-full border border-white/[0.08] bg-white px-4 text-neutral-950 hover:bg-white/90"
          onClick={addTextObject}
        >
          <Type className="h-4 w-4" />
          添加文本
        </Button>
      }
      secondaryAction={
        <div className="flex items-center gap-2">
          <EditorChromeButton className="h-10 gap-2 px-4" onClick={() => void duplicateSelection()}>
            <Copy className="h-4 w-4" />
            复制
          </EditorChromeButton>
          <EditorChromeButton className="h-10 gap-2 px-4" onClick={deleteSelection}>
            <Trash2 className="h-4 w-4" />
            删除
          </EditorChromeButton>
        </div>
      }
      planSummary={planSummary}
      leftRailLabel="素材"
      rightRailLabel="属性"
      leftRail={
        <div className="h-full overflow-y-auto">
          <EditorRailSection title="素材墙">
            <div className="space-y-3">
              <Input
                value={assetSearch}
                onChange={(event) => setAssetSearch(event.target.value)}
                placeholder="搜索素材"
                className="h-10 rounded-2xl border-white/[0.08] bg-white/[0.03] text-white placeholder:text-white/28"
              />
              <div className="grid grid-cols-2 gap-2">
                {visibleAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => void addAssetToCanvas(asset.id)}
                    className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.03] text-left transition-colors hover:bg-white/[0.06]"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-black/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                        alt={asset.title ?? "素材"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium text-white">
                        {asset.title ?? "未命名素材"}
                      </p>
                    </div>
                  </button>
                ))}
                {visibleAssets.length === 0 ? (
                  <div className="col-span-2 rounded-[20px] border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-6 text-sm text-white/46">
                    没有匹配的素材。
                  </div>
                ) : null}
              </div>
            </div>
          </EditorRailSection>
        </div>
      }
      center={
        <div className="flex h-full min-h-0 flex-col">
          <div className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2">
            <div className="pointer-events-auto flex items-center gap-2 rounded-[22px] border border-black/6 bg-[#f1eee8]/94 px-3 py-2 text-neutral-950 shadow-[0_20px_48px_-28px_rgba(0,0,0,0.42)] backdrop-blur">
              <div className="min-w-0 pr-1">
                <p className="max-w-[220px] truncate text-sm font-semibold">
                  {activeBoard?.name ?? "未命名画板"}
                </p>
                <p className="max-w-[280px] truncate text-[11px] text-neutral-500">
                  滚轮缩放，拖拽素材进入画板。
                </p>
              </div>
              <div className="h-8 w-px bg-black/8" />
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
                  canvas.zoomToPoint({ x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 } as Point, nextZoom);
                  setZoom(nextZoom);
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
                  canvas.zoomToPoint({ x: canvas.getWidth() / 2, y: canvas.getHeight() / 2 } as Point, nextZoom);
                  setZoom(nextZoom);
                }}
              >
                <ZoomIn className="h-4 w-4" />
              </EditorChromeButton>
            </div>
          </div>

          <div ref={workspaceRef} className="relative flex-1 overflow-hidden">
            {!canvasReady ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <div className="rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-white/62">
                  <Loader2 className="mr-2 inline-flex h-4 w-4 animate-spin" />
                  正在初始化 Fabric 引擎…
                </div>
              </div>
            ) : null}
            <canvas ref={hostRef} />
          </div>
        </div>
      }
      rightRail={
        <div className="h-full overflow-y-auto">
          <EditorRailSection title="当前选中">
            <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">{selectionSummary.label}</p>
              <p className="mt-2 text-sm leading-6 text-white/52">
                选中对象后可拖拽、缩放或删除；双击文本进入编辑。
              </p>
            </div>
          </EditorRailSection>

          <EditorRailSection title="快捷键">
            <EditorInfoList
              items={[
                { label: "删除", value: "Delete / Backspace" },
                { label: "复制", value: "Cmd/Ctrl + C" },
                { label: "粘贴", value: "Cmd/Ctrl + V" },
                { label: "复制当前对象", value: "Cmd/Ctrl + D" },
                { label: "适应画板", value: "Cmd/Ctrl + 0 / 按钮" },
                { label: "缩放", value: "滚轮 / 按钮" },
              ]}
            />
          </EditorRailSection>

          <EditorRailSection title="保存状态">
            <div className="flex items-center gap-2 rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-3 py-3 text-sm text-white/64">
              <Save className="h-4 w-4" />
              {saveState}
            </div>
          </EditorRailSection>
        </div>
      }
      bottomStrip={
        <div className="mx-auto flex max-w-[1280px] items-center gap-2 overflow-x-auto rounded-[30px] border border-white/[0.06] bg-[#171614] p-2 shadow-[0_24px_64px_-42px_rgba(0,0,0,0.82)]">
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
