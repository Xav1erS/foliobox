import { describe, expect, it } from "vitest";
import {
  applyGeneratedLayoutToScene,
  buildProjectSceneFromStructureSuggestion,
  createProjectTextNode,
  normalizeProjectEditorScene,
  type ProjectEditorScene,
  type ProjectMaterialRecognition,
  type ProjectSceneSeedAsset,
  type ProjectStructureSuggestion,
} from "./project-editor-scene";
import {
  getProjectExportBlockReason,
  validateProjectEditorScene,
} from "./project-editor-validation";
import { resolveStyleProfile } from "./style-reference-presets";

const CORE_SUGGESTION: ProjectStructureSuggestion = {
  generatedAt: "2026-04-21T00:00:00.000Z",
  summary: "按封面、背景、洞察、模块、结果、反思来组织。",
  narrativeArc: "项目定位 -> 背景问题 -> 用户洞察 -> 核心方案 -> 结果证明 -> 总结反思",
  status: "confirmed",
  confirmedAt: "2026-04-21T00:05:00.000Z",
  groups: [
    {
      id: "group-cover",
      label: "项目定位",
      rationale: "先交代项目边界。",
      narrativeRole: "开场",
      sections: [
        {
          id: "section-cover",
          title: "项目封面",
          purpose: "说明项目背景、角色与目标。",
          recommendedContent: ["项目定位", "角色", "目标"],
          suggestedAssets: ["封面图"],
        },
      ],
    },
    {
      id: "group-background",
      label: "问题背景",
      rationale: "交代业务问题。",
      narrativeRole: "承接",
      sections: [
        {
          id: "section-background",
          title: "业务背景",
          purpose: "说明业务背景、痛点和问题。",
          recommendedContent: ["业务背景", "核心问题", "约束"],
          suggestedAssets: ["背景图"],
        },
      ],
    },
    {
      id: "group-insight",
      label: "用户洞察",
      rationale: "展示研究和关键发现。",
      narrativeRole: "主体",
      sections: [
        {
          id: "section-insight",
          title: "关键洞察",
          purpose: "说明用户、流程与关键洞察。",
          recommendedContent: ["用户洞察", "流程图", "关键发现"],
          suggestedAssets: ["流程图"],
        },
      ],
    },
    {
      id: "group-module",
      label: "核心方案",
      rationale: "展示关键模块。",
      narrativeRole: "主体",
      sections: [
        {
          id: "section-module",
          title: "关键模块",
          purpose: "说明关键模块优化和界面变化。",
          recommendedContent: ["Before / After", "方案亮点", "关键界面"],
          suggestedAssets: ["模块图"],
        },
      ],
    },
    {
      id: "group-result",
      label: "结果证明",
      rationale: "给出成果和证据。",
      narrativeRole: "收束",
      sections: [
        {
          id: "section-result",
          title: "成果证明",
          purpose: "说明结果、指标和价值证明。",
          recommendedContent: ["核心指标", "业务反馈", "结果图"],
          suggestedAssets: ["结果图"],
        },
      ],
    },
    {
      id: "group-reflect",
      label: "总结反思",
      rationale: "收束项目主线。",
      narrativeRole: "结尾",
      sections: [
        {
          id: "section-reflect",
          title: "总结反思",
          purpose: "说明反思、经验和下一步。",
          recommendedContent: ["反思", "经验", "下一步"],
          suggestedAssets: ["补充图"],
        },
      ],
    },
  ],
};

const CORE_RECOGNITION: ProjectMaterialRecognition = {
  generatedAt: "2026-04-21T00:00:00.000Z",
  summary: "封面、流程、模块、结果素材比较完整。",
  recognizedTypes: ["封面", "流程", "关键界面", "结果"],
  heroAssetIds: ["asset-cover", "asset-module", "asset-result"],
  supportingAssetIds: ["asset-flow", "asset-bg", "asset-extra"],
  decorativeAssetIds: [],
  riskyAssetIds: [],
  missingInfo: [],
  suggestedNextStep: "确认结构并创建画板。",
  recognizedAssetIds: [
    "asset-cover",
    "asset-bg",
    "asset-flow",
    "asset-module",
    "asset-result",
    "asset-extra",
  ],
  lastIncrementalDiff: null,
};

const CORE_ASSETS: ProjectSceneSeedAsset[] = [
  { id: "asset-cover", title: "封面图", selected: true, isCover: true, metaJson: { roleTag: "main" } },
  { id: "asset-bg", title: "背景图", selected: true, metaJson: { roleTag: "support" } },
  { id: "asset-flow", title: "流程图", selected: true, metaJson: { roleTag: "support" } },
  { id: "asset-module", title: "模块图", selected: true, metaJson: { roleTag: "main" } },
  { id: "asset-result", title: "结果图", selected: true, metaJson: { roleTag: "main" } },
  { id: "asset-extra", title: "补充图", selected: true, metaJson: { roleTag: "support" } },
];

