"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { StepHeader } from "@/components/app/StepHeader";
import { AuthFocusAside } from "@/components/app/AuthFocusAside";

const EMAIL_PROVIDER_URLS: Record<string, string> = {
  "qq.com": "https://mail.qq.com",
  "foxmail.com": "https://mail.qq.com",
  "163.com": "https://mail.163.com",
  "126.com": "https://mail.126.com",
  "yeah.net": "https://mail.yeah.net",
  "sina.com": "https://mail.sina.com.cn",
  "sina.cn": "https://mail.sina.com.cn",
  "sohu.com": "https://mail.sohu.com",
  "gmail.com": "https://mail.google.com",
  "googlemail.com": "https://mail.google.com",
  "outlook.com": "https://outlook.live.com",
  "hotmail.com": "https://outlook.live.com",
  "live.com": "https://outlook.live.com",
  "icloud.com": "https://www.icloud.com/mail",
  "me.com": "https://www.icloud.com/mail",
  "mac.com": "https://www.icloud.com/mail",
};

function getEmailProviderUrl(email: string | null): string | null {
  if (!email) return null;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  return EMAIL_PROVIDER_URLS[domain] ?? null;
}

function maskEmail(email: string | null) {
  if (!email) return "你的邮箱";
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  if (name.length <= 2) return `${name[0] ?? "*"}*@${domain}`;
  return `${name.slice(0, 2)}***@${domain}`;
}

export function VerifyClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const next = searchParams.get("next") ?? "/dashboard";
  const [checkingSession, setCheckingSession] = useState(true);
  const maskedEmail = useMemo(() => maskEmail(email), [email]);
  const providerUrl = useMemo(() => getEmailProviderUrl(email), [email]);

  useEffect(() => {
    let mounted = true;
    getSession()
      .then((session) => {
        if (!mounted) return;
        if (session?.user?.id) {
          router.replace(next);
          return;
        }
        setCheckingSession(false);
      })
      .catch(() => {
        if (mounted) setCheckingSession(false);
      });

    return () => {
      mounted = false;
    };
  }, [next, router]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <StepHeader
        backHref={`/login?next=${encodeURIComponent(next)}`}
        backLabel="返回登录"
        step="Focus"
        title="检查你的邮箱"
        description={`我们已发送登录链接到 ${maskedEmail}，点击邮件中的链接即可回到刚才的流程继续操作。`}
        status="等待验证"
      />

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="min-h-[440px] rounded-2xl border border-white/10 bg-white/[0.03] p-8">
          {checkingSession ? (
            <div className="space-y-4">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-white/10" />
              <div className="h-4 w-4/5 rounded bg-white/10" />
              <div className="h-4 w-3/5 rounded bg-white/10" />
              <div className="h-11 w-36 rounded-xl bg-white/10" />
            </div>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
                ✉️
              </div>

              <p className="mt-6 text-sm leading-6 text-white/55">
                如果没有收到邮件，请检查垃圾邮件文件夹，或者返回登录页重新发送。邮件中的登录链接 15 分钟内有效。
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-xs leading-5 text-white/45">
                建议直接在当前浏览器里打开邮件中的登录链接。若在邮箱 App 内、无痕窗口或另一台设备里打开，可能不会继承当前站点的登录状态。
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {providerUrl ? (
                  <>
                    <Button
                      asChild
                      className="h-11 rounded-xl bg-white px-5 text-black hover:bg-white/90"
                    >
                      <a href={providerUrl} target="_blank" rel="noopener noreferrer">
                        前往邮箱
                      </a>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 rounded-xl border-white/15 bg-transparent px-5 text-white hover:bg-white/5 hover:text-white"
                    >
                      <Link href={`/login?next=${encodeURIComponent(next)}`}>重新发送</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      asChild
                      className="h-11 rounded-xl bg-white px-5 text-black hover:bg-white/90"
                    >
                      <Link href={`/login?next=${encodeURIComponent(next)}`}>重新发送</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="h-11 rounded-xl border-white/15 bg-transparent px-5 text-white hover:bg-white/5 hover:text-white"
                    >
                      <Link href="/">返回首页</Link>
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <AuthFocusAside
          eyebrow="登录状态"
          title="验证后会自动回到刚才的流程"
          points={[
            "登录成功后会继续返回你原来的评分结果、支付结果或项目步骤。",
            "正常情况下，登录状态会持续保留约 30 天。",
            "如果你已经登录，再打开登录页或验证页，会自动跳过并回到工作台或原路径。",
          ]}
          footnote="如果你是在另一个浏览器、无痕窗口或邮箱内嵌 WebView 里打开 Magic Link，可能不会复用原来的站点 Cookie，这时看起来会像“又要重新登录”。"
        />
      </div>
    </div>
  );
}
