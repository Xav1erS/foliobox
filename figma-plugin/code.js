figma.showUI(__html__, {
  width: 420,
  height: 520,
  title: "FolioBox Figma Import",
});

const FALLBACK_FONT = { family: "Inter", style: "Regular" };
const FONT_STYLE_CANDIDATES = [
  ["Black", "Extra Bold", "Bold", "Semi Bold", "Medium", "Regular"],
  ["Extra Bold", "Bold", "Semi Bold", "Medium", "Regular"],
  ["Bold", "Semi Bold", "Semibold", "Medium", "Regular"],
  ["Semi Bold", "Semibold", "Bold", "Medium", "Regular"],
  ["Medium", "Regular"],
  ["Regular", "Book", "Roman"],
];

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function pickFontStyles(weight) {
  if (weight >= 900) return FONT_STYLE_CANDIDATES[0];
  if (weight >= 800) return FONT_STYLE_CANDIDATES[1];
  if (weight >= 700) return FONT_STYLE_CANDIDATES[2];
  if (weight >= 600) return FONT_STYLE_CANDIDATES[3];
  if (weight >= 500) return FONT_STYLE_CANDIDATES[4];
  return FONT_STYLE_CANDIDATES[5];
}

async function loadFontSafe(family, weight) {
  const styles = pickFontStyles(weight);
  for (const style of styles) {
    try {
      const fontName = { family, style };
      await figma.loadFontAsync(fontName);
      return fontName;
    } catch {
      // try next candidate
    }
  }

  await figma.loadFontAsync(FALLBACK_FONT);
  return FALLBACK_FONT;
}

function toSolidPaint(color) {
  return {
    type: "SOLID",
    color: {
      r: clamp01(color.r),
      g: clamp01(color.g),
      b: clamp01(color.b),
    },
    opacity: clamp01(color.a),
  };
}

function matrixMultiply3x3(a, b) {
  const result = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      result[row][col] =
        a[row][0] * b[0][col] +
        a[row][1] * b[1][col] +
        a[row][2] * b[2][col];
    }
  }

  return result;
}

function invert3x3(matrix) {
  const [[a, b, c], [d, e, f], [g, h, i]] = matrix;
  const determinant =
    a * (e * i - f * h) -
    b * (d * i - f * g) +
    c * (d * h - e * g);

  if (Math.abs(determinant) < 1e-8) {
    throw new Error("invalid_gradient_transform");
  }

  const invDet = 1 / determinant;
  return [
    [
      (e * i - f * h) * invDet,
      (c * h - b * i) * invDet,
      (b * f - c * e) * invDet,
    ],
    [
      (f * g - d * i) * invDet,
      (a * i - c * g) * invDet,
      (c * d - a * f) * invDet,
    ],
    [
      (d * h - e * g) * invDet,
      (b * g - a * h) * invDet,
      (a * e - b * d) * invDet,
    ],
  ];
}

function gradientHandlesFromAngle(angle) {
  const radians = (angle * Math.PI) / 180;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);
  const start = {
    x: 0.5 - dx * 0.5,
    y: 0.5 - dy * 0.5,
  };
  const end = {
    x: 0.5 + dx * 0.5,
    y: 0.5 + dy * 0.5,
  };
  const widthHandle = {
    x: start.x - dy * 0.5,
    y: start.y + dx * 0.5,
  };

  return [start, end, widthHandle];
}

function convertGradientHandlesToTransform(gradientHandlePositions) {
  const destination = [
    [
      gradientHandlePositions[0].x,
      gradientHandlePositions[1].x,
      gradientHandlePositions[2].x,
    ],
    [
      gradientHandlePositions[0].y,
      gradientHandlePositions[1].y,
      gradientHandlePositions[2].y,
    ],
    [1, 1, 1],
  ];
  const identityHandles = [
    [0, 1, 0],
    [0.5, 0.5, 1],
    [1, 1, 1],
  ];
  const matrix = matrixMultiply3x3(identityHandles, invert3x3(destination));
  return [matrix[0], matrix[1]];
}

