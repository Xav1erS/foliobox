import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm/openai";
import type { ImageInput } from "@/lib/llm/provider";
import { deleteFiles, getPrivateBlob, isBlobStorageUrl } from "@/lib/storage";
import { persistExternalParseUsageEvent } from "@/lib/external-parse-usage";
import {
  SCORE_ANONYMOUS_SESSION_COOKIE,
  type JudgementState,
  type ScoreCoverage,
  type ScoreProcessingMeta,
} from "@/lib/score-contract";
import type {
  ExternalParseUsageMeta,
  PDFParseResult,
} from "@/lib/pdf-parse/provider";
import { getConfiguredPDFParseProviders } from "@/lib/pdf-parse/registry";
import {
  buildCoverage,
  buildPromptInputFromScan,
  buildScanResult,
} from "@/lib/score-processing";
import { getPortfolioScoreLevelFromTotalScore } from "@/lib/portfolio-score-level";
import {
  computeDimensionScoreSum,
  computeTotalScoreFromDimensions,
  normalizeDimensionScoresForComputation,
  SCORE_DIMENSION_KEYS,
  type ScoreDimensionKey,
} from "@/lib/score-math";
import { isRunningOnVercel } from "@/lib/runtime-target";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SCORE_UPLOAD_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_SCORE_IMAGES = 20;
const MAX_PDF_VISUAL_ANCHORS = 8;
const ANONYMOUS_SCORE_LIMIT = 3;
const ANONYMOUS_SCORE_WINDOW_MS = 24 * 60 * 60 * 1000;
const IS_VERCEL = isRunningOnVercel();
const MAX_LINK_PAGES = IS_VERCEL ? 10 : 30;
const MAX_LINK_DEPTH = IS_VERCEL ? 2 : 3;
const LINK_FETCH_TIMEOUT_MS = IS_VERCEL ? 4_000 : 8_000;
const LINK_CRAWL_BUDGET_MS = IS_VERCEL ? 15_000 : 45_000;
const DIMENSION_KEY_ALIASES: Record<ScoreDimensionKey, string[]> = {
  firstScreenProfessionalism: ["firstScreenProfessionalism", "首屏专业感", "首屏专业性", "首屏印象"],
  scannability: ["scannability", "可扫描性", "信息可扫描性", "扫描性"],
  projectSelection: ["projectSelection", "项目选择质量", "项目选择", "项目质量"],
  roleClarity: ["roleClarity", "角色清晰度", "角色清晰", "职责清晰度"],
  problemDefinition: ["problemDefinition", "问题定义与设计判断", "问题定义", "设计判断"],
  resultEvidence: ["resultEvidence", "结果与价值证明", "结果证明", "价值证明"],
  authenticity: ["authenticity", "真实性与可信度", "真实性", "可信度"],
  jobFit: ["jobFit", "投递适配度", "岗位适配度", "适配度"],
};

const JudgementStateSchema = z.enum([
  "full_judgement",
  "limited_judgement",
  "insufficient_evidence",
]);

const DimensionScoreSchema = z.object({
  score: z.number().min(0).max(100),
  comment: z.string(),
  judgementState: JudgementStateSchema,
});

type DimensionScore = {
  score: number;
  comment: string;
  judgementState: JudgementState;
};

type ScoreOutput = {
  totalScore: number;
  level: "ready" | "needs_improvement" | "draft" | "not_ready";
  detectedProjectCount?: number;
  dimensionScores: Record<ScoreDimensionKey, DimensionScore>;
  summaryPoints: string[];
  recommendedActions: string[];
};

