import { execFileSync, spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const playwrightArgs = process.argv.slice(2);
const secret = process.env.PLAYWRIGHT_TEST_SECRET;

if (!secret) {
  console.error("PLAYWRIGHT_TEST_SECRET is required to run Playwright smoke locally.");
  process.exit(1);
}

function getCommand(binary, args) {
  if (process.platform === "win32") {
    return {
      command: "cmd.exe",
      args: ["/c", binary, ...args],
    };
  }
  return { command: binary, args };
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to resolve a free port for Playwright."));
        return;
      }
      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      execFileSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
      return;
    }
    process.kill(pid, "SIGTERM");
  } catch {
    // no-op
  }
}

async function waitForServer(baseUrl, secretValue, serverProcess, timeoutMs = 150_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) {
      throw new Error(`Playwright dev server exited early with code ${serverProcess.exitCode}.`);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3_000);
      const response = await fetch(`${baseUrl}/api/auth/test-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: secretValue }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) {
        return;
      }
    } catch {
      // keep polling until next dev is ready
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for Playwright dev server at ${baseUrl}.`);
}

const port = await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const devCommand = getCommand("npm", ["run", "dev"]);

const devServer = spawn(devCommand.command, devCommand.args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    AUTH_URL: baseUrl,
    NEXTAUTH_URL: baseUrl,
    PLAYWRIGHT_BASE_URL: baseUrl,
    PLAYWRIGHT_SKIP_VISUAL_GENERATION: "1",
  },
});

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  killProcessTree(devServer.pid);
};

process.on("SIGINT", () => {
  shutdown();
  process.exit(130);
});
process.on("SIGTERM", () => {
  shutdown();
  process.exit(143);
});

try {
  await waitForServer(baseUrl, secret, devServer);

  const testCommand = getCommand("npx", ["playwright", "test", ...playwrightArgs]);
  const testRunner = spawn(testCommand.command, testCommand.args, {
    stdio: "inherit",
    env: {
      ...process.env,
      PLAYWRIGHT_BASE_URL: baseUrl,
      PLAYWRIGHT_SKIP_WEBSERVER: "1",
    },
  });

  const exitCode = await new Promise((resolve, reject) => {
    testRunner.on("exit", (code) => resolve(code ?? 0));
    testRunner.on("error", reject);
  });

  shutdown();
  process.exit(exitCode);
} catch (error) {
  shutdown();
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
