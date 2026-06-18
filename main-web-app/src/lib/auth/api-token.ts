import "server-only";

import { cookies, headers } from "next/headers";
import { getToken } from "next-auth/jwt";

import type { JWT } from "next-auth/jwt";

export type AppJwt = JWT & {
  userId?: string;
  apiAccessToken?: string;
};

export function getAuthSecret() {
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
}

export function shouldUseSecureAuthCookies() {
  return process.env.NEXTAUTH_URL?.startsWith("https://") ?? !!process.env.VERCEL;
}

export async function getAuthTokenPayload() {
  const secret = getAuthSecret();

  if (!secret) {
    return null;
  }

  try {
    const requestLike = {
      headers: await headers(),
      cookies: await cookies(),
    };

    return (await getToken({
      req: requestLike as never,
      secret,
      secureCookie: shouldUseSecureAuthCookies(),
    })) as AppJwt | null;
  } catch {
    return null;
  }
}

export async function getApiAccessToken() {
  const token = await getAuthTokenPayload();
  return typeof token?.apiAccessToken === "string" ? token.apiAccessToken : null;
}
