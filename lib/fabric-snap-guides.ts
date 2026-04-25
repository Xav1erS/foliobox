/**
 * 纯几何 snap 计算，不依赖 Fabric 对象系统本身。
 *
 * 给定一个 moving 矩形、其他矩形列表、画布尺寸，输出：
 * - `dx` / `dy`：moving 矩形需要被吸附的位移（像素，画布坐标）
 * - `guides`：本次激活的辅助线集合，供调用方在画布上画 1 像素细线
 *
 * 阈值默认 8 px。每条轴上只取最近的一个 snap 目标。
 */
export type SnapRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SnapGuide = {
  orientation: "vertical" | "horizontal";
  /** 画布坐标下的固定轴位置（vertical → x；horizontal → y） */
  position: number;
  /** 沿另一轴的延展范围 [start, end]，方便画线 */
  span: [number, number];
};

export type SnapResult = {
  dx: number;
  dy: number;
  guides: SnapGuide[];
};

const DEFAULT_THRESHOLD = 8;

type AxisCandidate = {
  /** 在该轴上的目标位置 */
  target: number;
  /** moving 矩形上对应的边/中线相对位置（0=左/上，0.5=中，1=右/下） */
  movingRatio: number;
  /** 沿另一轴的辅助线延展范围 */
  span: [number, number];
};

function pickClosest(
  candidates: AxisCandidate[],
  movingStart: number,
  movingSize: number,
  threshold: number
): { delta: number; candidate: AxisCandidate } | null {
  let best: { delta: number; candidate: AxisCandidate } | null = null;
  for (const candidate of candidates) {
    const movingEdge = movingStart + movingSize * candidate.movingRatio;
    const delta = candidate.target - movingEdge;
    if (Math.abs(delta) > threshold) continue;
    if (!best || Math.abs(delta) < Math.abs(best.delta)) {
      best = { delta, candidate };
    }
  }
  return best;
}

export function computeSnap(params: {
  moving: SnapRect;
  others: SnapRect[];
  canvas: { width: number; height: number };
  threshold?: number;
}): SnapResult {
  const { moving, others } = params;
  const threshold = params.threshold ?? DEFAULT_THRESHOLD;
  const canvasW = params.canvas.width;
  const canvasH = params.canvas.height;

  const verticalCandidates: AxisCandidate[] = [
    // 画布左 / 中 / 右
    { target: 0, movingRatio: 0, span: [0, canvasH] },
    { target: canvasW / 2, movingRatio: 0.5, span: [0, canvasH] },
    { target: canvasW, movingRatio: 1, span: [0, canvasH] },
  ];
  const horizontalCandidates: AxisCandidate[] = [
    { target: 0, movingRatio: 0, span: [0, canvasW] },
    { target: canvasH / 2, movingRatio: 0.5, span: [0, canvasW] },
    { target: canvasH, movingRatio: 1, span: [0, canvasW] },
  ];

  for (const other of others) {
    const otherRight = other.left + other.width;
    const otherBottom = other.top + other.height;
    const otherCenterX = other.left + other.width / 2;
    const otherCenterY = other.top + other.height / 2;
    const ySpan: [number, number] = [
      Math.min(other.top, moving.top),
      Math.max(otherBottom, moving.top + moving.height),
    ];
    const xSpan: [number, number] = [
      Math.min(other.left, moving.left),
      Math.max(otherRight, moving.left + moving.width),
    ];

    // 垂直辅助线（同一 X，跨 Y）
    verticalCandidates.push(
      { target: other.left, movingRatio: 0, span: ySpan },
      { target: otherRight, movingRatio: 1, span: ySpan },
      { target: otherCenterX, movingRatio: 0.5, span: ySpan },
      // 边对齐：moving 的右边吸 other 的左边、moving 的左边吸 other 的右边
      { target: other.left, movingRatio: 1, span: ySpan },
      { target: otherRight, movingRatio: 0, span: ySpan }
    );

    horizontalCandidates.push(
      { target: other.top, movingRatio: 0, span: xSpan },
      { target: otherBottom, movingRatio: 1, span: xSpan },
      { target: otherCenterY, movingRatio: 0.5, span: xSpan },
      { target: other.top, movingRatio: 1, span: xSpan },
      { target: otherBottom, movingRatio: 0, span: xSpan }
    );
  }

  const vSnap = pickClosest(verticalCandidates, moving.left, moving.width, threshold);
  const hSnap = pickClosest(horizontalCandidates, moving.top, moving.height, threshold);

  const guides: SnapGuide[] = [];
  if (vSnap) {
    guides.push({
      orientation: "vertical",
      position: vSnap.candidate.target,
      span: vSnap.candidate.span,
    });
  }
  if (hSnap) {
    guides.push({
      orientation: "horizontal",
      position: hSnap.candidate.target,
      span: hSnap.candidate.span,
    });
  }

  return {
    dx: vSnap ? vSnap.delta : 0,
    dy: hSnap ? hSnap.delta : 0,
    guides,
  };
}
