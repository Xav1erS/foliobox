import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function InlineTip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("app-inline-tip flex items-start gap-2.5 p-3.5", className)}>
      <Info className="app-text-muted mt-0.5 h-4 w-4 shrink-0" />
      <div className="app-text-muted text-xs leading-5">{children}</div>
    </div>
  );
}
