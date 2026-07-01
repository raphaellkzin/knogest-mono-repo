import type { PrismaClient } from "../../src/db/generated/prisma/client";

export async function seedReferenceData(_prisma: PrismaClient): Promise<void> {
  const prisma = _prisma;
  await prisma.fuelType.upsert({
    where: { id: "diesel-s10" },
    update: {},
    create: { id: "diesel-s10", name: "Diesel S10" },
  });
  await prisma.fuelType.upsert({
    where: { id: "diesel-s500" },
    update: {},
    create: { id: "diesel-s500", name: "Diesel S500" },
  });
}
