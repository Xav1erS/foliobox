import { createHash } from "node:crypto";
import {
  PROJECT_BOARD_HEIGHT,
  PROJECT_BOARD_WIDTH,
  boardHasPlaceholderNodes,
  isPrototypeBoard,
  type ProjectBoard,
  type ProjectBoardNode,
  type ProjectBoardTextNode,
  type ProjectBoardValidation,
  type ProjectBoardValidationStatus,
  type ProjectEditorScene,
  type ProjectLayoutValidation,
  type ProjectPageType,
  type ProjectSceneSeedAsset,
  type ProjectValidationCause,
  type ProjectValidationVerdict,
} from "./project-editor-scene";

type ValidationSource =
  | "prototype_generation"
  | "layout_generation"
  | "manual_edit"
  | "export_check";

type ValidationSeverity = "warn" | "block";
type ValidationKind = "structural" | "material" | "content";

type ValidationIssue = {
  boardId: string;
  severity: ValidationSeverity;
  kind: ValidationKind;
  message: string;
};

type SlotRule = {
  minShapes?: number;
  minImages?: number;
  minNodes?: number;
  minRoleCounts?: Partial<Record<ProjectBoardTextNode["role"], number>>;
  preferImage?: boolean;
};

type ValidationRule = {
  family: string;
  prototype: SlotRule;
  generated: SlotRule;
};

const PAGE_RULES: Record<string, ValidationRule> = {
  cover: {
    family: "cover",
    prototype: {
      minNodes: 10,
      minShapes: 4,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1, metric: 3 },
    },
    generated: {
      minNodes: 6,
      minShapes: 3,
      minRoleCounts: { caption: 1, title: 1, body: 1 },
      preferImage: true,
    },
  },
  background: {
    family: "background",
    prototype: {
      minNodes: 7,
      minShapes: 3,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1 },
    },
    generated: {
      minNodes: 6,
      minShapes: 3,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1 },
      preferImage: true,
    },
  },
  insight: {
    family: "insight",
    prototype: {
      minNodes: 7,
      minShapes: 5,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1 },
    },
    generated: {
      minNodes: 5,
      minShapes: 2,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1 },
    },
  },
  strategy: {
    family: "strategy",
    prototype: {
      minNodes: 9,
      minShapes: 5,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1 },
    },
    generated: {
      minNodes: 6,
      minShapes: 3,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1 },
      preferImage: true,
    },
  },
  module: {
    family: "module",
    prototype: {
      minNodes: 6,
      minShapes: 3,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1 },
    },
    generated: {
      minNodes: 6,
      minShapes: 3,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1 },
      preferImage: true,
    },
  },
  result: {
    family: "result",
    prototype: {
      minNodes: 10,
      minShapes: 4,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1, metric: 3 },
    },
    generated: {
      minNodes: 8,
      minShapes: 4,
      minRoleCounts: { caption: 1, title: 1, body: 1, metric: 3 },
      preferImage: true,
    },
  },
  reflection: {
    family: "reflection",
    prototype: {
      minNodes: 6,
      minShapes: 2,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1 },
    },
    generated: {
      minNodes: 5,
      minShapes: 2,
      minRoleCounts: { caption: 1, title: 1, body: 1, note: 1 },
    },
  },
  manual: {
    family: "manual",
    prototype: {
      minNodes: 1,
      minRoleCounts: { title: 1 },
    },
    generated: {
      minNodes: 2,
      minRoleCounts: { title: 1, body: 1 },
    },
  },
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashScene(scene: ProjectEditorScene) {
  return createHash("sha256").update(stableStringify(scene)).digest("hex");
}

function getBoardValidationRank(status: ProjectBoardValidationStatus) {
  if (status === "block") return 2;
  if (status === "warn") return 1;
  return 0;
}

function getProjectValidationRank(validation: ProjectLayoutValidation | null | undefined) {
  if (!validation) return 0;
  if (validation.projectState === "not_ready") return 2;
  if (validation.projectState === "pass_with_notes") return 1;
  return 0;
}

