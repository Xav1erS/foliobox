"use client";

import Link from "next/link";
import { useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PlanSummaryCopy } from "@/lib/entitlement";
import { cn } from "@/lib/utils";

type EditorScaffoldProps = {
  objectLabel: string;
  objectName: string;
  backHref: string;
  backLabel: string;
  statusLabel?: string;
  statusMeta?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  leftRail: ReactNode;
  center: ReactNode;
  rightRail: ReactNode;
  bottomStrip?: ReactNode;
  topNote?: ReactNode;
  planSummary?: PlanSummaryCopy;
};

export function EditorScaffold({
  objectLabel,
  objectName,
  backHref,
  backLabel,
  statusLabel,
  statusMeta,
  primaryAction,
  secondaryAction,
  leftRail,
  center,
  rightRail,
  bottomStrip,
  topNote,
  planSummary,
}: EditorScaffoldProps) {
  const [focusMode, setFocusMode] = useState(false);

  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(245,245,244,0.95)_42%,_rgba(241,241,241,0.92))]">
      <header className="border-b-2 border-black bg-white/95 shadow-[0_18px_60px_-52px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="flex flex-col gap-4 px-4 py-4 lg:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-[0.18em] text-neutral-400">
                <Link
                  href={backHref}
                  className="inline-flex items-center gap-1.5 text-neutral-500 transition-colors hover:text-neutral-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {backLabel}
                </Link>
                <span className="text-neutral-300">/</span>
                <span>{objectLabel}</span>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h1 className="truncate text-[2rem] font-semibold tracking-tight text-neutral-950">
                  {objectName}
                </h1>
                {statusLabel ? (
                  <span className="border border-neutral-300 bg-neutral-950 px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide text-white">
                    {statusLabel}
                  </span>
                ) : null}
                {statusMeta ? (
                  <span className="text-sm text-neutral-500">{statusMeta}</span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4"
                onClick={() => setFocusMode((current) => !current)}
              >
                {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                {focusMode ? "退出专注模式" : "专注模式"}
              </Button>
              {secondaryAction}
              {primaryAction}
            </div>
          </div>

          {topNote || planSummary ? (
            <div
              className={cn(
                "grid gap-3",
                topNote && planSummary ? "xl:grid-cols-[minmax(0,1.2fr)_340px]" : "grid-cols-1"
              )}
            >
              {topNote ? (
                <div className="relative overflow-hidden border border-black bg-[linear-gradient(135deg,_rgba(10,10,10,0.98),_rgba(28,25,23,0.98))] px-5 py-4 text-sm leading-6 text-white shadow-[0_24px_60px_-48px_rgba(15,23,42,0.55)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.16),_transparent_34%),linear-gradient(135deg,_rgba(248,113,113,0.12),_transparent_42%)]" />
                  <div className="relative">
                    <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/48">
                      Editor Overview
                    </p>
                    <div className="mt-3 max-w-4xl text-sm leading-6 text-white/84">{topNote}</div>
                    {statusLabel || statusMeta ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {statusLabel ? (
                          <span className="border border-white/15 bg-white/8 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-white/76">
                            {statusLabel}
                          </span>
                        ) : null}
                        {statusMeta ? (
                          <span className="border border-white/10 bg-black/10 px-2 py-1 text-[10px] font-mono uppercase tracking-[0.18em] text-white/62">
                            {statusMeta}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {planSummary ? (
                <div className="border border-neutral-300 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(245,245,244,0.96))] px-4 py-4 shadow-[0_24px_60px_-54px_rgba(15,23,42,0.42)]">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                    当前权益
                  </p>
                  <p className="mt-2 text-base font-semibold text-neutral-950">{planSummary.title}</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    {planSummary.description}
                  </p>
                  {planSummary.metrics && planSummary.metrics.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {planSummary.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="border border-neutral-200 bg-white px-3 py-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]"
                        >
                          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                            {metric.label}
                          </p>
                          <p className="mt-1 text-sm font-medium text-neutral-800">
                            {metric.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <Link
                    href={planSummary.href}
                    className="mt-3 inline-flex text-sm font-medium text-neutral-800 underline-offset-2 hover:underline"
                  >
                    {planSummary.ctaLabel}
                  </Link>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <div
        className={cn(
          "grid flex-1 grid-cols-1 gap-0",
          focusMode ? "xl:grid-cols-1" : "xl:grid-cols-[280px_minmax(0,1fr)_320px]"
        )}
      >
        {!focusMode ? (
          <aside className="border-b border-neutral-300 bg-white/92 xl:border-b-0 xl:border-r xl:border-neutral-300">
            <div className="flex h-full flex-col">{leftRail}</div>
          </aside>
        ) : null}

        <main className="min-w-0 bg-[linear-gradient(180deg,_rgba(250,250,249,0.72),_rgba(244,244,245,0.82))]">
          <div className="h-full">{center}</div>
        </main>

        {!focusMode ? (
          <aside className="border-t border-neutral-300 bg-white/92 xl:border-l xl:border-t-0 xl:border-neutral-300">
            <div className="flex h-full flex-col">{rightRail}</div>
          </aside>
        ) : null}
      </div>

      {bottomStrip && !focusMode ? (
        <div className="border-t border-neutral-300 bg-white/95 px-4 py-3 shadow-[0_-18px_60px_-52px_rgba(15,23,42,0.22)] lg:px-6">
          {bottomStrip}
        </div>
      ) : null}
    </div>
  );
}

export function EditorRailSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-b border-neutral-200 px-4 py-5", className)}>
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
        {title}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function EditorInfoList({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.label} className="flex items-start justify-between gap-4 text-sm">
          <span className="text-neutral-400">{item.label}</span>
          <span className="text-right text-neutral-700">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
