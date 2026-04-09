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
        "border border-neutral-300 bg-white shadow-[0_26px_70px_-58px_rgba(15,23,42,0.42)]",
        className
      )}
    >
      {(title || description) && (
        <div className="border-b border-neutral-300 bg-[linear-gradient(180deg,_rgba(250,250,249,0.96),_rgba(245,245,244,0.82))] px-6 py-5">
          {title ? <h2 className="text-[15px] font-semibold text-neutral-900">{title}</h2> : null}
          {description ? <p className="mt-1 text-sm leading-5 text-neutral-500">{description}</p> : null}
        </div>
      )}
      <div className={cn("p-6", contentClassName)}>{children}</div>
    </section>
  );
}
