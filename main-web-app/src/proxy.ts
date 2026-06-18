import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const AUTH_ROUTE = "/auth/login";
const HOME_ROUTE = "/home";
const PROTECTED_PREFIXES = ["/home"];
const PUBLIC_AUTH_ROUTES = [AUTH_ROUTE];

function shouldUseSecureAuthCookies() {
  return process.env.NEXTAUTH_URL?.startsWith("https://") ?? !!process.env.VERCEL;
}

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
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

async function readAuthToken(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;

  if (!secret) {
    return null;
  }

  try {
    return getToken({
      req: request,
      secret,
      secureCookie: shouldUseSecureAuthCookies(),
    });
  } catch {
    return null;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { csp, nonce } = createCsp();
  const token = await readAuthToken(request);
  const isAuthenticated = Boolean(token);
  const isProtected = PROTECTED_PREFIXES.some((route) => pathname.startsWith(route));
  const isAuthRoute = PUBLIC_AUTH_ROUTES.includes(pathname);

  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL(AUTH_ROUTE, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl), csp);
  }

  if (isAuthRoute && isAuthenticated) {
    return applySecurityHeaders(NextResponse.redirect(new URL(HOME_ROUTE, request.url)), csp);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  return applySecurityHeaders(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    csp,
  );
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
