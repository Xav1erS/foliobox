import { chromium, type FullConfig } from "@playwright/test";

/**
 * 全局 setup：在所有测试开始前执行一次。
 * 调用 test-login 接口拿到 session cookie，保存为 storageState。
 * 所有测试复用这份登录态，无需每次走 Magic Link 流程。
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const secret = process.env.PLAYWRIGHT_TEST_SECRET;

  if (!secret) {
    throw new Error(
      "PLAYWRIGHT_TEST_SECRET 未设置。请在 .env.local 中添加:\nPLAYWRIGHT_TEST_SECRET=your-secret-here",
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();

  const response = await context.request.post(`${baseURL}/api/auth/test-login`, {
    data: { secret },
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok()) {
    const text = await response.text();
    throw new Error(`Test login failed (${response.status()}): ${text}`);
  }

  // 保存 cookies + localStorage 到文件，所有测试复用
  await context.storageState({ path: "playwright/.auth/user.json" });
  await browser.close();

  console.log("✓ Playwright 测试账号登录成功，session 已保存");
}

export default globalSetup;
