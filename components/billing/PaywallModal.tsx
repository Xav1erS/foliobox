"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLAN_DEFINITIONS } from "@/lib/entitlement";

type SceneType =
  | "score_detail"
  | "full_rewrite"
  | "multi_variant"
  | "pdf_export"
  | "publish_link"
  | "sprint_upgrade";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  scene: SceneType;
  onSuccess?: () => void;
  allowDismiss?: boolean;
  // Return context (7.15C): stored in Order so result page can restore original flow
  projectId?: string;
  draftId?: string;
}

const SCENE_CONFIG: Record<
  SceneType,
  { title: string; description: string; recommendedPlan: "pro" | "sprint" }
> = {
  score_detail: {
    title: "解锁完整评分结果",
    description: "你已查看简版结果。解锁后可查看完整评分维度、问题摘要与优化建议。",
    recommendedPlan: "pro",
  },
  full_rewrite: {
    title: "解锁完整作品集整理能力",
    description: "继续解锁完整重制流程，生成、修改并整理出更完整的作品集初稿。",
    recommendedPlan: "pro",
  },
  multi_variant: {
    title: "解锁多版本生成",
    description: "继续解锁更多版本生成能力，方便你比较不同表达方式与作品集方向。",
    recommendedPlan: "pro",
  },
  pdf_export: {
    title: "解锁 PDF 导出",
    description: "继续解锁 PDF 导出，将当前作品集整理结果用于正式投递或分享。",
    recommendedPlan: "pro",
  },
  publish_link: {
    title: "解锁在线链接发布",
    description: "继续解锁在线链接发布，让作品集更方便预览、分享与后续修改。",
    recommendedPlan: "pro",
  },
  sprint_upgrade: {
    title: "解锁求职冲刺版",
    description: "如果你正在密集投递，冲刺版更适合在短时间内集中优化作品集质量与表达重点。",
    recommendedPlan: "sprint",
  },
};

const PAID_PLANS = PLAN_DEFINITIONS.filter((p) => p.planType !== "free");

export function PaywallModal({
  open,
  onClose,
  scene,
  onSuccess,
  allowDismiss = false,
  projectId,
  draftId,
}: PaywallModalProps) {
  const router = useRouter();
  const config = SCENE_CONFIG[scene];
  const [selectedPlan, setSelectedPlan] = useState<"pro" | "sprint">(
    config.recommendedPlan
  );
  const [provider, setProvider] = useState<"wechat_pay" | "alipay">("wechat_pay");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUnlock() {
    setLoading(true);
    setError("");

    try {
      // Step 1: create order record (include return context per 7.15C)
      const createRes = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planType: selectedPlan.toUpperCase(),
          provider,
          sourceScene: scene,
          projectId,
          draftId,
        }),
      });
      if (!createRes.ok) {
        const d = await createRes.json().catch(() => ({}));
        setError(d.error ?? "创建订单失败，请重试");
        setLoading(false);
        return;
      }
      const { orderId } = await createRes.json();

      // Step 2: initiate payment with provider
      const payRes = await fetch(`/api/orders/${orderId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (!payRes.ok) {
        const d = await payRes.json().catch(() => ({}));
        setError(d.error ?? "发起支付失败，请重试");
        setLoading(false);
        return;
      }

      // Step 3: poll for payment status (stub: always pending in dev until real SDK)
      let attempts = 0;
      const maxAttempts = 10;
      const poll = async () => {
        if (attempts >= maxAttempts) {
          setError("支付超时，请稍后重试");
          setLoading(false);
          return;
        }
        attempts++;
        const refreshRes = await fetch(`/api/orders/${orderId}/refresh`, { method: "POST" });
        const { status } = await refreshRes.json();
        if (status === "PAID") {
          setLoading(false);
          onSuccess?.();
          onClose();
          router.refresh();
        } else if (status === "FAILED" || status === "CANCELLED") {
          setError("支付未完成，请重试");
          setLoading(false);
        } else {
          setTimeout(poll, 2000);
        }
      };
      setTimeout(poll, 1500);
    } catch {
      setError("网络错误，请重试");
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl">
        {allowDismiss && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="p-6">
          <h2 className="text-lg font-semibold text-neutral-900">{config.title}</h2>
          <p className="mt-1.5 text-sm text-neutral-500">{config.description}</p>

          {/* Plan selection */}
          <div className="mt-5 space-y-3">
            {PAID_PLANS.map((plan) => {
              const isRec = plan.planType === config.recommendedPlan;
              const isSelected = selectedPlan === plan.planType;
              return (
                <button
                  key={plan.planType}
                  onClick={() => setSelectedPlan(plan.planType as "pro" | "sprint")}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-neutral-200 hover:border-neutral-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-neutral-900">
                          {plan.displayName}
                        </span>
                        {isRec && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                            推荐
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-end gap-1">
                        <span className="text-xl font-bold text-neutral-900">
                          ¥{plan.price}
                        </span>
                        <span className="mb-0.5 text-xs text-neutral-400">
                          {plan.priceUnit === "month" ? "/ 月" : "/ 次"}
                        </span>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {plan.featureList.slice(0, 4).map((f) => (
                          <li
                            key={f}
                            className="flex items-center gap-1.5 text-xs text-neutral-500"
                          >
                            <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div
                      className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                        isSelected ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Provider selection */}
          <div className="mt-4 flex gap-2">
            {(["wechat_pay", "alipay"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setProvider(p)}
                className={`flex-1 rounded-lg border py-2 text-xs transition-colors ${
                  provider === p
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
                }`}
              >
                {p === "wechat_pay" ? "微信支付" : "支付宝"}
              </button>
            ))}
          </div>

          {error && <p className="mt-3 text-xs text-red-500">{error}</p>}

          {/* Buttons */}
          <div className="mt-5 space-y-2">
            <Button
              onClick={handleUnlock}
              disabled={loading}
              className="h-11 w-full text-sm"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />处理中…</>
              ) : (
                "立即解锁"
              )}
            </Button>
            <button
              onClick={() => window.open("/pricing", "_blank")}
              className="w-full py-2 text-xs text-neutral-400 hover:text-neutral-600"
            >
              看看套餐区别
            </button>
            {allowDismiss && (
              <button
                onClick={onClose}
                className="w-full py-1 text-xs text-neutral-300 hover:text-neutral-500"
              >
                稍后再说
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] text-neutral-300">
            支持微信支付 / 支付宝
          </p>
        </div>
      </div>
    </div>
  );
}
