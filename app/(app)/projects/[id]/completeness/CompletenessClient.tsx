"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ChevronLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyActionBar } from "@/components/app/StickyActionBar";
import type { CompletenessAnalysis } from "@/app/api/projects/[id]/completeness/analyze/route";

const VERDICT_CONFIG = {
  ready:        { label: "信息完整，可以深讲",     bgClass: "border-emerald-100 bg-emerald-50", textClass: "text-emerald-800", badgeClass: "border-emerald-300 bg-emerald-100 text-emerald-800" },
  almost_ready: { label: "基本完整，建议补充后继续", bgClass: "border-amber-100 bg-amber-50",   textClass: "text-amber-800",   badgeClass: "border-amber-300 bg-amber-100 text-amber-800"   },
  needs_work:   { label: "信息较少，建议先补充",    bgClass: "border-amber-100 bg-amber-50",   textClass: "text-amber-800",   badgeClass: "border-amber-300 bg-amber-100 text-amber-800"   },
  insufficient: { label: "信息不足，建议回去补充",  bgClass: "border-red-100 bg-red-50",       textClass: "text-red-800",     badgeClass: "border-red-300 bg-red-100 text-red-800"         },
};

const STATUS_CONFIG = {
  strong: { label: "充足", className: "text-emerald-600" },
  adequate: { label: "基本够", className: "text-neutral-600" },
  weak: { label: "较弱", className: "text-amber-600" },
  missing: { label: "缺失", className: "text-red-500" },
};

export function CompletenessClient({
  projectId,
  initialAnalysis,
}: {
  projectId: string;
  initialAnalysis: CompletenessAnalysis | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CompletenessAnalysis | null>(initialAnalysis);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/completeness/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAnalyzeError(data?.error ?? "分析失败，请重试");
        return;
      }
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch {
      setAnalyzeError("网络异常，请重试");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("failed");
      router.push(`/projects/${projectId}/package`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <>
      {/* AI 分析结果 */}
      {analysis && (
        <div className="mt-4 border border-neutral-300 bg-white">
          {/* 总体结论 header */}
          {(() => {
            const vcfg = VERDICT_CONFIG[analysis.overallVerdict];
            return (
              <div className={`flex items-start justify-between gap-4 border-b px-6 py-4 ${vcfg.bgClass}`}>
                <p className={`text-sm leading-6 ${vcfg.textClass}`}>{analysis.overallComment}</p>
                <span className={`shrink-0 border px-2 py-0.5 text-[10px] font-mono font-semibold ${vcfg.badgeClass}`}>
                  {vcfg.label}
                </span>
              </div>
            );
          })()}

          {/* 维度评估表格 */}
          <div className="border-b border-neutral-100">
            <div className="divide-y divide-neutral-100">
              {analysis.dimensions.map((dim) => {
                const cfg = STATUS_CONFIG[dim.status];
                return (
                  <div key={dim.key} className="flex items-start gap-4 px-6 py-3">
                    <span className={`w-12 shrink-0 text-[10px] font-mono font-semibold ${cfg.className}`}>
                      {cfg.label}
                    </span>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-neutral-700">{dim.label}</span>
                      {dim.comment && (
                        <p className="mt-0.5 text-xs leading-5 text-neutral-400">{dim.comment}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 优先建议 */}
          {analysis.prioritySuggestions.length > 0 && (
            <div className="px-6 py-4">
              <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.15em] text-neutral-400">
                优先建议
              </p>
              <ul className="space-y-2">
                {analysis.prioritySuggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-600">
                    <span className="mt-1.5 h-1 w-1 shrink-0 bg-neutral-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {analyzeError && (
        <p className="mt-3 text-sm text-red-500">{analyzeError}</p>
      )}

      <StickyActionBar>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="h-11 rounded-none px-4"
            onClick={() => router.push(`/projects/${projectId}/boundary`)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            上一步
          </Button>

          <Button
            variant="outline"
            className="h-11 rounded-none px-5"
            disabled={analyzing}
            onClick={handleAnalyze}
          >
            {analyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {analyzing ? "分析中..." : analysis ? "重新评估" : "AI 完整度评估"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            className="h-11 rounded-none px-5"
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            确认完整度
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </StickyActionBar>
    </>
  );
}
