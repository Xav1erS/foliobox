import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProjectContinuePath, getProjectStageSummary } from "@/lib/project-workflow";

const PROJECT_SOURCE_TYPES = new Set(["MANUAL", "FIGMA", "IMAGES"]);

function serializeProject(project: {
  id: string;
  name: string;
  sourceType: string;
  sourceUrl: string | null;
  importStatus: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { assets: number };
  facts: { updatedAt: Date } | null;
  outlines: Array<{ id: string; updatedAt: Date }>;
  drafts: Array<{ id: string; updatedAt: Date; status: string }>;
}) {
  return {
    id: project.id,
    name: project.name,
    sourceType: project.sourceType,
    sourceUrl: project.sourceUrl,
    importStatus: project.importStatus,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    assetCount: project._count.assets,
    nextStep: getProjectContinuePath(project),
    stageSummary: getProjectStageSummary(project),
  };
}

async function getOwnedProject(userId: string, id: string) {
  return db.project.findFirst({
    where: { id, userId },
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
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await getOwnedProject(session.user.id, id);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    project: serializeProject(project),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const existingProject = await getOwnedProject(session.user.id, id);

  if (!existingProject) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const updates: {
    name?: string;
    sourceUrl?: string | null;
    sourceType?: "MANUAL" | "FIGMA" | "IMAGES";
  } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if (body.sourceUrl !== undefined) {
    if (body.sourceUrl === null || body.sourceUrl === "") {
      updates.sourceUrl = null;
    } else if (typeof body.sourceUrl === "string") {
      try {
        const parsedUrl = new URL(body.sourceUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
          throw new Error("invalid_protocol");
        }
      } catch {
        return NextResponse.json({ error: "sourceUrl must be a valid public URL" }, { status: 400 });
      }
      updates.sourceUrl = body.sourceUrl;
    } else {
      return NextResponse.json({ error: "sourceUrl must be a string or null" }, { status: 400 });
    }
  }

  if (body.sourceType !== undefined) {
    if (typeof body.sourceType !== "string" || !PROJECT_SOURCE_TYPES.has(body.sourceType)) {
      return NextResponse.json({ error: "sourceType is invalid" }, { status: 400 });
    }
    updates.sourceType = body.sourceType;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  await db.project.update({
    where: { id: existingProject.id },
    data: updates,
  });

  const project = await getOwnedProject(session.user.id, id);

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    project: serializeProject(project),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.project.delete({
    where: { id: project.id },
  });

  return NextResponse.json({ ok: true });
}
