import { cn } from "@/lib/utils";

export function StickyActionBar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "app-sticky-bar sticky bottom-0 px-6 py-4 shadow-[0_-18px_40px_-30px_rgba(0,0,0,0.8)]",
        className
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">{children}</div>
    </div>
  );
}
