"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
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
import type { ObjectActionQuota, PlanSummaryCopy } from "@/lib/entitlement";
import type { BoundaryAnalysis } from "@/app/api/projects/[id]/boundary/analyze/route";
import type { CompletenessAnalysis } from "@/app/api/projects/[id]/completeness/analyze/route";
import type { PackageRecommendation } from "@/app/api/projects/[id]/package/recommend/route";
import type { LayoutJson } from "@/app/api/projects/[id]/layout/generate/route";
import {
  STYLE_PRESETS,
  type StyleProfile,
  type StyleReferenceSelection,
} from "@/lib/style-reference-presets";

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
    diagnoses: ObjectActionQuota;
    layoutGenerations: ObjectActionQuota;
    layoutRegenerations: ObjectActionQuota;
  };
  styleReferenceSets: StyleReferenceSetOption[];
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
  const [checkingPrecheck, setCheckingPrecheck] = useState(false);
  const [generatePrecheck, setGeneratePrecheck] = useState<GeneratePrecheck | null>(null);
  const [styleSelection, setStyleSelection] = useState<StyleReferenceSelection>(() => {
    const styleProfile = initialData.layout?.styleProfile;
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
  const factSnapshot = useMemo(
    () => [
      { label: "项目类型", value: facts.projectType.trim() || "待补充" },
      { label: "所属行业", value: facts.industry.trim() || "待补充" },
      { label: "我的角色", value: facts.roleTitle.trim() || "待补充" },
      {
        label: "背景摘要",
        value: facts.background.trim() ? "已补充背景" : "待补充",
      },
      {
        label: "结果摘要",
        value: facts.resultSummary.trim() ? "已补充结果" : "待补充",
      },
    ],
    [facts]
  );
  const completedFactCount = useMemo(
    () =>
      [
        facts.projectType,
        facts.industry,
        facts.roleTitle,
        facts.background,
        facts.resultSummary,
      ].filter((value) => value.trim().length > 0).length,
    [facts]
  );
  const readinessChecklist = useMemo(
    () => [
      {
        label: "基础 facts",
        done: completedFactCount >= 3,
        detail: completedFactCount >= 3 ? "核心项目信息已成型" : "至少补齐类型、行业、角色",
      },
      {
        label: "展示素材",
        done: displayAssets.length >= 3,
        detail:
          displayAssets.length >= 3
            ? `当前可用 ${displayAssets.length} 张`
            : "建议先补 3 张以上关键画面",
      },
      {
        label: "项目诊断",
        done: Boolean(boundaryAnalysis && completenessAnalysis && packageRecommendation),
        detail: boundaryAnalysis && completenessAnalysis && packageRecommendation
          ? "边界、完整度和包装模式已齐"
          : "还需要跑一次完整项目诊断",
      },
      {
        label: "排版结果",
        done: Boolean(layout),
        detail: layout ? `已生成 ${layout.totalPages} 页首版` : "还没有首版排版结果",
      },
    ],
    [
      boundaryAnalysis,
      completenessAnalysis,
      completedFactCount,
      displayAssets.length,
      layout,
      packageRecommendation,
    ]
  );
  const layoutHighlights = layout?.pages.slice(0, 4) ?? [];
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
          : (data as { error?: string }).error === "upgrade_required"
            ? "当前套餐还不能执行这个高成本动作，请先升级后再继续。"
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
        await fetch(`/api/projects/${initialData.id}/layout/precheck`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ styleSelection: getResolvedStyleSelection() }),
        })
      );
      setGeneratePrecheck(data as GeneratePrecheck);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "生成预检失败");
      setGeneratePrecheck(null);
    } finally {
      setCheckingPrecheck(false);
    }
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ styleSelection: getResolvedStyleSelection() }),
        })
      );

      setLayout(data.layoutJson as LayoutJson);
      if ((data as { reused?: boolean }).reused) {
        setFactsMessage("命中可复用排版结果，本次没有额外计次。");
      }
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
          <Button className="h-10 px-4" onClick={handleOpenGenerate}>
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
            素材补充、项目诊断和排版生成统一收口到同一页里；旧的分步页现在只承担历史入口承接，
            日常整理已经可以直接在这里完成。
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
                  {
                    label: "当前项目剩余",
                    value: `生成 ${initialData.actionSummary.layoutGenerations.remaining} / 重生 ${initialData.actionSummary.layoutRegenerations.remaining}`,
                  },
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
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                    Facts
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                    {completedFactCount}/5
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    项目背景、角色与结果摘要的完成度。
                  </p>
                </div>
                <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                    Assets
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                    {displayAssets.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    当前主画布会优先展示已选中的展示素材。
                  </p>
                </div>
                <div className="border border-neutral-300 bg-white px-4 py-4 shadow-[0_20px_50px_-45px_rgba(15,23,42,0.38)]">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                    Diagnosis
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
                    {diagnosisHistory.length}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-neutral-500">
                    当前已回收的分析结论与 AI 结果。
                  </p>
                </div>
                <div className="border border-neutral-300 bg-neutral-950 px-4 py-4 text-white shadow-[0_26px_70px_-48px_rgba(15,23,42,0.65)]">
                  <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">
                    Layout
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    {layout ? `${layout.totalPages} 页` : "待生成"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/68">
                    {layout ? `当前模式 ${packageModeLabel(layout.packageMode)}` : "完成诊断后即可生成首版排版。"}
                  </p>
                </div>
              </div>

              <div className="rounded-none border border-neutral-300 bg-white shadow-[0_32px_90px_-72px_rgba(15,23,42,0.48)]">
                <div className="flex flex-col gap-3 border-b border-neutral-300 px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                      Center Canvas
                    </p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-neutral-900">
                      项目工作台与当前结果
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
                      中间区现在承担项目整理的主舞台，会同时显示输入质量、素材画布和最近一次生成结论。
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {readinessChecklist.map((item) => (
                      <div
                        key={item.label}
                        className={`min-w-32 border px-3 py-2 ${
                          item.done
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-neutral-200 bg-neutral-50 text-neutral-600"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.done ? <Check className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                          <span className="text-xs font-mono uppercase tracking-[0.16em]">
                            {item.label}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.95fr)]">
                  <div className="space-y-4">
                    <div className="border border-neutral-300 bg-[linear-gradient(135deg,_rgba(250,250,249,0.98),_rgba(244,244,245,0.92))] p-5">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">项目摘要</p>
                          <p className="mt-2 text-sm leading-6 text-neutral-500">
                            这里优先把能影响生成质量的输入压缩成一眼能扫完的摘要。
                          </p>
                        </div>
                        <span className="text-xs font-mono uppercase tracking-[0.16em] text-neutral-400">
                          {packageMode ? `模式 ${packageModeLabel(packageMode)}` : "等待包装模式"}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {factSnapshot.map((item) => (
                          <div key={item.label} className="border border-neutral-200 bg-white px-4 py-3">
                            <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400">
                              {item.label}
                            </p>
                            <p className="mt-2 text-sm font-medium text-neutral-800">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border border-neutral-300 bg-neutral-50 p-4">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">项目主画布</p>
                          <p className="mt-2 text-sm leading-6 text-neutral-500">
                            当前先用真实素材承接画布语义，后续再往页面级编辑和局部修改继续扩展。
                          </p>
                        </div>
                        <span className="text-xs font-mono uppercase tracking-[0.16em] text-neutral-400">
                          {displayAssets.length > 0 ? `${displayAssets.length} 张素材` : "等待上传"}
                        </span>
                      </div>

                      {displayAssets.length > 0 ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {displayAssets.slice(0, 6).map((asset, index) => (
                            <div
                              key={asset.id}
                              className="overflow-hidden border border-neutral-200 bg-white shadow-[0_18px_50px_-42px_rgba(15,23,42,0.35)]"
                            >
                              <div className="relative aspect-[4/3] overflow-hidden border-b border-neutral-200 bg-neutral-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                                  alt={asset.title ?? "素材"}
                                  className="h-full w-full object-cover"
                                />
                                <span className="absolute left-2 top-2 border border-black/10 bg-white/92 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-600">
                                  Frame {index + 1}
                                </span>
                              </div>
                              <div className="px-3 py-3">
                                <p className="truncate text-sm font-medium text-neutral-800">
                                  {asset.title ?? "未命名素材"}
                                </p>
                                <p className="mt-1 text-xs text-neutral-400">
                                  {asset.isCover ? "封面优先位" : asset.selected ? "当前已选" : "候选素材"}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 border border-dashed border-neutral-300 bg-white px-5 py-8">
                          <p className="text-sm font-medium text-neutral-900">素材还没进入主画布</p>
                          <p className="mt-2 max-w-xl text-sm leading-6 text-neutral-500">
                            先在左侧上传过程图、关键界面和结果画面。最理想的是至少准备一张封面候选、两张过程图和一张结果图。
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border border-neutral-300 bg-white p-4">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-neutral-900">排版结构速览</p>
                          <p className="mt-2 text-sm leading-6 text-neutral-500">
                            {layout
                              ? "最近一次排版的前几页会显示在这里，方便你快速判断结构是否顺。"
                              : "当前还没有排版结果，先补齐诊断或直接从顶部发起生成。"}
                          </p>
                        </div>
                        {layout ? (
                          <span className="text-xs font-mono uppercase tracking-[0.16em] text-neutral-400">
                            {layout.totalPages} pages
                          </span>
                        ) : null}
                      </div>
                      {layout ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          {layoutHighlights.map((page) => (
                            <div key={page.pageNumber} className="border border-neutral-200 bg-neutral-50 px-4 py-4">
                              <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-neutral-400">
                                Page {page.pageNumber}
                              </p>
                              <p className="mt-2 text-sm font-medium text-neutral-900">
                                {page.titleSuggestion}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {readinessChecklist.map((item) => (
                            <div key={item.label} className="border border-neutral-200 bg-neutral-50 px-4 py-4">
                              <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                              <p className="mt-2 text-sm leading-6 text-neutral-500">{item.detail}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="border border-neutral-300 bg-neutral-950 p-4 text-white">
                      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/40">
                        Current Conclusion
                      </p>
                      <p className="mt-3 text-base font-medium leading-7">
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
                      <p className="text-sm font-medium text-neutral-900">最近的 AI 信号</p>
                      {diagnosisHistory.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {diagnosisHistory.slice(0, 3).map((item) => (
                            <div key={item.key} className="border border-neutral-200 bg-neutral-50 px-3 py-3">
                              <p className="text-sm font-medium text-neutral-900">{item.label}</p>
                              <p className="mt-1 text-sm leading-6 text-neutral-500">{item.summary}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm leading-6 text-neutral-500">
                          先点击顶部“项目诊断”，这里会把当前项目最关键的判断压缩成短结论。
                        </p>
                      )}
                    </div>

                    <div className="border border-neutral-200 bg-white p-4">
                      <p className="text-sm font-medium text-neutral-900">历史入口</p>
                      <p className="mt-2 text-sm leading-6 text-neutral-500">
                        当前 editor 已经接管主入口；如果你需要回看之前的阶段页，也可以从这里进入。
                      </p>
                      <Link
                        href={legacyEntry.href}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-700 hover:text-neutral-900"
                      >
                        {legacyEntry.label}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
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
              系统会基于当前素材、facts 和包装模式生成新的项目排版结果。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-neutral-600">
            <div className="border border-neutral-200 bg-neutral-50 px-4 py-3">
              {checkingPrecheck ? (
                <div className="flex items-center gap-2 text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在检查当前输入是否可复用、是否会计次。
                </div>
              ) : generatePrecheck ? (
                <>
                  <p>本次属于高成本动作。</p>
                  <p className="mt-1">
                    {generatePrecheck.suggestedMode === "reuse"
                      ? "当前命中了可复用排版结果，这次继续生成不会额外计次。"
                      : `本次会消耗：${generatePrecheck.actionRemaining > 0 ? "当前项目排版 1 次" : "当前项目排版额度已用完"}`}
                  </p>
                  <p className="mt-1">
                    执行后剩余：{Math.max(generatePrecheck.actionRemaining - (generatePrecheck.consumesQuota ? 1 : 0), 0)} 次
                  </p>
                  <p className="mt-1">若失败，不计次。</p>
                </>
              ) : (
                <p>点击生成前会先做一次预检，判断当前是否可复用以及会不会计次。</p>
              )}
            </div>
            <div className="border border-neutral-200 bg-white px-4 py-3">
              <p>当前阶段：{stageInfo?.label ?? "草稿"}</p>
              <p className="mt-1">
                当前包装模式：
                {packageModeLabel(packageMode ?? packageRecommendation?.recommendedMode ?? null)}
              </p>
            </div>
            <div className="border border-neutral-200 bg-white px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">风格参考</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    风格参考只影响标题层级、留白密度和包装样式，不改变项目讲法。
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
                    保持默认中性风格，优先稳定生成结构。
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
              disabled={
                generatingLayout ||
                checkingPrecheck ||
                generatePrecheck?.suggestedMode === "block" ||
                (!packageMode && !packageRecommendation)
              }
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
