import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/payment";

export async function POST(
  _req: Request,
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

  if (order.status === "PAID") {
    return NextResponse.json({ status: "PAID" });
  }

  if (!order.provider || !order.providerOrderId) {
    return NextResponse.json({ status: order.status });
  }

  const paymentProvider = getProvider(order.provider);
  const result = await paymentProvider.queryOrder(order.providerOrderId);

  if (result.status === "paid") {
    const expiresAt = order.planType === "PRO" ? addMonths(new Date(), 1) : null;
    await db.$transaction([
      db.order.update({ where: { id }, data: { status: "PAID" } }),
      db.billingEvent.create({ data: { orderId: id, eventType: "PAID" } }),
      db.userPlan.upsert({
        where: { sourceOrderId: id },
        create: {
          userId: session.user.id,
          planType: order.planType,
          status: "ACTIVE",
          startedAt: new Date(),
          expiresAt,
          sourceOrderId: id,
        },
        update: { status: "ACTIVE", startedAt: new Date(), expiresAt },
      }),
    ]);
    return NextResponse.json({ status: "PAID" });
  }

  if (result.status === "failed") {
    await db.order.update({ where: { id }, data: { status: "FAILED" } });
    await db.billingEvent.create({ data: { orderId: id, eventType: "FAILED" } });
    return NextResponse.json({ status: "FAILED" });
  }

  return NextResponse.json({ status: order.status });
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}
