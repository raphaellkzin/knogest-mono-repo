import { describe, expect, it } from "vitest";

import {
  ACCESS_TOKEN_TTL_SECONDS,
  assertCompanyScope,
  createAccessClaims,
  createLoginRateLimitKey,
  isCorporationScopedRouteAllowed,
} from "./auth-policy";

describe("authentication policy", () => {
  it("creates initial claims without a Company and exposes a four-hour contract", () => {
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(4 * 60 * 60);
    expect(
      createAccessClaims({
        userId: "00000000-0000-4000-8000-000000000001",
        corporationId: "00000000-0000-4000-8000-000000000002",
        sessionId: "00000000-0000-4000-8000-000000000003",
        role: "MASTER_ADMIN",
      }),
    ).toEqual({
      userId: "00000000-0000-4000-8000-000000000001",
      corporationId: "00000000-0000-4000-8000-000000000002",
      sessionId: "00000000-0000-4000-8000-000000000003",
      role: "MASTER_ADMIN",
    });
  });

  it("allows only transition/session routes before Company selection", () => {
    expect(isCorporationScopedRouteAllowed("session:inspect")).toBe(true);
    expect(isCorporationScopedRouteAllowed("company:list")).toBe(true);
    expect(isCorporationScopedRouteAllowed("operation:company-owned")).toBe(
      false,
    );
    expect(() => assertCompanyScope({ companyId: undefined })).toThrow(
      "Company context required",
    );
  });

  it("bounds rate-limit keys for malformed hosts without exposing host values", () => {
    const valid = createLoginRateLimitKey("PILOTO.localhost:3000", "127.0.0.1");
    const invalid = createLoginRateLimitKey("https://bad/host", "127.0.0.1");
    expect(valid).toMatch(/^[a-f0-9]{64}:127\.0\.0\.1$/);
    expect(invalid).toMatch(/^[a-f0-9]{64}:127\.0\.0\.1$/);
    expect(valid).not.toContain("piloto");
    expect(invalid).not.toContain("bad");
  });
});
