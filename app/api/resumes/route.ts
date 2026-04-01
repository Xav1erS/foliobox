import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: handle file upload via Vercel Blob + trigger parse job
  return NextResponse.json({ ok: true, message: "Resume upload endpoint - TODO" });
}
