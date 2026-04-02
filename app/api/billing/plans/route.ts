import { NextResponse } from "next/server";
import { PLAN_DEFINITIONS } from "@/lib/entitlement";

export async function GET() {
  return NextResponse.json(PLAN_DEFINITIONS);
}
