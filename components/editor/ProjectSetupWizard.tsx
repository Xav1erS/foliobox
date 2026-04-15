"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { resolveProjectAssetMeta } from "@/lib/project-editor-scene";
import type {
  ProjectMaterialRecognition,
  ProjectStructureSuggestion,
} from "@/lib/project-editor-scene";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WizardFactsView = {
  timeline: string;
  roleTitle: string;
  background: string;
  businessGoal: string;
  biggestChallenge: string;
  resultSummary: string;
};

export type WizardFactsPatch = Partial<WizardFactsView>;

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
  facts: WizardFactsView;
  onFactsChange: (patch: WizardFactsPatch) => void;
  factsSaveLabel: string;
  assets: ProjectAsset[];
  materialRecognition: ProjectMaterialRecognition | null;
  structureDraft: ProjectStructureSuggestion | null;
  isStructureConfirmed: boolean;
  recognizingMaterials: boolean;
  suggestingStructure: boolean;
  confirmingStructure: boolean;
  uploadingAssets: boolean;
  hasExistingBoards: boolean;
  actionError: string;
  onAiUnderstand: () => void;
  onConfirmAndEnter: () => void;
  onUploadAssets: () => void;
  onUpdateAssetTitle: (assetId: string, title: string) => void;
  onUpdateAssetNote: (assetId: string, note: string) => void;
  onReturnToCanvas: () => void;
}

type SectionKey = "facts" | "assets" | "ai" | "structure";

const SECTION_LABELS: Record<SectionKey, string> = {
  facts: "项目背景",
  assets: "素材与描述",
  ai: "AI 理解",
  structure: "项目结构",
};

// ─── Main component ───────────────────────────────────────────────────────────

