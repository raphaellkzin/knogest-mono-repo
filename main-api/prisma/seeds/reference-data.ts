import type { PrismaClient } from "../../src/db/generated/prisma/client";

export async function seedReferenceData(_prisma: PrismaClient): Promise<void> {
  // The foundation currently uses a database enum for its only immutable role.
  // Future reference tables are seeded idempotently from this credential-free entry point.
}
