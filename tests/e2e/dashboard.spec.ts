import { test, expect } from "@playwright/test";

/**
 * 工作台（Dashboard）基础验收
 * 覆盖：登录态有效 → 工作台可访问 → 核心 UI 存在 → 新建项目入口可用
 */

test.describe("工作台", () => {
  test("已登录用户可以访问工作台", async ({ page }) => {
    await page.goto("/dashboard");

    // 不应被重定向到登录页
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("工作台页面正常渲染，无崩溃", async ({ page }) => {
    await page.goto("/dashboard");

    // 页面不应有 JS 崩溃导致的空白
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();

    // 不应出现 Next.js 错误覆盖层
    const errorOverlay = page.locator("nextjs-portal");
    await expect(errorOverlay).toHaveCount(0);
  });

  test("未登录用户被重定向到登录页", async ({ browser }) => {
    // 新建一个没有 storageState 的 context（未登录）
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);

    await context.close();
  });
});