export function ProjectSetupWizard({
  projectName: _projectName,
  facts,
  onFactsChange,
  factsSaveLabel,
  assets,
  materialRecognition,
  structureDraft,
  isStructureConfirmed,
  recognizingMaterials,
  suggestingStructure,
  confirmingStructure,
  uploadingAssets,
  hasExistingBoards,
  actionError,
  onAiUnderstand,
  onConfirmAndEnter,
  onUploadAssets,
  onUpdateAssetTitle,
  onUpdateAssetNote,
  onReturnToCanvas,
}: ProjectSetupWizardProps) {
  const [boardsDestroyConfirmOpen, setBoardsDestroyConfirmOpen] = useState(false);
  const [reanalysisConfirmOpen, setReanalysisConfirmOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<SectionKey, HTMLElement | null>>({
    facts: null,
    assets: null,
    ai: null,
    structure: null,
  });
  const [activeSection, setActiveSection] = useState<SectionKey>("facts");

  const aiRunning = recognizingMaterials || suggestingStructure;
  const structureReady = structureDraft !== null;
  const recognitionDone = materialRecognition !== null;

  // Status flags
  const factsComplete = facts.background.trim().length > 0;
  const assetsUploaded = assets.length > 0;

  // Auto-scroll to structure when AI completes
  const prevAiRunning = useRef(false);
  useEffect(() => {
    if (prevAiRunning.current && !aiRunning && structureReady) {
      setTimeout(() => {
        sectionRefs.current.structure?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
    prevAiRunning.current = aiRunning;
  }, [aiRunning, structureReady]);

  // Track active section via scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerTop = container.getBoundingClientRect().top;
      const threshold = containerTop + 120;
      const keys: SectionKey[] = ["facts", "assets", "ai", "structure"];
      let current: SectionKey = "facts";
      for (const key of keys) {
        const el = sectionRefs.current[key];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= threshold) {
          current = key;
        }
      }
      setActiveSection(current);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = useCallback((key: SectionKey) => {
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

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
    if (hasExistingBoards) {
      setBoardsDestroyConfirmOpen(true);
      return;
    }
    onConfirmAndEnter();
  }

  const steps: Array<{ key: SectionKey; done: boolean }> = [
    { key: "facts", done: factsComplete },
    { key: "assets", done: assetsUploaded },
    { key: "ai", done: recognitionDone },
    { key: "structure", done: isStructureConfirmed },
  ];

  return (
    <div className="relative flex h-full w-full flex-col">
      {/* ── Confirm overlays ─────────────────────────────── */}
      {reanalysisConfirmOpen ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-white/10 bg-card p-6 shadow-2xl">
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

      {boardsDestroyConfirmOpen ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-white/10 bg-card p-6 shadow-2xl">
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

      {/* ── Top stepper ──────────────────────────────────── */}
      <div className="shrink-0 border-b border-white/6 bg-background/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[920px] items-center gap-2 px-8 py-4">
          {steps.map((step, idx) => {
            const isActive = activeSection === step.key;
            return (
              <div key={step.key} className="flex items-center gap-2">
                {idx > 0 ? (
                  <div className="h-px w-6 bg-white/10" />
                ) : null}
                <button
                  type="button"
                  onClick={() => scrollToSection(step.key)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] transition-colors",
                    isActive
                      ? "bg-white/10 text-white"
                      : "text-white/45 hover:bg-white/5 hover:text-white/70",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                      step.done
                        ? "bg-emerald-500/25 text-emerald-300"
                        : isActive
                          ? "bg-white/15 text-white"
                          : "bg-white/5 text-white/40",
                    )}
                  >
                    {step.done ? <Check className="h-3 w-3" /> : idx + 1}
                  </span>
                  {SECTION_LABELS[step.key]}
                </button>
              </div>
            );
          })}
          <div className="ml-auto text-[11px] text-white/30">{factsSaveLabel}</div>
        </div>
      </div>

      {/* ── Scrollable sections ──────────────────────────── */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[920px] space-y-10 px-8 py-10">
          {/* Section 0: Facts */}
          <section
            ref={(el) => {
              sectionRefs.current.facts = el;
            }}
          >
            <SectionHeader
              index={1}
              title="项目背景"
              hint="客观条件已在左侧锁定。这里补充项目时间、背景、目标等上下文，AI 会基于此理解你的项目。"
            />
            <div className="grid grid-cols-2 gap-4">
              <Field label="项目周期">
                <Input
                  value={facts.timeline}
                  onChange={(e) => onFactsChange({ timeline: e.target.value })}
                  placeholder="例如 2024 Q1 – Q2，共 3 个月"
                  className="rounded-xl border-white/8 bg-white/[0.04] text-white"
                />
              </Field>
              <Field label="头衔 / Title">
                <Input
                  value={facts.roleTitle}
                  onChange={(e) => onFactsChange({ roleTitle: e.target.value })}
                  placeholder="例如 高级产品设计师"
                  className="rounded-xl border-white/8 bg-white/[0.04] text-white"
                />
              </Field>
              <Field label="项目背景" required className="col-span-2">
                <Textarea
                  value={facts.background}
                  onChange={(e) => onFactsChange({ background: e.target.value })}
                  placeholder="说明项目起因、所在业务环境、目标用户和主要约束。"
                  className="min-h-[110px] rounded-xl border-white/8 bg-white/[0.04] text-white"
                />
              </Field>
              <Field label="业务目标" className="col-span-2">
                <Textarea
                  value={facts.businessGoal}
                  onChange={(e) => onFactsChange({ businessGoal: e.target.value })}
                  placeholder="这个项目要解决的业务问题、期望达成的结果或核心指标。"
                  className="min-h-[90px] rounded-xl border-white/8 bg-white/[0.04] text-white"
                />
              </Field>
              <Field label="最大挑战">
                <Textarea
                  value={facts.biggestChallenge}
                  onChange={(e) => onFactsChange({ biggestChallenge: e.target.value })}
                  placeholder="项目中最棘手的问题、权衡或需要说服的对象。"
                  className="min-h-[80px] rounded-xl border-white/8 bg-white/[0.04] text-white"
                />
              </Field>
              <Field label="结果与成果">
                <Textarea
                  value={facts.resultSummary}
                  onChange={(e) => onFactsChange({ resultSummary: e.target.value })}
                  placeholder="最终上线效果、可量化指标、评价反馈或奖项。"
                  className="min-h-[80px] rounded-xl border-white/8 bg-white/[0.04] text-white"
                />
              </Field>
            </div>
          </section>

          {/* Section 1: Assets */}
          <section
            ref={(el) => {
              sectionRefs.current.assets = el;
            }}
          >
            <SectionHeader
              index={2}
              title="素材与描述"
              hint="上传设计稿，给每张图写一句描述。写得越具体，AI 越能理解这张图在项目中的作用。"
            />
            <AssetsGrid
              assets={assets}
              uploadingAssets={uploadingAssets}
              onUpload={onUploadAssets}
              onUpdateTitle={onUpdateAssetTitle}
              onUpdateNote={onUpdateAssetNote}
            />
          </section>

          {/* Section 2: AI understanding */}
          <section
            ref={(el) => {
              sectionRefs.current.ai = el;
            }}
          >
            <SectionHeader
              index={3}
              title="AI 项目理解"
              hint="AI 会综合项目背景、设计稿和素材描述，理解项目目标与内容，然后给出结构建议。"
            />
            {aiRunning ? (
              <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                <div>
                  <p className="text-sm text-white/80">
                    {recognizingMaterials
                      ? "AI 正在理解你的设计稿…"
                      : "AI 正在生成项目结构建议…"}
                  </p>
                  <p className="mt-1 text-[12px] text-white/35">通常需要 10–30 秒</p>
                </div>
              </div>
            ) : recognitionDone && materialRecognition ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
                  <p className="text-[11px] uppercase tracking-wider text-white/35">
                    AI 理解摘要
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-white/75">
                    {materialRecognition.summary}
                  </p>
                  {materialRecognition.missingInfo.length > 0 ? (
                    <div className="mt-4 rounded-xl bg-amber-500/10 px-4 py-3">
                      <p className="mb-1.5 text-[11px] font-medium text-amber-300/80">
                        AI 希望了解更多
                      </p>
                      <ul className="space-y-1">
                        {materialRecognition.missingInfo.map((item, i) => (
                          <li key={i} className="text-[12px] leading-relaxed text-white/55">
                            · {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={handleAiClick}
                  disabled={!assetsUploaded}
                  className="text-[12px] text-white/45 transition-colors hover:text-white/80 disabled:opacity-40"
                >
                  如果素材或背景有变化，可以 <span className="underline">重新理解</span>
                </button>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
                {!assetsUploaded ? (
                  <p className="mb-4 text-[13px] text-amber-300/70">
                    请先上传至少一张设计稿
                  </p>
                ) : !factsComplete ? (
                  <p className="mb-4 text-[13px] text-amber-300/70">
                    建议先补充项目背景，AI 理解会更准确
                  </p>
                ) : (
                  <p className="mb-4 text-[13px] text-white/50">
                    准备就绪，让 AI 理解你的项目
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleAiClick}
                  disabled={!assetsUploaded}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-all active:scale-[0.98]",
                    assetsUploaded
                      ? "bg-white text-neutral-900 hover:bg-neutral-100"
                      : "cursor-not-allowed bg-white/10 text-white/30",
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  让 AI 理解我的项目
                </button>
              </div>
            )}
          </section>

          {/* Section 3: Structure */}
          <section
            ref={(el) => {
              sectionRefs.current.structure = el;
            }}
          >
            <SectionHeader
              index={4}
              title="项目章节结构"
              hint="AI 给出结构建议后，可以调整章节名称和顺序。确认结构后进入排版阶段。"
            />
            {structureReady && structureDraft ? (
              <div className="space-y-4">
                {isStructureConfirmed ? (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-[13px] text-emerald-300/85">
                    <Check className="h-4 w-4" />
                    结构已确认，画板已按此结构创建
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed text-white/55">
                    {structureDraft.summary}
                  </p>
                )}
                <div className="space-y-2">
                  {structureDraft.groups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-2xl border border-white/8 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-white/85">
                          {group.label}
                        </span>
                        <span className="text-[11px] text-white/35">
                          {group.sections.length} 页
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {group.sections.map((section) => (
                          <span
                            key={section.id}
                            className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-[11px] text-white/55"
                          >
                            {section.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {actionError ? (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-[13px] text-red-300/85">
                    {actionError}
                  </div>
                ) : null}
                {isStructureConfirmed ? (
                  <button
                    type="button"
                    onClick={onReturnToCanvas}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-semibold text-neutral-900 shadow-lg transition-all hover:bg-neutral-100 active:scale-[0.99]"
                  >
                    返回画布
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <>
                    {hasExistingBoards ? (
                      <p className="text-center text-[12px] text-amber-400/70">
                        确认后将替换当前所有画板内容
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleConfirmClick}
                      disabled={confirmingStructure}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white py-3.5 text-sm font-semibold text-neutral-900 shadow-lg transition-all hover:bg-neutral-100 active:scale-[0.99] disabled:opacity-60"
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
                  </>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-[13px] text-white/35">
                完成上一步的 AI 理解后，这里会显示项目结构建议
              </div>
            )}
          </section>

          <div className="h-12" />
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  index,
  title,
  hint,
}: {
  index: number;
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-baseline gap-3">
        <span className="text-[11px] font-semibold text-white/30">
          0{index}
        </span>
        <h2 className="text-[18px] font-semibold text-white/90">{title}</h2>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-white/40">{hint}</p>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] text-white/45">
        {label}
        {required ? <span className="ml-1 text-amber-300/80">*</span> : null}
      </label>
      {children}
    </div>
  );
}

function AssetsGrid({
  assets,
  uploadingAssets,
  onUpload,
  onUpdateTitle,
  onUpdateNote,
}: {
  assets: ProjectAsset[];
  uploadingAssets: boolean;
  onUpload: () => void;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}) {
  if (assets.length === 0) {
    return (
      <button
        type="button"
        onClick={onUpload}
        disabled={uploadingAssets}
        className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] px-8 py-14 text-white/50 transition-colors hover:border-white/20 hover:bg-white/[0.04] hover:text-white/80"
      >
        {uploadingAssets ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Upload className="h-6 w-6" />
        )}
        <div className="text-center">
          <p className="text-sm font-medium">
            {uploadingAssets ? "上传中…" : "上传设计稿"}
          </p>
          <p className="mt-1 text-[12px] text-white/35">支持 JPG / PNG / WebP</p>
        </div>
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          onUpdateTitle={onUpdateTitle}
          onUpdateNote={onUpdateNote}
        />
      ))}
      <button
        type="button"
        onClick={onUpload}
        disabled={uploadingAssets}
        className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/12 bg-white/[0.02] text-white/45 transition-colors hover:border-white/20 hover:bg-white/[0.04] hover:text-white/75"
      >
        {uploadingAssets ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Plus className="h-5 w-5" />
        )}
        <span className="text-[12px]">
          {uploadingAssets ? "上传中" : "添加素材"}
        </span>
      </button>
    </div>
  );
}

function AssetCard({
  asset,
  onUpdateTitle,
  onUpdateNote,
}: {
  asset: ProjectAsset;
  onUpdateTitle: (id: string, title: string) => void;
  onUpdateNote: (id: string, note: string) => void;
}) {
  const meta = useMemo(() => resolveProjectAssetMeta(asset.metaJson), [asset.metaJson]);
  const [title, setTitle] = useState(asset.title ?? "");
  const [note, setNote] = useState(meta.note ?? "");

  useEffect(() => {
    setTitle(asset.title ?? "");
  }, [asset.title]);
  useEffect(() => {
    setNote(meta.note ?? "");
  }, [meta.note]);

  const titleChanged = title !== (asset.title ?? "");
  const noteChanged = note !== (meta.note ?? "");

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03]">
      <div className="aspect-[4/3] overflow-hidden bg-black/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.imageUrl}
          alt={asset.title ?? "素材"}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-2 p-3">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (titleChanged) onUpdateTitle(asset.id, title);
          }}
          placeholder="素材标题"
          className="h-8 rounded-lg border-white/8 bg-white/[0.04] text-[12px] text-white placeholder:text-white/30"
        />
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (noteChanged) onUpdateNote(asset.id, note);
          }}
          placeholder="这张图是什么？在项目中起什么作用？"
          className="min-h-[60px] rounded-lg border-white/8 bg-white/[0.04] text-[12px] text-white placeholder:text-white/30"
        />
        {!meta.note ? (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-300/60">
            <AlertTriangle className="h-3 w-3" />
            未描述
          </div>
        ) : null}
      </div>
    </div>
  );
}

