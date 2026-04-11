import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ProjectStructureSuggestionSchema,
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
    suggestion?: unknown;
  };
  const parsedSuggestion = ProjectStructureSuggestionSchema.safeParse(body.suggestion);

  if (!parsedSuggestion.success) {
    return NextResponse.json(
      { error: "Invalid suggestion", details: parsedSuggestion.error.flatten() },
      { status: 400 }
    );
  }

  const layoutDocument = mergeProjectLayoutDocument(project.layoutJson, {
    structureSuggestion: parsedSuggestion.data,
  });

  await db.project.update({
    where: { id },
    data: {
      layoutJson: layoutDocument as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ suggestion: layoutDocument.structureSuggestion });
}
