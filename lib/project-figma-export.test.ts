import { describe, expect, it } from "vitest";
import {
  createProjectBoard,
  createProjectImageNode,
  createProjectShapeNode,
  createProjectTextNode,
  normalizeProjectEditorScene,
} from "@/lib/project-editor-scene";
import { buildProjectFigmaExportPayload } from "@/lib/project-figma-export";

describe("project figma export", () => {
  it("exports ordered boards and deduplicated used assets only", async () => {
    const boardA = createProjectBoard({
      id: "board-a",
      name: "A",
      nodes: [
        createProjectTextNode({ text: "标题", role: "title" }),
        createProjectImageNode("asset-hero"),
      ],
    });
    const boardB = createProjectBoard({
      id: "board-b",
      name: "B",
      nodes: [
        createProjectImageNode("asset-hero", { id: "image-2", x: 40 }),
        createProjectImageNode("asset-detail", { id: "image-3", x: 80 }),
      ],
    });
    const scene = normalizeProjectEditorScene({
      version: 1,
      activeBoardId: "board-a",
      boardOrder: ["board-b", "board-a"],
      boards: [boardA, boardB],
      generationScope: { mode: "all", boardIds: ["board-a", "board-b"] },
      viewport: { zoom: 1, panX: 0, panY: 0 },
    });

    const payload = await buildProjectFigmaExportPayload({
      projectId: "project-1",
      projectName: "Demo",
      scene,
      assets: [
        { id: "asset-hero", imageUrl: "hero.png", title: "主图" },
        { id: "asset-detail", imageUrl: "detail.png", title: "细节图" },
        { id: "asset-unused", imageUrl: "unused.png", title: "未使用" },
      ],
      resolveImageData: async (asset) => ({
        mimeType: "image/png",
        dataUrl: `data:image/png;base64,${asset.id}`,
      }),
    });

    expect(payload.boards.map((board) => board.id)).toEqual(["board-b", "board-a"]);
    expect(payload.images.map((image) => image.assetId)).toEqual(["asset-hero", "asset-detail"]);
    expect(payload.images.some((image) => image.assetId === "asset-unused")).toBe(false);
  });

  it("serializes shape fills and text color opacity", async () => {
    const board = createProjectBoard({
      id: "board-a",
      name: "Visual",
      nodes: [
        createProjectTextNode({
          id: "text-1",
          text: "正文",
          role: "body",
          color: "rgba(255, 0, 0, 0.4)",
        }),
        createProjectShapeNode("rect", {
          id: "shape-1",
          fill: "#101010",
          gradient: {
            angle: 135,
            stops: [
              { offset: 0, color: "#111111" },
              { offset: 1, color: "rgba(255, 255, 255, 0.2)" },
            ],
          },
          stroke: "#ff0000",
          strokeWidth: 6,
        }),
      ],
    });
    const scene = normalizeProjectEditorScene({
      version: 1,
      activeBoardId: "board-a",
      boardOrder: ["board-a"],
      boards: [board],
      generationScope: { mode: "all", boardIds: ["board-a"] },
      viewport: { zoom: 1, panX: 0, panY: 0 },
    });

    const payload = await buildProjectFigmaExportPayload({
      projectId: "project-1",
      projectName: "Demo",
      scene,
      assets: [],
      resolveImageData: async () => null,
    });

    const [textNode, shapeNode] = payload.boards[0].nodes;
    expect(textNode.type).toBe("text");
    if (textNode.type !== "text") {
      throw new Error("expected text node");
    }
    expect(textNode.color).toMatchObject({ r: 1, g: 0, b: 0, a: 0.4 });
    expect(textNode.opacity).toBe(0.4);

    expect(shapeNode.type).toBe("shape");
    if (shapeNode.type !== "shape") {
      throw new Error("expected shape node");
    }
    expect(shapeNode.fill?.kind).toBe("linear-gradient");
    expect(shapeNode.stroke).toMatchObject({
      weight: 6,
      color: { r: 1, g: 0, b: 0, a: 1 },
    });
  });

  it("records warnings when an image cannot be resolved", async () => {
    const board = createProjectBoard({
      id: "board-a",
      name: "A",
      nodes: [createProjectImageNode("asset-missing")],
    });
    const scene = normalizeProjectEditorScene({
      version: 1,
      activeBoardId: "board-a",
      boardOrder: ["board-a"],
      boards: [board],
      generationScope: { mode: "all", boardIds: ["board-a"] },
      viewport: { zoom: 1, panX: 0, panY: 0 },
    });

    const payload = await buildProjectFigmaExportPayload({
      projectId: "project-1",
      projectName: "Demo",
      scene,
      assets: [{ id: "asset-missing", imageUrl: "missing.png", title: "缺失素材" }],
      resolveImageData: async () => null,
    });

    expect(payload.images).toEqual([]);
    expect(payload.warnings).toHaveLength(1);
    expect(payload.warnings[0]).toContain("缺失素材");
  });
});
