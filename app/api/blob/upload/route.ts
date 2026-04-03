import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleUpload } from "@vercel/blob/client";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_PDF_TYPES = ["application/pdf"];

type UploadPayload = {
  folder?: "project-assets" | "score-inputs";
  kind?: "project-image" | "score-image" | "score-pdf";
  originalName?: string;
};

function parsePayload(raw: string | null): UploadPayload {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UploadPayload;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = parsePayload(clientPayload);
        const session = await auth();

        if (!session?.user?.id) {
          throw new Error("Unauthorized");
        }

        if (payload.folder === "project-assets" && payload.kind === "project-image") {
          return {
            allowedContentTypes: ALLOWED_IMAGE_TYPES,
            maximumSizeInBytes: MAX_FILE_SIZE,
            addRandomSuffix: false,
          };
        }

        if (payload.folder === "score-inputs" && payload.kind === "score-image") {
          return {
            allowedContentTypes: ALLOWED_IMAGE_TYPES,
            maximumSizeInBytes: MAX_FILE_SIZE,
            addRandomSuffix: false,
          };
        }

        if (payload.folder === "score-inputs" && payload.kind === "score-pdf") {
          return {
            allowedContentTypes: ALLOWED_PDF_TYPES,
            maximumSizeInBytes: MAX_FILE_SIZE,
            addRandomSuffix: false,
          };
        }

        throw new Error("Invalid upload payload");
      },
      onUploadCompleted: async () => {
        // No-op for MVP. The actual record creation happens after the client
        // submits uploaded blob URLs to the corresponding product flow.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error && error.message === "Unauthorized"
        ? "Unauthorized"
        : "Upload token generation failed";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