function normalizeDimensionScoreEntry(value: unknown) {
  if (!value || typeof value !== "object") {
    return value;
  }

  const candidate = value as Record<string, unknown>;
  const rawScore = candidate.score;
  const numericScore =
    typeof rawScore === "number"
      ? rawScore
      : typeof rawScore === "string"
        ? Number(rawScore)
        : NaN;

  return {
    score: Number.isFinite(numericScore) ? Math.max(0, Math.min(100, numericScore)) : rawScore,
    comment: candidate.comment ?? candidate.summary ?? candidate.reason ?? candidate.note ?? "",
    judgementState:
      candidate.judgementState ??
      candidate.judgmentState ??
      candidate.state ??
      candidate.evidenceState ??
      "limited_judgement",
  };
}

function findDimensionKey(rawKey: unknown, fallbackIndex: number) {
  if (typeof rawKey === "string") {
    const normalized = rawKey.trim().toLowerCase();

    for (const key of SCORE_DIMENSION_KEYS) {
      if (
        key.toLowerCase() === normalized ||
        DIMENSION_KEY_ALIASES[key].some((alias) => alias.toLowerCase() === normalized)
      ) {
        return key;
      }
    }
  }

  return SCORE_DIMENSION_KEYS[fallbackIndex] ?? null;
}

function normalizeDimensionScores(value: unknown) {
  if (Array.isArray(value)) {
    const normalized: Record<string, unknown> = {};

    value.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") {
        return;
      }

      const candidate = entry as Record<string, unknown>;
      const key = findDimensionKey(
        candidate.key ?? candidate.name ?? candidate.dimension ?? candidate.label ?? candidate.title,
        index
      );

      if (!key) {
        return;
      }

      normalized[key] = normalizeDimensionScoreEntry(candidate);
    });

    return normalized;
  }

  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    const normalized: Record<string, unknown> = {};

    for (const key of SCORE_DIMENSION_KEYS) {
      const directValue = candidate[key];
      if (directValue !== undefined) {
        normalized[key] = normalizeDimensionScoreEntry(directValue);
        continue;
      }

      const aliasValue = DIMENSION_KEY_ALIASES[key]
        .map((alias) => candidate[alias])
        .find((aliasCandidate) => aliasCandidate !== undefined);

      if (aliasValue !== undefined) {
        normalized[key] = normalizeDimensionScoreEntry(aliasValue);
      }
    }

    return normalized;
  }

  return value;
}

function normalizeBoundedNumber(value: unknown, min: number, max: number) {
  const numeric =
    typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

  if (!Number.isFinite(numeric)) {
    return value;
  }

  return Math.max(min, Math.min(max, numeric));
}

const ScoreOutputSchema: z.ZodType<ScoreOutput, z.ZodTypeDef, unknown> = z.object({
  totalScore: z.preprocess((value) => normalizeBoundedNumber(value, 0, 100), z.number().min(0).max(100)),
  level: z.enum(["ready", "needs_improvement", "draft", "not_ready"]),
  detectedProjectCount: z
    .preprocess((value) => normalizeBoundedNumber(value, 0, 20), z.number().int().min(0).max(20))
    .optional(),
  dimensionScores: z.preprocess(
    normalizeDimensionScores,
    z.object({
      firstScreenProfessionalism: DimensionScoreSchema,
      scannability: DimensionScoreSchema,
      projectSelection: DimensionScoreSchema,
      roleClarity: DimensionScoreSchema,
      problemDefinition: DimensionScoreSchema,
      resultEvidence: DimensionScoreSchema,
      authenticity: DimensionScoreSchema,
      jobFit: DimensionScoreSchema,
    })
  ),
  summaryPoints: z.array(z.string()).min(1).max(6),
  recommendedActions: z.array(z.string()).min(1).max(6),
});

const ScoreOutputSchemaForLLM = ScoreOutputSchema as unknown as z.ZodSchema<ScoreOutput>;
type UploadedInputFile = {
  url: string;
  pathname?: string;
  name: string;
  size: number;
  type: string;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripHtml(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ");
}

function extractLinks(html: string, currentUrl: URL, origin: string) {
  const matches = [...html.matchAll(/href=["']([^"']+)["']/gi)];
  const urls: string[] = [];

  for (const match of matches) {
    const raw = match[1];
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
      continue;
    }

    try {
      const resolved = new URL(raw, currentUrl);
      if (resolved.origin !== origin) continue;
      urls.push(resolved.toString());
    } catch {
      continue;
    }
  }

  return Array.from(new Set(urls));
}

function extractTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeText(match[1]) : null;
}

function buildScoringPrompt(content: string, inputType: string): string {
  return `你是一位专业的国内设计招聘顾问，擅长评估设计师作品集。请根据以下作品集扫描结果与内容摘要，按 8 个维度进行评分。

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

## 判断状态定义

- full_judgement：证据充分，可完整判断
- limited_judgement：已有部分证据，但判断有限
- insufficient_evidence：证据不足，不应给出强判断

要求：
- 不要因为证据不足而直接给极低分
- 若当前输入不足以完整判断某维度，请降低结论强度并使用 limited_judgement 或 insufficient_evidence
- detectedProjectCount 按当前输入中实际可识别出的项目数量估算

## 作品集内容（来源：${inputType}）

${content}

## 输出要求

按 JSON 输出，字段说明：
- totalScore: 综合总分（0-100），按各维度满分比例加权计算
- level: "ready" | "needs_improvement" | "draft" | "not_ready"
- detectedProjectCount: 识别到的项目数
- dimensionScores: 必须是 object，不能是数组，且必须包含以下 8 个 key：
  - firstScreenProfessionalism
  - scannability
  - projectSelection
  - roleClarity
  - problemDefinition
  - resultEvidence
  - authenticity
  - jobFit
- 每个 dimensionScores[key] 都必须返回：score、comment、judgementState
- dimensionScores[key].score 必须是 0-100 的百分制原始判断分，不要直接返回 15 / 20 / 5 这类按维度满分计算后的分值
- summaryPoints: 3-5 条高层问题摘要（中文，每条不超过 30 字）
- recommendedActions: 3-5 条改进建议（中文，每条不超过 30 字，可操作）`;
}

