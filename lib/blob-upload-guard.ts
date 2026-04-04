import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";

const SCORE_UPLOAD_RATE_LIMIT_COOKIE = "foliobox-score-upload-window";
const DEFAULT_SCORE_UPLOAD_TOKEN_LIMIT = 30;
const DEFAULT_SCORE_UPLOAD_WINDOW_MS = 60 * 60 * 1000;

type UploadWindowPayload = {
  count: number;
  windowStartedAt: number;
};

function getCookieSecret() {
  return process.env.AUTH_SECRET || "development-score-upload-secret";
}

function sign(value: string) {
  return createHmac("sha256", getCookieSecret()).update(value).digest("hex");
}

function encodePayload(payload: UploadWindowPayload) {
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function decodePayload(raw: string | undefined): UploadWindowPayload | null {
  if (!raw) return null;

  const [encoded, signature] = raw.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) {
    return null;
  }

  try {
    const decoded = Buffer.from(encoded, "base64url").toString("utf8");
    const payload = JSON.parse(decoded) as UploadWindowPayload;
    if (
      !Number.isFinite(payload.count) ||
      payload.count < 0 ||
      !Number.isFinite(payload.windowStartedAt) ||
      payload.windowStartedAt <= 0
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function getWindowConfig() {
  const tokenLimit = Number(process.env.SCORE_UPLOAD_TOKEN_LIMIT || DEFAULT_SCORE_UPLOAD_TOKEN_LIMIT);
  const windowMs = Number(process.env.SCORE_UPLOAD_WINDOW_MS || DEFAULT_SCORE_UPLOAD_WINDOW_MS);

  return {
    tokenLimit: Number.isFinite(tokenLimit) && tokenLimit > 0 ? tokenLimit : DEFAULT_SCORE_UPLOAD_TOKEN_LIMIT,
    windowMs: Number.isFinite(windowMs) && windowMs > 0 ? windowMs : DEFAULT_SCORE_UPLOAD_WINDOW_MS,
  };
}

export function isSameOriginUploadRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export function consumeAnonymousScoreUploadToken(request: NextRequest) {
  const now = Date.now();
  const { tokenLimit, windowMs } = getWindowConfig();
  const current = decodePayload(request.cookies.get(SCORE_UPLOAD_RATE_LIMIT_COOKIE)?.value);
  const withinWindow =
    current && now - current.windowStartedAt >= 0 && now - current.windowStartedAt < windowMs;

  const nextPayload: UploadWindowPayload = withinWindow
    ? {
        count: current.count + 1,
        windowStartedAt: current.windowStartedAt,
      }
    : {
        count: 1,
        windowStartedAt: now,
      };

  if (nextPayload.count > tokenLimit) {
    const retryAfterMs = Math.max(windowMs - (now - nextPayload.windowStartedAt), 1_000);
    return {
      allowed: false as const,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  return {
    allowed: true as const,
    cookieName: SCORE_UPLOAD_RATE_LIMIT_COOKIE,
    cookieValue: encodePayload(nextPayload),
    maxAgeSeconds: Math.ceil(windowMs / 1000),
  };
}
