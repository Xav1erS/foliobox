import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function StepHeader({
  backHref,
  backLabel = "返回",
  step,
  title,
  description,
  status,
}: {
  backHref?: string;
  backLabel?: string;
  step?: string;
  title: string;
  description?: string;
  status?: string;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-xs text-white/45 transition-colors hover:text-white/75"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        ) : (
          <span />
        )}
        {status ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60">
            {status}
          </span>
        ) : null}
      </div>
      <div className="space-y-1.5">
        {step ? <p className="text-xs uppercase tracking-[0.18em] text-white/35">{step}</p> : null}
        <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
        {description ? <p className="max-w-2xl text-sm leading-6 text-white/55">{description}</p> : null}
      </div>
    </div>
  );
}
