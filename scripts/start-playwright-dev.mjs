import { spawn } from "node:child_process";
const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3001";
const parsedBaseUrl = new URL(baseUrl);
const resolvedPort =
  parsedBaseUrl.port || (parsedBaseUrl.protocol === "https:" ? "443" : "80");

const command = process.platform === "win32" ? "cmd.exe" : "npm";
const args = process.platform === "win32" ? ["/c", "npm", "run", "dev"] : ["run", "dev"];

const child = spawn(command, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    AUTH_URL: process.env.AUTH_URL || baseUrl,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || baseUrl,
    HOSTNAME: process.env.HOSTNAME || parsedBaseUrl.hostname,
    PORT: process.env.PORT || resolvedPort,
    PLAYWRIGHT_SKIP_VISUAL_GENERATION:
      process.env.PLAYWRIGHT_SKIP_VISUAL_GENERATION || "1",
  },
});

const terminateChild = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => terminateChild("SIGINT"));
process.on("SIGTERM", () => terminateChild("SIGTERM"));

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