function createPrototypeScene(assets: ProjectSceneSeedAsset[] = CORE_ASSETS) {
  return buildProjectSceneFromStructureSuggestion({
    suggestion: CORE_SUGGESTION,
    assets,
    recognition: CORE_RECOGNITION,
    projectName: "案例 A",
  });
}

function createGeneratedScene(options?: {
  assets?: ProjectSceneSeedAsset[];
  scene?: ProjectEditorScene;
}) {
  const assets = options?.assets ?? CORE_ASSETS;
  const prototypeScene = options?.scene ?? createPrototypeScene(assets);
  const generatedScene = applyGeneratedLayoutToScene({
    scene: prototypeScene,
    boardIds: prototypeScene.boardOrder,
    layoutPages: prototypeScene.boards.map((board, index) => ({
      boardId: board.id,
      pageNumber: index + 1,
      type: board.pageType ?? "关键模块优化",
      titleSuggestion: board.name,
      contentGuidance: `${board.name} 的高保真排版。`,
      keyPoints: board.contentSuggestions.slice(0, 3),
    })),
    assets,
    styleProfile: resolveStyleProfile({ source: "preset", presetKey: "clean-case" }),
    suggestion: CORE_SUGGESTION,
    recognition: CORE_RECOGNITION,
  });

  return { prototypeScene, generatedScene };
}

