export type JudgementState =
  | "full_judgement"
  | "limited_judgement"
  | "insufficient_evidence";

export type ScoreInputTypePublic = "link" | "pdf" | "images";

export type ScoreSectionType =
  | "cover"
  | "profile"
  | "toc"
  | "project"
  | "closing"
  | "unknown";

export type ScoreUnitType =
  | "cover"
  | "profile"
  | "toc"
  | "project_intro"
  | "research"
  | "insight"
  | "strategy"
  | "solution"
  | "result"
  | "closing"
  | "unknown";

export type DensityLevel = "low" | "medium" | "high";

export type ScoringSource =
  | "overall_structure_summary"
  | "page_level_summaries"
  | "project_level_summaries"
  | "visual_anchor_pages";

export interface ScoreDimensionResult {
  score: number;
  comment: string;
  judgementState: JudgementState;
}

export interface ScoreInputScanSection {
  sectionId: string;
  sectionType: ScoreSectionType;
  title: string | null;
  startUnit: number;
  endUnit: number;
  unitCount: number;
}

export interface ScoreInputScanUnit {
  unitNumber: number;
  unitType: ScoreUnitType;
  sectionId: string | null;
  textDensity: DensityLevel;
  visualDensity: DensityLevel;
  extractedTextSummary: string | null;
  visualSummary: string | null;
}

export interface ScoreInputScanResult {
  inputType: ScoreInputTypePublic;
  totalUnits: number;
  sections: ScoreInputScanSection[];
  units: ScoreInputScanUnit[];
  detectedProjectCount: number;
  estimatedInputTokens: number;
}

export interface ScoreCoverage {
  inputType: ScoreInputTypePublic;
  totalUnits: number;
  isFullCoverage: boolean;
  detectedProjects: number;
  scoringSources: ScoringSource[];
  visualAnchorUnits: number[];
}

export interface ScoreProcessingMeta {
  strategy: string;
  scanResult: ScoreInputScanResult;
  notes: string[];
}

export const SCORE_ANONYMOUS_SESSION_COOKIE = "folio_score_sid";
