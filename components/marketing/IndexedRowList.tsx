import { cn } from "@/lib/utils";

type IndexedRowListItem = {
  id: string;
  title: string;
  description?: string;
  rightLabel?: string;
};

type IndexedRowListProps = {
  items: IndexedRowListItem[];
  className?: string;
  itemClassName?: string;
};

export function IndexedRowList({
  items,
  className,
  itemClassName,
}: IndexedRowListProps) {
  return (
    <div className={cn("border-t border-white/10", className)}>
      {items.map((item, index) => (
        <div
          key={`${item.id}-${item.title}`}
          className={cn(
            "flex gap-5 py-5",
            index < items.length - 1 ? "border-b border-white/[0.07]" : "",
            itemClassName,
          )}
        >
          <span className="mt-0.5 shrink-0 font-mono text-xs tracking-[0.2em] text-white/25">
            {item.id}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm leading-[1.85] text-white/70 sm:text-base">
                {item.title}
              </p>
              {item.rightLabel ? (
                <span className="marketing-pill shrink-0 border border-white/10 px-2.5 py-0.5 text-xs uppercase tracking-[0.15em] text-white/30">
                  {item.rightLabel}
                </span>
              ) : null}
            </div>
            {item.description ? (
              <p className="mt-2 text-sm leading-[1.85] text-white/52 sm:text-base">
                {item.description}
              </p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
