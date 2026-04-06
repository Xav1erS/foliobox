"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyActionBar } from "@/components/app/StickyActionBar";
import { cn } from "@/lib/utils";

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
      <div className="space-y-3">
        {MODES.map((mode) => {
          const selected = selectedMode === mode.value;
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
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center border",
                      selected ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
                    )}
                  >
                    {selected && (
                      <span className="h-1.5 w-1.5 bg-white" />
                    )}
                  </span>
                  <span className="text-sm font-semibold text-neutral-900">{mode.label}</span>
                </div>
                <span className="text-xs text-neutral-400">{mode.pageRange}</span>
              </div>
              <p className="mt-2 pl-7 text-xs leading-5 text-neutral-500">{mode.description}</p>
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
        <Button
          className="h-11 rounded-none px-5"
          disabled={!selectedMode || loading}
          onClick={handleConfirm}
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          确认包装模式
          {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </StickyActionBar>
    </>
  );
}
