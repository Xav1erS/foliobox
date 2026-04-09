"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { uploadFilesFromBrowser } from "@/lib/blob-client-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageUploadZone } from "@/components/app/ImageUploadZone";
import {
  EditorInfoList,
  EditorRailSection,
  EditorScaffold,
} from "@/components/editor/EditorScaffold";
import {
  PROJECT_STAGE_LABEL,
  PROJECT_STATUS_LABEL,
} from "@/lib/project-workflow";
import type { PlanSummaryCopy } from "@/lib/entitlement";
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
};

type ProjectFactsForm = {
  projectType: string;
  industry: string;
  roleTitle: string;
  background: string;
  resultSummary: string;
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
};

function getLegacyProjectPath(project: { id: string; stage: string }) {
  if (project.stage === "BOUNDARY") {
    return {
      href: `/projects/${project.id}/boundary`,
      label: "边界确认兼容页",
      description: "继续使用当前边界分析能力。",
    };
  }
  if (project.stage === "COMPLETENESS") {
    return {
      href: `/projects/${project.id}/completeness`,
      label: "完整度兼容页",
      description: "继续补充 facts 并运行完整度分析。",
    };
  }
  if (project.stage === "PACKAGE") {
    return {
      href: `/projects/${project.id}/package`,
      label: "包装模式兼容页",
      description: "继续选择深讲、浅讲或补充展示。",
    };
  }
  if (project.stage === "LAYOUT" || project.stage === "READY") {
    return {
      href: `/projects/${project.id}/layout`,
      label: "排版兼容页",
      description: "继续查看当前 layout 生成结果。",
    };
  }

  return {
    href: `/projects/${project.id}/boundary`,
    label: "开始整理兼容页",
    description: "当前过渡阶段仍复用旧流程能力。",
  };
}

function packageModeLabel(mode: string | null) {
  if (mode === "DEEP") return "深讲";
  if (mode === "LIGHT") return "浅讲";
  if (mode === "SUPPORTIVE") return "补充展示";
  return "待判断";
}

function sourceTypeLabel(sourceType: string) {
  if (sourceType === "FIGMA") return "Figma 链接";
  if (sourceType === "IMAGES") return "图片上传";
  return "手动创建";
}

function verdictLabel(verdict: string | undefined) {
  if (verdict === "ready") return "可继续";
  if (verdict === "almost_ready") return "接近可继续";
  if (verdict === "needs_work") return "仍需补充";
  if (verdict === "insufficient") return "信息不足";
  return "待判断";
}

