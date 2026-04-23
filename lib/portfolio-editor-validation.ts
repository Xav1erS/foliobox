import { createHash } from "node:crypto";
import { resolveProjectLayoutDocument } from "./project-editor-scene";
import type {
  FixedPageConfig,
  PortfolioDiagnosis,
  PortfolioPackagingContent,
  PortfolioPackagingProjectSnapshot,
  PortfolioProjectAdmission,
  PortfolioProjectStatus,
  PortfolioValidation,
  PortfolioValidationCause,
} from "./portfolio-editor";

export type PortfolioValidationProjectInput = {
  id: string;
  name: string;
  stage: string;
  packageMode: string | null;
  updatedAt: string;
  layoutJson: unknown;
  background: string | null;
  resultSummary: string | null;
};

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashPackaging(content: PortfolioPackagingContent | null) {
  return createHash("sha256")
    .update(stableStringify(content ?? {}))
    .digest("hex");
}

function getProjectStatusRank(status: PortfolioProjectStatus) {
  if (status === "review") return 3;
  if (status === "block") return 2;
  if (status === "warn") return 1;
  return 0;
}

function upgradeProjectStatus(
  current: PortfolioProjectAdmission,
  patch: Partial<PortfolioProjectAdmission>
) {
  const nextStatus = patch.status ?? current.status;
  if (getProjectStatusRank(nextStatus) < getProjectStatusRank(current.status)) {
    return current;
  }
  return {
    ...current,
    ...patch,
    status: nextStatus,
  };
}

function buildPortfolioSummary(params: {
  packaging: PortfolioPackagingContent | null;
  selectedProjects: PortfolioValidationProjectInput[];
  projectStatuses: PortfolioProjectAdmission[];
  portfolioState: PortfolioValidation["portfolioState"];
  cause: PortfolioValidationCause | null;
  eligibleProjectCount: number;
  omittedProjectCount: number;
}) {
  const {
    packaging,
    selectedProjects,
    projectStatuses,
    portfolioState,
    cause,
    eligibleProjectCount,
    omittedProjectCount,
  } = params;
  const reviewCount = projectStatuses.filter((project) => project.status === "review").length;
  const blockCount = projectStatuses.filter((project) => project.status === "block").length;
  const warnCount = projectStatuses.filter((project) => project.status === "warn").length;

  if (!packaging?.pages?.length) {
    if (selectedProjects.length === 0) {
      return "当前还没有选入项目，先选项目并生成作品集包装。";
    }
    if (blockCount > 0) {
      return `当前有 ${blockCount} 个项目暂不建议进入作品集，建议先回 Project Editor 调整。`;
    }
    return "当前还没有作品集包装结果，建议先生成整份包装。";
  }

  if (cause === "project_sync_required") {
    return `已有 ${reviewCount} 个项目更新，当前作品集待同步 / 待复核。`;
  }
  if (cause === "system_packaging_failed") {
    return "当前作品集包装结果不完整，建议重新生成包装后再继续。";
  }
  if (portfolioState === "pass") {
    return "当前作品集已达到发布前基础质量线。";
  }
  if (blockCount > 0 || omittedProjectCount > 0) {
    return `当前作品集可继续，但有 ${Math.max(blockCount, omittedProjectCount)} 个项目暂不建议纳入当前包装。`;
  }
  if (warnCount > 0 || cause === "missing_user_material") {
    return `当前作品集可发布，但有 ${warnCount} 个项目建议先补充素材或信息。`;
  }
  if (eligibleProjectCount === 0) {
    return "当前还没有可进入作品集的项目，建议先回 Project Editor 完成项目包装。";
  }
  return "当前作品集仍需复核，建议先回看包装结果。";
}

function buildPortfolioVerdict(
  packaging: PortfolioPackagingContent | null,
  state: PortfolioValidation["portfolioState"]
) {
  if (!packaging?.pages?.length) return null;
  if (state === "pass") return "可发布" as const;
  if (state === "pass_with_notes") return "可发布，但建议先补充" as const;
  if (state === "not_ready") return "暂不建议发布" as const;
  return null;
}

export function resolvePortfolioProjectAdmission(
  project: PortfolioValidationProjectInput
): PortfolioProjectAdmission {
  const layout = resolveProjectLayoutDocument(project.layoutJson);
  const validation = layout.validation ?? null;

  if (!validation || validation.projectVerdict == null) {
    return {
      projectId: project.id,
      status: "block",
      cause: "project_not_ready",
      message: "当前项目还没有完成项目级排版，建议先回 Project Editor 整理。",
      projectState: validation?.projectState ?? null,
      sceneHash: validation?.sceneHash ?? null,
      updatedAt: project.updatedAt,
    };
  }

  if (validation.projectState === "not_ready") {
    return {
      projectId: project.id,
      status: "block",
      cause: "project_not_ready",
      message: validation.summary || "当前项目暂不建议进入作品集。",
      projectState: validation.projectState,
      sceneHash: validation.sceneHash,
      updatedAt: project.updatedAt,
    };
  }

  if (validation.projectState === "pass_with_notes") {
    return {
      projectId: project.id,
      status: "warn",
      cause: "missing_user_material",
      message: validation.summary || "当前项目可进入作品集，但建议先补充素材或信息。",
      projectState: validation.projectState,
      sceneHash: validation.sceneHash,
      updatedAt: project.updatedAt,
    };
  }

  return {
    projectId: project.id,
    status: "pass",
    cause: null,
    message: validation.summary || "当前项目可进入作品集。",
    projectState: validation.projectState,
    sceneHash: validation.sceneHash,
    updatedAt: project.updatedAt,
  };
}

