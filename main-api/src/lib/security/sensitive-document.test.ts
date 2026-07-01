import { describe, expect, it } from "vitest";

import {
  compareSensitiveDocumentDigests,
  createSensitiveDocumentDigest,
  protectSensitiveDocument,
  redactSensitiveDocumentMetadata,
  redactSensitiveDocumentValue,
  revealSensitiveDocument,
  SensitiveDocumentCryptoError,
  toMaskedDocumentDto,
  toProtectedDocumentDto,
  type SensitiveDocumentKeys,
} from "./sensitive-document";

const keys: SensitiveDocumentKeys = {
  activeKeyVersion: "v1",
  encryptionKeys: {
    v1: "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY",
    v2: "MTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZjA",
  },
  hmacKeys: {
    v1: "ZmVkY2JhOTg3NjU0MzIxMGZlZGNiYTk4NzY1NDMyMTA",
    v2: "YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODk",
  },
};

describe("sensitive document protection", () => {
  const syntheticCpf = "529.982.247-25";
  const normalizedCpf = "52998224725";

  it("encrypts normalized CPF/CNPJ with key version metadata and no plaintext persistence", () => {
    const protectedDocument = protectSensitiveDocument({
      document: syntheticCpf,
      registryType: "CLIENT",
      keys,
    });

    expect(protectedDocument).toMatchObject({
      documentType: "CPF",
      encryptionKeyVersion: "v1",
    });
    expect(protectedDocument.ciphertext).not.toContain(normalizedCpf);
    expect(protectedDocument.documentDigest).not.toContain(normalizedCpf);
    expect(revealSensitiveDocument({ protectedDocument, keys })).toBe(
      normalizedCpf,
    );
  });

  it("uses fresh IVs while keeping equality digest deterministic per registry", () => {
    const first = protectSensitiveDocument({
      document: syntheticCpf,
      registryType: "CLIENT",
      keys,
    });
    const second = protectSensitiveDocument({
      document: syntheticCpf,
      registryType: "CLIENT",
      keys,
    });
    const supplier = protectSensitiveDocument({
      document: syntheticCpf,
      registryType: "FUEL_SUPPLIER",
      keys,
    });

    expect(first.iv).not.toBe(second.iv);
    expect(first.ciphertext).not.toBe(second.ciphertext);
    expect(first.documentDigest).toBe(second.documentDigest);
    expect(first.documentDigest).not.toBe(supplier.documentDigest);
    expect(
      compareSensitiveDocumentDigests(first.documentDigest, second.documentDigest),
    ).toBe(true);
  });

  it("fails safely on wrong auth tag, wrong key, and invalid documents", () => {
    const protectedDocument = protectSensitiveDocument({
      document: syntheticCpf,
      registryType: "CLIENT",
      keys,
    });
    expect(() =>
      revealSensitiveDocument({
        protectedDocument: { ...protectedDocument, authTag: "tampered" },
        keys,
      }),
    ).toThrow(SensitiveDocumentCryptoError);
    expect(() =>
      revealSensitiveDocument({
        protectedDocument: { ...protectedDocument, encryptionKeyVersion: "v2" },
        keys,
      }),
    ).toThrow(SensitiveDocumentCryptoError);
    expect(() =>
      protectSensitiveDocument({
        document: "111.111.111-11",
        registryType: "CLIENT",
        keys,
      }),
    ).toThrow("Invalid CPF");
  });

  it("keeps masked DTOs separate from protected plaintext DTOs", () => {
    const protectedDocument = protectSensitiveDocument({
      document: syntheticCpf,
      registryType: "CLIENT",
      keys,
    });

    expect(toMaskedDocumentDto(protectedDocument)).toEqual({
      documentType: "CPF",
      maskedDocument: "***.***.247-25",
    });
    expect(toProtectedDocumentDto(protectedDocument)).toEqual({
      documentType: "CPF",
      maskedDocument: "***.***.247-25",
      plaintextDocument: normalizedCpf,
    });
  });

  it("redacts document material from strings and metadata", () => {
    const protectedDocument = protectSensitiveDocument({
      document: syntheticCpf,
      registryType: "CLIENT",
      keys,
    });
    const output = redactSensitiveDocumentValue(
      `document=${syntheticCpf} ciphertext=${protectedDocument.ciphertext}`,
    );
    expect(output).not.toContain(syntheticCpf);
    expect(output).not.toContain(protectedDocument.ciphertext);
    expect(redactSensitiveDocumentMetadata({ document: syntheticCpf })).toEqual({
      document: "[REDACTED]",
    });
  });

  it("separates digest key material from encryption key material", () => {
    const digest = createSensitiveDocumentDigest({
      documentType: "CPF",
      normalizedDocument: normalizedCpf,
      registryType: "CLIENT",
      keys,
    });
    const differentHmacKeys = {
      ...keys,
      hmacKeys: { v1: keys.hmacKeys.v2, v2: keys.hmacKeys.v1 },
    };
    expect(
      createSensitiveDocumentDigest({
        documentType: "CPF",
        normalizedDocument: normalizedCpf,
        registryType: "CLIENT",
        keys: differentHmacKeys,
      }),
    ).not.toBe(digest);
  });
});
