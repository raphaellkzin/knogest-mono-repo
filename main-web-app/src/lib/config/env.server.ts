import "server-only";

import { z } from "zod";

const nodeEnvironment = z
  .enum(["development", "test", "production"])
  .parse(process.env.NODE_ENV ?? "development");

export const serverEnv = z
  .object({
    API_BASE_URL: z.string().url().default("http://localhost:3333"),
    AUTH_COOKIE_MODE: z.enum(["secure", "local"]),
  })
  .parse({
    API_BASE_URL: process.env.API_BASE_URL,
    AUTH_COOKIE_MODE:
      process.env.AUTH_COOKIE_MODE ??
      (nodeEnvironment === "production" ? "secure" : "local"),
  });
