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
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="app-page-eyebrow text-xs font-mono uppercase tracking-[0.2em]">{eyebrow}</p>
        ) : null}
        <h1 className="app-page-title text-2xl font-semibold tracking-tight sm:text-[2rem]">{title}</h1>
        {description ? (
          <p className="app-page-description max-w-2xl text-sm leading-6">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
