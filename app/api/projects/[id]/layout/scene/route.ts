import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ProjectEditorSceneSchema,
  mergeProjectLayoutDocument,
} from "@/lib/project-editor-scene";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, layoutJson: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    editorScene?: unknown;
    markSetupCompleted?: boolean;
  };
  const parsedScene = ProjectEditorSceneSchema.safeParse(body.editorScene);

  if (!parsedScene.success) {
    return NextResponse.json(
      { error: "Invalid editorScene", details: parsedScene.error.flatten() },
      { status: 400 }
    );
  }

  const layoutDocument = mergeProjectLayoutDocument(project.layoutJson, {
    editorScene: parsedScene.data,
    ...(body.markSetupCompleted
      ? { setup: { completedAt: new Date().toISOString() } }
      : {}),
  });

  await db.project.update({
    where: { id },
    data: {
      layoutJson: layoutDocument as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ editorScene: layoutDocument.editorScene });
}
