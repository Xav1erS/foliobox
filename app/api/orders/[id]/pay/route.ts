import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/payment";
import { PLAN_AMOUNTS } from "@/lib/entitlement";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const order = await db.order.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (order.status !== "PENDING") {
    return NextResponse.json(
      { error: "Order is not in PENDING state" },
      { status: 409 }
    );
  }

  // Allow overriding the provider at pay time (e.g. user switches payment method)
  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider ?? order.provider ?? "wechat_pay");

  if (!["wechat_pay", "alipay"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const amount = order.amount ?? PLAN_AMOUNTS[order.planType] ?? 0;
  const paymentProvider = getProvider(provider);
  const { providerOrderId, paymentParams } = await paymentProvider.createOrder({
    orderId: order.id,
    planType: order.planType,
    amount,
    currency: order.currency,
    provider,
  });

  await db.order.update({
    where: { id },
    data: { provider, providerOrderId },
  });

  return NextResponse.json({ orderId: order.id, paymentParams });
}
