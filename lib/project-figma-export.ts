import {
  getSceneBoardById,
  type ProjectBoard,
  type ProjectBoardImageNode,
  type ProjectBoardNode,
  type ProjectBoardShapeNode,
  type ProjectBoardTextNode,
  type ProjectEditorScene,
} from "@/lib/project-editor-scene";

export type FigmaExportColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type FigmaExportSolidFill = {
  kind: "solid";
  color: FigmaExportColor;
};

export type FigmaExportGradientStop = {
  offset: number;
  color: FigmaExportColor;
};

export type FigmaExportGradientFill = {
  kind: "linear-gradient";
  angle: number;
  stops: FigmaExportGradientStop[];
  fallbackColor: FigmaExportColor;
};

export type FigmaExportFill = FigmaExportSolidFill | FigmaExportGradientFill;

export type FigmaExportTextNode = {
  id: string;
  type: "text";
  name: string;
  role: ProjectBoardTextNode["role"];
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  align: ProjectBoardTextNode["align"];
  color: FigmaExportColor;
  opacity: number;
};

export type FigmaExportImageNode = {
  id: string;
  type: "image";
  name: string;
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fit: ProjectBoardImageNode["fit"];
  crop: ProjectBoardImageNode["crop"];
};

export type FigmaExportShapeNode = {
  id: string;
  type: "shape";
  name: string;
  shape: ProjectBoardShapeNode["shape"];
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  rx: number;
  fill: FigmaExportFill | null;
  stroke: {
    color: FigmaExportColor;
    weight: number;
  } | null;
};

export type FigmaExportNode =
  | FigmaExportTextNode
  | FigmaExportImageNode
  | FigmaExportShapeNode;

export type FigmaExportBoard = {
  id: string;
  name: string;
  intent: string;
  width: number;
  height: number;
  background: FigmaExportColor;
  nodes: FigmaExportNode[];
};

export type FigmaExportImageAsset = {
  assetId: string;
  name: string;
  mimeType: string;
  dataUrl: string;
};

export type ProjectFigmaExportPayload = {
  version: 1;
  kind: "project-figma-export";
  source: "foliobox";
  exportedAt: string;
  project: {
    id: string;
    name: string;
  };
  boards: FigmaExportBoard[];
  images: FigmaExportImageAsset[];
  warnings: string[];
  pluginHints: {
    importPluginFolder: "figma-plugin";
    supportedNodes: string[];
    limitations: string[];
  };
};

type ExportAsset = {
  id: string;
  imageUrl: string;
  title: string | null;
};

type ResolvedExportImage = {
  dataUrl: string;
  mimeType: string;
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function clampAlpha(value: number) {
  return clamp01(value);
}

function parseColorString(input: string): FigmaExportColor {
  const value = input.trim();
  const hexMatch = value.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (hexMatch) {
    const rgb = hexMatch[1];
    const alphaHex = hexMatch[2];
    return {
      r: parseInt(rgb.slice(0, 2), 16) / 255,
      g: parseInt(rgb.slice(2, 4), 16) / 255,
      b: parseInt(rgb.slice(4, 6), 16) / 255,
      a: alphaHex ? parseInt(alphaHex, 16) / 255 : 1,
    };
  }

  const rgbaMatch = value.match(
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+))?\s*\)$/i
  );
  if (rgbaMatch) {
    return {
      r: clamp01(Number(rgbaMatch[1]) / 255),
      g: clamp01(Number(rgbaMatch[2]) / 255),
      b: clamp01(Number(rgbaMatch[3]) / 255),
      a: clampAlpha(rgbaMatch[4] === undefined ? 1 : Number(rgbaMatch[4])),
    };
  }

  return {
    r: 0,
    g: 0,
    b: 0,
    a: 1,
  };
}

