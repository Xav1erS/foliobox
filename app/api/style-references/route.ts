import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CreateStyleReferenceSetSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional().nullable(),
  imageUrls: z.array(z.string().url()).min(1).max(12),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sets = await db.styleReferenceSet.findMany({
    where: { userId: session.user.id },
    orderBy: [{ lastUsedAt: "desc" }, { updatedAt: "desc" }],
  });

  return NextResponse.json({ sets });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = CreateStyleReferenceSetSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const set = await db.styleReferenceSet.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      imageUrls: parsed.data.imageUrls,
    },
  });

  return NextResponse.json({ set });
}
