export type ApplyStructureWarning = {
  code: "visual_generation_unavailable" | "visual_generation_partial_failed";
  message: string;
};

export type ApplyStructureStatus = "success" | "partial_success" | "rolled_back";

export type ApplyStructureResponseBase = {
  status?: ApplyStructureStatus;
  rolledBack?: boolean;
  message?: string;
  warnings?: ApplyStructureWarning[];
};
