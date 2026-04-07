import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const FactsSchema = z.object({
  projectType: z.string().optional(),
  industry: z.string().optional(),
  timeline: z.string().optional(),
  hasLaunched: z.boolean().optional(),
  background: z.string().optional(),
  targetUsers: z.string().optional(),
  businessGoal: z.string().optional(),
  constraints: z.string().optional(),
  roleTitle: z.string().optional(),
  involvementLevel: z.enum(["LEAD", "CORE", "CONTRIBUTOR"]).optional(),
  responsibilities: z.string().optional(),
  collaborators: z.string().optional(),
  keyContribution: z.string().optional(),
  biggestChallenge: z.string().optional(),
  keyHighlights: z.string().optional(),
  designRationale: z.string().optional(),
  tradeoffs: z.string().optional(),
  resultSummary: z.string().optional(),
  measurableImpact: z.string().optional(),
  substituteEvidence: z.string().optional(),
  targetJob: z.string().optional(),
  targetCompanyType: z.string().optional(),
  emphasis: z.string().optional(),
  tonePreference: z.string().optional(),
});

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

  const rawBody = await request.json();
  const parsed = FactsSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid fields", details: parsed.error.flatten() }, { status: 400 });
  }

  // Strip undefined fields before upsert
  const safeData = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  );

  const facts = await db.projectFact.upsert({
    where: { projectId: id },
    update: safeData,
    create: { ...safeData, projectId: id },
  });

  return NextResponse.json({ facts });
}
