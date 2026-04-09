"use client";

import Link from "next/link";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PlanSummaryCopy } from "@/lib/entitlement";
import { cn } from "@/lib/utils";

export const editorFieldClass =
  "border-white/10 bg-white/[0.03] text-white placeholder:text-white/28";

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
  leftRailLabel?: string;
  rightRailLabel?: string;
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
  leftRailLabel = "左侧栏",
  rightRailLabel = "右侧栏",
}: EditorScaffoldProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="flex h-full min-h-screen flex-col overflow-hidden bg-[#101114] text-white">
      <header className="border-b border-white/10 bg-[#16171b]/96 backdrop-blur">
        <div className="flex min-h-14 items-center gap-3 px-4 py-2">
          <EditorChromeLink href={backHref} className="shrink-0 gap-2 px-3 text-sm">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </EditorChromeLink>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-white/32">
              <span>{objectLabel}</span>
              {statusLabel ? (
                <span className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 text-white/56">
                  {statusLabel}
                </span>
              ) : null}
              {statusMeta ? <span>{statusMeta}</span> : null}
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-3">
              <h1 className="truncate text-xl font-semibold tracking-tight text-white">
                {objectName}
              </h1>
              {topNote ? (
                <div className="hidden min-w-0 max-w-xl truncate text-sm text-white/44 xl:block">
                  {topNote}
                </div>
              ) : null}
            </div>
          </div>

          {planSummary ? (
            <Link
              href={planSummary.href}
              className="hidden rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/64 transition-colors hover:bg-white/[0.07] hover:text-white lg:block"
            >
              {planSummary.title}
            </Link>
          ) : null}

          <div className="flex shrink-0 items-center gap-2">
            {secondaryAction}
            {primaryAction}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {leftCollapsed ? (
          <CollapsedRailButton
            side="left"
            label={leftRailLabel}
            onClick={() => setLeftCollapsed(false)}
          />
        ) : (
          <aside className="flex w-[320px] shrink-0 flex-col border-r border-white/10 bg-[#17191d]">
            <RailHeader
              label={leftRailLabel}
              side="left"
              onCollapse={() => setLeftCollapsed(true)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto">{leftRail}</div>
          </aside>
        )}

        <main className="relative min-w-0 flex-1 overflow-hidden bg-[#1b1d22]">
          <div
            className="pointer-events-none absolute inset-0 opacity-100"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              maskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0.28) 100%)",
              WebkitMaskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 40%, rgba(0,0,0,0.28) 100%)",
            }}
          />
          <div className="relative h-full overflow-hidden">{center}</div>
        </main>

        {rightCollapsed ? (
          <CollapsedRailButton
            side="right"
            label={rightRailLabel}
            onClick={() => setRightCollapsed(false)}
          />
        ) : (
          <aside className="flex w-[340px] shrink-0 flex-col border-l border-white/10 bg-[#17191d]">
            <RailHeader
              label={rightRailLabel}
              side="right"
              onCollapse={() => setRightCollapsed(true)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto">{rightRail}</div>
          </aside>
        )}
      </div>

      {bottomStrip ? (
        <div className="border-t border-white/10 bg-[#121317] px-4 py-3">{bottomStrip}</div>
      ) : null}
    </div>
  );
}

function RailHeader({
  label,
  side,
  onCollapse,
}: {
  label: string;
  side: "left" | "right";
  onCollapse: () => void;
}) {
  return (
    <div className="flex h-11 items-center justify-between border-b border-white/10 px-3">
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/34">
        {label}
      </p>
      <EditorChromeIconButton onClick={onCollapse} aria-label={`折叠${label}`}>
        {side === "left" ? (
          <PanelLeftClose className="h-4 w-4" />
        ) : (
          <PanelRightClose className="h-4 w-4" />
        )}
      </EditorChromeIconButton>
    </div>
  );
}

function CollapsedRailButton({
  side,
  label,
  onClick,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-10 shrink-0 flex-col items-center justify-center gap-2 border-white/10 bg-[#15161a] text-white/48 transition-colors hover:bg-[#1a1c21] hover:text-white"
      aria-label={`展开${label}`}
    >
      {side === "left" ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelRightOpen className="h-4 w-4" />
      )}
      <span className="rotate-180 text-[10px] font-mono uppercase tracking-[0.18em] [writing-mode:vertical-rl]">
        {label}
      </span>
    </button>
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
    <section className={cn("border-b border-white/10 px-4 py-4", className)}>
      <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/34">
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
          <span className="text-white/36">{item.label}</span>
          <span className="text-right text-white/78">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export function EditorMiniButton({
  side,
  children,
  className,
}: {
  side: "left" | "right";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-4 z-10",
        side === "left" ? "left-4" : "right-4",
        className
      )}
    >
      <div className="pointer-events-auto rounded-md border border-white/10 bg-[#17191d]/96 p-1 shadow-[0_18px_60px_-40px_rgba(0,0,0,0.65)]">
        {children}
      </div>
    </div>
  );
}

export function EditorCanvasChip({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.16em]",
        active
          ? "border-sky-400/60 bg-sky-400/14 text-sky-100"
          : "border-white/10 bg-white/[0.03] text-white/46"
      )}
    >
      {children}
    </span>
  );
}

export function EditorSurfaceButton({
  active,
  children,
  className,
  onClick,
  disabled,
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-xl border px-3 py-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
        active
          ? "border-sky-400/70 bg-sky-400/10 text-white shadow-[0_0_0_1px_rgba(56,189,248,0.16)]"
          : "border-white/10 bg-white/[0.03] text-white/72 hover:bg-white/[0.05]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function EditorEmptyState({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm leading-6 text-white/46",
        className
      )}
    >
      {children}
    </div>
  );
}

export function EditorStripButton({
  active,
  children,
  className,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-lg border px-3 py-3 text-left transition-colors",
        active
          ? "border-sky-400/70 bg-sky-400/10 text-white"
          : "border-white/10 bg-white/[0.03] text-white/64 hover:bg-white/[0.05]",
        className
      )}
    >
      {children}
    </button>
  );
}

export function EditorEdgeToggle({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <EditorChromeIconButton
      onClick={onClick}
      aria-label={side === "left" ? "展开左侧栏" : "展开右侧栏"}
    >
      {side === "left" ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </EditorChromeIconButton>
  );
}

export function EditorChromeButton({
  className,
  variant = "outline",
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      variant={variant}
      className={cn(
        "border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white",
        className
      )}
      {...props}
    />
  );
}

export function EditorChromeIconButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <EditorChromeButton
      size="icon"
      className={cn("h-8 w-8 rounded-md text-white/54", className)}
      {...props}
    />
  );
}

export function EditorChromeLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-9 items-center rounded-md border border-white/10 bg-white/[0.03] text-white/72 transition-colors hover:bg-white/[0.08] hover:text-white",
        className
      )}
    >
      {children}
    </Link>
  );
}

export function EditorTabsList({
  className,
  ...props
}: ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn("rounded-lg bg-white/[0.04] p-1", className)}
      {...props}
    />
  );
}

export function EditorTabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn(
        "rounded-md text-white/54 data-[state=active]:bg-white data-[state=active]:text-neutral-900",
        className
      )}
      {...props}
    />
  );
}
