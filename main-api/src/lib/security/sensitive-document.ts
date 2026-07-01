import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { env } from "../config/env";
import {
  maskDocument,
  validateDocument,
  type SensitiveDocumentType,
} from "./document";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const DIGEST_ENCODING = "base64url";

export interface SensitiveDocumentKeys {
  activeKeyVersion: string;
  encryptionKeys: Record<string, string>;
  hmacKeys: Record<string, string>;
}

export interface ProtectedSensitiveDocument {
  documentType: SensitiveDocumentType;
  ciphertext: string;
  iv: string;
  authTag: string;
  encryptionKeyVersion: string;
  documentDigest: string;
}

export interface SensitiveDocumentListDto {
  documentType: SensitiveDocumentType;
  maskedDocument: string;
}

export interface SensitiveDocumentProtectedDto extends SensitiveDocumentListDto {
  plaintextDocument: string;
}

export class SensitiveDocumentCryptoError extends Error {
  constructor(message = "Sensitive document operation failed") {
    super(message);
    this.name = "SensitiveDocumentCryptoError";
  }
}

function decodeKey(value: string): Buffer {
  const key = Buffer.from(value, "base64url");
  if (key.length !== 32) {
    throw new SensitiveDocumentCryptoError();
  }
  return key;
}

function assertKeyVersion(keys: SensitiveDocumentKeys, keyVersion: string) {
  if (!keys.encryptionKeys[keyVersion] || !keys.hmacKeys[keyVersion]) {
    throw new SensitiveDocumentCryptoError();
  }
}

export function getSensitiveDocumentKeys(): SensitiveDocumentKeys {
  return {
    activeKeyVersion: env.SENSITIVE_DOCUMENT_ACTIVE_KEY_VERSION,
    encryptionKeys: env.SENSITIVE_DOCUMENT_ENCRYPTION_KEYS,
    hmacKeys: env.SENSITIVE_DOCUMENT_HMAC_KEYS,
  };
}

export function createSensitiveDocumentDigest({
  documentType,
  normalizedDocument,
  registryType,
  keys = getSensitiveDocumentKeys(),
}: {
  documentType: SensitiveDocumentType;
  normalizedDocument: string;
  registryType: string;
  keys?: SensitiveDocumentKeys;
}): string {
  assertKeyVersion(keys, keys.activeKeyVersion);
  const hmacKey = decodeKey(keys.hmacKeys[keys.activeKeyVersion]);
  return createHmac("sha256", hmacKey)
    .update("knogest.sensitive-document.v1", "utf8")
    .update("\0", "utf8")
    .update(registryType, "utf8")
    .update("\0", "utf8")
    .update(documentType, "utf8")
    .update("\0", "utf8")
    .update(normalizedDocument, "utf8")
    .digest(DIGEST_ENCODING);
}

export function protectSensitiveDocument({
  document,
  registryType,
  keys = getSensitiveDocumentKeys(),
}: {
  document: string;
  registryType: string;
  keys?: SensitiveDocumentKeys;
}): ProtectedSensitiveDocument {
  const { normalized, type } = validateDocument(document);
  assertKeyVersion(keys, keys.activeKeyVersion);

  try {
    const encryptionKey = decodeKey(keys.encryptionKeys[keys.activeKeyVersion]);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, encryptionKey, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    const ciphertext = Buffer.concat([
      cipher.update(normalized, "utf8"),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
      documentType: type,
      ciphertext: ciphertext.toString(DIGEST_ENCODING),
      iv: iv.toString(DIGEST_ENCODING),
      authTag: authTag.toString(DIGEST_ENCODING),
      encryptionKeyVersion: keys.activeKeyVersion,
      documentDigest: createSensitiveDocumentDigest({
        documentType: type,
        normalizedDocument: normalized,
        registryType,
        keys,
      }),
    };
  } catch (error) {
    if (error instanceof SensitiveDocumentCryptoError) throw error;
    throw new SensitiveDocumentCryptoError();
  }
}

export function revealSensitiveDocument({
  protectedDocument,
  keys = getSensitiveDocumentKeys(),
}: {
  protectedDocument: Pick<
    ProtectedSensitiveDocument,
    "authTag" | "ciphertext" | "documentType" | "encryptionKeyVersion" | "iv"
  >;
  keys?: SensitiveDocumentKeys;
}): string {
  assertKeyVersion(keys, protectedDocument.encryptionKeyVersion);

  try {
    const decipher = createDecipheriv(
      ALGORITHM,
      decodeKey(keys.encryptionKeys[protectedDocument.encryptionKeyVersion]),
      Buffer.from(protectedDocument.iv, DIGEST_ENCODING),
      { authTagLength: AUTH_TAG_LENGTH },
    );
    decipher.setAuthTag(Buffer.from(protectedDocument.authTag, DIGEST_ENCODING));
    const plaintext = Buffer.concat([
      decipher.update(
        Buffer.from(protectedDocument.ciphertext, DIGEST_ENCODING),
      ),
      decipher.final(),
    ]).toString("utf8");
    const { normalized, type } = validateDocument(plaintext);
    if (type !== protectedDocument.documentType) {
      throw new SensitiveDocumentCryptoError();
    }
    return normalized;
  } catch (error) {
    if (error instanceof SensitiveDocumentCryptoError) throw error;
    throw new SensitiveDocumentCryptoError();
  }
}

export function toMaskedDocumentDto(
  protectedDocument: Pick<
    ProtectedSensitiveDocument,
    "authTag" | "ciphertext" | "documentType" | "encryptionKeyVersion" | "iv"
  >,
): SensitiveDocumentListDto {
  const plaintext = revealSensitiveDocument({ protectedDocument });
  return {
    documentType: protectedDocument.documentType,
    maskedDocument: maskDocument(plaintext),
  };
}

export function toProtectedDocumentDto(
  protectedDocument: Pick<
    ProtectedSensitiveDocument,
    "authTag" | "ciphertext" | "documentType" | "encryptionKeyVersion" | "iv"
  >,
): SensitiveDocumentProtectedDto {
  const plaintextDocument = revealSensitiveDocument({ protectedDocument });
  return {
    documentType: protectedDocument.documentType,
    maskedDocument: maskDocument(plaintextDocument),
    plaintextDocument,
  };
}

export function compareSensitiveDocumentDigests(
  left: string,
  right: string,
): boolean {
  const leftBuffer = Buffer.from(left, DIGEST_ENCODING);
  const rightBuffer = Buffer.from(right, DIGEST_ENCODING);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function redactSensitiveDocumentValue(value: string): string {
  let redacted = value;
  const documentLikePattern =
    /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
  redacted = redacted.replace(documentLikePattern, "[REDACTED_DOCUMENT]");
  redacted = redacted.replace(
    /\b(?:ciphertext|authTag|documentDigest|iv|document|cpf|cnpj)["':=\s]+[A-Za-z0-9_./+=-]{8,}/gi,
    "[REDACTED_DOCUMENT_FIELD]",
  );
  return redacted;
}

export function redactSensitiveDocumentMetadata<T>(value: T): T {
  if (typeof value === "string") {
    return redactSensitiveDocumentValue(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveDocumentMetadata(item)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => {
        if (/cpf|cnpj|document|ciphertext|authTag|digest|iv|key/i.test(key)) {
          return [key, "[REDACTED]"];
        }
        return [key, redactSensitiveDocumentMetadata(nestedValue)];
      }),
    ) as T;
  }
  return value;
}
