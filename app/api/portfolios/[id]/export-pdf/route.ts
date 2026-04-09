import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requirePlan } from "@/lib/entitlement";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await requirePlan(session.user.id, "pdf_export");
  if (!allowed) {
    return NextResponse.json({ error: "upgrade_required" }, { status: 403 });
  }

  const { id } = await params;
  const portfolio = await db.portfolio.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, contentJson: true },
  });

  if (!portfolio) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!portfolio.contentJson) {
    return NextResponse.json({ error: "请先生成作品集包装结果" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    printUrl: `/portfolios/${portfolio.id}/print`,
    message: "当前先通过打印页导出 PDF。",
  });
}

