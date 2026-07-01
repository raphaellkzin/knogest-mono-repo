import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";
import { SensitiveDocumentHarnessService } from "../../../src/modules/security/sensitive-document-harness.service";

import type { FastifyInstance } from "fastify";

describe("sensitive document PostgreSQL harness", () => {
  let app: FastifyInstance;
  let organizationService: OrganizationService;
  let harnessService: SensitiveDocumentHarnessService;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    organizationService = new OrganizationService(app.handlerContext);
    harnessService = new SensitiveDocumentHarnessService(app.handlerContext);
  });

  beforeEach(async () => {
    await app.prisma.sensitiveDocumentProtectionHarness.deleteMany();
    await app.prisma.session.deleteMany();
    await app.prisma.company.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.domain.deleteMany();
    await app.prisma.corporation.deleteMany();
  });

  afterAll(() => app.close());

  async function provision(suffix: string) {
    return organizationService.provision({
      corporationName: `Sensitive Documents ${suffix}`,
      domainHost: `sensitive-${suffix}.localhost`,
      adminEmail: "master@example.com",
      adminPassword: "strong integration password",
      companyNames: ["One", "Two"],
    });
  }

  it("rejects the same active digest in the same Company registry without exposing plaintext", async () => {
    const pilot = await provision("conflict");
    const syntheticCpf = "529.982.247-25";
    const normalizedSyntheticCpf = "52998224725";

    await harnessService.create({
      corporationId: pilot.corporation.id,
      companyId: pilot.companies[0].id,
      registryType: "CLIENT",
      document: syntheticCpf,
    });

    await expect(
      harnessService.create({
        corporationId: pilot.corporation.id,
        companyId: pilot.companies[0].id,
        registryType: "CLIENT",
        document: syntheticCpf,
      }),
    ).rejects.toMatchObject({
      code: "DOCUMENT_ALREADY_EXISTS",
      data: null,
      message: expect.not.stringContaining(normalizedSyntheticCpf),
    });

    expect(await app.prisma.sensitiveDocumentProtectionHarness.count()).toBe(1);
    const stored =
      await app.prisma.sensitiveDocumentProtectionHarness.findFirstOrThrow();
    expect(JSON.stringify(stored)).not.toContain(normalizedSyntheticCpf);
    expect(JSON.stringify(stored)).not.toContain(syntheticCpf);
  });

  it("allows the same synthetic document in another Company, Corporation, or registry", async () => {
    const first = await provision("first");
    const second = await provision("second");
    const syntheticCpf = "529.982.247-25";

    await harnessService.create({
      corporationId: first.corporation.id,
      companyId: first.companies[0].id,
      registryType: "CLIENT",
      document: syntheticCpf,
    });
    await harnessService.create({
      corporationId: first.corporation.id,
      companyId: first.companies[1].id,
      registryType: "CLIENT",
      document: syntheticCpf,
    });
    await harnessService.create({
      corporationId: first.corporation.id,
      companyId: first.companies[0].id,
      registryType: "FUEL_SUPPLIER",
      document: syntheticCpf,
    });
    await harnessService.create({
      corporationId: second.corporation.id,
      companyId: second.companies[0].id,
      registryType: "CLIENT",
      document: syntheticCpf,
    });

    expect(await app.prisma.sensitiveDocumentProtectionHarness.count()).toBe(4);
  });

  it("rolls back persistence when document protection fails", async () => {
    const pilot = await provision("rollback");
    const invalidSyntheticCpf = "111.111.111-11";
    await expect(
      harnessService.create({
        corporationId: pilot.corporation.id,
        companyId: pilot.companies[0].id,
        registryType: "CLIENT",
        document: invalidSyntheticCpf,
      }),
    ).rejects.toThrow("Invalid CPF");
    expect(await app.prisma.sensitiveDocumentProtectionHarness.count()).toBe(0);
  });
});