async function extractPdfScan(file: File) {
  const parseUsageEvents: ExternalParseUsageMeta[] = [];
  const attemptedProviders: string[] = [];
  const providers = getConfiguredPDFParseProviders();
  let result: PDFParseResult | null = null;

  console.info("[pdf-parse] starting", {
    fileName: file.name,
    fileSizeBytes: file.size,
    configuredProviders: providers.map((provider) => provider.name),
  });

  for (const provider of providers) {
    attemptedProviders.push(provider.name);
    console.info("[pdf-parse] attempting_provider", {
      provider: provider.name,
      providerDisplayName: provider.profile.displayName,
      providerRegion: provider.profile.region,
      providerNetworkProfile: provider.profile.networkProfile,
      providerStabilityTier: provider.profile.stabilityTier,
      fileName: file.name,
      fileSizeBytes: file.size,
    });

    try {
      result = await provider.parse(file);
      parseUsageEvents.push({
        provider: result.provider,
        providerProfile: result.providerProfile,
        success: true,
        elapsedMs: result.parseElapsedMs,
        pageCount: result.pageCount,
        estimatedCostUsd: result.estimatedCostUsd,
        fileSizeBytes: file.size,
        metadata: result.metadata ?? null,
      });
      console.info("[pdf-parse] provider_succeeded", {
        provider: result.provider,
        providerDisplayName: result.providerProfile.displayName,
        pageCount: result.pageCount,
        visualSourceAvailable: result.visualSourceAvailable,
        parseElapsedMs: result.parseElapsedMs,
        estimatedCostUsd: result.estimatedCostUsd,
      });
      break;
    } catch (error) {
      console.error("[pdf-parse] provider_failed", {
        provider: provider.name,
        providerDisplayName: provider.profile.displayName,
        errorMessage: error instanceof Error ? error.message : "Unknown parse error",
        fileName: file.name,
        fileSizeBytes: file.size,
      });
      parseUsageEvents.push({
        provider: provider.name,
        providerProfile: provider.profile,
        success: false,
        elapsedMs: 0,
        pageCount: null,
        estimatedCostUsd: null,
        fileSizeBytes: file.size,
        errorMessage: error instanceof Error ? error.message : "Unknown parse error",
        metadata: {
          stage: "provider_attempt",
          providerProfile: provider.profile,
        },
      });
    }
  }
  if (!result) {
    console.error("[pdf-parse] all_providers_failed", {
      fileName: file.name,
      fileSizeBytes: file.size,
      attemptedProviders,
    });
    throw new Error("all_pdf_parse_providers_failed");
  }
  const parseFallbackUsed = result.provider !== providers[0]?.name;

  console.info("[pdf-parse] selection_finalized", {
    selectedProvider: result.provider,
    selectedProviderDisplayName: result.providerProfile.displayName,
    parseFallbackUsed,
    attemptedProviders,
    totalUnits: result.scanResult.totalUnits,
    parseElapsedMs: result.parseElapsedMs,
    visualSourceAvailable: result.visualSourceAvailable,
    estimatedCostUsd: result.estimatedCostUsd,
  });

  const initialCoverage = buildCoverage({
    scanResult: result.scanResult,
    isFullCoverage: true,
    includeVisualAnchors: result.visualSourceAvailable,
    maxVisualAnchors: MAX_PDF_VISUAL_ANCHORS,
  });

  const coverage = result.visualSourceAvailable
    ? initialCoverage
    : {
        ...initialCoverage,
        scoringSources: initialCoverage.scoringSources.filter(
          (source) => source !== "visual_anchor_pages"
        ),
        visualAnchorUnits: [],
      };

  const processing: ScoreProcessingMeta = {
    strategy: "mvp_scan_compress_score_v2",
    parseProvider: result.provider,
    parseProviderDisplayName: result.providerProfile.displayName,
    parseProviderRegion: result.providerProfile.region,
    parseProviderNetworkProfile: result.providerProfile.networkProfile,
    parseProviderStabilityTier: result.providerProfile.stabilityTier,
    parseAttemptedProviders: attemptedProviders,
    parseFallbackUsed,
    parseElapsedMs: result.parseElapsedMs,
    parseEstimatedCostUsd: result.estimatedCostUsd,
    visualSourceAvailable: result.visualSourceAvailable,
    scanResult: result.scanResult,
    notes: parseFallbackUsed
      ? [
          "外部文档解析服务当前不可用，系统已自动退回本地 PDF 文本结构扫描。",
          "本次评分继续基于整份输入的结构摘要、页面级摘要和项目级摘要完成。",
        ]
      : result.visualSourceAvailable
        ? [
            "PDF 已通过外部文档解析服务完成整份页级解析与结构化抽取。",
            "本次评分基于整体结构摘要、页面级摘要、项目级摘要与可用视觉原料完成。",
          ]
        : [
            "PDF 已通过外部文档解析服务完成整份页级解析，但当前视觉原料不足。",
            "本次评分优先基于整体结构摘要、页面级摘要和项目级摘要完成，并在部分维度降低判断强度。",
          ],
  };

  return {
    promptInput: buildPromptInputFromScan(result.scanResult),
    scanResult: result.scanResult,
    coverage,
    processing,
    parseUsageEvents,
  };
}

