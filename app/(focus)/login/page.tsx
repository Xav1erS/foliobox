"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StepHeader } from "@/components/app/StepHeader";

function describeNextPath(next: string) {
  if (next.startsWith("/score/")) {
    return {
      title: "登录后查看完整评分结果",
      description: "继续回到这份评分结果，查看完整维度分析与改进建议。",
      backHref: "/score",
      backLabel: "返回评分入口",
      status: "继续当前任务",
    };
  }
  if (next.startsWith("/projects/")) {
    return {
      title: "登录后继续整理作品集",
      description: "登录后回到你的项目流程，继续补充信息、生成第一版或导出发布。",
      backHref: "/",
      backLabel: "返回首页",
      status: "继续当前任务",
    };
  }
  if (next.startsWith("/payment/result")) {
    return {
      title: "登录后查看支付结果",
      description: "继续返回支付结果页，确认权益是否已经开通并回到原来的操作上下文。",
      backHref: "/pricing",
      backLabel: "返回套餐页",
      status: "继续当前任务",
    };
  }
  return {
    title: "登录 / 注册",
    description: "输入邮箱，我们会发送无密码登录链接，登录后继续使用 FolioBox。",
    backHref: "/",
    backLabel: "返回首页",
    status: "邮箱登录",
  };
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
  const context = useMemo(() => describeNextPath(next), [next]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError("");

    try {
      const result = await signIn("nodemailer", {
        email: email.trim(),
        callbackUrl: next,
        redirect: false,
      });

      if (result?.error) {
        setError("发送失败，请稍后重试");
      } else {
        window.location.href = "/login/verify";
      }
    } catch {
      setError("发送失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <StepHeader
        backHref={context.backHref}
        backLabel={context.backLabel}
        step="Focus"
        title={context.title}
        description={context.description}
        status={context.status}
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-white/55">
                邮箱地址
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/25 focus-visible:ring-white/20"
              />
            </div>

            {error ? <p className="text-xs text-red-400">{error}</p> : null}

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="h-12 w-full rounded-xl bg-white text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
            >
              {loading ? "发送中..." : "发送登录链接"}
            </Button>
          </form>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-white/35">继续完成</p>
          <h2 className="mt-3 text-xl font-semibold text-white">登录后不会打断当前流程</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-white/55">
            <li>继续回到你刚才的评分结果、支付结果或项目步骤。</li>
            <li>后续可在工作台继续整理作品集、生成第一版并导出发布。</li>
            <li>登录即表示同意服务条款与隐私政策。</li>
          </ul>
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-5 text-white/45">
            当前登录方式为 Magic Link。邮件链接 15 分钟内有效。
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-6 py-12">
          <div className="h-8 w-56 rounded bg-white/10" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
