import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await db.designerProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ profile });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  // Allowlist fields — never trust raw body directly
  const {
    currentTitle,
    yearsOfExperience,
    industry,
    specialties,
    targetRole,
    strengths,
    tonePreference,
    linkedinUrl,
    portfolioUrl,
  } = body as Record<string, unknown>;

  const safeData = Object.fromEntries(
    Object.entries({
      currentTitle,
      yearsOfExperience,
      industry,
      specialties,
      targetRole,
      strengths,
      tonePreference,
      linkedinUrl,
      portfolioUrl,
    }).filter(([, v]) => v !== undefined)
  );

  const profile = await db.designerProfile.upsert({
    where: { userId: session.user.id },
    update: safeData,
    create: { ...safeData, userId: session.user.id },
  });

  return NextResponse.json({ profile });
}