function toGradientPaint(fill) {
  const handles = gradientHandlesFromAngle(fill.angle);
  return {
    type: "GRADIENT_LINEAR",
    gradientStops: fill.stops.map((stop) => ({
      position: clamp01(stop.offset),
      color: {
        r: clamp01(stop.color.r),
        g: clamp01(stop.color.g),
        b: clamp01(stop.color.b),
        a: clamp01(stop.color.a),
      },
    })),
    gradientTransform: convertGradientHandlesToTransform(handles),
  };
}

function toFillPaint(fill) {
  if (!fill) return [];
  if (fill.kind === "solid") {
    return [toSolidPaint(fill.color)];
  }

  try {
    return [toGradientPaint(fill)];
  } catch {
    return [toSolidPaint(fill.fallbackColor)];
  }
}

function colorToStroke(color) {
  return {
    type: "SOLID",
    color: {
      r: clamp01(color.r),
      g: clamp01(color.g),
      b: clamp01(color.b),
    },
    opacity: clamp01(color.a),
  };
}

function base64ToUint8Array(base64) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = base64.replace(/[^A-Za-z0-9+/=]/g, "");
  let bufferLength = (clean.length * 3) / 4;
  if (clean.endsWith("==")) bufferLength -= 2;
  else if (clean.endsWith("=")) bufferLength -= 1;

  const bytes = new Uint8Array(bufferLength);
  let byteIndex = 0;

  for (let index = 0; index < clean.length; index += 4) {
    const encoded1 = chars.indexOf(clean[index]);
    const encoded2 = chars.indexOf(clean[index + 1]);
    const encoded3 = chars.indexOf(clean[index + 2]);
    const encoded4 = chars.indexOf(clean[index + 3]);

    const chunk =
      (encoded1 << 18) |
      (encoded2 << 12) |
      ((encoded3 & 63) << 6) |
      (encoded4 & 63);

    bytes[byteIndex] = (chunk >> 16) & 255;
    byteIndex += 1;

    if (clean[index + 2] !== "=") {
      bytes[byteIndex] = (chunk >> 8) & 255;
      byteIndex += 1;
    }

    if (clean[index + 3] !== "=") {
      bytes[byteIndex] = chunk & 255;
      byteIndex += 1;
    }
  }

  return bytes;
}

function imageDataUrlToBytes(dataUrl) {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    throw new Error("invalid_image_data");
  }

  return base64ToUint8Array(dataUrl.slice(commaIndex + 1));
}

function createImagePaint(dataUrl, fit) {
  const bytes = imageDataUrlToBytes(dataUrl);
  const image = figma.createImage(bytes);
  return {
    type: "IMAGE",
    imageHash: image.hash,
    scaleMode: fit === "fill" ? "FILL" : "FIT",
  };
}

function createMissingImagePlaceholder(node) {
  const placeholder = figma.createRectangle();
  placeholder.name = `${node.name} (missing)`;
  placeholder.x = node.x;
  placeholder.y = node.y;
  placeholder.resize(node.width, node.height);
  placeholder.fills = [
    {
      type: "SOLID",
      color: { r: 0.93, g: 0.93, b: 0.93 },
    },
  ];
  placeholder.strokes = [
    {
      type: "SOLID",
      color: { r: 0.72, g: 0.72, b: 0.72 },
      opacity: 0.9,
    },
  ];
  placeholder.strokeWeight = 1;
  return placeholder;
}

async function createTextLayer(node) {
  const textNode = figma.createText();
  const fontName = await loadFontSafe(node.fontFamily, node.fontWeight);
  textNode.fontName = fontName;
  textNode.characters = node.text;
  textNode.name = node.name;
  textNode.fontSize = node.fontSize;
  textNode.lineHeight = {
    unit: "PERCENT",
    value: Math.max(1, node.lineHeight * 100),
  };
  textNode.textAlignHorizontal =
    node.align === "center"
      ? "CENTER"
      : node.align === "right"
        ? "RIGHT"
        : "LEFT";
  textNode.textAlignVertical = "TOP";
  textNode.fills = [toSolidPaint(node.color)];
  textNode.x = node.x;
  textNode.y = node.y;
  textNode.textAutoResize = "NONE";
  textNode.resize(node.width, node.height);
  return textNode;
}

