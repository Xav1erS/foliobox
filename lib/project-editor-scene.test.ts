import { describe, expect, it } from "vitest";
import {
  applyGeneratedLayoutToScene,
  buildProjectSceneFromStructureSuggestion,
  createProjectTextNode,
  createEmptyProjectEditorScene,
  getSceneBoardGroupRuns,
  hasGeneratedLayoutData,
  isPrototypeBoard,
  mergeProjectAssetMeta,
  mergeProjectLayoutDocument,
  normalizeProjectEditorScene,
  PROJECT_BOARD_HEIGHT,
  PROJECT_BOARD_WIDTH,
  resolveProjectEditorScene,
  summarizeProjectSceneForAI,
} from "./project-editor-scene";
import { resolveStyleProfile } from "./style-reference-presets";

describe("project editor scene", () => {
  it("creates a 1920x1080 starter board", () => {
    const scene = createEmptyProjectEditorScene("测试项目");
    expect(scene.boards).toHaveLength(1);
    expect(scene.boards[0].frame).toEqual({
      width: PROJECT_BOARD_WIDTH,
      height: PROJECT_BOARD_HEIGHT,
      background: "#ffffff",
    });
    expect(scene.boards[0].name).toBe("Start");
  });

  it("migrates legacy empty dark boards to white", () => {
    const scene = resolveProjectEditorScene(
      {
        editorScene: {
          version: 1,
          activeBoardId: "board-1",
          boardOrder: ["board-1"],
          boards: [
            {
              id: "board-1",
              name: "Start",
              intent: "",
              frame: {
                width: PROJECT_BOARD_WIDTH,
                height: PROJECT_BOARD_HEIGHT,
                background: "#17191d",
              },
              thumbnailAssetId: null,
              nodes: [],
            },
          ],
          generationScope: { mode: "current", boardIds: ["board-1"] },
          viewport: { zoom: 1, panX: 0, panY: 0 },
        },
      },
      { assets: [], projectName: "案例 A" }
    );

    expect(scene.boards[0].frame.background).toBe("#ffffff");
  });

  it("does not treat scene-only layout as generated output", () => {
    const layout = mergeProjectLayoutDocument(null, {
      editorScene: createEmptyProjectEditorScene(),
    });

    expect(hasGeneratedLayoutData(layout)).toBe(false);
  });

  it("preserves generated layout fields when patching editorScene", () => {
    const scene = createEmptyProjectEditorScene();
    const layout = mergeProjectLayoutDocument(
      {
        packageMode: "LIGHT",
        totalPages: 3,
        narrativeSummary: "summary",
        pages: [],
        qualityNotes: ["note"],
      },
      { editorScene: scene }
    );

    expect(layout.packageMode).toBe("LIGHT");
    expect(layout.totalPages).toBe(3);
    expect(layout.editorScene?.activeBoardId).toBe(scene.activeBoardId);
  });

  it("preserves structure suggestion when patching editorScene", () => {
    const scene = createEmptyProjectEditorScene();
    const layout = mergeProjectLayoutDocument(
      {
        structureSuggestion: {
          generatedAt: "2026-04-11T00:00:00.000Z",
          summary: "先讲背景，再讲方案分组。",
          narrativeArc: "背景 -> 洞察 -> 方案 -> 结果",
          status: "confirmed",
          confirmedAt: "2026-04-11T00:05:00.000Z",
          groups: [
            {
              id: "group-overview",
              label: "项目概览",
              rationale: "先建立项目边界。",
              narrativeRole: "开场",
              sections: [
                {
                  id: "section-cover",
                  title: "项目封面",
                  purpose: "一句话说明项目是什么。",
                  recommendedContent: ["项目名称", "角色", "时间"],
                  suggestedAssets: ["封面图"],
                },
              ],
            },
          ],
        },
      },
      { editorScene: scene }
    );

    expect(layout.editorScene?.activeBoardId).toBe(scene.activeBoardId);
    expect(layout.structureSuggestion?.groups[0]?.label).toBe("项目概览");
    expect(layout.structureSuggestion?.status).toBe("confirmed");
    expect(layout.structureSuggestion?.confirmedAt).toBe("2026-04-11T00:05:00.000Z");
  });

  it("preserves material recognition when patching editorScene", () => {
    const scene = createEmptyProjectEditorScene();
    const layout = mergeProjectLayoutDocument(
      {
        materialRecognition: {
          generatedAt: "2026-04-11T00:00:00.000Z",
          summary: "这批素材以结果页和中后台页面为主。",
          recognizedTypes: ["结果页", "中后台页面"],
          heroAssetIds: ["asset-1"],
          supportingAssetIds: ["asset-2"],
          decorativeAssetIds: [],
          riskyAssetIds: [],
          missingInfo: ["项目结果的量化指标"],
          suggestedNextStep: "先确认结构，再决定是否诊断。",
          recognizedAssetIds: ["asset-1", "asset-2"],
          lastIncrementalDiff: {
            generatedAt: "2026-04-11T00:05:00.000Z",
            newAssetIds: ["asset-2"],
            summary: "新增结果页让项目结果证据更清楚。",
            changes: ["可把结果分组讲得更完整。"],
            shouldRefreshStructure: true,
          },
        },
      },
      { editorScene: scene }
    );

    expect(layout.editorScene?.activeBoardId).toBe(scene.activeBoardId);
    expect(layout.materialRecognition?.heroAssetIds).toEqual(["asset-1"]);
    expect(layout.materialRecognition?.recognizedAssetIds).toEqual(["asset-1", "asset-2"]);
    expect(layout.materialRecognition?.lastIncrementalDiff?.shouldRefreshStructure).toBe(true);
  });

  it("builds boards from a confirmed structure suggestion", () => {
    const scene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "按概览、过程、结果来组织。",
        narrativeArc: "概览 -> 过程 -> 结果",
        status: "confirmed",
        confirmedAt: "2026-04-11T00:05:00.000Z",
        groups: [
          {
            id: "group-overview",
            label: "项目概览",
            rationale: "先建立项目边界。",
            narrativeRole: "开场",
            sections: [
              {
                id: "section-cover",
                title: "项目封面",
                purpose: "快速说明项目是什么。",
                recommendedContent: ["项目名称", "角色", "时间"],
                suggestedAssets: ["封面图"],
              },
            ],
          },
          {
            id: "group-process",
            label: "设计过程",
            rationale: "展开关键取舍。",
            narrativeRole: "主体",
            sections: [
              {
                id: "section-flow",
                title: "关键流程",
                purpose: "说明方案如何展开。",
                recommendedContent: ["流程图", "核心页面"],
                suggestedAssets: ["流程图"],
              },
            ],
          },
        ],
      },
      recognition: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "封面图和流程图都比较明确。",
        recognizedTypes: ["封面", "流程页"],
        heroAssetIds: ["asset-cover"],
        supportingAssetIds: ["asset-flow"],
        decorativeAssetIds: [],
        riskyAssetIds: [],
        missingInfo: [],
        suggestedNextStep: "确认结构并落板。",
        recognizedAssetIds: ["asset-cover", "asset-flow"],
        lastIncrementalDiff: null,
      },
      assets: [
        {
          id: "asset-cover",
          title: "封面图",
          selected: true,
          isCover: true,
          metaJson: { roleTag: "main" },
        },
        {
          id: "asset-flow",
          title: "流程图",
          selected: true,
          metaJson: { roleTag: "support" },
        },
      ],
      projectName: "案例 A",
    });

    expect(scene.boards).toHaveLength(2);
    expect(scene.boardOrder).toHaveLength(2);
    expect(scene.generationScope.mode).toBe("all");
    expect(scene.boards[0].name).toContain("项目概览");
    expect(scene.boards[0].phase).toBe("prototype");
    expect(scene.boards[0].pageType).toBe("项目定位 / 背景页");
    expect(isPrototypeBoard(scene.boards[0])).toBe(true);
    expect(scene.boards[0].structureSource).toMatchObject({
      groupId: "group-overview",
      groupLabel: "项目概览",
      sectionId: "section-cover",
      sectionTitle: "项目封面",
    });
    expect(scene.boards[0].nodes.some((node) => node.placeholder)).toBe(true);
    expect(scene.boards[0].nodes.some((node) => node.type === "shape")).toBe(true);
    expect(scene.boards[1].pageType).toBe("流程 / 任务链优化页");
  });

  it("groups ordered boards by structure source runs", () => {
    const scene = normalizeProjectEditorScene({
      version: 1,
      activeBoardId: "board-a",
      boardOrder: ["board-a", "board-b", "board-c", "board-d"],
      boards: [
        {
          ...createEmptyProjectEditorScene().boards[0],
          id: "board-a",
          name: "概览",
          structureSource: {
            groupId: "group-overview",
            groupLabel: "项目概览",
            groupIndex: 0,
            sectionId: "section-cover",
            sectionTitle: "封面",
            sectionIndex: 0,
          },
        },
        {
          ...createEmptyProjectEditorScene().boards[0],
          id: "board-b",
          name: "过程 1",
          structureSource: {
            groupId: "group-process",
            groupLabel: "设计过程",
            groupIndex: 1,
            sectionId: "section-flow",
            sectionTitle: "流程",
            sectionIndex: 0,
          },
        },
        {
          ...createEmptyProjectEditorScene().boards[0],
          id: "board-c",
          name: "过程 2",
          structureSource: {
            groupId: "group-process",
            groupLabel: "设计过程",
            groupIndex: 1,
            sectionId: "section-ui",
            sectionTitle: "界面",
            sectionIndex: 1,
          },
        },
        {
          ...createEmptyProjectEditorScene().boards[0],
          id: "board-d",
          name: "补充页",
          structureSource: null,
        },
      ],
      generationScope: { mode: "all", boardIds: ["board-a", "board-b", "board-c", "board-d"] },
      viewport: { zoom: 1, panX: 0, panY: 0 },
    });

    expect(getSceneBoardGroupRuns(scene)).toEqual([
      {
        key: "group:group-overview",
        label: "项目概览",
        structureGroupId: "group-overview",
        boards: [scene.boards.find((board) => board.id === "board-a")],
      },
      {
        key: "group:group-process",
        label: "设计过程",
        structureGroupId: "group-process",
        boards: [
          scene.boards.find((board) => board.id === "board-b"),
          scene.boards.find((board) => board.id === "board-c"),
        ],
      },
      {
        key: "manual:1",
        label: null,
        structureGroupId: null,
        boards: [scene.boards.find((board) => board.id === "board-d")],
      },
    ]);
  });

  it("seeds boards from generated layout pages", () => {
    const scene = resolveProjectEditorScene(
      {
        packageMode: "DEEP",
        totalPages: 2,
        narrativeSummary: "叙事",
        pages: [
          {
            pageNumber: 1,
            type: "项目定位 / 背景页",
            titleSuggestion: "项目封面",
            contentGuidance: "先讲清项目是什么",
            keyPoints: ["标题", "背景", "封面图"],
          },
          {
            pageNumber: 2,
            type: "关键模块优化",
            titleSuggestion: "关键过程",
            contentGuidance: "展开核心判断",
            keyPoints: ["过程", "取舍", "输出"],
          },
        ],
        qualityNotes: [],
      },
      {
        assets: [
          {
            id: "asset-1",
            title: "封面图",
            selected: true,
            isCover: true,
            metaJson: { note: "首页主视觉", roleTag: "main" },
          },
        ],
        projectName: "案例 A",
      }
    );

    expect(scene.boards).toHaveLength(2);
    expect(scene.boards[0].nodes.some((node) => node.type === "image")).toBe(true);
    expect(scene.boards[0].phase).toBe("generated");
    expect(scene.boards[0].pageType).toBe("项目定位 / 背景页");
    expect(scene.boardOrder).toEqual(scene.boards.map((board) => board.id));
  });

  it("summarizes text and asset notes for AI", () => {
    const baseScene = resolveProjectEditorScene(
      {
        packageMode: "LIGHT",
        totalPages: 1,
        narrativeSummary: "叙事",
        pages: [
          {
            pageNumber: 1,
            type: "项目定位 / 背景",
            titleSuggestion: "封面",
            contentGuidance: "说明项目背景",
            keyPoints: ["背景", "目标", "结果"],
          },
        ],
        qualityNotes: [],
      },
      {
        assets: [
          {
            id: "asset-1",
            title: "主图",
            selected: true,
            isCover: true,
            metaJson: { note: "最终结果图", roleTag: "main" },
          },
        ],
      }
    );
    const scene = normalizeProjectEditorScene({
      ...baseScene,
      boards: baseScene.boards.map((board) => ({
        ...board,
        structureSource: {
          groupId: "group-overview",
          groupLabel: "项目概览",
          groupIndex: 0,
          sectionId: "section-cover",
          sectionTitle: "封面",
          sectionIndex: 0,
        },
      })),
    });

    const summary = summarizeProjectSceneForAI({
      scene,
      assets: [
        {
          id: "asset-1",
          title: "主图",
          metaJson: { note: "最终结果图", roleTag: "main" },
        },
      ],
    });

    expect(summary).toContain("名称：封面");
    expect(summary).toContain("结构分组：项目概览");
    expect(summary).toContain("主图【main】：最终结果图");
  });

  it("replaces placeholder nodes during layout generation without dropping manual edits", () => {
    const prototypeScene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "按概览、模块、结果来组织。",
        narrativeArc: "概览 -> 模块 -> 结果",
        status: "confirmed",
        confirmedAt: "2026-04-11T00:05:00.000Z",
        groups: [
          {
            id: "group-overview",
            label: "项目概览",
            rationale: "先建立项目边界。",
            narrativeRole: "开场",
            sections: [
              {
                id: "section-cover",
                title: "项目封面",
                purpose: "先讲清这个项目是什么。",
                recommendedContent: ["项目名称", "角色", "目标"],
                suggestedAssets: ["封面图"],
              },
            ],
          },
          {
            id: "group-module",
            label: "关键模块",
            rationale: "展示最强方案。",
            narrativeRole: "主体",
            sections: [
              {
                id: "section-module",
                title: "模块优化",
                purpose: "展示关键界面和设计取舍。",
                recommendedContent: ["Before / After", "方案亮点"],
                suggestedAssets: ["模块图"],
              },
            ],
          },
        ],
      },
      assets: [
        {
          id: "asset-cover",
          title: "封面图",
          selected: true,
          isCover: true,
          metaJson: { roleTag: "main", note: "首页主视觉" },
        },
        {
          id: "asset-module",
          title: "模块图",
          selected: true,
          metaJson: { roleTag: "support", note: "关键模块截图" },
        },
      ],
      recognition: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "封面图和关键模块截图都比较明确。",
        recognizedTypes: ["封面", "关键界面"],
        heroAssetIds: ["asset-cover"],
        supportingAssetIds: ["asset-module"],
        decorativeAssetIds: [],
        riskyAssetIds: [],
        missingInfo: [],
        suggestedNextStep: "确认结构并落板。",
        recognizedAssetIds: ["asset-cover", "asset-module"],
        lastIncrementalDiff: null,
      },
      projectName: "案例 A",
    });
    const manualNote = createProjectTextNode({
      id: "manual-note",
      role: "note",
      text: "用户手动补充说明",
      x: 120,
      y: 930,
      width: 480,
      height: 48,
      fontSize: 20,
      placeholder: false,
    });
    const sceneWithManualNode = normalizeProjectEditorScene({
      ...prototypeScene,
      boards: prototypeScene.boards.map((board, index) =>
        index === 0 ? { ...board, nodes: [...board.nodes, manualNote] } : board
      ),
    });

    const nextScene = applyGeneratedLayoutToScene({
      scene: sceneWithManualNode,
      boardIds: sceneWithManualNode.boardOrder,
      layoutPages: [
        {
          boardId: sceneWithManualNode.boards[0].id,
          pageNumber: 1,
          type: "项目定位 / 背景页",
          titleSuggestion: "案例开场",
          contentGuidance: "说明项目定位与目标。",
          keyPoints: ["角色", "目标", "成果"],
        },
        {
          boardId: sceneWithManualNode.boards[1].id,
          pageNumber: 2,
          type: "关键模块优化",
          titleSuggestion: "关键模块",
          contentGuidance: "展开界面优化与设计取舍。",
          keyPoints: ["Before / After", "方案理由", "关键收益"],
        },
      ],
      assets: [
        {
          id: "asset-cover",
          title: "封面图",
          selected: true,
          isCover: true,
          metaJson: { roleTag: "main", note: "首页主视觉" },
        },
        {
          id: "asset-module",
          title: "模块图",
          selected: true,
          metaJson: { roleTag: "support", note: "关键模块截图" },
        },
      ],
      styleProfile: resolveStyleProfile({ source: "preset", presetKey: "clean-case" }),
      suggestion: sceneWithManualNode.boards[0].structureSource
        ? {
            generatedAt: "2026-04-11T00:00:00.000Z",
            summary: "按概览、模块、结果来组织。",
            narrativeArc: "概览 -> 模块 -> 结果",
            status: "confirmed",
            confirmedAt: "2026-04-11T00:05:00.000Z",
            groups: [
              {
                id: "group-overview",
                label: "项目概览",
                rationale: "先建立项目边界。",
                narrativeRole: "开场",
                sections: [
                  {
                    id: "section-cover",
                    title: "项目封面",
                    purpose: "先讲清这个项目是什么。",
                    recommendedContent: ["项目名称", "角色", "目标"],
                    suggestedAssets: ["封面图"],
                  },
                ],
              },
              {
                id: "group-module",
                label: "关键模块",
                rationale: "展示最强方案。",
                narrativeRole: "主体",
                sections: [
                  {
                    id: "section-module",
                    title: "模块优化",
                    purpose: "展示关键界面和设计取舍。",
                    recommendedContent: ["Before / After", "方案亮点"],
                    suggestedAssets: ["模块图"],
                  },
                ],
              },
            ],
          }
        : null,
      recognition: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "封面图和关键模块截图都比较明确。",
        recognizedTypes: ["封面", "关键界面"],
        heroAssetIds: ["asset-cover"],
        supportingAssetIds: ["asset-module"],
        decorativeAssetIds: [],
        riskyAssetIds: [],
        missingInfo: [],
        suggestedNextStep: "确认结构并落板。",
        recognizedAssetIds: ["asset-cover", "asset-module"],
        lastIncrementalDiff: null,
      },
    });

    expect(nextScene.boards.every((board) => board.phase === "generated")).toBe(true);
    expect(nextScene.boards.every((board) => board.nodes.every((node) => !node.placeholder))).toBe(
      true
    );
    expect(nextScene.boards[0].nodes.find((node) => node.id === "manual-note")).toMatchObject({
      id: "manual-note",
      text: "用户手动补充说明",
      placeholder: false,
    });
    expect(nextScene.boards[0].nodes.some((node) => node.type === "image")).toBe(true);
  });

  it("merges asset note and roleTag without dropping existing values", () => {
    expect(
      mergeProjectAssetMeta(
        { note: "原备注", roleTag: "support", extra: true },
        { note: "新备注" }
      )
    ).toEqual({
      note: "新备注",
      roleTag: "support",
    });
  });
});