function getPageRule(pageType: ProjectPageType | null | undefined) {
  if (
    pageType === "项目定位 / 背景页" ||
    pageType === "项目定位 / 背景" ||
    pageType === "作品定位 / 题材说明"
  ) {
    return PAGE_RULES.cover;
  }
  if (
    pageType === "业务背景 / 问题背景" ||
    pageType === "问题与目标"
  ) {
    return PAGE_RULES.background;
  }
  if (
    pageType === "用户 / 流程 / 关键洞察" ||
    pageType === "全局结构优化"
  ) {
    return PAGE_RULES.insight;
  }
  if (
    pageType === "设计目标 / 设计策略" ||
    pageType === "流程 / 任务链优化页"
  ) {
    return PAGE_RULES.strategy;
  }
  if (
    pageType === "关键模块优化" ||
    pageType === "核心方案 / 关键界面" ||
    pageType === "关键视觉或关键界面" ||
    pageType === "before / after 或流程优化"
  ) {
    return PAGE_RULES.module;
  }
  if (
    pageType === "结果 / 价值证明" ||
    pageType === "结果 / 简短总结"
  ) {
    return PAGE_RULES.result;
  }
  if (
    pageType === "总结 / 反思" ||
    pageType === "简短说明 / 角色说明"
  ) {
    return PAGE_RULES.reflection;
  }
  return PAGE_RULES.manual;
}

function getBoardBounds(node: ProjectBoardNode) {
  return {
    left: node.x,
    top: node.y,
    right: node.x + Math.max(node.width, 0),
    bottom: node.y + Math.max(node.height, 0),
  };
}

function isNodeInsideFrame(node: ProjectBoardNode) {
  const bounds = getBoardBounds(node);
  return (
    node.width > 0 &&
    node.height > 0 &&
    bounds.left >= 0 &&
    bounds.top >= 0 &&
    bounds.right <= PROJECT_BOARD_WIDTH &&
    bounds.bottom <= PROJECT_BOARD_HEIGHT
  );
}

function countRole(board: ProjectBoard, role: ProjectBoardTextNode["role"]) {
  return board.nodes.filter((node) => node.type === "text" && node.role === role).length;
}

function countShapes(board: ProjectBoard) {
  return board.nodes.filter((node) => node.type === "shape").length;
}

function countImages(board: ProjectBoard) {
  return board.nodes.filter((node) => node.type === "image").length;
}

function boardHasAnyContent(board: ProjectBoard) {
  return board.nodes.some((node) => node.type === "image" || node.type === "text");
}

const PROTOTYPE_PLACEHOLDER_COPY_PATTERNS = [
  /待补充/i,
  /待补图/i,
  /待生成/i,
  /已匹配设计图/i,
  /缺少合适配图/i,
  /先用文案与结构卡成立/i,
  /建议优先使用/i,
  /建议素材/i,
  /优先围绕/i,
  /主视觉未就绪/i,
] as const;

function normalizeValidationCopy(text: string | null | undefined) {
  return (text ?? "").trim().replace(/\s+/g, " ");
}

function isPrototypePlaceholderCopy(text: string | null | undefined) {
  const normalized = normalizeValidationCopy(text);
  if (!normalized) return true;
  return PROTOTYPE_PLACEHOLDER_COPY_PATTERNS.some((pattern) => pattern.test(normalized));
}

function getPrototypeContentIssues(board: ProjectBoard) {
  const issues: ValidationIssue[] = [];
  const contentTextNodes = board.nodes.filter(
    (node): node is ProjectBoardTextNode =>
      node.type === "text" && node.role !== "caption"
  );
  const meaningfulTextCount = contentTextNodes.filter((node) => {
    const normalized = normalizeValidationCopy(node.text);
    if (isPrototypePlaceholderCopy(normalized)) return false;
    if (node.role === "title") return normalized.length >= 2;
    return normalized.length >= 4;
  }).length;
  const unresolvedInfoCount = contentTextNodes.filter(
    (node) => node.role === "metric" && isPrototypePlaceholderCopy(node.text)
  ).length;
  const unresolvedVisualHint = contentTextNodes.some(
    (node) =>
      (node.role === "note" || node.role === "body") &&
      /(待补图|建议素材|缺少合适配图|已匹配设计图)/i.test(normalizeValidationCopy(node.text))
  );

  if (meaningfulTextCount < 3) {
    issues.push({
      boardId: board.id,
      severity: "block",
      kind: "content",
      message: "当前内容稿还没讲清楚，先补齐标题、说明和页面要点。",
    });
    return issues;
  }

  if (unresolvedInfoCount >= 2) {
    issues.push({
      boardId: board.id,
      severity: "warn",
      kind: "content",
      message: "当前内容稿仍有关键要点待补充，建议先补内容再排版。",
    });
  }

  if (countImages(board) === 0 && unresolvedVisualHint) {
    issues.push({
      boardId: board.id,
      severity: "warn",
      kind: "material",
      message: "这页还缺少可用配图，建议补图后再精修。",
    });
  }

  return issues;
}

