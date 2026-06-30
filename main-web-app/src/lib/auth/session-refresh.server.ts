import "server-only";

import axios from "axios";
import { headers as requestHeaders } from "next/headers";

import {
  clearAuthCookies,
  getApiRefreshToken,
  setAuthCookies,
} from "./auth-cookies.server";
import { normalizeHost } from "./normalize-host";
import { serverEnv } from "@/lib/config/env.server";

type RefreshResponse = {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
};

const flights = new Map<string, Promise<boolean>>();

async function getTrustedHost(): Promise<string | null> {
  try {
    const incoming = await requestHeaders();
    return normalizeHost(
      incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "",
    );
  } catch {
    return null;
  }
}

export async function refreshSessionSingleFlight(): Promise<boolean> {
  const refreshToken = await getApiRefreshToken();
  if (!refreshToken) return false;

  const key = await digestForFlight(refreshToken);
  const existing = flights.get(key);
  if (existing) return existing;

  const flight = refreshSession(refreshToken).finally(() =>
    flights.delete(key),
  );
  flights.set(key, flight);
  return flight;
}

async function refreshSession(refreshToken: string): Promise<boolean> {
  const host = await getTrustedHost();
  if (!host) {
    await clearAuthCookies();
    return false;
  }

  try {
    const response = await axios.post<RefreshResponse>(
      "/api/v1/auth/refresh",
      { refreshToken },
      {
        baseURL: serverEnv.API_BASE_URL,
        headers: {
          "X-Forwarded-Host": host,
          Origin: `http://${host}`,
          "Sec-Fetch-Site": "same-origin",
        },
      },
    );
    await setAuthCookies({
      accessToken: response.data.data.accessToken,
      refreshToken: response.data.data.refreshToken,
      accessMaxAge: response.data.data.expiresIn,
    });
    return true;
  } catch {
    await clearAuthCookies();
    return false;
  }
}

async function digestForFlight(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
