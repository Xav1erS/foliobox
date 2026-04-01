"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-white/60 text-xs">
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
          className="h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-white/20 focus-visible:ring-white/20"
        />
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading || !email.trim()}
        className="h-12 w-full rounded-xl bg-white text-sm font-semibold text-black hover:bg-white/90 disabled:opacity-50"
      >
        {loading ? "发送中..." : "发送登录链接"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm space-y-8 px-4">
      {/* Brand */}
      <div className="text-center">
        <Link href="/" className="text-sm font-semibold text-white/60 hover:text-white">
          集盒 FolioBox
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-white">登录 / 注册</h1>
        <p className="mt-2 text-sm text-white/40">
          输入邮箱，我们发送无密码登录链接
        </p>
      </div>

      <Suspense fallback={
        <div className="space-y-4">
          <div className="h-12 rounded-xl bg-white/5" />
          <div className="h-12 rounded-xl bg-white/10" />
        </div>
      }>
        <LoginForm />
      </Suspense>

      <p className="text-center text-xs text-white/20">
        登录即表示同意服务条款与隐私政策
      </p>
    </div>
  );
}
