import type { ScoreInputScanResult } from "@/lib/score-contract";

export type PDFParseProviderName =
  | "azure_doc_intelligence"
  | "claude_pdf"
  | "mistral_ocr"
  | "pdf_parse_fallback";

export interface PDFParseProviderProfile {
  displayName: string;
  region: string | null;
  networkProfile: string | null;
  stabilityTier: string | null;
}

export interface PDFParseResult {
  provider: PDFParseProviderName;
  providerProfile: PDFParseProviderProfile;
  scanResult: ScoreInputScanResult;
  pageCount: number;
  visualSourceAvailable: boolean;
  parseElapsedMs: number;
  estimatedCostUsd: number | null;
  metadata?: Record<string, unknown> | null;
}

export interface PDFParseProvider {
  name: PDFParseProviderName;
  profile: PDFParseProviderProfile;
  parse(file: File): Promise<PDFParseResult>;
}

export interface ExternalParseUsageMeta {
  provider: PDFParseProviderName;
  providerProfile?: PDFParseProviderProfile | null;
  success: boolean;
  elapsedMs: number;
  pageCount: number | null;
  estimatedCostUsd: number | null;
  fileSizeBytes: number | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
}
