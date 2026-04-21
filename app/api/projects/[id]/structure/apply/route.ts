import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  buildProjectSceneFromStructureSuggestion,
  mergeProjectLayoutDocument,
  resolveProjectEditorScene,
  resolveProjectLayoutDocument,
  type ProjectPackageMode,
} from "@/lib/project-editor-scene";
import {
  stampProjectValidationFailure,
  validateProjectEditorScene,
} from "@/lib/project-editor-validation";

function normalizePackageMode(value: string | null | undefined): ProjectPackageMode | undefined {
  if (value === "DEEP" || value === "LIGHT" || value === "SUPPORTIVE") {
    return value;
  }
  return undefined;
}

export async function POST(
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
      packageMode: true,
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
    markSetupCompleted?: boolean;
  };
  const layoutDocument = resolveProjectLayoutDocument(project.layoutJson);
  const currentScene = resolveProjectEditorScene(project.layoutJson, {
    assets: project.assets,
    projectName: project.name,
  });
  const suggestion = layoutDocument.structureSuggestion;

  if (!suggestion) {
    return NextResponse.json({ error: "请先生成并确认结构，再创建画板。" }, { status: 400 });
  }

  if (suggestion.status !== "confirmed") {
    return NextResponse.json({ error: "请先确认当前结构，再创建画板。" }, { status: 400 });
  }

  const editorScene = buildProjectSceneFromStructureSuggestion({
    suggestion,
    assets: project.assets,
    projectName: project.name,
    recognition: layoutDocument.materialRecognition ?? undefined,
    packageMode: normalizePackageMode(project.packageMode),
  });
  const validation = validateProjectEditorScene({
    scene: editorScene,
    assets: project.assets,
    source: "prototype_generation",
    previousValidation: layoutDocument.validation ?? null,
  });

  if (validation.projectState === "not_ready") {
    const fallbackValidation = stampProjectValidationFailure({
      scene: currentScene,
      validation: validateProjectEditorScene({
        scene: currentScene,
        assets: project.assets,
        source: "export_check",
        previousValidation: layoutDocument.validation ?? null,
      }),
      summary: "创建画板未完成，已保留原内容。",
    });
    const fallbackLayout = mergeProjectLayoutDocument(project.layoutJson, {
      validation: fallbackValidation,
    });

    await db.project.update({
      where: { id },
      data: { layoutJson: fallbackLayout as unknown as Prisma.InputJsonValue },
    });

    return NextResponse.json({
      layoutJson: fallbackLayout,
      rolledBack: true,
      message: "创建画板未完成，已保留原内容。",
    });
  }

  const nextLayout = mergeProjectLayoutDocument(project.layoutJson, {
    editorScene,
    validation,
    ...(body.markSetupCompleted ? { setup: { completedAt: new Date().toISOString() } } : {}),
  });

  await db.project.update({
    where: { id },
    data: { layoutJson: nextLayout as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ layoutJson: nextLayout });
}
