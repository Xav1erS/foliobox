import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const draft = await db.portfolioDraft.findUnique({
    where: { id, userId: session.user.id },
  });
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ draft });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.portfolioDraft.findUnique({ where: { id, userId: session.user.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  // Allowlist — only permit safe fields
  const { contentJson, title } = body as Record<string, unknown>;
  const safeData = Object.fromEntries(
    Object.entries({ contentJson, title }).filter(([, v]) => v !== undefined)
  );

  const draft = await db.portfolioDraft.update({ where: { id, userId: session.user.id }, data: safeData });
  return NextResponse.json({ draft });
}
