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
        "app-sticky-bar sticky bottom-0 px-6 py-4",
        className
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">{children}</div>
    </div>
  );
}