function getPrototypeCoverIssues(board: ProjectBoard) {
  if (
    board.pageType !== "项目定位 / 背景页" &&
    board.pageType !== "项目定位 / 背景"
  ) {
    return [] as ValidationIssue[];
  }

  const titleNode = board.nodes.find(
    (node): node is ProjectBoardTextNode => node.type === "text" && node.role === "title"
  );
  const heroNode = board.nodes.find(
    (node): node is ProjectBoardNode => node.type === "image"
  );
  if (!titleNode || !heroNode) {
    return [] as ValidationIssue[];
  }

  const titleBottom = titleNode.y + titleNode.height;
  if (heroNode.y < titleBottom + 40) {
    return [
      {
        boardId: board.id,
        severity: "block" as const,
        kind: "structural" as const,
        message: "封面主视觉压住了标题区，当前开场页还未成立。",
      },
    ];
  }

  return [] as ValidationIssue[];
}

function getPrototypeBlueprintSignature(board: ProjectBoard) {
  const shapeSignature = board.nodes
    .filter((node) => node.type === "shape")
    .map(
      (node) =>
        `${Math.round(node.x / 40)}:${Math.round(node.y / 40)}:${Math.round(node.width / 40)}:${Math.round(node.height / 40)}`
    )
    .sort()
    .join("|");

  return [
    getPageRule(board.pageType).family,
    countShapes(board),
    countRole(board, "title"),
    countRole(board, "body"),
    countRole(board, "note"),
    countRole(board, "metric"),
    shapeSignature,
  ].join("::");
}

function getForegroundOverlapWarnings(board: ProjectBoard) {
  const foregroundNodes = board.nodes.filter(
    (node) =>
      node.type === "image" ||
      (node.type === "text" &&
        (node.role === "title" ||
          node.role === "body" ||
          node.role === "note" ||
          node.role === "metric"))
  );
  const warnings: ValidationIssue[] = [];

  for (let index = 0; index < foregroundNodes.length; index += 1) {
    for (let cursor = index + 1; cursor < foregroundNodes.length; cursor += 1) {
      const first = getBoardBounds(foregroundNodes[index]);
      const second = getBoardBounds(foregroundNodes[cursor]);
      const overlapWidth = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
      const overlapHeight = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
      if (overlapWidth <= 0 || overlapHeight <= 0) continue;

      const overlapArea = overlapWidth * overlapHeight;
      const firstArea =
        Math.max(1, (first.right - first.left) * (first.bottom - first.top));
      const secondArea =
        Math.max(1, (second.right - second.left) * (second.bottom - second.top));
      const overlapRatio = overlapArea / Math.min(firstArea, secondArea);
      if (overlapRatio < 0.24) continue;

      warnings.push({
        boardId: board.id,
        severity: "warn",
        kind: "structural",
        message: "前景内容出现明显重叠，建议调整图文关系。",
      });
      return warnings;
    }
  }

  return warnings;
}

function pushRuleIssues(
  board: ProjectBoard,
  rule: SlotRule,
  kind: ValidationKind,
  issues: ValidationIssue[],
  options: { allowMissingImageWarning?: boolean; softRuleSeverity?: boolean } = {}
) {
  // 内容稿（prototype）阶段允许这些"块数 / 角色数 / 形状数不达标"作 warn，
  // 让用户在画布上继续修。生成稿（generated）保持 block 严格。
  const softSeverity: ValidationSeverity = options.softRuleSeverity ? "warn" : "block";
  if (typeof rule.minNodes === "number" && board.nodes.length < rule.minNodes) {
    issues.push({
      boardId: board.id,
      severity: softSeverity,
      kind,
      message: "画板内容块过少，当前结构不完整。",
    });
  }
  if (typeof rule.minShapes === "number" && countShapes(board) < rule.minShapes) {
    issues.push({
      boardId: board.id,
      severity: softSeverity,
      kind,
      message: "画板骨架缺少必要区块，当前结构不完整。",
    });
  }
  if (typeof rule.minImages === "number" && countImages(board) < rule.minImages) {
    issues.push({
      boardId: board.id,
      severity: options.allowMissingImageWarning ? "warn" : "block",
      kind: options.allowMissingImageWarning ? "material" : kind,
      message: options.allowMissingImageWarning
        ? "这页缺少可用主视觉素材，建议补充图片后再精修。"
        : "这页缺少必要图像内容。",
    });
  }

  Object.entries(rule.minRoleCounts ?? {}).forEach(([role, expected]) => {
    if (!expected) return;
    if (countRole(board, role as ProjectBoardTextNode["role"]) >= expected) return;

    const isMetric = role === "metric";
    issues.push({
      boardId: board.id,
      severity: softSeverity,
      kind,
      message: isMetric
        ? "这页缺少必要的结果证据区块。"
        : "这页缺少必要的标题或说明区块。",
    });
  });
}

