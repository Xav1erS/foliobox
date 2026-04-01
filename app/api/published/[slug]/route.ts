import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portfolio = await db.publishedPortfolio.findUnique({
    where: { slug, isPublished: true },
  });
  if (!portfolio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ portfolio });
}
