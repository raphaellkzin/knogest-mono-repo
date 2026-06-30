import { describe, expect, it } from "vitest";

import { normalizeEmail, normalizeHost } from "./normalization";

describe("normalizeHost", () => {
  it("normalizes case, whitespace, IDN and an allowed numeric port", () => {
    expect(normalizeHost("  PILOTO.localhost:3000 ")).toBe("piloto.localhost");
    expect(normalizeHost("CAFÉ.example")).toBe("xn--caf-dma.example");
  });

  it.each([
    "https://pilot.example",
    "pilot.example/path",
    "user@pilot.example",
    "*.example",
    "bad host",
  ])("rejects unsafe host %s", (host) =>
    expect(() => normalizeHost(host)).toThrow("Invalid host"),
  );
});

describe("normalizeEmail", () => {
  it("normalizes email equality without retaining whitespace or case", () => {
    expect(normalizeEmail("  ADMIN@Example.COM ")).toBe("admin@example.com");
  });

  it("rejects malformed addresses", () => {
    expect(() => normalizeEmail("not-an-email")).toThrow("Invalid email");
  });
});
