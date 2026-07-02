import "server-only";

import { createHash } from "node:crypto";
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

type RefreshedCredentials = RefreshResponse["data"];
type RefreshTransportResult =
  | { kind: "refreshed"; credentials: RefreshedCredentials }
  | { kind: "terminal" }
  | { kind: "retryable" };
export type SessionRefreshResult = Exclude<
  RefreshTransportResult,
  { kind: "refreshed" }
> | { kind: "refreshed" };

const flights = new Map<string, Promise<RefreshTransportResult>>();

async function getTrustedRequestContext(): Promise<{
  host: string;
  protocol: "http" | "https";
} | null> {
  try {
    const incoming = await requestHeaders();
    const host = normalizeHost(
      incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "",
    );
    const forwardedProtocol = incoming
      .get("x-forwarded-proto")
      ?.split(",", 1)[0]
      ?.trim()
      .toLowerCase();
    const protocol =
      forwardedProtocol === "http" || forwardedProtocol === "https"
        ? forwardedProtocol
        : serverEnv.AUTH_COOKIE_MODE === "secure"
          ? "https"
          : "http";
    return { host, protocol };
  } catch {
    return null;
  }
}

export async function refreshSessionSingleFlight(): Promise<SessionRefreshResult> {
  const refreshToken = await getApiRefreshToken();
  if (!refreshToken) {
    await clearAuthCookies();
    return { kind: "terminal" };
  }

  const key = digestForFlight(refreshToken);
  let flight = flights.get(key);
  if (!flight) {
    flight = Promise.resolve()
      .then(() => refreshSession(refreshToken))
      .finally(() => flights.delete(key));
    flights.set(key, flight);
  }

  const result = await flight;
  if (result.kind === "refreshed") {
    await setAuthCookies({
      accessToken: result.credentials.accessToken,
      refreshToken: result.credentials.refreshToken,
      accessMaxAge: result.credentials.expiresIn,
    });
    return { kind: "refreshed" };
  }
  if (result.kind === "terminal") await clearAuthCookies();
  return result;
}

async function refreshSession(
  refreshToken: string,
): Promise<RefreshTransportResult> {
  const trusted = await getTrustedRequestContext();
  if (!trusted) return { kind: "terminal" };

  try {
    const response = await axios.post<RefreshResponse>(
      "/api/v1/auth/refresh",
      { refreshToken },
      {
        baseURL: serverEnv.API_BASE_URL,
        headers: {
          "X-Forwarded-Host": trusted.host,
          "X-Forwarded-Proto": trusted.protocol,
          Origin: `${trusted.protocol}://${trusted.host}`,
          "Sec-Fetch-Site": "same-origin",
        },
      },
    );
    return { kind: "refreshed", credentials: response.data.data };
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response &&
      [400, 401, 403].includes(error.response.status)
    ) {
      return { kind: "terminal" };
    }
    return { kind: "retryable" };
  }
}

function digestForFlight(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