function getPrototypeBoardIssues(board: ProjectBoard) {
  const issues: ValidationIssue[] = [];
  const rule = getPageRule(board.pageType).prototype;

  if (!board.pageType) {
    issues.push({
      boardId: board.id,
      severity: "block",
      kind: "structural",
      message: "内容稿画板缺少页型标记。",
    });
  }
  if (!isPrototypeBoard(board)) {
    issues.push({
      boardId: board.id,
      severity: "block",
      kind: "structural",
      message: "内容稿画板缺少占位节点，无法继续生成排版。",
    });
  }
  if (!board.nodes.some((node) => node.placeholder)) {
    issues.push({
      boardId: board.id,
      severity: "block",
      kind: "structural",
      message: "内容稿画板缺少占位标记。",
    });
  }
  if (board.nodes.some((node) => node.placeholder && !isNodeInsideFrame(node))) {
    issues.push({
      boardId: board.id,
      severity: "block",
      kind: "structural",
      message: "内容稿画板存在越界占位节点。",
    });
  }

  pushRuleIssues(board, rule, "structural", issues, { softRuleSeverity: true });
  issues.push(...getPrototypeCoverIssues(board));
  issues.push(...getPrototypeContentIssues(board));

  return issues;
}

function getGeneratedBoardIssues(board: ProjectBoard, assets: ProjectSceneSeedAsset[]) {
  const issues: ValidationIssue[] = [];
  const rule = getPageRule(board.pageType).generated;
  if (boardHasPlaceholderNodes(board)) {
    issues.push({
      boardId: board.id,
      severity: "block",
      kind: "structural",
      message: "高保真画板仍残留占位节点。",
    });
  }
  if (!boardHasAnyContent(board)) {
    issues.push({
      boardId: board.id,
      severity: "block",
      kind: "structural",
      message: "画板没有可读内容，当前结果不可用。",
    });
  }
  if (board.nodes.some((node) => !isNodeInsideFrame(node))) {
    issues.push({
      boardId: board.id,
      severity: "block",
      kind: "structural",
      message: "画板存在越界元素。",
    });
  }

  pushRuleIssues(board, rule, "structural", issues);

  if (rule.preferImage && countImages(board) === 0) {
    issues.push({
      boardId: board.id,
      severity: "warn",
      kind: "material",
      message: "这页缺少可用图片素材，建议补充主视觉后再优化。",
    });
  }

  issues.push(...getForegroundOverlapWarnings(board));
  return issues;
}

function getPreviousBoardStatus(
  previousValidation: ProjectLayoutValidation | null | undefined,
  boardId: string
) {
  return previousValidation?.boards.find((board) => board.boardId === boardId)?.status ?? "pass";
}

function getBoardCause(params: {
  source: ValidationSource;
  previousValidation?: ProjectLayoutValidation | null;
  boardId: string;
  issues: ValidationIssue[];
}) {
  const { source, previousValidation, boardId, issues } = params;
  if (issues.length === 0) return null;
  const hasStructuralIssue = issues.some((issue) => issue.kind === "structural");
  const hasMaterialIssue = issues.some((issue) => issue.kind === "material");
  const hasContentIssue = issues.some((issue) => issue.kind === "content");

  if (!hasStructuralIssue && !hasContentIssue && hasMaterialIssue) {
    return "missing_user_material" as const;
  }
  if (source === "manual_edit") {
    const previousStatus = getPreviousBoardStatus(previousValidation, boardId);
    const currentStatus = issues.some((issue) => issue.severity === "block")
      ? "block"
      : "warn";
    if (getBoardValidationRank(currentStatus) > getBoardValidationRank(previousStatus)) {
      return "user_modified_regression" as const;
    }
    return null;
  }
  if (source === "prototype_generation" || source === "layout_generation") {
    if (hasStructuralIssue) {
      return "system_generation_failed" as const;
    }
    return null;
  }
  if (hasMaterialIssue) {
    return "missing_user_material" as const;
  }
  return null;
}

