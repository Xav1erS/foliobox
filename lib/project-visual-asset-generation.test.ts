import { describe, expect, it } from "vitest";
import { planPrototypeVisualAssets } from "./project-visual-asset-generation";
import type {
  ProjectPrototypeBoardDraft,
  ProjectSceneSeedAsset,
  ProjectStructureSuggestion,
} from "./project-editor-scene";

function makeSuggestion(): ProjectStructureSuggestion {
  return {
    generatedAt: "2026-04-23T00:00:00.000Z",
    summary: "项目概览 -> 洞察 -> 模型 -> 结果",
    narrativeArc: "概览 -> 洞察 -> 模型 -> 结果",
    status: "confirmed",
    confirmedAt: "2026-04-23T00:05:00.000Z",
    groups: [
      {
        id: "group-overview",
        label: "项目概览",
        rationale: "先交代项目边界",
        narrativeRole: "开场",
        sections: [
          {
            id: "section-cover",
            title: "一句话定义问题",
            purpose: "说明项目定位",
            recommendedContent: ["目标", "挑战", "角色"],
            suggestedAssets: ["封面图"],
          },
        ],
      },
      {
        id: "group-insight",
        label: "用户场景洞察",
        rationale: "把主线落到用户",
        narrativeRole: "主体",
        sections: [
          {
            id: "section-journey",
            title: "浏览器内任务类型",
            purpose: "归纳用户任务类型",
            recommendedContent: ["任务类型", "共同点", "体验地图"],
            suggestedAssets: [],
          },
        ],
      },
      {
        id: "group-result",
        label: "上线结果与规范化",
        rationale: "收束证据",
        narrativeRole: "收束",
        sections: [
          {
            id: "section-result",
            title: "Product Hunt",
            purpose: "说明上线结果与证据",
            recommendedContent: ["上线结果", "反馈", "后续动作"],
            suggestedAssets: [],
          },
        ],
      },
    ],
  };
}

function makeDrafts(): ProjectPrototypeBoardDraft[] {
  return [
    {
      sectionId: "section-cover",
      title: "浏览器工具统一",
      summary: "开场先建立项目边界。",
      narrative: "",
      keyPoints: ["目标", "挑战", "角色"],
      infoCards: [],
      visualBrief: "优先使用封面图。",
      preferredAssetIds: [],
      missingAssetNote: "待补主视觉",
    },
    {
      sectionId: "section-journey",
      title: "浏览器内任务类型",
      summary: "用体验地图归纳不同任务类型。",
      narrative: "当前更适合先用一张体验地图承接任务阶段与痛点。",
      keyPoints: ["临时需求", "不想学习", "结果可复制"],
      infoCards: [],
      visualBrief: "需要一张体验地图 / journey map 作为说明图。",
      preferredAssetIds: [],
      missingAssetNote: "待补体验地图",
    },
    {
      sectionId: "section-result",
      title: "上线首轮验证",
      summary: "用证据板说明上线后的结果与反馈。",
      narrative: "先展示结果，再解释意味着什么。",
      keyPoints: ["上线结果", "用户反馈", "后续动作"],
      infoCards: [],
      visualBrief: "需要一张结果证据板。",
      preferredAssetIds: [],
      missingAssetNote: "待补结果证据图",
    },
  ];
}

describe("planPrototypeVisualAssets", () => {
  it("plans AI visual assets only for eligible non-cover sections without matched assets", () => {
    const plans = planPrototypeVisualAssets({
      projectName: "测试项目 01",
      suggestion: makeSuggestion(),
      packageMode: "DEEP",
      contentDrafts: makeDrafts(),
      assets: [],
      factsSummary: "受众：To C 大众消费者",
    });

    expect(plans.map((plan) => plan.sectionId)).toEqual([
      "section-journey",
      "section-result",
    ]);
    expect(plans[0]?.visualKind).toBe("journey_map");
    expect(plans[1]?.visualKind).toBe("evidence_board");
  });

  it("skips sections that already have preferred assets", () => {
    const drafts = makeDrafts();
    drafts[1] = {
      ...drafts[1],
      preferredAssetIds: ["asset-journey"],
    };

    const plans = planPrototypeVisualAssets({
      projectName: "测试项目 01",
      suggestion: makeSuggestion(),
      packageMode: "DEEP",
      contentDrafts: drafts,
      assets: [],
      factsSummary: "",
    });

    expect(plans.map((plan) => plan.sectionId)).toEqual(["section-result"]);
  });

  it("skips sections that already have AI-generated visuals stored on the project", () => {
    const assets: ProjectSceneSeedAsset[] = [
      {
        id: "asset-ai-journey",
        title: "浏览器内任务类型 · AI体验地图",
        imageUrl: "project-assets/asset-ai-journey.png",
        isCover: false,
        selected: true,
        metaJson: {
          aiGenerated: true,
          sourceSectionId: "section-journey",
          visualKind: "journey_map",
          roleTag: "support",
        },
      },
    ];

    const plans = planPrototypeVisualAssets({
      projectName: "测试项目 01",
      suggestion: makeSuggestion(),
      packageMode: "DEEP",
      contentDrafts: makeDrafts(),
      assets,
      factsSummary: "",
    });

    expect(plans.map((plan) => plan.sectionId)).toEqual(["section-result"]);
  });
});
