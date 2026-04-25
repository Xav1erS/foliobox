import type {
  ProjectBoardImageNode,
  ProjectBoardNode,
  ProjectBoardShapeNode,
  ProjectBoardTextNode,
  ProjectLayoutIntent,
  ProjectPageType,
  ProjectPrototypeBoardDraft,
} from "./project-editor-scene";

type PrototypeShapePatch = Partial<ProjectBoardShapeNode> &
  Pick<ProjectBoardShapeNode, "x" | "y" | "width" | "height">;
type PrototypeTextPatch = Partial<ProjectBoardTextNode> &
  Pick<ProjectBoardTextNode, "text" | "role">;
type PrototypeImagePatch = Partial<ProjectBoardImageNode>;

type PrototypeNodeFactory = {
  createShape: (patch: PrototypeShapePatch) => ProjectBoardShapeNode;
  createText: (patch: PrototypeTextPatch) => ProjectBoardTextNode;
  createImage: (assetId: string, patch?: PrototypeImagePatch) => ProjectBoardImageNode;
};

type PrototypeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type BuildPrototypeLayoutParams = {
  pageType: ProjectPageType;
  groupLabel: string;
  draft: ProjectPrototypeBoardDraft;
  helperText: string;
  assetLabel: string;
  cardLines: string[];
  matchedAssetId: string | null;
  hasDenseKeyPoints: boolean;
  looksMetricHeavy: boolean;
};

const BOARD_WIDTH = 1920;
const BOARD_HEIGHT = 1080;
const SAFE_X = 120;
const SAFE_Y = 108;
const SAFE_WIDTH = 1680;
const SAFE_BOTTOM = 944;
const GRID_GUTTER = 40;
const HEADER_TITLE_Y = 156;
const HEADER_GAP = 44;

function getCharUnits(line: string) {
  return Array.from(line).reduce((sum, char) => {
    if (/\s/.test(char)) return sum + 0.35;
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(char)) return sum + 1;
    if (/[A-Z0-9]/.test(char)) return sum + 0.75;
    return sum + 0.64;
  }, 0);
}

function estimateTextHeight(
  text: string,
  width: number,
  fontSize: number,
  lineHeight: number,
  options?: {
    minHeight?: number;
    maxHeight?: number;
    padding?: number;
  }
) {
  const padding = options?.padding ?? 0;
  const normalized = (text ?? "").trim();
  if (!normalized) {
    return Math.max(options?.minHeight ?? 0, fontSize * lineHeight + padding);
  }

  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.72)));
  const lines = normalized.split(/\n+/).reduce((sum, line) => {
    const units = Math.max(1, getCharUnits(line));
    return sum + Math.max(1, Math.ceil(units / charsPerLine));
  }, 0);
  const rawHeight = Math.ceil(lines * fontSize * lineHeight + padding);
  if (options?.maxHeight !== undefined) {
    return Math.max(options.minHeight ?? 0, Math.min(options.maxHeight, rawHeight));
  }
  return Math.max(options?.minHeight ?? 0, rawHeight);
}

