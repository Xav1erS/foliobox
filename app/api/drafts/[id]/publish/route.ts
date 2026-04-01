import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // TODO: publish draft → create PublishedPortfolio with unique slug
  return NextResponse.json({ ok: true, draftId: id, message: "Publish - TODO" });
}
