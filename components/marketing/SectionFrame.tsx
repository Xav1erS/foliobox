import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionFrame({
  children,
  className,
  contentClassName,
  gridClassName,
  noCorners = false,
  noGrid = false,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  gridClassName?: string;
  noCorners?: boolean;
  noGrid?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!noGrid && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-[0.08]",
            gridClassName
          )}
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            maskImage:
              "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
          }}
        />
      )}
      {!noCorners && (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-6 w-px bg-white/[0.08] sm:left-8" />
          <div className="pointer-events-none absolute inset-y-0 right-6 w-px bg-white/[0.06] sm:right-8" />
          <div className="pointer-events-none absolute left-6 right-6 top-6 h-px bg-white/[0.08] sm:left-8 sm:right-8 sm:top-8" />
          <div className="pointer-events-none absolute left-6 right-6 bottom-6 h-px bg-white/[0.06] sm:left-8 sm:right-8 sm:bottom-8" />
          {[
            "left-6 top-6 sm:left-8 sm:top-8",
            "right-6 top-6 sm:right-8 sm:top-8",
            "left-6 bottom-6 sm:left-8 sm:bottom-8",
            "right-6 bottom-6 sm:right-8 sm:bottom-8",
          ].map((position) => (
            <span
              key={position}
              className={cn(
                "pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 border border-white/18 bg-black",
                position
              )}
            />
          ))}
        </>
      )}
      <div className={cn("relative", contentClassName)}>{children}</div>
    </div>
  );
}