async function extractLinkScan(url: string) {
  const rootUrl = new URL(url);
  const queue: Array<{ url: string; depth: number }> = [{ url: rootUrl.toString(), depth: 0 }];
  const visited = new Set<string>();
  const entries: Array<{ unitNumber: number; text: string; sourceHint?: string | null }> = [];
  const crawlStartedAt = Date.now();
  let truncated = false;

  while (queue.length > 0 && visited.size < MAX_LINK_PAGES) {
    if (Date.now() - crawlStartedAt >= LINK_CRAWL_BUDGET_MS) {
      truncated = true;
      break;
    }

    const current = queue.shift();
    if (!current) break;
    if (visited.has(current.url)) continue;
    visited.add(current.url);

    try {
      const response = await fetch(current.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FolioBox-Scorer/1.0)" },
        signal: AbortSignal.timeout(LINK_FETCH_TIMEOUT_MS),
      });
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("text/html")) continue;

      const html = await response.text();
      const title = extractTitle(html);
      const text = normalizeText(stripHtml(html)).slice(0, 4000);
      entries.push({
        unitNumber: entries.length + 1,
        text: `${title ?? ""} ${text}`.trim(),
        sourceHint: current.url,
      });

      if (current.depth >= MAX_LINK_DEPTH) continue;
      const links = extractLinks(html, new URL(current.url), rootUrl.origin);
      for (const link of links) {
        if (visited.has(link)) continue;
        if (queue.length + visited.size >= MAX_LINK_PAGES) {
          truncated = true;
          break;
        }
        queue.push({ url: link, depth: current.depth + 1 });
      }
    } catch {
      continue;
    }
  }

  if (queue.length > 0) {
    truncated = true;
  }

  const scanResult = buildScanResult({
    inputType: "link",
    entries:
      entries.length > 0
        ? entries
        : [{ unitNumber: 1, text: `作品集链接：${url}`, sourceHint: url }],
  });

  const coverage = buildCoverage({
    scanResult,
    isFullCoverage: !truncated,
    includeVisualAnchors: false,
  });

  const processing: ScoreProcessingMeta = {
    strategy: "mvp_link_crawl_scan_v1",
    scanResult,
    notes: truncated
      ? ["当前链接抓取达到页面或深度上限，结果页需提示为有限覆盖。"]
      : ["当前链接输入已完成同域名有限抓取。"],
  };

  return {
    promptInput: buildPromptInputFromScan(scanResult),
    scanResult,
    coverage,
    processing,
  };
}

function extractImageScan(files: File[]) {
  const entries = files.map((file, index) => ({
    unitNumber: index + 1,
    text: `${file.name} 第 ${index + 1} 张截图`,
    sourceHint: file.name,
  }));

  const scanResult = buildScanResult({
    inputType: "images",
    entries,
  });

  const coverage = buildCoverage({
    scanResult,
    isFullCoverage: true,
    includeVisualAnchors: true,
    maxVisualAnchors: files.length,
  });

  const processing: ScoreProcessingMeta = {
    strategy: "mvp_image_sequence_scan_v1",
    scanResult,
    notes: [
      "截图输入按上传顺序全部纳入评分范围。",
      "当前视觉评分直接基于全部上传截图完成。",
    ],
  };

  return {
    promptInput: buildPromptInputFromScan(scanResult),
    scanResult,
    coverage,
    processing,
  };
}

async function filesToImageInputs(files: File[]): Promise<ImageInput[]> {
  const inputs: ImageInput[] = [];
  for (const file of files) {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = file.type as ImageInput["mimeType"];
    if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)) {
      inputs.push({ base64, mimeType });
    }
  }
  return inputs;
}

async function downloadUploadedFile(file: UploadedInputFile): Promise<File> {
  const sources = [file.pathname, file.url].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0
  );
  const invalidUrl = sources.some(
    (source) =>
      (source.startsWith("http://") || source.startsWith("https://")) && !isBlobStorageUrl(source)
  );
  if (invalidUrl) {
    throw new Error("invalid_blob_url");
  }

  const response = await getPrivateBlob(sources);

  const buffer = await new Response(response.stream).arrayBuffer();
  return new File([buffer], file.name, {
    type: file.type,
    lastModified: Date.now(),
  });
}

function getAnonymousSessionId(req: NextRequest) {
  return req.cookies.get(SCORE_ANONYMOUS_SESSION_COOKIE)?.value ?? null;
}

function getUploadedInputSources(files: UploadedInputFile[] | null | undefined) {
  return (files ?? [])
    .map((file) => file.pathname || file.url)
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
}

