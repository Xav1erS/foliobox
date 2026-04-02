import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alipayProvider } from "@/lib/payment/alipay";

export async function POST(req: Request) {
  const body = await req.text();
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    payload = Object.fromEntries(new URLSearchParams(body));
  }

  const { orderId, status } = await alipayProvider.verifyCallback(payload);

  if (!orderId) {
    return NextResponse.json({ error: "Invalid callback" }, { status: 400 });
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (status === "TRADE_SUCCESS" || status === "paid") {
    if (order.status !== "PAID") {
      const expiresAt = order.planType === "PRO" ? addMonths(new Date(), 1) : null;
      await db.$transaction([
        db.order.update({ where: { id: orderId }, data: { status: "PAID" } }),
        db.billingEvent.create({
          data: { orderId, eventType: "PAID", payloadJson: payload as object },
        }),
        db.userPlan.upsert({
          where: { sourceOrderId: orderId },
          create: {
            userId: order.userId,
            planType: order.planType,
            status: "ACTIVE",
            startedAt: new Date(),
            expiresAt,
            sourceOrderId: orderId,
          },
          update: { status: "ACTIVE", startedAt: new Date(), expiresAt },
        }),
      ]);
    }
  }

  return new NextResponse("success", { status: 200 });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
