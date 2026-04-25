"use client";

import { Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardVisualSuggestion } from "@/lib/project-asset-reasoning";

type Props = {
  suggestions: BoardVisualSuggestion[];
  onGenerateVisual?: () => void | Promise<void>;
  generating?: boolean;
  className?: string;
};

export function ContentSuggestionList({
  suggestions,
  onGenerateVisual,
  generating = false,
  className,
}: Props) {
  if (suggestions.length === 0) return null;
  return (
    <div className={cn("rounded-xl border border-white/6 bg-white/2.5 p-3", className)}>
      <p className="mb-2 text-xs tracking-[0.16em] text-white/30">推荐补充内容</p>
      <ul className="space-y-1.5">
        {suggestions.map((item) => (
          <li
            key={item.id}
            className={cn(
              "rounded-lg border px-2.5 py-2",
              item.kind === "visual_generation"
                ? "border-white/12 bg-white/3"
                : "border-white/5 bg-white/1.5"
            )}
          >
            {item.kind === "visual_generation" ? (
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0 rounded-md border border-white/10 bg-white/5 p-1">
                  <Sparkles className="h-3 w-3 text-white/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white/80">{item.label}</p>
                  {item.description ? (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-white/48">
                      {item.description}
                    </p>
                  ) : null}
                  {onGenerateVisual ? (
                    <button
                      type="button"
                      onClick={() => {
                        void onGenerateVisual();
                      }}
                      disabled={generating}
                      className="mt-2 inline-flex h-7 items-center gap-1.5 rounded-md border border-white/12 bg-white/5 px-2.5 text-[11px] font-medium text-white/80 transition-colors hover:border-white/20 hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          生成中…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3" />
                          {item.actionLabel ?? "生成补图"}
                        </>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-xs text-white/20">·</span>
                <span className="text-xs leading-relaxed text-white/55">
                  {item.label}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
