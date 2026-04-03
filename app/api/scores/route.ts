import { NextRequest, NextResponse } from "next/server";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm/openai";
import type { ImageInput } from "@/lib/llm/provider";
import { isBlobStorageUrl } from "@/lib/storage";
import {
  SCORE_ANONYMOUS_SESSION_COOKIE,
  type JudgementState,
  type ScoreCoverage,
  type ScoreProcessingMeta,
} from "@/lib/score-contract";
import {
  buildCoverage,
  buildPromptInputFromScan,
  buildScanResult,
} from "@/lib/score-processing";
import { getPortfolioScoreLevelFromTotalScore } from "@/lib/portfolio-score-level";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse") as {
  PDFParse: new (params: { data: Buffer }) => {
    getInfo: (options?: { parsePageInfo?: boolean }) => Promise<{ total?: number }>;
    getText: (options?: { partial?: number[] }) => Promise<{ text: string }>;
    getScreenshot: (options?: {
      partial?: number[];
      desiredWidth?: number;
      imageBuffer?: boolean;
    }) => Promise<{
      pages: Array<{
        data?: Uint8Array;
        dataUrl?: string;
        pageNumber: number;
        width: number;
        height: number;
        scale: number;
      }>;
      total: number;
    }>;
    destroy: () => Promise<void>;
  };
};

const MAX_SCORE_UPLOAD_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_SCORE_IMAGES = 20;
const MAX_PDF_VISUAL_ANCHORS = 8;
const PDF_VISUAL_ANCHOR_WIDTH = 800;
const ANONYMOUS_SCORE_LIMIT = 3;
const ANONYMOUS_SCORE_WINDOW_MS = 24 * 60 * 60 * 1000;

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

const ScoreOutputSchema = z.object({
  totalScore: z.number().min(0).max(100),
  level: z.enum(["ready", "needs_improvement", "draft", "not_ready"]),
  detectedProjectCount: z.number().int().min(0).max(20).optional(),
  dimensionScores: z.object({
    firstScreenProfessionalism: DimensionScoreSchema,
    scannability: DimensionScoreSchema,
    projectSelection: DimensionScoreSchema,
    roleClarity: DimensionScoreSchema,
    problemDefinition: DimensionScoreSchema,
    resultEvidence: DimensionScoreSchema,
    authenticity: DimensionScoreSchema,
    jobFit: DimensionScoreSchema,
  }),
  summaryPoints: z.array(z.string()).min(1).max(6),
  recommendedActions: z.array(z.string()).min(1).max(6),
});

