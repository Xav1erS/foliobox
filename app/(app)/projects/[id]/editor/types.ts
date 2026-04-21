import type { ObjectActionQuota } from "@/lib/entitlement";
import type { BoundaryAnalysis } from "@/app/api/projects/[id]/boundary/analyze/route";
import type { CompletenessAnalysis } from "@/app/api/projects/[id]/completeness/analyze/route";
import type { PackageRecommendation } from "@/app/api/projects/[id]/package/recommend/route";
import type { LayoutJson } from "@/app/api/projects/[id]/layout/generate/route";

type ProjectAsset = {
  id: string;
  imageUrl: string;
  title: string | null;
  selected: boolean;
  isCover: boolean;
  sortOrder: number;
  metaJson?: unknown;
};

type InvolvementLevelValue = "" | "LEAD" | "CORE" | "SUPPORT";

type AudienceValue = "" | "TO_C" | "TO_B" | "TO_G" | "INTERNAL";

type PlatformValue =
  | ""
  | "WEB"
  | "MOBILE"
  | "DESKTOP"
  | "AUTOMOTIVE"
  | "LARGE_SCREEN"
  | "CROSS_PLATFORM";

type ProjectNatureValue =
  | ""
  | "NEW_BUILD"
  | "MAJOR_REDESIGN"
  | "ITERATION"
  | "DESIGN_SYSTEM"
  | "CONCEPT";

type ProjectFactsForm = {
  projectType: string;
  audience: AudienceValue;
  platform: PlatformValue;
  industry: string;
  projectNature: ProjectNatureValue;
  involvementLevel: InvolvementLevelValue;
  roleTitle: string;
  timeline: string;
  background: string;
  businessGoal: string;
  biggestChallenge: string;
  resultSummary: string;
};

type StyleReferenceSetOption = {
  id: string;
  name: string;
  description: string | null;
  imageUrls: string[];
};

export type ProjectEditorInitialData = {
  id: string;
  name: string;
  sourceType: string;
  sourceUrl: string | null;
  stage: string;
  importStatus: string;
  packageMode: string | null;
  updatedAt: string;
  facts: ProjectFactsForm;
  assets: ProjectAsset[];
  boundaryAnalysis: BoundaryAnalysis | null;
  completenessAnalysis: CompletenessAnalysis | null;
  packageRecommendation: PackageRecommendation | null;
  layout: LayoutJson | null;
  actionSummary: {
    layoutGenerations: ObjectActionQuota;
    layoutRegenerations: ObjectActionQuota;
  };
  styleReferenceSets: StyleReferenceSetOption[];
};
