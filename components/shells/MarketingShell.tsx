import { cn } from "@/lib/utils";

export function MarketingShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("marketing-shell min-h-screen bg-black text-white antialiased", className)}>
      {children}
    </div>
  );
}
