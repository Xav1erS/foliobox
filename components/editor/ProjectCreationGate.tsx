"use client";

import { useState } from "react";
import { AlertTriangle, ArrowLeft, Check, Loader2, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type AudienceValue = "TO_C" | "TO_B" | "TO_G" | "INTERNAL";
export type PlatformValue =
  | "WEB"
  | "MOBILE"
  | "DESKTOP"
  | "AUTOMOTIVE"
  | "LARGE_SCREEN"
  | "CROSS_PLATFORM";
export type IndustryValue =
  | "FINTECH"
  | "ECOMMERCE"
  | "EDUCATION"
  | "HEALTHCARE"
  | "ENTERPRISE_SAAS"
  | "AI_TOOLS"
  | "DEV_TOOLS"
  | "SOCIAL_ENTERTAINMENT"
  | "MOBILITY_LOGISTICS"
  | "LIFE_SERVICES"
  | "GOVERNMENT_PUBLIC"
  | "INDUSTRIAL_MANUFACTURING"
  | "OTHER";
export type ProjectNatureValue =
  | "NEW_BUILD"
  | "MAJOR_REDESIGN"
  | "ITERATION"
  | "DESIGN_SYSTEM"
  | "CONCEPT";
export type InvolvementValue = "LEAD" | "CORE" | "SUPPORT";

type Option<T extends string> = {
  value: T;
  label: string;
  description: string;
};

export const AUDIENCE_OPTIONS: Option<AudienceValue>[] = [
  {
    value: "TO_C",
    label: "To C 大众消费者",
    description: "面向终端用户，强调情感、易用、品牌感",
  },
  {
    value: "TO_B",
    label: "To B 企业客户",
    description: "面向业务/组织购买的产品，强调效率、信任、复杂度治理",
  },
  {
    value: "TO_G",
    label: "To G 政务 / 公共事业",
    description: "面向政府、公共机构或公共服务场景",
  },
  {
    value: "INTERNAL",
    label: "内部团队工具",
    description: "公司内部使用，不直接服务外部用户",
  },
];

export const PLATFORM_OPTIONS: Option<PlatformValue>[] = [
  {
    value: "WEB",
    label: "Web 端",
    description: "浏览器端产品、Web App、官网、营销页",
  },
  {
    value: "MOBILE",
    label: "移动端",
    description: "原生 App、小程序、H5 等移动形态",
  },
  {
    value: "DESKTOP",
    label: "桌面客户端",
    description: "Mac / Windows / Linux 桌面应用",
  },
  {
    value: "AUTOMOTIVE",
    label: "车载 / 智能座舱",
    description: "车机 HMI、座舱 UI、车控应用",
  },
  {
    value: "LARGE_SCREEN",
    label: "大屏 / IoT 设备",
    description: "数据大屏、电视、可穿戴、智能硬件",
  },
  {
    value: "CROSS_PLATFORM",
    label: "跨端 / 多端形态",
    description: "同时承载多端形态，跨平台一致性是核心",
  },
];

export const INDUSTRY_OPTIONS: Option<IndustryValue>[] = [
  { value: "FINTECH", label: "金融", description: "银行、证券、支付、保险" },
  { value: "ECOMMERCE", label: "电商零售", description: "电商平台、零售、品牌 DTC" },
  { value: "EDUCATION", label: "教育", description: "K12、职业教育、在线学习" },
  { value: "HEALTHCARE", label: "医疗健康", description: "医疗、健康、医美、运动" },
  {
    value: "ENTERPRISE_SAAS",
    label: "企业服务 SaaS",
    description: "OA、CRM、ERP、HR、协同办公",
  },
  { value: "AI_TOOLS", label: "AI 工具", description: "大模型、AI 助手、AIGC 工具" },
  {
    value: "DEV_TOOLS",
    label: "数据 / 开发工具",
    description: "数据平台、低代码、研发工具链",
  },
  {
    value: "SOCIAL_ENTERTAINMENT",
    label: "社交娱乐内容",
    description: "社交、内容、视频、游戏",
  },
  {
    value: "MOBILITY_LOGISTICS",
    label: "出行物流",
    description: "出行、地图、物流、配送",
  },
  {
    value: "LIFE_SERVICES",
    label: "生活服务",
    description: "本地生活、餐饮、旅行、家政",
  },
  {
    value: "GOVERNMENT_PUBLIC",
    label: "政务公共",
    description: "政务服务、公共事业、城市治理",
  },
  {
    value: "INDUSTRIAL_MANUFACTURING",
    label: "工业制造",
    description: "工业互联网、制造、能源、供应链",
  },
  { value: "OTHER", label: "其他", description: "不在以上分类中" },
];

export const PROJECT_NATURE_OPTIONS: Option<ProjectNatureValue>[] = [
  {
    value: "NEW_BUILD",
    label: "0→1 全新搭建",
    description: "从零定义需求、流程和方案",
  },
  {
    value: "MAJOR_REDESIGN",
    label: "重大改版",
    description: "结构 / 视觉 / 体验整体重做",
  },
  {
    value: "ITERATION",
    label: "体验优化迭代",
    description: "针对已有产品做局部打磨与优化",
  },
  {
    value: "DESIGN_SYSTEM",
    label: "设计系统建设",
    description: "组件库、设计规范、Token 体系建设",
  },
  {
    value: "CONCEPT",
    label: "概念探索 / 提案",
    description: "未上线、用于探索方向或对外提案",
  },
];

export const INVOLVEMENT_OPTIONS: Option<InvolvementValue>[] = [
  {
    value: "LEAD",
    label: "主导设计",
    description: "独立牵头，从目标到方案全程负责",
  },
  {
    value: "CORE",
    label: "核心参与",
    description: "关键模块的设计决策由我推动",
  },
  {
    value: "SUPPORT",
    label: "协作支持",
    description: "按需求执行，配合主设计落地",
  },
];

// ---- Backwards-compat aliases used elsewhere in editor UI ----
export type ProjectTypeOption = Option<string>;
export type InvolvementOption = Option<InvolvementValue>;
export const PROJECT_TYPE_OPTIONS: ProjectTypeOption[] = AUDIENCE_OPTIONS;

export type ProjectCreationGatePayload = {
  audience: AudienceValue;
  platform: PlatformValue;
  industry: IndustryValue;
  projectNature: ProjectNatureValue;
  involvementLevel: InvolvementValue;
};

export interface ProjectCreationGateProps {
  projectName: string;
  submitting: boolean;
  error: string;
  onSubmit: (payload: ProjectCreationGatePayload) => void | Promise<void>;
}

const STEPS = [
  { key: "audience", title: "项目受众", hint: "面向谁" },
  { key: "platform", title: "平台形态", hint: "在哪儿用" },
  { key: "industry", title: "所属行业", hint: "什么领域" },
  { key: "nature", title: "项目性质", hint: "项目阶段" },
  { key: "involvement", title: "我的职责", hint: "你的角色" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function ProjectCreationGate({
  projectName,
  submitting,
  error,
  onSubmit,
}: ProjectCreationGateProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [audience, setAudience] = useState<AudienceValue | "">("");
  const [platform, setPlatform] = useState<PlatformValue | "">("");
  const [industry, setIndustry] = useState<IndustryValue | "">("");
  const [projectNature, setProjectNature] = useState<ProjectNatureValue | "">("");
  const [involvementLevel, setInvolvementLevel] = useState<InvolvementValue | "">("");

  const currentStep: StepKey = STEPS[stepIndex].key;

  function isStepFilled(key: StepKey) {
    if (key === "audience") return Boolean(audience);
    if (key === "platform") return Boolean(platform);
    if (key === "industry") return Boolean(industry);
    if (key === "nature") return Boolean(projectNature);
    if (key === "involvement") return Boolean(involvementLevel);
    return false;
  }

  const canAdvance = isStepFilled(currentStep);
  const isLastStep = stepIndex === STEPS.length - 1;
  const allFilled = STEPS.every((step) => isStepFilled(step.key));
  const canSubmit = allFilled && !submitting;

  function handleSelect<T extends string>(setter: (v: T) => void, value: T) {
    setter(value);
  }

  function handleNext() {
    if (!canAdvance) return;
    if (isLastStep) {
      handleSubmit();
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function handleBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      audience: audience as AudienceValue,
      platform: platform as PlatformValue,
      industry: industry as IndustryValue,
      projectNature: projectNature as ProjectNatureValue,
      involvementLevel: involvementLevel as InvolvementValue,
    });
  }

  return (
    <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-[640px] rounded-2xl border border-white/10 bg-neutral-950 p-7 shadow-2xl">
        <div className="mb-5">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-white/40">
            <Lock className="h-3 w-3" />
            开始编辑前 · 一经确定不可更改
          </div>
          <h2 className="text-xl font-semibold text-white/95">
            确认「{projectName}」的项目客观条件
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            这些条件决定 AI 怎么拆解叙事结构、推荐视觉风格和挑选章节模板。
            <span className="text-amber-400/80">一经确定不可更改</span>
            ，如需修改只能删除项目重建。
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-5 flex items-center gap-1.5">
          {STEPS.map((step, idx) => {
            const filled = isStepFilled(step.key);
            const active = idx === stepIndex;
            const reachable = idx <= stepIndex || filled;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => {
                  if (reachable) setStepIndex(idx);
                }}
                disabled={!reachable}
                className={cn(
                  "flex flex-1 flex-col items-start gap-1 rounded-lg border px-2.5 py-1.5 text-left transition-all",
                  active
                    ? "border-white/30 bg-white/8"
                    : filled
                      ? "border-white/12 bg-white/4 hover:border-white/20"
                      : "border-white/6 bg-transparent",
                  !reachable && "cursor-not-allowed opacity-50",
                )}
              >
                <div className="flex w-full items-center justify-between">
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-semibold",
                      filled
                        ? "bg-white text-neutral-950"
                        : active
                          ? "border border-white/60 text-white/80"
                          : "border border-white/20 text-white/40",
                    )}
                  >
                    {filled ? <Check className="h-2.5 w-2.5" /> : idx + 1}
                  </span>
                </div>
                <div
                  className={cn(
                    "text-xs font-medium",
                    active ? "text-white/95" : filled ? "text-white/70" : "text-white/40",
                  )}
                >
                  {step.title}
                </div>
              </button>
            );
          })}
        </div>

        {/* Step body */}
        <section className="mb-5 min-h-[280px]">
          {currentStep === "audience" && (
            <OptionGrid
              cols={2}
              options={AUDIENCE_OPTIONS}
              value={audience}
              onSelect={(v) => handleSelect(setAudience, v)}
            />
          )}
          {currentStep === "platform" && (
            <OptionGrid
              cols={2}
              options={PLATFORM_OPTIONS}
              value={platform}
              onSelect={(v) => handleSelect(setPlatform, v)}
            />
          )}
          {currentStep === "industry" && (
            <OptionGrid
              cols={3}
              compact
              options={INDUSTRY_OPTIONS}
              value={industry}
              onSelect={(v) => handleSelect(setIndustry, v)}
            />
          )}
          {currentStep === "nature" && (
            <OptionGrid
              cols={1}
              options={PROJECT_NATURE_OPTIONS}
              value={projectNature}
              onSelect={(v) => handleSelect(setProjectNature, v)}
            />
          )}
          {currentStep === "involvement" && (
            <OptionGrid
              cols={1}
              options={INVOLVEMENT_OPTIONS}
              value={involvementLevel}
              onSelect={(v) => handleSelect(setInvolvementLevel, v)}
            />
          )}
        </section>

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/8 px-3 py-2.5">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/80" />
            <p className="text-xs leading-relaxed text-red-300/90">{error}</p>
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0 || submitting}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-3 text-sm font-medium transition-all",
              stepIndex === 0 || submitting
                ? "cursor-not-allowed text-white/25"
                : "text-white/70 hover:border-white/20 hover:bg-white/5",
            )}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            上一步
          </button>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance || submitting}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all active:scale-[0.99]",
              canAdvance && !submitting
                ? "bg-white text-neutral-950 hover:bg-neutral-100"
                : "cursor-not-allowed bg-white/8 text-white/30",
            )}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                正在锁定…
              </>
            ) : isLastStep ? (
              <>
                <Sparkles className="h-4 w-4" />
                确定并进入项目准备
              </>
            ) : (
              <>下一步 · {STEPS[stepIndex + 1]?.title}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionGrid<T extends string>({
  options,
  value,
  onSelect,
  cols,
  compact,
}: {
  options: Option<T>[];
  value: T | "";
  onSelect: (v: T) => void;
  cols: 1 | 2 | 3;
  compact?: boolean;
}) {
  const colsClass =
    cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : "grid-cols-3";
  return (
    <div className={cn("grid gap-2", colsClass)}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={cn(
              "rounded-xl border text-left transition-all",
              compact ? "p-2.5" : "p-3",
              active
                ? "border-white/40 bg-white/8 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]"
                : "border-white/8 bg-white/3 hover:border-white/14 hover:bg-white/5",
            )}
          >
            <div
              className={cn(
                "font-medium text-white/90",
                compact ? "text-xs" : "text-sm",
              )}
            >
              {option.label}
            </div>
            <div
              className={cn(
                "mt-0.5 leading-relaxed text-white/40",
                compact ? "text-xs" : "text-xs",
              )}
            >
              {option.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
