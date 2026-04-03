export const PROJECT_STATUS_LABEL: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  DRAFT: { label: "草稿", variant: "secondary" },
  IMPORTING: { label: "导入中", variant: "outline" },
  IMPORTED: { label: "已导入", variant: "default" },
  FAILED: { label: "失败", variant: "destructive" },
};

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
  facts: { updatedAt: Date } | null;
  outlines: Array<{ id: string; updatedAt: Date }>;
  drafts: Array<{ id: string; updatedAt: Date; status: string }>;
}) {
  const latestDraft = project.drafts[0];
  if (latestDraft) {
    return {
      href: `/projects/${project.id}/editor?did=${latestDraft.id}`,
      label: "继续编辑草稿",
    };
  }

  const latestOutline = project.outlines[0];
  if (latestOutline) {
    return {
      href: `/projects/${project.id}/outline?oid=${latestOutline.id}`,
      label: "继续确认大纲",
    };
  }

  if (project.facts) {
    return {
      href: `/projects/${project.id}/facts`,
      label: "继续补充项目事实",
    };
  }

  return {
    href: `/projects/${project.id}/assets`,
    label: "继续确认素材",
  };
}

export function getProjectStageSummary(project: {
  _count: { assets: number };
  facts: { updatedAt: Date } | null;
  outlines: Array<{ id: string; updatedAt: Date }>;
  drafts: Array<{ id: string; updatedAt: Date; status: string }>;
}) {
  const parts = [`${project._count.assets} 张素材`];
  if (project.facts) parts.push("已补充项目事实");
  if (project.outlines.length > 0) parts.push("已生成大纲");
  if (project.drafts.length > 0) parts.push("已生成草稿");
  return parts.join(" · ");
}
