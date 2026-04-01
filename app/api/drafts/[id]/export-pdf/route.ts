import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // TODO: generate PDF from draft HTML → upload to Blob → return URL
  return NextResponse.json({ ok: true, draftId: id, message: "PDF export - TODO" });
}
