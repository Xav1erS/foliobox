import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getEntitlementSummary } from "@/lib/entitlement";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await getEntitlementSummary(session.user.id);

  return NextResponse.json({
    planType: summary.planType,
    status: "ACTIVE",
    expiresAt: summary.expiresAt,
    quotas: summary.quotas,
  });
}
