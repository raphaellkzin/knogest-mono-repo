import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";
import { resetIntegrationData } from "../reset-integration-data";

import type { FastifyInstance } from "fastify";

describe("workforce Person and Employment registry", () => {
  const syntheticCpfFixture = "529.982.247-25";
  const syntheticCpfNormalizedFixture = "52998224725";

  let app: FastifyInstance;
  let organization: OrganizationService;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    organization = new OrganizationService(app.handlerContext);
  });

  beforeEach(async () => {
    await resetIntegrationData(app.prisma);
  });

  afterAll(() => app.close());

  async function provision(suffix: string) {
    return organization.provision({
      corporationName: `Workforce ${suffix}`,
      domainHost: `workforce-${suffix}.localhost`,
      adminEmail: "master@example.com",
      adminPassword: "correct integration password",
      companyNames: ["One", "Two"],
    });
  }

  async function authFor(input: {
    corporationId: string;
    userId: string;
    companyId: string;
  }) {
    const now = new Date();
    const session = await app.prisma.session.create({
      data: {
        corporationId: input.corporationId,
        userId: input.userId,
        companyId: input.companyId,
        refreshTokenHash: "integration-refresh-token-hash",
        idleExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
    return `Bearer ${app.jwt.sign({
      userId: input.userId,
      corporationId: input.corporationId,
      sessionId: session.id,
      role: "MASTER_ADMIN",
      companyId: input.companyId,
    })}`;
  }

  function payload(registration = "EMP-001") {
    return {
      document: syntheticCpfFixture,
      fullName: "Synthetic Worker",
      companyRegistrationNumber: registration,
      admissionDate: "2026-07-01",
    };
  }

  it("creates a Person, Employment, and first open Employment Period atomically", async () => {
    const pilot = await provision("create");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/employees",
      headers: { authorization },
      payload: payload(),
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().data.person.document.plaintextDocument).toBe(
      syntheticCpfNormalizedFixture,
    );
    expect(await app.prisma.person.count()).toBe(1);
    expect(await app.prisma.employment.count()).toBe(1);
    expect(await app.prisma.employmentPeriod.count()).toBe(1);

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/employees?limit=1&sortBy=name&sortDirection=asc",
      headers: { authorization },
    });
    expect(listed.statusCode).toBe(200);
    expect(JSON.stringify(listed.json())).not.toContain(
      syntheticCpfNormalizedFixture,
    );
    expect(listed.json().data.data[0]).toMatchObject({
      availability: { state: "available", hasOpenAllocation: false },
      employment: { state: "active", admissionDate: "2026-07-01" },
    });
  });

  it("reuses a Person across Companies in the same Corporation and isolates Corporations", async () => {
    const first = await provision("first");
    const second = await provision("second");
    const firstCompanyOne = await authFor({
      corporationId: first.corporation.id,
      userId: first.administrator.id,
      companyId: first.companies[0].id,
    });
    const firstCompanyTwo = await authFor({
      corporationId: first.corporation.id,
      userId: first.administrator.id,
      companyId: first.companies[1].id,
    });
    const secondCompany = await authFor({
      corporationId: second.corporation.id,
      userId: second.administrator.id,
      companyId: second.companies[0].id,
    });

    for (const [authorization, registration] of [
      [firstCompanyOne, "EMP-001"],
      [firstCompanyTwo, "EMP-002"],
      [secondCompany, "EMP-001"],
    ] as const) {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/employees",
        headers: { authorization },
        payload: payload(registration),
      });
      expect(response.statusCode).toBe(201);
    }

    expect(await app.prisma.person.count()).toBe(2);
    expect(await app.prisma.employment.count()).toBe(3);
  });

  it("rejects duplicate active Employment and duplicate active registration numbers", async () => {
    const pilot = await provision("duplicates");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });

    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/employees",
          headers: { authorization },
          payload: payload("EMP-001"),
        })
      ).statusCode,
    ).toBe(201);

    const duplicateEmployment = await app.inject({
      method: "POST",
      url: "/api/v1/employees",
      headers: { authorization },
      payload: payload("EMP-002"),
    });
    expect(duplicateEmployment.statusCode).toBe(409);
    expect(duplicateEmployment.json()).toMatchObject({
      code: "EMPLOYMENT_ALREADY_EXISTS",
    });

    const duplicateRegistration = await app.inject({
      method: "POST",
      url: "/api/v1/employees",
      headers: { authorization },
      payload: {
        document: "111.444.777-35",
        fullName: "Synthetic Second Worker",
        companyRegistrationNumber: "EMP-001",
        admissionDate: "2026-07-02",
      },
    });
    expect(duplicateRegistration.statusCode).toBe(409);
    expect(duplicateRegistration.json()).toMatchObject({
      code: "REGISTRATION_NUMBER_ALREADY_EXISTS",
    });
    expect(await app.prisma.employmentPeriod.count()).toBe(1);
  });
});
