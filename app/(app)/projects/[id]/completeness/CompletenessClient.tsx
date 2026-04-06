"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyActionBar } from "@/components/app/StickyActionBar";

export function CompletenessClient({ projectId }: { projectId: string }) {
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
      router.push(`/projects/${projectId}/package`);
    } catch {
      setLoading(false);
    }
  }

  return (
    <StickyActionBar>
      <Button
        variant="outline"
        className="h-11 rounded-none px-4"
        onClick={() => router.push(`/projects/${projectId}/boundary`)}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        上一步
      </Button>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          className="h-11 rounded-none px-5"
          onClick={() => router.push(`/projects/${projectId}/facts`)}
        >
          去补充事实
        </Button>
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
  );
}
