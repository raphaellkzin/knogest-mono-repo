import { describe, expect, it } from "vitest";
import argon2 from "argon2";

import { hashPassword, verifyPassword } from "./password";

describe("password service", () => {
  it("hashes with Argon2id and verifies without exposing the secret", async () => {
    const hash = await hashPassword("correct horse battery staple");

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain("correct horse battery staple");
    await expect(
      verifyPassword(hash, "correct horse battery staple"),
    ).resolves.toEqual({
      valid: true,
      needsRehash: false,
    });
    await expect(verifyPassword(hash, "wrong password")).resolves.toEqual({
      valid: false,
      needsRehash: false,
    });
  });

  it("detects an outdated Argon2id representation for opportunistic rehash", async () => {
    const oldHash = await argon2.hash("correct horse battery staple", {
      type: argon2.argon2id,
      memoryCost: 4096,
      timeCost: 1,
      parallelism: 1,
    });
    await expect(
      verifyPassword(oldHash, "correct horse battery staple"),
    ).resolves.toEqual({
      valid: true,
      needsRehash: true,
    });
  });
});
