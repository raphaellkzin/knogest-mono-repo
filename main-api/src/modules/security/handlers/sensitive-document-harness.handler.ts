import { AppError } from "../../../lib/utils/appError";
import type { ProtectedSensitiveDocument } from "../../../lib/security/sensitive-document";
import type { HandlerContext } from "../../../lib/utils/handler.dto";

function isActiveDocumentUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export interface CreateSensitiveDocumentHarnessInput {
  corporationId: string;
  companyId: string;
  registryType: string;
  protectedDocument: ProtectedSensitiveDocument;
}

export async function createSensitiveDocumentHarnessHandler(
  context: HandlerContext,
  input: CreateSensitiveDocumentHarnessInput,
) {
  try {
    return await context.prisma.sensitiveDocumentProtectionHarness.create({
      data: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        registryType: input.registryType,
        documentType: input.protectedDocument.documentType,
        ciphertext: input.protectedDocument.ciphertext,
        iv: input.protectedDocument.iv,
        authTag: input.protectedDocument.authTag,
        encryptionKeyVersion: input.protectedDocument.encryptionKeyVersion,
        documentDigest: input.protectedDocument.documentDigest,
      },
      select: {
        id: true,
        corporationId: true,
        companyId: true,
        registryType: true,
        documentType: true,
        ciphertext: true,
        iv: true,
        authTag: true,
        encryptionKeyVersion: true,
        documentDigest: true,
        isActive: true,
      },
    });
  } catch (error) {
    if (isActiveDocumentUniqueError(error)) {
      throw new AppError({
        code: "DOCUMENT_ALREADY_EXISTS",
        message: "Document already exists for this active registry scope",
        statusCode: 409,
      });
    }
    throw error;
  }
}
