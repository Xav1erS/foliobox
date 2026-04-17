import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "app-empty-state flex flex-col items-center justify-center px-6 py-16 text-center",
        className
      )}
    >
      {icon ? (
        <div className="app-empty-state-icon mb-5 flex h-14 w-14 items-center justify-center">
          {icon}
        </div>
      ) : null}
      <h3 className="app-text-primary text-lg font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="app-text-muted mt-2 max-w-md text-sm leading-7">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
