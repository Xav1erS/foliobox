import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/brand/BrandLogo";

export function FocusShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-neutral-950 text-white", className)}>
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <BrandLockup
              titleClassName="text-sm tracking-tight"
              markClassName="h-8 w-8 rounded-[10px]"
            />
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
