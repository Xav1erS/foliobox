import { describe, expect, it } from "vitest";
import {
  createEmptyProjectEditorScene,
  hasGeneratedLayoutData,
  mergeProjectAssetMeta,
  mergeProjectLayoutDocument,
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
              status: "empty",
              frame: {
                width: PROJECT_BOARD_WIDTH,
                height: PROJECT_BOARD_HEIGHT,
                background: "#17191d",
              },
              thumbnailAssetId: null,
              nodes: [],
              aiMarkers: { hasAnalysis: false, hasPendingSuggestion: false },
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
    const scene = resolveProjectEditorScene(
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