function buildBoardMessage(
  status: ProjectBoardValidationStatus,
  cause: ProjectValidationCause | null,
  issues: ValidationIssue[]
) {
  if (cause === "system_generation_failed") {
    return issues[0]?.message ?? "系统生成未完成，已回退";
  }
  if (cause === "missing_user_material") return "需要补充信息";
  if (cause === "user_modified_regression") return "你修改后需调整";
  if (status === "block") return issues[0]?.message ?? "当前画板未达标";
  if (status === "warn") return issues[0]?.message ?? "这页仍有细节建议继续补充";
  return "已通过";
}

function buildSceneLevelIssues(scene: ProjectEditorScene) {
  const prototypeBoards = scene.boards.filter((board) => isPrototypeBoard(board));
  if (prototypeBoards.length <= 1) return [];

  const familyByBoardId = new Map(
    prototypeBoards.map((board) => [board.id, getPageRule(board.pageType).family])
  );
  const distinctFamilies = new Set(Array.from(familyByBoardId.values()));
  if (distinctFamilies.size <= 1) return [];

  const uniqueSignatures = new Set(prototypeBoards.map(getPrototypeBlueprintSignature));
  if (uniqueSignatures.size >= distinctFamilies.size) return [];

  return [
    {
      boardId: prototypeBoards[0]?.id ?? scene.activeBoardId,
      severity: "block" as const,
      kind: "structural" as const,
      message: "不同页型的内容稿骨架过于相似，当前低保真区分度不足。",
    },
  ];
}

function buildProjectSummary(params: {
  scene: ProjectEditorScene;
  projectState: ProjectLayoutValidation["projectState"];
  projectCause: ProjectValidationCause | null;
  boardResults: ProjectBoardValidation[];
}) {
  const { scene, projectState, projectCause, boardResults } = params;
  const warnCount = boardResults.filter((board) => board.status === "warn").length;
  const blockCount = boardResults.filter((board) => board.status === "block").length;
  const hasPrototypeBoards = scene.boards.some((board) => isPrototypeBoard(board));

  if (projectCause === "system_generation_failed") {
    return "本次生成未完成，已保留原内容。";
  }
  if (hasPrototypeBoards) {
    if (projectState === "pass") return "当前内容稿已讲清主线，可以继续生成排版。";
    if (projectCause === "missing_user_material" || projectState === "pass_with_notes") {
      return warnCount > 0
        ? `当前内容稿基本成立，但仍有 ${warnCount} 张画板建议补充图文。`
        : "当前内容稿基本成立，但仍建议补充图文信息。";
    }
    if (projectCause === "user_modified_regression") {
      return "当前有内容稿在你修改后未达标，建议先调整。";
    }
    return blockCount > 0
      ? `当前有 ${blockCount} 张内容稿还没讲清楚，建议先补内容再继续。`
      : "当前内容稿仍需补内容。";
  }

  if (projectState === "pass") {
    return "当前项目已达到可进入作品集的基础质量线。";
  }
  if (projectCause === "missing_user_material" || projectState === "pass_with_notes") {
    return "当前项目可进入作品集，但建议先补充素材或信息。";
  }
  if (projectCause === "user_modified_regression") {
    return "当前有画板在你修改后未达标，暂不建议导出。";
  }
  return "当前仍有未达标画板，暂不建议进入作品集。";
}

function buildProjectVerdict(
  scene: ProjectEditorScene,
  projectState: ProjectLayoutValidation["projectState"]
): ProjectValidationVerdict | null {
  if (scene.boards.some((board) => isPrototypeBoard(board))) {
    return null;
  }
  if (projectState === "pass") return "可进入作品集";
  if (projectState === "pass_with_notes") return "可进入，但建议先补充";
  if (projectState === "not_ready") return "暂不建议进入作品集";
  return null;
}

