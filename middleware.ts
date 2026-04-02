import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
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
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/payment/:path*",
    "/profile/:path*",
  ],
};
