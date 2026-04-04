import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type RectActionLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline";
  size?: "md" | "lg";
  className?: string;
};

export function RectActionLink({
  href,
  children,
  variant = "outline",
  size = "md",
  className,
}: RectActionLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center border px-5 text-sm transition-colors",
        size === "lg" ? "h-12 px-6" : "h-11",
        variant === "solid"
          ? "border-white bg-white font-semibold text-black hover:bg-white/90"
          : "border-white/15 text-white/65 hover:border-white/28 hover:text-white",
        className,
      )}
    >
      {children}
    </Link>
  );
}
