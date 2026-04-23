import { describe, expect, it } from "vitest";
import type { FixedPageConfig, PortfolioPackagingContent } from "./portfolio-editor";
import {
  getPortfolioPublishBlockReason,
  resolvePortfolioProjectAdmissions,
  validatePortfolioPackaging,
  type PortfolioValidationProjectInput,
} from "./portfolio-editor-validation";

const FIXED_PAGES: FixedPageConfig[] = [
  { id: "cover", label: "封面", enabled: true },
  { id: "about", label: "关于我", enabled: true },
  { id: "closing", label: "结尾页", enabled: true },
];

function createProject(params: {
  id: string;
  state?: "pass" | "pass_with_notes" | "not_ready";
  verdict?: "可进入作品集" | "可进入，但建议先补充" | "暂不建议进入作品集" | null;
  sceneHash?: string | null;
}) {
  const { id, state = "pass", verdict = "可进入作品集", sceneHash = `${id}-hash` } = params;
  return {
    id,
    name: `项目 ${id}`,
    stage: "READY",
    packageMode: "DEEP",
    updatedAt: `2026-04-22T0${id.length}:00:00.000Z`,
    layoutJson:
      verdict == null
        ? null
        : {
            totalPages: 4,
            narrativeSummary: `摘要 ${id}`,
            validation: {
              projectState: state,
              projectVerdict: verdict,
              cause: state === "pass_with_notes" ? "missing_user_material" : null,
              summary:
                state === "pass"
                  ? "当前项目已达到可进入作品集的基础质量线。"
                  : state === "pass_with_notes"
                    ? "当前项目可进入作品集，但建议先补充素材或信息。"
                    : "当前仍有未达标画板，暂不建议进入作品集。",
              updatedAt: "2026-04-22T00:00:00.000Z",
              sceneHash,
              boards: [],
            },
          },
    background: null,
    resultSummary: null,
  } satisfies PortfolioValidationProjectInput;
}

function createPackaging(
  projectIds: string[],
  overrides: Partial<PortfolioPackagingContent> = {}
): PortfolioPackagingContent {
  return {
    narrativeSummary: "整份作品集包装摘要",
    pages: [
      { id: "fixed-cover", type: "fixed", pageRole: "cover", title: "封面", summary: "封面", pageCountSuggestion: "1 页" },
      { id: "fixed-about", type: "fixed", pageRole: "about", title: "关于我", summary: "关于我", pageCountSuggestion: "1 页" },
      { id: "fixed-closing", type: "fixed", pageRole: "closing", title: "结尾页", summary: "结尾页", pageCountSuggestion: "1 页" },
      ...projectIds.map((projectId, index) => ({
        id: `project-${projectId}`,
        type: "project" as const,
        pageRole: "project_case",
        title: `项目 ${index + 1}`,
        summary: `项目 ${projectId} 摘要`,
        projectId,
        pageCountSuggestion: "3-5 页",
      })),
    ],
    qualityNotes: [],
    generatedAt: "2026-04-22T00:00:00.000Z",
    projectSnapshots: projectIds.map((projectId) => ({
      projectId,
      projectName: `项目 ${projectId}`,
      sceneHash: `${projectId}-hash`,
      updatedAt: `2026-04-22T0${projectId.length}:00:00.000Z`,
    })),
    ...overrides,
  };
}

describe("portfolio editor validation", () => {
  it("resolves project admissions from project validation", () => {
    const admissions = resolvePortfolioProjectAdmissions([
      createProject({ id: "a", state: "pass" }),
      createProject({ id: "b", state: "pass_with_notes", verdict: "可进入，但建议先补充" }),
      createProject({ id: "c", state: "not_ready", verdict: "暂不建议进入作品集" }),
      createProject({ id: "d", verdict: null }),
    ]);

    expect(admissions.map((item) => item.status)).toEqual(["pass", "warn", "block", "block"]);
  });

  it("marks portfolio as pass_with_notes when blocked projects are skipped from packaging", () => {
    const projects = [
      createProject({ id: "a", state: "pass" }),
      createProject({ id: "b", state: "pass_with_notes", verdict: "可进入，但建议先补充" }),
      createProject({ id: "c", state: "not_ready", verdict: "暂不建议进入作品集" }),
    ];

    const validation = validatePortfolioPackaging({
      selectedProjectIds: ["a", "b", "c"],
      projects,
      fixedPages: FIXED_PAGES,
      packaging: createPackaging(["a", "b"]),
    });

    expect(validation.portfolioState).toBe("pass_with_notes");
    expect(validation.cause).toBe("project_not_ready");
    expect(validation.portfolioVerdict).toBe("可发布，但建议先补充");
  });

  it("marks portfolio as review when included project has changed after packaging", () => {
    const projects = [
      createProject({ id: "a", state: "pass", sceneHash: "a-new-hash" }),
      createProject({ id: "b", state: "pass" }),
    ];

    const validation = validatePortfolioPackaging({
      selectedProjectIds: ["a", "b"],
      projects,
      fixedPages: FIXED_PAGES,
      packaging: createPackaging(["a", "b"]),
    });

    expect(validation.portfolioState).toBe("not_ready");
    expect(validation.cause).toBe("project_sync_required");
    expect(validation.projects.find((item) => item.projectId === "a")?.status).toBe("review");
  });

  it("blocks publish when portfolio is not ready or packaging is missing", () => {
    const blockedReason = getPortfolioPublishBlockReason({
      packaging: null,
      validation: null,
    });

    expect(blockedReason).toBe("请先生成作品集包装结果。");

    const validation = validatePortfolioPackaging({
      selectedProjectIds: ["a"],
      projects: [createProject({ id: "a", state: "pass", sceneHash: "a-new-hash" })],
      fixedPages: FIXED_PAGES,
      packaging: createPackaging(["a"]),
    });

    expect(getPortfolioPublishBlockReason({
      packaging: createPackaging(["a"]),
      validation,
    })).toContain("待同步");
  });
});
