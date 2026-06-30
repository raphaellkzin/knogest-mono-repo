import { describe, expect, it } from "vitest";

import { assertTrustedOrigin } from "./origin-policy";

describe("trusted origin policy", () => {
  it("accepts same-origin BFF mutations", () => {
    expect(() =>
      assertTrustedOrigin({
        host: "Piloto.localhost:3000",
        origin: "http://piloto.localhost:3000",
        secFetchSite: "same-origin",
      }),
    ).not.toThrow();
  });

  it("rejects missing or foreign origins", () => {
    expect(() =>
      assertTrustedOrigin({ host: "piloto.localhost", origin: null }),
    ).toThrow("Origin header is required");
    expect(() =>
      assertTrustedOrigin({
        host: "piloto.localhost",
        origin: "https://evil.example",
      }),
    ).toThrow("Untrusted origin");
  });
});
