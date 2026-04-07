import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { type ProjectStage, STAGE_TRANSITIONS } from "@/lib/project-workflow";

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

  // Auto-advance to the next stage in sequence
  const extraData: Record<string, unknown> = {};

  const nextStage = STAGE_TRANSITIONS[project.stage as ProjectStage];
  if (!nextStage) {
    return NextResponse.json({ error: "Already at final stage" }, { status: 400 });
  }

  if (
    typeof body.packageMode === "string" &&
    ["DEEP", "LIGHT", "SUPPORTIVE"].includes(body.packageMode)
  ) {
    extraData.packageMode = body.packageMode;
  }

  const updated = await db.project.update({
    where: { id: project.id },
    data: { stage: nextStage, ...extraData },
    select: { id: true, stage: true, packageMode: true },
  });

  return NextResponse.json({ stage: updated.stage, packageMode: updated.packageMode });
}
