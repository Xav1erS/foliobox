const DEFAULT_DEV_APP_URL = "http://localhost:3000";

function normalizeUrlString(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getConfiguredAppUrl() {
  const raw =
    process.env.APP_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    (process.env.NODE_ENV === "production" ? "" : DEFAULT_DEV_APP_URL);

  if (!raw) return null;

  try {
    return new URL(normalizeUrlString(raw));
  } catch {
    return null;
  }
}

export function getConfiguredAppOrigin() {
  return getConfiguredAppUrl()?.origin ?? null;
}

export function getConfiguredAppHost() {
  return getConfiguredAppUrl()?.host ?? null;
}

function getHostAliases(canonical: URL) {
  const aliases = new Set<string>();

  if (canonical.hostname.startsWith("www.")) {
    aliases.add(canonical.hostname.slice(4));
  } else if (!canonical.hostname.includes("localhost")) {
    aliases.add(`www.${canonical.hostname}`);
  }

  const configuredAliases = (process.env.CANONICAL_HOST_ALIASES || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  for (const alias of configuredAliases) {
    aliases.add(alias);
  }

  aliases.delete(canonical.hostname);
  return aliases;
}

export function getCanonicalRedirectUrl(requestUrl: string | URL) {
  const canonical = getConfiguredAppUrl();
  if (!canonical) return null;

  const current = typeof requestUrl === "string" ? new URL(requestUrl) : requestUrl;
  const aliases = getHostAliases(canonical);

  const sameOrigin =
    current.protocol === canonical.protocol &&
    current.hostname === canonical.hostname &&
    current.port === canonical.port;

  if (sameOrigin) {
    return null;
  }

  if (!aliases.has(current.hostname)) {
    return null;
  }

  const nextUrl = new URL(current.pathname + current.search, canonical);
  nextUrl.hash = current.hash;
  return nextUrl;
}

export function normalizeUrlToConfiguredOrigin(url: string, fallbackBaseUrl?: string) {
  const canonical = getConfiguredAppUrl();
  const fallback = fallbackBaseUrl ? new URL(fallbackBaseUrl) : canonical;

  if (!canonical && !fallback) {
    return url;
  }

  const resolved = new URL(url, fallback ?? undefined);

  if (!canonical) {
    return resolved.toString();
  }

  if (
    resolved.protocol === canonical.protocol &&
    resolved.hostname === canonical.hostname &&
    resolved.port === canonical.port
  ) {
    return resolved.toString();
  }

  if (url.startsWith("/")) {
    return new URL(url, canonical).toString();
  }

  if (resolved.origin === (fallback ?? canonical).origin) {
    return new URL(resolved.pathname + resolved.search + resolved.hash, canonical).toString();
  }

  return resolved.toString();
}

export function normalizeAuthRedirectUrl(url: string, fallbackBaseUrl: string) {
  const canonical = getConfiguredAppUrl();
  const fallback = new URL(fallbackBaseUrl);

  if (url.startsWith("/")) {
    return new URL(url, canonical ?? fallback).toString();
  }

  const resolved = new URL(url, fallback);
  const allowedOrigins = new Set([fallback.origin]);
  if (canonical) {
    allowedOrigins.add(canonical.origin);
  }

  if (allowedOrigins.has(resolved.origin)) {
    if (!canonical) {
      return resolved.toString();
    }

    return new URL(resolved.pathname + resolved.search + resolved.hash, canonical).toString();
  }

  return (canonical ?? fallback).toString();
}
