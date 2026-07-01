import { describe, expect, it } from "vitest";

import {
  detectDocumentType,
  maskCnpj,
  maskCpf,
  maskDocument,
  normalizeCnpj,
  normalizeCpf,
  validateCnpjChecksum,
  validateCpfChecksum,
  validateDocument,
} from "./document";

describe("CPF and CNPJ document helpers", () => {
  const syntheticCpf = "529.982.247-25";
  const syntheticCnpj = "11.222.333/0001-81";

  it("normalizes CPF and CNPJ to digit-only canonical values", () => {
    expect(normalizeCpf(syntheticCpf)).toBe("52998224725");
    expect(normalizeCnpj(syntheticCnpj)).toBe("11222333000181");
  });

  it("detects document type after normalization", () => {
    expect(detectDocumentType(syntheticCpf)).toBe("CPF");
    expect(detectDocumentType(syntheticCnpj)).toBe("CNPJ");
  });

  it("validates checksum without treating validity as identity proof", () => {
    expect(validateCpfChecksum(syntheticCpf)).toBe(true);
    expect(validateCnpjChecksum(syntheticCnpj)).toBe(true);
    expect(validateDocument(syntheticCpf)).toEqual({
      normalized: "52998224725",
      type: "CPF",
    });
  });

  it("rejects invalid lengths, checksums, and repeated digits", () => {
    expect(() => normalizeCpf("123")).toThrow("Invalid document");
    expect(validateCpfChecksum("111.111.111-11")).toBe(false);
    expect(validateCnpjChecksum("11.222.333/0001-82")).toBe(false);
    expect(() => validateDocument("11.222.333/0001-82")).toThrow(
      "Invalid CNPJ",
    );
  });

  it("masks documents for list and selector responses", () => {
    expect(maskCpf(syntheticCpf)).toBe("***.***.247-25");
    expect(maskCnpj(syntheticCnpj)).toBe("**.***.333/0001-81");
    expect(maskDocument(syntheticCpf)).toBe("***.***.247-25");
    expect(maskDocument(syntheticCnpj)).toBe("**.***.333/0001-81");
  });
});
