"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardAssetReasoning } from "@/lib/project-asset-reasoning";

type Props = {
  reasonings: BoardAssetReasoning[];
  className?: string;
};

export function AssetReasoningBlock({ reasonings, className }: Props) {
  if (reasonings.length === 0) return null;
  return (
    <div className={cn("rounded-xl border border-white/6 bg-white/2 p-3", className)}>
      <p className="text-[11px] tracking-[0.14em] text-white/34">本页素材</p>
      <ul className="mt-2 space-y-2">
        {reasonings.map((item) => (
          <AssetReasoningRow key={item.assetId} item={item} />
        ))}
      </ul>
    </div>
  );
}

function AssetReasoningRow({ item }: { item: BoardAssetReasoning }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-lg border border-white/5 bg-white/3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/4"
        aria-expanded={open}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-white/80">{item.assetTitle}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-white/12 bg-white/4 px-1.5 py-0.5 text-[10px] text-white/60">
              {item.bucketLabel}
            </span>
            <span className="rounded-full border border-white/8 bg-white/3 px-1.5 py-0.5 text-[10px] text-white/50">
              {item.sourceLabel}
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-3.5 w-3.5 shrink-0 text-white/40 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-white/5 px-2.5 py-2 text-[11px] leading-relaxed text-white/56">
          <p className="text-[10px] tracking-[0.12em] text-white/34">为什么是这张素材</p>
          <p className="mt-1 text-white/72">{item.detail}</p>
          {item.matchedKeywords.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.matchedKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-white/6 bg-white/2 px-1.5 py-0.5 text-[10px] text-white/48"
                >
                  #{keyword}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
