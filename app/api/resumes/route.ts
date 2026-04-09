import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseResumeFile } from "@/lib/resume-parsing";

const ResumeUploadSchema = z.object({
  files: z.array(
    z.object({
      url: z.string().url(),
      name: z.string().min(1),
      type: z.string().min(1),
      size: z.number().optional(),
    })
  ),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ResumeUploadSchema.safeParse(await request.json());
  if (!parsed.success || parsed.data.files.length === 0) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const targetFile = parsed.data.files[0];
  const result = await parseResumeFile({
    source: targetFile.url,
    name: targetFile.name,
    type: targetFile.type,
  });

  const resume = await db.resume.create({
    data: {
      userId: session.user.id,
      fileUrl: targetFile.url,
      fileType: targetFile.type === "application/pdf" ? "PDF" : "DOCX",
      parseStatus: result.parseStatus,
      rawText: result.rawText || null,
      parsedJson: result.profileDraft,
    },
  });

  return NextResponse.json({
    resume: {
      id: resume.id,
      fileUrl: resume.fileUrl,
      fileType: resume.fileType,
      parseStatus: resume.parseStatus,
    },
    profileDraft: result.profileDraft,
  });
}
