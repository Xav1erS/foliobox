"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { PaywallModal } from "@/components/billing/PaywallModal";

export function ScoreResultPrimaryAction({
  canViewFull,
  href,
  label,
  loginHref,
}: {
  canViewFull: boolean;
  href: string;
  label: string;
  loginHref?: string;
}) {
  const [open, setOpen] = useState(false);

  if (canViewFull) {
    return (
      <Link
        href={href}
        className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  if (loginHref) {
    return (
      <Link
        href={loginHref}
        className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
      >
        {label}
        <ArrowRight className="h-4 w-4" />
      </button>
      <PaywallModal open={open} onClose={() => setOpen(false)} scene="score_detail" allowDismiss />
    </>
  );
}
