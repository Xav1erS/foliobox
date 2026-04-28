"use client";

import Link from "next/link";
import { useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
  "rounded-xl border-white/8 bg-secondary text-white placeholder:text-white/24 shadow-none";

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
  hideLeftRailHeader?: boolean;
  hideRightRailHeader?: boolean;
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
  hideLeftRailHeader = false,
  hideRightRailHeader = false,
}: EditorScaffoldProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const hasHeaderMeta = Boolean(objectLabel || statusLabel || statusMeta || planSummary);

  return (
    <div className="editor-shell dark flex h-full min-h-screen flex-col overflow-hidden bg-background text-white">
      <header className="border-b border-white/10 bg-background shadow-[0_18px_48px_-28px_rgba(0,0,0,0.88)]">
        <div className="flex min-h-[64px] items-center gap-3 px-5 py-2">
          <EditorChromeLink href={backHref} className="shrink-0 gap-2 px-3.5 text-sm">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </EditorChromeLink>

          <div className="min-w-0 flex-1">
            {hasHeaderMeta ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/36">
                {objectLabel ? <span>{objectLabel}</span> : null}
                {statusLabel ? (
                  <span className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-white/62">
                    {statusLabel}
                  </span>
                ) : null}
                {statusMeta ? <span>{statusMeta}</span> : null}
                {planSummary ? (
                  <Link
                    href={planSummary.href}
                    className="text-white/48 underline-offset-4 transition-colors hover:text-white hover:underline"
                  >
                    {planSummary.title}
                  </Link>
                ) : null}
              </div>
            ) : null}
            <div className={cn("flex min-w-0 items-center gap-3", hasHeaderMeta ? "mt-1" : "")}>
              <h1 className="truncate text-[21px] font-semibold tracking-[-0.04em] text-white">
                {objectName}
              </h1>
              {topNote ? (
                <div className="hidden min-w-0 max-w-xl truncate text-sm text-white/34 xl:block">
                  {topNote}
                </div>
              ) : null}
            </div>
          </div>

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
                "flex shrink-0 flex-col border-r border-white/10 bg-background shadow-[inset_-1px_0_0_rgba(255,255,255,0.03)] transition-[width] duration-300 ease-out",
              leftRailWidthClass
            )}
          >
            {hideLeftRailHeader ? null : (
              <RailHeader
                label={leftRailLabel}
                side="left"
                onCollapse={() => setLeftCollapsed(true)}
              />
            )}
            <div className="min-h-0 flex-1 overflow-y-auto">{leftRail}</div>
          </aside>
        )}

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-card">
          <div
            className="pointer-events-none absolute inset-0 opacity-100"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 18%, rgba(255,255,255,0.045), transparent 18%), radial-gradient(circle at 80% 78%, rgba(255,255,255,0.03), transparent 22%), radial-gradient(circle, rgba(255,255,255,0.038) 1px, transparent 1.55px)",
              backgroundSize: "auto, auto, 30px 30px",
              maskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 42%, rgba(0,0,0,0.2) 100%)",
              WebkitMaskImage:
                "radial-gradient(circle at center, rgba(0,0,0,1) 42%, rgba(0,0,0,0.2) 100%)",
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-black/16 to-transparent" />
          <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
            {center}
          </div>
          {bottomStrip ? (
            <div className="relative z-20 shrink-0 px-0 pb-3 pt-2">
              {bottomStrip}
            </div>
          ) : null}
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
                "flex shrink-0 flex-col border-l border-white/10 bg-background shadow-[inset_1px_0_0_rgba(255,255,255,0.03)] transition-[width] duration-300 ease-out animate-in fade-in-0 slide-in-from-right-2",
                rightRailWidthClass
              )}
            >
              {hideRightRailHeader ? null : (
                <RailHeader
                  label={rightRailLabel}
                  side="right"
                  onCollapse={() => setRightCollapsed(true)}
                />
              )}
              <div className="min-h-0 flex-1 overflow-y-auto">{rightRail}</div>
            </aside>
          )
        ) : null}
      </div>

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
    <div className="flex h-12 items-center justify-between border-b border-white/10 bg-white/2.5 px-4">
      <p className="text-xs font-medium tracking-[0.18em] text-white/34">
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
      className="flex w-11 shrink-0 flex-col items-center justify-center gap-2 border-white/10 bg-background text-white/44 transition-colors hover:bg-card hover:text-white"
      aria-label={`展开${label}`}
    >
      {side === "left" ? (
        <PanelLeftOpen className="h-4 w-4" />
      ) : (
        <PanelRightOpen className="h-4 w-4" />
      )}
      {/* writing-mode:vertical-rl 让文字流向自上而下；text-orientation:upright
          让中文保持正立，避免被默认旋转 90° 反过来读。原先用 rotate-180 强行
          翻面会导致从下往上读，是反的。 */}
      <span className="text-xs tracking-[0.14em] [writing-mode:vertical-rl] [text-orientation:upright]">
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
    <section className={cn("border-b border-white/10 px-5 py-3.5", className)}>
      <p className="text-xs text-white/38">
        {title}
      </p>
      <div className="mt-2.5">{children}</div>
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
      <div className="pointer-events-auto rounded-xl border border-white/8 bg-card/95 p-1.5 shadow-[0_30px_80px_-44px_rgba(0,0,0,0.72)]">
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
        "inline-flex items-center rounded-full border px-3 py-1 text-xs",
        active
          ? "border-white/16 bg-white/8 text-white"
          : "border-white/8 bg-white/3 text-white/52"
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
          ? "border-white/16 bg-white/9 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.05)]"
          : "border-white/8 bg-white/2.5 text-white/72 hover:bg-white/5",
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
        "rounded-[24px] border border-dashed border-white/10 bg-white/[0.018] px-4 py-6 text-sm leading-6 text-white/46",
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
          ? "border-white/16 bg-white/9 text-white"
          : "border-white/8 bg-white/2.5 text-white/64 hover:bg-white/5",
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

type EditorChromeButtonExtras = {
  tone?: "default" | "active";
  loading?: boolean;
  tooltipLabel?: string;
};

export function EditorChromeButton({
  className,
  variant = "outline",
  tone = "default",
  loading = false,
  tooltipLabel,
  disabled,
  children,
  title,
  ...props
}: ComponentProps<typeof Button> & EditorChromeButtonExtras) {
  const resolvedTitle = title ?? tooltipLabel;
  return (
    <Button
      variant={variant}
      title={resolvedTitle}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "rounded-full border-white/8 bg-white/2.5 text-white transition-all duration-150 hover:bg-white/8 hover:text-white active:scale-[0.985]",
        tone === "active" &&
          "border-white/20 bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] hover:bg-white/14",
        loading && "pointer-events-none opacity-80",
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function EditorChromeIconButton({
  className,
  ...props
}: ComponentProps<typeof Button> & EditorChromeButtonExtras) {
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
        "inline-flex h-10 items-center rounded-full border border-white/8 bg-white/2.5 text-white/72 transition-all duration-150 hover:bg-white/8 hover:text-white active:scale-[0.985]",
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
      className={cn("rounded-full bg-white/3 p-1", className)}
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
        "rounded-full px-4 text-white/54 transition-colors data-[state=active]:bg-white/8 data-[state=active]:text-white",
        className
      )}
      {...props}
    />
  );
}
