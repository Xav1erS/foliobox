import type { FabricObject } from "fabric";
import {
  MAX_PROJECT_BOARDS,
  type ProjectBoard,
  type ProjectBoardGroupRun,
  type ProjectBoardImageNode,
  type ProjectBoardTextNode,
  type ProjectImageRoleTag,
  type ProjectShapeType,
} from "@/lib/project-editor-scene";

export type FabricSceneObject = FabricObject & {
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
    placeholder?: boolean;
    /** Snap 辅助线标记，命中后跳过状态同步 / 缩略图重抓。 */
    snapGuide?: boolean;
  };
};

export const PROJECT_IMAGE_ROLE_LABELS: Record<ProjectImageRoleTag, string> = {
  main: "主讲",
  support: "补充",
  decorative: "装饰",
  risk: "风险",
};

export const SHAPE_LABELS: Record<ProjectShapeType, string> = {
  rect: "矩形",
  square: "正方形",
  circle: "圆形",
  triangle: "三角形",
  line: "线段",
};

export const SURFACE_FIT_PADDING = 48;

// 正文字体
export const EDITOR_FONTS_BODY = [
  { label: "思源黑体", value: "Noto Sans SC" },
  { label: "思源宋体", value: "Noto Serif SC" },
  { label: "阿里巴巴普惠体", value: "Alibaba PuHuiTi" },
  { label: "站酷小薇体", value: "ZCOOL XiaoWei" },
] as const;

// 展示/艺术字体
export const EDITOR_FONTS_DISPLAY = [
  { label: "得意黑", value: "Smiley Sans" },
  { label: "站酷庆科黄油体", value: "ZCOOL QingKe HuangYou" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "Bebas Neue", value: "Bebas Neue" },
  { label: "Syne", value: "Syne" },
] as const;

export const EDITOR_FONTS = [...EDITOR_FONTS_BODY, ...EDITOR_FONTS_DISPLAY];

export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&family=Noto+Serif+SC:wght@400;700&family=ZCOOL+XiaoWei&family=ZCOOL+QingKe+HuangYou&family=Playfair+Display:wght@400;700&family=Cormorant+Garamond:wght@400;600&family=Bebas+Neue&family=Syne:wght@400;700;800&display=swap";

// 得意黑 + 阿里普惠体通过各自 CDN 加载（自托管字体，无 Google Fonts 收录）
export const SMILEY_SANS_URL =
  "https://cdn.jsdelivr.net/gh/atelier-anchor/smiley-sans@1.1.1/demo/SmileySans-Oblique.woff2";
export const ALIBABA_PUHUITI_URL =
  "https://puhuiti.oss-cn-hangzhou.aliyuncs.com/AlibabaPuHuiTi-2/AlibabaPuHuiTi-2-55-Regular/AlibabaPuHuiTi-2-55-Regular.woff2";

// 画板数量硬上限：see spec-system-v3/04 §4.5。
export const PROJECT_BOARD_MAX = MAX_PROJECT_BOARDS;

export const editorPanelCardClass =
  "rounded-[20px] border border-white/8 bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]";
export const editorPanelMutedCardClass =
  "rounded-[18px] border border-white/8 bg-white/3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]";
export const editorFloatingSurfaceClass =
  "rounded-[22px] border border-white/8 bg-card text-white shadow-[0_20px_48px_-28px_rgba(0,0,0,0.86)]";
export const editorPopupSurfaceClass =
  "rounded-[20px] border border-white/8 bg-card text-white shadow-[0_24px_56px_-24px_rgba(0,0,0,0.9)]";
export const editorPopupItemClass =
  "flex w-full items-center justify-between rounded-[14px] px-3 py-2.5 text-left text-sm text-white/72 transition-colors hover:bg-white/[0.07] hover:text-white";

export function newNodeId(prefix: "text" | "image" | "shape") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function newStructureId(prefix: "group" | "section") {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function approximatelyEqual(a: number, b: number, tolerance = 0.5) {
  return Math.abs(a - b) <= tolerance;
}

export function isEditableCanvasTarget(target: FabricObject | null | undefined) {
  if (!target) return false;
  if (target.type === "activeSelection") return true;
  const typed = target as FabricSceneObject;
  return Boolean(typed.data?.nodeType) || target.type === "textbox";
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "请求失败");
  }
  return data;
}

export function readDownloadFilename(response: Response, fallback: string) {
  const header = response.headers.get("content-disposition") ?? "";
  const encodedMatch = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1]);
    } catch {
      return encodedMatch[1];
    }
  }

  const plainMatch = header.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] ?? fallback;
}

export function getBoardThumbnailAssetId(board: ProjectBoard) {
  if (board.thumbnailAssetId) return board.thumbnailAssetId;
  const imageNode = board.nodes.find(
    (node): node is ProjectBoardImageNode => node.type === "image"
  );
  return imageNode?.assetId ?? null;
}

export function getBoardGroupRunLabel(
  run: ProjectBoardGroupRun,
  options: { showUngrouped: boolean }
) {
  if (run.label) return run.label;
  return options.showUngrouped ? "未分组" : null;
}

export function getImageFrameMeta(object: FabricSceneObject) {
  const scaledWidth =
    typeof object.getScaledWidth === "function" ? object.getScaledWidth() : object.width ?? 0;
  const scaledHeight =
    typeof object.getScaledHeight === "function" ? object.getScaledHeight() : object.height ?? 0;
  const fit = "fit" as const;
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

export function getImageCropMeta() {
  return { x: 0.5, y: 0.5, scale: 1 };
}
