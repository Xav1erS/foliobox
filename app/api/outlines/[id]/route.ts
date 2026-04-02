import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const outline = await db.portfolioOutline.findUnique({
    where: { id, userId: session.user.id },
    include: { projects: { select: { id: true, name: true } } },
  });
  if (!outline) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ outline });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const outline = await db.portfolioOutline.findUnique({ where: { id, userId: session.user.id } });
  if (!outline) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  // Allowlist — only permit safe fields
  const { overallTheme, sectionsJson, selectedThumbnailMap } = body as Record<string, unknown>;
  const safeData = Object.fromEntries(
    Object.entries({ overallTheme, sectionsJson, selectedThumbnailMap }).filter(([, v]) => v !== undefined)
  );

  const updated = await db.portfolioOutline.update({ where: { id, userId: session.user.id }, data: safeData });
  return NextResponse.json({ outline: updated });
}
