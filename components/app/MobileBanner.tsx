"use client";

import { useState } from "react";
import { Monitor, X } from "lucide-react";

export function MobileBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 md:hidden">
      <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <p className="flex-1 text-xs leading-relaxed text-amber-800">
        为获得更稳定和高效的编辑体验，请在桌面端继续完成作品集编辑与导出。
      </p>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100"
        aria-label="关闭提示"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
