import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLAN_AMOUNTS } from "@/lib/entitlement";
import {
  getPaymentProviderUnavailableMessage,
  getProvider,
  isPaymentProviderEnabled,
} from "@/lib/payment";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const planType = String(body.planType ?? "").toUpperCase();
  const provider = String(body.provider ?? "wechat_pay");
  const sourceScene = body.sourceScene ? String(body.sourceScene) : undefined;
  const projectId = body.projectId ? String(body.projectId) : undefined;
  const draftId = body.draftId ? String(body.draftId) : undefined;

  if (!["PRO", "SPRINT"].includes(planType)) {
    return NextResponse.json({ error: "Invalid planType" }, { status: 400 });
  }
  if (!["wechat_pay", "alipay"].includes(provider)) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  const paymentProvider = getProvider(provider);
  if (!isPaymentProviderEnabled(provider, paymentProvider)) {
    return NextResponse.json(
      { error: getPaymentProviderUnavailableMessage(provider) },
      { status: 503 }
    );
  }

  const amount = PLAN_AMOUNTS[planType];
  const order = await db.order.create({
    data: {
      userId: session.user.id,
      planType: planType as "PRO" | "SPRINT",
      amount,
      currency: "CNY",
      status: "PENDING",
      provider,
      sourceScene,
      projectId,
      draftId,
    },
  });

  await db.billingEvent.create({
    data: { orderId: order.id, eventType: "CREATED" },
  });

  // Payment is NOT initiated here; call POST /api/orders/:id/pay separately.
  return NextResponse.json({ orderId: order.id });
}
