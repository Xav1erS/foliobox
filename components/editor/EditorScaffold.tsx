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
  "rounded-2xl border-white/[0.08] bg-[#181715] text-white placeholder:text-white/24 shadow-none";

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
  rightRail?: ReactNode | null;
  bottomStrip?: ReactNode;
  topNote?: ReactNode;
  planSummary?: PlanSummaryCopy;
  leftRailLabel?: string;
  rightRailLabel?: string;
  leftRailWidthClass?: string;
  rightRailWidthClass?: string;
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
  leftRailWidthClass = "w-[332px]",
  rightRailWidthClass = "w-[332px]",
}: EditorScaffoldProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const hasHeaderMeta = Boolean(objectLabel || statusLabel || statusMeta);

  return (
    <div className="flex h-full min-h-screen flex-col overflow-hidden bg-[#0d0d0c] text-white">
      <header className="border-b border-white/[0.05] bg-[#0f0f0e]/96 shadow-[0_18px_40px_-32px_rgba(0,0,0,0.85)] backdrop-blur-2xl">
        <div className="flex min-h-[68px] items-center gap-3 px-5 py-2.5">
          <EditorChromeLink href={backHref} className="shrink-0 gap-2 px-3.5 text-sm">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </EditorChromeLink>

          <div className="min-w-0 flex-1">
            {hasHeaderMeta ? (
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/36">
                {objectLabel ? <span>{objectLabel}</span> : null}
                {statusLabel ? (
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-white/62">
                    {statusLabel}
                  </span>
                ) : null}
                {statusMeta ? <span>{statusMeta}</span> : null}
              </div>
            ) : null}
            <div className={cn("flex min-w-0 items-center gap-3", hasHeaderMeta ? "mt-1" : "")}>
              <h1 className="truncate text-[22px] font-semibold tracking-[-0.035em] text-white">
                {objectName}
              </h1>
              {topNote ? (
                <div className="hidden min-w-0 max-w-xl truncate text-sm text-white/36 xl:block">
                  {topNote}
                </div>
              ) : null}
            </div>
          </div>

          {planSummary ? (
            <Link
              href={planSummary.href}
              className="hidden rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/58 transition-colors hover:bg-white/[0.07] hover:text-white lg:block"
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
          <aside
            className={cn(
              "flex shrink-0 flex-col border-r border-white/[0.05] bg-[#11100f] shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)] transition-[width] duration-300 ease-out",
              leftRailWidthClass
            )}
          >
            <RailHeader
              label={leftRailLabel}
              side="left"
              onCollapse={() => setLeftCollapsed(true)}
            />
            <div className="min-h-0 flex-1 overflow-y-auto">{leftRail}</div>
          </aside>
        )}

        <main className="relative min-w-0 flex-1 overflow-hidden bg-[#171513]">
          <div
            className="pointer-events-none absolute inset-0 opacity-100"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 20%, rgba(255,255,255,0.05), transparent 18%), radial-gradient(circle at 78% 74%, rgba(255,255,255,0.035), transparent 22%), radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1.5px)",
              backgroundSize: "auto, auto, 34px 34px",
              maskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 42%, rgba(0,0,0,0.2) 100%)",
              WebkitMaskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 42%, rgba(0,0,0,0.2) 100%)",
            }}
          />
          <div className="relative h-full overflow-hidden">{center}</div>
        </main>

        {rightRail ? (
          rightCollapsed ? (
            <CollapsedRailButton
              side="right"
              label={rightRailLabel}
              onClick={() => setRightCollapsed(false)}
            />
          ) : (
            <aside
              className={cn(
                "flex shrink-0 flex-col border-l border-white/[0.05] bg-[#151311] shadow-[inset_1px_0_0_rgba(255,255,255,0.03)] transition-[width] duration-300 ease-out animate-in fade-in-0 slide-in-from-right-2",
                rightRailWidthClass
              )}
            >
              <RailHeader
                label={rightRailLabel}
                side="right"
                onCollapse={() => setRightCollapsed(true)}
              />
              <div className="min-h-0 flex-1 overflow-y-auto">{rightRail}</div>
            </aside>
          )
        ) : null}
      </div>

      {bottomStrip ? (
        <div className="border-t border-white/[0.05] bg-[#0f0f0e]/96 px-4 py-3 shadow-[0_-20px_48px_-36px_rgba(0,0,0,0.82)] backdrop-blur-2xl">
          {bottomStrip}
        </div>
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
    <div className="flex h-12 items-center justify-between border-b border-white/[0.05] bg-white/[0.02] px-4">
      <p className="text-[11px] font-medium tracking-[0.18em] text-white/34">
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
      className="flex w-11 shrink-0 flex-col items-center justify-center gap-2 border-white/[0.05] bg-[#100f0e] text-white/44 transition-colors hover:bg-[#1a1817] hover:text-white"
      aria-label={`展开${label}`}
    >
      {side === "left" ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelRightOpen className="h-4 w-4" />
      )}
      <span className="rotate-180 text-[10px] tracking-[0.14em] [writing-mode:vertical-rl]">
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
    <section className={cn("border-b border-white/[0.05] px-4 py-4", className)}>
      <p className="text-[11px] text-white/40">
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
      <div className="pointer-events-auto rounded-2xl border border-white/[0.08] bg-[#171614]/92 p-1.5 shadow-[0_30px_80px_-44px_rgba(0,0,0,0.72)]">
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
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px]",
        active
          ? "border-white/[0.16] bg-white/[0.08] text-white"
          : "border-white/[0.08] bg-white/[0.03] text-white/52"
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
        "w-full rounded-2xl border px-3 py-3 text-left transition-colors disabled:pointer-events-none disabled:opacity-50",
        active
          ? "border-white/[0.16] bg-white/[0.09] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
          : "border-white/[0.08] bg-white/[0.025] text-white/72 hover:bg-white/[0.05]",
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
        "rounded-[24px] border border-dashed border-white/[0.1] bg-white/[0.018] px-4 py-6 text-sm leading-6 text-white/46",
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
        "shrink-0 rounded-[20px] border px-3 py-3 text-left transition-colors",
        active
          ? "border-white/[0.16] bg-white/[0.09] text-white"
          : "border-white/[0.08] bg-white/[0.025] text-white/64 hover:bg-white/[0.05]",
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
        "rounded-full border-white/[0.08] bg-white/[0.025] text-white hover:bg-white/[0.08] hover:text-white",
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
      className={cn("h-8 w-8 rounded-full text-white/54", className)}
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
        "inline-flex h-10 items-center rounded-full border border-white/[0.08] bg-white/[0.025] text-white/72 transition-colors hover:bg-white/[0.08] hover:text-white",
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
      className={cn("rounded-full bg-white/[0.03] p-1", className)}
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
        "rounded-full px-4 text-white/54 transition-colors data-[state=active]:bg-white/[0.08] data-[state=active]:text-white",
        className
      )}
      {...props}
    />
  );
}
