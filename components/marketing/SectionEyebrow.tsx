import { cn } from "@/lib/utils";

type SectionEyebrowProps = {
  label: string;
  secondaryLabel?: string;
  className?: string;
};

export function SectionEyebrow({
  label,
  secondaryLabel,
  className,
}: SectionEyebrowProps) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/30">
        {label}
      </p>
      {secondaryLabel ? (
        <>
          <span className="h-px w-8 bg-white/15" />
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-white/20">
            {secondaryLabel}
          </p>
        </>
      ) : null}
    </div>
  );
}
