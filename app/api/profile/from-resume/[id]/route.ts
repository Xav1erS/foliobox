import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const resume = await db.resume.findFirst({
    where: { id, userId: session.user.id },
    select: {
      id: true,
      parsedJson: true,
      parseStatus: true,
    },
  });

  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const parsed = (resume.parsedJson ?? {}) as Record<string, unknown>;
  if (resume.parseStatus !== "DONE" || Object.keys(parsed).length === 0) {
    return NextResponse.json({ error: "resume_not_ready" }, { status: 400 });
  }

  const profile = await db.designerProfile.upsert({
    where: { userId: session.user.id },
    update: {
      currentTitle: typeof parsed.currentTitle === "string" ? parsed.currentTitle : undefined,
      yearsOfExperience:
        typeof parsed.yearsOfExperience === "string" ? parsed.yearsOfExperience : undefined,
      industry: typeof parsed.industry === "string" ? parsed.industry : undefined,
      specialties: Array.isArray(parsed.specialties)
        ? parsed.specialties.filter((item): item is string => typeof item === "string")
        : undefined,
      targetRole: typeof parsed.targetRole === "string" ? parsed.targetRole : undefined,
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.filter((item): item is string => typeof item === "string")
        : undefined,
      tonePreference:
        typeof parsed.tonePreference === "string" ? parsed.tonePreference : undefined,
      source: "RESUME_PARSE",
    },
    create: {
      userId: session.user.id,
      currentTitle: typeof parsed.currentTitle === "string" ? parsed.currentTitle : null,
      yearsOfExperience:
        typeof parsed.yearsOfExperience === "string" ? parsed.yearsOfExperience : null,
      industry: typeof parsed.industry === "string" ? parsed.industry : null,
      specialties: Array.isArray(parsed.specialties)
        ? parsed.specialties.filter((item): item is string => typeof item === "string")
        : [],
      targetRole: typeof parsed.targetRole === "string" ? parsed.targetRole : null,
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.filter((item): item is string => typeof item === "string")
        : [],
      tonePreference:
        typeof parsed.tonePreference === "string" ? parsed.tonePreference : "balanced",
      source: "RESUME_PARSE",
    },
  });

  return NextResponse.json({ profile });
}
