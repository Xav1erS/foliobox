import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handleUpload } from "@vercel/blob/client";
import {
  consumeAnonymousScoreUploadToken,
  isSameOriginUploadRequest,
} from "@/lib/blob-upload-guard";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_PDF_TYPES = ["application/pdf"];

type UploadPayload = {
  folder?: "project-assets" | "score-inputs";
  kind?: "project-image" | "score-image" | "score-pdf";
  originalName?: string;
};

type UploadWindowCookie = {
  name: string;
  value: string;
  maxAge: number;
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
  const uploadWindowCookieRef: { current: UploadWindowCookie | null } = { current: null };

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const payload = parsePayload(clientPayload);
        const session = await auth();

        if (payload.folder === "project-assets" && payload.kind === "project-image") {
          if (!session?.user?.id) {
            throw new Error("Unauthorized");
          }
          return {
            access: "private" as const,
            allowedContentTypes: ALLOWED_IMAGE_TYPES,
            maximumSizeInBytes: MAX_FILE_SIZE,
            addRandomSuffix: false,
          };
        }

        if (payload.folder === "score-inputs" && payload.kind === "score-image") {
          if (!isSameOriginUploadRequest(request)) {
            throw new Error("InvalidOrigin");
          }

          const rateLimit = consumeAnonymousScoreUploadToken(request);
          if (!rateLimit.allowed) {
            const error = new Error("RateLimited");
            (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds =
              rateLimit.retryAfterSeconds;
            throw error;
          }

          uploadWindowCookieRef.current = {
            name: rateLimit.cookieName,
            value: rateLimit.cookieValue,
            maxAge: rateLimit.maxAgeSeconds,
          };

          return {
            access: "private" as const,
            allowedContentTypes: ALLOWED_IMAGE_TYPES,
            maximumSizeInBytes: MAX_FILE_SIZE,
            addRandomSuffix: false,
          };
        }

        if (payload.folder === "score-inputs" && payload.kind === "score-pdf") {
          if (!isSameOriginUploadRequest(request)) {
            throw new Error("InvalidOrigin");
          }

          const rateLimit = consumeAnonymousScoreUploadToken(request);
          if (!rateLimit.allowed) {
            const error = new Error("RateLimited");
            (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds =
              rateLimit.retryAfterSeconds;
            throw error;
          }

          uploadWindowCookieRef.current = {
            name: rateLimit.cookieName,
            value: rateLimit.cookieValue,
            maxAge: rateLimit.maxAgeSeconds,
          };

          return {
            access: "private" as const,
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

    const response = NextResponse.json(jsonResponse);
    const cookieToSet = uploadWindowCookieRef.current;
    if (cookieToSet) {
      response.cookies.set(cookieToSet.name, cookieToSet.value, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: cookieToSet.maxAge,
      });
    }
    return response;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message === "Unauthorized"
          ? "Unauthorized"
          : error.message === "RateLimited"
            ? "上传过于频繁，请稍后再试"
            : error.message === "InvalidOrigin"
              ? "非法上传来源"
              : "Upload token generation failed"
        : "Upload token generation failed";
    const retryAfterSeconds =
      error instanceof Error
        ? (error as Error & { retryAfterSeconds?: number }).retryAfterSeconds
        : undefined;
    const status =
      message === "Unauthorized"
        ? 401
        : message === "上传过于频繁，请稍后再试"
          ? 429
          : message === "非法上传来源"
            ? 403
            : 400;
    const response = NextResponse.json({ error: message }, { status });
    if (retryAfterSeconds) {
      response.headers.set("retry-after", String(retryAfterSeconds));
    }
    return response;
  }
}