export function resolvePortfolioProjectAdmissions(
  projects: PortfolioValidationProjectInput[]
) {
  return projects.map(resolvePortfolioProjectAdmission);
}

export function buildPortfolioPackagingProjectSnapshots(
  projects: PortfolioValidationProjectInput[]
): PortfolioPackagingProjectSnapshot[] {
  return projects.map((project) => {
    const admission = resolvePortfolioProjectAdmission(project);
    return {
      projectId: project.id,
      projectName: project.name,
      sceneHash: admission.sceneHash,
      updatedAt: project.updatedAt,
    };
  });
}

export function buildPortfolioDiagnosis(params: {
  projects: PortfolioValidationProjectInput[];
  fixedPages: FixedPageConfig[];
}): PortfolioDiagnosis {
  const admissions = resolvePortfolioProjectAdmissions(params.projects);
  const passCount = admissions.filter((project) => project.status === "pass").length;
  const warnCount = admissions.filter((project) => project.status === "warn").length;
  const blockCount = admissions.filter((project) => project.status === "block").length;
  const enabledFixedPages = params.fixedPages.filter((page) => page.enabled);

  const overallVerdict: PortfolioDiagnosis["overallVerdict"] =
    params.projects.length === 0
      ? "insufficient"
      : blockCount === 0 && enabledFixedPages.length >= 2 && passCount >= 1
        ? "ready"
        : passCount + warnCount >= Math.max(1, Math.ceil(params.projects.length / 2))
          ? "almost_ready"
          : "needs_work";

  return {
    overallVerdict,
    summary:
      overallVerdict === "insufficient"
        ? "这份作品集还没有选入项目，当前不足以进入整份包装。"
        : overallVerdict === "ready"
          ? "当前项目准入状态和固定页组织已经足够，可以进入作品集包装生成。"
          : overallVerdict === "almost_ready"
            ? "当前已有可进入作品集的项目，但仍建议先补齐部分项目素材或信息。"
            : "当前已选项目还不够稳定，建议先回 Project Editor 完成项目包装。",
    checks: [
      {
        key: "selection",
        label: "项目选择",
        status:
          params.projects.length >= 3
            ? "strong"
            : params.projects.length >= 1
              ? "adequate"
              : "missing",
        comment:
          params.projects.length === 0
            ? "还没有选入项目。"
            : `当前已选 ${params.projects.length} 个项目。`,
      },
      {
        key: "project_admission",
        label: "项目准入",
        status:
          params.projects.length === 0
            ? "missing"
            : blockCount === 0
              ? warnCount > 0
                ? "adequate"
                : "strong"
              : passCount + warnCount > 0
                ? "weak"
                : "missing",
        comment:
          params.projects.length === 0
            ? "没有可判断的项目。"
            : `${passCount} 个项目已达标，${warnCount} 个项目需补充，${blockCount} 个项目暂不建议进入作品集。`,
      },
      {
        key: "fixed_pages",
        label: "固定页组织",
        status:
          enabledFixedPages.length >= 3
            ? "strong"
            : enabledFixedPages.length >= 2
              ? "adequate"
              : enabledFixedPages.length >= 1
                ? "weak"
                : "missing",
        comment:
          enabledFixedPages.length > 0
            ? `已启用 ${enabledFixedPages.length} 个固定页。`
            : "还没有启用固定页。",
      },
    ],
    suggestions: [
      params.projects.length === 0 ? "先从项目池中选入 2-4 个最能代表能力面的项目。" : null,
      blockCount > 0
        ? "优先回 Project Editor 调整未达标项目，再重新进入作品集包装。"
        : null,
      warnCount > 0
        ? "对“需要补充信息”的项目，优先补结果证据和主视觉素材。"
        : null,
      enabledFixedPages.length < 2 ? "至少保留封面和结尾页，保证整份作品集有开场和收束。" : null,
    ].filter(Boolean) as string[],
    updatedAt: new Date().toISOString(),
  };
}

