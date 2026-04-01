import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

async function getOwnedProject(projectId: string, userId: string) {
  return db.project.findUnique({ where: { id: projectId, userId } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getOwnedProject(id, session.user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const facts = await db.projectFact.findUnique({ where: { projectId: id } });
  return NextResponse.json({ facts });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const project = await getOwnedProject(id, session.user.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();

  // Allowlist fields — never pass raw body directly to DB
  const {
    projectType, industry, timeline, hasLaunched,
    background, targetUsers, businessGoal, constraints,
    roleTitle, involvementLevel, responsibilities, collaborators,
    keyContribution, biggestChallenge, keyHighlights,
    designRationale, tradeoffs, resultSummary,
    measurableImpact, substituteEvidence,
    targetJob, targetCompanyType, emphasis, tonePreference,
  } = body as Record<string, unknown>;

  const safeData = Object.fromEntries(
    Object.entries({
      projectType, industry, timeline, hasLaunched,
      background, targetUsers, businessGoal, constraints,
      roleTitle, involvementLevel, responsibilities, collaborators,
      keyContribution, biggestChallenge, keyHighlights,
      designRationale, tradeoffs, resultSummary,
      measurableImpact, substituteEvidence,
      targetJob, targetCompanyType, emphasis, tonePreference,
    }).filter(([, v]) => v !== undefined)
  );

  const facts = await db.projectFact.upsert({
    where: { projectId: id },
    update: safeData,
    create: { ...safeData, projectId: id },
  });

  return NextResponse.json({ facts });
}
