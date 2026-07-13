import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createPrismaClient } from "../../../src/db/prisma.db";
import type { PrismaClient } from "../../../src/db/generated/prisma/client";
import { seedEpicOneDevelopmentData } from "../../../prisma/seeds/epic-one-development-data";
import { seedReferenceData } from "../../../prisma/seeds/reference-data";
import { resetIntegrationData } from "../reset-integration-data";

describe("development fixtures", () => {
  let prisma: PrismaClient;
  let closePool: () => Promise<void>;

  beforeAll(() => {
    const client = createPrismaClient();
    prisma = client.prisma;
    closePool = () => client.pool.end();
  });

  beforeEach(async () => {
    await resetIntegrationData(prisma);
    await seedReferenceData(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await closePool();
  });

  it("creates exactly two fully scoped companies with operational fixtures", async () => {
    const seeded = await seedEpicOneDevelopmentData(prisma);

    expect(await prisma.corporation.count()).toBe(1);
    expect(await prisma.company.count()).toBe(2);
    expect(seeded.pilot.companies).toHaveLength(2);

    for (const company of seeded.pilot.companies) {
      const projects = await prisma.project.findMany({
        where: { companyId: company.id },
        select: { id: true },
      });
      const projectIds = projects.map((project) => project.id);
      const [
        employmentCount,
        machineCount,
        clientCount,
        supplierCount,
        baselineCount,
        clientPeriodCount,
        managerCount,
        responsibilityCount,
        scheduleCount,
        scheduleDaysCount,
        breakCount,
        employeeAllocationCount,
        machineAllocationCount,
        fuelAgreementCount,
      ] = await Promise.all([
        prisma.employment.count({ where: { companyId: company.id } }),
        prisma.machineOwnershipPeriod.count({
          where: { companyId: company.id, effectiveTo: null },
        }),
        prisma.client.count({ where: { companyId: company.id } }),
        prisma.fuelSupplier.count({ where: { companyId: company.id } }),
        prisma.projectBaseline.count({
          where: { projectId: { in: projectIds } },
        }),
        prisma.projectClientPeriod.count({
          where: { projectId: { in: projectIds } },
        }),
        prisma.projectManagerTenure.count({
          where: { projectId: { in: projectIds } },
        }),
        prisma.projectTechnicalResponsibility.count({
          where: { projectId: { in: projectIds } },
        }),
        prisma.projectScheduleRevision.count({
          where: { projectId: { in: projectIds } },
        }),
        prisma.projectScheduleDay.count({
          where: { companyId: company.id },
        }),
        prisma.projectBreakTemplate.count({
          where: { companyId: company.id },
        }),
        prisma.projectEmployeeAllocation.count({
          where: { projectId: { in: projectIds } },
        }),
        prisma.projectMachineAllocation.count({
          where: { projectId: { in: projectIds } },
        }),
        prisma.projectFuelAgreement.count({
          where: { projectId: { in: projectIds } },
        }),
      ]);

      expect(projects).toHaveLength(2);
      expect(employmentCount).toBe(3);
      expect(machineCount).toBe(2);
      expect(clientCount).toBe(2);
      expect(supplierCount).toBe(2);
      expect(baselineCount).toBe(2);
      expect(clientPeriodCount).toBe(2);
      expect(managerCount).toBe(2);
      expect(responsibilityCount).toBe(2);
      expect(scheduleCount).toBe(2);
      expect(scheduleDaysCount).toBe(14);
      expect(breakCount).toBe(2);
      expect(employeeAllocationCount).toBe(0);
      expect(machineAllocationCount).toBe(0);
      expect(fuelAgreementCount).toBe(0);
    }
  });

  it("is idempotent for the deterministic development data", async () => {
    await seedEpicOneDevelopmentData(prisma);
    await seedEpicOneDevelopmentData(prisma);

    expect(await prisma.company.count()).toBe(2);
    expect(await prisma.employment.count()).toBe(6);
    expect(await prisma.machine.count()).toBe(4);
    expect(await prisma.client.count()).toBe(4);
    expect(await prisma.fuelSupplier.count()).toBe(4);
    expect(await prisma.project.count()).toBe(4);
  });
});
