import type { PrismaClient } from "../../src/db/generated/prisma/client";

export async function resetIntegrationData(prisma: PrismaClient) {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "projects" CASCADE');
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "machine_meter_reading_references" CASCADE',
  );
  await prisma.machineMeterReadingCorrection.deleteMany();
  await prisma.machineMeterReading.deleteMany();
  await prisma.machineIdentifier.deleteMany();
  await prisma.machineOwnershipPeriod.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.employmentJobRolePeriod.deleteMany();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "employment_periods" CASCADE');
  await prisma.employment.deleteMany();
  await prisma.jobRole.deleteMany();
  await prisma.person.deleteMany();
  await prisma.fuelSupplier.deleteMany();
  await prisma.client.deleteMany();
  await prisma.sensitiveDocumentProtectionHarness.deleteMany();
  await prisma.fuelType.deleteMany();
  await prisma.session.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.corporation.deleteMany();
}