type ScoreOutput = z.infer<typeof ScoreOutputSchema>;
type UploadedInputFile = {
  url: string;
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
- dimensionScores: 每个维度返回 score、comment、judgementState
- summaryPoints: 3-5 条高层问题摘要（中文，每条不超过 30 字）
- recommendedActions: 3-5 条改进建议（中文，每条不超过 30 字，可操作）`;
}

async function extractPdfScan(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: buffer });

  try {
    const info = await parser.getInfo({ parsePageInfo: true });
    const totalPages = info.total ?? 0;
    const entries: Array<{ unitNumber: number; text: string; sourceHint?: string | null }> = [];

    for (let page = 1; page <= totalPages; page += 1) {
      const pageText = await parser.getText({ partial: [page] });
      entries.push({
        unitNumber: page,
        text: normalizeText(pageText.text ?? ""),
        sourceHint: `PDF 第 ${page} 页`,
      });
    }

    const scanResult = buildScanResult({
      inputType: "pdf",
      entries,
      estimatedInputTokens: Math.round(
        entries.reduce((sum, entry) => sum + entry.text.length, 0) / 4
      ),
    });

    const initialCoverage = buildCoverage({
      scanResult,
      isFullCoverage: true,
      includeVisualAnchors: true,
      maxVisualAnchors: MAX_PDF_VISUAL_ANCHORS,
    });

    const visualAnchorImages = await extractPdfVisualAnchors(parser, initialCoverage.visualAnchorUnits);
    const coverage =
      visualAnchorImages.length > 0
        ? initialCoverage
        : {
            ...initialCoverage,
            scoringSources: initialCoverage.scoringSources.filter(
              (source) => source !== "visual_anchor_pages"
            ),
            visualAnchorUnits: [],
          };

    const processing: ScoreProcessingMeta = {
      strategy: "mvp_scan_compress_score_v1",
      scanResult,
      notes:
        visualAnchorImages.length > 0
          ? [
              `PDF 已完成整份页级文本扫描，并补充 ${visualAnchorImages.length} 页视觉锚点用于正式评分。`,
              "正式评分基于整体结构摘要、页面级摘要、项目级摘要和有限视觉锚点完成。",
            ]
          : [
              "PDF 已完成整份页级文本扫描，但当前视觉锚点生成失败，正式评分暂只基于文本结构摘要。",
              "正式评分基于整体结构摘要、页面级摘要和项目级摘要完成。",
            ],
    };

    return {
      promptInput: buildPromptInputFromScan(scanResult),
      scanResult,
      coverage,
      processing,
      visualAnchorImages,
    };
  } finally {
    await parser.destroy();
  }
}

async function extractPdfVisualAnchors(
  parser: InstanceType<typeof PDFParse>,
  visualAnchorUnits: number[]
): Promise<ImageInput[]> {
  if (visualAnchorUnits.length === 0) {
    return [];
  }

  try {
    const screenshotResult = await parser.getScreenshot({
      partial: visualAnchorUnits,
      desiredWidth: PDF_VISUAL_ANCHOR_WIDTH,
      imageBuffer: true,
    });

    return screenshotResult.pages.reduce<ImageInput[]>((images, page) => {
      if (!page.data || page.data.length === 0) {
        return images;
      }

      images.push({
        base64: Buffer.from(page.data).toString("base64"),
        mimeType: "image/png",
      });
      return images;
    }, []);
  } catch (error) {
    console.error("PDF visual anchor extraction failed:", error);
    return [];
  }
}

async function extractLinkScan(url: string) {
  const rootUrl = new URL(url);
  const queue: Array<{ url: string; depth: number }> = [{ url: rootUrl.toString(), depth: 0 }];
  const visited = new Set<string>();
  const entries: Array<{ unitNumber: number; text: string; sourceHint?: string | null }> = [];
  const maxPages = 30;
  const maxDepth = 3;
  let truncated = false;

  while (queue.length > 0 && visited.size < maxPages) {
    const current = queue.shift();
    if (!current) break;
    if (visited.has(current.url)) continue;
    visited.add(current.url);

    try {
      const response = await fetch(current.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FolioBox-Scorer/1.0)" },
        signal: AbortSignal.timeout(8000),
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

      if (current.depth >= maxDepth) continue;
      const links = extractLinks(html, new URL(current.url), rootUrl.origin);
      for (const link of links) {
        if (visited.has(link)) continue;
        if (queue.length + visited.size >= maxPages) {
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
  if (!isBlobStorageUrl(file.url)) {
    throw new Error("invalid_blob_url");
  }

  const response = await fetch(file.url);
  if (!response.ok) {
    throw new Error("blob_fetch_failed");
  }

  const buffer = await response.arrayBuffer();
  return new File([buffer], file.name, {
    type: file.type,
    lastModified: Date.now(),
  });
}

function getAnonymousSessionId(req: NextRequest) {
  return req.cookies.get(SCORE_ANONYMOUS_SESSION_COOKIE)?.value ?? null;
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

export async function POST(req: NextRequest) {
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
        ScoreOutputSchema,
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
      } catch {
        return NextResponse.json({ error: "PDF 解析失败，请确认文件未加密" }, { status: 422 });
      }

      coverage = pdfScan.coverage;
      processing = pdfScan.processing;
      trackExtras = {
        fileSizeBytes: file.size,
        pageCount: pdfScan.scanResult.totalUnits,
        itemCount: pdfScan.visualAnchorImages.length,
        metadata: {
          fileName: file.name,
          mimeType: file.type,
          visualAnchorUnits: pdfScan.coverage.visualAnchorUnits,
          visualAnchorCount: pdfScan.visualAnchorImages.length,
        },
      };

      if (pdfScan.visualAnchorImages.length > 0) {
        scoreOutput = await llm.generateStructuredWithImages(
          buildScoringPrompt(pdfScan.promptInput, "PDF"),
          pdfScan.visualAnchorImages,
          ScoreOutputSchema,
          {
            task: "portfolio_score",
            temperature: 0.2,
            maxTokens: 1800,
            track: {
              userId: session?.user?.id ?? null,
              inputType: "pdf",
              fileSizeBytes: file.size,
              pageCount: pdfScan.scanResult.totalUnits,
              itemCount: pdfScan.visualAnchorImages.length,
              metadata: {
                fileName: file.name,
                mimeType: file.type,
                visualAnchorUnits: pdfScan.coverage.visualAnchorUnits,
                visualAnchorCount: pdfScan.visualAnchorImages.length,
              },
            },
          }
        );
      } else {
        scoreOutput = await llm.generateStructured(
          buildScoringPrompt(pdfScan.promptInput, "PDF"),
          ScoreOutputSchema,
          {
            task: "portfolio_score",
            temperature: 0.2,
            maxTokens: 1800,
            track: {
              userId: session?.user?.id ?? null,
              inputType: "pdf",
              fileSizeBytes: file.size,
              pageCount: pdfScan.scanResult.totalUnits,
              metadata: {
                fileName: file.name,
                mimeType: file.type,
                visualAnchorFallback: "text_only",
              },
            },
          }
        );
      }
    } else {
      const uploadedFiles = (isJson ? body?.files : null) as UploadedInputFile[] | null;
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
        ScoreOutputSchema,
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

    const finalCoverage = enhanceCoverage(coverage, scoreOutput);

    const record = await db.portfolioScore.create({
      data: {
        userId: session?.user?.id ?? null,
        anonymousSessionId,
        requestIpHash,
        inputType: inputType === "link" ? "LINK" : inputType === "pdf" ? "PDF" : "IMAGES",
        inputUrl,
        totalScore: scoreOutput.totalScore,
        level: getPortfolioScoreLevelFromTotalScore(scoreOutput.totalScore),
        dimensionScores: scoreOutput.dimensionScores as unknown as Prisma.InputJsonValue,
        coverageJson: finalCoverage as unknown as Prisma.InputJsonValue,
        processingJson: processing as unknown as Prisma.InputJsonValue,
        summaryPoints: scoreOutput.summaryPoints,
        recommendedActions: scoreOutput.recommendedActions,
      },
    });

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
  }
}
