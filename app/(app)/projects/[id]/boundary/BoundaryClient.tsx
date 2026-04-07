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
          <div className="border-b border-neutral-300 px-6 py-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-neutral-900">AI 边界分析</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono ${CONFIDENCE_COLOR[analysis.confidence]}`}>
                {CONFIDENCE_LABEL[analysis.confidence]}
              </span>
              <span
                className={`border px-2 py-0.5 text-xs font-mono ${
                  analysis.isBoundaryClean
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-amber-200 bg-amber-50 text-amber-700"
                }`}
              >
                {analysis.isBoundaryClean ? "边界清晰" : "边界存疑"}
              </span>
            </div>
          </div>
          <div className="divide-y divide-neutral-100 px-6">
            {/* 项目摘要 */}
            <div className="py-4">
              <p className="text-xs font-mono text-neutral-400 mb-1">项目概况</p>
              <p className="text-sm leading-6 text-neutral-700">{analysis.projectSummary}</p>
            </div>
            {/* 风险 */}
            {analysis.risks.length > 0 && (
              <div className="py-4">
                <p className="text-xs font-mono text-neutral-400 mb-2">风险与疑点</p>
                <ul className="space-y-1.5">
                  {analysis.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                      <span className="mt-1.5 h-1 w-1 shrink-0 bg-amber-400" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* 建议 */}
            {analysis.suggestions.length > 0 && (
              <div className="py-4">
                <p className="text-xs font-mono text-neutral-400 mb-2">建议</p>
                <ul className="space-y-1.5">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                      <span className="mt-1.5 h-1 w-1 shrink-0 bg-neutral-300" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
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
