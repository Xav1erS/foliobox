"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { PLAN_DEFINITIONS } from "@/lib/entitlement";
import { PaywallModal } from "@/components/billing/PaywallModal";
import {
  getPricingPrimaryAction,
  getPricingSecondaryAction,
} from "@/lib/marketing-cta";

const COMPARISON_ROWS = [
  { label: "免费评分入口", free: true, pro: true, sprint: true },
  { label: "简版评分结果", free: true, pro: true, sprint: true },
  { label: "完整评分结果", free: false, pro: true, sprint: true },
  { label: "完整重制流程", free: false, pro: true, sprint: true },
  { label: "多版本生成", free: false, pro: true, sprint: true },
  { label: "PDF 导出", free: false, pro: true, sprint: true },
  { label: "在线链接发布", free: false, pro: true, sprint: true },
  { label: "更高配额", free: false, pro: false, sprint: true },
  { label: "岗位定向优化", free: false, pro: false, sprint: true },
];

export function PricingClient({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "sprint">("pro");
  const primaryAction = getPricingPrimaryAction(isLoggedIn);
  const secondaryAction = getPricingSecondaryAction(isLoggedIn);

  function handleBuy(planType: "pro" | "sprint") {
    setSelectedPlan(planType);
    setPaywallOpen(true);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pb-20 pt-28">
      <div className="mb-14 text-center">
        <h1 className="text-4xl font-bold text-white">
          选择适合你的方式，继续完成作品集整理
        </h1>
        <p className="mt-4 text-lg text-white/60">
          根据你的当前阶段，选择先体验、继续整理，或直接解锁完整能力。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={primaryAction.href}
            className="flex h-11 min-w-[200px] items-center justify-center rounded-xl bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            {primaryAction.label}
          </Link>
          <Link
            href={secondaryAction.href}
            className="flex h-11 min-w-[200px] items-center justify-center rounded-xl border border-white/15 px-6 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            {secondaryAction.label}
          </Link>
        </div>
        <p className="mt-3 text-sm text-white/35">
          {!isLoggedIn
            ? "未登录时也可以先免费评分；购买前再登录即可继续。"
            : "你已经登录，可以直接回到工作台或继续整理当前作品集。"}
        </p>
      </div>

      <div className="mb-14 grid gap-5 sm:grid-cols-3">
        {PLAN_DEFINITIONS.map((plan) => (
          <div
            key={plan.planType}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              plan.isRecommended
                ? "border-white/30 bg-white/[0.08]"
                : "border-white/10 bg-white/[0.04]"
            }`}
          >
            {plan.highlightTag && (
              <div className="mb-4 inline-flex self-start rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
                {plan.highlightTag}
              </div>
            )}
            <h2 className="text-lg font-semibold text-white">{plan.displayName}</h2>
            <div className="mt-2 flex items-end gap-1">
              {plan.price === 0 ? (
                <span className="text-3xl font-bold text-white">免费</span>
              ) : (
                <>
                  <span className="text-3xl font-bold text-white">¥{plan.price}</span>
                  <span className="mb-1 text-sm text-white/40">
                    {plan.priceUnit === "month" ? "/ 月" : "/ 次"}
                  </span>
                </>
              )}
            </div>
            <p className="mt-3 text-sm text-white/50">{plan.description}</p>
            {plan.targetUserText && (
              <p className="mt-1 text-xs text-white/35">{plan.targetUserText}</p>
            )}

            <ul className="mt-5 flex-1 space-y-2">
              {plan.featureList.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {plan.planType === "free" ? (
                <Link
                  href="/score"
                  className="flex h-10 w-full items-center justify-center rounded-xl border border-white/15 text-sm text-white/60 transition-colors hover:border-white/30 hover:text-white"
                >
                  {isLoggedIn ? "继续免费评分" : "免费开始"}
                </Link>
              ) : !isLoggedIn ? (
                <Link
                  href="/login?next=/pricing"
                  className={`flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                    plan.isRecommended
                      ? "bg-white text-black hover:bg-white/90"
                      : "border border-white/15 text-white hover:border-white/30"
                  }`}
                >
                  登录后购买
                </Link>
              ) : (
                <button
                  onClick={() => handleBuy(plan.planType as "pro" | "sprint")}
                  className={`flex h-10 w-full items-center justify-center rounded-xl text-sm font-medium transition-colors ${
                    plan.isRecommended
                      ? "bg-white text-black hover:bg-white/90"
                      : "border border-white/15 text-white hover:border-white/30"
                  }`}
                >
                  立即购买
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-14 overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03]">
              <th className="px-5 py-4 text-left text-sm font-medium text-white/50">能力对比</th>
              {PLAN_DEFINITIONS.map((p) => (
                <th key={p.planType} className="px-5 py-4 text-center text-sm font-medium text-white/70">
                  {p.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr
                key={row.label}
                className={`border-b border-white/[0.06] ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}
              >
                <td className="px-5 py-3.5 text-sm text-white/60">{row.label}</td>
                {(["free", "pro", "sprint"] as const).map((p) => (
                  <td key={p} className="px-5 py-3.5 text-center">
                    {row[p] ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-400" />
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mb-10 text-center text-sm text-white/40">
        你可以先体验评分，也可以直接开始整理作品集；当你需要完整生成、编辑、导出和更多配额时，再解锁付费能力。
      </p>

      <div className="mb-6 text-center text-sm text-white/30">支持微信支付 / 支付宝</div>

      <p className="text-center text-xs text-white/20">
        套餐一经购买即开通对应权益。如支付异常可联系客服。首发阶段暂不支持复杂订阅变更与自动退款流程。
      </p>

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        scene={selectedPlan === "sprint" ? "sprint_upgrade" : "full_rewrite"}
        allowDismiss
      />
    </main>
  );
}
