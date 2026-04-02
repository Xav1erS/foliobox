import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
// pdf-parse is CommonJS, must use require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { llm } from "@/lib/llm/openai";
import type { ImageInput } from "@/lib/llm/provider";
import { getPortfolioScoreLevelFromTotalScore } from "@/lib/portfolio-score-level";

// ─── Zod schema for LLM output ───────────────────────────────────────────────

const DimensionScoreSchema = z.object({
  score: z.number().min(0).max(100),
  comment: z.string(),
});

const ScoreOutputSchema = z.object({
  totalScore: z.number().min(0).max(100),
  level: z.enum(["ready", "needs_improvement", "draft", "not_ready"]),
  dimensionScores: z.object({
    firstScreenProfessionalism: DimensionScoreSchema, // 首屏专业感 15分
    scannability: DimensionScoreSchema,               // 可扫描性 15分
    projectSelection: DimensionScoreSchema,           // 项目选择质量 10分
    roleClarity: DimensionScoreSchema,                // 角色清晰度 15分
    problemDefinition: DimensionScoreSchema,          // 问题定义与设计判断 20分
    resultEvidence: DimensionScoreSchema,             // 结果与价值证明 15分
    authenticity: DimensionScoreSchema,               // 真实性与可信度 5分
    jobFit: DimensionScoreSchema,                     // 投递适配度 5分
  }),
  summaryPoints: z.array(z.string()).min(1).max(6),
  recommendedActions: z.array(z.string()).min(1).max(6),
});

type ScoreOutput = z.infer<typeof ScoreOutputSchema>;

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildScoringPrompt(content: string, inputType: string): string {
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

## 作品集内容（来源：${inputType}）

${content}

## 输出要求

按 JSON 输出，字段说明：
- totalScore: 综合总分（0-100），按各维度满分比例加权计算
- level: "ready" | "needs_improvement" | "draft" | "not_ready"
- dimensionScores: 每个维度的 score（0-100，代表该维度得分占满分的百分比）和 comment（1-2 句中文说明）
- summaryPoints: 3-5 条高层问题摘要（中文，每条不超过 30 字）
- recommendedActions: 3-5 条改进建议（中文，每条不超过 30 字，可操作）`;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function extractPdfText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await pdfParse(buffer);
  return result.text.slice(0, 12000); // ~3000 tokens
}

async function filesToImageInputs(files: File[]): Promise<ImageInput[]> {
  const inputs: ImageInput[] = [];
  for (const file of files.slice(0, 10)) { // cap at 10 images
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = file.type as ImageInput["mimeType"];
    if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mimeType)) {
      inputs.push({ base64, mimeType });
    }
  }
  return inputs;
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    const formData = await req.formData();
    const inputType = formData.get("inputType") as string;

    if (!["link", "pdf", "images"].includes(inputType)) {
      return NextResponse.json({ error: "无效的输入类型" }, { status: 400 });
    }

    let contentForLLM = "";
    let inputUrl: string | null = null;
    let scoreOutput: ScoreOutput;

    if (inputType === "link") {
      const url = formData.get("inputUrl") as string;
      if (!url) return NextResponse.json({ error: "请提供链接" }, { status: 400 });

      // SSRF protection: only allow public HTTP/HTTPS URLs
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return NextResponse.json({ error: "链接格式无效" }, { status: 400 });
        }
        const blocked = ["localhost", "127.0.0.1", "0.0.0.0", "169.254.169.254", "::1"];
        if (blocked.some((h) => parsed.hostname === h || parsed.hostname.endsWith(".local"))) {
          return NextResponse.json({ error: "链接格式无效" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "链接格式无效" }, { status: 400 });
      }

      inputUrl = url;

      // Attempt to fetch page text for scoring
      try {
        const pageRes = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; FolioBox-Scorer/1.0)" },
          signal: AbortSignal.timeout(8000),
        });
        const html = await pageRes.text();
        // Strip tags, collapse whitespace
        const text = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 12000);
        contentForLLM = `作品集链接：${url}\n\n页面文本内容：\n${text}`;
      } catch {
        // Fallback: tell LLM only the URL (degraded but still useful)
        contentForLLM = `作品集链接：${url}\n\n（无法抓取页面内容，请根据 URL 域名和结构推断作品集类型，给出通用结构性建议，并在 summaryPoints 中提示用户改用 PDF 或截图以获得更准确评分。）`;
      }

      const prompt = buildScoringPrompt(contentForLLM, "链接");
      scoreOutput = await llm.generateStructured(prompt, ScoreOutputSchema, {
        task: "portfolio_score",
        temperature: 0.2,
        maxTokens: 1500,
      });

    } else if (inputType === "pdf") {
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "请上传 PDF" }, { status: 400 });

      let pdfText: string;
      try {
        pdfText = await extractPdfText(file);
      } catch {
        return NextResponse.json({ error: "PDF 解析失败，请确认文件未加密" }, { status: 422 });
      }

      contentForLLM = `PDF 文件名：${file.name}\n\n提取文本内容：\n${pdfText}`;
      const prompt = buildScoringPrompt(contentForLLM, "PDF");
      scoreOutput = await llm.generateStructured(prompt, ScoreOutputSchema, {
        task: "portfolio_score",
        temperature: 0.2,
        maxTokens: 1500,
      });

    } else {
      // images — use vision model
      const files = formData.getAll("files") as File[];
      if (files.length === 0) return NextResponse.json({ error: "请上传图片" }, { status: 400 });

      const images = await filesToImageInputs(files);
      if (images.length === 0) {
        return NextResponse.json({ error: "图片格式不支持，请上传 JPG / PNG / WebP" }, { status: 400 });
      }

      const prompt = buildScoringPrompt(
        `用户上传了 ${images.length} 张作品集截图，请仔细观察每张图片的内容进行评分。`,
        "截图"
      );
      scoreOutput = await llm.generateStructuredWithImages(prompt, images, ScoreOutputSchema, {
        task: "portfolio_score",
        temperature: 0.2,
        maxTokens: 1500,
      });
    }

    // Persist to DB
    const record = await db.portfolioScore.create({
      data: {
        userId: session?.user?.id ?? null,
        inputType: inputType === "link" ? "LINK" : inputType === "pdf" ? "PDF" : "IMAGES",
        inputUrl,
        totalScore: scoreOutput.totalScore,
        level: getPortfolioScoreLevelFromTotalScore(scoreOutput.totalScore),
        dimensionScores: scoreOutput.dimensionScores,
        summaryPoints: scoreOutput.summaryPoints,
        recommendedActions: scoreOutput.recommendedActions,
      },
    });

    return NextResponse.json({ id: record.id });
  } catch (err) {
    console.error("Score API error:", err);
    return NextResponse.json({ error: "服务器错误，请稍后重试" }, { status: 500 });
  }
}
