import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET_KEY: z.string().min(32, "JWT_SECRET_KEY must have at least 32 characters"),
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().min(1).default("0.0.0.0"),
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
