import { z } from "zod";
import { ProxyAgent } from "undici";
import { buildScanResult } from "@/lib/score-processing";
import type { PDFParseProvider, PDFParseResult } from "@/lib/pdf-parse/provider";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const ANTHROPIC_BASE_URL = process.env.ANTHROPIC_BASE_URL?.replace(/\/+$/, "") || "https://api.anthropic.com";
const ANTHROPIC_PDF_MODEL = process.env.ANTHROPIC_PDF_MODEL || "claude-3-5-haiku-latest";
const ANTHROPIC_PROVIDER_DISPLAY_NAME = process.env.ANTHROPIC_PROVIDER_DISPLAY_NAME || "Claude PDF";
const ANTHROPIC_PROVIDER_REGION = process.env.ANTHROPIC_PROVIDER_REGION || "global";
const ANTHROPIC_PROVIDER_NETWORK_PROFILE =
  process.env.ANTHROPIC_PROVIDER_NETWORK_PROFILE || "mainland_uncertain";
const ANTHROPIC_PROVIDER_STABILITY_TIER =
  process.env.ANTHROPIC_PROVIDER_STABILITY_TIER || "candidate";
const ANTHROPIC_INPUT_COST_PER_MTOKENS = process.env.ANTHROPIC_INPUT_COST_PER_MTOKENS || "";
const ANTHROPIC_OUTPUT_COST_PER_MTOKENS = process.env.ANTHROPIC_OUTPUT_COST_PER_MTOKENS || "";

const ClaudePageSchema = z.object({
  pageNumber: z.number().int().min(1),
  text: z.string().default(""),
  visualSummary: z.string().nullable().optional(),
});

const ClaudeParseResultSchema = z.object({
  pages: z.array(ClaudePageSchema).min(1),
});
type ClaudeParseResult = z.infer<typeof ClaudeParseResultSchema>;

const ClaudeMessagesResponseSchema = z.object({
  content: z.array(
    z.object({
      type: z.string(),
      text: z.string().optional(),
      name: z.string().optional(),
      input: z.unknown().optional(),
    })
  ),
  usage: z
    .object({
      input_tokens: z.number().int().optional(),
      output_tokens: z.number().int().optional(),
    })
    .optional(),
});

function extractJsonBlock(raw: string) {
  const objectStart = raw.indexOf("{");
  const objectEnd = raw.lastIndexOf("}");
  const arrayStart = raw.indexOf("[");
  const arrayEnd = raw.lastIndexOf("]");

  if (objectStart !== -1 && objectEnd > objectStart) {
    return raw.slice(objectStart, objectEnd + 1);
  }

  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return raw.slice(arrayStart, arrayEnd + 1);
  }

  throw new Error("claude_pdf_invalid_json");
}

function parseMaybeWrappedPages(value: unknown): ClaudeParseResult {
  const directResult = ClaudeParseResultSchema.safeParse(value);
  if (directResult.success) {
    return directResult.data;
  }

  if (Array.isArray(value)) {
    return ClaudeParseResultSchema.parse({ pages: value });
  }

  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;

    for (const key of ["result", "data", "output", "document", "payload"]) {
      const nested = candidate[key];
      const nestedResult = ClaudeParseResultSchema.safeParse(nested);
      if (nestedResult.success) {
        return nestedResult.data;
      }

      if (Array.isArray(nested)) {
        return ClaudeParseResultSchema.parse({ pages: nested });
      }
    }

    for (const key of ["json", "response", "content", "text"]) {
      const nested = candidate[key];
      if (typeof nested === "string") {
        const parsed = parseMaybeWrappedPages(JSON.parse(extractJsonBlock(nested)));
        if (parsed) {
          return parsed;
        }
      }
    }
  }

  return ClaudeParseResultSchema.parse(value);
}

function extractPagesFromClaudeResponse(
  parsed: z.infer<typeof ClaudeMessagesResponseSchema>
): ClaudeParseResult {
  const toolUse = parsed.content.find(
    (item) => item.type === "tool_use" && item.name === "submit_pdf_pages"
  );

  if (toolUse?.input) {
    try {
      return parseMaybeWrappedPages(toolUse.input);
    } catch {
      // Continue to text fallback below so minor schema drift does not force provider fallback.
    }
  }

  const rawText = parsed.content
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text ?? "")
    .join("\n");

  if (!rawText.trim()) {
    throw new Error("claude_pdf_missing_pages_payload");
  }

  return parseMaybeWrappedPages(JSON.parse(extractJsonBlock(rawText)));
}

