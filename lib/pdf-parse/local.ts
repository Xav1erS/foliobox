import { createRequire } from "node:module";
import { buildScanResult } from "@/lib/score-processing";
import type { PDFParseProvider, PDFParseResult } from "@/lib/pdf-parse/provider";

const PDF_WORKER_GLOBAL_READY = import("@/vendor/pdf-parse/pdf.worker.mjs").catch((error) => {
  console.warn("Unable to preload pdf.worker.mjs into the server runtime:", error);
  return null;
});

if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixStub {}
  (globalThis as typeof globalThis & { DOMMatrix: typeof DOMMatrix }).DOMMatrix =
    DOMMatrixStub as unknown as typeof DOMMatrix;
}

if (typeof globalThis.ImageData === "undefined") {
  class ImageDataStub {}
  (globalThis as typeof globalThis & { ImageData: typeof ImageData }).ImageData =
    ImageDataStub as unknown as typeof ImageData;
}

if (typeof globalThis.Path2D === "undefined") {
  class Path2DStub {}
  (globalThis as typeof globalThis & { Path2D: typeof Path2D }).Path2D =
    Path2DStub as unknown as typeof Path2D;
}

const require = createRequire(import.meta.url);

type PDFParseInstance = {
  getInfo: (options?: { parsePageInfo?: boolean }) => Promise<{ total?: number }>;
  getText: (options?: { partial?: number[] }) => Promise<{ text: string }>;
  destroy: () => Promise<void>;
};

type PDFParseClass = {
  new (params: { data: Buffer }): PDFParseInstance;
};

const { PDFParse } = require("pdf-parse") as {
  PDFParse: PDFParseClass;
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export class LocalPDFParseProvider implements PDFParseProvider {
  name = "pdf_parse_fallback" as const;
  profile = {
    displayName: "本地 PDF 解析 fallback",
    region: "server_runtime",
    networkProfile: "local_fallback",
    stabilityTier: "fallback",
  } as const;

  async parse(file: File): Promise<PDFParseResult> {
    const startedAt = Date.now();
    await PDF_WORKER_GLOBAL_READY;

    const buffer = Buffer.from(await file.arrayBuffer());
    const parser = new PDFParse({ data: buffer });

    try {
      const info = await parser.getInfo({ parsePageInfo: true });
      const totalPages = info.total ?? 0;
      let usedFullDocumentFallback = false;
      let entries: Array<{
        unitNumber: number;
        text: string;
        sourceHint?: string | null;
        visualSummary?: string | null;
      }> = [];

      try {
        for (let page = 1; page <= totalPages; page += 1) {
          const pageText = await parser.getText({ partial: [page] });
          entries.push({
            unitNumber: page,
            text: normalizeText(pageText.text ?? ""),
            sourceHint: `PDF 第 ${page} 页`,
            visualSummary: null,
          });
        }
      } catch (pageLevelError) {
        console.warn(
          "PDF page-level scan failed, falling back to full-document extraction:",
          pageLevelError
        );
        usedFullDocumentFallback = true;
        const fullText = await parser.getText();
        entries = [
          {
            unitNumber: 1,
            text: normalizeText(fullText.text ?? ""),
            sourceHint:
              totalPages > 0 ? `PDF 全文提取（共 ${totalPages} 页）` : "PDF 全文提取",
            visualSummary: null,
          },
        ];
      }

      const scanResult = buildScanResult({
        inputType: "pdf",
        entries,
        estimatedInputTokens: Math.round(
          entries.reduce((sum, entry) => sum + entry.text.length, 0) / 4
        ),
      });

      return {
        provider: this.name,
        providerProfile: this.profile,
        scanResult,
        pageCount: totalPages || scanResult.totalUnits,
        visualSourceAvailable: false,
        parseElapsedMs: Date.now() - startedAt,
        estimatedCostUsd: null,
        metadata: {
          usedFullDocumentFallback,
          fileName: file.name,
          mimeType: file.type,
          providerProfile: this.profile,
        },
      };
    } finally {
      await parser.destroy();
    }
  }
}
