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
    <div className="flex min-h-full flex-col bg-neutral-100/70">
      <header className="border-b-2 border-black bg-neutral-100/95 backdrop-blur">
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
                <h1 className="truncate text-2xl font-semibold tracking-tight text-neutral-900">
                  {objectName}
                </h1>
                {statusLabel ? (
                  <span className="border border-neutral-300 bg-white px-2 py-0.5 text-[11px] font-mono uppercase tracking-wide text-neutral-500">
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
                topNote && planSummary ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1"
              )}
            >
              {topNote ? (
                <div className="border border-neutral-300 bg-white/85 px-4 py-3 text-sm leading-6 text-neutral-600">
                  {topNote}
                </div>
              ) : null}
              {planSummary ? (
                <div className="border border-neutral-300 bg-white px-4 py-3">
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
                    当前权益
                  </p>
                  <p className="mt-2 text-sm font-medium text-neutral-900">{planSummary.title}</p>
                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    {planSummary.description}
                  </p>
                  {planSummary.metrics && planSummary.metrics.length > 0 ? (
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {planSummary.metrics.map((metric) => (
                        <div
                          key={metric.label}
                          className="border border-neutral-200 bg-neutral-50 px-3 py-2"
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
          <aside className="border-b border-neutral-300 bg-white/80 xl:border-b-0 xl:border-r xl:border-neutral-300">
            <div className="flex h-full flex-col">{leftRail}</div>
          </aside>
        ) : null}

        <main className="min-w-0 bg-neutral-100/65">
          <div className="h-full">{center}</div>
        </main>

        {!focusMode ? (
          <aside className="border-t border-neutral-300 bg-white/80 xl:border-l xl:border-t-0 xl:border-neutral-300">
            <div className="flex h-full flex-col">{rightRail}</div>
          </aside>
        ) : null}
      </div>

      {bottomStrip && !focusMode ? (
        <div className="border-t border-neutral-300 bg-neutral-100/95 px-4 py-3 lg:px-6">
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
    <section className={cn("border-b border-neutral-200 px-4 py-4", className)}>
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">
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