function getProxyUrl(): string | undefined {
  return (
    process.env.ANTHROPIC_PROXY_URL ||
    process.env.HTTPS_PROXY ||
    process.env.HTTP_PROXY ||
    process.env.ALL_PROXY ||
    undefined
  );
}

function getFetch() {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) return fetch;
  const proxyAgent = new ProxyAgent(proxyUrl);
  return ((input, init) =>
    fetch(input, {
      ...(init ?? {}),
      dispatcher: proxyAgent,
    } as RequestInit & { dispatcher: ProxyAgent })) as typeof fetch;
}

function getPerMillionCost(raw: string) {
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function estimateCostUsd(usage?: { input_tokens?: number; output_tokens?: number }) {
  const inputPerM = getPerMillionCost(ANTHROPIC_INPUT_COST_PER_MTOKENS);
  const outputPerM = getPerMillionCost(ANTHROPIC_OUTPUT_COST_PER_MTOKENS);
  if (!usage || inputPerM === null || outputPerM === null) return null;

  const inputCost = ((usage.input_tokens ?? 0) / 1_000_000) * inputPerM;
  const outputCost = ((usage.output_tokens ?? 0) / 1_000_000) * outputPerM;
  return Number((inputCost + outputCost).toFixed(6));
}

function buildPrompt() {
  return [
    "请阅读整份 PDF 作品集，并按页返回极简结构化结果。",
    "要求：",
    "1. 直接输出 JSON，不要输出 markdown 代码块，不要附加解释。",
    "2. text 需要概括当前页的主要文字内容与信息点，尽量保留角色、项目、结果等关键信息。",
    "3. visualSummary 只在当前页存在明显视觉结构时填写，例如标题层级、表格、图表、强视觉主元素；没有就填 null。",
    "4. 必须覆盖整份 PDF 的每一页，pageNumber 从 1 开始连续编号。",
    "5. 每页 text 保持简洁，控制在 120 字以内。",
    '6. 输出格式必须严格为：{"pages":[{"pageNumber":1,"text":"...","visualSummary":null}]}',
  ].join("\n");
}

export class ClaudePDFParseProvider implements PDFParseProvider {
  name = "claude_pdf" as const;
  profile = {
    displayName: ANTHROPIC_PROVIDER_DISPLAY_NAME,
    region: ANTHROPIC_PROVIDER_REGION,
    networkProfile: ANTHROPIC_PROVIDER_NETWORK_PROFILE,
    stabilityTier: ANTHROPIC_PROVIDER_STABILITY_TIER,
  } as const;

  async parse(file: File): Promise<PDFParseResult> {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }

    const startedAt = Date.now();
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Source = buffer.toString("base64");

    const response = await getFetch()(`${ANTHROPIC_BASE_URL}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: ANTHROPIC_PDF_MODEL,
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Source,
                },
              },
              {
                type: "text",
                text: buildPrompt(),
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`claude_pdf_failed:${response.status}:${raw.slice(0, 500)}`);
    }

    const parsed = ClaudeMessagesResponseSchema.parse(await response.json());
    const result = extractPagesFromClaudeResponse(parsed);
    const rawText = parsed.content
      .filter((item) => item.type === "text" && typeof item.text === "string")
      .map((item) => item.text ?? "")
      .join("\n");

    const scanResult = buildScanResult({
      inputType: "pdf",
      entries: result.pages.map((page) => ({
        unitNumber: page.pageNumber,
        text: page.text,
        sourceHint: `PDF 第 ${page.pageNumber} 页`,
        visualSummary: page.visualSummary ?? null,
      })),
      estimatedInputTokens: parsed.usage?.input_tokens ?? undefined,
    });

    return {
      provider: this.name,
      providerProfile: this.profile,
      scanResult,
      pageCount: result.pages.length,
      visualSourceAvailable: result.pages.some((page) => !!page.visualSummary),
      parseElapsedMs: Date.now() - startedAt,
      estimatedCostUsd: estimateCostUsd(parsed.usage),
      metadata: {
        model: ANTHROPIC_PDF_MODEL,
        usage: parsed.usage ?? null,
        contentBlockTypes: parsed.content.map((item) => item.type),
        rawTextPreview: rawText.slice(0, 500),
        providerProfile: this.profile,
      },
    };
  }
}