function getRequestIpHash(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const userAgent = req.headers.get("user-agent") ?? "";
  const rawIp = forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || "";

  if (!rawIp) {
    return null;
  }

  return createHash("sha256")
    .update(`${rawIp}|${userAgent}`)
    .digest("hex");
}

function enhanceCoverage(
  coverage: ScoreCoverage,
  scoreOutput: ScoreOutput
): ScoreCoverage {
  return {
    ...coverage,
    detectedProjects: scoreOutput.detectedProjectCount ?? coverage.detectedProjects,
  };
}

function normalizeScoreOutputDimensions(scoreOutput: ScoreOutput) {
  const normalizedDimensions = normalizeDimensionScoresForComputation(
    scoreOutput.dimensionScores,
    scoreOutput.totalScore
  );

  const wasNormalized =
    computeDimensionScoreSum(normalizedDimensions) !==
    computeDimensionScoreSum(scoreOutput.dimensionScores);

  return {
    normalizedDimensions,
    wasNormalized,
  };
}

export async function POST(req: NextRequest) {
  let uploadedSourcesToCleanup: string[] = [];

  try {
    const session = await auth();
    const anonymousSessionId =
      session?.user?.id ? null : getAnonymousSessionId(req) ?? randomUUID();
    const requestIpHash = session?.user?.id ? null : getRequestIpHash(req);

    if (!session?.user?.id && anonymousSessionId) {
      const recentAnonymousCount = await db.portfolioScore.count({
        where: {
          OR: [
            { anonymousSessionId },
            ...(requestIpHash ? [{ requestIpHash }] : []),
          ],
          createdAt: {
            gte: new Date(Date.now() - ANONYMOUS_SCORE_WINDOW_MS),
          },
        },
      });

      if (recentAnonymousCount >= ANONYMOUS_SCORE_LIMIT) {
        const limitedResponse = NextResponse.json(
          { error: "当前匿名评分次数已用完，请登录后继续查看完整结果与后续整理流程" },
          { status: 429 }
        );
        limitedResponse.cookies.set(SCORE_ANONYMOUS_SESSION_COOKIE, anonymousSessionId, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });
        return limitedResponse;
      }
    }

    const isJson = req.headers.get("content-type")?.includes("application/json");
    const body = isJson ? await req.json() : null;
    const formData = isJson ? null : await req.formData();
    const inputType = (isJson ? body?.inputType : formData?.get("inputType")) as string;

    if (!["link", "pdf", "images"].includes(inputType)) {
      return NextResponse.json({ error: "无效的输入类型" }, { status: 400 });
    }

    let inputUrl: string | null = null;
    let scoreOutput: ScoreOutput;
    let coverage: ScoreCoverage;
    let processing: ScoreProcessingMeta;
    let externalParseUsageEvents: ExternalParseUsageMeta[] = [];
    let trackExtras: {
      fileSizeBytes?: number;
      pageCount?: number;
      itemCount?: number;
      metadata?: Record<string, unknown>;
    } = {};

    if (inputType === "link") {
      const url = (isJson ? body?.inputUrl : formData?.get("inputUrl")) as string;
      if (!url) return NextResponse.json({ error: "请提供链接" }, { status: 400 });

      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return NextResponse.json({ error: "链接格式无效" }, { status: 400 });
        }
        const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "::1"];
        if (blocked.some((host) => parsed.hostname === host || parsed.hostname.endsWith(".local"))) {
          return NextResponse.json({ error: "链接格式无效" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "链接格式无效" }, { status: 400 });
      }

      inputUrl = url;
      const linkScan = await extractLinkScan(url);
      coverage = linkScan.coverage;
      processing = linkScan.processing;
      trackExtras = {
        itemCount: linkScan.scanResult.totalUnits,
        metadata: { inputUrl: url },
      };

      scoreOutput = await llm.generateStructured(
        buildScoringPrompt(linkScan.promptInput, "链接"),
        ScoreOutputSchemaForLLM,
        {
          task: "portfolio_score",
          temperature: 0.2,
          maxTokens: 1800,
          track: {
            userId: session?.user?.id ?? null,
            inputType: "link",
            itemCount: linkScan.scanResult.totalUnits,
            metadata: { inputUrl: url },
          },
        }
      );
    } else if (inputType === "pdf") {
      const uploadedFile = (isJson ? body?.file : null) as UploadedInputFile | null;
      uploadedSourcesToCleanup = uploadedFile ? getUploadedInputSources([uploadedFile]) : [];
      const file = isJson ? (uploadedFile ? await downloadUploadedFile(uploadedFile) : null) : ((formData?.get("file") as File | null) ?? null);
      if (!file) return NextResponse.json({ error: "请上传 PDF" }, { status: 400 });
      if (file.size > MAX_SCORE_UPLOAD_SIZE) {
        return NextResponse.json(
          { error: "评分入口当前仅支持 20MB 以内的 PDF，请压缩后重试" },
          { status: 400 }
        );
      }

      let pdfScan;
      try {
        pdfScan = await extractPdfScan(file);
      } catch (error) {
        console.error("PDF scan failed:", error);
        await persistExternalParseUsageEvent({
          usage: {
            provider: "pdf_parse_fallback",
            providerProfile: null,
            success: false,
            elapsedMs: 0,
            pageCount: null,
            estimatedCostUsd: null,
            fileSizeBytes: file.size,
            errorMessage: error instanceof Error ? error.message : "Unknown parse error",
            metadata: { stage: "fallback_provider" },
          },
          userId: session?.user?.id ?? null,
        });
        return NextResponse.json(
          { error: "PDF 解析失败，当前文件暂时无法完成结构扫描，请稍后重试或换一份导出版本" },
          { status: 422 }
        );
      }

      coverage = pdfScan.coverage;
      processing = pdfScan.processing;
      externalParseUsageEvents = pdfScan.parseUsageEvents;
      trackExtras = {
        fileSizeBytes: file.size,
        pageCount: pdfScan.scanResult.totalUnits,
        itemCount: pdfScan.coverage.visualAnchorUnits.length,
        metadata: {
          fileName: file.name,
          mimeType: file.type,
          parseProvider: pdfScan.processing.parseProvider,
          parseFallbackUsed: pdfScan.processing.parseFallbackUsed,
          parseElapsedMs: pdfScan.processing.parseElapsedMs,
          visualSourceAvailable: pdfScan.processing.visualSourceAvailable,
          visualAnchorUnits: pdfScan.coverage.visualAnchorUnits,
          visualAnchorCount: pdfScan.coverage.visualAnchorUnits.length,
        },
      };

      scoreOutput = await llm.generateStructured(
        buildScoringPrompt(pdfScan.promptInput, "PDF"),
        ScoreOutputSchemaForLLM,
        {
          task: "portfolio_score",
          temperature: 0.2,
          maxTokens: 1800,
          track: {
            userId: session?.user?.id ?? null,
            inputType: "pdf",
            fileSizeBytes: file.size,
            pageCount: pdfScan.scanResult.totalUnits,
            itemCount: pdfScan.coverage.visualAnchorUnits.length,
            metadata: {
              fileName: file.name,
              mimeType: file.type,
              parseProvider: pdfScan.processing.parseProvider,
              parseFallbackUsed: pdfScan.processing.parseFallbackUsed,
              visualSourceAvailable: pdfScan.processing.visualSourceAvailable,
              visualAnchorUnits: pdfScan.coverage.visualAnchorUnits,
            },
          },
        }
      );
    } else {
      const uploadedFiles = (isJson ? body?.files : null) as UploadedInputFile[] | null;
      uploadedSourcesToCleanup = getUploadedInputSources(uploadedFiles);
      const files = isJson
        ? await Promise.all((uploadedFiles ?? []).map((file) => downloadUploadedFile(file)))
        : ((formData?.getAll("files") as File[]) ?? []);
      if (files.length === 0) {
        return NextResponse.json({ error: "请上传图片" }, { status: 400 });
      }
      if (files.length > MAX_SCORE_IMAGES) {
        return NextResponse.json(
          { error: `评分入口最多上传 ${MAX_SCORE_IMAGES} 张截图` },
          { status: 400 }
        );
      }

      const totalImageSize = files.reduce((sum, file) => sum + file.size, 0);
      if (totalImageSize > MAX_SCORE_UPLOAD_SIZE) {
        return NextResponse.json(
          { error: "评分入口当前仅支持总大小 20MB 以内的截图，请压缩后重试" },
          { status: 400 }
        );
      }

      const images = await filesToImageInputs(files);
      if (images.length === 0) {
        return NextResponse.json(
          { error: "图片格式不支持，请上传 JPG / PNG / WebP" },
          { status: 400 }
        );
      }

      const imageScan = extractImageScan(files);
      coverage = imageScan.coverage;
      processing = imageScan.processing;
      trackExtras = {
        fileSizeBytes: totalImageSize,
        itemCount: images.length,
        metadata: { uploadedFileCount: files.length },
      };

      scoreOutput = await llm.generateStructuredWithImages(
        buildScoringPrompt(imageScan.promptInput, "截图"),
        images,
        ScoreOutputSchemaForLLM,
        {
          task: "portfolio_score",
          temperature: 0.2,
          maxTokens: 1800,
          track: {
            userId: session?.user?.id ?? null,
            inputType: "images",
            fileSizeBytes: totalImageSize,
            itemCount: images.length,
            metadata: {
              uploadedFileCount: files.length,
            },
          },
        }
      );
    }

    const { normalizedDimensions, wasNormalized } = normalizeScoreOutputDimensions(scoreOutput);
    if (wasNormalized) {
      console.info("[score] normalized_contribution_style_dimensions", {
        reportedTotalScore: scoreOutput.totalScore,
        rawDimensionScoreSum: computeDimensionScoreSum(scoreOutput.dimensionScores),
      });
    }

    const recalculatedTotalScore = computeTotalScoreFromDimensions(normalizedDimensions);
    const finalCoverage = enhanceCoverage(coverage, {
      ...scoreOutput,
      dimensionScores: normalizedDimensions,
    });

    const record = await db.portfolioScore.create({
      data: {
        userId: session?.user?.id ?? null,
        anonymousSessionId,
        requestIpHash,
        inputType: inputType === "link" ? "LINK" : inputType === "pdf" ? "PDF" : "IMAGES",
        inputUrl,
        totalScore: recalculatedTotalScore,
        level: getPortfolioScoreLevelFromTotalScore(recalculatedTotalScore),
        dimensionScores: normalizedDimensions as unknown as Prisma.InputJsonValue,
        coverageJson: finalCoverage as unknown as Prisma.InputJsonValue,
        processingJson: processing as unknown as Prisma.InputJsonValue,
        summaryPoints: scoreOutput.summaryPoints,
        recommendedActions: scoreOutput.recommendedActions,
      },
    });

    await Promise.all(
      externalParseUsageEvents.map((usage) =>
        persistExternalParseUsageEvent({
          usage,
          portfolioScoreId: record.id,
          userId: session?.user?.id ?? null,
        })
      )
    );

    const response = NextResponse.json({ id: record.id });
    if (!session?.user?.id && anonymousSessionId) {
      response.cookies.set(SCORE_ANONYMOUS_SESSION_COOKIE, anonymousSessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    }
    return response;
  } catch (error) {
    console.error("Score API error:", error);
    return NextResponse.json({ error: "服务器错误，请稍后重试" }, { status: 500 });
  } finally {
    if (uploadedSourcesToCleanup.length > 0) {
      await deleteFiles(uploadedSourcesToCleanup).catch((cleanupError) => {
        console.error("Score upload cleanup error:", cleanupError);
      });
    }
  }
}
