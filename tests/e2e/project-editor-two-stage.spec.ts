import { expect, test } from "@playwright/test";
import { db } from "../../lib/db";
import {
  type ProjectStructureSuggestion,
} from "../../lib/project-editor-scene";
import {
  cleanupProjectArtifacts,
  ensureTestUserPlan,
  makeSvgDataUrl,
} from "./support";

function buildConfirmedSuggestion(): ProjectStructureSuggestion {
  return {
    generatedAt: "2026-04-22T08:00:00.000Z",
    summary: "按概览、过程、结果组织项目故事。",
    narrativeArc: "概览 -> 过程 -> 结果",
    status: "confirmed",
    confirmedAt: "2026-04-22T08:05:00.000Z",
    groups: [
      {
        id: "group-overview",
        label: "项目概览",
        rationale: "先建立项目边界与角色。",
        narrativeRole: "开场",
        sections: [
          {
            id: "section-cover",
            title: "项目封面",
            purpose: "快速说明项目是什么，以及我在其中承担什么职责。",
            recommendedContent: ["项目名称", "角色", "时间", "目标"],
            suggestedAssets: ["封面图"],
          },
        ],
      },
      {
        id: "group-process",
        label: "设计过程",
        rationale: "展开关键流程与取舍。",
        narrativeRole: "主体",
        sections: [
          {
            id: "section-flow",
            title: "关键流程",
            purpose: "展示任务链优化前后的关键判断与核心路径。",
            recommendedContent: ["流程图", "关键界面", "任务链路"],
            suggestedAssets: ["流程图"],
          },
        ],
      },
      {
        id: "group-result",
        label: "项目结果",
        rationale: "收束到价值证明。",
        narrativeRole: "收束",
        sections: [
          {
            id: "section-result",
            title: "价值证明",
            purpose: "用数据和反馈说明设计结果。",
            recommendedContent: ["结果数据", "用户反馈", "业务价值"],
            suggestedAssets: ["结果页"],
          },
        ],
      },
    ],
  };
}

async function createProjectWithConfirmedStructure() {
  const userId = await ensureTestUserPlan("SPRINT");
  const suggestion = buildConfirmedSuggestion();

  const project = await db.project.create({
    data: {
      userId,
      name: `E2E Two Stage ${Date.now()}`,
      sourceType: "MANUAL",
      stage: "LAYOUT",
      packageMode: "DEEP",
      layoutJson: {
        structureSuggestion: suggestion,
      },
      facts: {
        create: {
          projectType: "B 端后台",
          audience: "TO_B",
          platform: "WEB",
          projectNature: "MAJOR_REDESIGN",
          industry: "企业服务",
          roleTitle: "产品设计师",
          involvementLevel: "LEAD",
          background: "项目需要提升任务链路完成率，并让关键角色更快完成复杂操作。",
          resultSummary: "上线后核心流程完成率提升，支持更多复杂任务。",
          responsibilities: ["梳理问题", "主导方案", "推进落地"],
          collaborators: ["产品经理", "前端工程师"],
          keyHighlights: ["流程优化", "结果证明"],
          emphasis: ["业务价值", "关键模块"],
        },
      },
      assets: {
        create: [
          {
            assetType: "IMAGE",
            title: "封面图",
            imageUrl: makeSvgDataUrl("Cover"),
            sortOrder: 0,
            selected: true,
            isCover: true,
            metaJson: { roleTag: "main" },
          },
          {
            assetType: "IMAGE",
            title: "流程图",
            imageUrl: makeSvgDataUrl("Flow"),
            sortOrder: 1,
            selected: true,
            isCover: false,
            metaJson: { roleTag: "support" },
          },
          {
            assetType: "IMAGE",
            title: "结果页",
            imageUrl: makeSvgDataUrl("Result"),
            sortOrder: 2,
            selected: true,
            isCover: false,
            metaJson: { roleTag: "support" },
          },
        ],
      },
    },
    include: {
      assets: {
        orderBy: { sortOrder: "asc" },
      },
      facts: true,
    },
  });

  return { projectId: project.id, projectName: project.name };
}

test.describe("Project Editor — 两阶段 smoke", () => {
  let projectId = "";

  test.afterEach(async () => {
    await cleanupProjectArtifacts(projectId ? [projectId] : []);
    projectId = "";
  });

  test("创建画板 -> 生成整组排版 -> 再次生成时明确跳过", async ({ page }, testInfo) => {
    test.setTimeout(180_000);

    const seed = await createProjectWithConfirmedStructure();
    projectId = seed.projectId;

    await page.goto(`/projects/${projectId}/editor`);
    await expect(page.locator("canvas[data-fabric='main']")).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.getByRole("button", { name: "重新创建内容稿" })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "重新创建内容稿" }).click();

    await expect(page.getByText("已按当前结构创建内容稿。")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("项目概览 · 项目封面")).toBeVisible();
    await expect(page.getByText("内容稿", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "导出 Figma" })).toBeDisabled();

    await page.screenshot({
      path: testInfo.outputPath("project-prototype-stage.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "生成排版" }).click();
    const generateDialog = page.getByRole("dialog", { name: "生成排版" });
    await expect(generateDialog).toBeVisible();
    await expect(page.getByText("本次属于高成本动作：生成排版")).toBeVisible({
      timeout: 30_000,
    });
    await expect(generateDialog.getByText("3 张内容稿会参与，0 张已生成会跳过")).toBeVisible();
    const generateCta = generateDialog.getByRole("button", { name: "生成排版", exact: true });
    await expect(generateCta).toBeEnabled();
    await generateCta.click();
    await expect(page.getByText("排版建议已生成，可继续结合单画板细调。")).toBeVisible({
      timeout: 180_000,
    });
    await expect(page.getByText("已生成", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "导出 Figma" })).toBeEnabled();

    await page.screenshot({
      path: testInfo.outputPath("project-generated-stage.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "生成排版" }).click();
    const skipDialog = page.getByRole("dialog", { name: "生成排版" });
    await expect(skipDialog).toBeVisible();
    await expect(page.getByText("当前范围内没有可继续生成的内容稿画板。")).toBeVisible({
      timeout: 15_000,
    });
    await skipDialog.getByRole("button", { name: "确认跳过", exact: true }).click();
    await expect(
      page.getByText("当前范围内没有可继续生成的内容稿画板；已跳过已生成画板，本次没有额外计次。")
    ).toBeVisible({ timeout: 15_000 });
  });
});
