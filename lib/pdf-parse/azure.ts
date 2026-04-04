import { z } from "zod";
import { buildScanResult } from "@/lib/score-processing";
import type { PDFParseProvider, PDFParseResult } from "@/lib/pdf-parse/provider";
import { isRunningOnVercel } from "@/lib/runtime-target";

const IS_VERCEL = isRunningOnVercel();
const AZURE_DOCINTEL_SUBMIT_TIMEOUT_MS = Number(
  process.env.AZURE_DOCINTEL_SUBMIT_TIMEOUT_MS || (IS_VERCEL ? "20000" : "60000")
) || (IS_VERCEL ? 20_000 : 60_000);
const AZURE_DOCINTEL_POLL_TIMEOUT_MS = Number(
  process.env.AZURE_DOCINTEL_POLL_TIMEOUT_MS || (IS_VERCEL ? "10000" : "30000")
) || (IS_VERCEL ? 10_000 : 30_000);
const AZURE_DOCINTEL_POLL_DEADLINE_MS = Number(
  process.env.AZURE_DOCINTEL_POLL_DEADLINE_MS || (IS_VERCEL ? "30000" : "90000")
) || (IS_VERCEL ? 30_000 : 90_000);
const AZURE_DOCINTEL_ENDPOINT = process.env.AZURE_DOCINTEL_ENDPOINT?.replace(/\/+$/, "") || "";
const AZURE_DOCINTEL_API_KEY = process.env.AZURE_DOCINTEL_API_KEY || "";
const AZURE_DOCINTEL_MODEL_ID = process.env.AZURE_DOCINTEL_MODEL_ID || "prebuilt-layout";
const AZURE_DOCINTEL_API_VERSION = process.env.AZURE_DOCINTEL_API_VERSION || "2024-11-30";
const AZURE_DOCINTEL_PROVIDER_DISPLAY_NAME =
  process.env.AZURE_DOCINTEL_PROVIDER_DISPLAY_NAME || "Azure Document Intelligence";
const AZURE_DOCINTEL_PROVIDER_REGION = process.env.AZURE_DOCINTEL_PROVIDER_REGION || "global";
const AZURE_DOCINTEL_PROVIDER_NETWORK_PROFILE =
  process.env.AZURE_DOCINTEL_PROVIDER_NETWORK_PROFILE || "mainland_uncertain";
const AZURE_DOCINTEL_PROVIDER_STABILITY_TIER =
  process.env.AZURE_DOCINTEL_PROVIDER_STABILITY_TIER || "candidate";
const AZURE_DOCINTEL_ESTIMATED_COST_PER_PAGE_USD =
  process.env.AZURE_DOCINTEL_ESTIMATED_COST_PER_PAGE_USD || "";

const AnalyzePageSchema = z.object({
  pageNumber: z.number().int(),
  lines: z
    .array(
      z.object({
        content: z.string().optional().default(""),
      })
    )
    .optional()
    .default([]),
});

const AnalyzeParagraphSchema = z.object({
  role: z.string().optional().nullable(),
  content: z.string().optional().default(""),
  boundingRegions: z
    .array(
      z.object({
        pageNumber: z.number().int(),
      })
    )
    .optional()
    .default([]),
});

const AnalyzeTableSchema = z.object({
  rowCount: z.number().int().optional(),
  columnCount: z.number().int().optional(),
  boundingRegions: z
    .array(
      z.object({
        pageNumber: z.number().int(),
      })
    )
    .optional()
    .default([]),
});

const AnalyzeResultSchema = z.object({
  content: z.string().optional().default(""),
  pages: z.array(AnalyzePageSchema).optional().default([]),
  paragraphs: z.array(AnalyzeParagraphSchema).optional().default([]),
  tables: z.array(AnalyzeTableSchema).optional().default([]),
});

const AnalyzeOperationSchema = z.object({
  status: z.string(),
  analyzeResult: AnalyzeResultSchema.optional(),
});

function getEstimatedCostPerPage() {
  const value = Number(AZURE_DOCINTEL_ESTIMATED_COST_PER_PAGE_USD);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function summarizePageVisualSignals(params: {
  paragraphRoles: string[];
  tableCount: number;
  lineCount: number;
}) {
  const parts: string[] = [];
  const headingCount = params.paragraphRoles.filter((role) =>
    ["title", "sectionHeading", "pageHeader"].includes(role)
  ).length;
  if (headingCount > 0) parts.push(`标题层级 ${headingCount} 处`);
  if (params.tableCount > 0) parts.push(`表格 ${params.tableCount} 个`);
  if (params.lineCount >= 20) parts.push("文本密度较高");
  return parts.length > 0 ? parts.join("，") : null;
}

async function pollAnalyzeResult(operationLocation: string) {
  const deadline = Date.now() + AZURE_DOCINTEL_POLL_DEADLINE_MS;

  while (Date.now() < deadline) {
    const response = await fetch(operationLocation, {
      method: "GET",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_DOCINTEL_API_KEY,
      },
      signal: AbortSignal.timeout(AZURE_DOCINTEL_POLL_TIMEOUT_MS),
    });

    if (!response.ok) {
      const raw = await response.text();
      throw new Error(`azure_docintel_poll_failed:${response.status}:${raw.slice(0, 500)}`);
    }

    const parsed = AnalyzeOperationSchema.parse(await response.json());
    const status = parsed.status.toLowerCase();

    if (status === "succeeded") {
      if (!parsed.analyzeResult) {
        throw new Error("azure_docintel_missing_analyze_result");
      }
      return parsed.analyzeResult;
    }

    if (status === "failed" || status === "error" || status === "partiallySucceeded".toLowerCase()) {
      throw new Error(`azure_docintel_status_${parsed.status}`);
    }

    await sleep(2000);
  }

  throw new Error("azure_docintel_timeout");
}

