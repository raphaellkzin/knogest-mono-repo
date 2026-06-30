import { describe, expect, it } from "vitest";

import { normalizeHost } from "./normalize-host";

describe("BFF host normalization", () => {
  it("preserves one normalized trusted host", () => {
    expect(normalizeHost(" PILOTO.localhost:3000 ")).toBe("piloto.localhost");
  });

  it.each(["https://pilot.localhost", "pilot.localhost/path", "*.localhost"])(
    "rejects malformed host %s",
    (host) => expect(() => normalizeHost(host)).toThrow(),
  );
});
