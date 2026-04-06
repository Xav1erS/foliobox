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
          {title ? <h2 className="text-[15px] font-semibold text-neutral-900">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm leading-5 text-neutral-500">{description}</p> : null}
        </div>
      )}
      <div className={cn("p-6", contentClassName)}>{children}</div>
    </section>
  );
}
