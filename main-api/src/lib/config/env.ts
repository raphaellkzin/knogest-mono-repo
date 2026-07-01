import "dotenv/config";
import { z } from "zod";

function parseVersionedKeyMap(value: string): Record<string, string> {
  let parsed: unknown;
  const candidates = [value, value.replace(/\\"/g, '"')];
  try {
    parsed = JSON.parse(candidates[0]);
  } catch {
    try {
      parsed = JSON.parse(candidates[1]);
    } catch {
      throw new Error("must be valid JSON");
    }
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("must be a JSON object");
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) {
    throw new Error("must contain at least one key version");
  }

  for (const [version, key] of entries) {
    if (!/^[A-Za-z0-9_.-]{1,64}$/.test(version)) {
      throw new Error("key versions must be stable identifiers");
    }
    if (
      typeof key !== "string" ||
      Buffer.from(key, "base64url").length !== 32
    ) {
      throw new Error("keys must be base64url-encoded 32-byte values");
    }
  }

  return Object.fromEntries(entries) as Record<string, string>;
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET_KEY: z
    .string()
    .min(32, "JWT_SECRET_KEY must have at least 32 characters"),
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().min(1).default("0.0.0.0"),
  PILOT_DOMAIN_HOST: z.string().min(1).default("piloto.localhost"),
  TRUST_PROXY: z.string().min(1).default("127.0.0.1,::1"),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(5),
  LOGIN_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(3_600_000)
    .default(60_000),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  SENSITIVE_DOCUMENT_ACTIVE_KEY_VERSION: z.string().min(1).default("v1"),
  SENSITIVE_DOCUMENT_ENCRYPTION_KEYS: z
    .string()
    .min(1, "SENSITIVE_DOCUMENT_ENCRYPTION_KEYS is required")
    .transform(parseVersionedKeyMap),
  SENSITIVE_DOCUMENT_HMAC_KEYS: z
    .string()
    .min(1, "SENSITIVE_DOCUMENT_HMAC_KEYS is required")
    .transform(parseVersionedKeyMap),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errors = z.flattenError(parsedEnv.error).fieldErrors;
  throw new Error(`Invalid environment variables: ${JSON.stringify(errors)}`);
}

const data = parsedEnv.data;
if (
  !(data.SENSITIVE_DOCUMENT_ACTIVE_KEY_VERSION in
    data.SENSITIVE_DOCUMENT_ENCRYPTION_KEYS) ||
  !(
    data.SENSITIVE_DOCUMENT_ACTIVE_KEY_VERSION in
    data.SENSITIVE_DOCUMENT_HMAC_KEYS
  )
) {
  throw new Error(
    "Invalid environment variables: active sensitive document key version must exist in encryption and HMAC key maps",
  );
}

export const env = parsedEnv.data;
