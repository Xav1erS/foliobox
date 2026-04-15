import { cn } from "@/lib/utils";

type IndexedFeatureGridItem = {
  id: string;
  title: string;
  description: string;
  status: string;
};

type IndexedFeatureGridProps = {
  items: IndexedFeatureGridItem[];
  className?: string;
};

export function IndexedFeatureGrid({
  items,
  className,
}: IndexedFeatureGridProps) {
  return (
    <div className={cn("grid border border-white/10 sm:grid-cols-2", className)}>
      {items.map((item, index) => (
        <article
          key={`${item.id}-${item.title}`}
          className={cn(
            "px-5 py-6 sm:px-6 sm:py-7",
            index >= 2 ? "border-t border-white/[0.07]" : "",
            index % 2 === 1 ? "sm:border-l sm:border-white/[0.07]" : "",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="border border-white/10 px-2.5 py-0.5 text-xs uppercase tracking-[0.15em] text-white/30">
              {item.status}
            </span>
            <span className="font-mono text-xs tracking-[0.25em] text-white/20">
              {item.id}
            </span>
          </div>
          <h3 className="mt-4 text-[1.05rem] font-semibold leading-[1.35] tracking-[-0.02em] text-white sm:text-xl">
            {item.title}
          </h3>
          <p className="mt-3 text-sm leading-[1.85] text-white/60 sm:text-base">
            {item.description}
          </p>
        </article>
      ))}
    </div>
  );
}
