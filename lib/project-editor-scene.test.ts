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

  it("does not collapse mid-project prototype boards into result pages when recommendations mention results", () => {
    const scene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-22T00:00:00.000Z",
        summary: "先讲问题，再讲场景、模型、界面验证和上线结果。",
        narrativeArc: "概览 -> 场景 -> 模型 -> 验证 -> 结果",
        status: "confirmed",
        confirmedAt: "2026-04-22T00:05:00.000Z",
        groups: [
          {
            id: "group-overview",
            label: "项目概览定位",
            rationale: "先交代项目边界。",
            narrativeRole: "建立读者对问题规模与设计目标的共同理解。",
            sections: [
              {
                id: "section-problem",
                title: "一句话定义问题",
                purpose: "说明做什么、为谁做、为什么难。",
                recommendedContent: ["业务目标", "最大挑战", "你的角色"],
                suggestedAssets: ["logo"],
              },
            ],
          },
          {
            id: "group-insight",
            label: "用户场景洞察",
            rationale: "把统一落到用户任务上。",
            narrativeRole: "把统一落到用户实际任务上，而不是只讲设计系统。",
            sections: [
              {
                id: "section-task-now",
                title: "即时完成任务",
                purpose: "定义大众消费者的动机与能力边界：不想学习、希望立刻得到可用结果。",
                recommendedContent: [
                  "用户来访原因：临时需求、低容错、希望快速得到结果",
                  "对失败的预期：需要即时反馈与可恢复路径",
                ],
                suggestedAssets: [],
              },
              {
                id: "section-task-types",
                title: "浏览器内任务类型",
                purpose: "把工具页按任务类型归类，作为后续统一框架适配依据。",
                recommendedContent: [
                  "指出统一框架要解决的共同点：字段结构、状态反馈、结果可复制",
                ],
                suggestedAssets: [],
              },
            ],
          },
          {
            id: "group-model",
            label: "核心任务模型",
            rationale: "给出可复用的任务抽象。",
            narrativeRole: "从洞察到策略的桥梁。",
            sections: [
              {
                id: "section-io",
                title: "输入处理输出可复制",
                purpose: "提出通用任务模型：输入、参数、转换/生成、结果与校验。",
                recommendedContent: [
                  "模型字段：输入区、参数区、处理/生成区、结果区、校验/反馈",
                ],
                suggestedAssets: [],
              },
              {
                id: "section-state",
                title: "动作到界面状态",
                purpose: "用流程讲清动作如何触发状态变化与错误处理。",
                recommendedContent: [
                  "状态层级：加载、成功、失败、空结果的呈现规则",
                ],
                suggestedAssets: [],
              },
            ],
          },
          {
            id: "group-ui",
            label: "关键界面验证",
            rationale: "把抽象模型落到具体页面。",
            narrativeRole: "证明统一性不是口号。",
            sections: [
              {
                id: "section-home",
                title: "首页发现与层级",
                purpose: "解释首页如何服务 C 端快速找到工具，并作为工具页布局基线。",
                recommendedContent: [
                  "与工具页统一的视觉与交互基线：减少学习成本",
                ],
                suggestedAssets: [],
              },
            ],
          },
          {
            id: "group-result",
            label: "上线结果与规范化",
            rationale: "完成叙事闭环。",
            narrativeRole: "从上线到迭代，再到可扩展的设计方法论。",
            sections: [
              {
                id: "section-launch",
                title: "Product Hunt",
                purpose: "说明上线后的首轮验证方式，并提炼你从反馈中要学习的设计点。",
                recommendedContent: ["反馈类型→设计改动"],
                suggestedAssets: [],
              },
              {
                id: "section-rules",
                title: "扩展到200+的规范",
                purpose: "把统一性变成可扩展的设计规范：模板化、组件化、命名与复用策略。",
                recommendedContent: ["模板/组件的复用方式", "命名与规则"],
                suggestedAssets: [],
              },
            ],
          },
        ],
      },
      assets: [],
      projectName: "测试项目 01",
    });

    expect(scene.boards.map((board) => board.pageType)).toEqual([
      "项目定位 / 背景页",
      "用户 / 流程 / 关键洞察",
      "用户 / 流程 / 关键洞察",
      "流程 / 任务链优化页",
      "流程 / 任务链优化页",
      "关键模块优化",
      "结果 / 价值证明",
      "全局结构优化",
    ]);
    expect(new Set(scene.boards.map((board) => board.pageType)).size).toBeGreaterThan(4);
    expect(
      scene.boards.every((board) =>
        board.nodes.every(
          (node) =>
            node.x >= 0 &&
            node.y >= 0 &&
            node.x + node.width <= PROJECT_BOARD_WIDTH &&
            node.y + node.height <= PROJECT_BOARD_HEIGHT
        )
      )
    ).toBe(true);
  });

  it("hydrates prototype boards with low-fi content drafts and matched assets", () => {
    const scene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-22T00:00:00.000Z",
        summary: "项目概览 -> 结果",
        narrativeArc: "概览 -> 结果",
        status: "confirmed",
        confirmedAt: "2026-04-22T00:05:00.000Z",
        groups: [
          {
            id: "group-overview",
            label: "项目概览定位",
            rationale: "先交代项目边界。",
            narrativeRole: "建立项目认知。",
            sections: [
              {
                id: "section-problem",
                title: "一句话定义问题",
                purpose: "说明做什么、为谁做、为什么难。",
                recommendedContent: ["业务目标", "最大挑战", "你的角色"],
                suggestedAssets: ["封面图"],
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
          metaJson: { roleTag: "main" },
        },
      ],
      contentDrafts: [
        {
          sectionId: "section-problem",
          title: "浏览器工具统一",
          summary: "这是一个面向大众用户的浏览器工具项目，重点解决快速完成任务与统一体验之间的矛盾。",
          narrative: "当前先用低保真内容稿把角色、目标与挑战讲清楚。",
          keyPoints: ["面向无需学习即可完成任务的人群", "统一 200+ 工具页的结构与反馈"],
          infoCards: [
            { label: "角色", value: "主导设计" },
            { label: "目标", value: "快速完成任务" },
            { label: "挑战", value: "统一 200+ 页" },
          ],
          visualBrief: "优先使用首页主视觉展示工具集合。",
          preferredAssetIds: ["asset-cover"],
          missingAssetNote: "",
        },
      ],
      projectName: "测试项目 01",
    });

    expect(scene.boards).toHaveLength(1);
    expect(scene.boards[0].intent).toContain("面向大众用户的浏览器工具项目");
    expect(scene.boards[0].contentSuggestions).toEqual(
      expect.arrayContaining(["面向无需学习即可完成任务的人群", "统一 200+ 工具页的结构与反馈"])
    );
    const imageNodes = scene.boards[0].nodes.filter((node) => node.type === "image");
    expect(imageNodes).toHaveLength(1);
    expect(imageNodes[0]).toMatchObject({
      assetId: "asset-cover",
      placeholder: true,
    });
    expect(
      scene.boards[0].nodes.some(
        (node) => node.type === "text" && node.role === "title" && node.text === "浏览器工具统一"
      )
    ).toBe(true);
  });

  it("uses a text-led cover draft template when no hero asset is available", () => {
    const baseSuggestion = {
      generatedAt: "2026-04-22T00:00:00.000Z",
      summary: "项目概览",
      narrativeArc: "概览",
      status: "confirmed" as const,
      confirmedAt: "2026-04-22T00:05:00.000Z",
      groups: [
        {
          id: "group-overview",
          label: "项目概览定位",
          rationale: "先交代项目边界。",
          narrativeRole: "建立项目认知。",
          sections: [
            {
              id: "section-cover",
              title: "一句话定义问题",
              purpose: "说明做什么、为谁做、为什么难。",
              recommendedContent: ["业务目标", "最大挑战", "你的角色"],
              suggestedAssets: ["封面图"],
            },
          ],
        },
      ],
    };

    const withImage = buildProjectSceneFromStructureSuggestion({
      suggestion: baseSuggestion,
      assets: [
        {
          id: "asset-cover",
          title: "封面图",
          selected: true,
          isCover: true,
          metaJson: { roleTag: "main" },
        },
      ],
      contentDrafts: [
        {
          sectionId: "section-cover",
          title: "浏览器工具统一",
          summary: "先交代项目边界、角色与目标。",
          narrative: "这是一个以统一 200+ 工具页为目标的项目。",
          keyPoints: ["减少学习成本", "统一信息结构", "快速完成任务"],
          infoCards: [
            { label: "角色", value: "主导设计" },
            { label: "目标", value: "统一体验" },
            { label: "挑战", value: "页面众多" },
          ],
          visualBrief: "优先使用首页主视觉作为开场。",
          preferredAssetIds: ["asset-cover"],
          missingAssetNote: "",
        },
      ],
      projectName: "测试项目 01",
    });
    const withoutImage = buildProjectSceneFromStructureSuggestion({
      suggestion: baseSuggestion,
      assets: [],
      contentDrafts: [
        {
          sectionId: "section-cover",
          title: "浏览器工具统一",
          summary: "先交代项目边界、角色与目标。",
          narrative: "这是一个以统一 200+ 工具页为目标的项目。",
          keyPoints: ["减少学习成本", "统一信息结构", "快速完成任务"],
          infoCards: [
            { label: "角色", value: "主导设计" },
            { label: "目标", value: "统一体验" },
            { label: "挑战", value: "页面众多" },
          ],
          visualBrief: "如果缺主视觉，先用内容卡建立开场页。",
          preferredAssetIds: [],
          missingAssetNote: "待补首页主视觉",
        },
      ],
      projectName: "测试项目 01",
    });

    expect(withImage.boards[0].nodes.some((node) => node.type === "image")).toBe(true);
    expect(withoutImage.boards[0].nodes.some((node) => node.type === "image")).toBe(false);
    const withoutImageShapeNodes = withoutImage.boards[0].nodes.filter((node) => node.type === "shape");
    const withImageShapeNodes = withImage.boards[0].nodes.filter((node) => node.type === "shape");
    expect(withoutImageShapeNodes.length).toBeGreaterThanOrEqual(5);
    expect(
      withoutImageShapeNodes.some((node) => node.width > 600 && node.height > 280)
    ).toBe(true);
    expect(
      withImageShapeNodes.some((node) => node.width >= 700 && node.height >= 420)
    ).toBe(true);
  });

  it("keeps cover visuals below the opening title area when a hero asset is matched", () => {
    const scene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-22T00:00:00.000Z",
        summary: "项目概览",
        narrativeArc: "概览",
        status: "confirmed",
        confirmedAt: "2026-04-22T00:05:00.000Z",
        groups: [
          {
            id: "group-overview",
            label: "项目概览定位",
            rationale: "先交代项目边界。",
            narrativeRole: "建立项目认知。",
            sections: [
              {
                id: "section-cover",
                title: "一句话定义问题",
                purpose: "说明做什么、为谁做、为什么难。",
                recommendedContent: ["业务目标", "最大挑战", "你的角色"],
                suggestedAssets: ["封面图"],
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
          metaJson: { roleTag: "main" },
        },
      ],
      contentDrafts: [
        {
          sectionId: "section-cover",
          title: "浏览器工具统一",
          summary: "先交代项目边界、角色与目标。",
          narrative: "这是一个以统一 200+ 工具页为目标的项目。",
          keyPoints: ["减少学习成本", "统一信息结构", "快速完成任务"],
          infoCards: [
            { label: "角色", value: "主导设计" },
            { label: "目标", value: "统一体验" },
            { label: "挑战", value: "页面众多" },
          ],
          visualBrief: "优先使用首页主视觉作为开场。",
          preferredAssetIds: ["asset-cover"],
          missingAssetNote: "",
        },
      ],
      projectName: "测试项目 01",
    });

    const titleNode = scene.boards[0].nodes.find(
      (node) => node.type === "text" && node.role === "title"
    );
    const imageNode = scene.boards[0].nodes.find((node) => node.type === "image");

    expect(titleNode).toBeDefined();
    expect(imageNode).toBeDefined();
    expect(imageNode?.y).toBeGreaterThanOrEqual((titleNode?.y ?? 0) + (titleNode?.height ?? 0) + 40);
  });

  it("does not let logo assets occupy the cover hero slot", () => {
    const scene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-23T00:00:00.000Z",
        summary: "项目概览",
        narrativeArc: "概览",
        status: "confirmed",
        confirmedAt: "2026-04-23T00:05:00.000Z",
        groups: [
          {
            id: "group-overview",
            label: "项目概览定位",
            rationale: "先建立项目认知。",
            narrativeRole: "开场。",
            sections: [
              {
                id: "section-cover",
                title: "一句话定义问题",
                purpose: "说明做什么、为谁做、为什么难。",
                recommendedContent: ["业务目标", "最大挑战", "你的角色"],
                suggestedAssets: ["logo", "首页截图"],
              },
            ],
          },
        ],
      },
      assets: [
        {
          id: "asset-logo",
          title: "产品 logo",
          selected: true,
          metaJson: { roleTag: "support", note: "品牌 logo" },
        },
        {
          id: "asset-cover",
          title: "首页截图",
          selected: true,
          isCover: true,
          metaJson: { roleTag: "main", note: "首页主视觉" },
        },
      ],
      contentDrafts: [
        {
          sectionId: "section-cover",
          title: "浏览器工具统一",
          summary: "先交代项目边界、角色与目标。",
          narrative: "这是一个以统一 200+ 工具页为目标的项目。",
          keyPoints: ["减少学习成本", "统一信息结构", "快速完成任务"],
          infoCards: [
            { label: "角色", value: "主导设计" },
            { label: "目标", value: "统一体验" },
            { label: "挑战", value: "页面众多" },
          ],
          visualBrief: "优先使用首页主视觉作为开场。",
          preferredAssetIds: ["asset-logo", "asset-cover"],
          missingAssetNote: "",
        },
      ],
      projectName: "测试项目 01",
    });

    const imageNode = scene.boards[0].nodes.find((node) => node.type === "image");
    expect(imageNode).toBeDefined();
    expect(imageNode?.assetId).toBe("asset-cover");
    expect(scene.boards[0].thumbnailAssetId).toBe("asset-cover");
  });

  it("trims overlong prototype copy so cover text stays inside its layout boxes", () => {
    const longTitle = "这是一个非常长非常长非常长的封面标题，用来验证低保真内容稿在标题区不会继续无限外溢";
    const longBody = Array.from({ length: 24 }, () => "这里是一段明显过长的说明文案，用来验证内容稿会先裁剪到盒子内。").join("");
    const scene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-23T00:00:00.000Z",
        summary: "项目概览",
        narrativeArc: "概览",
        status: "confirmed",
        confirmedAt: "2026-04-23T00:05:00.000Z",
        groups: [
          {
            id: "group-overview",
            label: "项目概览定位",
            rationale: "先建立项目认知。",
            narrativeRole: "开场。",
            sections: [
              {
                id: "section-cover",
                title: "一句话定义问题",
                purpose: "说明做什么、为谁做、为什么难。",
                recommendedContent: ["业务目标", "最大挑战", "你的角色"],
                suggestedAssets: [],
              },
            ],
          },
        ],
      },
      assets: [],
      contentDrafts: [
        {
          sectionId: "section-cover",
          title: longTitle,
          summary: longBody,
          narrative: longBody,
          keyPoints: ["减少学习成本", "统一信息结构", "快速完成任务"],
          infoCards: [
            { label: "角色", value: "主导设计" },
            { label: "目标", value: "统一体验" },
            { label: "挑战", value: "页面众多" },
          ],
          visualBrief: "如果缺主视觉，先用内容卡建立开场页。",
          preferredAssetIds: [],
          missingAssetNote: "待补首页主视觉",
        },
      ],
      projectName: "测试项目 01",
    });

    const titleNode = scene.boards[0].nodes.find(
      (node) => node.type === "text" && node.role === "title"
    );
    const bodyNode = scene.boards[0].nodes.find(
      (node) => node.type === "text" && node.role === "body"
    );

    expect(titleNode?.type === "text" ? titleNode.text.endsWith("…") : false).toBe(true);
    expect(bodyNode?.type === "text" ? bodyNode.text.endsWith("…") : false).toBe(true);
  });

  it("uses a flow-strip template for process drafts without matched images", () => {
    const scene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-22T00:00:00.000Z",
        summary: "流程优化",
        narrativeArc: "流程",
        status: "confirmed",
        confirmedAt: "2026-04-22T00:05:00.000Z",
        groups: [
          {
            id: "group-process",
            label: "核心任务模型",
            rationale: "把任务流程讲清楚。",
            narrativeRole: "流程展开。",
            sections: [
              {
                id: "section-flow",
                title: "动作到界面状态",
                purpose: "说明用户动作如何触发状态变化与错误恢复。",
                recommendedContent: ["输入", "参数", "生成", "结果"],
                suggestedAssets: [],
              },
            ],
          },
        ],
      },
      assets: [],
      contentDrafts: [
        {
          sectionId: "section-flow",
          title: "动作到界面状态",
          summary: "这一页用步骤链讲清任务从输入到结果的状态变化。",
          narrative: "缺图时先用步骤块和恢复逻辑让流程页成立。",
          keyPoints: ["输入内容", "设置参数", "生成结果", "错误恢复"],
          infoCards: [],
          visualBrief: "待补流程图",
          preferredAssetIds: [],
          missingAssetNote: "待补流程图",
        },
      ],
      projectName: "测试项目 01",
    });

    const shapeNodes = scene.boards[0].nodes.filter((node) => node.type === "shape");
    const wideSummaryBand = shapeNodes.find((node) => node.width >= 1600 && node.height >= 120);
    const topCards = shapeNodes.filter(
      (node) =>
        node.height >= 180 &&
        node.height <= 260 &&
        node.width >= 300 &&
        node.width <= 420
    );

    expect(wideSummaryBand).toBeDefined();
    expect(topCards.length).toBeGreaterThanOrEqual(4);
    expect(topCards.every((node) => node.y > (wideSummaryBand?.y ?? 0))).toBe(true);
  });

  it("uses an evidence-first result draft template even when a supporting image exists", () => {
    const scene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-22T00:00:00.000Z",
        summary: "结果验证",
        narrativeArc: "结果",
        status: "confirmed",
        confirmedAt: "2026-04-22T00:05:00.000Z",
        groups: [
          {
            id: "group-result",
            label: "上线结果与规范化",
            rationale: "收束结果证据。",
            narrativeRole: "结果闭环。",
            sections: [
              {
                id: "section-result",
                title: "Product Hunt",
                purpose: "说明上线后的首轮验证方式。",
                recommendedContent: ["上线结果", "反馈", "后续策略"],
                suggestedAssets: ["结果图"],
              },
            ],
          },
        ],
      },
      assets: [
        {
          id: "asset-result",
          title: "结果图",
          selected: true,
          isCover: false,
          metaJson: { roleTag: "support" },
        },
      ],
      contentDrafts: [
        {
          sectionId: "section-result",
          title: "上线首轮验证",
          summary: "先展示上线后的证据，再解释它们意味着什么。",
          narrative: "反馈与后续动作都已经有初步结论。",
          keyPoints: ["转化提升 18%", "反馈集中在复制效率", "验证信息架构有效"],
          infoCards: [
            { label: "结果", value: "转化 +18%" },
            { label: "反馈", value: "复制更快" },
            { label: "验证", value: "结构有效" },
          ],
          visualBrief: "结果图用于补充证据，不是主叙事。",
          preferredAssetIds: ["asset-result"],
          missingAssetNote: "",
        },
      ],
      projectName: "测试项目 01",
    });

    const shapeNodes = scene.boards[0].nodes.filter((node) => node.type === "shape");
    const evidencePanel = shapeNodes.find((node) => node.width >= 820 && node.height >= 260);
    const metricCards = shapeNodes.filter(
      (node) => node.width >= 240 && node.width <= 320 && node.height >= 160 && node.height <= 200
    );

    expect(evidencePanel).toBeDefined();
    expect(metricCards.length).toBeGreaterThanOrEqual(3);
    expect(metricCards.every((node) => node.y <= (evidencePanel?.y ?? 0))).toBe(true);
    expect(scene.boards[0].nodes.some((node) => node.type === "image")).toBe(false);
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

  it("selects the compare template for module pages when hero and support assets are both available", () => {
    const prototypeScene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "展示关键模块。",
        narrativeArc: "模块",
        status: "confirmed",
        confirmedAt: "2026-04-11T00:05:00.000Z",
        groups: [
          {
            id: "group-module",
            label: "关键模块",
            rationale: "展开主方案。",
            narrativeRole: "主体",
            sections: [
              {
                id: "section-module",
                title: "模块优化",
                purpose: "说明核心模块的前后变化和设计取舍。",
                recommendedContent: ["Before / After", "方案亮点", "取舍"],
                suggestedAssets: ["模块主图", "模块补图"],
              },
            ],
          },
        ],
      },
      assets: [
        {
          id: "asset-module-main",
          title: "模块主图",
          selected: true,
          metaJson: { roleTag: "main", note: "主界面" },
        },
        {
          id: "asset-module-support",
          title: "模块补图",
          selected: true,
          metaJson: { roleTag: "support", note: "对比界面" },
        },
      ],
      recognition: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "主界面和补充界面都明确。",
        recognizedTypes: ["关键界面"],
        heroAssetIds: ["asset-module-main"],
        supportingAssetIds: ["asset-module-support"],
        decorativeAssetIds: [],
        riskyAssetIds: [],
        missingInfo: [],
        suggestedNextStep: "继续排版。",
        recognizedAssetIds: ["asset-module-main", "asset-module-support"],
        lastIncrementalDiff: null,
      },
      projectName: "案例 A",
    });

    const nextScene = applyGeneratedLayoutToScene({
      scene: prototypeScene,
      boardIds: prototypeScene.boardOrder,
      layoutPages: [
        {
          boardId: prototypeScene.boards[0].id,
          pageNumber: 1,
          type: "关键模块优化",
          titleSuggestion: "方案对比",
          contentGuidance: "展开主方案与取舍。",
          keyPoints: ["Before", "After", "收益"],
        },
      ],
      assets: [
        {
          id: "asset-module-main",
          title: "模块主图",
          selected: true,
          metaJson: { roleTag: "main", note: "主界面" },
        },
        {
          id: "asset-module-support",
          title: "模块补图",
          selected: true,
          metaJson: { roleTag: "support", note: "对比界面" },
        },
      ],
      styleProfile: resolveStyleProfile({ source: "preset", presetKey: "clean-case" }),
      suggestion: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "展示关键模块。",
        narrativeArc: "模块",
        status: "confirmed",
        confirmedAt: "2026-04-11T00:05:00.000Z",
        groups: [
          {
            id: "group-module",
            label: "关键模块",
            rationale: "展开主方案。",
            narrativeRole: "主体",
            sections: [
              {
                id: "section-module",
                title: "模块优化",
                purpose: "说明核心模块的前后变化和设计取舍。",
                recommendedContent: ["Before / After", "方案亮点", "取舍"],
                suggestedAssets: ["模块主图", "模块补图"],
              },
            ],
          },
        ],
      },
      recognition: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "主界面和补充界面都明确。",
        recognizedTypes: ["关键界面"],
        heroAssetIds: ["asset-module-main"],
        supportingAssetIds: ["asset-module-support"],
        decorativeAssetIds: [],
        riskyAssetIds: [],
        missingInfo: [],
        suggestedNextStep: "继续排版。",
        recognizedAssetIds: ["asset-module-main", "asset-module-support"],
        lastIncrementalDiff: null,
      },
    });

    const board = nextScene.boards[0];
    const imageNodes = board.nodes.filter((node) => node.type === "image");
    expect(imageNodes).toHaveLength(2);
    expect(imageNodes.map((node) => node.x)).toEqual([156, 480]);
    expect(imageNodes.map((node) => node.width)).toEqual([318, 318]);
  });

  it("selects the focus template for module pages when only one strong asset is available", () => {
    const prototypeScene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "展示关键模块。",
        narrativeArc: "模块",
        status: "confirmed",
        confirmedAt: "2026-04-11T00:05:00.000Z",
        groups: [
          {
            id: "group-module",
            label: "关键模块",
            rationale: "展开主方案。",
            narrativeRole: "主体",
            sections: [
              {
                id: "section-module",
                title: "方案聚焦",
                purpose: "说明主方案的核心亮点和取舍。",
                recommendedContent: ["方案亮点", "取舍", "结果"],
                suggestedAssets: ["主图"],
              },
            ],
          },
        ],
      },
      assets: [
        {
          id: "asset-module-main",
          title: "主图",
          selected: true,
          metaJson: { roleTag: "main", note: "主界面" },
        },
      ],
      recognition: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "主界面明确。",
        recognizedTypes: ["关键界面"],
        heroAssetIds: ["asset-module-main"],
        supportingAssetIds: [],
        decorativeAssetIds: [],
        riskyAssetIds: [],
        missingInfo: [],
        suggestedNextStep: "继续排版。",
        recognizedAssetIds: ["asset-module-main"],
        lastIncrementalDiff: null,
      },
      projectName: "案例 A",
    });

    const nextScene = applyGeneratedLayoutToScene({
      scene: prototypeScene,
      boardIds: prototypeScene.boardOrder,
      layoutPages: [
        {
          boardId: prototypeScene.boards[0].id,
          pageNumber: 1,
          type: "关键模块优化",
          titleSuggestion: "方案聚焦",
          contentGuidance: "展开主方案与设计取舍。",
          keyPoints: ["亮点", "取舍", "结果"],
        },
      ],
      assets: [
        {
          id: "asset-module-main",
          title: "主图",
          selected: true,
          metaJson: { roleTag: "main", note: "主界面" },
        },
      ],
      styleProfile: resolveStyleProfile({ source: "preset", presetKey: "clean-case" }),
      suggestion: null,
      recognition: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "主界面明确。",
        recognizedTypes: ["关键界面"],
        heroAssetIds: ["asset-module-main"],
        supportingAssetIds: [],
        decorativeAssetIds: [],
        riskyAssetIds: [],
        missingInfo: [],
        suggestedNextStep: "继续排版。",
        recognizedAssetIds: ["asset-module-main"],
        lastIncrementalDiff: null,
      },
    });

    const board = nextScene.boards[0];
    const imageNodes = board.nodes.filter((node) => node.type === "image");
    const bodyNode = board.nodes.find(
      (node) => node.type === "text" && node.role === "body"
    );

    expect(imageNodes).toHaveLength(1);
    expect(imageNodes[0]?.x).toBe(164);
    expect(imageNodes[0]?.width).toBe(812);
    expect(bodyNode && bodyNode.type === "text" ? bodyNode.x : null).toBe(1104);
  });

  it("selects the visual result template for airy presets", () => {
    const prototypeScene = buildProjectSceneFromStructureSuggestion({
      suggestion: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "展示结果与价值。",
        narrativeArc: "结果",
        status: "confirmed",
        confirmedAt: "2026-04-11T00:05:00.000Z",
        groups: [
          {
            id: "group-result",
            label: "项目结果",
            rationale: "收束到结果证明。",
            narrativeRole: "收束",
            sections: [
              {
                id: "section-result",
                title: "结果证明",
                purpose: "用结果和反馈说明项目价值。",
                recommendedContent: ["结果数据", "反馈", "价值"],
                suggestedAssets: ["结果图"],
              },
            ],
          },
        ],
      },
      assets: [
        {
          id: "asset-result",
          title: "结果图",
          selected: true,
          metaJson: { roleTag: "main", note: "结果页" },
        },
      ],
      recognition: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "结果图明确。",
        recognizedTypes: ["结果页"],
        heroAssetIds: ["asset-result"],
        supportingAssetIds: [],
        decorativeAssetIds: [],
        riskyAssetIds: [],
        missingInfo: [],
        suggestedNextStep: "继续排版。",
        recognizedAssetIds: ["asset-result"],
        lastIncrementalDiff: null,
      },
      projectName: "案例 A",
    });

    const nextScene = applyGeneratedLayoutToScene({
      scene: prototypeScene,
      boardIds: prototypeScene.boardOrder,
      layoutPages: [
        {
          boardId: prototypeScene.boards[0].id,
          pageNumber: 1,
          type: "结果 / 价值证明",
          titleSuggestion: "结果证明",
          contentGuidance: "用关键结果证明价值。",
          keyPoints: ["完成率提升", "业务反馈", "效率提升"],
        },
      ],
      assets: [
        {
          id: "asset-result",
          title: "结果图",
          selected: true,
          metaJson: { roleTag: "main", note: "结果页" },
        },
      ],
      styleProfile: resolveStyleProfile({ source: "preset", presetKey: "cover-forward" }),
      suggestion: null,
      recognition: {
        generatedAt: "2026-04-11T00:00:00.000Z",
        summary: "结果图明确。",
        recognizedTypes: ["结果页"],
        heroAssetIds: ["asset-result"],
        supportingAssetIds: [],
        decorativeAssetIds: [],
        riskyAssetIds: [],
        missingInfo: [],
        suggestedNextStep: "继续排版。",
        recognizedAssetIds: ["asset-result"],
        lastIncrementalDiff: null,
      },
    });

    const board = nextScene.boards[0];
    const imageNodes = board.nodes.filter((node) => node.type === "image");

    expect(imageNodes).toHaveLength(1);
    expect(imageNodes[0]?.x).toBe(164);
    expect(imageNodes[0]?.width).toBe(772);
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
