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
        "flex flex-col items-center justify-center border border-dashed border-neutral-300 bg-white/88 px-6 py-14 text-center backdrop-blur-sm",
        className
      )}
    >
      {icon ? (
        <div className="mb-4 flex h-12 w-12 items-center justify-center border border-neutral-300 bg-neutral-100">
          {icon}
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
