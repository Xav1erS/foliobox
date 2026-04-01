import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyPage() {
  return (
    <div className="w-full max-w-sm space-y-6 px-4 text-center">
      {/* Icon */}
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
        ✉️
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white">检查你的邮箱</h1>
        <p className="mt-3 text-sm text-white/40 leading-relaxed">
          我们已发送登录链接到你的邮箱。
          <br />
          点击邮件中的链接即可完成登录，链接 15 分钟内有效。
        </p>
      </div>

      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-left">
        <p className="text-xs text-white/40">
          没有收到邮件？检查垃圾邮件文件夹，或者
        </p>
        <Button
          asChild
          variant="link"
          className="h-auto p-0 text-xs text-white/60 hover:text-white"
        >
          <Link href="/login">重新发送</Link>
        </Button>
      </div>
    </div>
  );
}
