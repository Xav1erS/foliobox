import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  mergeProjectAssetMeta,
  ProjectAssetMetaSchema,
} from "@/lib/project-editor-scene";

const AssetPatchSchema = z.object({
  title: z.string().trim().nullable().optional(),
  note: z.string().trim().nullable().optional(),
  roleTag: ProjectAssetMetaSchema.shape.roleTag.optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, assetId } = await params;
  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asset = await db.projectAsset.findFirst({
    where: { id: assetId, projectId: id },
    select: {
      id: true,
      title: true,
      metaJson: true,
      imageUrl: true,
      selected: true,
      isCover: true,
      sortOrder: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as unknown;
  const parsed = AssetPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const nextMeta = mergeProjectAssetMeta(asset.metaJson, {
    note: parsed.data.note,
    roleTag: parsed.data.roleTag,
  });

  const updated = await db.projectAsset.update({
    where: { id: assetId, projectId: id },
    data: {
      title: parsed.data.title === undefined ? asset.title : parsed.data.title,
      metaJson: nextMeta as unknown as Prisma.InputJsonValue,
    },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      selected: true,
      isCover: true,
      sortOrder: true,
      metaJson: true,
    },
  });

  return NextResponse.json({ asset: updated });
}
