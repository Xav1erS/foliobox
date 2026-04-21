import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ProjectEditorSceneSchema,
  mergeProjectLayoutDocument,
  resolveProjectEditorScene,
  resolveProjectLayoutDocument,
} from "@/lib/project-editor-scene";
import { validateProjectEditorScene } from "@/lib/project-editor-validation";

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
    select: {
      id: true,
      name: true,
      layoutJson: true,
      assets: {
        where: { selected: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          isCover: true,
          selected: true,
          metaJson: true,
        },
      },
    },
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

  const previousLayout = resolveProjectLayoutDocument(project.layoutJson);
  const previousScene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
    projectName: project.name,
  });
  const layoutDocument = mergeProjectLayoutDocument(project.layoutJson, {
    editorScene: parsedScene.data,
    ...(body.markSetupCompleted
      ? { setup: { completedAt: new Date().toISOString() } }
      : {}),
  });
  const nextScene =
    layoutDocument.editorScene ??
    resolveProjectEditorScene(layoutDocument, {
      assets: project.assets,
      projectName: project.name,
    });
  const validation = validateProjectEditorScene({
    scene: nextScene,
    assets: project.assets,
    source: "manual_edit",
    previousScene,
    previousValidation: previousLayout.validation ?? null,
  });
  const nextLayout = mergeProjectLayoutDocument(layoutDocument, {
    validation,
  });

  await db.project.update({
    where: { id },
    data: {
      layoutJson: nextLayout as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ layoutJson: nextLayout });
}
