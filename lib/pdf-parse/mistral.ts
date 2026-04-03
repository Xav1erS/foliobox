import { z } from "zod";
import { buildScanResult } from "@/lib/score-processing";
import type { PDFParseProvider, PDFParseResult } from "@/lib/pdf-parse/provider";

const MISTRAL_BASE_URL = process.env.MISTRAL_BASE_URL?.replace(/\/+$/, "") || "https://api.mistral.ai";
const MISTRAL_OCR_MODEL = process.env.MISTRAL_OCR_MODEL || "mistral-ocr-latest";
const MISTRAL_PROVIDER_DISPLAY_NAME = process.env.MISTRAL_PROVIDER_DISPLAY_NAME || "Mistral OCR";
const MISTRAL_PROVIDER_REGION = process.env.MISTRAL_PROVIDER_REGION || "global";
const MISTRAL_PROVIDER_NETWORK_PROFILE =
  process.env.MISTRAL_PROVIDER_NETWORK_PROFILE || "mainland_uncertain";
const MISTRAL_PROVIDER_STABILITY_TIER =
  process.env.MISTRAL_PROVIDER_STABILITY_TIER || "candidate";

const MistralOCRResponseSchema = z.object({
  pages: z.array(
    z.object({
      index: z.number().int().optional().default(0),
      markdown: z.string().optional().default(""),
      images: z.array(z.unknown()).optional().default([]),
      tables: z.array(z.unknown()).optional().default([]),
      hyperlinks: z.array(z.unknown()).optional().default([]),
      header: z.string().nullable().optional(),
      footer: z.string().nullable().optional(),
    })
  ),
  model: z.string().optional(),
  usage_info: z.record(z.unknown()).optional(),
});

function getEstimatedCostPerPage() {
  const raw = process.env.MISTRAL_OCR_ESTIMATED_COST_PER_PAGE_USD;
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function summarizeVisualSignals(page: {
  markdown: string;
  images: unknown[];
  tables: unknown[];
  hyperlinks: unknown[];
}) {
  const imagePlaceholders = (page.markdown.match(/!\[img-[^\]]+\]\([^)]+\)/g) ?? []).length;
  const tablePlaceholders = (page.markdown.match(/\[tbl-[^\]]+\]\([^)]+\)/g) ?? []).length;
  const imageCount = Math.max(page.images.length, imagePlaceholders);
  const tableCount = Math.max(page.tables.length, tablePlaceholders);
  const hyperlinkCount = page.hyperlinks.length;

  const parts: string[] = [];
  if (imageCount > 0) parts.push(`图片元素 ${imageCount} 个`);
  if (tableCount > 0) parts.push(`表格 ${tableCount} 个`);
  if (hyperlinkCount > 0) parts.push(`链接 ${hyperlinkCount} 个`);

  return parts.length > 0 ? parts.join("，") : null;
}

export class MistralPDFParseProvider implements PDFParseProvider {
  name = "mistral_ocr" as const;
  profile = {
    displayName: MISTRAL_PROVIDER_DISPLAY_NAME,
    region: MISTRAL_PROVIDER_REGION,
    networkProfile: MISTRAL_PROVIDER_NETWORK_PROFILE,
    stabilityTier: MISTRAL_PROVIDER_STABILITY_TIER,
  } as const;

  async parse(file: File): Promise<PDFParseResult> {
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      throw new Error("MISTRAL_API_KEY is not set");
    }

    const startedAt = Date.now();
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Pdf = buffer.toString("base64");

    const response = await fetch(`${MISTRAL_BASE_URL}/v1/ocr`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MISTRAL_OCR_MODEL,
        document: {
          type: "document_url",
          document_url: `data:application/pdf;base64,${base64Pdf}`,
        },
        include_image_base64: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`mistral_ocr_failed:${response.status}:${raw.slice(0, 500)}`);
    }

    const json = await response.json();
    const parsed = MistralOCRResponseSchema.parse(json);
    const entries = parsed.pages.map((page, index) => ({
      unitNumber: (page.index ?? index) + 1,
      text: [page.header, page.markdown, page.footer].filter(Boolean).join("\n"),
      sourceHint: `PDF 第 ${(page.index ?? index) + 1} 页`,
      visualSummary: summarizeVisualSignals(page),
    }));

    const scanResult = buildScanResult({
      inputType: "pdf",
      entries,
      estimatedInputTokens: Math.round(
        entries.reduce((sum, entry) => sum + entry.text.length, 0) / 4
      ),
    });

    const estimatedCostPerPage = getEstimatedCostPerPage();
    const estimatedCostUsd =
      estimatedCostPerPage !== null ? Number((scanResult.totalUnits * estimatedCostPerPage).toFixed(6)) : null;

    return {
      provider: this.name,
      providerProfile: this.profile,
      scanResult,
      pageCount: scanResult.totalUnits,
      visualSourceAvailable: entries.some((entry) => !!entry.visualSummary),
      parseElapsedMs: Date.now() - startedAt,
      estimatedCostUsd,
      metadata: {
        model: parsed.model ?? MISTRAL_OCR_MODEL,
        usageInfo: parsed.usage_info ?? null,
        providerProfile: this.profile,
      },
    };
  }
}