export class AzureDocumentIntelligencePDFParseProvider implements PDFParseProvider {
  name = "azure_doc_intelligence" as const;
  profile = {
    displayName: AZURE_DOCINTEL_PROVIDER_DISPLAY_NAME,
    region: AZURE_DOCINTEL_PROVIDER_REGION,
    networkProfile: AZURE_DOCINTEL_PROVIDER_NETWORK_PROFILE,
    stabilityTier: AZURE_DOCINTEL_PROVIDER_STABILITY_TIER,
  } as const;

  async parse(file: File): Promise<PDFParseResult> {
    if (!AZURE_DOCINTEL_ENDPOINT) {
      throw new Error("AZURE_DOCINTEL_ENDPOINT is not set");
    }
    if (!AZURE_DOCINTEL_API_KEY) {
      throw new Error("AZURE_DOCINTEL_API_KEY is not set");
    }

    const startedAt = Date.now();
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Source = buffer.toString("base64");

    const analyzeUrl = new URL(
      `${AZURE_DOCINTEL_ENDPOINT}/documentintelligence/documentModels/${AZURE_DOCINTEL_MODEL_ID}:analyze`
    );
    analyzeUrl.searchParams.set("_overload", "analyzeDocument");
    analyzeUrl.searchParams.set("api-version", AZURE_DOCINTEL_API_VERSION);

    const response = await fetch(analyzeUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": AZURE_DOCINTEL_API_KEY,
      },
      body: JSON.stringify({
        base64Source,
      }),
      signal: AbortSignal.timeout(AZURE_DOCINTEL_SUBMIT_TIMEOUT_MS),
    });

    if (!(response.ok || response.status === 202)) {
      const raw = await response.text();
      throw new Error(`azure_docintel_submit_failed:${response.status}:${raw.slice(0, 500)}`);
    }

    let analyzeResult;
    if (response.status === 202) {
      const operationLocation = response.headers.get("operation-location");
      if (!operationLocation) {
        throw new Error("azure_docintel_missing_operation_location");
      }
      analyzeResult = await pollAnalyzeResult(operationLocation);
    } else {
      const direct = AnalyzeOperationSchema.parse(await response.json());
      if (!direct.analyzeResult) {
        throw new Error("azure_docintel_missing_analyze_result");
      }
      analyzeResult = direct.analyzeResult;
    }

    const pages = analyzeResult.pages ?? [];
    const paragraphs = analyzeResult.paragraphs ?? [];
    const tables = analyzeResult.tables ?? [];

    const entries = pages.map((page) => {
      const pageParagraphs = paragraphs.filter((paragraph) =>
        paragraph.boundingRegions.some((region) => region.pageNumber === page.pageNumber)
      );
      const pageTables = tables.filter((table) =>
        table.boundingRegions.some((region) => region.pageNumber === page.pageNumber)
      );
      const lineText = page.lines.map((line) => line.content).filter(Boolean).join("\n");
      const paragraphText = pageParagraphs.map((paragraph) => paragraph.content).filter(Boolean).join("\n");
      const mergedText = normalizeText([paragraphText, lineText].filter(Boolean).join("\n"));

      return {
        unitNumber: page.pageNumber,
        text: mergedText || normalizeText(analyzeResult.content),
        sourceHint: `PDF 第 ${page.pageNumber} 页`,
        visualSummary: summarizePageVisualSignals({
          paragraphRoles: pageParagraphs
            .map((paragraph) => paragraph.role)
            .filter((role): role is string => typeof role === "string" && role.length > 0),
          tableCount: pageTables.length,
          lineCount: page.lines.length,
        }),
      };
    });

    const scanResult = buildScanResult({
      inputType: "pdf",
      entries,
      estimatedInputTokens: Math.round(
        entries.reduce((sum, entry) => sum + entry.text.length, 0) / 4
      ),
    });

    const estimatedCostPerPage = getEstimatedCostPerPage();
    const estimatedCostUsd =
      estimatedCostPerPage !== null
        ? Number((scanResult.totalUnits * estimatedCostPerPage).toFixed(6))
        : null;

    return {
      provider: this.name,
      providerProfile: this.profile,
      scanResult,
      pageCount: scanResult.totalUnits,
      visualSourceAvailable: entries.some((entry) => !!entry.visualSummary),
      parseElapsedMs: Date.now() - startedAt,
      estimatedCostUsd,
      metadata: {
        modelId: AZURE_DOCINTEL_MODEL_ID,
        apiVersion: AZURE_DOCINTEL_API_VERSION,
        paragraphCount: paragraphs.length,
        tableCount: tables.length,
        providerProfile: this.profile,
      },
    };
  }
}
