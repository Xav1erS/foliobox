"use client";

import { useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import {
  formatQuotaLimitLabel,
  PLAN_DEFINITIONS,
  PLAN_QUOTAS,
  QUOTA_DISPLAY_ORDER,
} from "@/lib/entitlement";
import { PaywallModal } from "@/components/billing/PaywallModal";
import { SectionEyebrow } from "@/components/marketing/SectionEyebrow";
import {
  getPricingPrimaryAction,
  getPricingSecondaryAction,
} from "@/lib/marketing-cta";

const FEATURE_COMPARISON_ROWS = [
  { label: "免费评分入口", free: true, pro: true, sprint: true },
  { label: "简版评分结果", free: true, pro: true, sprint: true },
  { label: "完整评分结果", free: false, pro: true, sprint: true },
  { label: "完整整理流程", free: false, pro: true, sprint: true },
  { label: "多版本生成", free: false, pro: true, sprint: true },
  { label: "PDF 导出", free: false, pro: true, sprint: true },
  { label: "在线链接发布", free: false, pro: true, sprint: true },
  { label: "更高配额", free: false, pro: false, sprint: true },
  { label: "岗位定向优化", free: false, pro: false, sprint: true },
];

const PLAN_TYPE_MAP = {
  free: "FREE",
  pro: "PRO",
  sprint: "SPRINT",
} as const;

const QUOTA_COMPARISON_ROWS = QUOTA_DISPLAY_ORDER.map((key) => ({
  label: PLAN_QUOTAS.FREE[key].label,
  free: formatQuotaLimitLabel(key, PLAN_QUOTAS.FREE[key].limit),
  pro: formatQuotaLimitLabel(key, PLAN_QUOTAS.PRO[key].limit),
  sprint: formatQuotaLimitLabel(key, PLAN_QUOTAS.SPRINT[key].limit),
}));

const STAGE_GUIDES = [
  {
    title: "我还不确定这份作品集现在能不能投",
    body: "先免费评分。先看清问题，再决定要不要继续整理，不需要一上来就买。",
    cta: "先给我的作品集打分",
    href: "/score",
  },
  {
    title: "我已经准备开始认真整理第一版",
    body: "如果你已经想把项目、结构和导出都走完整，Pro 会是最稳的主线。",
    cta: "优先看 Pro 版",
    href: "#plans",
  },
  {
    title: "我正处在投递窗口，想集中冲刺",
    body: "如果你已经开始密集投递，希望在短时间内多做几轮优化，再看求职冲刺版。",
    cta: "了解冲刺版",
    href: "#plans",
  },
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
        <SectionEyebrow label="继续往前走" className="mb-3 justify-center" />
        <h1 className="text-4xl font-bold tracking-tight text-white">
          <span className="block">先判断你现在</span>
          <span className="block">最需要哪一步</span>
        </h1>
        <p className="mt-4 text-lg text-white/60">
          这页不是要你立刻做购买决定，而是先帮你判断：
          现在应该先评分、继续整理，还是进入投递前冲刺。
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={primaryAction.href}
            className="flex h-11 min-w-[200px] items-center justify-center bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-white/90"
          >
            {primaryAction.label}
          </Link>
          <Link
            href={secondaryAction.href}
            className="flex h-11 min-w-[200px] items-center justify-center border border-white/15 px-6 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            {secondaryAction.label}
          </Link>
        </div>
        <p className="mt-3 text-sm text-white/35">
          {!isLoggedIn
            ? "未登录时也可以先免费评分；等你确定要继续整理时，再登录购买也来得及。"
            : "你已经登录，可以直接回到工作台，也可以先判断现在更适合哪条路。"}
        </p>
      </div>

      <div className="mb-14 grid gap-4 lg:grid-cols-3">
        {STAGE_GUIDES.map((item) => (
          <div
            key={item.title}
            className="border border-white/10 bg-white/3 p-6"
          >
            <h2 className="text-lg font-semibold text-white">{item.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-white/55">{item.body}</p>
            <Link
              href={item.href}
              className="mt-5 inline-flex h-10 items-center justify-center border border-white/14 px-4 text-sm font-medium text-white/80 transition-colors hover:border-white/28 hover:text-white"
            >
              {item.cta}
            </Link>
          </div>
        ))}
      </div>

      <div id="plans" className="mb-6">
        <SectionEyebrow label="能力与阶段" className="mb-3" />
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          <span className="block md:hidden">如果你已经决定继续整理，</span>
          <span className="block md:hidden">再看具体适合哪一档</span>
          <span className="hidden md:block">如果你已经决定继续整理，</span>
          <span className="hidden md:block">再看具体适合哪一档</span>
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/55">
          免费版适合先看清问题；Pro 版适合把第一版真正做出来；求职冲刺版适合在投递窗口里做更密集的优化。差异不只在“能不能用”，也在每种高成本动作能做多少次。
        </p>
      </div>

      <div className="mb-14 grid gap-5 sm:grid-cols-3">
        {PLAN_DEFINITIONS.map((plan) => (
          <div
            key={plan.planType}
            className={`relative flex flex-col border p-6 ${
              plan.isRecommended
                ? "border-white/30 bg-white/8"
                : "border-white/10 bg-white/4"
            }`}
          >
            {plan.highlightTag && (
              <div className="mb-4 inline-flex self-start bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-400">
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

            <div className="mt-5 grid grid-cols-2 gap-2">
              {QUOTA_DISPLAY_ORDER.map((key) => {
                const quota = PLAN_QUOTAS[PLAN_TYPE_MAP[plan.planType]][key];
                return (
                  <div
                    key={`${plan.planType}-${key}`}
                    className="border border-white/10 bg-black/10 px-3 py-2"
                  >
                    <p className="text-[10px] font-mono uppercase tracking-[0.16em] text-white/35">
                      {quota.label}
                    </p>
                    <p className="mt-1 text-sm font-medium text-white/82">
                      {formatQuotaLimitLabel(key, quota.limit)}
                    </p>
                  </div>
                );
              })}
            </div>

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
                  className="flex h-10 w-full items-center justify-center border border-white/15 text-sm text-white/60 transition-colors hover:border-white/30 hover:text-white"
                >
                  {isLoggedIn ? "继续回到评分结果" : "先给我的作品集打分"}
                </Link>
              ) : !isLoggedIn ? (
                <Link
                  href="/login?next=/pricing"
                  className={`flex h-10 w-full items-center justify-center text-sm font-medium transition-colors ${
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
                  className={`flex h-10 w-full items-center justify-center text-sm font-medium transition-colors ${
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

      <div className="mb-8 border border-white/10 bg-white/3 px-6 py-5">
        <p className="text-sm leading-relaxed text-white/55">
          如果你现在还在犹豫，其实最稳的顺序通常是：
          <span className="text-white/78"> 先评分 </span>
          <span className="text-white/35">→</span>
          <span className="text-white/78"> 再决定要不要继续整理 </span>
          <span className="text-white/35">→</span>
          <span className="text-white/78"> 需要更完整能力时再解锁付费</span>
          。
        </p>
      </div>

      <div className="mb-14 overflow-hidden border border-white/10">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/3">
              <th className="px-5 py-4 text-left text-sm font-medium text-white/50">
                能力与额度
              </th>
              {PLAN_DEFINITIONS.map((p) => (
                <th key={p.planType} className="px-5 py-4 text-center text-sm font-medium text-white/70">
                  {p.displayName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {QUOTA_COMPARISON_ROWS.map((row, i) => (
              <tr
                key={row.label}
                className={`border-b border-white/6 ${i % 2 === 0 ? "" : "bg-white/2"}`}
              >
                <td className="px-5 py-3.5 text-sm text-white/60">{row.label}</td>
                {(["free", "pro", "sprint"] as const).map((p) => (
                  <td key={p} className="px-5 py-3.5 text-center text-sm font-medium text-white/78">
                    {row[p]}
                  </td>
                ))}
              </tr>
            ))}

            {FEATURE_COMPARISON_ROWS.map((row, i) => (
              <tr
                key={row.label}
                className={`border-b border-white/6 ${i % 2 === 0 ? "bg-white/2" : ""}`}
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
        价格不是为了催你立刻下决定，而是为了让你在不同阶段，都知道什么时候该继续往前走。
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
