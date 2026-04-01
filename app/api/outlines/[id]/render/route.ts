import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // TODO: trigger async render of 2-3 candidate drafts from confirmed outline
  return NextResponse.json({ ok: true, outlineId: id, message: "Render trigger - TODO" });
}