function normalizePrototypeText(text: string) {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function fitTextToHeight(
  text: string,
  width: number,
  fontSize: number,
  lineHeight: number,
  maxHeight: number
) {
  const normalized = normalizePrototypeText(text ?? "");
  if (!normalized) return "";
  if (estimateTextHeight(normalized, width, fontSize, lineHeight) <= maxHeight) {
    return normalized;
  }

  let low = 0;
  let high = normalized.length;
  let best = "";
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${normalized.slice(0, mid).trimEnd()}…`;
    if (estimateTextHeight(candidate, width, fontSize, lineHeight) <= maxHeight) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best || "…";
}

function buildHeader(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: {
    groupLabel: string;
    title: string;
    titleWidth: number;
    titleFontSize: number;
  }
) {
  const { groupLabel, title, titleWidth, titleFontSize } = params;
  const titleHeight = estimateTextHeight(title, titleWidth, titleFontSize, 1.08, {
    minHeight: titleFontSize + 12,
    maxHeight: 164,
  });
  const fittedTitle = fitTextToHeight(title, titleWidth, titleFontSize, 1.08, titleHeight);

  nodes.push(
    factory.createText({
      role: "caption",
      text: `${groupLabel} · 低保真内容稿`,
      x: SAFE_X,
      y: SAFE_Y,
      width: 760,
      height: 28,
      fontSize: 18,
      fontWeight: 600,
      lineHeight: 1.2,
      zIndex: 1,
    }),
    factory.createText({
      role: "title",
      text: fittedTitle,
      x: SAFE_X,
      y: HEADER_TITLE_Y,
      width: titleWidth,
      height: titleHeight,
      fontSize: titleFontSize,
      fontWeight: 700,
      lineHeight: 1.08,
      zIndex: 2,
    })
  );

  return {
    titleBottom: HEADER_TITLE_Y + titleHeight,
    contentTop: HEADER_TITLE_Y + titleHeight + HEADER_GAP,
  };
}

function addPanel(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  rect: PrototypeRect,
  text: string,
  options: {
    role: ProjectBoardTextNode["role"];
    fontSize: number;
    lineHeight: number;
    align?: ProjectBoardTextNode["align"];
    paddingX?: number;
    paddingTop?: number;
    textHeight?: number;
    zIndex?: number;
  }
) {
  const zIndex = options.zIndex ?? 3;
  const paddingX = options.paddingX ?? 40;
  const paddingTop = options.paddingTop ?? 36;
  const contentWidth = Math.max(80, rect.width - paddingX * 2);
  const contentHeight =
    options.textHeight ??
    Math.max(32, rect.height - paddingTop - Math.max(24, paddingTop - 8));
  const fittedText = fitTextToHeight(
    text,
    contentWidth,
    options.fontSize,
    options.lineHeight,
    contentHeight
  );
  nodes.push(factory.createShape({ ...rect, zIndex }));
  nodes.push(
    factory.createText({
      role: options.role,
      text: fittedText,
      x: rect.x + paddingX,
      y: rect.y + paddingTop,
      width: contentWidth,
      height: contentHeight,
      fontSize: options.fontSize,
      lineHeight: options.lineHeight,
      align: options.align,
      zIndex: zIndex + 1,
    })
  );
}

function addCardRow(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: {
    texts: string[];
    x: number;
    y: number;
    width: number;
    height: number;
    gap?: number;
    role?: ProjectBoardTextNode["role"];
    fontSize?: number;
  }
) {
  const gap = params.gap ?? 36;
  const role = params.role ?? "metric";
  const fontSize = params.fontSize ?? 22;
  const itemWidth = Math.floor((params.width - gap * (params.texts.length - 1)) / params.texts.length);
  params.texts.forEach((text, index) => {
    const x = params.x + index * (itemWidth + gap);
    addPanel(
      nodes,
      factory,
      { x, y: params.y, width: itemWidth, height: params.height },
      text,
      {
        role,
        fontSize,
        lineHeight: role === "metric" ? 1.25 : 1.3,
        align: "center",
        paddingX: 24,
        paddingTop: Math.max(32, Math.floor((params.height - fontSize * 3.1) / 2)),
        zIndex: 4,
      }
    );
  });
}

function addVisualSlot(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: {
    rect: PrototypeRect;
    matchedAssetId: string | null;
    visualBrief: string;
    fallbackText: string;
  }
) {
  const { rect, matchedAssetId, visualBrief, fallbackText } = params;
  nodes.push(factory.createShape({ ...rect, zIndex: 3 }));
  if (matchedAssetId) {
    const fittedVisualBrief = fitTextToHeight(
      visualBrief || "已匹配设计图",
      Math.max(120, rect.width - 72),
      18,
      1.25,
      32
    );
    nodes.push(
      factory.createImage(matchedAssetId, {
        x: rect.x + 28,
        y: rect.y + 40,
        width: Math.max(120, rect.width - 56),
        height: Math.max(120, rect.height - 132),
        zIndex: 4,
      }),
      factory.createText({
        role: "caption",
        text: "已匹配素材",
        x: rect.x + 28,
        y: rect.y + 18,
        width: Math.max(120, rect.width - 56),
        height: 26,
        fontSize: 18,
        lineHeight: 1.25,
        zIndex: 5,
      }),
      factory.createText({
        role: "note",
        text: fittedVisualBrief,
        x: rect.x + 36,
        y: rect.y + rect.height - 60,
        width: Math.max(120, rect.width - 72),
        height: 32,
        fontSize: 18,
        lineHeight: 1.25,
        align: "center",
        zIndex: 5,
      })
    );
    return;
  }

  nodes.push(
    factory.createText({
      role: "note",
      text: fitTextToHeight(
        [visualBrief, fallbackText].filter(Boolean).join("\n\n"),
        Math.max(180, rect.width - 112),
        22,
        1.35,
        120
      ),
      x: rect.x + 56,
      y: rect.y + Math.max(48, Math.floor(rect.height / 2) - 56),
      width: Math.max(180, rect.width - 112),
      height: 120,
      fontSize: 22,
      lineHeight: 1.35,
      align: "center",
      zIndex: 4,
    })
  );
}

function layoutCover(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText, assetLabel, cardLines, matchedAssetId } = params;
  const hasVisual = Boolean(matchedAssetId);
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: hasVisual ? 660 : 900,
    titleFontSize: 64,
  });
  const bodyText = helperText || "这一页先建立项目边界、角色和目标。";
  const contentTop = header.contentTop;

  if (!hasVisual) {
    const bodyRect = {
      x: SAFE_X,
      y: contentTop,
      width: 760,
      height: 340,
    };
    const rightX = bodyRect.x + bodyRect.width + GRID_GUTTER;
    const cardRowY = contentTop;
    addPanel(nodes, factory, bodyRect, bodyText, {
      role: "body",
      fontSize: 26,
      lineHeight: 1.45,
      zIndex: 3,
    });
    addCardRow(nodes, factory, {
      texts: cardLines,
      x: rightX,
      y: cardRowY,
      width: SAFE_X + SAFE_WIDTH - rightX,
      height: 148,
    });
    addVisualSlot(nodes, factory, {
      rect: {
        x: rightX,
        y: cardRowY + 188,
        width: SAFE_X + SAFE_WIDTH - rightX,
        height: 316,
      },
      matchedAssetId: null,
      visualBrief: draft.visualBrief,
      fallbackText: assetLabel,
    });
    addPanel(
      nodes,
      factory,
      {
        x: SAFE_X,
        y: Math.min(SAFE_BOTTOM - 156, bodyRect.y + bodyRect.height + 40),
        width: SAFE_WIDTH,
        height: 156,
      },
      draft.keyPoints.slice(0, 4).join("    ") || "主视觉未就绪时，先用关键信息卡建立开场页。",
      {
        role: "caption",
        fontSize: 22,
        lineHeight: 1.35,
        paddingX: 44,
        paddingTop: 44,
        zIndex: 3,
      }
    );
    return;
  }

  const visualWidth = 760;
  const visualX = SAFE_X + SAFE_WIDTH - visualWidth;
  const bodyWidth = visualX - SAFE_X - GRID_GUTTER;
  const bodyHeight = estimateTextHeight(bodyText, bodyWidth - 80, 26, 1.45, {
    minHeight: 176,
    maxHeight: 248,
    padding: 64,
  });
  addPanel(
    nodes,
    factory,
    {
      x: SAFE_X,
      y: contentTop,
      width: bodyWidth,
      height: bodyHeight,
    },
    bodyText,
    {
      role: "body",
      fontSize: 26,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addCardRow(nodes, factory, {
    texts: cardLines,
    x: SAFE_X,
    y: contentTop + bodyHeight + 36,
    width: bodyWidth,
    height: 152,
  });
  addVisualSlot(nodes, factory, {
    rect: {
      x: visualX,
      y: contentTop,
      width: visualWidth,
      height: 472,
    },
    matchedAssetId,
    visualBrief: draft.visualBrief,
    fallbackText: assetLabel,
  });
  nodes.push(
    factory.createText({
      role: "caption",
      text: fitTextToHeight(
        draft.keyPoints.slice(0, 4).join("    ") ||
          "用项目概览卡片提炼核心边界与一句话定义，辅助建立开场页。",
        SAFE_WIDTH,
        18,
        1.2,
        34
      ),
      x: SAFE_X,
      y: SAFE_BOTTOM - 56,
      width: SAFE_WIDTH,
      height: 34,
      fontSize: 18,
      lineHeight: 1.2,
      align: "center",
      zIndex: 4,
    })
  );
}

function layoutBackground(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText, assetLabel, matchedAssetId } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 840,
    titleFontSize: 66,
  });
  const contentTop = header.contentTop;
  const leftWidth = 500;
  const middleWidth = 480;
  const rightWidth = SAFE_WIDTH - leftWidth - middleWidth - GRID_GUTTER * 2;
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: leftWidth, height: 560 },
    draft.summary || "背景区待补充",
    {
      role: "body",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addPanel(
    nodes,
    factory,
    { x: SAFE_X + leftWidth + GRID_GUTTER, y: contentTop, width: middleWidth, height: 560 },
    draft.keyPoints.slice(0, 4).join("\n") || draft.narrative || "问题与约束待补充",
    {
      role: "body",
      fontSize: 22,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addVisualSlot(nodes, factory, {
    rect: {
      x: SAFE_X + leftWidth + middleWidth + GRID_GUTTER * 2,
      y: contentTop,
      width: rightWidth,
      height: 560,
    },
    matchedAssetId,
    visualBrief: draft.visualBrief,
    fallbackText: assetLabel,
  });
}

function layoutGlobalStructure(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText, cardLines } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 860,
    titleFontSize: 66,
  });
  const contentTop = header.contentTop;
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: 520, height: 560 },
    helperText || "这一页先讲清规则、组件与映射关系。",
    {
      role: "body",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addPanel(
    nodes,
    factory,
    { x: 680, y: contentTop, width: 1120, height: 208 },
    draft.keyPoints.slice(0, 4).join("\n") || "规则表 / 命名约束 / 组件映射待补充",
    {
      role: "note",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addCardRow(nodes, factory, {
    texts: cardLines,
    x: 680,
    y: contentTop + 248,
    width: 1120,
    height: 312,
    role: "note",
    fontSize: 20,
  });
}

function layoutInsight(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText, hasDenseKeyPoints } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 860,
    titleFontSize: 66,
  });
  const contentTop = header.contentTop;

  if (hasDenseKeyPoints) {
    addPanel(
      nodes,
      factory,
      { x: SAFE_X, y: contentTop, width: 720, height: 208 },
      draft.summary || "场景主线待补充",
      {
        role: "body",
        fontSize: 24,
        lineHeight: 1.45,
        zIndex: 3,
      }
    );
    addPanel(
      nodes,
      factory,
      { x: 880, y: contentTop, width: 920, height: 208 },
      draft.narrative || "任务链 / 洞察说明待补充",
      {
        role: "note",
        fontSize: 22,
        lineHeight: 1.45,
        zIndex: 3,
      }
    );
    addCardRow(nodes, factory, {
      texts: [
        draft.keyPoints[0] || "场景 1",
        draft.keyPoints[1] || "场景 2",
        draft.keyPoints[2] || "场景 3",
        draft.keyPoints[3] || "场景 4",
      ],
      x: SAFE_X,
      y: contentTop + 280,
      width: SAFE_WIDTH,
      height: 220,
      role: "note",
    });
    return;
  }

  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: 640, height: 560 },
    helperText || "洞察 / 流程主区待补充",
    {
      role: "body",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addPanel(
    nodes,
    factory,
    { x: 820, y: contentTop, width: 980, height: 220 },
    draft.keyPoints.slice(0, 4).join("\n") || draft.visualBrief || "关键信息卡待补充",
    {
      role: "note",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addCardRow(nodes, factory, {
    texts: params.cardLines,
    x: 820,
    y: contentTop + 292,
    width: 980,
    height: 268,
    role: "note",
    fontSize: 20,
  });
}

function layoutStrategy(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText, assetLabel, matchedAssetId } = params;
  const hasVisual = Boolean(matchedAssetId);
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 860,
    titleFontSize: 66,
  });
  const contentTop = header.contentTop;
  const introHeight = estimateTextHeight(helperText || draft.summary, SAFE_WIDTH - 80, 24, 1.45, {
    minHeight: 132,
    maxHeight: 176,
    padding: 52,
  });

  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: SAFE_WIDTH, height: introHeight },
    helperText || "流程说明与异常恢复待补充",
    {
      role: "body",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );

  const cardsY = contentTop + introHeight + 36;
  if (!hasVisual) {
    addCardRow(nodes, factory, {
      texts: [
        draft.keyPoints[0] || "步骤 / 策略 1",
        draft.keyPoints[1] || "步骤 / 策略 2",
        draft.keyPoints[2] || "步骤 / 策略 3",
        draft.keyPoints[3] || "步骤 / 策略 4",
      ],
      x: SAFE_X,
      y: cardsY,
      width: SAFE_WIDTH,
      height: 220,
      role: "body",
    });
    addPanel(
      nodes,
      factory,
      { x: SAFE_X, y: cardsY + 292, width: SAFE_WIDTH, height: 168 },
      draft.narrative || draft.visualBrief || "流程说明与异常恢复待补充",
      {
        role: "note",
        fontSize: 24,
        lineHeight: 1.45,
        zIndex: 3,
      }
    );
    return;
  }

  const leftWidth = 1040;
  addCardRow(nodes, factory, {
    texts: [
      draft.keyPoints[0] || "步骤 / 策略 1",
      draft.keyPoints[1] || "步骤 / 策略 2",
      draft.keyPoints[2] || "步骤 / 策略 3",
      draft.keyPoints[3] || "步骤 / 策略 4",
    ],
    x: SAFE_X,
    y: cardsY,
    width: leftWidth,
    height: 224,
    role: "body",
  });
  addVisualSlot(nodes, factory, {
    rect: {
      x: SAFE_X + leftWidth + GRID_GUTTER,
      y: cardsY,
      width: SAFE_WIDTH - leftWidth - GRID_GUTTER,
      height: 488,
    },
    matchedAssetId,
    visualBrief: draft.visualBrief,
    fallbackText: assetLabel,
  });
}

function layoutModule(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText, assetLabel, matchedAssetId } = params;
  const hasVisual = Boolean(matchedAssetId);
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 860,
    titleFontSize: 66,
  });
  const contentTop = header.contentTop;

  if (hasVisual) {
    addVisualSlot(nodes, factory, {
      rect: { x: SAFE_X, y: contentTop, width: 840, height: 500 },
      matchedAssetId,
      visualBrief: draft.visualBrief,
      fallbackText: assetLabel,
    });
    addPanel(
      nodes,
      factory,
      { x: 1000, y: contentTop, width: 800, height: 200 },
      draft.summary || "模块目标与设计说明待补充",
      {
        role: "body",
        fontSize: 24,
        lineHeight: 1.45,
        zIndex: 3,
      }
    );
    addCardRow(nodes, factory, {
      texts: [
        draft.keyPoints[0] || "关键改动 1",
        draft.keyPoints[1] || "关键改动 2",
      ],
      x: 1000,
      y: contentTop + 240,
      width: 800,
      height: 260,
      role: "note",
    });
    addPanel(
      nodes,
      factory,
      { x: SAFE_X, y: contentTop + 540, width: SAFE_WIDTH, height: 132 },
      draft.narrative || draft.visualBrief || "交互说明待补充",
      {
        role: "body",
        fontSize: 24,
        lineHeight: 1.45,
        zIndex: 3,
      }
    );
    return;
  }

  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: 780, height: 520 },
    draft.keyPoints[0] || "模块 A / Before",
    {
      role: "note",
      fontSize: 24,
      lineHeight: 1.35,
      align: "center",
      paddingTop: 208,
      zIndex: 3,
    }
  );
  addPanel(
    nodes,
    factory,
    { x: 1020, y: contentTop, width: 780, height: 520 },
    draft.keyPoints[1] || "模块 B / After",
    {
      role: "note",
      fontSize: 24,
      lineHeight: 1.35,
      align: "center",
      paddingTop: 208,
      zIndex: 3,
    }
  );
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop + 560, width: SAFE_WIDTH, height: 120 },
    helperText || "说明位待补充",
    {
      role: "body",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
}

function layoutResult(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, assetLabel, matchedAssetId, looksMetricHeavy } = params;
  const hasVisual = Boolean(matchedAssetId);
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 840,
    titleFontSize: 66,
  });
  const contentTop = header.contentTop;

  if (!hasVisual || looksMetricHeavy) {
    addPanel(
      nodes,
      factory,
      { x: SAFE_X, y: contentTop, width: 720, height: 240 },
      draft.summary || "结果结论待补充",
      {
        role: "body",
        fontSize: 26,
        lineHeight: 1.45,
        zIndex: 3,
      }
    );
    addCardRow(nodes, factory, {
      texts: params.cardLines,
      x: 900,
      y: contentTop,
      width: 852,
      height: 180,
    });
    addPanel(
      nodes,
      factory,
      { x: 900, y: contentTop + 240, width: 852, height: 300 },
      draft.keyPoints.slice(0, 4).join("\n") || draft.visualBrief || "证据链 / 反馈摘要待补充",
      {
        role: "note",
        fontSize: 24,
        lineHeight: 1.45,
        zIndex: 3,
      }
    );
    addPanel(
      nodes,
      factory,
      { x: SAFE_X, y: contentTop + 324, width: 720, height: 216 },
      draft.narrative || assetLabel,
      {
        role: "body",
        fontSize: 22,
        lineHeight: 1.35,
        zIndex: 3,
      }
    );
    return;
  }

  addCardRow(nodes, factory, {
    texts: params.cardLines,
    x: SAFE_X,
    y: contentTop,
    width: 852,
    height: 180,
  });
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop + 236, width: 852, height: 344 },
    [draft.summary, ...draft.keyPoints.slice(0, 3)].filter(Boolean).join("\n") || "结果说明待补充",
    {
      role: "body",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addVisualSlot(nodes, factory, {
    rect: { x: 1008, y: contentTop, width: 792, height: 580 },
    matchedAssetId,
    visualBrief: draft.visualBrief,
    fallbackText: assetLabel,
  });
}

function layoutReflection(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 840,
    titleFontSize: 66,
  });
  const contentTop = header.contentTop;
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: 980, height: 620 },
    helperText || "这一页用于收束项目主线。",
    {
      role: "body",
      fontSize: 26,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addPanel(
    nodes,
    factory,
    { x: 1140, y: contentTop, width: 660, height: 300 },
    draft.keyPoints.slice(0, 4).join("\n") || draft.visualBrief || "反思 / 下一步待补充",
    {
      role: "note",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addPanel(
    nodes,
    factory,
    { x: 1140, y: contentTop + 320, width: 660, height: 300 },
    draft.narrative || "总结 / 反思补充区",
    {
      role: "body",
      fontSize: 22,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
}

// ---------- Intent composers (Sprint 1) ----------
// Each composer owns a distinct silhouette so that 11 pages stop looking identical.

function addAccentBar(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  rect: PrototypeRect
) {
  nodes.push(factory.createShape({ ...rect, zIndex: 4 }));
}

function intentHero(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText, assetLabel, matchedAssetId } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 1200,
    titleFontSize: 80,
  });
  const contentTop = header.contentTop;
  const visualHeight = 520;
  const visualWidth = matchedAssetId ? 1180 : SAFE_WIDTH;
  const visualX = matchedAssetId ? SAFE_X + (SAFE_WIDTH - visualWidth) / 2 : SAFE_X;
  addVisualSlot(nodes, factory, {
    rect: { x: visualX, y: contentTop, width: visualWidth, height: visualHeight },
    matchedAssetId,
    visualBrief: draft.visualBrief,
    fallbackText: assetLabel,
  });
  const footerY = Math.min(SAFE_BOTTOM - 112, contentTop + visualHeight + 56);
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: footerY, width: SAFE_WIDTH, height: 96 },
    helperText || draft.summary || "这一页用主视觉建立开场。",
    {
      role: "body",
      fontSize: 26,
      lineHeight: 1.4,
      align: "center",
      paddingTop: 28,
      zIndex: 3,
    }
  );
}

function intentSplit21(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText, assetLabel, matchedAssetId } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 1000,
    titleFontSize: 60,
  });
  const contentTop = header.contentTop;
  const leftWidth = Math.floor((SAFE_WIDTH - GRID_GUTTER) * 0.62);
  const rightWidth = SAFE_WIDTH - leftWidth - GRID_GUTTER;
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: leftWidth, height: 360 },
    draft.summary || helperText || "左侧主论述区待补充",
    {
      role: "body",
      fontSize: 26,
      lineHeight: 1.5,
      zIndex: 3,
    }
  );
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop + 392, width: leftWidth, height: 180 },
    draft.narrative || draft.keyPoints.slice(0, 3).join("\n") || "展开说明待补充",
    {
      role: "note",
      fontSize: 22,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  addVisualSlot(nodes, factory, {
    rect: {
      x: SAFE_X + leftWidth + GRID_GUTTER,
      y: contentTop,
      width: rightWidth,
      height: 572,
    },
    matchedAssetId,
    visualBrief: draft.visualBrief,
    fallbackText: assetLabel,
  });
}

function intentGrid3(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 1100,
    titleFontSize: 62,
  });
  const contentTop = header.contentTop;
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: SAFE_WIDTH, height: 132 },
    helperText || draft.summary || "三个并列要点的整体说明",
    {
      role: "body",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  const cardsY = contentTop + 164;
  const cardHeight = 404;
  const gap = 32;
  const cardWidth = Math.floor((SAFE_WIDTH - gap * 2) / 3);
  const labels = ["要点一", "要点二", "要点三"];
  for (let i = 0; i < 3; i += 1) {
    const x = SAFE_X + i * (cardWidth + gap);
    // accent bar on top of each card
    addAccentBar(nodes, factory, { x, y: cardsY, width: cardWidth, height: 8 });
    addPanel(
      nodes,
      factory,
      { x, y: cardsY + 16, width: cardWidth, height: cardHeight - 16 },
      [
        draft.infoCards[i]?.label || labels[i],
        "",
        draft.infoCards[i]?.value || draft.keyPoints[i] || "要点内容待补充",
      ].join("\n"),
      {
        role: "body",
        fontSize: 22,
        lineHeight: 1.5,
        paddingX: 32,
        paddingTop: 36,
        zIndex: 3,
      }
    );
  }
}

function intentGrid2x2(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 1100,
    titleFontSize: 62,
  });
  const contentTop = header.contentTop;
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: SAFE_WIDTH, height: 108 },
    helperText || draft.summary || "四个维度的整体说明",
    {
      role: "note",
      fontSize: 22,
      lineHeight: 1.4,
      zIndex: 3,
    }
  );
  const gridY = contentTop + 140;
  const gap = 28;
  const cellWidth = Math.floor((SAFE_WIDTH - gap) / 2);
  const cellHeight = 220;
  const labels = ["维度 A", "维度 B", "维度 C", "维度 D"];
  for (let i = 0; i < 4; i += 1) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = SAFE_X + col * (cellWidth + gap);
    const y = gridY + row * (cellHeight + gap);
    const label = draft.infoCards[i]?.label || labels[i];
    const value = draft.infoCards[i]?.value || draft.keyPoints[i] || "待补充";
    addPanel(
      nodes,
      factory,
      { x, y, width: cellWidth, height: cellHeight },
      `${label}\n\n${value}`,
      {
        role: "body",
        fontSize: 22,
        lineHeight: 1.45,
        paddingX: 36,
        paddingTop: 32,
        zIndex: 3,
      }
    );
  }
}

function intentTimeline(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 1100,
    titleFontSize: 60,
  });
  const contentTop = header.contentTop;
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: SAFE_WIDTH, height: 108 },
    helperText || draft.summary || "以下是这一段流程的顺序主线。",
    {
      role: "body",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  const trackY = contentTop + 200;
  const nodeCount = Math.max(3, Math.min(4, draft.keyPoints.length || 4));
  const nodeWidth = 220;
  const totalWidth = SAFE_WIDTH;
  const nodeSpacing = Math.floor((totalWidth - nodeWidth * nodeCount) / (nodeCount - 1));
  // connector line along the centers
  addAccentBar(nodes, factory, {
    x: SAFE_X + 60,
    y: trackY + 58,
    width: totalWidth - 120,
    height: 4,
  });
  for (let i = 0; i < nodeCount; i += 1) {
    const x = SAFE_X + i * (nodeWidth + nodeSpacing);
    // node marker
    addAccentBar(nodes, factory, { x: x + nodeWidth / 2 - 18, y: trackY + 42, width: 36, height: 36 });
    // step label + description
    const label = draft.infoCards[i]?.label || `步骤 ${i + 1}`;
    const description =
      draft.keyPoints[i] || draft.infoCards[i]?.value || "该阶段说明待补充";
    nodes.push(
      factory.createText({
        role: "caption",
        text: label,
        x,
        y: trackY,
        width: nodeWidth,
        height: 34,
        fontSize: 20,
        fontWeight: 600,
        lineHeight: 1.2,
        align: "center",
        zIndex: 5,
      })
    );
    addPanel(
      nodes,
      factory,
      { x, y: trackY + 104, width: nodeWidth, height: 200 },
      description,
      {
        role: "note",
        fontSize: 20,
        lineHeight: 1.4,
        align: "center",
        paddingX: 18,
        paddingTop: 24,
        zIndex: 3,
      }
    );
  }
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: trackY + 344, width: SAFE_WIDTH, height: 108 },
    draft.narrative || draft.visualBrief || "流程整体产出 / 异常恢复说明待补充",
    {
      role: "body",
      fontSize: 22,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
}

function intentNarrative(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, helperText } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 980,
    titleFontSize: 64,
  });
  const contentTop = header.contentTop;
  const bodyWidth = 1060;
  const sidebarX = SAFE_X + bodyWidth + GRID_GUTTER;
  const sidebarWidth = SAFE_WIDTH - bodyWidth - GRID_GUTTER;
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop, width: bodyWidth, height: 620 },
    [
      draft.summary || helperText || "先讲清楚故事主线。",
      "",
      draft.narrative || "补充段落待完善。",
    ].join("\n"),
    {
      role: "body",
      fontSize: 26,
      lineHeight: 1.55,
      paddingTop: 48,
      paddingX: 56,
      zIndex: 3,
    }
  );
  const sideNotes = (draft.keyPoints.length > 0
    ? draft.keyPoints.slice(0, 3)
    : ["要点一待补充", "要点二待补充", "要点三待补充"]
  );
  const noteHeight = Math.floor((620 - 40) / sideNotes.length);
  sideNotes.forEach((note, index) => {
    addPanel(
      nodes,
      factory,
      {
        x: sidebarX,
        y: contentTop + index * (noteHeight + 20),
        width: sidebarWidth,
        height: noteHeight,
      },
      note,
      {
        role: "note",
        fontSize: 20,
        lineHeight: 1.45,
        paddingX: 28,
        paddingTop: 28,
        zIndex: 3,
      }
    );
  });
}

function intentShowcase(
  nodes: ProjectBoardNode[],
  factory: PrototypeNodeFactory,
  params: BuildPrototypeLayoutParams
) {
  const { draft, assetLabel, matchedAssetId } = params;
  const header = buildHeader(nodes, factory, {
    groupLabel: params.groupLabel,
    title: draft.title,
    titleWidth: 1100,
    titleFontSize: 60,
  });
  const contentTop = header.contentTop;
  const visualWidth = 1040;
  const rightX = SAFE_X + visualWidth + GRID_GUTTER;
  const rightWidth = SAFE_WIDTH - visualWidth - GRID_GUTTER;
  addVisualSlot(nodes, factory, {
    rect: { x: SAFE_X, y: contentTop, width: visualWidth, height: 560 },
    matchedAssetId,
    visualBrief: draft.visualBrief,
    fallbackText: assetLabel,
  });
  addPanel(
    nodes,
    factory,
    { x: rightX, y: contentTop, width: rightWidth, height: 180 },
    draft.summary || "模块 / 方案目标说明",
    {
      role: "body",
      fontSize: 24,
      lineHeight: 1.45,
      zIndex: 3,
    }
  );
  const noteCount = Math.max(2, Math.min(3, draft.keyPoints.length || 3));
  const noteStartY = contentTop + 200;
  const noteHeight = Math.floor((360 - 20 * (noteCount - 1)) / noteCount);
  for (let i = 0; i < noteCount; i += 1) {
    const y = noteStartY + i * (noteHeight + 20);
    const label = draft.infoCards[i]?.label || `关键点 ${i + 1}`;
    const value =
      draft.infoCards[i]?.value || draft.keyPoints[i] || "要点说明待补充";
    addPanel(
      nodes,
      factory,
      { x: rightX, y, width: rightWidth, height: noteHeight },
      `${label}\n${value}`,
      {
        role: "note",
        fontSize: 20,
        lineHeight: 1.4,
        paddingX: 28,
        paddingTop: 24,
        zIndex: 3,
      }
    );
  }
  addPanel(
    nodes,
    factory,
    { x: SAFE_X, y: contentTop + 592, width: SAFE_WIDTH, height: 96 },
    draft.narrative || "方案交互 / 设计说明待补充",
    {
      role: "body",
      fontSize: 22,
      lineHeight: 1.45,
      paddingTop: 28,
      zIndex: 3,
    }
  );
}

const INTENT_DISPATCH: Record<
  ProjectLayoutIntent,
  (
    nodes: ProjectBoardNode[],
    factory: PrototypeNodeFactory,
    params: BuildPrototypeLayoutParams
  ) => void
> = {
  hero: intentHero,
  split_2_1: intentSplit21,
  grid_3: intentGrid3,
  grid_2x2: intentGrid2x2,
  timeline: intentTimeline,
  narrative: intentNarrative,
  showcase: intentShowcase,
};

export function buildPrototypeLayoutNodes(
  params: BuildPrototypeLayoutParams,
  factory: PrototypeNodeFactory
) {
  const nodes: ProjectBoardNode[] = [];
  const intent = params.draft.layoutIntent;
  if (intent && INTENT_DISPATCH[intent]) {
    // Intent with no matched asset but wants one: degrade to a non-visual intent.
    const needsVisual = intent === "hero" || intent === "showcase" || intent === "split_2_1";
    if (needsVisual && !params.matchedAssetId) {
      const degraded: ProjectLayoutIntent =
        intent === "hero"
          ? "narrative"
          : intent === "showcase"
            ? "grid_2x2"
            : "grid_3";
      INTENT_DISPATCH[degraded](nodes, factory, params);
      return nodes;
    }
    INTENT_DISPATCH[intent](nodes, factory, params);
    return nodes;
  }
  if (params.pageType === "项目定位 / 背景页" || params.pageType === "项目定位 / 背景") {
    layoutCover(nodes, factory, params);
    return nodes;
  }
  if (params.pageType === "业务背景 / 问题背景" || params.pageType === "问题与目标") {
    layoutBackground(nodes, factory, params);
    return nodes;
  }
  if (params.pageType === "全局结构优化") {
    layoutGlobalStructure(nodes, factory, params);
    return nodes;
  }
  if (params.pageType === "用户 / 流程 / 关键洞察") {
    layoutInsight(nodes, factory, params);
    return nodes;
  }
  if (
    params.pageType === "设计目标 / 设计策略" ||
    params.pageType === "流程 / 任务链优化页" ||
    params.pageType === "before / after 或流程优化"
  ) {
    layoutStrategy(nodes, factory, params);
    return nodes;
  }
  if (
    params.pageType === "关键模块优化" ||
    params.pageType === "核心方案 / 关键界面" ||
    params.pageType === "关键视觉或关键界面"
  ) {
    layoutModule(nodes, factory, params);
    return nodes;
  }
  if (params.pageType === "结果 / 价值证明" || params.pageType === "结果 / 简短总结") {
    layoutResult(nodes, factory, params);
    return nodes;
  }
  layoutReflection(nodes, factory, params);
  return nodes;
}
