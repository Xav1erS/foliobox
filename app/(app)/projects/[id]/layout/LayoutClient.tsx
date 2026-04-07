"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Loader2, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyActionBar } from "@/components/app/StickyActionBar";

export function LayoutClient({
  projectId,
  hasPackageMode,
  hasLayout,
  isReady,
}: {
  projectId: string;
  hasPackageMode: boolean;
  hasLayout: boolean;
  isReady: boolean;
}) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/layout/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGenerateError(data?.error ?? "生成失败，请重试");
        return;
      }
      router.refresh();
    } catch {
      setGenerateError("网络异常，请重试");
    } finally {
      setGenerating(false);
    }
  }

  async function handleVerify() {
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setVerifyError(data?.error ?? "验证失败，请重试");
        return;
      }
      router.refresh();
    } catch {
      setVerifyError("网络异常，请重试");
    } finally {
      setVerifying(false);
    }
  }

  async function handleJoinPortfolio() {
    router.push("/portfolios");
  }

  const error = generateError || verifyError;

  return (
    <StickyActionBar>
      <Button
        variant="outline"
        className="h-11 rounded-none px-4"
        onClick={() => router.push(`/projects/${projectId}/package`)}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        上一步
      </Button>

      <div className="flex items-center gap-3">
        {error && <p className="text-xs text-red-500">{error}</p>}

        {isReady ? (
          <Button className="h-11 rounded-none px-5" onClick={handleJoinPortfolio}>
            <CheckCircle className="mr-2 h-4 w-4" />
            加入作品集
          </Button>
        ) : (
          <>
            {/* 风格参考 — 功能建设中 */}
            <Button
              variant="outline"
              className="h-11 rounded-none px-5"
              disabled={!hasPackageMode}
              title="功能建设中"
              onClick={() => {}}
            >
              风格参考（可选）
            </Button>

            {/* 生成排版 */}
            <Button
              variant="outline"
              className="h-11 rounded-none px-5"
              disabled={!hasPackageMode || generating}
              onClick={handleGenerate}
            >
              {generating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {generating ? "生成中..." : hasLayout ? "重新生成排版" : "生成项目排版"}
            </Button>

            {/* 验证当前项目 */}
            <Button
              className="h-11 rounded-none px-5"
              disabled={!hasPackageMode || verifying || !hasLayout}
              onClick={handleVerify}
              title={!hasLayout ? "请先生成排版再验证" : undefined}
            >
              {verifying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              验证当前项目
            </Button>
          </>
        )}
      </div>
    </StickyActionBar>
  );
}
