import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import OpenAI from "openai";
import { ProxyAgent } from "undici";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    if (process.env[key]) continue;

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const normalized =
      rawValue.startsWith('"') && rawValue.endsWith('"')
        ? rawValue.slice(1, -1)
        : rawValue;

    process.env[key] = normalized;
  }
}

function sanitizeFileSegment(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
}

function createDefaultOutputPath(projectRoot, filePath, kind) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseName = sanitizeFileSegment(path.basename(filePath, path.extname(filePath)));
  return path.join(
    projectRoot,
    "private-docs",
    "llm-measurements",
    `${kind}-${timestamp}-${baseName}.json`
  );
}

function parseArgs(argv) {
  const args = {
    file: "",
    pages: "1-8",
    runs: 1,
    dpi: 144,
    detail: "low",
    model:
      process.env.OPENAI_MODEL_VISION ||
      process.env.OPENAI_MODEL_PRIMARY ||
      "gpt-5.4-mini",
    maxCompletionTokens: 1500,
    output: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--file") args.file = argv[index + 1] ?? "";
    if (current === "--pages") args.pages = argv[index + 1] ?? args.pages;
    if (current === "--runs") args.runs = Number(argv[index + 1] ?? "1");
    if (current === "--dpi") args.dpi = Number(argv[index + 1] ?? "144");
    if (current === "--detail") args.detail = argv[index + 1] ?? args.detail;
    if (current === "--model") args.model = argv[index + 1] ?? args.model;
    if (current === "--max-completion-tokens") {
      args.maxCompletionTokens = Number(argv[index + 1] ?? args.maxCompletionTokens);
    }
    if (current === "--output") args.output = argv[index + 1] ?? "";
  }

  return args;
}

function mean(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, current) => sum + current, 0) / numbers.length;
}

function buildVisionPrompt(selectedPages, totalPages) {
  return `你是一位专业的国内设计招聘顾问，正在评估一份设计师作品集的 PDF 页面截图。

本次输入的是作品集的以下页面截图：${selectedPages.join(", ")}。
整份 PDF 总页数：${totalPages}。

请严格基于这些截图本身来判断，不要假装看过未提供的页。你可以评估这些已给页面呈现出的专业感、结构性、可扫描性、角色说明、问题定义、结果表达与真实性，但若信息不足，应明确指出“当前页样本不足以判断整份作品集完整度”。

请输出 JSON：
- totalScore: 0-100
- level: "ready" | "needs_improvement" | "draft" | "not_ready"
- summaryPoints: 3-5 条中文摘要
- recommendedActions: 3-5 条中文建议`;
}

const projectRoot = path.resolve(import.meta.dirname, "..");
loadEnvFile(path.join(projectRoot, ".env"));
loadEnvFile(path.join(projectRoot, ".env.local"));

const { file, pages, runs, dpi, detail, model, maxCompletionTokens, output } =
  parseArgs(process.argv.slice(2));

if (!file) {
  console.error(
    "Usage: npm run measure:pdf-vision -- --file /abs/path/file.pdf [--pages 1-8] [--runs 1]"
  );
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set");
  process.exit(1);
}

const proxyUrl =
  process.env.OPENAI_PROXY_URL ||
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.ALL_PROXY ||
  undefined;

const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : null;
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
  maxRetries: 0,
  fetch: proxyAgent
    ? (input, init) =>
        fetch(input, {
          ...(init ?? {}),
          dispatcher: proxyAgent,
        })
    : undefined,
});

const absolutePath = path.resolve(file);
const fileStats = fs.statSync(absolutePath);
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "foliobox-pdf-vision-"));

const renderResult = spawnSync(
  "python",
  [
    path.join(projectRoot, "scripts", "render-pdf-pages.py"),
    "--file",
    absolutePath,
    "--pages",
    pages,
    "--dpi",
    String(dpi),
    "--out-dir",
    tempDir,
  ],
  {
    cwd: projectRoot,
    encoding: "utf8",
  }
);

if (renderResult.status !== 0) {
  console.error(renderResult.stderr || renderResult.stdout || "Failed to render PDF pages");
  process.exit(renderResult.status ?? 1);
}

const renderMeta = JSON.parse(renderResult.stdout);
const imageInputs = renderMeta.pages.map((pageMeta) => {
  const buffer = fs.readFileSync(pageMeta.path);
  return {
    page: pageMeta.page,
    bytes: pageMeta.bytes,
    width: pageMeta.width,
    height: pageMeta.height,
    base64: buffer.toString("base64"),
  };
});

console.info("Starting PDF vision measurement", {
  file: absolutePath,
  fileSizeBytes: fileStats.size,
  fileSizeMB: Number((fileStats.size / 1024 / 1024).toFixed(2)),
  totalPages: renderMeta.totalPages,
  selectedPages: renderMeta.selectedPages,
  renderedPageCount: imageInputs.length,
  renderedImageMB: Number(
    (
      imageInputs.reduce((sum, item) => sum + item.bytes, 0) /
      1024 /
      1024
    ).toFixed(2)
  ),
  dpi,
  detail,
  runs,
  model,
  maxCompletionTokens,
});

const prompt = buildVisionPrompt(renderMeta.selectedPages, renderMeta.totalPages);
const runResults = [];

for (let runIndex = 0; runIndex < runs; runIndex += 1) {
  const startedAt = Date.now();
  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    max_completion_tokens: maxCompletionTokens,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Respond with valid JSON matching the requested schema.",
      },
      {
        role: "user",
        content: [
          ...imageInputs.map((item) => ({
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${item.base64}`,
              detail,
            },
          })),
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = { raw: content };
  }

  const result = {
    run: runIndex + 1,
    elapsedMs: Date.now() - startedAt,
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
    totalTokens: response.usage?.total_tokens ?? 0,
    totalScore: parsed.totalScore ?? null,
    level: parsed.level ?? null,
    summaryPointsCount: Array.isArray(parsed.summaryPoints)
      ? parsed.summaryPoints.length
      : null,
  };

  runResults.push(result);
  console.info("Run finished", result);
}

const summary = {
  file: absolutePath,
  fileSizeBytes: fileStats.size,
  fileSizeMB: Number((fileStats.size / 1024 / 1024).toFixed(2)),
  totalPages: renderMeta.totalPages,
  selectedPages: renderMeta.selectedPages,
  renderedPageCount: imageInputs.length,
  renderedImageMB: Number(
    (
      imageInputs.reduce((sum, item) => sum + item.bytes, 0) /
      1024 /
      1024
    ).toFixed(2)
  ),
  dpi,
  detail,
  model,
  runs,
  averages: {
    elapsedMs: Math.round(mean(runResults.map((item) => item.elapsedMs))),
    promptTokens: Math.round(mean(runResults.map((item) => item.promptTokens))),
    completionTokens: Math.round(
      mean(runResults.map((item) => item.completionTokens))
    ),
    totalTokens: Math.round(mean(runResults.map((item) => item.totalTokens))),
  },
  pageImages: imageInputs.map((item) => ({
    page: item.page,
    bytes: item.bytes,
    width: item.width,
    height: item.height,
  })),
  runResults,
};

console.info("\nVision measurement summary");
console.info(JSON.stringify(summary, null, 2));

fs.rmSync(tempDir, { recursive: true, force: true });

const outputPath = path.resolve(
  output || createDefaultOutputPath(projectRoot, absolutePath, "pdf-vision")
);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      kind: "pdf-vision",
      generatedAt: new Date().toISOString(),
      hostname: os.hostname(),
      summary,
    },
    null,
    2
  )
);
console.info(`Saved measurement to ${outputPath}`);
