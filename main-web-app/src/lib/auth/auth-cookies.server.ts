import "server-only";

import { cookies } from "next/headers";

import { getAuthCookiePolicy, type RuntimeEnvironment } from "./auth-cookie";
import { serverEnv } from "@/lib/config/env.server";

const environment: RuntimeEnvironment =
  serverEnv.AUTH_COOKIE_MODE === "secure" ? "production" : "development";

export async function setAuthCookies(input: {
  accessToken: string;
  refreshToken: string;
  accessMaxAge: number;
}) {
  const store = await cookies();
  const policy = getAuthCookiePolicy(environment);
  store.set(policy.accessName, input.accessToken, {
    ...policy.options,
    maxAge: input.accessMaxAge,
  });
  store.set(policy.refreshName, input.refreshToken, {
    ...policy.options,
    maxAge: 30 * 24 * 60 * 60,
  });
}

export async function getApiAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(getAuthCookiePolicy(environment).accessName)?.value ?? null;
}

export async function getApiRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(getAuthCookiePolicy(environment).refreshName)?.value ?? null;
}

export async function setAccessCookie(input: {
  accessToken: string;
  accessMaxAge: number;
}) {
  const store = await cookies();
  const policy = getAuthCookiePolicy(environment);
  store.set(policy.accessName, input.accessToken, {
    ...policy.options,
    maxAge: input.accessMaxAge,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  const policy = getAuthCookiePolicy(environment);
  store.delete(policy.accessName);
  store.delete(policy.refreshName);
}
