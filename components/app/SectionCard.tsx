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
    <section
      className={cn(
        "app-panel",
        className
      )}
    >
      {(title || description) && (
        <div className="app-divider-soft app-panel-header border-b px-6 py-5">
          {title ? <h2 className="app-text-primary text-[15px] font-semibold">{title}</h2> : null}
          {description ? <p className="app-text-muted mt-1 text-sm leading-5">{description}</p> : null}
        </div>
      )}
      <div className={cn("p-6", contentClassName)}>{children}</div>
    </section>
  );
}