describe("project editor validation", () => {
  it("accepts prototype scenes for six core page families", () => {
    const scene = createPrototypeScene();
    const validation = validateProjectEditorScene({
      scene,
      assets: CORE_ASSETS,
      source: "prototype_generation",
    });

    expect(validation.projectState).toBe("pass");
    expect(validation.projectVerdict).toBeNull();
    expect(validation.boards).toHaveLength(6);
    expect(validation.boards.every((board) => board.status === "pass")).toBe(true);
  });

  it("blocks prototype scenes when most copy is still placeholder text", () => {
    const scene = createPrototypeScene();
    const brokenScene = normalizeProjectEditorScene({
      ...scene,
      boards: scene.boards.map((board, index) =>
        index === 0
          ? {
              ...board,
              nodes: board.nodes.map((node) => {
                if (node.type !== "text" || node.role === "caption") return node;
                if (node.role === "title") {
                  return { ...node, text: "项目定位待补充" };
                }
                if (node.role === "metric") {
                  return { ...node, text: "角色待生成" };
                }
                return { ...node, text: "待补充" };
              }),
            }
          : board
      ),
    });
    const validation = validateProjectEditorScene({
      scene: brokenScene,
      assets: CORE_ASSETS,
      source: "prototype_generation",
    });

    expect(validation.projectState).toBe("not_ready");
    expect(validation.summary).toContain("补内容");
    expect(validation.boards[0]?.status).toBe("block");
    expect(validation.boards[0]?.message).toContain("讲清楚");
  });

  it("marks prototype scenes with unresolved key points as notes instead of pass", () => {
    const scene = createPrototypeScene();
    const warnedScene = normalizeProjectEditorScene({
      ...scene,
      boards: scene.boards.map((board, index) => {
        if (index !== 0) return board;
        let unresolvedMetricCount = 0;
        return {
          ...board,
          nodes: board.nodes.map((node) => {
            if (node.type !== "text" || node.role !== "metric" || unresolvedMetricCount >= 2) {
              return node;
            }
            unresolvedMetricCount += 1;
            return { ...node, text: "角色待生成" };
          }),
        };
      }),
    });
    const validation = validateProjectEditorScene({
      scene: warnedScene,
      assets: CORE_ASSETS,
      source: "prototype_generation",
    });

    expect(validation.projectState).toBe("pass_with_notes");
    expect(validation.boards[0]?.status).toBe("warn");
    expect(validation.boards[0]?.message).toContain("关键要点待补充");
  });

  it("blocks cover drafts whose hero visual overlaps the title area", () => {
    const scene = createPrototypeScene();
    const brokenScene = normalizeProjectEditorScene({
      ...scene,
      boards: scene.boards.map((board, index) =>
        index === 0
          ? {
              ...board,
              nodes: board.nodes.map((node) =>
                node.type === "image" ? { ...node, y: 140 } : node
              ),
            }
          : board
      ),
    });
    const validation = validateProjectEditorScene({
      scene: brokenScene,
      assets: CORE_ASSETS,
      source: "prototype_generation",
    });

    expect(validation.projectState).toBe("not_ready");
    expect(validation.boards[0]?.status).toBe("block");
    expect(validation.boards[0]?.message).toContain("标题区");
  });

  it("accepts generated scenes without leaving placeholder nodes", () => {
    const { prototypeScene, generatedScene } = createGeneratedScene();
    const validation = validateProjectEditorScene({
      scene: generatedScene,
      assets: CORE_ASSETS,
      source: "layout_generation",
      previousScene: prototypeScene,
    });

    expect(["pass", "pass_with_notes"]).toContain(validation.projectState);
    expect(validation.boards.every((board) => board.status !== "block")).toBe(true);
    expect(generatedScene.boards.every((board) => board.nodes.every((node) => !node.placeholder))).toBe(
      true
    );
  });

  it("marks missing materials as notes instead of system failure", () => {
    const assets: ProjectSceneSeedAsset[] = [];
    const { prototypeScene, generatedScene } = createGeneratedScene({ assets });
    const validation = validateProjectEditorScene({
      scene: generatedScene,
      assets,
      source: "layout_generation",
      previousScene: prototypeScene,
    });

    expect(validation.projectState).toBe("pass_with_notes");
    expect(validation.cause).toBe("missing_user_material");
    expect(validation.boards.some((board) => board.cause === "missing_user_material")).toBe(true);
  });

  it("detects system output that drops manual nodes during generation", () => {
    const prototypeScene = createPrototypeScene();
    const manualScene = normalizeProjectEditorScene({
      ...prototypeScene,
      boards: prototypeScene.boards.map((board, index) =>
        index === 0
          ? {
              ...board,
              nodes: [
                ...board.nodes,
                createProjectTextNode({
                  id: "manual-note",
                  role: "note",
                  text: "用户手工备注",
                  x: 1400,
                  y: 940,
                  width: 280,
                  height: 44,
                  fontSize: 22,
                  placeholder: false,
                }),
              ],
            }
          : board
      ),
    });
    const { generatedScene } = createGeneratedScene({ scene: manualScene });
    const brokenScene = normalizeProjectEditorScene({
      ...generatedScene,
      boards: generatedScene.boards.map((board, index) =>
        index === 0
          ? { ...board, nodes: board.nodes.filter((node) => node.id !== "manual-note") }
          : board
      ),
    });

    const validation = validateProjectEditorScene({
      scene: brokenScene,
      assets: CORE_ASSETS,
      source: "layout_generation",
      previousScene: manualScene,
    });

    expect(validation.projectState).toBe("not_ready");
    expect(validation.cause).toBe("system_generation_failed");
    expect(validation.boards[0]?.cause).toBe("system_generation_failed");
  });

  it("detects when manual edits regress a previously valid board", () => {
    const { prototypeScene, generatedScene } = createGeneratedScene();
    const previousValidation = validateProjectEditorScene({
      scene: generatedScene,
      assets: CORE_ASSETS,
      source: "layout_generation",
      previousScene: prototypeScene,
    });
    const brokenScene = normalizeProjectEditorScene({
      ...generatedScene,
      boards: generatedScene.boards.map((board, index) =>
        index === 0
          ? {
              ...board,
              nodes: board.nodes.filter(
                (node) => !(node.type === "text" && node.role === "title")
              ),
            }
          : board
      ),
    });
    const validation = validateProjectEditorScene({
      scene: brokenScene,
      assets: CORE_ASSETS,
      source: "manual_edit",
      previousScene: generatedScene,
      previousValidation,
    });

    expect(validation.projectState).toBe("not_ready");
    expect(validation.cause).toBe("user_modified_regression");
    expect(validation.boards[0]?.cause).toBe("user_modified_regression");
  });

  it("blocks export while prototype boards still exist", () => {
    const prototypeScene = createPrototypeScene();
    const prototypeValidation = validateProjectEditorScene({
      scene: prototypeScene,
      assets: CORE_ASSETS,
      source: "prototype_generation",
    });

    expect(
      getProjectExportBlockReason({
        scene: prototypeScene,
        validation: prototypeValidation,
      })
    ).toContain("内容稿画板");

    const { prototypeScene: previousScene, generatedScene } = createGeneratedScene();
    const generatedValidation = validateProjectEditorScene({
      scene: generatedScene,
      assets: CORE_ASSETS,
      source: "layout_generation",
      previousScene,
    });

    expect(
      getProjectExportBlockReason({
        scene: generatedScene,
        validation: generatedValidation,
      })
    ).toBeNull();
  });
});
