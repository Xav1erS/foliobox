import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectContinuePath, getProjectStageSummary } from "@/lib/project-workflow";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { assets: true } },
      facts: { select: { updatedAt: true } },
      outlines: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, updatedAt: true },
        take: 1,
      },
      drafts: {
        orderBy: { updatedAt: "desc" },
        select: { id: true, updatedAt: true, status: true },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      sourceType: project.sourceType,
      importStatus: project.importStatus,
      updatedAt: project.updatedAt,
      assetCount: project._count.assets,
      nextStep: getProjectContinuePath(project),
      stageSummary: getProjectStageSummary(project),
    })),
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const project = await db.project.create({
    data: {
      userId: session.user.id,
      name: body.name,
      sourceType: body.sourceType ?? "MANUAL",
      sourceUrl: body.sourceUrl ?? null,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
