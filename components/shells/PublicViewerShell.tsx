import { cn } from "@/lib/utils";

export function PublicViewerShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-neutral-950 text-white", className)}>
      {children}
    </div>
  );
}
