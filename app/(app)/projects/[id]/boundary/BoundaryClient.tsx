"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyActionBar } from "@/components/app/StickyActionBar";

export function BoundaryClient({
  projectId,
  hasAssets,
}: {
  projectId: string;
  hasAssets: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
    <StickyActionBar>
      <p className="text-sm text-neutral-500">
        确认后将进入完整度检查，可以随时返回这里重新上传素材。
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-none px-5"
          onClick={() => router.push(`/projects/${projectId}/assets`)}
        >
          管理素材
        </Button>
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
  );
}
