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
        "sticky bottom-0 border-t border-neutral-300 bg-neutral-100/95 px-6 py-4 backdrop-blur",
        className
      )}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">{children}</div>
    </div>
  );
}
