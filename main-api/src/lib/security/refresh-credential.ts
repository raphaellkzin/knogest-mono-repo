import { createHash, randomBytes } from "node:crypto";

export function createRefreshCredential(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshCredential(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
