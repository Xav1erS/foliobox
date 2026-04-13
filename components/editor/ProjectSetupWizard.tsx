"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveProjectAssetMeta } from "@/lib/project-editor-scene";
import type {
  ProjectMaterialRecognition,
  ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectFactsForm = {
  projectType: string;
  industry: string;
  roleTitle: string;
  background: string;
  resultSummary: string;
};

type ProjectAsset = {
  id: string;
  imageUrl: string;
  title: string | null;
  selected: boolean;
  isCover: boolean;
  sortOrder: number;
  metaJson?: unknown;
};

export interface ProjectSetupWizardProps {
  projectName: string;
  facts: ProjectFactsForm;
  assets: ProjectAsset[];
  materialRecognition: ProjectMaterialRecognition | null;
  structureDraft: ProjectStructureSuggestion | null;
  /** 当前结构是否已经被确认过（confirmedAt 不为 null） */
  isStructureConfirmed: boolean;
  recognizingMaterials: boolean;
  suggestingStructure: boolean;
  confirmingStructure: boolean;
  hasExistingBoards: boolean;
  actionError: string;
  onAiUnderstand: () => void;
  onConfirmAndEnter: () => void;
  onOpenAssetsPanel: () => void;
  onOpenProjectPanel: () => void;
  onReturnToCanvas: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hasFactsContent(facts: ProjectFactsForm) {
  return (
    facts.background.trim().length > 0 ||
    facts.resultSummary.trim().length > 0 ||
    facts.projectType.trim().length > 0
  );
}

function getAssetsSummary(assets: ProjectAsset[]) {
  const total = assets.length;
  const withNote = assets.filter((a) => {
    const meta = resolveProjectAssetMeta(a.metaJson);
    return meta.note && meta.note.trim().length > 0;
  }).length;
  return { total, withNote, withoutNote: total - withNote };
}

// ─── Step status badge ────────────────────────────────────────────────────────

function StepBadge({ status }: { status: "done" | "warn" | "pending" | "loading" }) {
  if (status === "done")
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  if (status === "warn")
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
        <AlertTriangle className="h-3 w-3" />
      </span>
    );
  if (status === "loading")
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-white/60" />
      </span>
    );
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/4">
      <span className="text-[10px] font-semibold text-white/25">·</span>
    </span>
  );
}

// ─── Step card ────────────────────────────────────────────────────────────────

