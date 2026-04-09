import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { PortfolioPackagingContent } from "@/lib/portfolio-editor";
import { renderPortfolioPublishedHtml } from "@/lib/portfolio-publishing";

const execFileAsync = promisify(execFile);

const CHROME_CANDIDATES = [
  process.env.PORTFOLIO_PDF_CHROME_BIN,
  process.env.GOOGLE_CHROME_BIN,
  process.env.CHROME_BIN,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].filter((value): value is string => Boolean(value));

export class PortfolioPdfRendererUnavailableError extends Error {
  constructor() {
    super("pdf_renderer_unavailable");
    this.name = "PortfolioPdfRendererUnavailableError";
  }
}

async function findChromeBinary() {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new PortfolioPdfRendererUnavailableError();
}

export async function renderPortfolioPdf(params: {
  portfolioName: string;
  content: PortfolioPackagingContent;
}) {
  const chromePath = await findChromeBinary();
  const html = renderPortfolioPublishedHtml(params);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "foliobox-portfolio-pdf-"));
  const htmlPath = path.join(tempDir, `${randomUUID()}.html`);
  const pdfPath = path.join(tempDir, `${randomUUID()}.pdf`);

  try {
    await writeFile(htmlPath, html, "utf8");
    await execFileAsync(
      chromePath,
      [
        "--headless=new",
        "--disable-gpu",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--no-sandbox",
        "--allow-file-access-from-files",
        "--enable-local-file-accesses",
        "--print-to-pdf-no-header",
        `--print-to-pdf=${pdfPath}`,
        `file://${htmlPath}`,
      ],
      {
        maxBuffer: 10 * 1024 * 1024,
        timeout: 60_000,
      }
    );

    return await readFile(pdfPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
