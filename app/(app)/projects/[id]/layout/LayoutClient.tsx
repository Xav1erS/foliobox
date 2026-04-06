"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Loader2, Zap } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  // Placeholder: generation not yet implemented
  async function handleGenerate() {
    setLoading(true);
    // TODO: call /api/projects/:id/layout/generate when implemented
    setTimeout(() => setLoading(false), 1500);
  }

  async function handleJoinPortfolio() {
    router.push("/portfolios");
  }

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
        {isReady ? (
          <Button className="h-11 rounded-none px-5" onClick={handleJoinPortfolio}>
            加入作品集
          </Button>
        ) : (
          <>
            <p className="hidden text-xs text-neutral-400 sm:block">
              生成排版是高成本动作，完成前请勿关闭页面
            </p>
            <Button
              variant="outline"
              className="h-11 rounded-none px-5"
              disabled={!hasPackageMode || loading}
              title="选择风格参考（功能建设中）"
            >
              风格参考（可选）
            </Button>
            <Button
              className="h-11 rounded-none px-5"
              disabled={!hasPackageMode || loading}
              onClick={handleGenerate}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Zap className="mr-2 h-4 w-4" />
              )}
              {hasLayout ? "重新生成排版" : "生成项目排版"}
            </Button>
          </>
        )}
      </div>
    </StickyActionBar>
  );
}