function StepCard({
  stepRef,
  stepNumber,
  title,
  status,
  statusLabel,
  children,
}: {
  stepRef?: React.Ref<HTMLDivElement>;
  stepNumber: number;
  title: string;
  status: "done" | "warn" | "pending" | "loading";
  statusLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      ref={stepRef}
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        status === "done"
          ? "border-white/6 bg-white/3"
          : status === "warn"
            ? "border-amber-500/20 bg-amber-500/4"
            : status === "loading"
              ? "border-white/10 bg-white/5"
              : "border-white/6 bg-white/3",
      )}
    >
      <div className="flex items-start gap-3">
        <StepBadge status={status} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/30">0{stepNumber}</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  status === "pending" ? "text-white/50" : "text-white/90",
                )}
              >
                {title}
              </span>
            </div>
            {statusLabel ? (
              <span
                className={cn(
                  "shrink-0 text-[11px]",
                  status === "done"
                    ? "text-emerald-400/80"
                    : status === "warn"
                      ? "text-amber-400/80"
                      : "text-white/30",
                )}
              >
                {statusLabel}
              </span>
            ) : null}
          </div>
          {children ? <div className="mt-2.5">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectSetupWizard({
  projectName: _projectName,
  facts,
  assets,
  materialRecognition,
  structureDraft,
  isStructureConfirmed,
  recognizingMaterials,
  suggestingStructure,
  confirmingStructure,
  hasExistingBoards,
  actionError,
  onAiUnderstand,
  onConfirmAndEnter,
  onOpenAssetsPanel,
  onOpenProjectPanel,
  onReturnToCanvas,
}: ProjectSetupWizardProps) {
  // Fix 3: 已有画板时，点确认前弹窗警告
  const [boardsDestroyConfirmOpen, setBoardsDestroyConfirmOpen] = useState(false);
  // Fix 4-related: 重新分析二次确认
  const [reanalysisConfirmOpen, setReanalysisConfirmOpen] = useState(false);

  // Fix 5: AI 完成后自动滚到 Step 4
  const step4Ref = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const prevAiRunning = useRef(false);

  const aiRunning = recognizingMaterials || suggestingStructure;
  const structureReady = structureDraft !== null;

  useEffect(() => {
    // 当 AI 从 running → done 时，滚到 Step 4
    if (prevAiRunning.current && !aiRunning && structureReady) {
      setTimeout(() => {
        step4Ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 300);
    }
    prevAiRunning.current = aiRunning;
  }, [aiRunning, structureReady]);

  const factsOk = hasFactsContent(facts);
  const { total: assetTotal, withNote, withoutNote } = getAssetsSummary(assets);
  const assetsUploaded = assetTotal > 0;
  const recognitionDone = materialRecognition !== null;

  const step1Status = factsOk ? "done" : "warn";
  const step2Status = !assetsUploaded ? "warn" : withoutNote > 0 ? "warn" : "done";
  const step3Status = aiRunning ? "loading" : recognitionDone ? "done" : "pending";
  const step4Status = aiRunning ? "pending" : structureReady ? "done" : "pending";

  const canRunAi = assetsUploaded;

  function handleAiClick() {
    if (aiRunning) return;
    if ((recognitionDone || structureReady) && !reanalysisConfirmOpen) {
      setReanalysisConfirmOpen(true);
      return;
    }
    setReanalysisConfirmOpen(false);
    onAiUnderstand();
  }

  function handleConfirmClick() {
    // Fix 3: 已有画板时先弹二次确认
    if (hasExistingBoards) {
      setBoardsDestroyConfirmOpen(true);
      return;
    }
    onConfirmAndEnter();
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-y-auto">
      {/* ── 覆盖层：重新分析确认 ─────────────────────────── */}
      {reanalysisConfirmOpen ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#1e1b18] p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">重新分析会覆盖当前结构</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">
              AI 会重新理解你的项目，已有的结构建议将被替换。
              如果你已经根据旧结构创建了画板，建议先记录当前内容。
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setReanalysisConfirmOpen(false)}
                className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-white/60 hover:bg-white/5"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAiClick}
                className="flex-1 rounded-xl bg-amber-500/20 py-2 text-sm font-medium text-amber-400 hover:bg-amber-500/30"
              >
                确认重新分析
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 覆盖层：确认结构覆盖画板 (Fix 3) ─────────────── */}
      {boardsDestroyConfirmOpen ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#1e1b18] p-6 shadow-2xl">
            <div className="mb-1 flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span className="font-medium">当前画板内容将被替换</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-white/50">
              确认结构后，系统会按新结构重建所有画板，你在画布上的现有编辑内容将被清空。
              此操作不可撤销。
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setBoardsDestroyConfirmOpen(false)}
                className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-white/60 hover:bg-white/5"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  setBoardsDestroyConfirmOpen(false);
                  onConfirmAndEnter();
                }}
                className="flex-1 rounded-xl bg-red-500/20 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
              >
                确认覆盖，重建画板
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── 主内容 ───────────────────────────────────────── */}
      <div className="mx-auto w-full max-w-[580px] flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white/90">
            在开始排版前，先让 AI 理解你的项目
          </h1>
          <p className="mt-1.5 text-sm text-white/40">
            信息填得越完整，AI 给出的结构建议越准确
          </p>
        </div>

        <div className="space-y-3">
          {/* Step 1: 项目背景 */}
          <StepCard
            stepNumber={1}
            title="项目背景"
            status={step1Status}
            statusLabel={factsOk ? "已填写" : "建议填写"}
          >
            {factsOk ? (
              <div className="space-y-1">
                {facts.projectType && (
                  <p className="line-clamp-1 text-[13px] text-white/40">
                    <span className="text-white/25">类型　</span>
                    {facts.projectType}
                  </p>
                )}
                {facts.background && (
                  <p className="line-clamp-2 text-[13px] text-white/40">
                    <span className="text-white/25">背景　</span>
                    {facts.background}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-white/40">
                填写项目类型、背景和成果，帮 AI 理解这个项目在做什么
              </p>
            )}
            <button
              type="button"
              onClick={onOpenProjectPanel}
              className="mt-2 flex items-center gap-1 text-[12px] text-white/40 transition-colors hover:text-white/70"
            >
              {factsOk ? "修改项目背景" : "填写项目背景"}
              <ChevronRight className="h-3 w-3" />
            </button>
          </StepCard>

          {/* Step 2: 设计稿与素材 */}
          <StepCard
            stepNumber={2}
            title="设计稿与素材"
            status={step2Status}
            statusLabel={
              !assetsUploaded
                ? "未上传"
                : withoutNote > 0
                  ? `${assetTotal} 张，${withoutNote} 张未描述`
                  : `${assetTotal} 张，已全部描述`
            }
          >
            {!assetsUploaded ? (
              <p className="text-[13px] text-white/40">
                上传设计截图，AI 会分析每张图的内容和在项目中的作用
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {assets.slice(0, 8).map((asset) => {
                    const meta = resolveProjectAssetMeta(asset.metaJson);
                    const hasNote = meta.note && meta.note.trim().length > 0;
                    return (
                      <div key={asset.id} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.imageUrl}
                          alt={asset.title ?? "素材"}
                          className="h-12 w-16 rounded-lg object-cover"
                        />
                        {!hasNote && (
                          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 shadow-sm">
                            <span className="text-[8px] font-bold text-white">!</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {assets.length > 8 && (
                    <div className="flex h-12 w-16 items-center justify-center rounded-lg border border-white/8 bg-white/4 text-xs text-white/30">
                      +{assets.length - 8}
                    </div>
                  )}
                </div>
                {withoutNote > 0 && (
                  <div className="flex items-start gap-1.5 rounded-xl bg-amber-500/8 px-3 py-2">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/70" />
                    <p className="text-[12px] leading-relaxed text-amber-300/70">
                      有 {withoutNote} 张图还没有描述——写的越多，AI 分析越准确，哪怕一句话也有帮助
                    </p>
                  </div>
                )}
                {withNote > 0 && withoutNote === 0 && (
                  <p className="text-[12px] text-emerald-400/70">
                    所有图片都已添加描述，AI 可以获得充分上下文
                  </p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={onOpenAssetsPanel}
              className="mt-2 flex items-center gap-1 text-[12px] text-white/40 transition-colors hover:text-white/70"
            >
              {!assetsUploaded
                ? "上传设计稿"
                : withoutNote > 0
                  ? "去补充描述"
                  : "查看素材"}
              <ChevronRight className="h-3 w-3" />
            </button>
          </StepCard>

          {/* Step 3: AI 理解 */}
          <StepCard
            stepNumber={3}
            title="让 AI 理解你的项目"
            status={step3Status}
            statusLabel={recognitionDone && !aiRunning ? "分析完成" : undefined}
          >
            {aiRunning ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[13px] text-white/50">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>
                    {recognizingMaterials
                      ? "AI 正在理解你的设计稿…"
                      : "AI 正在生成项目结构建议…"}
                  </span>
                </div>
                <p className="text-[12px] text-white/30">通常需要 10–30 秒，请稍等</p>
              </div>
            ) : recognitionDone ? (
              <div className="space-y-2">
                <p className="text-[13px] leading-relaxed text-white/50">
                  {materialRecognition.summary}
                </p>
                {materialRecognition.missingInfo.length > 0 && (
                  <div className="rounded-xl bg-amber-500/6 px-3 py-2">
                    <p className="mb-1 text-[11px] text-amber-400/60">AI 希望了解更多</p>
                    <ul className="space-y-0.5">
                      {materialRecognition.missingInfo.slice(0, 3).map((item, i) => (
                        <li key={i} className="text-[12px] text-white/40">
                          · {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleAiClick}
                  disabled={!canRunAi}
                  className="flex items-center gap-1 text-[12px] text-white/30 transition-colors hover:text-white/60 disabled:pointer-events-none"
                >
                  补充信息后重新分析
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[13px] leading-relaxed text-white/40">
                  AI 会综合分析项目背景、设计稿和你的设计师档案，理解项目目标和内容
                </p>
                {!canRunAi && (
                  <p className="text-[12px] text-amber-400/70">需要先上传至少一张设计稿</p>
                )}
                <button
                  type="button"
                  onClick={handleAiClick}
                  disabled={!canRunAi}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all active:scale-[0.98]",
                    canRunAi
                      ? "bg-white text-neutral-900 hover:bg-neutral-100"
                      : "cursor-not-allowed bg-white/10 text-white/30",
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  已填好，让 AI 理解我的项目
                </button>
              </div>
            )}
          </StepCard>

          {/* Step 4: 确认结构 (Fix 5: ref for auto-scroll) */}
          <StepCard
            stepRef={step4Ref}
            stepNumber={4}
            title="确认项目结构"
            status={step4Status}
            statusLabel={
              structureReady && !aiRunning
                ? isStructureConfirmed
                  ? "已确认"
                  : `${structureDraft!.groups.flatMap((g) => g.sections).length} 个页面`
                : undefined
            }
          >
            {aiRunning ? (
              <p className="text-[13px] text-white/30">等待 AI 分析完成后显示…</p>
            ) : structureReady ? (
              <div className="space-y-2">
                {isStructureConfirmed ? (
                  <div className="flex items-center gap-1.5 text-[12px] text-emerald-400/70">
                    <Check className="h-3.5 w-3.5" />
                    结构已确认，画板已按此结构创建
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed text-white/50">
                    {structureDraft!.summary}
                  </p>
                )}
                <div className="space-y-1.5">
                  {structureDraft!.groups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-xl border border-white/6 bg-white/3 px-3 py-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-medium text-white/70">
                          {group.label}
                        </span>
                        <span className="text-[11px] text-white/30">
                          {group.sections.length} 页
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {group.sections.map((section) => (
                          <span
                            key={section.id}
                            className="rounded-md bg-white/6 px-2 py-0.5 text-[11px] text-white/40"
                          >
                            {section.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {!isStructureConfirmed && (
                  <p className="text-[12px] text-white/30">
                    进入排版后可在左侧「结构」面板随时调整
                  </p>
                )}
              </div>
            ) : (
              <p className="text-[13px] text-white/30">
                完成 AI 分析后，这里会显示项目结构建议，确认后进入排版
              </p>
            )}
          </StepCard>
        </div>

        {/* 错误提示 */}
        {actionError ? (
          <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/6 px-4 py-3">
            <p className="text-[13px] text-red-400/80">{actionError}</p>
          </div>
        ) : null}

        {/* CTA 区：已确认显示"返回画布"，未确认显示"确认结构" */}
        {structureReady && !aiRunning ? (
          <div className="mt-6">
            {isStructureConfirmed ? (
              // 结构已确认 → 主要操作是返回画布，次要操作是重新生成结构
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={onReturnToCanvas}
                  className="flex w-full animate-in fade-in-0 slide-in-from-bottom-2 items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-neutral-900 shadow-lg transition-all duration-300 hover:bg-neutral-100 active:scale-[0.99]"
                >
                  返回画布
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-center text-[12px] text-white/25">
                  如需重新生成结构，请修改项目背景或素材后再次分析
                </p>
              </div>
            ) : (
              // 结构待确认 → 主要操作是确认结构并创建画板
              <>
                {hasExistingBoards && (
                  <p className="mb-2 text-center text-[12px] text-amber-400/60">
                    确认后将替换当前所有画板内容
                  </p>
                )}
                <button
                  ref={ctaRef}
                  type="button"
                  onClick={handleConfirmClick}
                  disabled={confirmingStructure}
                  className="flex w-full animate-in fade-in-0 slide-in-from-bottom-2 items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-semibold text-neutral-900 shadow-lg transition-all duration-300 hover:bg-neutral-100 active:scale-[0.99] disabled:opacity-60"
                >
                  {confirmingStructure ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在创建画板…
                    </>
                  ) : (
                    <>
                      确认结构，开始排版
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="mt-2 text-center text-[12px] text-white/25">
                  进入后仍可点击顶栏「项目准备」回到此页查看
                </p>
              </>
            )}
          </div>
        ) : null}

        <div className="h-10" />
      </div>
    </div>
  );
}