function createShapeLayer(node) {
  let shapeNode;

  if (node.shape === "circle") {
    shapeNode = figma.createEllipse();
    shapeNode.resize(node.width, node.height);
  } else if (node.shape === "triangle") {
    shapeNode = figma.createPolygon();
    shapeNode.pointCount = 3;
    shapeNode.resize(node.width, node.height);
  } else if (node.shape === "line") {
    shapeNode = figma.createLine();
    shapeNode.resize(node.width, 0);
    shapeNode.strokes = [
      node.stroke ? colorToStroke(node.stroke.color) : colorToStroke({ r: 0, g: 0, b: 0, a: 1 }),
    ];
    shapeNode.strokeWeight = node.stroke?.weight || Math.max(1, node.height || 2);
  } else {
    shapeNode = figma.createRectangle();
    shapeNode.resize(node.width, node.height);
    if ("cornerRadius" in shapeNode) {
      shapeNode.cornerRadius = node.rx || 0;
    }
  }

  shapeNode.name = node.name;
  shapeNode.x = node.x;
  shapeNode.y = node.y;
  shapeNode.opacity = clamp01(node.opacity);

  if (node.shape !== "line") {
    shapeNode.fills = toFillPaint(node.fill);
    if (node.stroke) {
      shapeNode.strokes = [colorToStroke(node.stroke.color)];
      shapeNode.strokeWeight = node.stroke.weight;
    } else {
      shapeNode.strokes = [];
    }
  }

  return shapeNode;
}

function createImageLayer(node, imageMap) {
  const imageAsset = imageMap.get(node.assetId);
  if (!imageAsset?.dataUrl) {
    return createMissingImagePlaceholder(node);
  }

  const rect = figma.createRectangle();
  rect.name = node.name;
  rect.x = node.x;
  rect.y = node.y;
  rect.resize(node.width, node.height);
  rect.fills = [createImagePaint(imageAsset.dataUrl, node.fit)];
  return rect;
}

async function createNodeLayer(node, imageMap) {
  if (node.type === "text") {
    return createTextLayer(node);
  }

  if (node.type === "image") {
    return createImageLayer(node, imageMap);
  }

  return createShapeLayer(node);
}

async function importPayload(payload) {
  if (!payload || payload.kind !== "project-figma-export") {
    throw new Error("invalid_payload");
  }

  const frames = [];
  const imageMap = new Map((payload.images || []).map((image) => [image.assetId, image]));
  const boardWidth = payload.boards[0]?.width || 1920;
  const boardHeight = payload.boards[0]?.height || 1080;
  const gapX = 160;
  const gapY = 160;
  const columns = payload.boards.length > 1 ? 2 : 1;

  for (let index = 0; index < payload.boards.length; index += 1) {
    const board = payload.boards[index];
    const frame = figma.createFrame();
    frame.name = board.name;
    frame.resize(board.width, board.height);
    frame.x = (index % columns) * (boardWidth + gapX);
    frame.y = Math.floor(index / columns) * (boardHeight + gapY);
    frame.clipsContent = true;
    frame.fills = [toSolidPaint(board.background)];

    for (const node of board.nodes) {
      const layer = await createNodeLayer(node, imageMap);
      frame.appendChild(layer);
    }

    figma.currentPage.appendChild(frame);
    frames.push(frame);
  }

  if (frames.length > 0) {
    figma.currentPage.selection = frames;
    figma.viewport.scrollAndZoomIntoView(frames);
  }

  return {
    frameCount: frames.length,
    warningCount: Array.isArray(payload.warnings) ? payload.warnings.length : 0,
  };
}

figma.ui.onmessage = async (message) => {
  if (message?.type !== "import-payload") return;

  try {
    const result = await importPayload(message.payload);
    figma.notify(
      `已导入 ${result.frameCount} 个画板${result.warningCount > 0 ? `，另有 ${result.warningCount} 条提示` : ""}`
    );
    figma.ui.postMessage({
      type: "import-success",
      frameCount: result.frameCount,
      warningCount: result.warningCount,
    });
  } catch (error) {
    const messageText =
      error instanceof Error && error.message === "invalid_payload"
        ? "这不是有效的 FolioBox Figma 导出文件。"
        : error instanceof Error
          ? error.message
          : "导入失败，请检查 JSON 文件格式。";
    figma.notify(messageText, { error: true });
    figma.ui.postMessage({
      type: "import-error",
      message: messageText,
    });
  }
};
