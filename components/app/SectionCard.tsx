import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("border border-neutral-300 bg-white/88 backdrop-blur-sm", className)}>
      {(title || description) && (
        <div className="border-b border-neutral-300 px-6 py-5">
          {title ? <h2 className="text-sm font-semibold text-neutral-800">{title}</h2> : null}
          {description ? <p className="mt-1 text-xs leading-5 text-neutral-600">{description}</p> : null}
        </div>
      )}
      <div className={cn("p-6", contentClassName)}>{children}</div>
    </section>
  );
}
