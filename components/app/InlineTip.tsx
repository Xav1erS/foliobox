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
    <div className={cn("flex items-start gap-2.5 border border-neutral-300 bg-neutral-100/85 p-3.5", className)}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
      <div className="text-xs leading-5 text-neutral-500">{children}</div>
    </div>
  );
}
