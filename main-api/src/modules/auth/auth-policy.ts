import { createHash } from "node:crypto";

import { normalizeHost } from "../../lib/security/normalization";
import { AppError } from "../../lib/utils/appError";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const SESSION_IDLE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AccessClaims {
  userId: string;
  corporationId: string;
  sessionId: string;
  role: "MASTER_ADMIN";
  companyId?: string;
  tokenVersion?: number;
}

export function createAccessClaims(input: AccessClaims): AccessClaims {
  return { ...input };
}

const CORPORATION_SCOPED_OPERATIONS = new Set([
  "session:inspect",
  "company:list",
  "company:select",
  "session:refresh",
  "session:logout",
]);

export function isCorporationScopedRouteAllowed(operation: string): boolean {
  return CORPORATION_SCOPED_OPERATIONS.has(operation);
}

export function assertCompanyScope(context: {
  companyId?: string;
}): asserts context is {
  companyId: string;
} {
  if (!context.companyId) {
    throw new AppError({
      code: "FORBIDDEN",
      message: "Company context required",
      statusCode: 403,
    });
  }
}

export function createLoginRateLimitKey(
  host: string,
  sourceIp: string,
): string {
  let boundedHost = "invalid-host";
  try {
    boundedHost = normalizeHost(host);
  } catch {
    // All malformed values share one bounded host bucket per source IP.
  }
  return `${createHash("sha256").update(boundedHost).digest("hex")}:${sourceIp}`;
}
