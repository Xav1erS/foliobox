import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function PUT(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // TODO: select / reorder assets for project id
  return NextResponse.json({ ok: true, projectId: id });
}
