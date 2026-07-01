import { describe, expect, it } from "vitest";

import { validatePersonalDataGate } from "../src/lib/security/personal-data-gate";

describe("pilot personal-data gate", () => {
  it("keeps real CPF/CNPJ entry blocked until approval evidence is complete", async () => {
    await expect(validatePersonalDataGate()).resolves.toEqual({
      ok: true,
      errors: [],
    });
  });
});
