export const PROJECT_STATUS_LABEL: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  IMPORTING: { label: "导入中", variant: "outline" },
  IMPORTED: { label: "已导入", variant: "default" },
  FAILED: { label: "失败", variant: "destructive" },
};

export const PROJECT_STAGE_LABEL: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  BOUNDARY: { label: "边界确认", variant: "outline" },
  COMPLETENESS: { label: "完整度", variant: "outline" },
  PACKAGE: { label: "骨架定稿", variant: "outline" },
  LAYOUT: { label: "排版中", variant: "default" },
  READY: { label: "已就绪", variant: "default" },
};

export const PROJECT_STAGE_ORDER = ["DRAFT", "BOUNDARY", "COMPLETENESS", "PACKAGE", "LAYOUT", "READY"] as const;
export type ProjectStage = (typeof PROJECT_STAGE_ORDER)[number];

export const STAGE_TRANSITIONS: Record<ProjectStage, ProjectStage | null> = {
  DRAFT: "BOUNDARY",
  BOUNDARY: "COMPLETENESS",
  COMPLETENESS: "PACKAGE",
  PACKAGE: "LAYOUT",
  LAYOUT: "READY",
  READY: null,
};

export const V3_STAGE_STEPS = [
  { stage: "BOUNDARY", label: "边界确认", step: 1 },
  { stage: "COMPLETENESS", label: "完整度", step: 2 },
  { stage: "PACKAGE", label: "骨架定稿", step: 3 },
  { stage: "LAYOUT", label: "排版验收", step: 4 },
] as const;

export function formatProjectDate(date: Date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function getProjectContinuePath(project: {
  id: string;
  stage?: string;
}) {
  // V3 stage routing — takes precedence when project is in V3 flow
  const stage = project.stage;
  if (stage === "BOUNDARY") {
    return { href: `/projects/${project.id}/completeness`, label: "继续完整度检查" };
  }
  if (stage === "COMPLETENESS") {
    return { href: `/projects/${project.id}/package`, label: "继续骨架定稿" };
  }
  if (stage === "PACKAGE") {
    return { href: `/projects/${project.id}/package`, label: "继续骨架定稿" };
  }
  if (stage === "LAYOUT" || stage === "READY") {
    return { href: `/projects/${project.id}/layout`, label: "继续排版验收" };
  }

  // DRAFT: start V3 flow from boundary
  return { href: `/projects/${project.id}/boundary`, label: "开始整理项目" };
}

export function getProjectStageSummary(project: {
  _count: { assets: number };
  stage?: string;
}) {
  const stage = project.stage;
  if (stage && stage !== "DRAFT") {
    const stageInfo = PROJECT_STAGE_LABEL[stage];
    return `${project._count.assets} 张素材 · ${stageInfo?.label ?? stage}`;
  }
  return `${project._count.assets} 张素材`;
}
