import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCanonicalRedirectUrl } from "@/lib/app-url";

const PROTECTED_PATH_PREFIXES = ["/dashboard", "/projects", "/payment", "/profile"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function middleware(request: NextRequest) {
  const canonicalRedirectUrl = getCanonicalRedirectUrl(request.nextUrl);
  if (canonicalRedirectUrl) {
    return NextResponse.redirect(canonicalRedirectUrl, 308);
  }

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  // Lightweight cookie presence check — full auth validation happens in Server Components / API routes.
  // NextAuth v5 renamed cookies from "next-auth.*" to "authjs.*".
  // Check all four variants to cover: v4/v5 × http(dev)/https(prod).
  const sessionToken =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token") ??
    request.cookies.get("next-auth.session-token") ??
    request.cookies.get("__Secure-next-auth.session-token");

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
