import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const FactsSchema = z.object({
  projectType: z.string().optional(),
  audience: z.enum(["TO_C", "TO_B", "TO_G", "INTERNAL"]).optional(),
  platform: z
    .enum([
      "WEB",
      "MOBILE",
      "DESKTOP",
      "AUTOMOTIVE",
      "LARGE_SCREEN",
      "CROSS_PLATFORM",
    ])
    .optional(),
  projectNature: z
    .enum([
      "NEW_BUILD",
      "MAJOR_REDESIGN",
      "ITERATION",
      "DESIGN_SYSTEM",
      "CONCEPT",
    ])
    .optional(),
  industry: z.string().optional(),
  timeline: z.string().optional(),
  hasLaunched: z.boolean().optional(),
  background: z.string().optional(),
  targetUsers: z.string().optional(),
  businessGoal: z.string().optional(),
  constraints: z.string().optional(),
  roleTitle: z.string().optional(),
  involvementLevel: z.enum(["LEAD", "CORE", "SUPPORT"]).optional(),
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

// 这些是项目的客观条件,一旦首次写入就成为叙事结构和视觉风格的基础,后续不允许更改。
// 如果要改,只能删除项目重建。
const LOCKED_FIELDS = [
  "audience",
  "platform",
  "industry",
  "projectNature",
  "involvementLevel",
] as const;

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
  ) as Record<string, unknown>;

  const existing = await db.projectFact.findUnique({ where: { projectId: id } });

  // 锁定字段:一旦已有非空值,禁止覆盖。返回 409 并告知是哪个字段。
  if (existing) {
    for (const field of LOCKED_FIELDS) {
      const currentValue = existing[field as keyof typeof existing];
      const hasCurrent =
        currentValue !== null && currentValue !== undefined && currentValue !== "";
      if (!hasCurrent) continue;
      if (!(field in safeData)) continue;
      const nextValue = safeData[field];
      if (nextValue === currentValue) {
        delete safeData[field];
        continue;
      }
      return NextResponse.json(
        {
          error: "locked_field",
          field,
          message: "项目的受众、平台、行业、性质、职责在创建时已确定,不可更改。如需修改请删除项目后重建。",
        },
        { status: 409 }
      );
    }
  }

  const facts = await db.projectFact.upsert({
    where: { projectId: id },
    update: safeData,
    create: { ...safeData, projectId: id },
  });

  return NextResponse.json({ facts });
}
