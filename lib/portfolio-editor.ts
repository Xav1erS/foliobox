import type { StyleProfile } from "@/lib/style-reference-presets";

export type FixedPageId = "cover" | "about" | "closing";

export type FixedPageConfig = {
  id: FixedPageId;
  label: string;
  enabled: boolean;
};

export type PortfolioDiagnosisCheck = {
  key: string;
  label: string;
  status: "strong" | "adequate" | "weak" | "missing";
  comment: string;
};

export type PortfolioDiagnosis = {
  overallVerdict: "ready" | "almost_ready" | "needs_work" | "insufficient";
  summary: string;
  checks: PortfolioDiagnosisCheck[];
  suggestions: string[];
  updatedAt: string;
};

export type PortfolioPackagingPage = {
  id: string;
  type: "fixed" | "project";
  pageRole: string;
  title: string;
  summary: string;
  projectId?: string;
  pageCountSuggestion: string;
};

export type PortfolioPackagingContent = {
  narrativeSummary: string;
  pages: PortfolioPackagingPage[];
  qualityNotes: string[];
  generatedAt: string;
  styleProfile?: StyleProfile;
};

export type PortfolioEditorState = {
  fixedPages: FixedPageConfig[];
  diagnosis: PortfolioDiagnosis | null;
};

export const DEFAULT_FIXED_PAGES: FixedPageConfig[] = [
  { id: "cover", label: "封面", enabled: true },
  { id: "about", label: "关于我", enabled: true },
  { id: "closing", label: "结尾页", enabled: true },
];

export function resolvePortfolioEditorState(outlineJson: unknown): PortfolioEditorState {
  const raw = (outlineJson ?? {}) as {
    fixedPages?: FixedPageConfig[];
    diagnosis?: PortfolioDiagnosis | null;
  };

  const fixedPages =
    raw.fixedPages && raw.fixedPages.length > 0
      ? DEFAULT_FIXED_PAGES.map((defaultPage) => {
          const matched = raw.fixedPages?.find((page) => page.id === defaultPage.id);
          return matched
            ? {
                id: defaultPage.id,
                label: matched.label || defaultPage.label,
                enabled: matched.enabled,
              }
            : defaultPage;
        })
      : DEFAULT_FIXED_PAGES;

  return {
    fixedPages,
    diagnosis: raw.diagnosis ?? null,
  };
}

export function mergePortfolioEditorState(
  outlineJson: unknown,
  patch: Partial<PortfolioEditorState>
): PortfolioEditorState {
  const current = resolvePortfolioEditorState(outlineJson);
  return {
    fixedPages: patch.fixedPages ?? current.fixedPages,
    diagnosis:
      patch.diagnosis === undefined ? current.diagnosis : patch.diagnosis,
  };
}