export function validateProjectEditorScene(params: {
  scene: ProjectEditorScene;
  assets: ProjectSceneSeedAsset[];
  source: ValidationSource;
  previousScene?: ProjectEditorScene | null;
  previousValidation?: ProjectLayoutValidation | null;
}) {
  const { scene, assets, source, previousScene, previousValidation } = params;
  const boardIssues = new Map<string, ValidationIssue[]>();

  scene.boards.forEach((board) => {
    const issues = isPrototypeBoard(board)
      ? getPrototypeBoardIssues(board)
      : getGeneratedBoardIssues(board, assets);
    boardIssues.set(board.id, issues);
  });

  buildSceneLevelIssues(scene).forEach((issue) => {
    const issues = boardIssues.get(issue.boardId) ?? [];
    issues.push(issue);
    boardIssues.set(issue.boardId, issues);
  });

  if (source === "layout_generation" && previousScene) {
    scene.boards.forEach((board) => {
      const previousBoard =
        previousScene.boards.find((item) => item.id === board.id) ?? null;
      if (!previousBoard) return;
      const preservedNodeIds = previousBoard.nodes
        .filter((node) => !node.placeholder)
        .map((node) => node.id);
      const nextNodeIds = new Set(board.nodes.map((node) => node.id));
      const droppedManualNode = preservedNodeIds.some((id) => !nextNodeIds.has(id));
      if (!droppedManualNode) return;
      const issues = boardIssues.get(board.id) ?? [];
      issues.push({
        boardId: board.id,
        severity: "block",
        kind: "structural",
        message: "系统覆盖了用户手工编辑内容。",
      });
      boardIssues.set(board.id, issues);
    });
  }

  const boardResults: ProjectBoardValidation[] = scene.boardOrder
    .map((boardId) => scene.boards.find((board) => board.id === boardId) ?? null)
    .filter((board): board is ProjectBoard => board !== null)
    .map((board) => {
      const issues = boardIssues.get(board.id) ?? [];
      const status: ProjectBoardValidationStatus = issues.some((issue) => issue.severity === "block")
        ? "block"
        : issues.some((issue) => issue.severity === "warn")
          ? "warn"
          : "pass";
      const cause = getBoardCause({
        source,
        previousValidation,
        boardId: board.id,
        issues,
      });

      return {
        boardId: board.id,
        phase: board.phase ?? (isPrototypeBoard(board) ? "prototype" : null),
        status,
        cause,
        message: buildBoardMessage(status, cause, issues),
      };
    });

  const projectState: ProjectLayoutValidation["projectState"] = boardResults.some(
    (board) => board.status === "block"
  )
    ? "not_ready"
    : boardResults.some((board) => board.status === "warn")
      ? "pass_with_notes"
      : boardResults.length > 0
        ? "pass"
        : "unknown";

  const causes = boardResults
    .map((board) => board.cause)
    .filter((cause): cause is ProjectValidationCause => Boolean(cause));
  const projectCause =
    causes.includes("system_generation_failed")
      ? "system_generation_failed"
      : causes.includes("user_modified_regression")
      ? "user_modified_regression"
      : causes.includes("missing_user_material")
        ? "missing_user_material"
        : null;

  return {
    projectState,
    projectVerdict: buildProjectVerdict(scene, projectState),
    cause: projectCause,
    summary: buildProjectSummary({
      scene,
      projectState,
      projectCause,
      boardResults,
    }),
    updatedAt: new Date().toISOString(),
    sceneHash: hashScene(scene),
    boards: boardResults,
  } satisfies ProjectLayoutValidation;
}

export function stampProjectValidationFailure(params: {
  scene: ProjectEditorScene;
  validation: ProjectLayoutValidation | null | undefined;
  summary: string;
}) {
  const { scene, validation, summary } = params;
  return {
    ...(validation ?? {
      projectState: "unknown" as const,
      projectVerdict: null,
      boards: [],
    }),
    cause: "system_generation_failed" as const,
    summary,
    updatedAt: new Date().toISOString(),
    sceneHash: hashScene(scene),
  } satisfies ProjectLayoutValidation;
}

export function getProjectExportBlockReason(params: {
  scene: ProjectEditorScene;
  validation: ProjectLayoutValidation | null | undefined;
}) {
  const { scene, validation } = params;
  if (scene.boards.some((board) => isPrototypeBoard(board))) {
    return "当前仍有内容稿画板，请先完成生成排版后再导出 Figma。";
  }
  if (validation?.projectState === "not_ready") {
    return validation.summary || "当前项目仍有未达标画板，暂不建议导出。";
  }
  return null;
}

export function getBoardValidationResult(
  validation: ProjectLayoutValidation | null | undefined,
  boardId: string
) {
  return validation?.boards.find((board) => board.boardId === boardId) ?? null;
}

export function getProjectValidationRankValue(validation: ProjectLayoutValidation | null | undefined) {
  return getProjectValidationRank(validation);
}
