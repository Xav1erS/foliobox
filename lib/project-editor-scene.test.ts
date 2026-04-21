import { describe, expect, it } from "vitest";
import {
  buildProjectSceneFromStructureSuggestion,
  createEmptyProjectEditorScene,
  getSceneBoardGroupRuns,
  hasGeneratedLayoutData,
  mergeProjectAssetMeta,
  mergeProjectLayoutDocument,
  normalizeProjectEditorScene,
  PROJECT_BOARD_HEIGHT,
  PROJECT_BOARD_WIDTH,
  resolveProjectEditorScene,
  summarizeProjectSceneForAI,
} from "./project-editor-scene";

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
    expect(scene.boards[0].structureSource).toMatchObject({
      groupId: "group-overview",
      groupLabel: "项目概览",
      sectionId: "section-cover",
      sectionTitle: "项目封面",
    });
    expect(scene.boards[0].nodes.some((node) => node.type === "image")).toBe(true);
    expect(
      scene.boards[0].nodes.find((node) => node.type === "image")
    ).toMatchObject({
      type: "image",
      fit: "fit",
    });
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
            type: "cover",
            titleSuggestion: "项目封面",
            contentGuidance: "先讲清项目是什么",
            keyPoints: ["标题", "背景", "封面图"],
          },
          {
            pageNumber: 2,
            type: "process",
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
            type: "cover",
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
