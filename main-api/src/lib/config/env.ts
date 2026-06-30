import "dotenv/config";
import { z } from "zod";

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
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errors = z.flattenError(parsedEnv.error).fieldErrors;
  throw new Error(`Invalid environment variables: ${JSON.stringify(errors)}`);
}

export const env = parsedEnv.data;
