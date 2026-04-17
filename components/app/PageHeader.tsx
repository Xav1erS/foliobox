import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className="app-page-eyebrow text-[11px] font-medium tracking-[0.2em]">{eyebrow}</p>
        ) : null}
        <h1 className="app-page-title text-3xl font-semibold tracking-[-0.045em] sm:text-[2.2rem]">
          {title}
        </h1>
        {description ? (
          <p className="app-page-description max-w-3xl text-sm leading-7 sm:text-[15px]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
