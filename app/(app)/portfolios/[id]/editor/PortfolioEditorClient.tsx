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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  EditorCanvasChip,
  EditorChromeButton,
  EditorEmptyState,
  editorFieldClass,
  EditorInfoList,
  EditorRailSection,
  EditorScaffold,
  EditorStripButton,
  EditorSurfaceButton,
  EditorTabsList,
  EditorTabsTrigger,
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
import { cn } from "@/lib/utils";

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

function portfolioVerdictLabel(verdict: PortfolioDiagnosis["overallVerdict"] | undefined) {
  if (verdict === "ready") return "可继续";
  if (verdict === "almost_ready") return "接近可继续";
  if (verdict === "needs_work") return "仍需补强";
  if (verdict === "insufficient") return "信息不足";
  return "待判断";
}

function pageRoleLabel(role: string) {
  if (role === "cover") return "封面";
  if (role === "about") return "关于我";
  if (role === "closing") return "结尾页";
  if (role === "project_case") return "项目案例";
  return role;
}

function EditorPanelCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-white/10 bg-white/3 text-white shadow-none", className)}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
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
  const selectedCanvasProject = useMemo(
    () =>
      selectedCanvasItem?.projectId
        ? projectMap.get(selectedCanvasItem.projectId) ?? null
        : null,
    [projectMap, selectedCanvasItem]
  );
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
  const enabledFixedPages = useMemo(
    () => fixedPages.filter((page) => page.enabled),
    [fixedPages]
  );
  const structureChecklist = useMemo(
    () => [
      {
        label: "项目池",
        done: selectedProjects.length >= 2,
        detail:
          selectedProjects.length >= 2
            ? `当前已选 ${selectedProjects.length} 个项目`
            : "建议至少选入 2 个项目",
      },
      {
        label: "固定页",
        done: enabledFixedPages.length >= 2,
        detail:
          enabledFixedPages.length >= 2
            ? `当前启用 ${enabledFixedPages.length} 个`
            : "建议至少保留封面与结尾页",
      },
      {
        label: "作品集诊断",
        done: Boolean(diagnosis),
        detail: diagnosis ? "整体节奏判断已返回" : "先跑一次作品集诊断",
      },
      {
        label: "整份包装",
        done: Boolean(packaging),
        detail: packaging ? `已生成 ${packaging.pages.length} 个页面单元` : "还没有包装结果",
      },
    ],
    [diagnosis, enabledFixedPages.length, packaging, selectedProjects.length]
  );
  const narrativeNotes = useMemo(() => {
    if (packaging?.qualityNotes?.length) return packaging.qualityNotes.slice(0, 4);
    if (diagnosis?.suggestions?.length) return diagnosis.suggestions.slice(0, 4);
    return [];
  }, [diagnosis, packaging]);
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
        statusMeta={packaging ? `${packaging.pages.length} pages` : `${selectedProjects.length} projects`}
        primaryAction={
          <Button
            className="h-9 px-4"
            onClick={handleOpenGenerate}
            disabled={selectedProjects.length === 0}
          >
            <Wand2 className="h-4 w-4" />
            生成作品集包装
          </Button>
        }
        secondaryAction={
          <EditorChromeButton
            className="h-9 px-4"
            onClick={handleRunDiagnosis}
            disabled={diagnosing}
          >
            {diagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            作品集诊断
          </EditorChromeButton>
        }
        planSummary={planSummary}
        leftRailLabel="Structure / Pages"
        rightRailLabel="Inspector / AI"
        leftRail={
          <Tabs defaultValue="structure" className="flex h-full flex-col">
            <div className="border-b border-white/10 p-3">
              <EditorTabsList className="grid w-full grid-cols-3">
                <EditorTabsTrigger value="structure">
                  结构
                </EditorTabsTrigger>
                <EditorTabsTrigger value="projects">
                  项目
                </EditorTabsTrigger>
                <EditorTabsTrigger value="pages">
                  页面
                </EditorTabsTrigger>
              </EditorTabsList>
            </div>

            <TabsContent value="structure" className="mt-0 flex-1 overflow-y-auto">
              <EditorRailSection title="作品集信息">
                <div className="space-y-3">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="作品集名称"
                    className={cn("h-10", editorFieldClass)}
                  />
                  <Button
                    variant="outline"
                    className="h-10 w-full border-white/10 bg-white text-neutral-900 hover:bg-white/90"
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
                      { label: "已选项目", value: `${selectedProjects.length} 个` },
                      { label: "固定页", value: `${enabledFixedPages.length} 个启用` },
                    ]}
                  />
                </div>
              </EditorRailSection>

              <EditorRailSection title="结构检查">
                <div className="space-y-2">
                  {structureChecklist.map((item) => (
                    <EditorPanelCard
                      key={item.label}
                      className={cn(
                        "",
                        item.done
                          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
                          : "border-white/10 bg-white/3 text-white/72"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {item.done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                        <p className="text-[10px] font-mono uppercase tracking-[0.16em] opacity-80">
                          {item.label}
                        </p>
                      </div>
                      <p className="mt-2 text-sm leading-6 opacity-80">{item.detail}</p>
                    </EditorPanelCard>
                  ))}
                </div>
              </EditorRailSection>

              <EditorRailSection title="固定页">
                <div className="space-y-2">
                  {fixedPages.map((page) => (
                    <EditorSurfaceButton
                      key={page.id}
                      active={page.enabled}
                      className={page.enabled ? "border-sky-400/35" : undefined}
                      onClick={() => handleToggleFixedPage(page.id)}
                      disabled={updatingStructure}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium">{page.label}</p>
                          <p className="mt-1 text-xs opacity-70">
                            {page.enabled ? "已启用" : "当前关闭"}
                          </p>
                        </div>
                        {page.enabled ? <Check className="h-4 w-4" /> : null}
                      </div>
                    </EditorSurfaceButton>
                  ))}
                </div>
              </EditorRailSection>
            </TabsContent>

            <TabsContent value="projects" className="mt-0 flex-1 overflow-y-auto">
              <EditorRailSection title="已选项目">
                <div className="space-y-2">
                  {selectedProjects.length > 0 ? (
                    selectedProjects.map((project) => (
                      <EditorPanelCard key={project.id} className="bg-white/2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white">{project.name}</p>
                            <p className="mt-1 text-xs text-white/46">{projectStageLabel(project)}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <EditorChromeButton
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleMoveProject(project.id, "up")}
                              disabled={updatingStructure}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </EditorChromeButton>
                            <EditorChromeButton
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleMoveProject(project.id, "down")}
                              disabled={updatingStructure}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </EditorChromeButton>
                            <EditorChromeButton
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleToggleProject(project.id)}
                              disabled={updatingStructure}
                            >
                              <X className="h-3.5 w-3.5" />
                            </EditorChromeButton>
                          </div>
                        </div>
                      </EditorPanelCard>
                    ))
                  ) : (
                    <EditorEmptyState>
                      还没有选入项目。先从下面加入 2-4 个最能代表能力面的项目。
                    </EditorEmptyState>
                  )}
                </div>
              </EditorRailSection>

              <EditorRailSection title="可加入项目" className="flex-1">
                <div className="space-y-2">
                  {availableProjects.length > 0 ? (
                    availableProjects.map((project) => (
                      <EditorSurfaceButton
                        key={project.id}
                        className="flex items-center justify-between"
                        onClick={() => handleToggleProject(project.id)}
                        disabled={updatingStructure}
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{project.name}</p>
                          <p className="mt-1 text-xs text-white/46">{projectStageLabel(project)}</p>
                        </div>
                        <Plus className="h-4 w-4 shrink-0 text-white/46" />
                      </EditorSurfaceButton>
                    ))
                  ) : (
                    <EditorEmptyState>
                      所有可用项目都已经在当前作品集里了。
                    </EditorEmptyState>
                  )}
                </div>
              </EditorRailSection>
            </TabsContent>

            <TabsContent value="pages" className="mt-0 flex-1 overflow-y-auto">
              <EditorRailSection title="页面列表">
                <div className="space-y-2">
                  {pages.length > 0 ? (
                    pages.map((page, index) => (
                      <EditorSurfaceButton
                        key={page.id}
                        active={selectedCanvasItem?.id === page.id}
                        onClick={() => setSelectedCanvasItemId(page.id)}
                      >
                        <p className="text-[10px] font-mono uppercase tracking-[0.16em] opacity-70">
                          Page {index + 1}
                        </p>
                        <p className="mt-2 text-sm font-medium">{page.title}</p>
                        <p className="mt-1 text-xs leading-5 opacity-70">
                          {pageRoleLabel(page.pageRole)} · {page.pageCountSuggestion}
                        </p>
                      </EditorSurfaceButton>
                    ))
                  ) : (
                    <EditorEmptyState>
                      还没有页面结构。先选项目并运行作品集诊断。
                    </EditorEmptyState>
                  )}
                </div>
              </EditorRailSection>

              <EditorRailSection title="历史">
                {aiHistory.length > 0 ? (
                  <div className="space-y-2">
                    {aiHistory.map((item) => (
                      <EditorPanelCard key={item.key} className="bg-white/2">
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="mt-1 text-xs leading-5 text-white/46">{item.summary}</p>
                      </EditorPanelCard>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-white/46">
                    当前还没有作品集级历史。运行诊断或生成包装后，这里会承接最近结论。
                  </p>
                )}
              </EditorRailSection>
            </TabsContent>
          </Tabs>
        }
        center={
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <EditorCanvasChip active={selectedProjects.length >= 2}>
                  Projects {selectedProjects.length}
                </EditorCanvasChip>
                <EditorCanvasChip active={enabledFixedPages.length >= 2}>
                  Fixed Pages {enabledFixedPages.length}
                </EditorCanvasChip>
                <EditorCanvasChip active={Boolean(diagnosis)}>
                  Diagnosis {diagnosis ? portfolioVerdictLabel(diagnosis.overallVerdict) : "Pending"}
                </EditorCanvasChip>
                <EditorCanvasChip active={Boolean(packaging)}>
                  {packaging ? `${packaging.pages.length} pages` : "No packaging"}
                </EditorCanvasChip>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-8">
              <div className="mx-auto flex min-h-full min-w-max flex-col gap-10">
                <div className="flex flex-wrap gap-2">
                  {narrativeNotes.length > 0 ? (
                    narrativeNotes.slice(0, 4).map((note) => (
                      <EditorCanvasChip key={note}>{note}</EditorCanvasChip>
                    ))
                  ) : (
                    structureChecklist.map((item) => (
                      <EditorCanvasChip key={item.label} active={item.done}>
                        {item.label}
                      </EditorCanvasChip>
                    ))
                  )}
                </div>

                {pages.length === 0 ? (
                  <div className="flex w-[720px] items-center justify-center rounded-[28px] border border-dashed border-white/10 bg-white/3 px-10 py-20 text-center">
                    <div className="max-w-xl">
                      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/34">
                        Empty Canvas
                      </p>
                      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">
                        先组一份能讲故事的作品集结构
                      </h2>
                      <p className="mt-4 text-sm leading-7 text-white/56">
                        左侧先加入 2-4 个项目，保留关键固定页，再运行作品集诊断。生成包装之后，中间画布会变成真正的页面序列。
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "grid gap-10",
                      pages.length === 1 ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"
                    )}
                  >
                    {pages.map((page, index) => {
                      const relatedProject = page.projectId ? projectMap.get(page.projectId) : null;
                      const active = selectedCanvasItem?.id === page.id;

                      return (
                        <div key={page.id} className="space-y-2">
                          <p className="px-1 text-xs font-mono uppercase tracking-[0.16em] text-white/34">
                            Page {index + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => setSelectedCanvasItemId(page.id)}
                            className="block text-left"
                          >
                            <div
                              className={cn(
                                "flex min-h-[430px] w-[344px] flex-col justify-between overflow-hidden rounded-[28px] border bg-white text-neutral-900 shadow-[0_28px_90px_-52px_rgba(0,0,0,0.55)] transition-all",
                                active ? "border-sky-400 ring-2 ring-sky-400/70" : "border-black/10"
                              )}
                            >
                              <div className="border-b border-neutral-200 px-5 py-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                                      {page.type === "fixed" ? "Fixed Page" : "Project Page"}
                                    </p>
                                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-neutral-950">
                                      {page.title}
                                    </h2>
                                  </div>
                                  <span className="rounded-full border border-neutral-200 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-500">
                                    {page.pageCountSuggestion}
                                  </span>
                                </div>
                              </div>

                              <div className="flex-1 px-5 py-5">
                                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
                                  <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400">
                                    {pageRoleLabel(page.pageRole)}
                                  </p>
                                  <p className="mt-3 text-sm leading-6 text-neutral-600">
                                    {page.summary}
                                  </p>
                                </div>

                                <div className="mt-4 space-y-2">
                                  <div className="border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-600">
                                    页面职责：{pageRoleLabel(page.pageRole)}
                                  </div>
                                  <div className="border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-600">
                                    页面类型：{page.type === "fixed" ? "固定页" : "项目页"}
                                  </div>
                                  <div className="border border-neutral-200 bg-white px-3 py-3 text-sm text-neutral-600">
                                    {relatedProject
                                      ? `关联项目：${relatedProject.name}`
                                      : "固定页会在整份叙事里承担结构锚点。"}
                                  </div>
                                </div>
                              </div>

                              <div className="border-t border-neutral-200 px-5 py-4">
                                <p className="text-xs text-neutral-400">
                                  {relatedProject
                                    ? projectStageLabel(relatedProject)
                                    : "封面 / 关于我 / 结尾等固定结构"}
                                </p>
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        }
        rightRail={
          <Tabs defaultValue="inspector" className="flex h-full flex-col">
            <div className="border-b border-white/10 p-3">
              <EditorTabsList className="grid w-full grid-cols-2">
                <EditorTabsTrigger value="inspector">
                  Inspector
                </EditorTabsTrigger>
                <EditorTabsTrigger value="ai">
                  AI
                </EditorTabsTrigger>
              </EditorTabsList>
            </div>

            <TabsContent value="inspector" className="mt-0 flex-1 overflow-y-auto">
              <EditorRailSection title="选中页面">
                {selectedCanvasItem ? (
                  <>
                    <EditorInfoList
                      items={[
                        { label: "页面标题", value: selectedCanvasItem.title },
                        { label: "页面类型", value: selectedCanvasItem.type === "fixed" ? "固定页" : "项目页" },
                        { label: "页面角色", value: pageRoleLabel(selectedCanvasItem.pageRole) },
                        { label: "建议页数", value: selectedCanvasItem.pageCountSuggestion },
                      ]}
                    />
                    <EditorPanelCard className="mt-4">
                      <p className="text-sm font-medium text-white">{selectedCanvasItem.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/56">{selectedCanvasItem.summary}</p>
                    </EditorPanelCard>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-white/46">
                    当前还没有可检查的页面单元。
                  </p>
                )}
              </EditorRailSection>

              <EditorRailSection title="对象状态">
                <EditorInfoList
                  items={[
                    { label: "对象类型", value: "Portfolio" },
                    { label: "当前状态", value: portfolioStatusLabel(status) },
                    { label: "已选项目", value: `${selectedProjects.length} 个` },
                    { label: "固定页", value: `${enabledFixedPages.length} 个` },
                  ]}
                />
              </EditorRailSection>

              <EditorRailSection title="关联项目">
                {selectedCanvasProject ? (
                  <EditorPanelCard>
                    <p className="text-sm font-medium text-white">{selectedCanvasProject.name}</p>
                    <p className="mt-2 text-sm leading-6 text-white/56">
                      {selectedCanvasProject.layout?.narrativeSummary ??
                        selectedCanvasProject.resultSummary ??
                        selectedCanvasProject.background ??
                        "当前项目还没有稳定摘要，建议先回项目编辑器补齐项目结论。"}
                    </p>
                  </EditorPanelCard>
                ) : (
                  <p className="text-sm leading-6 text-white/46">
                    当前选中的是固定页，它不对应具体项目。
                  </p>
                )}
              </EditorRailSection>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 flex-1 overflow-y-auto">
              <EditorRailSection title="Current Conclusion">
                <EditorPanelCard>
                  <p className="text-sm leading-7 text-white/74">
                    {packaging?.narrativeSummary ??
                      diagnosis?.summary ??
                      "先运行作品集诊断，系统会判断当前项目组合、固定页和整体节奏是否足以进入整份包装。"}
                  </p>
                </EditorPanelCard>
              </EditorRailSection>

              <EditorRailSection title="AI 结果">
                {diagnosis ? (
                  <div className="space-y-3">
                    <EditorPanelCard>
                      <p className="text-sm font-medium text-white">
                        作品集诊断 · {portfolioVerdictLabel(diagnosis.overallVerdict)}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-white/56">{diagnosis.summary}</p>
                    </EditorPanelCard>
                    {diagnosis.suggestions.map((suggestion) => (
                      <EditorPanelCard key={suggestion} className="bg-white/2">
                        <p className="text-sm leading-6 text-white/56">{suggestion}</p>
                      </EditorPanelCard>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-white/46">
                    还没有作品集级 AI 结果。点击顶部“作品集诊断”，系统会判断项目选择、固定页和整份节奏。
                  </p>
                )}
              </EditorRailSection>

              <EditorRailSection title="AI 历史">
                {aiHistory.length > 0 ? (
                  <div className="space-y-2">
                    {aiHistory.map((item) => (
                      <EditorPanelCard key={item.key} className="bg-white/2">
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-white/56">{item.summary}</p>
                      </EditorPanelCard>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-white/46">
                    当前还没有可回看的作品集级历史。
                  </p>
                )}
              </EditorRailSection>

              <EditorRailSection title="下一步结论">
                <p className="text-sm leading-6 text-white/56">{nextStepConclusion}</p>
                <div className="mt-4 space-y-2">
                  <Link
                    href={`/portfolios/${initialData.id}/publish`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/3 px-3 py-3 text-sm font-medium text-white/72 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    打开发布与导出页
                    <ArrowRight className="h-3.5 w-3.5 text-white/34" />
                  </Link>
                </div>
              </EditorRailSection>
            </TabsContent>
          </Tabs>
        }
        bottomStrip={
          <div className="flex gap-2 overflow-x-auto">
            {pages.length > 0 ? (
              pages.map((page, index) => (
                <EditorStripButton
                  key={page.id}
                  onClick={() => setSelectedCanvasItemId(page.id)}
                  active={selectedCanvasItem?.id === page.id}
                  className="w-44"
                >
                  <p className="truncate text-[10px] font-mono uppercase tracking-[0.16em] opacity-70">
                    Page {index + 1}
                  </p>
                  <p className="mt-2 truncate text-sm font-medium">{page.title}</p>
                  <p className="mt-1 text-xs opacity-70">{page.pageCountSuggestion}</p>
                </EditorStripButton>
              ))
            ) : (
              <EditorEmptyState className="flex h-20 min-w-full items-center justify-center py-0 text-white/40">
                这里会承接整份作品集的页面条。
              </EditorEmptyState>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>生成作品集包装</DialogTitle>
            <DialogDescription>
              系统会根据当前项目顺序、固定页和项目结论，生成整份作品集的包装节奏建议。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-neutral-600">
            <Card className="shadow-none">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="secondary" className="rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]">
                    预检
                  </Badge>
                  {generatePrecheck?.suggestedMode === "reuse" ? (
                    <Badge variant="outline" className="rounded-full">
                      可复用
                    </Badge>
                  ) : null}
                </div>
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
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="space-y-3 p-4">
                <Badge variant="secondary" className="w-fit rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]">
                  当前上下文
                </Badge>
                <div className="space-y-1">
                  <p>已选项目：{selectedProjects.length} 个</p>
                  <p>已启用固定页：{fixedPages.filter((page) => page.enabled).length} 个</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
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

              <Separator className="my-4" />

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <button
                  type="button"
                  className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                    styleSelection.source === "none"
                      ? "border-neutral-900 bg-neutral-100"
                      : "border-neutral-200 bg-white hover:border-neutral-300"
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
                    className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                      styleSelection.source === "preset" &&
                      styleSelection.presetKey === preset.key
                        ? "border-neutral-900 bg-neutral-100"
                        : "border-neutral-200 bg-white hover:border-neutral-300"
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
                      className={`flex w-full items-start justify-between rounded-xl border px-3 py-3 text-left transition-colors ${
                        styleSelection.source === "reference_set" &&
                        styleSelection.referenceSetId === set.id
                          ? "border-neutral-900 bg-neutral-100"
                          : "border-neutral-200 bg-white hover:border-neutral-300"
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
              </CardContent>
            </Card>
            {selectedProjects.length === 0 ? (
              <Card className="border-amber-200 bg-amber-50 text-amber-900 shadow-none">
                <CardContent className="p-4">
                  当前还没有选入项目，无法生成作品集包装。
                </CardContent>
              </Card>
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
