import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  mergePortfolioEditorState,
  type FixedPageConfig,
} from "@/lib/portfolio-editor";

const UpdatePortfolioSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "SELECTION", "OUTLINE", "EDITOR", "PUBLISHED"]).optional(),
  projectIds: z.array(z.string()).optional(),
  fixedPages: z
    .array(
      z.object({
        id: z.enum(["cover", "about", "closing"]),
        label: z.string(),
        enabled: z.boolean(),
      })
    )
    .optional(),
});

async function getOwnedPortfolio(id: string, userId: string) {
  return db.portfolio.findFirst({
    where: { id, userId },
    select: {
      id: true,
      name: true,
      status: true,
      projectIds: true,
      outlineJson: true,
      contentJson: true,
      updatedAt: true,
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const portfolio = await getOwnedPortfolio(id, session.user.id);
  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ portfolio });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const portfolio = await getOwnedPortfolio(id, session.user.id);
  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const parsed = UpdatePortfolioSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data: {
    name?: string;
    status?: "DRAFT" | "SELECTION" | "OUTLINE" | "EDITOR" | "PUBLISHED";
    projectIds?: string[];
    outlineJson?: Prisma.InputJsonValue;
    contentJson?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  } = {};

  if (parsed.data.name) {
    data.name = parsed.data.name.trim();
  }
  if (parsed.data.status) {
    data.status = parsed.data.status;
  }
  if (parsed.data.projectIds) {
    data.projectIds = parsed.data.projectIds;
    data.contentJson = Prisma.JsonNull;
    data.outlineJson = mergePortfolioEditorState(portfolio.outlineJson, {
      diagnosis: null,
    }) as unknown as Prisma.InputJsonValue;
  }
  if (parsed.data.fixedPages) {
    const nextEditorState = mergePortfolioEditorState(portfolio.outlineJson, {
      fixedPages: parsed.data.fixedPages as FixedPageConfig[],
      diagnosis: null,
    });
    data.outlineJson = nextEditorState as unknown as Prisma.InputJsonValue;
    data.contentJson = Prisma.JsonNull;
  }

  const updated = await db.portfolio.update({
    where: { id: portfolio.id },
    data,
    select: {
      id: true,
      name: true,
      status: true,
      projectIds: true,
      outlineJson: true,
      contentJson: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ portfolio: updated });
}
