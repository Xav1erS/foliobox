import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const score = await db.portfolioScore.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!score) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(score);
}
