import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StepHeader } from "@/components/app/StepHeader";

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  if (!orderId) redirect("/dashboard");

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/payment/result?orderId=${orderId}`)}`);
  }

  const order = await db.order.findUnique({
    where: { id: orderId, userId: session.user.id },
    select: { status: true, planType: true, sourceScene: true, projectId: true, draftId: true },
  });

  if (!order) redirect("/dashboard");
  const orderData = order;

  const isPaid = orderData.status === "PAID";

  function buildReturnPath(): string {
    const { projectId } = orderData;
    if (projectId) {
      return `/projects/${projectId}/editor`;
    }
    return "/dashboard";
  }

  const returnPath = buildReturnPath();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <StepHeader
        backHref={returnPath}
        backLabel="返回刚才的流程"
        step="Focus"
        title={isPaid ? "支付成功，正在回到你的流程" : "支付未完成"}
        description={
          isPaid
            ? "权益已经开通，你可以继续回到刚才的评分结果、草稿编辑或导出发布流程。"
            : "你的数据已经保留，可以返回刚才的流程重新尝试，或查看套餐后再决定。"
        }
        status={isPaid ? "权益已开通" : "待重试"}
      />

      <div className="mt-10 max-w-2xl rounded-3xl border border-white/10 bg-white p-8 text-center text-neutral-900 shadow-2xl">
        {isPaid ? (
          <>
            <CheckCircle className="mx-auto h-14 w-14 text-emerald-500" />
            <h2 className="mt-5 text-2xl font-semibold">已解锁 {orderData.planType === "PRO" ? "Pro 版" : "求职冲刺版"}</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              支付成功后不需要重新找入口。我们会把你带回原来的操作上下文，继续整理、发布或导出作品集。
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-14 w-14 text-red-400" />
            <h2 className="mt-5 text-2xl font-semibold">当前支付未完成</h2>
            <p className="mt-3 text-sm leading-6 text-neutral-500">
              当前状态为「{orderData.status === "CANCELLED" ? "已取消" : "失败"}」，你可以返回刚才的步骤重新尝试，不会丢失项目与草稿数据。
            </p>
          </>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={returnPath}
            className="flex h-11 items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            {isPaid ? "返回继续操作" : "返回重试"}
          </Link>
          <Link
            href={isPaid ? "/dashboard" : "/pricing"}
            className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-6 text-sm text-neutral-600 transition-colors hover:border-neutral-400"
          >
            {isPaid ? "前往工作台首页" : "查看套餐"}
          </Link>
        </div>
      </div>
    </div>
  );
}
