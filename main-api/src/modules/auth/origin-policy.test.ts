import { describe, expect, it } from "vitest";

import { assertTrustedOrigin } from "./origin-policy";

describe("trusted origin policy", () => {
  it("accepts same-origin BFF mutations", () => {
    expect(() =>
      assertTrustedOrigin({
        host: "Piloto.localhost:3000",
        protocol: "http",
        origin: "http://piloto.localhost:3000",
        secFetchSite: "same-origin",
      }),
    ).not.toThrow();
  });

  it("rejects missing or foreign origins", () => {
    expect(() =>
      assertTrustedOrigin({
        host: "piloto.localhost",
        protocol: "http",
        origin: null,
      }),
    ).toThrow("Origin header is required");
    expect(() =>
      assertTrustedOrigin({
        host: "piloto.localhost",
        protocol: "https",
        origin: "https://evil.example",
      }),
    ).toThrow("Untrusted origin");
  });

  it("rejects a protocol downgrade even when the normalized host matches", () => {
    expect(() =>
      assertTrustedOrigin({
        host: "piloto.localhost",
        protocol: "https",
        origin: "http://piloto.localhost",
        secFetchSite: "same-origin",
      }),
    ).toThrow("Untrusted origin");

    expect(() =>
      assertTrustedOrigin({
        host: "piloto.localhost",
        protocol: "https",
        origin: "https://piloto.localhost",
        secFetchSite: "same-origin",
      }),
    ).not.toThrow();
  });
});
