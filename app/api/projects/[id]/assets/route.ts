import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET: list assets for a project
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const assets = await db.projectAsset.findMany({
    where: { projectId: id },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ assets });
}

// PUT: update selected/order/cover for assets
// Body: { assets: [{ id, selected, sortOrder, isCover }] }
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const project = await db.project.findUnique({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updates = body.assets as { id: string; selected: boolean; sortOrder: number; isCover: boolean }[];

  if (!Array.isArray(updates)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (updates.length > 100) {
    return NextResponse.json({ error: "Too many assets" }, { status: 400 });
  }

  await Promise.all(
    updates.map((a) =>
      db.projectAsset.update({
        where: { id: a.id, projectId: id },
        data: { selected: a.selected, sortOrder: a.sortOrder, isCover: a.isCover },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
