import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";
import { resetIntegrationData } from "../reset-integration-data";

import type { FastifyInstance } from "fastify";

describe("fleet Machine registry and meter readings", () => {
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
      corporationName: `Fleet ${suffix}`,
      domainHost: `fleet-${suffix}.localhost`,
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

  function payload(identifier = "MCH-001") {
    return {
      companyTag: identifier,
      initialMeterReading: "10.25",
      manufacturer: "Synthetic",
      model: "Loader 200",
      name: `Synthetic Machine ${identifier}`,
      type: "YELLOW_LINE",
    };
  }

  async function createMachine(authorization: string, identifier = "MCH-001") {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/machines",
      headers: { authorization },
      payload: payload(identifier),
    });
    expect(response.statusCode).toBe(201);
    return response.json().data as {
      id: string;
      latestMeterReading: { id: string; value: string };
    };
  }

  it("creates Machine, ownership, identifier, and initial reading atomically", async () => {
    const pilot = await provision("create");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/v1/machines",
      headers: { authorization },
      payload: payload(),
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data).toMatchObject({
      identifiers: { companyTag: { normalizedValue: "MCH001" } },
      latestMeterReading: { value: "10.25", purpose: "INITIAL" },
    });
    expect(await app.prisma.machine.count()).toBe(1);
    expect(await app.prisma.machineOwnershipPeriod.count()).toBe(1);
    expect(await app.prisma.machineIdentifier.count()).toBe(1);
    expect(await app.prisma.machineMeterReading.count()).toBe(1);
  });

  it("rejects duplicate active identifiers only inside the selected Company", async () => {
    const pilot = await provision("duplicates");
    const companyOne = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const companyTwo = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[1].id,
    });
    await createMachine(companyOne);

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/v1/machines",
      headers: { authorization: companyOne },
      payload: payload(),
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({
      code: "MACHINE_IDENTIFIER_CONFLICT",
    });

    const otherCompany = await app.inject({
      method: "POST",
      url: "/api/v1/machines",
      headers: { authorization: companyTwo },
      payload: payload(),
    });
    expect(otherCompany.statusCode).toBe(201);
  });

  it("lists and details Machines through scoped cursor-paginated responses", async () => {
    const pilot = await provision("list");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const created = await createMachine(authorization);

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/machines?limit=1&sortBy=name&sortDirection=asc",
      headers: { authorization },
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data.data[0]).toMatchObject({
      availability: { state: "available", hasOpenAllocation: false },
      latestMeterReading: { value: "10.25" },
    });

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/machines/${created.id}`,
      headers: { authorization },
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.ownership.companyId).toBe(pilot.companies[0].id);
  });

  it("enforces monotonic append and bounded initial reading correction", async () => {
    const pilot = await provision("readings");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const created = await createMachine(authorization);

    const lower = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings`,
      headers: { authorization },
      payload: { value: "9.99" },
    });
    expect(lower.statusCode).toBe(409);
    expect(lower.json()).toMatchObject({ code: "MACHINE_READING_DECREASE" });

    const equal = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings`,
      headers: { authorization },
      payload: { value: "10.25" },
    });
    expect(equal.statusCode).toBe(200);

    const outOfBounds = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings/${created.latestMeterReading.id}/correction`,
      headers: { authorization },
      payload: { value: "10.26", reason: "Typo" },
    });
    expect(outOfBounds.statusCode).toBe(409);
    expect(outOfBounds.json()).toMatchObject({
      code: "MACHINE_READING_NEIGHBOR_BOUND_VIOLATION",
    });
  });
});
