import { describe, expect, it } from "vitest";

import { getAuthCookiePolicy } from "./auth-cookie";

describe("authentication cookie policy", () => {
  it("uses __Host-, Secure and host-only attributes in production", () => {
    expect(getAuthCookiePolicy("production")).toEqual({
      accessName: "__Host-knogest-access",
      refreshName: "__Host-knogest-refresh",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: true },
    });
  });

  it("relaxes only cookie names and Secure for local HTTP", () => {
    expect(getAuthCookiePolicy("development")).toEqual({
      accessName: "knogest-access",
      refreshName: "knogest-refresh",
      options: { httpOnly: true, sameSite: "lax", path: "/", secure: false },
    });
  });
});
