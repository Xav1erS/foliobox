import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// 加载本地环境变量（包含 PLAYWRIGHT_TEST_SECRET）
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

const playwrightBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/global-setup.ts",

  // 每个测试文件最长 60s，单个 expect 超时 10s
  timeout: 60_000,
  expect: { timeout: 10_000 },

  // 失败后不重试（本地），CI 上重试 1 次
  retries: process.env.CI ? 1 : 0,

  // 并发：本地顺序跑避免状态干扰，CI 可并行
  workers: process.env.CI ? 2 : 1,

  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],

  use: {
    baseURL: playwrightBaseUrl,

    // 所有测试默认使用保存的登录态
    storageState: "playwright/.auth/user.json",

    // 失败时截图 + 录制（便于排查）
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // 本地跑测试时自动启动 dev server
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1"
      ? undefined
      : {
          command: "npm run dev:playwright",
          url: playwrightBaseUrl,
          reuseExistingServer: false,
          timeout: 120_000,
        },
});