export function ProjectEditorClient({
  initialData,
  planSummary,
}: {
  initialData: ProjectEditorInitialData;
  planSummary: PlanSummaryCopy;
}) {
  const router = useRouter();
  const [facts, setFacts] = useState<ProjectFactsForm>(initialData.facts);
  const [assets, setAssets] = useState<ProjectAsset[]>(initialData.assets);
  const [stage, setStage] = useState(initialData.stage);
  const [packageMode, setPackageMode] = useState(initialData.packageMode);
  const [boundaryAnalysis, setBoundaryAnalysis] = useState(initialData.boundaryAnalysis);
  const [completenessAnalysis, setCompletenessAnalysis] = useState(
    initialData.completenessAnalysis
  );
  const [packageRecommendation, setPackageRecommendation] = useState(
    initialData.packageRecommendation
  );
  const [layout, setLayout] = useState(initialData.layout);
  const [savingFacts, setSavingFacts] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const [factsMessage, setFactsMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [notesDraft, setNotesDraft] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingAssets, setUploadingAssets] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generatingLayout, setGeneratingLayout] = useState(false);

  const stageInfo =
    stage && stage !== "DRAFT"
      ? PROJECT_STAGE_LABEL[stage]
      : PROJECT_STATUS_LABEL[initialData.importStatus] ?? PROJECT_STATUS_LABEL.DRAFT;
  const legacyEntry = getLegacyProjectPath({ id: initialData.id, stage });
  const displayAssets = useMemo(() => {
    const selectedAssets = assets.filter((asset) => asset.selected);
    return selectedAssets.length > 0 ? selectedAssets : assets;
  }, [assets]);
  const diagnosisHistory = useMemo(
    () =>
      [
        boundaryAnalysis
          ? { key: "boundary", label: "边界分析", summary: boundaryAnalysis.projectSummary }
          : null,
        completenessAnalysis
          ? {
              key: "completeness",
              label: "完整度检查",
              summary: completenessAnalysis.overallComment,
            }
          : null,
        packageRecommendation
          ? {
              key: "package",
              label: "包装模式推荐",
              summary: packageRecommendation.reasoning,
            }
          : null,
        layout
          ? {
              key: "layout",
              label: "排版结果",
              summary: layout.narrativeSummary,
            }
          : null,
      ].filter(Boolean) as Array<{ key: string; label: string; summary: string }>,
    [boundaryAnalysis, completenessAnalysis, packageRecommendation, layout]
  );
  const nextStepConclusion = useMemo(() => {
    if (layout) {
      return "当前项目已经拿到排版结果，可以继续细看页面结构，或回到兼容页补查旧链路结果。";
    }
    if (displayAssets.length === 0) {
      return "先补充能代表项目过程与结果的素材，再运行项目诊断。";
    }
    if (!boundaryAnalysis || !completenessAnalysis || !packageRecommendation) {
      return "先运行一次完整项目诊断，把边界、完整度和包装模式结论补齐。";
    }
    if (!completenessAnalysis.canProceed) {
      return completenessAnalysis.prioritySuggestions[0] ?? "先按完整度建议补充关键信息，再进入排版。";
    }
    if (!packageMode) {
      return `建议按“${packageModeLabel(packageRecommendation.recommendedMode)}”模式继续生成排版。`;
    }
    return "当前信息已经足够，可以直接从顶部发起排版生成。";
  }, [
    boundaryAnalysis,
    completenessAnalysis,
    displayAssets.length,
    layout,
    packageMode,
    packageRecommendation,
  ]);

  async function parseJsonResponse(response: Response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        (data as { error?: string }).error === "quota_exceeded"
          ? "当前排版次数已用完，请先前往权益页查看剩余次数。"
          : (data as { error?: string }).error ?? "请求失败，请稍后重试";
      throw new Error(message);
    }
    return data;
  }

  async function refreshAssets() {
    const response = await fetch(`/api/projects/${initialData.id}/assets`);
    const data = await parseJsonResponse(response);
    setAssets(data.assets as ProjectAsset[]);
  }

  async function handleSaveFacts() {
    setSavingFacts(true);
    setFactsMessage("");
    setActionError("");

    try {
      await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/facts`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(facts),
        })
      );
      setFactsMessage("项目信息已保存");
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "保存失败，请稍后重试");
    } finally {
      setSavingFacts(false);
    }
  }

  async function handleUploadAssets() {
    if (pendingFiles.length === 0) return;

    setUploadingAssets(true);
    setActionError("");

    try {
      const uploadedFiles = await uploadFilesFromBrowser({
        files: pendingFiles,
        folder: "project-assets",
        kind: "project-image",
      });

      await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/assets/upload`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ files: uploadedFiles }),
        })
      );

      await refreshAssets();
      setPendingFiles([]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "素材上传失败，请稍后重试");
    } finally {
      setUploadingAssets(false);
    }
  }

  async function handleRunDiagnosis() {
    setDiagnosing(true);
    setActionError("");

    try {
      const [boundaryResult, completenessResult, packageResult] = await Promise.allSettled([
        parseJsonResponse(
          await fetch(`/api/projects/${initialData.id}/boundary/analyze`, { method: "POST" })
        ),
        parseJsonResponse(
          await fetch(`/api/projects/${initialData.id}/completeness/analyze`, { method: "POST" })
        ),
        parseJsonResponse(
          await fetch(`/api/projects/${initialData.id}/package/recommend`, { method: "POST" })
        ),
      ]);
      const failures: string[] = [];
      let successCount = 0;

      if (boundaryResult.status === "fulfilled") {
        setBoundaryAnalysis(boundaryResult.value.analysis as BoundaryAnalysis);
        successCount += 1;
      } else {
        failures.push(
          `边界分析：${boundaryResult.reason instanceof Error ? boundaryResult.reason.message : "失败"}`
        );
      }

      if (completenessResult.status === "fulfilled") {
        setCompletenessAnalysis(completenessResult.value.analysis as CompletenessAnalysis);
        successCount += 1;
      } else {
        failures.push(
          `完整度检查：${completenessResult.reason instanceof Error ? completenessResult.reason.message : "失败"}`
        );
      }

      if (packageResult.status === "fulfilled") {
        setPackageRecommendation(packageResult.value.recommendation as PackageRecommendation);
        successCount += 1;
      } else {
        failures.push(
          `包装模式推荐：${packageResult.reason instanceof Error ? packageResult.reason.message : "失败"}`
        );
      }

      if (failures.length > 0) {
        setActionError(
          successCount > 0
            ? `部分诊断已完成；${failures.join("；")}`
            : failures.join("；")
        );
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "项目诊断失败，请稍后重试");
    } finally {
      setDiagnosing(false);
    }
  }

  async function ensureLayoutStage(mode: string) {
    let currentStage = stage;
    let guard = 0;

    while (!["LAYOUT", "READY"].includes(currentStage) && guard < 6) {
      const response = await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/stage`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(currentStage === "PACKAGE" ? { packageMode: mode } : {}),
        })
      );

      currentStage = response.stage as string;
      setStage(currentStage);

      if (response.packageMode) {
        setPackageMode(response.packageMode as string);
      }

      guard += 1;
    }

    return currentStage;
  }

  async function handleGenerateLayout() {
    const resolvedMode = packageMode ?? packageRecommendation?.recommendedMode ?? null;

    if (!resolvedMode) {
      setActionError("请先运行项目诊断，或先在兼容页确认包装模式。");
      return;
    }

    setGeneratingLayout(true);
    setActionError("");

    try {
      if (!packageMode) {
        const stageData = await parseJsonResponse(
          await fetch(`/api/projects/${initialData.id}/stage`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageMode: resolvedMode, preserveStage: true }),
          })
        );

        if (stageData.packageMode) {
          setPackageMode(stageData.packageMode as string);
        }
        if (stageData.stage) {
          setStage(stageData.stage as string);
        }
      }

      await ensureLayoutStage(resolvedMode);

      const data = await parseJsonResponse(
        await fetch(`/api/projects/${initialData.id}/layout/generate`, {
          method: "POST",
        })
      );

      setLayout(data.layoutJson as LayoutJson);
      setGenerateOpen(false);
      router.refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "排版生成失败，请稍后重试");
    } finally {
      setGeneratingLayout(false);
    }
  }

  return (
    <>
      <EditorScaffold
        objectLabel="Project"
        objectName={initialData.name}
        backHref="/projects"
        backLabel="全部项目"
        statusLabel={stageInfo?.label ?? "草稿"}
        statusMeta={`${displayAssets.length} 张展示素材`}
        primaryAction={
          <Button className="h-10 px-4" onClick={() => setGenerateOpen(true)}>
            <Wand2 className="h-4 w-4" />
            生成排版
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
            项目诊断
          </Button>
        }
        topNote={
          <>
            这是里程碑 A 的 <strong>Project Editor MVP</strong>。当前已经把项目入口、核心 facts、
            素材补充、项目诊断和排版生成统一收口到同一页里；旧的 `boundary / completeness / package / layout`
            页面暂时保留为兼容层，后续会继续下沉为 editor 内部动作。
          </>
        }
        planSummary={planSummary}
        leftRail={
          <>
            <EditorRailSection title="项目信息">
              <EditorInfoList
                items={[
                  { label: "导入方式", value: sourceTypeLabel(initialData.sourceType) },
                  { label: "包装模式", value: packageModeLabel(packageMode) },
                  { label: "排版状态", value: layout ? `${layout.totalPages} 页` : "未生成" },
                ]}
              />
              {initialData.sourceUrl ? (
                <a
                  href={initialData.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block truncate text-sm text-neutral-700 underline-offset-2 hover:underline"
                >
                  {initialData.sourceUrl}
                </a>
              ) : null}
            </EditorRailSection>

            <EditorRailSection title="项目背景">
              <div className="space-y-3">
                <Input
                  value={facts.projectType}
                  onChange={(event) =>
                    setFacts((current) => ({ ...current, projectType: event.target.value }))
                  }
                  placeholder="项目类型"
                  className="h-10 rounded-none border-neutral-300"
                />
                <Input
                  value={facts.industry}
                  onChange={(event) =>
                    setFacts((current) => ({ ...current, industry: event.target.value }))
                  }
                  placeholder="所属行业"
                  className="h-10 rounded-none border-neutral-300"
                />
                <Input
                  value={facts.roleTitle}
                  onChange={(event) =>
                    setFacts((current) => ({ ...current, roleTitle: event.target.value }))
                  }
                  placeholder="我的角色"
                  className="h-10 rounded-none border-neutral-300"
                />
                <Textarea
                  value={facts.background}
                  onChange={(event) =>
                    setFacts((current) => ({ ...current, background: event.target.value }))
                  }
                  placeholder="项目背景"
                  className="min-h-24 rounded-none border-neutral-300"
                />
                <Textarea
                  value={facts.resultSummary}
                  onChange={(event) =>
                    setFacts((current) => ({ ...current, resultSummary: event.target.value }))
                  }
                  placeholder="结果摘要"
                  className="min-h-20 rounded-none border-neutral-300"
                />

                <Button
                  variant="outline"
                  className="h-10 w-full"
                  onClick={handleSaveFacts}
                  disabled={savingFacts}
                >
                  {savingFacts ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  保存项目信息
                </Button>
                {factsMessage ? (
                  <p className="text-xs text-emerald-600">{factsMessage}</p>
                ) : null}
              </div>
            </EditorRailSection>

            <EditorRailSection title="素材库" className="flex-1">
              <ImageUploadZone
                files={pendingFiles}
                onFilesChange={setPendingFiles}
                disabled={uploadingAssets}
                onError={(message) => setActionError(message)}
              />
              <Button
                className="mt-3 h-10 w-full"
                onClick={handleUploadAssets}
                disabled={uploadingAssets || pendingFiles.length === 0}
              >
                {uploadingAssets ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                上传到当前项目
              </Button>

              <div className="mt-4 space-y-2">
                {displayAssets.slice(0, 4).map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 border border-neutral-200 bg-neutral-50 px-3 py-2"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden border border-neutral-200 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                        alt={asset.title ?? "素材"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-neutral-700">
                        {asset.title ?? "未命名素材"}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {asset.isCover ? "封面素材" : asset.selected ? "已选中" : "未选中"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </EditorRailSection>

            <EditorRailSection title="备注">
              <Textarea
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                placeholder="把还没整理进 facts 的线索临时记在这里"
                className="min-h-24 rounded-none border-neutral-300"
              />
              <p className="mt-2 text-xs leading-5 text-neutral-400">
                里程碑 A 先用本地备注位承接编辑器语义，当前不会写回项目 facts，后续会拆成独立备注对象与 AI 可引用内容。
              </p>
            </EditorRailSection>

            <EditorRailSection title="画板">
              <EditorInfoList
                items={[
                  { label: "主画布素材", value: `${displayAssets.length} 张` },
                  { label: "最近排版", value: layout ? `${layout.totalPages} 页` : "尚未生成" },
                ]}
              />
            </EditorRailSection>

            <EditorRailSection title="历史">
              {diagnosisHistory.length > 0 ? (
                <div className="space-y-2">
                  {diagnosisHistory.slice(0, 3).map((item) => (
                    <div key={item.key} className="border border-neutral-200 bg-white px-3 py-3">
                      <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-neutral-500">{item.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-6 text-neutral-500">
                  当前还没有可回看的编辑历史。运行项目诊断后，这里会先承接最近结论。
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
                    项目画布与当前结果
                  </h2>
                </div>
                <span className="text-sm text-neutral-500">
                  当前已统一接入 facts、诊断与生成动作
                </span>
              </div>

              <div className="grid gap-4 px-5 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
                <div className="border border-dashed border-neutral-300 bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-900">项目主画布</p>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    这一步先用真实素材和当前 layout 结果承接编辑器主舞台。下一轮会继续补画板语义、对象选中态和更完整的页面编辑能力。
                  </p>

                  {displayAssets.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {displayAssets.slice(0, 6).map((asset) => (
                        <div key={asset.id} className="border border-neutral-200 bg-white p-2">
                          <div className="aspect-[4/3] overflow-hidden border border-neutral-200 bg-neutral-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                              alt={asset.title ?? "素材"}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <p className="mt-2 truncate text-sm text-neutral-700">
                            {asset.title ?? "未命名素材"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 flex min-h-48 items-center justify-center border border-dashed border-neutral-300 bg-white text-sm text-neutral-400">
                      当前还没有素材，先在左侧素材库上传图片。
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="border border-neutral-200 bg-white p-4">
                    <p className="text-sm font-medium text-neutral-900">当前项目结论</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                      {layout?.narrativeSummary ??
                        packageRecommendation?.reasoning ??
                        completenessAnalysis?.overallComment ??
                        "先运行项目诊断，系统会在右侧 AI 面板和这里给出当前项目的结论与下一步建议。"}
                    </p>
                  </div>

                  <div className="border border-neutral-200 bg-white p-4">
                    <p className="text-sm font-medium text-neutral-900">下一步结论</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">{nextStepConclusion}</p>
                  </div>

                  <div className="border border-neutral-200 bg-white p-4">
                    <p className="text-sm font-medium text-neutral-900">兼容层入口</p>
                    <p className="mt-2 text-sm leading-6 text-neutral-500">
                      当前 editor 已经接管主入口，但旧的分步页面仍保留用于兼容承接。
                    </p>
                    <Link
                      href={legacyEntry.href}
                      className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900"
                    >
                      {legacyEntry.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  {layout ? (
                    <div className="border border-neutral-200 bg-white p-4">
                      <p className="text-sm font-medium text-neutral-900">最近一次排版结果</p>
                      <p className="mt-2 text-sm text-neutral-500">
                        共 {layout.totalPages} 页 · 模式 {packageModeLabel(layout.packageMode)}
                      </p>
                      <ul className="mt-3 space-y-2">
                        {layout.pages.slice(0, 3).map((page) => (
                          <li key={page.pageNumber} className="text-sm text-neutral-600">
                            {page.pageNumber}. {page.titleSuggestion}
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
                <EditorInfoList
                  items={[
                    { label: "对象类型", value: "Project" },
                    { label: "当前状态", value: stageInfo?.label ?? "草稿" },
                    { label: "素材数量", value: `${assets.length} 张` },
                    { label: "包装模式", value: packageModeLabel(packageMode) },
                  ]}
                />
              </EditorRailSection>

              <EditorRailSection title="排版准备度">
                <p className="text-sm leading-6 text-neutral-500">
                  {packageMode || packageRecommendation
                    ? "当前已经具备包装模式信息，可以直接在顶部发起生成排版。"
                    : "当前还没有包装模式结论。先运行项目诊断，系统会给出包装模式推荐。"}
                </p>
              </EditorRailSection>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 flex-1">
              <EditorRailSection title="AI 面板">
                {diagnosisHistory.length === 0 ? (
                  <p className="text-sm leading-6 text-neutral-500">
                    还没有 AI 结果。点击顶部“项目诊断”，系统会在这里返回边界、完整度和包装模式建议。
                  </p>
                ) : (
                  <div className="space-y-3">
                    {boundaryAnalysis ? (
                      <div className="border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-sm font-medium text-neutral-900">边界分析</p>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {boundaryAnalysis.projectSummary}
                        </p>
                      </div>
                    ) : null}

                    {completenessAnalysis ? (
                      <div className="border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-sm font-medium text-neutral-900">
                          完整度检查 · {verdictLabel(completenessAnalysis.overallVerdict)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {completenessAnalysis.overallComment}
                        </p>
                      </div>
                    ) : null}

                    {packageRecommendation ? (
                      <div className="border border-neutral-200 bg-neutral-50 p-3">
                        <p className="text-sm font-medium text-neutral-900">
                          包装模式推荐 · {packageModeLabel(packageRecommendation.recommendedMode)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-neutral-600">
                          {packageRecommendation.reasoning}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </EditorRailSection>

              <EditorRailSection title="AI 历史">
                {diagnosisHistory.length > 0 ? (
                  <div className="space-y-2">
                    {diagnosisHistory.map((item) => (
                      <div key={item.key} className="border border-neutral-200 bg-white px-3 py-3">
                        <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-neutral-500">{item.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-neutral-500">
                    当前还没有可回看的历史结果。
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
            {displayAssets.length > 0 ? (
              displayAssets.slice(0, 8).map((asset) => (
                <div
                  key={asset.id}
                  className="w-28 shrink-0 border border-neutral-200 bg-white p-2"
                >
                  <div className="aspect-[4/3] overflow-hidden border border-neutral-200 bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                      alt={asset.title ?? "素材"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="mt-2 truncate text-xs text-neutral-500">
                    {asset.title ?? "未命名素材"}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex h-20 min-w-full items-center justify-center border border-dashed border-neutral-300 bg-white text-sm text-neutral-400">
                后续这里会继续增强为真正的底部画板条与大纲条。
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
            <DialogTitle>生成排版</DialogTitle>
            <DialogDescription>
              当前继续复用旧 layout 生成链路，但入口已经统一收口到 Project Editor。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-neutral-600">
            <div className="border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p>本次属于高成本动作。</p>
              <p className="mt-1">失败不应计入有效消耗，后续会继续补齐显式配额提示。</p>
            </div>
            <div className="border border-neutral-200 bg-white px-4 py-3">
              <p>当前阶段：{stageInfo?.label ?? "草稿"}</p>
              <p className="mt-1">
                当前包装模式：
                {packageModeLabel(packageMode ?? packageRecommendation?.recommendedMode ?? null)}
              </p>
            </div>
            {!packageMode && !packageRecommendation ? (
              <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                还没有包装模式结论。先运行“项目诊断”，或前往兼容页确认包装模式。
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:space-x-0">
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleGenerateLayout}
              disabled={generatingLayout || (!packageMode && !packageRecommendation)}
            >
              {generatingLayout ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              开始生成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
