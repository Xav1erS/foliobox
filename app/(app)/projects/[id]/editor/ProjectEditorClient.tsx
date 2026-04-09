"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { buildPrivateBlobProxyUrl } from "@/lib/storage";
import { uploadFilesFromBrowser } from "@/lib/blob-client-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ImageUploadZone } from "@/components/app/ImageUploadZone";
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
import { cn } from "@/lib/utils";

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

type ProjectCanvasItem = {
  id: string;
  kind: "layout_page" | "asset" | "placeholder";
  frameLabel: string;
  title: string;
  summary: string;
  previewUrl: string | null;
  accentLabel: string;
  keyPoints: string[];
  meta: Array<{ label: string; value: string }>;
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

function EditorPanelCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("border-white/10 bg-white/[0.03] text-white shadow-none", className)}>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
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
  const [selectedCanvasItemId, setSelectedCanvasItemId] = useState<string | null>(null);
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
  const canvasItems = useMemo<ProjectCanvasItem[]>(() => {
    if (layout?.pages?.length) {
      return layout.pages.map((page, index) => ({
        id: `page-${page.pageNumber}`,
        kind: "layout_page",
        frameLabel: `Page ${page.pageNumber}`,
        title: page.titleSuggestion,
        summary: page.contentGuidance,
        previewUrl: displayAssets[index]?.imageUrl ?? displayAssets[0]?.imageUrl ?? null,
        accentLabel: page.type,
        keyPoints: page.keyPoints.slice(0, 3),
        meta: [
          { label: "页面类型", value: page.type },
          { label: "字数建议", value: page.wordCountGuideline ?? "未提供" },
          { label: "素材提示", value: page.assetHint ?? "未提供" },
        ],
      }));
    }

    if (displayAssets.length > 0) {
      return displayAssets.map((asset, index) => ({
        id: `asset-${asset.id}`,
        kind: "asset",
        frameLabel: `Asset ${index + 1}`,
        title: asset.title ?? `素材 ${index + 1}`,
        summary: asset.isCover
          ? "当前这张图更像封面候选，适合作为项目进入时的第一视觉。"
          : asset.selected
            ? "当前已经进入主画布候选区，后续会参与页面编排。"
            : "这张图目前还没有被选为主画布素材，可以继续作为候选。",
        previewUrl: asset.imageUrl,
        accentLabel: asset.isCover ? "cover" : asset.selected ? "selected" : "candidate",
        keyPoints: [
          asset.isCover ? "适合作为封面或章节引导图" : "可作为过程或结果补充图",
          asset.selected ? "已进入当前主画布候选池" : "仍可手动切换是否参与展示",
        ],
        meta: [
          { label: "素材状态", value: asset.selected ? "已选中" : "未选中" },
          { label: "封面优先", value: asset.isCover ? "是" : "否" },
          { label: "对象类型", value: "Project Asset" },
        ],
      }));
    }

    return [
      {
        id: "starter",
        kind: "placeholder",
        frameLabel: "Start",
        title: "先把素材和项目事实放进画布",
        summary:
          "当前还没有可展示的项目画板。先在左侧补 facts、上传展示素材，再发起项目诊断和首版排版生成。",
        previewUrl: null,
        accentLabel: "draft",
        keyPoints: [
          "左侧先补项目类型、行业、角色和结果摘要",
          "至少准备 3 张可代表项目过程与结果的素材",
          "跑一次项目诊断后，再生成首版排版",
        ],
        meta: [
          { label: "当前阶段", value: stageInfo?.label ?? "草稿" },
          { label: "主画布素材", value: `${displayAssets.length} 张` },
          { label: "排版状态", value: layout ? `${layout.totalPages} 页` : "未生成" },
        ],
      },
    ];
  }, [displayAssets, layout, stageInfo?.label]);
  const selectedCanvasItem = useMemo(() => {
    const fallbackId = canvasItems[0]?.id ?? null;
    const resolvedId = selectedCanvasItemId ?? fallbackId;
    return canvasItems.find((item) => item.id === resolvedId) ?? null;
  }, [canvasItems, selectedCanvasItemId]);
  const nextStepConclusion = useMemo(() => {
    if (layout) {
      return "当前项目已经拿到排版结果，可以继续细看页面结构，并准备把它加入作品集。";
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
      setActionError("请先运行项目诊断，拿到包装模式建议后再生成排版。");
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
        statusMeta={layout ? `${layout.totalPages} pages` : `${displayAssets.length} frames`}
        primaryAction={
          <Button className="h-9 px-4" onClick={handleOpenGenerate}>
            <Wand2 className="h-4 w-4" />
            生成排版
          </Button>
        }
        secondaryAction={
          <EditorChromeButton
            className="h-9 px-4"
            onClick={handleRunDiagnosis}
            disabled={diagnosing}
          >
            {diagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            项目诊断
          </EditorChromeButton>
        }
        planSummary={planSummary}
        leftRailLabel="Layers / Assets"
        rightRailLabel="Inspector / AI"
        leftRail={
          <Tabs defaultValue="layers" className="flex h-full flex-col">
            <div className="border-b border-white/10 p-3">
              <EditorTabsList className="grid w-full grid-cols-3">
                <EditorTabsTrigger value="layers">
                  图层
                </EditorTabsTrigger>
                <EditorTabsTrigger value="assets">
                  素材
                </EditorTabsTrigger>
                <EditorTabsTrigger value="facts">
                  项目
                </EditorTabsTrigger>
              </EditorTabsList>
            </div>

            <TabsContent value="layers" className="mt-0 flex-1 overflow-y-auto">
              <EditorRailSection title="Frame List">
                <div className="space-y-2">
                  {canvasItems.map((item) => (
                    <EditorSurfaceButton
                      key={item.id}
                      active={selectedCanvasItem?.id === item.id}
                      onClick={() => setSelectedCanvasItemId(item.id)}
                    >
                      <p className="text-[10px] font-mono uppercase tracking-[0.16em] opacity-70">
                        {item.frameLabel}
                      </p>
                      <p className="mt-2 text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-xs leading-5 opacity-70">{item.accentLabel}</p>
                    </EditorSurfaceButton>
                  ))}
                </div>
              </EditorRailSection>

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
                    className="mt-3 block truncate text-sm text-white/64 underline-offset-2 hover:text-white hover:underline"
                  >
                    {initialData.sourceUrl}
                  </a>
                ) : null}
              </EditorRailSection>
            </TabsContent>

            <TabsContent value="assets" className="mt-0 flex-1 overflow-y-auto">
              <EditorRailSection title="上传素材">
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
              </EditorRailSection>

              <EditorRailSection title="素材列表" className="flex-1">
                <div className="space-y-2">
                  {assets.length > 0 ? (
                    assets.map((asset) => (
                      <EditorSurfaceButton
                        key={asset.id}
                        active={selectedCanvasItem?.id === `asset-${asset.id}`}
                        className="flex items-center gap-3"
                        onClick={() => setSelectedCanvasItemId(`asset-${asset.id}`)}
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/20">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={buildPrivateBlobProxyUrl(asset.imageUrl)}
                            alt={asset.title ?? "素材"}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white">
                            {asset.title ?? "未命名素材"}
                          </p>
                          <p className="mt-1 text-xs text-white/46">
                            {asset.isCover ? "封面优先位" : asset.selected ? "当前已选" : "候选素材"}
                          </p>
                        </div>
                      </EditorSurfaceButton>
                    ))
                  ) : (
                    <EditorEmptyState>
                      还没有素材。先上传过程图、关键界面或结果画面。
                    </EditorEmptyState>
                  )}
                </div>
              </EditorRailSection>
            </TabsContent>

            <TabsContent value="facts" className="mt-0 flex-1 overflow-y-auto">
              <EditorRailSection title="Facts Snapshot">
                <div className="grid gap-2">
                  {factSnapshot.map((item) => (
                    <EditorPanelCard key={item.label} className="bg-white/[0.02]">
                      <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/34">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm text-white/78">{item.value}</p>
                    </EditorPanelCard>
                  ))}
                </div>
              </EditorRailSection>

              <EditorRailSection title="项目输入">
                <div className="space-y-3">
                  <Input
                    value={facts.projectType}
                    onChange={(event) =>
                      setFacts((current) => ({ ...current, projectType: event.target.value }))
                    }
                    placeholder="项目类型"
                    className={cn("h-10", editorFieldClass)}
                  />
                  <Input
                    value={facts.industry}
                    onChange={(event) =>
                      setFacts((current) => ({ ...current, industry: event.target.value }))
                    }
                    placeholder="所属行业"
                    className={cn("h-10", editorFieldClass)}
                  />
                  <Input
                    value={facts.roleTitle}
                    onChange={(event) =>
                      setFacts((current) => ({ ...current, roleTitle: event.target.value }))
                    }
                    placeholder="我的角色"
                    className={cn("h-10", editorFieldClass)}
                  />
                  <Textarea
                    value={facts.background}
                    onChange={(event) =>
                      setFacts((current) => ({ ...current, background: event.target.value }))
                    }
                    placeholder="项目背景"
                    className={cn("min-h-24", editorFieldClass)}
                  />
                  <Textarea
                    value={facts.resultSummary}
                    onChange={(event) =>
                      setFacts((current) => ({ ...current, resultSummary: event.target.value }))
                    }
                    placeholder="结果摘要"
                    className={cn("min-h-20", editorFieldClass)}
                  />
                  <Button
                    variant="outline"
                    className="h-10 w-full border-white/10 bg-white text-neutral-900 hover:bg-white/90"
                    onClick={handleSaveFacts}
                    disabled={savingFacts}
                  >
                    {savingFacts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    保存项目信息
                  </Button>
                  {factsMessage ? <p className="text-xs text-emerald-300">{factsMessage}</p> : null}
                </div>
              </EditorRailSection>

              <EditorRailSection title="备注">
                <Textarea
                  value={notesDraft}
                  onChange={(event) => setNotesDraft(event.target.value)}
                  placeholder="把还没整理进 facts 的线索临时记在这里"
                  className={cn("min-h-24", editorFieldClass)}
                />
                <p className="mt-2 text-xs leading-5 text-white/34">
                  当前备注仍是本地草稿位，后续会拆成独立备注对象和可引用上下文。
                </p>
              </EditorRailSection>
            </TabsContent>
          </Tabs>
        }
        center={
          <div className="flex h-full flex-col">
            <div className="border-b border-white/10 px-6 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <EditorCanvasChip active={completedFactCount >= 3}>
                  Facts {completedFactCount}/5
                </EditorCanvasChip>
                <EditorCanvasChip active={displayAssets.length >= 3}>
                  Assets {displayAssets.length}
                </EditorCanvasChip>
                <EditorCanvasChip active={Boolean(boundaryAnalysis && completenessAnalysis && packageRecommendation)}>
                  Diagnosis {diagnosisHistory.length}
                </EditorCanvasChip>
                <EditorCanvasChip active={Boolean(layout)}>
                  {layout ? `${layout.totalPages} pages` : "No layout"}
                </EditorCanvasChip>
              </div>
            </div>

            <div className="flex-1 overflow-auto px-6 py-8">
              <div className="mx-auto flex min-h-full min-w-max flex-col gap-10">
                <div className="flex flex-wrap gap-2">
                  {readinessChecklist.map((item) => (
                    <EditorCanvasChip key={item.label} active={item.done}>
                      {item.label}
                    </EditorCanvasChip>
                  ))}
                </div>

                <div
                  className={cn(
                    "grid gap-10",
                    canvasItems.length === 1 ? "grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"
                  )}
                >
                  {canvasItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <p className="px-1 text-xs font-mono uppercase tracking-[0.16em] text-white/34">
                        {item.frameLabel}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedCanvasItemId(item.id)}
                        className="block text-left"
                      >
                        <div
                          className={cn(
                            "w-[344px] overflow-hidden rounded-2xl border bg-white text-neutral-900 shadow-[0_28px_90px_-52px_rgba(0,0,0,0.55)] transition-all",
                            selectedCanvasItem?.id === item.id
                              ? "border-sky-400 ring-2 ring-sky-400/70"
                              : "border-black/10"
                          )}
                        >
                          {item.previewUrl ? (
                            <div className="aspect-[4/3] overflow-hidden border-b border-neutral-200 bg-neutral-100">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={buildPrivateBlobProxyUrl(item.previewUrl)}
                                alt={item.title}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="flex h-40 items-center justify-center border-b border-neutral-200 bg-neutral-100 px-6 text-center text-xs font-mono uppercase tracking-[0.18em] text-neutral-400">
                              {item.accentLabel}
                            </div>
                          )}

                          <div className="p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                                  {item.accentLabel}
                                </p>
                                <h2 className="mt-2 text-lg font-semibold tracking-tight text-neutral-950">
                                  {item.title}
                                </h2>
                              </div>
                            </div>
                            <p className="mt-4 text-sm leading-6 text-neutral-600">
                              {item.summary}
                            </p>
                            {item.keyPoints.length > 0 ? (
                              <div className="mt-4 space-y-2">
                                {item.keyPoints.map((point) => (
                                  <div
                                    key={point}
                                    className="border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600"
                                  >
                                    {point}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
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
              <EditorRailSection title="选中对象">
                {selectedCanvasItem ? (
                  <>
                    <EditorInfoList items={selectedCanvasItem.meta} />
                    <EditorPanelCard className="mt-4">
                      <p className="text-sm font-medium text-white">{selectedCanvasItem.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/56">{selectedCanvasItem.summary}</p>
                    </EditorPanelCard>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-white/46">
                    先在中间画布或左侧图层列表里选中一个对象。
                  </p>
                )}
              </EditorRailSection>

              <EditorRailSection title="关键要点">
                {selectedCanvasItem?.keyPoints?.length ? (
                  <div className="space-y-2">
                    {selectedCanvasItem.keyPoints.map((point) => (
                      <EditorPanelCard key={point} className="bg-white/[0.02]">
                        {point}
                      </EditorPanelCard>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-white/46">
                    当前对象还没有可检查的关键点。
                  </p>
                )}
              </EditorRailSection>

              <EditorRailSection title="当前状态">
                <EditorInfoList
                  items={[
                    { label: "对象类型", value: "Project" },
                    { label: "当前状态", value: stageInfo?.label ?? "草稿" },
                    { label: "素材数量", value: `${assets.length} 张` },
                    { label: "包装模式", value: packageModeLabel(packageMode) },
                  ]}
                />
              </EditorRailSection>
            </TabsContent>

            <TabsContent value="ai" className="mt-0 flex-1 overflow-y-auto">
              <EditorRailSection title="Current Conclusion">
                <EditorPanelCard>
                  <p className="text-sm leading-7 text-white/74">
                    {layout?.narrativeSummary ??
                      packageRecommendation?.reasoning ??
                      completenessAnalysis?.overallComment ??
                      "先运行项目诊断，系统会在这里返回边界、完整度和包装模式建议。"}
                  </p>
                </EditorPanelCard>
              </EditorRailSection>

              <EditorRailSection title="AI 结果">
                {diagnosisHistory.length === 0 ? (
                  <p className="text-sm leading-6 text-white/46">
                    还没有 AI 结果。点击顶部“项目诊断”，系统会返回边界、完整度和包装模式建议。
                  </p>
                ) : (
                  <div className="space-y-3">
                    {boundaryAnalysis ? (
                      <EditorPanelCard>
                        <p className="text-sm font-medium text-white">边界分析</p>
                        <p className="mt-2 text-sm leading-6 text-white/56">{boundaryAnalysis.projectSummary}</p>
                      </EditorPanelCard>
                    ) : null}
                    {completenessAnalysis ? (
                      <EditorPanelCard>
                        <p className="text-sm font-medium text-white">
                          完整度检查 · {verdictLabel(completenessAnalysis.overallVerdict)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/56">{completenessAnalysis.overallComment}</p>
                      </EditorPanelCard>
                    ) : null}
                    {packageRecommendation ? (
                      <EditorPanelCard>
                        <p className="text-sm font-medium text-white">
                          包装模式推荐 · {packageModeLabel(packageRecommendation.recommendedMode)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/56">{packageRecommendation.reasoning}</p>
                      </EditorPanelCard>
                    ) : null}
                  </div>
                )}
              </EditorRailSection>

              <EditorRailSection title="下一步">
                <p className="text-sm leading-6 text-white/56">{nextStepConclusion}</p>
              </EditorRailSection>
            </TabsContent>
          </Tabs>
        }
        bottomStrip={
          <div className="flex gap-2 overflow-x-auto">
            {canvasItems.map((item) => (
              <EditorStripButton
                key={item.id}
                onClick={() => setSelectedCanvasItemId(item.id)}
                active={selectedCanvasItem?.id === item.id}
                className="w-40"
              >
                <p className="truncate text-[10px] font-mono uppercase tracking-[0.16em] opacity-70">
                  {item.frameLabel}
                </p>
                <p className="mt-2 truncate text-sm font-medium">{item.title}</p>
              </EditorStripButton>
            ))}
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
            <DialogTitle>生成排版</DialogTitle>
            <DialogDescription>
              系统会基于当前素材、facts 和包装模式生成新的项目排版结果。
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
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="space-y-3 p-4">
                <Badge variant="secondary" className="w-fit rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.14em]">
                  当前上下文
                </Badge>
                <div className="space-y-1">
                  <p>当前阶段：{stageInfo?.label ?? "草稿"}</p>
                  <p>
                    当前包装模式：
                    {packageModeLabel(packageMode ?? packageRecommendation?.recommendedMode ?? null)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-none">
              <CardContent className="p-4">
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
                    保持默认中性风格，优先稳定生成结构。
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
            {!packageMode && !packageRecommendation ? (
              <Card className="border-amber-200 bg-amber-50 text-amber-900 shadow-none">
                <CardContent className="p-4">
                  还没有包装模式结论。先运行“项目诊断”，拿到包装模式建议后再继续。
                </CardContent>
              </Card>
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