export function validatePortfolioPackaging(params: {
  selectedProjectIds: string[];
  projects: PortfolioValidationProjectInput[];
  fixedPages: FixedPageConfig[];
  packaging: PortfolioPackagingContent | null;
}): PortfolioValidation {
  const selectedProjects = params.selectedProjectIds
    .map((projectId) => params.projects.find((project) => project.id === projectId) ?? null)
    .filter((project): project is PortfolioValidationProjectInput => project !== null);

  const admissionsById = new Map(
    resolvePortfolioProjectAdmissions(selectedProjects).map((project) => [project.projectId, project])
  );
  const projectStatuses = selectedProjects.map((project) => admissionsById.get(project.id)!);
  const packaging = params.packaging;
  const enabledFixedPages = params.fixedPages.filter((page) => page.enabled);

  if (!packaging?.pages?.length) {
    return {
      portfolioState: "unknown",
      portfolioVerdict: null,
      cause: null,
      summary: buildPortfolioSummary({
        packaging,
        selectedProjects,
        projectStatuses,
        portfolioState: "unknown",
        cause: null,
        eligibleProjectCount: projectStatuses.filter((project) => project.status !== "block").length,
        omittedProjectCount: 0,
      }),
      updatedAt: new Date().toISOString(),
      packagingHash: hashPackaging(packaging),
      projects: projectStatuses,
    };
  }

  const snapshotByProjectId = new Map(
    (packaging.projectSnapshots ?? []).map((snapshot) => [snapshot.projectId, snapshot])
  );
  const packagingProjectIds = packaging.pages
    .filter((page) => page.type === "project" && page.projectId)
    .map((page) => page.projectId as string);
  const packagingProjectIdSet = new Set(packagingProjectIds);
  const fixedPageIdSet = new Set(
    packaging.pages
      .filter((page) => page.type === "fixed")
      .map((page) => page.pageRole)
  );

  const reviewedStatuses = projectStatuses.map((project) => {
    const snapshot = snapshotByProjectId.get(project.projectId);
    if (!snapshot) return project;

    if (
      snapshot.sceneHash !== project.sceneHash ||
      snapshot.updatedAt !== project.updatedAt
    ) {
      return upgradeProjectStatus(project, {
        status: "review",
        cause: "project_sync_required",
        message: "项目内容已更新，当前作品集待同步 / 待复核。",
      });
    }

    return project;
  });

  const eligibleProjectIds = reviewedStatuses
    .filter((project) => project.status === "pass" || project.status === "warn")
    .map((project) => project.projectId);
  const omittedProjectCount = selectedProjects.filter(
    (project) =>
      (admissionsById.get(project.id)?.status ?? "block") === "block" &&
      !packagingProjectIdSet.has(project.id)
  ).length;

  const hasMissingFixedPages = enabledFixedPages.some((page) => !fixedPageIdSet.has(page.id));
  const hasInvalidProjectPage = packagingProjectIds.some((projectId) => {
    const status = reviewedStatuses.find((project) => project.projectId === projectId)?.status;
    return status === "block";
  });
  const hasMissingEligibleProject = eligibleProjectIds.some(
    (projectId) => !packagingProjectIdSet.has(projectId)
  );

  let portfolioState: PortfolioValidation["portfolioState"] = "pass";
  let cause: PortfolioValidationCause | null = null;

  if (reviewedStatuses.some((project) => project.status === "review")) {
    portfolioState = "not_ready";
    cause = "project_sync_required";
  } else if (hasMissingFixedPages || hasInvalidProjectPage || hasMissingEligibleProject) {
    portfolioState = "not_ready";
    cause = "system_packaging_failed";
  } else if (reviewedStatuses.every((project) => project.status === "block")) {
    portfolioState = "not_ready";
    cause = "project_not_ready";
  } else if (
    reviewedStatuses.some((project) => project.status === "block") ||
    reviewedStatuses.some((project) => project.status === "warn")
  ) {
    portfolioState = "pass_with_notes";
    cause = reviewedStatuses.some((project) => project.status === "block")
      ? "project_not_ready"
      : "missing_user_material";
  }

  return {
    portfolioState,
    portfolioVerdict: buildPortfolioVerdict(packaging, portfolioState),
    cause,
    summary: buildPortfolioSummary({
      packaging,
      selectedProjects,
      projectStatuses: reviewedStatuses,
      portfolioState,
      cause,
      eligibleProjectCount: eligibleProjectIds.length,
      omittedProjectCount,
    }),
    updatedAt: new Date().toISOString(),
    packagingHash: hashPackaging(packaging),
    projects: reviewedStatuses,
  };
}

export function getPortfolioPublishBlockReason(params: {
  packaging: PortfolioPackagingContent | null;
  validation: PortfolioValidation | null | undefined;
}) {
  const { packaging, validation } = params;
  if (!packaging?.pages?.length) {
    return "请先生成作品集包装结果。";
  }
  if (validation?.portfolioState === "not_ready") {
    return validation.summary || "当前作品集仍未达标，暂不建议发布。";
  }
  return null;
}

export function stampPortfolioValidationFailure(params: {
  packaging: PortfolioPackagingContent | null;
  validation: PortfolioValidation | null | undefined;
  summary: string;
}) {
  const { packaging, validation, summary } = params;
  return {
    ...(validation ?? {
      portfolioState: "unknown" as const,
      portfolioVerdict: null,
      projects: [],
    }),
    cause: "system_packaging_failed" as const,
    summary,
    updatedAt: new Date().toISOString(),
    packagingHash: hashPackaging(packaging),
  } satisfies PortfolioValidation;
}
