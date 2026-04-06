import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const STAGE_ORDER = ["DRAFT", "BOUNDARY", "COMPLETENESS", "PACKAGE", "LAYOUT", "READY"] as const;
type ProjectStage = (typeof STAGE_ORDER)[number];

const STAGE_TRANSITIONS: Record<ProjectStage, ProjectStage | null> = {
  DRAFT: "BOUNDARY",
  BOUNDARY: "COMPLETENESS",
  COMPLETENESS: "PACKAGE",
  PACKAGE: "LAYOUT",
  LAYOUT: "READY",
  READY: null,
};

export async function PATCH(
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
    select: { id: true, stage: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  // Allow explicit stage set (for packageMode updates) or auto-advance
  let nextStage: ProjectStage;
  const extraData: Record<string, unknown> = {};

  if (body.stage && STAGE_ORDER.includes(body.stage)) {
    nextStage = body.stage as ProjectStage;
  } else {
    const advanced = STAGE_TRANSITIONS[project.stage as ProjectStage];
    if (!advanced) {
      return NextResponse.json({ error: "Already at final stage" }, { status: 400 });
    }
    nextStage = advanced;
  }

  if (body.packageMode && ["DEEP", "LIGHT", "SUPPORTIVE"].includes(body.packageMode)) {
    extraData.packageMode = body.packageMode;
  }

  const updated = await db.project.update({
    where: { id: project.id },
    data: { stage: nextStage, ...extraData },
    select: { id: true, stage: true, packageMode: true },
  });

  return NextResponse.json({ stage: updated.stage, packageMode: updated.packageMode });
}
