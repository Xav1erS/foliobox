import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import OpenAI from "openai";
import { ProxyAgent } from "undici";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

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

function buildScoringPrompt(content) {
  return `你是一位专业的国内设计招聘顾问，擅长评估设计师作品集。请根据以下作品集内容，按 8 个维度进行评分。

## 评分维度与权重

1. **首屏专业感**（满分 15）：第一眼是否像正式投递材料，而不是练习页或模板页。
2. **可扫描性**（满分 15）：招聘方能否在短时间内抓住项目背景、角色、亮点与结果。
3. **项目选择质量**（满分 10）：项目数量是否克制，是否优先展示高质量案例。
4. **角色清晰度**（满分 15）：是否清楚说明个人角色、参与深度、负责范围。
5. **问题定义与设计判断**（满分 20）：是否说明问题是什么、为什么重要、为什么这样设计。
6. **结果与价值证明**（满分 15）：是否提供结果、影响、反馈或替代证据。
7. **真实性与可信度**（满分 5）：是否有夸大角色、编造结果、使用套话。
8. **投递适配度**（满分 5）：内容是否与目标岗位相关，强调点是否与岗位要求一致。

## 评分等级

- 85–100 分：ready（可直接投递）
- 70–84 分：needs_improvement（具备投递价值，但建议局部优化）
- 50–69 分：draft（可作为草稿，不建议直接投递）
- 50 分以下：not_ready（不建议直接投递）

## 作品集内容（来源：PDF）

${content}

## 输出要求

按 JSON 输出，字段说明：
- totalScore: 综合总分（0-100）
- level: "ready" | "needs_improvement" | "draft" | "not_ready"
- dimensionScores: 8 个维度对象，每项包含 score 和 comment
- summaryPoints: 3-5 条高层问题摘要
- recommendedActions: 3-5 条改进建议`;
}

function mean(numbers) {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, current) => sum + current, 0) / numbers.length;
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
    runs: 3,
    model: process.env.OPENAI_MODEL_LITE || "gpt-5.4-nano",
    maxChars: 12000,
    maxCompletionTokens: 1500,
    output: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--file") args.file = argv[index + 1] ?? "";
    if (current === "--runs") args.runs = Number(argv[index + 1] ?? "3");
    if (current === "--model") args.model = argv[index + 1] ?? args.model;
    if (current === "--max-chars") {
      args.maxChars = Number(argv[index + 1] ?? args.maxChars);
    }
    if (current === "--max-completion-tokens") {
      args.maxCompletionTokens = Number(argv[index + 1] ?? args.maxCompletionTokens);
    }
    if (current === "--output") args.output = argv[index + 1] ?? "";
  }

  return args;
}

const projectRoot = path.resolve(import.meta.dirname, "..");
loadEnvFile(path.join(projectRoot, ".env"));
loadEnvFile(path.join(projectRoot, ".env.local"));

const { file, runs, model, maxChars, maxCompletionTokens, output } = parseArgs(
  process.argv.slice(2)
);

if (!file) {
  console.error(
    "Usage: npm run measure:pdf-score -- --file /abs/path/file.pdf [--runs 3] [--model gpt-5.4-nano]"
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
  timeout: 30000,
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
const buffer = fs.readFileSync(absolutePath);
const parser = new PDFParse({ data: buffer });
const pdfInfo = await parser.getInfo({ parsePageInfo: true });
const pdfText = await parser.getText();
await parser.destroy();

const rawText = String(pdfText.text ?? "");
const text = rawText.slice(0, maxChars);
const prompt = buildScoringPrompt(
  `PDF 文件名：${path.basename(absolutePath)}\n\n提取文本内容：\n${text}`
);

const fileStats = fs.statSync(absolutePath);
const runResults = [];

console.info("Starting PDF score measurement", {
  file: absolutePath,
  fileSizeBytes: fileStats.size,
  fileSizeMB: Number((fileStats.size / 1024 / 1024).toFixed(2)),
  numPages: pdfInfo.total ?? null,
  textChars: rawText.length,
  clippedChars: text.length,
  runs,
  model,
  maxCompletionTokens,
});

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
        content: prompt,
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
  numPages: pdfInfo.total ?? null,
  textChars: rawText.length,
  clippedChars: text.length,
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
  runResults,
};

console.info("\nMeasurement summary");
console.info(JSON.stringify(summary, null, 2));

const outputPath = path.resolve(
  output || createDefaultOutputPath(projectRoot, absolutePath, "pdf-score")
);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      kind: "pdf-score",
      generatedAt: new Date().toISOString(),
      hostname: os.hostname(),
      summary,
    },
    null,
    2
  )
);
console.info(`Saved measurement to ${outputPath}`);
