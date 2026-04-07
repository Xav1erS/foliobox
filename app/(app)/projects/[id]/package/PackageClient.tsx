"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyActionBar } from "@/components/app/StickyActionBar";
import { cn } from "@/lib/utils";
import type { PackageRecommendation } from "@/app/api/projects/[id]/package/recommend/route";

const MODES = [
  {
    value: "DEEP",
    label: "深讲",
    pageRange: "8–10 页",
    description: "完整呈现问题 → 方案 → 结果全链路，是作品集主项目的标准讲法。",
  },
  {
    value: "LIGHT",
    label: "浅讲",
    pageRange: "3–5 页",
    description: "聚焦关键判断和核心成果，适合补充能力面、不需要铺全过程的项目。",
  },
  {
    value: "SUPPORTIVE",
    label: "补充展示",
    pageRange: "1–3 页",
    description: "以视觉展示为主，起丰富度作用，不做完整叙事。",
  },
] as const;

type PackageMode = "DEEP" | "LIGHT" | "SUPPORTIVE";

const CONFIDENCE_LABEL = { high: "高置信", medium: "中置信", low: "低置信" };

export function PackageClient({
  projectId,
  initialMode,
}: {
  projectId: string;
  initialMode: PackageMode | null;
}) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<PackageMode | null>(initialMode);
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [recommendation, setRecommendation] = useState<PackageRecommendation | null>(null);
  const [recommendError, setRecommendError] = useState<string | null>(null);

  async function handleRecommend() {
    setRecommending(true);
    setRecommendError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/package/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRecommendError(data?.error ?? "推荐失败，请重试");
        return;
      }
      const data = await res.json();
      setRecommendation(data.recommendation);
      // Auto-select recommended mode if user hasn't chosen yet
      if (!selectedMode) {
        setSelectedMode(data.recommendation.recommendedMode);
      }
    } catch {
      setRecommendError("网络异常，请重试");
    } finally {
      setRecommending(false);
    }
  }

  async function handleConfirm() {
    if (!selectedMode) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageMode: selectedMode }),
      });
      if (!res.ok) throw new Error("failed");
      router.push(`/projects/${projectId}/layout`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <>
      {/* AI 推荐结果 */}
      {recommendation && (
        <div className="mb-4 border border-neutral-200 bg-neutral-50 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-neutral-500" />
              <span className="text-xs font-mono text-neutral-500">AI 建议</span>
              <span className="text-xs font-mono text-neutral-400">
                {CONFIDENCE_LABEL[recommendation.confidence]}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedMode(recommendation.recommendedMode)}
              className="text-xs text-neutral-500 underline-offset-2 hover:text-neutral-700 hover:underline"
            >
              采用建议
            </button>
          </div>
          <p className="mt-2 text-sm font-medium text-neutral-900">
            推荐「{MODES.find((m) => m.value === recommendation.recommendedMode)?.label}」
          </p>
          <p className="mt-1 text-xs leading-5 text-neutral-500">{recommendation.reasoning}</p>
          {recommendation.alternativeMode && recommendation.alternativeReason && (
            <p className="mt-2 text-xs text-neutral-400">
              备选「{MODES.find((m) => m.value === recommendation.alternativeMode)?.label}」— {recommendation.alternativeReason}
            </p>
          )}
        </div>
      )}

      {recommendError && (
        <p className="mb-3 text-sm text-red-500">{recommendError}</p>
      )}

      {/* 模式选择 */}
      <div className="space-y-2">
        {MODES.map((mode) => {
          const selected = selectedMode === mode.value;
          const isRecommended = recommendation?.recommendedMode === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => setSelectedMode(mode.value as PackageMode)}
              className={cn(
                "w-full border px-5 py-4 text-left transition-colors",
                selected
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* 直角单选框 */}
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 shrink-0 items-center justify-center border",
                      selected ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
                    )}
                  >
                    {selected && <span className="h-1 w-1 bg-white" />}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900">{mode.label}</span>
                  {isRecommended && (
                    <span className="border border-neutral-300 px-1.5 py-0.5 text-[10px] font-mono text-neutral-500">
                      AI 推荐
                    </span>
                  )}
                </div>
                <span className="text-xs font-mono text-neutral-400">{mode.pageRange}</span>
              </div>
              <p className="mt-2 pl-6 text-xs leading-5 text-neutral-500">{mode.description}</p>
            </button>
          );
        })}
      </div>

      <StickyActionBar>
        <Button
          variant="outline"
          className="h-11 rounded-none px-4"
          onClick={() => router.push(`/projects/${projectId}/completeness`)}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          上一步
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-none px-5"
            disabled={recommending}
            onClick={handleRecommend}
          >
            {recommending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {recommending ? "分析中..." : recommendation ? "重新推荐" : "AI 推荐讲法"}
          </Button>

          <Button
            className="h-11 rounded-none px-5"
            disabled={!selectedMode || loading}
            onClick={handleConfirm}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            确认包装模式
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </StickyActionBar>
    </>
  );
}
