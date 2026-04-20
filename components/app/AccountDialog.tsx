"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AccountDialogQuota = {
  key: string;
  label: string;
  value: string;
  used: number;
  remaining: number;
  limit: number;
};

export type AccountDialogData = {
  currentPlan: "FREE" | "PRO" | "SPRINT";
  summaryTitle: string;
  summaryDescription: string;
  expiresAtLabel: string | null;
  featureList: string[];
  quotaStatus: {
    label: string;
    description: string;
    tone: "emerald" | "amber";
  };
  quotas: AccountDialogQuota[];
};

type AccountDialogProps = {
  children: ReactNode;
  userEmail?: string | null;
  data: AccountDialogData;
};

export function AccountDialog({ children, userEmail, data }: AccountDialogProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldOpenFromQuery = searchParams.get("panel") === "account";
  const [open, setOpen] = useState(shouldOpenFromQuery);

  useEffect(() => {
    setOpen(shouldOpenFromQuery);
  }, [shouldOpenFromQuery]);

  function buildHrefWithoutPanel() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("panel");
    const nextQuery = params.toString();
    return nextQuery ? `${pathname}?${nextQuery}` : pathname;
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && shouldOpenFromQuery) {
      router.replace(buildHrefWithoutPanel(), { scroll: false });
    }
  }

  const quotaToneClass =
    data.quotaStatus.tone === "emerald"
      ? "border-emerald-400/24 bg-emerald-400/10 text-emerald-200"
      : "border-amber-400/24 bg-amber-400/10 text-amber-200";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="border-white/10 bg-[#17181b] p-0 text-white shadow-2xl sm:max-w-[680px]">
        <div className="max-h-[82vh] overflow-y-auto px-6 py-6">
          <DialogHeader className="space-y-3 pr-8 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="border border-white/10 bg-white/6 px-2 py-0.5 text-xs font-medium text-white/72 hover:bg-white/6">
                当前账号
              </Badge>
              <Badge className="border border-white/10 bg-white/10 px-2 py-0.5 text-xs font-medium text-white hover:bg-white/10">
                {data.summaryTitle}
              </Badge>
            </div>
            <DialogTitle className="text-[24px] font-semibold tracking-[-0.03em] text-white">
              账号与套餐
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-white/58">
              这里统一查看当前账号、套餐能力和剩余额度，不再和设计师档案编辑混排。
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/38">
                    Account
                  </p>
                  <p className="text-base font-semibold text-white">
                    {userEmail ?? "已登录工作台"}
                  </p>
                  <p className="max-w-[420px] text-sm leading-6 text-white/60">
                    {data.summaryDescription}
                  </p>
                </div>
                <div className={`rounded-full border px-3 py-1 text-xs font-medium ${quotaToneClass}`}>
                  {data.quotaStatus.label}
                </div>
              </div>
              {data.expiresAtLabel ? (
                <p className="mt-3 text-xs text-white/42">有效期至 {data.expiresAtLabel}</p>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/38">
                    Unlocked
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">已解锁能力</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2.5">
                {data.featureList.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-white/82">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/38">
                    Quotas
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">当前额度</p>
                </div>
                <p className="max-w-[320px] text-right text-xs leading-5 text-white/44">
                  {data.quotaStatus.description}
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {data.quotas.map((quota) => (
                  <div key={quota.key} className="rounded-[20px] border border-white/8 bg-white/[0.04] px-4 py-4">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/34">
                      {quota.label}
                    </p>
                    <p className="mt-3 text-lg font-semibold text-white">{quota.value}</p>
                    <p className="mt-1 text-xs text-white/42">
                      总额度 {quota.limit} · 已用 {quota.used} · 剩余 {quota.remaining}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-1">
              <Button asChild variant="ghost" className="h-10 px-0 text-white/72 hover:bg-transparent hover:text-white">
                <Link href="/profile">
                  打开设计师档案
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {data.currentPlan === "FREE" ? (
                <Button asChild className="h-10 rounded-full bg-white px-4 text-[#101114] hover:bg-white/92">
                  <Link href="/pricing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    查看升级方案
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
