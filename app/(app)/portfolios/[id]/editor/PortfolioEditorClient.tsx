"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EditorInfoList,
  EditorRailSection,
  EditorScaffold,
} from "@/components/editor/EditorScaffold";
import type {
  ObjectActionQuota,
  PlanSummaryCopy,
  EntitlementQuotaUsage,
} from "@/lib/entitlement";
import type {
  FixedPageConfig,
  PortfolioDiagnosis,
  PortfolioPackagingContent,
  PortfolioPackagingPage,
} from "@/lib/portfolio-editor";
import {
  STYLE_PRESETS,
  type StyleProfile,
  type StyleReferenceSelection,
} from "@/lib/style-reference-presets";

type PortfolioProject = {
  id: string;
  name: string;
  stage: string;
  packageMode: string | null;
  updatedAt: string;
  layout: { narrativeSummary?: string; totalPages?: number } | null;
  background: string | null;
  resultSummary: string | null;
};

type StyleReferenceSetOption = {
  id: string;
  name: string;
  description: string | null;
  imageUrls: string[];
};

type GeneratePrecheck = {
  actionType: string;
  styleProfile: StyleProfile;
  suggestedMode: "continue" | "reuse" | "block";
  consumesQuota: boolean;
  failureCounts: boolean;
  activeProjectRemaining: number;
  actionRemaining: number;
  reusableDraftId: string | null;
};

export type PortfolioEditorInitialData = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  selectedProjectIds: string[];
  fixedPages: FixedPageConfig[];
  diagnosis: PortfolioDiagnosis | null;
  packaging: PortfolioPackagingContent | null;
  allProjects: PortfolioProject[];
  packagingQuota: EntitlementQuotaUsage;
  actionSummary: {
    diagnoses: ObjectActionQuota;
    packagingGenerations: ObjectActionQuota;
    packagingRegenerations: ObjectActionQuota;
  };
  styleReferenceSets: StyleReferenceSetOption[];
};

function portfolioStatusLabel(status: string) {
  if (status === "DRAFT") return "草稿";
  if (status === "SELECTION") return "选择项目";
  if (status === "OUTLINE") return "结构整理";
  if (status === "EDITOR") return "编辑中";
  if (status === "PUBLISHED") return "已发布";
  return status;
}

function projectStageLabel(project: PortfolioProject) {
  if (project.layout) return `已排版 · ${project.layout.totalPages ?? "?"} 页`;
  if (project.packageMode === "DEEP") return "已定深讲";
  if (project.packageMode === "LIGHT") return "已定浅讲";
  if (project.packageMode === "SUPPORTIVE") return "已定补充展示";
  return project.stage;
}

