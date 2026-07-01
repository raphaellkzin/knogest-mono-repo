import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import {
  encodeCursor,
  hashCanonicalValue,
} from "../../../src/lib/utils/cursor-pagination";
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

  function platePayload(identifier = "ABC-1D23") {
    return {
      initialMeterReading: "0",
      manufacturer: "Synthetic",
      model: "Truck 100",
      name: `Plate Machine ${identifier}`,
      plate: identifier,
      type: "WHITE_LINE",
    };
  }

  function bothIdentifiersPayload(identifier = "BOTH-001") {
    return {
      ...payload(identifier),
      plate: "XYZ-9A99",
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

  it("accepts plate-only and both-identifier Machines", async () => {
    const pilot = await provision("identifiers");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });

    const plateOnly = await app.inject({
      method: "POST",
      url: "/api/v1/machines",
      headers: { authorization },
      payload: platePayload(),
    });
    expect(plateOnly.statusCode).toBe(201);
    expect(plateOnly.json().data.identifiers).toMatchObject({
      plate: { normalizedValue: "ABC1D23" },
      companyTag: null,
    });

    const both = await app.inject({
      method: "POST",
      url: "/api/v1/machines",
      headers: { authorization },
      payload: bothIdentifiersPayload(),
    });
    expect(both.statusCode).toBe(201);
    expect(both.json().data.identifiers).toMatchObject({
      plate: { normalizedValue: "XYZ9A99" },
      companyTag: { normalizedValue: "BOTH001" },
    });
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
    expect(await app.prisma.machine.count()).toBe(1);
    expect(await app.prisma.machineOwnershipPeriod.count()).toBe(1);
    expect(await app.prisma.machineIdentifier.count()).toBe(1);
    expect(await app.prisma.machineMeterReading.count()).toBe(1);

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

  it("keeps nested identifiers and readings scoped to the selected Company", async () => {
    const pilot = await provision("nested-scope");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const created = await createMachine(authorization);

    await app.prisma.machineIdentifier.create({
      data: {
        corporationId: pilot.corporation.id,
        companyId: pilot.companies[1].id,
        machineId: created.id,
        kind: "COMPANY_TAG",
        value: "FOREIGN-999",
        normalizedValue: "FOREIGN999",
      },
    });
    await app.prisma.machineMeterReading.create({
      data: {
        actorUserId: pilot.administrator.id,
        corporationId: pilot.corporation.id,
        companyId: pilot.companies[1].id,
        machineId: created.id,
        purpose: "ORDINARY",
        readingSequence: 2,
        value: "999.99",
      },
    });

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/machines/${created.id}`,
      headers: { authorization },
    });

    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.identifiers.companyTag.normalizedValue).toBe(
      "MCH001",
    );
    expect(detail.json().data.latestMeterReading.value).toBe("10.25");
  });

  it("enforces one open ownership period per Machine across Companies", async () => {
    const pilot = await provision("ownership");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const created = await createMachine(authorization);

    await expect(
      app.prisma.machineOwnershipPeriod.create({
        data: {
          corporationId: pilot.corporation.id,
          companyId: pilot.companies[1].id,
          machineId: created.id,
        },
      }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("traverses pagination and rejects stale or foreign-scope cursors", async () => {
    const pilot = await provision("pagination");
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
    await createMachine(companyOne, "MCH-001");
    await createMachine(companyOne, "MCH-002");

    const firstPage = await app.inject({
      method: "GET",
      url: "/api/v1/machines?limit=1&sortBy=name&sortDirection=asc",
      headers: { authorization: companyOne },
    });
    expect(firstPage.statusCode).toBe(200);
    const firstPageBody = firstPage.json().data;
    const cursor = firstPageBody.pageInfo.nextCursor;
    expect(cursor).toEqual(expect.any(String));
    expect(firstPageBody.pageInfo.hasNextPage).toBe(true);

    const secondPage = await app.inject({
      method: "GET",
      url: `/api/v1/machines?limit=1&sortBy=name&sortDirection=asc&cursor=${cursor}`,
      headers: { authorization: companyOne },
    });
    expect(secondPage.statusCode).toBe(200);
    const secondPageBody = secondPage.json().data;
    expect(secondPageBody.data).toHaveLength(1);
    expect(secondPageBody.data[0].id).not.toBe(firstPageBody.data[0].id);
    expect(secondPageBody.pageInfo).toEqual({
      hasNextPage: false,
      nextCursor: null,
    });

    const staleQuery = await app.inject({
      method: "GET",
      url: `/api/v1/machines?limit=1&sortBy=createdAt&sortDirection=asc&cursor=${cursor}`,
      headers: { authorization: companyOne },
    });
    expect(staleQuery.statusCode).toBe(400);

    const foreignScope = await app.inject({
      method: "GET",
      url: `/api/v1/machines?limit=1&sortBy=name&sortDirection=asc&cursor=${cursor}`,
      headers: { authorization: companyTwo },
    });
    expect(foreignScope.statusCode).toBe(400);
  });

  it("rejects non-canonical cursor boundaries", async () => {
    const pilot = await provision("invalid-boundary");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const normalizedQuery = {
      availability: null,
      search: null,
      sortBy: "createdAt",
      sortDirection: "desc",
      type: null,
    };
    const cursor = encodeCursor({
      v: 1,
      resource: "machines",
      scopeHash: hashCanonicalValue({
        corporationId: pilot.corporation.id,
        companyId: pilot.companies[0].id,
      }),
      queryHash: hashCanonicalValue(normalizedQuery),
      sortBy: "createdAt",
      sortDirection: "desc",
      last: {
        id: "00000000-0000-4000-8000-000000000000",
        value: "not-a-date",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: `/api/v1/machines?sortBy=createdAt&sortDirection=desc&cursor=${cursor}`,
      headers: { authorization },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });

    const normalizedDateCursor = encodeCursor({
      v: 1,
      resource: "machines",
      scopeHash: hashCanonicalValue({
        corporationId: pilot.corporation.id,
        companyId: pilot.companies[0].id,
      }),
      queryHash: hashCanonicalValue(normalizedQuery),
      sortBy: "createdAt",
      sortDirection: "desc",
      last: {
        id: "00000000-0000-4000-8000-000000000000",
        value: "2026-02-30T00:00:00.000Z",
      },
    });
    const normalizedDateResponse = await app.inject({
      method: "GET",
      url: `/api/v1/machines?sortBy=createdAt&sortDirection=desc&cursor=${normalizedDateCursor}`,
      headers: { authorization },
    });
    expect(normalizedDateResponse.statusCode).toBe(400);
    expect(normalizedDateResponse.json()).toMatchObject({
      code: "VALIDATION_ERROR",
    });

    const invalidIdCursor = encodeCursor({
      v: 1,
      resource: "machines",
      scopeHash: hashCanonicalValue({
        corporationId: pilot.corporation.id,
        companyId: pilot.companies[0].id,
      }),
      queryHash: hashCanonicalValue(normalizedQuery),
      sortBy: "createdAt",
      sortDirection: "desc",
      last: { id: "not-a-uuid", value: new Date().toISOString() },
    });
    const invalidIdResponse = await app.inject({
      method: "GET",
      url: `/api/v1/machines?sortBy=createdAt&sortDirection=desc&cursor=${invalidIdCursor}`,
      headers: { authorization },
    });
    expect(invalidIdResponse.statusCode).toBe(400);
    expect(invalidIdResponse.json()).toMatchObject({
      code: "VALIDATION_ERROR",
    });
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
    expect(equal.json().data.latestMeterReading.value).toBe("10.25");

    const increasing = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings`,
      headers: { authorization },
      payload: { value: "12.00" },
    });
    expect(increasing.statusCode).toBe(200);
    expect(increasing.json().data.latestMeterReading.value).toBe("12.00");

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
    const unchangedInitial = await app.prisma.machineMeterReading.findUnique({
      where: { id: created.latestMeterReading.id },
      select: { value: true },
    });
    expect(String(unchangedInitial?.value)).toBe("10.25");
    expect(await app.prisma.machineMeterReadingCorrection.count()).toBe(0);
  });

  it("preserves exact numeric(14,2) values across create, correction, and append", async () => {
    const pilot = await provision("decimal-boundary");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const createdResponse = await app.inject({
      method: "POST",
      url: "/api/v1/machines",
      headers: { authorization },
      payload: {
        ...payload("DECIMAL-MAX"),
        initialMeterReading: "999999999999.97",
      },
    });
    expect(createdResponse.statusCode).toBe(201);
    const created = createdResponse.json().data;
    expect(created.latestMeterReading.value).toBe("999999999999.97");

    const correction = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings/${created.latestMeterReading.id}/correction`,
      headers: { authorization },
      payload: {
        value: "999999999999.98",
        reason: "Boundary precision correction",
      },
    });
    expect(correction.statusCode).toBe(200);
    expect(correction.json().data.latestMeterReading.value).toBe(
      "999999999999.98",
    );

    const append = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings`,
      headers: { authorization },
      payload: { value: "999999999999.99" },
    });
    expect(append.statusCode).toBe(200);
    expect(append.json().data.latestMeterReading.value).toBe(
      "999999999999.99",
    );

    const readings = await app.prisma.machineMeterReading.findMany({
      where: { machineId: created.id },
      orderBy: { readingSequence: "asc" },
      select: { value: true },
    });
    expect(readings.map(({ value }) => String(value))).toEqual([
      "999999999999.98",
      "999999999999.99",
    ]);
    const audit =
      await app.prisma.machineMeterReadingCorrection.findFirstOrThrow({
        where: { readingId: created.latestMeterReading.id },
      });
    expect(String(audit.oldValue)).toBe("999999999999.97");
    expect(String(audit.newValue)).toBe("999999999999.98");
  });

  it("permits eligible initial reading correction and preserves audit", async () => {
    const pilot = await provision("correction");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const created = await createMachine(authorization);

    const correction = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings/${created.latestMeterReading.id}/correction`,
      headers: { authorization },
      payload: { value: "10.00", reason: "Initial reading typo" },
    });

    expect(correction.statusCode).toBe(200);
    expect(correction.json().data.latestMeterReading.value).toBe("10.00");
    const audit =
      await app.prisma.machineMeterReadingCorrection.findFirstOrThrow();
    expect(audit.actorUserId).toBe(pilot.administrator.id);
    expect(String(audit.oldValue)).toBe("10.25");
    expect(String(audit.newValue)).toBe("10");
    expect(audit.reason).toBe("Initial reading typo");
  });

  it("rejects referenced and ordinary reading corrections", async () => {
    const pilot = await provision("immutable");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const created = await createMachine(authorization);

    await app.prisma.machineMeterReadingReference.create({
      data: {
        corporationId: pilot.corporation.id,
        companyId: pilot.companies[0].id,
        machineId: created.id,
        readingId: created.latestMeterReading.id,
        sourceType: "TEST_REFERENCE",
        sourceId: "reference-1",
      },
    });

    const referenced = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings/${created.latestMeterReading.id}/correction`,
      headers: { authorization },
      payload: { value: "10.00", reason: "Referenced reading typo" },
    });
    expect(referenced.statusCode).toBe(409);
    expect(referenced.json()).toMatchObject({
      code: "MACHINE_READING_IMMUTABLE",
    });

    const ordinary = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings`,
      headers: { authorization },
      payload: { value: "11.00" },
    });
    const ordinaryReadingId = ordinary.json().data.latestMeterReading.id;

    const ordinaryCorrection = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings/${ordinaryReadingId}/correction`,
      headers: { authorization },
      payload: { value: "11.50", reason: "Ordinary reading typo" },
    });
    expect(ordinaryCorrection.statusCode).toBe(409);
    expect(ordinaryCorrection.json()).toMatchObject({
      code: "MACHINE_READING_IMMUTABLE",
    });
  });

  it("keeps concurrent appends in a non-decreasing sequence", async () => {
    const pilot = await provision("concurrent");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const created = await createMachine(authorization);

    const responses = await Promise.all([
      app.inject({
        method: "POST",
        url: `/api/v1/machines/${created.id}/meter-readings`,
        headers: { authorization },
        payload: { value: "11.00" },
      }),
      app.inject({
        method: "POST",
        url: `/api/v1/machines/${created.id}/meter-readings`,
        headers: { authorization },
        payload: { value: "12.00" },
      }),
    ]);
    expect(responses.some((response) => response.statusCode === 200)).toBe(
      true,
    );
    expect(
      responses.every((response) => [200, 409].includes(response.statusCode)),
    ).toBe(true);

    const readings = await app.prisma.machineMeterReading.findMany({
      where: { machineId: created.id },
      orderBy: { readingSequence: "asc" },
      select: { readingSequence: true, value: true },
    });
    expect(readings.map((reading) => reading.readingSequence)).toEqual(
      readings.map((_, index) => index + 1),
    );
    const values = readings.map((reading) => Number(String(reading.value)));
    expect(values).toEqual([...values].sort((left, right) => left - right));
  });

  it("does not disclose Machines through foreign-scope reading commands", async () => {
    const pilot = await provision("reading-scope");
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
    const created = await createMachine(companyOne);

    const append = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings`,
      headers: { authorization: companyTwo },
      payload: { value: "11.00" },
    });
    expect(append.statusCode).toBe(404);

    const correction = await app.inject({
      method: "POST",
      url: `/api/v1/machines/${created.id}/meter-readings/${created.latestMeterReading.id}/correction`,
      headers: { authorization: companyTwo },
      payload: { value: "10.00", reason: "Foreign correction" },
    });
    expect(correction.statusCode).toBe(404);
  });
});
