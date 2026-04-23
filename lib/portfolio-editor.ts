import { z } from "zod";
import type { StyleProfile } from "./style-reference-presets";

export type FixedPageId = "cover" | "about" | "closing";

export const FixedPageConfigSchema = z.object({
  id: z.enum(["cover", "about", "closing"]),
  label: z.string(),
  enabled: z.boolean(),
});

export type FixedPageConfig = z.infer<typeof FixedPageConfigSchema>;

export const PortfolioDiagnosisCheckSchema = z.object({
  key: z.string(),
  label: z.string(),
  status: z.enum(["strong", "adequate", "weak", "missing"]),
  comment: z.string(),
});

export type PortfolioDiagnosisCheck = z.infer<typeof PortfolioDiagnosisCheckSchema>;

export const PortfolioDiagnosisSchema = z.object({
  overallVerdict: z.enum(["ready", "almost_ready", "needs_work", "insufficient"]),
  summary: z.string(),
  checks: z.array(PortfolioDiagnosisCheckSchema),
  suggestions: z.array(z.string()),
  updatedAt: z.string(),
});

export type PortfolioDiagnosis = z.infer<typeof PortfolioDiagnosisSchema>;

export const PORTFOLIO_PROJECT_STATUSES = ["pass", "warn", "block", "review"] as const;
export type PortfolioProjectStatus = (typeof PORTFOLIO_PROJECT_STATUSES)[number];
export const PortfolioProjectStatusSchema = z.enum(PORTFOLIO_PROJECT_STATUSES);

export const PORTFOLIO_VALIDATION_STATES = [
  "unknown",
  "pass",
  "pass_with_notes",
  "not_ready",
] as const;
export type PortfolioValidationState = (typeof PORTFOLIO_VALIDATION_STATES)[number];
export const PortfolioValidationStateSchema = z.enum(PORTFOLIO_VALIDATION_STATES);

export const PORTFOLIO_VALIDATION_VERDICTS = [
  "可发布",
  "可发布，但建议先补充",
  "暂不建议发布",
] as const;
export type PortfolioValidationVerdict = (typeof PORTFOLIO_VALIDATION_VERDICTS)[number];
export const PortfolioValidationVerdictSchema = z.enum(PORTFOLIO_VALIDATION_VERDICTS);

export const PORTFOLIO_VALIDATION_CAUSES = [
  "project_not_ready",
  "missing_user_material",
  "project_sync_required",
  "system_packaging_failed",
] as const;
export type PortfolioValidationCause = (typeof PORTFOLIO_VALIDATION_CAUSES)[number];
export const PortfolioValidationCauseSchema = z.enum(PORTFOLIO_VALIDATION_CAUSES);

export const PortfolioProjectAdmissionSchema = z.object({
  projectId: z.string(),
  status: PortfolioProjectStatusSchema,
  cause: PortfolioValidationCauseSchema.nullable().optional().default(null),
  message: z.string(),
  projectState: z.string().nullable().optional().default(null),
  sceneHash: z.string().nullable().optional().default(null),
  updatedAt: z.string().nullable().optional().default(null),
});

export type PortfolioProjectAdmission = z.infer<typeof PortfolioProjectAdmissionSchema>;

export const PortfolioPackagingProjectSnapshotSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  sceneHash: z.string().nullable().optional().default(null),
  updatedAt: z.string(),
});

export type PortfolioPackagingProjectSnapshot = z.infer<
  typeof PortfolioPackagingProjectSnapshotSchema
>;

export const PortfolioPackagingPageSchema = z.object({
  id: z.string(),
  type: z.enum(["fixed", "project"]),
  pageRole: z.string(),
  title: z.string(),
  summary: z.string(),
  projectId: z.string().optional(),
  pageCountSuggestion: z.string(),
});

export type PortfolioPackagingPage = z.infer<typeof PortfolioPackagingPageSchema>;

export const PortfolioPackagingContentSchema = z.object({
  narrativeSummary: z.string(),
  pages: z.array(PortfolioPackagingPageSchema),
  qualityNotes: z.array(z.string()),
  generatedAt: z.string(),
  styleProfile: z.custom<StyleProfile>().optional(),
  projectSnapshots: z
    .array(PortfolioPackagingProjectSnapshotSchema)
    .optional()
    .default([]),
});

export type PortfolioPackagingContent = z.infer<typeof PortfolioPackagingContentSchema>;

export const PortfolioValidationSchema = z.object({
  portfolioState: PortfolioValidationStateSchema.default("unknown"),
  portfolioVerdict: PortfolioValidationVerdictSchema.nullable().optional().default(null),
  cause: PortfolioValidationCauseSchema.nullable().optional().default(null),
  summary: z.string().default(""),
  updatedAt: z.string().default(""),
  packagingHash: z.string().default(""),
  projects: z.array(PortfolioProjectAdmissionSchema).default([]),
});

export type PortfolioValidation = z.infer<typeof PortfolioValidationSchema>;

export type PortfolioEditorState = {
  fixedPages: FixedPageConfig[];
  diagnosis: PortfolioDiagnosis | null;
  validation: PortfolioValidation | null;
};

export const DEFAULT_FIXED_PAGES: FixedPageConfig[] = [
  { id: "cover", label: "封面", enabled: true },
  { id: "about", label: "关于我", enabled: true },
  { id: "closing", label: "结尾页", enabled: true },
];

export function resolvePortfolioPackagingContent(
  contentJson: unknown
): PortfolioPackagingContent | null {
  const parsed = PortfolioPackagingContentSchema.safeParse(contentJson);
  return parsed.success ? parsed.data : null;
}

export function resolvePortfolioEditorState(outlineJson: unknown): PortfolioEditorState {
  const raw = (outlineJson ?? {}) as {
    fixedPages?: FixedPageConfig[];
    diagnosis?: PortfolioDiagnosis | null;
    validation?: PortfolioValidation | null;
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

  const parsedDiagnosis = PortfolioDiagnosisSchema.safeParse(raw.diagnosis);
  const parsedValidation = PortfolioValidationSchema.safeParse(raw.validation);

  return {
    fixedPages,
    diagnosis: parsedDiagnosis.success ? parsedDiagnosis.data : null,
    validation: parsedValidation.success ? parsedValidation.data : null,
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
    validation:
      patch.validation === undefined ? current.validation : patch.validation,
  };
}
