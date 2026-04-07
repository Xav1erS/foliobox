"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyActionBar } from "@/components/app/StickyActionBar";
import type { BoundaryAnalysis } from "@/app/api/projects/[id]/boundary/analyze/route";

const CONFIDENCE_LABEL = { high: "高置信", medium: "中置信", low: "低置信" };
const CONFIDENCE_COLOR = {
  high: "text-emerald-600",
  medium: "text-amber-600",
  low: "text-neutral-500",
};

export function BoundaryClient({
  projectId,
  hasAssets,
  initialAnalysis,
}: {
  projectId: string;
  hasAssets: boolean;
  initialAnalysis: BoundaryAnalysis | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BoundaryAnalysis | null>(initialAnalysis);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/boundary/analyze`, {
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
      router.push(`/projects/${projectId}/completeness`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <>
      {/* AI 分析结果 */}
      {analysis && (
        <div className="mt-4 border border-neutral-300 bg-white">
          {/* 结果 header */}
          <div
            className={[
              "flex items-center justify-between px-6 py-4",
              analysis.isBoundaryClean
                ? "border-b border-emerald-100 bg-emerald-50"
                : "border-b border-amber-100 bg-amber-50",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              <span
                className={[
                  "border px-2 py-0.5 text-xs font-mono font-semibold",
                  analysis.isBoundaryClean
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                    : "border-amber-300 bg-amber-100 text-amber-800",
                ].join(" ")}
              >
                {analysis.isBoundaryClean ? "边界清晰" : "边界存疑"}
              </span>
              <span className="text-sm font-medium text-neutral-700">{analysis.projectSummary}</span>
            </div>
            <span className={`shrink-0 text-[10px] font-mono ${CONFIDENCE_COLOR[analysis.confidence]}`}>
              {CONFIDENCE_LABEL[analysis.confidence]}
            </span>
          </div>

          {/* 风险 + 建议 横排 */}
          {(analysis.risks.length > 0 || analysis.suggestions.length > 0) && (
            <div className="grid gap-0 divide-x divide-neutral-100 sm:grid-cols-2">
              {analysis.risks.length > 0 && (
                <div className="px-6 py-4">
                  <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.15em] text-amber-500">
                    风险与疑点
                  </p>
                  <ul className="space-y-2">
                    {analysis.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-5 text-amber-700">
                        <span className="mt-1.5 h-1 w-1 shrink-0 bg-amber-400" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.suggestions.length > 0 && (
                <div className="px-6 py-4">
                  <p className="mb-2 text-[10px] font-mono uppercase tracking-[0.15em] text-neutral-400">
                    建议
                  </p>
                  <ul className="space-y-2">
                    {analysis.suggestions.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs leading-5 text-neutral-600">
                        <span className="mt-1.5 h-1 w-1 shrink-0 bg-neutral-300" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
            className="h-11 rounded-none px-5"
            disabled={!hasAssets || analyzing}
            onClick={handleAnalyze}
          >
            {analyzing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {analyzing ? "分析中..." : analysis ? "重新分析" : "AI 边界分析"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm text-neutral-500">
            确认后将进入完整度检查，可以随时返回重新上传素材。
          </p>
          <Button
            className="h-11 rounded-none px-5"
            disabled={!hasAssets || loading}
            onClick={handleConfirm}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            确认边界
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </StickyActionBar>
    </>
  );
}
