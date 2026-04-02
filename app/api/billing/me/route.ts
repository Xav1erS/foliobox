import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await db.userPlan.findFirst({
    where: { userId: session.user.id, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { planType: true, status: true, expiresAt: true },
  });

  return NextResponse.json({
    planType: plan?.planType ?? "FREE",
    status: plan?.status ?? "ACTIVE",
    expiresAt: plan?.expiresAt ?? null,
  });
}