function normalizeAngle(angle: number) {
  const normalized = angle % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function createShapeFill(node: ProjectBoardShapeNode): FigmaExportFill | null {
  if (node.gradient && node.gradient.stops.length >= 2) {
    const stops = node.gradient.stops.map((stop) => ({
      offset: clamp01(stop.offset),
      color: parseColorString(stop.color),
    }));
    return {
      kind: "linear-gradient",
      angle: normalizeAngle(node.gradient.angle),
      fallbackColor: stops[0]?.color ?? parseColorString(node.fill),
      stops,
    };
  }

  if (!node.fill) return null;
  return {
    kind: "solid",
    color: parseColorString(node.fill),
  };
}

function createShapeStroke(node: ProjectBoardShapeNode) {
  if (!node.stroke || node.strokeWidth <= 0) return null;
  return {
    color: parseColorString(node.stroke),
    weight: node.strokeWidth,
  };
}

function createTextNode(node: ProjectBoardTextNode): FigmaExportTextNode {
  const color = parseColorString(node.color);
  return {
    id: node.id,
    type: "text",
    name: `Text/${node.role}`,
    role: node.role,
    text: node.text,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    fontFamily: node.fontFamily ?? "Inter",
    fontSize: node.fontSize,
    fontWeight: node.fontWeight,
    lineHeight: node.lineHeight,
    align: node.align,
    color,
    opacity: color.a,
  };
}

function createImageNode(
  node: ProjectBoardImageNode,
  assetMap: Map<string, ExportAsset>
): FigmaExportImageNode {
  const asset = assetMap.get(node.assetId);
  return {
    id: node.id,
    type: "image",
    name: asset?.title?.trim() || `Image/${node.assetId}`,
    assetId: node.assetId,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    fit: node.fit,
    crop: node.crop,
  };
}

function createShapeNode(node: ProjectBoardShapeNode): FigmaExportShapeNode {
  return {
    id: node.id,
    type: "shape",
    name: `Shape/${node.shape}`,
    shape: node.shape,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    opacity: node.opacity,
    rx: node.rx ?? 0,
    fill: createShapeFill(node),
    stroke: createShapeStroke(node),
  };
}

function createNode(
  node: ProjectBoardNode,
  assetMap: Map<string, ExportAsset>,
  usedAssetIds: Set<string>
): FigmaExportNode {
  if (node.type === "text") {
    return createTextNode(node);
  }

  if (node.type === "image") {
    usedAssetIds.add(node.assetId);
    return createImageNode(node, assetMap);
  }

  return createShapeNode(node);
}

function createBoard(
  board: ProjectBoard,
  assetMap: Map<string, ExportAsset>,
  usedAssetIds: Set<string>
): FigmaExportBoard {
  return {
    id: board.id,
    name: board.name,
    intent: board.intent,
    width: board.frame.width,
    height: board.frame.height,
    background: parseColorString(board.frame.background),
    nodes: board.nodes.map((node) => createNode(node, assetMap, usedAssetIds)),
  };
}

export async function buildProjectFigmaExportPayload(params: {
  projectId: string;
  projectName: string;
  scene: ProjectEditorScene;
  assets: ExportAsset[];
  resolveImageData: (asset: ExportAsset) => Promise<ResolvedExportImage | null>;
}): Promise<ProjectFigmaExportPayload> {
  const { projectId, projectName, scene, assets, resolveImageData } = params;
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const usedAssetIds = new Set<string>();
  const orderedBoards = scene.boardOrder
    .map((boardId) => getSceneBoardById(scene, boardId))
    .filter((board): board is ProjectBoard => Boolean(board));
  const warnings: string[] = [];

  const boards = orderedBoards.map((board) => createBoard(board, assetMap, usedAssetIds));
  const images: FigmaExportImageAsset[] = [];

  for (const assetId of usedAssetIds) {
    const asset = assetMap.get(assetId);
    if (!asset) {
      warnings.push(`素材 ${assetId} 在当前项目中不存在，已跳过图片内容。`);
      continue;
    }

    try {
      const resolved = await resolveImageData(asset);
      if (!resolved) {
        warnings.push(`素材 ${asset.title ?? asset.id} 无法导出图片内容，导入 Figma 时会显示占位层。`);
        continue;
      }

      images.push({
        assetId: asset.id,
        name: asset.title?.trim() || asset.id,
        mimeType: resolved.mimeType,
        dataUrl: resolved.dataUrl,
      });
    } catch {
      warnings.push(`素材 ${asset.title ?? asset.id} 无法导出图片内容，导入 Figma 时会显示占位层。`);
    }
  }

  return {
    version: 1,
    kind: "project-figma-export",
    source: "foliobox",
    exportedAt: new Date().toISOString(),
    project: {
      id: projectId,
      name: projectName,
    },
    boards,
    images,
    warnings,
    pluginHints: {
      importPluginFolder: "figma-plugin",
      supportedNodes: ["text", "image", "shape"],
      limitations: [
        "当前仅支持项目级单向导出，不支持回写 FolioBox。",
        "图片裁切会保留原始 fit 信息，但暂不精确还原所有 crop 偏移。",
        "线性渐变会映射到 Figma 线性渐变；极少数复杂颜色表现可能与编辑器略有差异。",
      ],
    },
  };
}
