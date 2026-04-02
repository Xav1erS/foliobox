import Link from "next/link";
import { cn } from "@/lib/utils";

export function FocusShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-neutral-950 text-white", className)}>
      <header className="border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center px-6">
          <Link href="/" className="text-sm font-semibold tracking-tight text-white">
            集盒 FolioBox
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
