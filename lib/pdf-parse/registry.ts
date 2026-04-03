import type { PDFParseProvider, PDFParseProviderName } from "@/lib/pdf-parse/provider";
import { AzureDocumentIntelligencePDFParseProvider } from "@/lib/pdf-parse/azure";
import { ClaudePDFParseProvider } from "@/lib/pdf-parse/claude";
import { MistralPDFParseProvider } from "@/lib/pdf-parse/mistral";
import { LocalPDFParseProvider } from "@/lib/pdf-parse/local";

const DEFAULT_PROVIDER_CHAIN: PDFParseProviderName[] = [
  "mistral_ocr",
  "pdf_parse_fallback",
  "claude_pdf",
  "azure_doc_intelligence",
];

function parseProviderName(value: string): PDFParseProviderName | null {
  if (
    value === "azure_doc_intelligence" ||
    value === "claude_pdf" ||
    value === "mistral_ocr" ||
    value === "pdf_parse_fallback"
  ) {
    return value;
  }
  return null;
}

function buildProviderMap() {
  const providers: PDFParseProvider[] = [
    new AzureDocumentIntelligencePDFParseProvider(),
    new ClaudePDFParseProvider(),
    new MistralPDFParseProvider(),
    new LocalPDFParseProvider(),
  ];
  return new Map(providers.map((provider) => [provider.name, provider]));
}

export function getConfiguredPDFParseProviders() {
  const providerMap = buildProviderMap();
  const configuredChain = (process.env.PDF_PARSE_PROVIDER_CHAIN || process.env.PDF_PARSE_PRIMARY_PROVIDER || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map(parseProviderName)
    .filter((value): value is PDFParseProviderName => value !== null);

  const chainNames = configuredChain.length > 0 ? configuredChain : DEFAULT_PROVIDER_CHAIN;
  if (!chainNames.includes("pdf_parse_fallback")) {
    chainNames.push("pdf_parse_fallback");
  }

  const providers = Array.from(new Set(chainNames))
    .map((name) => providerMap.get(name))
    .filter((provider): provider is PDFParseProvider => !!provider);

  if (providers.length === 0) {
    throw new Error("No PDF parse providers configured");
  }

  return providers;
}
