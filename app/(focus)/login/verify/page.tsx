import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StepHeader } from "@/components/app/StepHeader";

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <StepHeader
        backHref="/login"
        backLabel="返回登录"
        step="Focus"
        title="检查你的邮箱"
        description="我们已发送登录链接到你的邮箱，点击邮件中的链接即可回到刚才的流程继续操作。"
        status="等待验证"
      />

      <div className="mt-10 max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
          ✉️
        </div>

        <p className="mt-6 text-sm leading-6 text-white/55">
          如果没有收到邮件，请检查垃圾邮件文件夹，或者返回登录页重新发送。邮件中的登录链接 15 分钟内有效。
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            asChild
            className="h-11 rounded-xl bg-white px-5 text-black hover:bg-white/90"
          >
            <Link href="/login">重新发送</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 rounded-xl border-white/15 bg-transparent px-5 text-white hover:bg-white/5 hover:text-white"
          >
            <Link href="/">返回首页</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
