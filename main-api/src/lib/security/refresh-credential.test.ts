import { describe, expect, it } from "vitest";

import {
  createRefreshCredential,
  hashRefreshCredential,
} from "./refresh-credential";

describe("refresh credential", () => {
  it("creates opaque material and stores only a deterministic hash", () => {
    const credential = createRefreshCredential();
    expect(credential).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashRefreshCredential(credential)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashRefreshCredential(credential)).toBe(
      hashRefreshCredential(credential),
    );
    expect(hashRefreshCredential(credential)).not.toContain(credential);
  });
});