export function PortfolioEditorClient({
  initialData,
  planSummary,
}: {
  initialData: PortfolioEditorInitialData;
  planSummary: PlanSummaryCopy;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialData.name);
  const [status, setStatus] = useState(initialData.status);
  const [selectedProjectIds, setSelectedProjectIds] = useState(initialData.selectedProjectIds);
  const [fixedPages, setFixedPages] = useState(initialData.fixedPages);
  const [diagnosis, setDiagnosis] = useState(initialData.diagnosis);
  const [packaging, setPackaging] = useState(initialData.packaging);
  const [packagingQuota, setPackagingQuota] = useState(initialData.packagingQuota);
  const [savingName, setSavingName] = useState(false);
  const [updatingStructure, setUpdatingStructure] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatingPackaging, setGeneratingPackaging] = useState(false);
  const [checkingPrecheck, setCheckingPrecheck] = useState(false);
  const [generatePrecheck, setGeneratePrecheck] = useState<GeneratePrecheck | null>(null);
  const [actionError, setActionError] = useState("");
  const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null);
  const [styleSelection, setStyleSelection] = useState<StyleReferenceSelection>(() => {
    const styleProfile = initialData.packaging?.styleProfile;
    if (styleProfile?.source === "preset" && styleProfile.presetKey) {
      return { source: "preset", presetKey: styleProfile.presetKey };
    }
    if (styleProfile?.source === "reference_set" && styleProfile.referenceSetId) {
      return {
        source: "reference_set",
        referenceSetId: styleProfile.referenceSetId,
        referenceSetName: styleProfile.referenceSetName ?? null,
      };
    }
    return { source: "none" };
  });

  const projectMap = useMemo(
    () => new Map(initialData.allProjects.map((project) => [project.id, project])),
    [initialData.allProjects]
  );
  const selectedProjects = useMemo(
    () =>
      selectedProjectIds
        .map((projectId) => projectMap.get(projectId))
        .filter(Boolean) as PortfolioProject[],
    [projectMap, selectedProjectIds]
  );
  const availableProjects = useMemo(
    () => initialData.allProjects.filter((project) => !selectedProjectIds.includes(project.id)),
    [initialData.allProjects, selectedProjectIds]
  );
  const pages = useMemo(() => {
    if (packaging?.pages?.length) return packaging.pages;

    const fallbackPages: PortfolioPackagingPage[] = fixedPages
      .filter((page) => page.enabled)
      .map((page) => ({
        id: `fixed-${page.id}`,
        type: "fixed",
        pageRole: page.id,
        title: page.label,
        summary: "先保留这一页的角色位置；生成作品集包装后会补上更具体的节奏建议。",
        pageCountSuggestion: "1 页",
      }));

    return fallbackPages.concat(
      selectedProjects.map((project) => ({
        id: `project-${project.id}`,
        type: "project",
        pageRole: "project_case",
        title: project.name,
        summary:
          project.layout?.narrativeSummary ??
          project.resultSummary ??
          project.background ??
          "当前项目还没有稳定摘要，建议先补齐项目侧结论。",
        projectId: project.id,
        pageCountSuggestion:
          project.layout?.totalPages != null ? `${project.layout.totalPages} 页参考` : "2-3 页",
      }))
    );
  }, [fixedPages, packaging, selectedProjects]);
  const selectedCanvasItem = useMemo(() => {
    const fallbackId = pages[0]?.id ?? null;
    const resolvedId = selectedCanvasItemId ?? fallbackId;
    return pages.find((page) => page.id === resolvedId) ?? null;
  }, [pages, selectedCanvasItemId]);
  const aiHistory = useMemo(
    () =>
      [
        diagnosis
          ? { key: "diagnosis", label: "作品集诊断", summary: diagnosis.summary }
          : null,
        packaging
          ? { key: "packaging", label: "作品集包装", summary: packaging.narrativeSummary }
          : null,
      ].filter(Boolean) as Array<{ key: string; label: string; summary: string }>,
    [diagnosis, packaging]
  );
  const nextStepConclusion = useMemo(() => {
    if (selectedProjects.length === 0) {
      return "先从项目池选入 2-4 个最能代表能力面的项目。";
    }
    if (!diagnosis) {
      return "先运行一次作品集诊断，确认当前项目组合、固定页和整体节奏是否成立。";
    }
    if (!packaging) {
      return diagnosis.suggestions[0] ?? "当前可以继续生成作品集包装，拿到整份作品集的页面节奏建议。";
    }
    return "当前已经拿到作品集包装结果，可以继续细调项目顺序、固定页，并进入发布与导出。";
  }, [diagnosis, packaging, selectedProjects.length]);

  async function parseJsonResponse(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        (data as { error?: string }).error === "quota_exceeded"
          ? "作品集包装次数已用完，请先前往权益页查看剩余次数。"
          : (data as { error?: string }).error === "upgrade_required"
            ? "当前套餐还不能执行这个高成本动作，请先升级后再继续。"
          : (data as { error?: string }).error ?? "请求失败，请稍后重试";
      throw new Error(message);
    }
    return data;
  }

  async function updatePortfolio(body: Record<string, unknown>) {
    const data = await parseJsonResponse(
      await fetch(`/api/portfolios/${initialData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    );

    const portfolio = data.portfolio as {
      name: string;
      status: string;
      projectIds: string[];
      contentJson?: PortfolioPackagingContent | null;
    };

    setName(portfolio.name);
    setStatus(portfolio.status);
    setSelectedProjectIds(portfolio.projectIds);
    setPackaging((portfolio.contentJson as PortfolioPackagingContent | null) ?? null);
  }

  async function handleSaveName() {
    setSavingName(true);
    setActionError("");
    try {
      await updatePortfolio({ name });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "保存名称失败");
    } finally {
      setSavingName(false);
    }
  }

  async function handleToggleProject(projectId: string) {
    setUpdatingStructure(true);
    setActionError("");

    const exists = selectedProjectIds.includes(projectId);
    const nextProjectIds = exists
      ? selectedProjectIds.filter((id) => id !== projectId)
      : [...selectedProjectIds, projectId];

    try {
      await updatePortfolio({
        projectIds: nextProjectIds,
        status: nextProjectIds.length > 0 ? "SELECTION" : "DRAFT",
      });
      setDiagnosis(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "更新项目池失败");
    } finally {
      setUpdatingStructure(false);
    }
  }

  async function handleMoveProject(projectId: string, direction: "up" | "down") {
    const currentIndex = selectedProjectIds.indexOf(projectId);
    if (currentIndex < 0) return;

    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= selectedProjectIds.length) return;

    const nextProjectIds = [...selectedProjectIds];
    const [target] = nextProjectIds.splice(currentIndex, 1);
    nextProjectIds.splice(nextIndex, 0, target);

    setUpdatingStructure(true);
    setActionError("");
    try {
      await updatePortfolio({
        projectIds: nextProjectIds,
        status: nextProjectIds.length > 0 ? "SELECTION" : "DRAFT",
      });
      setDiagnosis(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "调整顺序失败");
    } finally {
      setUpdatingStructure(false);
    }
  }

  async function handleToggleFixedPage(pageId: FixedPageConfig["id"]) {
    const nextPages = fixedPages.map((page) =>
      page.id === pageId ? { ...page, enabled: !page.enabled } : page
    );

    setUpdatingStructure(true);
    setActionError("");
    try {
      const data = await parseJsonResponse(
        await fetch(`/api/portfolios/${initialData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fixedPages: nextPages,
            status: selectedProjectIds.length > 0 ? "OUTLINE" : "DRAFT",
          }),
        })
      );
      setFixedPages(nextPages);
      setStatus((data.portfolio as { status: string }).status);
      setDiagnosis(null);
      setPackaging(null);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "更新固定页失败");
    } finally {
      setUpdatingStructure(false);
    }
  }

  async function handleRunDiagnosis() {
    setDiagnosing(true);
    setActionError("");

    try {
      const data = await parseJsonResponse(
        await fetch(`/api/portfolios/${initialData.id}/diagnose`, { method: "POST" })
      );
      setDiagnosis(data.diagnosis as PortfolioDiagnosis);
      setStatus(selectedProjectIds.length > 0 ? "OUTLINE" : "DRAFT");
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "作品集诊断失败");
    } finally {
      setDiagnosing(false);
    }
  }

  function getResolvedStyleSelection() {
    if (styleSelection.source === "reference_set") {
      const matched = initialData.styleReferenceSets.find(
        (item) => item.id === styleSelection.referenceSetId
      );
      return {
        source: "reference_set" as const,
        referenceSetId: matched?.id ?? styleSelection.referenceSetId ?? null,
        referenceSetName: matched?.name ?? styleSelection.referenceSetName ?? null,
      };
    }

    if (styleSelection.source === "preset") {
      return {
        source: "preset" as const,
        presetKey: styleSelection.presetKey ?? null,
      };
    }

    return { source: "none" as const };
  }

  async function handleOpenGenerate() {
    setGenerateOpen(true);
    setCheckingPrecheck(true);
    setActionError("");

    try {
      const data = await parseJsonResponse(
        await fetch(`/api/portfolios/${initialData.id}/package/precheck`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ styleSelection: getResolvedStyleSelection() }),
        })
      );
      setGeneratePrecheck(data as GeneratePrecheck);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "作品集包装预检失败");
      setGeneratePrecheck(null);
    } finally {
      setCheckingPrecheck(false);
    }
  }

  async function handleGeneratePackaging() {
    setGeneratingPackaging(true);
    setActionError("");

    try {
      const data = await parseJsonResponse(
        await fetch(`/api/portfolios/${initialData.id}/package/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ styleSelection: getResolvedStyleSelection() }),
        })
      );
      setPackaging(data.packaging as PortfolioPackagingContent);
      setStatus("EDITOR");
      setGenerateOpen(false);
      if (!(data as { reused?: boolean }).reused) {
        setPackagingQuota((current) => ({
          ...current,
          used: current.used + 1,
          remaining: Math.max(current.remaining - 1, 0),
        }));
      }
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "作品集包装生成失败");
    } finally {
      setGeneratingPackaging(false);
    }
  }

  return (
    <>
      <EditorScaffold
        objectLabel="Portfolio"
        objectName={name}
        backHref="/portfolios"
        backLabel="全部作品集"
        statusLabel={portfolioStatusLabel(status)}
        statusMeta={`${selectedProjects.length} 个已选项目`}
        primaryAction={
          <Button
            className="h-10 px-4"
            onClick={handleOpenGenerate}
            disabled={selectedProjects.length === 0}
          >
            <Wand2 className="h-4 w-4" />
            生成作品集包装
          </Button>
        }
        secondaryAction={
          <Button
            variant="outline"
            className="h-10 px-4"
            onClick={handleRunDiagnosis}
            disabled={diagnosing}
          >
            {diagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            作品集诊断
          </Button>
        }
        topNote={
          <>
            这是里程碑 B 的 <strong>Portfolio Editor MVP</strong>。当前已经把项目选入、顺序调整、
            固定页配置、作品集诊断和整份包装生成收口到单页编辑器里；发布与导出也已经围绕
            Portfolio 主对象运行。
          </>
        }
        planSummary={planSummary}
        leftRail={
          <>
            <EditorRailSection title="作品集信息">
              <div className="space-y-3">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="作品集名称"
                  className="h-10 rounded-none border-neutral-300"
                />
                <Button
                  variant="outline"
                  className="h-10 w-full"
                  onClick={handleSaveName}
                  disabled={savingName}
                >
                  {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  保存名称
                </Button>
                <EditorInfoList
                  items={[
                    { label: "当前状态", value: portfolioStatusLabel(status) },
                    { label: "包装剩余", value: `${packagingQuota.remaining} / ${packagingQuota.limit}` },
                    {
                      label: "作品集级动作",
                      value: `诊断 ${initialData.actionSummary.diagnoses.remaining} / 包装 ${initialData.actionSummary.packagingGenerations.remaining}`,
                    },
                  ]}
                />
              </div>
            </EditorRailSection>

            <EditorRailSection title="项目池" className="flex-1">
              <div className="space-y-2">
                {selectedProjects.map((project) => (
                  <div key={project.id} className="border border-neutral-200 bg-white px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-900">{project.name}</p>
                        <p className="mt-1 text-xs text-neutral-400">{projectStageLabel(project)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-none"
                          onClick={() => handleMoveProject(project.id, "up")}
                          disabled={updatingStructure}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-none"
                          onClick={() => handleMoveProject(project.id, "down")}
                          disabled={updatingStructure}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-none"
                          onClick={() => handleToggleProject(project.id)}
                          disabled={updatingStructure}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {availableProjects.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-neutral-400">
                    可加入项目
                  </p>
                  {availableProjects.slice(0, 6).map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className="flex w-full items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-3 text-left transition-colors hover:bg-white"
                      onClick={() => handleToggleProject(project.id)}
                      disabled={updatingStructure}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-neutral-800">{project.name}</p>
                        <p className="mt-1 text-xs text-neutral-400">{projectStageLabel(project)}</p>
                      </div>
                      <Plus className="h-4 w-4 shrink-0 text-neutral-400" />
                    </button>
                  ))}
                </div>
              ) : null}
            </EditorRailSection>

            <EditorRailSection title="固定页">
              <div className="space-y-2">
                {fixedPages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    className="flex w-full items-center justify-between border border-neutral-200 bg-white px-3 py-3 text-left transition-colors hover:bg-neutral-50"
                    onClick={() => handleToggleFixedPage(page.id)}
                    disabled={updatingStructure}
                  >
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{page.label}</p>
                      <p className="mt-1 text-xs text-neutral-400">
                        {page.enabled ? "已启用" : "已关闭"}
                      </p>
                    </div>
                    {page.enabled ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                  </button>
                ))}
              </div>
            </EditorRailSection>

            <EditorRailSection title="页面列表">
              <div className="space-y-2">
                {pages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    className={`block w-full border px-3 py-3 text-left transition-colors ${
                      selectedCanvasItem?.id === page.id
                        ? "border-neutral-800 bg-neutral-100"
                        : "border-neutral-200 bg-white hover:bg-neutral-50"
                    }`}
                    onClick={() => setSelectedCanvasItemId(page.id)}
                  >
                    <p className="text-sm font-medium text-neutral-800">{page.title}</p>
                    <p className="mt-1 text-xs text-neutral-400">{page.pageCountSuggestion}</p>
                  </button>
                ))}
              </div>
            </EditorRailSection>

            <EditorRailSection title="历史">
              {aiHistory.length > 0 ? (
                <div className="space-y-2">
                  {aiHistory.map((item) => (
                    <div key={item.key} className="border border-neutral-200 bg-white px-3 py-3">
                      <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{item.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-neutral-500">
                  当前还没有作品集级历史。运行诊断或生成包装后，这里会承接最近结论。
                </p>
              )}
            </EditorRailSection>
          </>
        }
        center={
          <div className="px-4 py-4 lg:px-6 lg:py-6">
            <div className="rounded-none border border-neutral-300 bg-white">
              <div className="flex items-center justify-between border-b border-neutral-300 px-5 py-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                    Center Canvas
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
                    整份作品集画布
                  </h2>
                </div>
                <span className="text-sm text-neutral-500">
                  当前已统一接入项目池、固定页、诊断与包装动作
                </span>
              </div>

              <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)]">
                <div className="border border-dashed border-neutral-300 bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-900">页面顺序预览</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    当前主画布先用页面卡片承接整份作品集的顺序和节奏。下一步会继续补更细的页面内编辑与局部修改。
                  </p>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {pages.length > 0 ? (
                      pages.map((page, index) => (
                        <button
                          key={page.id}
                          type="button"
                          className={`border p-4 text-left transition-colors ${
                            selectedCanvasItem?.id === page.id
                              ? "border-neutral-900 bg-white"
                              : "border-neutral-200 bg-white hover:bg-neutral-50"
                          }`}
                          onClick={() => setSelectedCanvasItemId(page.id)}
                        >
                          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                            Page {index + 1}
                          </p>
                          <p className="mt-2 text-sm font-medium text-neutral-900">{page.title}</p>
                          <p className="mt-2 text-sm leading-6 text-neutral-500">{page.summary}</p>
                        </button>
                      ))
                    ) : (
                      <div className="flex min-h-48 items-center justify-center border border-dashed border-neutral-300 bg-white text-sm text-neutral-400 sm:col-span-3">
                        先从左侧项目池选入项目，再开始整理这份作品集。
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="border border-neutral-200 bg-white p-4">
                    <p className="text-sm font-medium text-neutral-900">当前结论</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                      {packaging?.narrativeSummary ??
                        diagnosis?.summary ??
                        "先运行作品集诊断，系统会判断当前项目组合和页面组织是否足以进入整份包装。"}
                    </p>
                  </div>

                  <div className="border border-neutral-200 bg-white p-4">
                    <p className="text-sm font-medium text-neutral-900">下一步结论</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">{nextStepConclusion}</p>
                  </div>

                  <div className="border border-neutral-200 bg-white p-4">
                    <p className="text-sm font-medium text-neutral-900">发布与兼容入口</p>
                    <div className="mt-3 space-y-3">
                      <Link
                        href={`/portfolios/${initialData.id}/outline`}
                        className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm font-medium text-neutral-800 transition-colors hover:bg-white"
                      >
                        打开结构兼容页
                        <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                      </Link>
                      <Link
                        href={`/portfolios/${initialData.id}/publish`}
                        className="flex items-center justify-between border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm font-medium text-neutral-800 transition-colors hover:bg-white"
                      >
                        打开发布与导出页
                        <ArrowRight className="h-3.5 w-3.5 text-neutral-400" />
                      </Link>
                    </div>
                  </div>

                  {packaging ? (
                    <div className="border border-neutral-200 bg-white p-4">
                      <p className="text-sm font-medium text-neutral-900">最近一次包装结果</p>
                      <p className="mt-2 text-sm text-neutral-500">
                        共 {packaging.pages.length} 个页面单元
                      </p>
                      <ul className="mt-3 space-y-2">
                        {packaging.qualityNotes.map((note) => (
                          <li key={note} className="text-sm leading-6 text-neutral-600">
                            {note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        }
        rightRail={
          <Tabs defaultValue="inspector" className="flex h-full flex-col">
            <div className="border-b border-neutral-200 px-4 py-4">
              <TabsList className="grid w-full grid-cols-2 rounded-none bg-neutral-100">
                <TabsTrigger value="inspector" className="rounded-none">
                  Inspector
                </TabsTrigger>
                <TabsTrigger value="ai" className="rounded-none">
                  AI
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="inspector" className="mt-0 flex-1">
              <EditorRailSection title="Inspector">
                {selectedCanvasItem ? (
                  <EditorInfoList
                    items={[
                      { label: "当前页面", value: selectedCanvasItem.title },
                      { label: "页面类型", value: selectedCanvasItem.type === "fixed" ? "固定页" : "项目页" },
                      { label: "建议页数", value: selectedCanvasItem.pageCountSuggestion },
                    ]}
                  />
                ) : (
                  <p className="text-sm leading-6 text-neutral-500">
                    当前还没有可检查的页面单元。
                  </p>
                )}
              </EditorRailSection>

              <EditorRailSection title="页面说明">
                <p className="text-sm leading-6 text-neutral-500">
                  {selectedCanvasItem?.summary ?? "先选中一个页面单元，这里会展示它的角色和节奏说明。"}
                </p>
              </EditorRailSection>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 flex-1">
              <EditorRailSection title="AI 面板">
                {diagnosis ? (
                  <div className="space-y-3">
                    <div className="border border-neutral-200 bg-neutral-50 p-3">
                      <p className="text-sm font-medium text-neutral-900">
                        作品集诊断 · {diagnosis.overallVerdict}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-600">{diagnosis.summary}</p>
                    </div>
                    {diagnosis.suggestions.map((suggestion) => (
                      <div key={suggestion} className="border border-neutral-200 bg-white px-3 py-3">
                        <p className="text-sm leading-6 text-neutral-500">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-neutral-500">
                    还没有作品集级 AI 结果。点击顶部“作品集诊断”，系统会判断项目选择、固定页和整份节奏。
                  </p>
                )}
              </EditorRailSection>

              <EditorRailSection title="AI 历史">
                {aiHistory.length > 0 ? (
                  <div className="space-y-2">
                    {aiHistory.map((item) => (
                      <div key={item.key} className="border border-neutral-200 bg-white px-3 py-3">
                        <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-neutral-500">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-neutral-500">
                    当前还没有可回看的作品集级历史。
                  </p>
                )}
              </EditorRailSection>

              <EditorRailSection title="下一步结论">
                <p className="text-sm leading-6 text-neutral-500">{nextStepConclusion}</p>
              </EditorRailSection>
            </TabsContent>
          </Tabs>
        }
        bottomStrip={
          <div className="flex gap-3 overflow-x-auto pb-1">
            {pages.length > 0 ? (
              pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className={`w-40 shrink-0 border px-3 py-3 text-left ${
                    selectedCanvasItem?.id === page.id
                      ? "border-neutral-900 bg-white"
                      : "border-neutral-200 bg-white"
                  }`}
                  onClick={() => setSelectedCanvasItemId(page.id)}
                >
                  <p className="truncate text-sm font-medium text-neutral-800">{page.title}</p>
                  <p className="mt-1 text-xs text-neutral-400">{page.pageCountSuggestion}</p>
                </button>
              ))
            ) : (
              <div className="flex h-20 min-w-full items-center justify-center border border-dashed border-neutral-300 bg-white text-sm text-neutral-400">
                后续这里会继续增强为真正的页面条与大纲条。
              </div>
            )}
          </div>
        }
      />

      {actionError ? (
        <div className="border-t border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:px-6">
          {actionError}
        </div>
      ) : null}

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader>
            <DialogTitle>生成作品集包装</DialogTitle>
            <DialogDescription>
              系统会根据当前项目顺序、固定页和项目结论，生成整份作品集的包装节奏建议。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-neutral-600">
            <div className="border border-neutral-200 bg-neutral-50 px-4 py-3">
              {checkingPrecheck ? (
                <div className="flex items-center gap-2 text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在检查这次包装是否可复用、是否会计次。
                </div>
              ) : generatePrecheck ? (
                <>
                  <p>本次属于高成本动作。</p>
                  <p className="mt-1">
                    {generatePrecheck.suggestedMode === "reuse"
                      ? "当前命中了可复用的整份包装结果，本次不会额外计次。"
                      : "本次会消耗：作品集包装 1 次"}
                  </p>
                  <p className="mt-1">
                    执行后剩余：{Math.max(generatePrecheck.actionRemaining - (generatePrecheck.consumesQuota ? 1 : 0), 0)} 次
                  </p>
                  <p className="mt-1">若失败，不计次。</p>
                </>
              ) : (
                <p>点击生成前会先检查当前输入是否命中复用，以及会不会计次。</p>
              )}
            </div>
            <div className="border border-neutral-200 bg-white px-4 py-3">
              <p>已选项目：{selectedProjects.length} 个</p>
              <p className="mt-1">已启用固定页：{fixedPages.filter((page) => page.enabled).length} 个</p>
            </div>
            <div className="border border-neutral-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">风格参考</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    风格参考只影响封面、固定页和整体包装语言，不改变项目顺序和项目讲法。
                  </p>
                </div>
                <Button variant="outline" className="h-9 px-3" onClick={handleOpenGenerate}>
                  重新检查
                </Button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  className={`border px-3 py-3 text-left ${
                    styleSelection.source === "none"
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 bg-white"
                  }`}
                  onClick={() => setStyleSelection({ source: "none" })}
                >
                  <p className="text-sm font-medium text-neutral-900">不使用风格参考</p>
                  <p className="mt-1 text-xs leading-5 text-neutral-500">
                    保持默认中性风格，优先稳定整份节奏。
                  </p>
                </button>
                {STYLE_PRESETS.slice(0, 3).map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={`border px-3 py-3 text-left ${
                      styleSelection.source === "preset" &&
                      styleSelection.presetKey === preset.key
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-200 bg-white"
                    }`}
                    onClick={() =>
                      setStyleSelection({ source: "preset", presetKey: preset.key })
                    }
                  >
                    <p className="text-sm font-medium text-neutral-900">{preset.label}</p>
                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      {preset.description}
                    </p>
                  </button>
                ))}
              </div>

              {initialData.styleReferenceSets.length > 0 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-mono uppercase tracking-[0.16em] text-neutral-400">
                    我的参考图组
                  </p>
                  {initialData.styleReferenceSets.slice(0, 3).map((set) => (
                    <button
                      key={set.id}
                      type="button"
                      className={`flex w-full items-start justify-between border px-3 py-3 text-left ${
                        styleSelection.source === "reference_set" &&
                        styleSelection.referenceSetId === set.id
                          ? "border-neutral-900 bg-neutral-50"
                          : "border-neutral-200 bg-white"
                      }`}
                      onClick={() =>
                        setStyleSelection({
                          source: "reference_set",
                          referenceSetId: set.id,
                          referenceSetName: set.name,
                        })
                      }
                    >
                      <div>
                        <p className="text-sm font-medium text-neutral-900">{set.name}</p>
                        <p className="mt-1 text-xs leading-5 text-neutral-500">
                          {set.description ?? `${set.imageUrls.length} 张参考图`}
                        </p>
                      </div>
                      {styleSelection.source === "reference_set" &&
                      styleSelection.referenceSetId === set.id ? (
                        <Check className="h-4 w-4 text-neutral-900" />
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            {selectedProjects.length === 0 ? (
              <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                当前还没有选入项目，无法生成作品集包装。
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleGeneratePackaging}
              disabled={
                generatingPackaging ||
                checkingPrecheck ||
                generatePrecheck?.suggestedMode === "block" ||
                selectedProjects.length === 0
              }
            >
              {generatingPackaging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              开始生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
