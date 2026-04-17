import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative block h-10 w-10 overflow-hidden rounded-[12px] border border-white/10 bg-white/[0.04] shadow-[0_10px_24px_rgba(0,0,0,0.22)]",
        className
      )}
    >
      <Image
        src="/brand/xiaohe-logo.svg"
        alt="集盒 FolioBox 标志"
        fill
        priority={priority}
        sizes="40px"
        className="object-cover"
      />
    </span>
  );
}

export function BrandLockup({
  subtitle,
  className,
  titleClassName,
  subtitleClassName,
  markClassName,
}: {
  subtitle?: string;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  markClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark className={markClassName} />
      <span className="min-w-0">
        <span
          className={cn(
            "block whitespace-nowrap text-[17px] font-semibold tracking-[-0.04em] text-white",
            titleClassName
          )}
        >
          集盒FolioBox
        </span>
        {subtitle ? (
          <span className={cn("mt-0.5 block text-xs text-white/50", subtitleClassName)}>
            {subtitle}
          </span>
        ) : null}
      </span>
    </span>
  );
}
