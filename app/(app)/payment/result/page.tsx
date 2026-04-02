import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CheckCircle, XCircle } from "lucide-react";

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const { orderId } = await searchParams;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  if (!orderId) redirect("/dashboard");

  const order = await db.order.findUnique({
    where: { id: orderId, userId: session.user.id },
    select: { status: true, planType: true, sourceScene: true, projectId: true, draftId: true },
  });

  if (!order) redirect("/dashboard");

  const isPaid = order.status === "PAID";

  // Build return path from Order context (7.15C) — never trust URL param as authority
  function buildReturnPath(): string {
    const { sourceScene, projectId, draftId } = order!;
    if (projectId && (sourceScene === "pdf_export" || sourceScene === "publish_link") && draftId) {
      return `/projects/${projectId}/editor?did=${draftId}`;
    }
    if (projectId && sourceScene === "full_rewrite") {
      return `/projects/${projectId}/outline`;
    }
    if (projectId && sourceScene === "multi_variant" && draftId) {
      return `/projects/${projectId}/editor?did=${draftId}`;
    }
    if (projectId) {
      return `/projects/${projectId}`;
    }
    return "/dashboard";
  }

  const returnPath = buildReturnPath();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      {isPaid ? (
        <>
          <CheckCircle className="mb-5 h-14 w-14 text-emerald-500" />
          <h1 className="text-2xl font-semibold text-neutral-900">支付成功</h1>
          <p className="mt-2 text-sm text-neutral-500">
            你已成功解锁{" "}
            <span className="font-medium text-neutral-700">
              {order.planType === "PRO" ? "Pro 版" : "求职冲刺版"}
            </span>{" "}
            权益，现在可以继续完整整理作品集。
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href={returnPath}
              className="flex h-11 items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              返回继续操作
            </Link>
            <Link
              href="/dashboard"
              className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-6 text-sm text-neutral-600 transition-colors hover:border-neutral-400"
            >
              前往项目列表
            </Link>
          </div>
        </>
      ) : (
        <>
          <XCircle className="mb-5 h-14 w-14 text-red-400" />
          <h1 className="text-2xl font-semibold text-neutral-900">支付未完成</h1>
          <p className="mt-2 text-sm text-neutral-500">
            当前支付状态为「{order.status === "CANCELLED" ? "已取消" : "失败"}」，你的数据已保留，可以重新尝试。
          </p>
          <div className="mt-8 flex gap-3">
            <Link
              href={returnPath}
              className="flex h-11 items-center justify-center rounded-xl bg-neutral-900 px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              返回重试
            </Link>
            <Link
              href="/pricing"
              className="flex h-11 items-center justify-center rounded-xl border border-neutral-200 px-6 text-sm text-neutral-600 transition-colors hover:border-neutral-400"
            >
              查看套餐
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
