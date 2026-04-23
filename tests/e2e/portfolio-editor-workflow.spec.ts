import { expect, test } from "@playwright/test";
import { db } from "../../lib/db";
import {
  cleanupPortfolioArtifacts,
  cleanupProjectArtifacts,
  ensureTestUserPlan,
} from "./support";

const FIXED_PAGES = [
  { id: "cover", label: "封面", enabled: true },
  { id: "about", label: "关于我", enabled: true },
  { id: "closing", label: "结尾页", enabled: true },
];

async function createPortfolioWithStaleProjectSnapshot() {
  const userId = await ensureTestUserPlan("SPRINT");
  const timestamp = Date.now();

  const readyProject = await db.project.create({
    data: {
      userId,
      name: `Portfolio Ready ${timestamp}`,
      sourceType: "MANUAL",
      stage: "READY",
      packageMode: "DEEP",
      layoutJson: {
        totalPages: 4,
        narrativeSummary: "完整讲清楚项目的背景、过程与结果。",
        validation: {
          projectState: "pass",
          projectVerdict: "可进入作品集",
          cause: null,
          summary: "当前项目已达到可进入作品集的基础质量线。",
          updatedAt: "2026-04-22T09:00:00.000Z",
          sceneHash: "ready-project-current-hash",
          boards: [],
        },
      },
      facts: {
        create: {
          background: "这是一个已经完成排版并可进入作品集的项目。",
          resultSummary: "结果比较完整。",
          responsibilities: [],
          collaborators: [],
          keyHighlights: [],
          emphasis: [],
        },
      },
    },
  });

  const blockedProject = await db.project.create({
    data: {
      userId,
      name: `Portfolio Blocked ${timestamp}`,
      sourceType: "MANUAL",
      stage: "LAYOUT",
      packageMode: "DEEP",
      layoutJson: {
        totalPages: 2,
        narrativeSummary: "项目还没有整理到可进入作品集的状态。",
        validation: {
          projectState: "not_ready",
          projectVerdict: "暂不建议进入作品集",
          cause: "missing_user_material",
          summary: "当前仍缺少结果证明与关键说明，暂不建议进入作品集。",
          updatedAt: "2026-04-22T09:10:00.000Z",
          sceneHash: "blocked-project-hash",
          boards: [],
        },
      },
      facts: {
        create: {
          background: "这个项目还缺少关键结果材料。",
          resultSummary: null,
          responsibilities: [],
          collaborators: [],
          keyHighlights: [],
          emphasis: [],
        },
      },
    },
  });

  const portfolio = await db.portfolio.create({
    data: {
      userId,
      name: `Portfolio Review ${timestamp}`,
      status: "EDITOR",
      projectIds: [readyProject.id, blockedProject.id],
      outlineJson: {
        fixedPages: FIXED_PAGES,
      },
      contentJson: {
        narrativeSummary: "先介绍我，再放入重点项目，最后收束。",
        generatedAt: "2026-04-22T09:20:00.000Z",
        qualityNotes: ["其中一个项目后来已经更新，需要重新同步。"],
        pages: [
          {
            id: "fixed-cover",
            type: "fixed",
            pageRole: "cover",
            title: "封面",
            summary: "封面页",
            pageCountSuggestion: "1 页",
          },
          {
            id: "fixed-about",
            type: "fixed",
            pageRole: "about",
            title: "关于我",
            summary: "关于我",
            pageCountSuggestion: "1 页",
          },
          {
            id: `project-${readyProject.id}`,
            type: "project",
            pageRole: "project_case",
            title: readyProject.name,
            summary: "已包装进作品集的项目页。",
            pageCountSuggestion: "3-5 页",
            projectId: readyProject.id,
          },
          {
            id: "fixed-closing",
            type: "fixed",
            pageRole: "closing",
            title: "结尾页",
            summary: "结尾页",
            pageCountSuggestion: "1 页",
          },
        ],
        projectSnapshots: [
          {
            projectId: readyProject.id,
            projectName: readyProject.name,
            sceneHash: "ready-project-old-hash",
            updatedAt: "2026-04-21T09:20:00.000Z",
          },
        ],
      },
    },
  });

  return {
    portfolioId: portfolio.id,
    readyProjectId: readyProject.id,
    blockedProjectId: blockedProject.id,
    readyProjectName: readyProject.name,
    blockedProjectName: blockedProject.name,
  };
}

test.describe("Portfolio Editor — 待同步工作流 smoke", () => {
  let portfolioId = "";
  let projectIds: string[] = [];

  test.afterEach(async () => {
    await cleanupPortfolioArtifacts(portfolioId ? [portfolioId] : []);
    await cleanupProjectArtifacts(projectIds);
    portfolioId = "";
    projectIds = [];
  });

  test("显示待同步状态、包装预检上下文，并在发布页阻断输出", async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);

    const seed = await createPortfolioWithStaleProjectSnapshot();
    portfolioId = seed.portfolioId;
    projectIds = [seed.readyProjectId, seed.blockedProjectId];

    await page.goto(`/portfolios/${portfolioId}/editor`);
    await expect(page.getByText("待同步 / 待复核", { exact: true }).first()).toBeVisible({
      timeout: 30_000,
    });
    await page.getByRole("tab", { name: "项目", exact: true }).click();
    await expect(page.getByText("其中一个项目后来已经更新，需要重新同步。")).toBeVisible();
    const projectsPanel = page.getByRole("tabpanel", { name: "项目" });
    await expect(projectsPanel.getByText(seed.readyProjectName).first()).toBeVisible();
    await expect(projectsPanel.getByText("可进入", { exact: true }).first()).toBeVisible();
    await expect(projectsPanel.getByText("暂不建议进入", { exact: true }).first()).toBeVisible();

    const backToProjectLink = projectsPanel.getByRole("link", { name: "回到项目编辑器" }).first();
    await expect(backToProjectLink).toHaveAttribute(
      "href",
      `/projects/${seed.readyProjectId}/editor`
    );

    await page.screenshot({
      path: testInfo.outputPath("portfolio-editor-review.png"),
      fullPage: true,
    });

    await page.getByRole("button", { name: "生成作品集包装", exact: true }).click();
    const packageDialog = page.getByRole("dialog", { name: "生成作品集包装" });
    await expect(packageDialog).toBeVisible();
    await expect(packageDialog.getByRole("heading", { name: "生成作品集包装" })).toBeVisible();
    await expect(page.getByText("可直接进入包装：1 个")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("暂不建议纳入：1 个")).toBeVisible();
    await packageDialog.getByRole("button", { name: "取消", exact: true }).click();

    await page.goto(`/portfolios/${portfolioId}/publish`);
    await expect(page.getByText("发布与导出流程")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("待同步 / 待复核", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "发布公开链接" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "导出 PDF" })).toBeDisabled();

    await page.screenshot({
      path: testInfo.outputPath("portfolio-publish-blocked.png"),
      fullPage: true,
    });
  });
});
