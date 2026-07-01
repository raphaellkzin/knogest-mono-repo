import type { PrismaClient } from "../../src/db/generated/prisma/client";
import {
  protectSensitiveDocument,
  toMaskedDocumentDto,
} from "../../src/lib/security/sensitive-document";

const PILOT_CORPORATION_ID = "00000000-0000-4000-8000-000000000001";

const syntheticSensitiveDocumentFixtures = [
  {
    id: "00000000-0000-4000-8000-000000002101",
    companyId: "00000000-0000-4000-8000-000000000101",
    registryType: "CLIENT",
    syntheticDocument: "529.982.247-25",
  },
  {
    id: "00000000-0000-4000-8000-000000002102",
    companyId: "00000000-0000-4000-8000-000000000102",
    registryType: "CLIENT",
    syntheticDocument: "529.982.247-25",
  },
  {
    id: "00000000-0000-4000-8000-000000002103",
    companyId: "00000000-0000-4000-8000-000000000101",
    registryType: "FUEL_SUPPLIER",
    syntheticDocument: "529.982.247-25",
  },
  {
    id: "00000000-0000-4000-8000-000000002104",
    companyId: "00000000-0000-4000-8000-000000000101",
    registryType: "CLIENT",
    syntheticDocument: "11.222.333/0001-81",
  },
] as const;

export async function seedSensitiveDocumentDevelopmentData(
  prisma: PrismaClient,
) {
  const rows = [];

  for (const fixture of syntheticSensitiveDocumentFixtures) {
    const protectedDocument = protectSensitiveDocument({
      document: fixture.syntheticDocument,
      registryType: fixture.registryType,
    });

    const row = await prisma.sensitiveDocumentProtectionHarness.upsert({
      where: { id: fixture.id },
      update: {
        corporationId: PILOT_CORPORATION_ID,
        companyId: fixture.companyId,
        registryType: fixture.registryType,
        documentType: protectedDocument.documentType,
        ciphertext: protectedDocument.ciphertext,
        iv: protectedDocument.iv,
        authTag: protectedDocument.authTag,
        encryptionKeyVersion: protectedDocument.encryptionKeyVersion,
        documentDigest: protectedDocument.documentDigest,
        isActive: true,
      },
      create: {
        id: fixture.id,
        corporationId: PILOT_CORPORATION_ID,
        companyId: fixture.companyId,
        registryType: fixture.registryType,
        documentType: protectedDocument.documentType,
        ciphertext: protectedDocument.ciphertext,
        iv: protectedDocument.iv,
        authTag: protectedDocument.authTag,
        encryptionKeyVersion: protectedDocument.encryptionKeyVersion,
        documentDigest: protectedDocument.documentDigest,
        isActive: true,
      },
      select: {
        id: true,
        companyId: true,
        registryType: true,
        documentType: true,
        ciphertext: true,
        iv: true,
        authTag: true,
        encryptionKeyVersion: true,
      },
    });

    rows.push({
      id: row.id,
      companyId: row.companyId,
      registryType: row.registryType,
      ...toMaskedDocumentDto(row),
      encryptionKeyVersion: row.encryptionKeyVersion,
    });
  }

  return rows;
}
