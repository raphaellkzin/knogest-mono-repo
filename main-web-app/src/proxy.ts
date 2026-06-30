import { NextResponse, type NextRequest } from "next/server";

import { getAuthCookiePolicy } from "@/lib/auth/auth-cookie";

const AUTH_ROUTE = "/auth/login";
const HOME_ROUTE = "/home";
const PROTECTED_PREFIXES = ["/home"];

function createCsp() {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === "development";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
  return { csp, nonce };
}

function applySecurityHeaders(response: NextResponse, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { csp, nonce } = createCsp();
  const environment =
    process.env.AUTH_COOKIE_MODE === "secure" ? "production" : "development";
  const hasCredential = request.cookies.has(
    getAuthCookiePolicy(environment).accessName,
  );
  const isProtected = PROTECTED_PREFIXES.some((route) =>
    pathname.startsWith(route),
  );

  if (isProtected && !hasCredential) {
    const loginUrl = new URL(AUTH_ROUTE, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), csp);
  }
  if (pathname === AUTH_ROUTE && hasCredential) {
    return applySecurityHeaders(
      NextResponse.redirect(new URL(HOME_ROUTE, request.url)),
      csp,
    );
  }

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  return applySecurityHeaders(NextResponse.next({ request: { headers } }), csp);
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
