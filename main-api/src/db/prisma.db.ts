import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "../lib/config/env";

export const createPrismaClient = () => {
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return { prisma, pool };
};
