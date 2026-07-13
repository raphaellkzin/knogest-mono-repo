import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ACCESS_TOKEN_TTL_SECONDS } from "../../../src/modules/auth/auth-policy";
import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";
import { resetIntegrationData } from "../reset-integration-data";

import type { FastifyInstance } from "fastify";

describe("Corporation-domain login", () => {
  let app: FastifyInstance;
  let organization: OrganizationService;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    app.get(
      "/test/company-owned",
      { preHandler: [app.requireCompanyScope] },
      async () => ({ ok: true }),
    );
    await app.ready();
    organization = new OrganizationService(app.handlerContext);
  });

  beforeEach(async () => {
    await resetIntegrationData(app.prisma);
  });

  afterAll(() => app.close());

  async function provision(
    host = "login.localhost",
    password = "correct integration password",
  ) {
    return organization.provision({
      corporationName: host,
      domainHost: host,
      adminEmail: "master@example.com",
      adminPassword: password,
      companyNames: [],
    });
  }

  function login(
    host: string,
    email = "master@example.com",
    password = "correct integration password",
  ) {
    return app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { host },
      payload: { email, password },
    });
  }

  function publicFailure(response: Awaited<ReturnType<typeof login>>) {
    const body = response.json();
    return {
      status: response.statusCode,
      body: {
        success: body.success,
        code: body.code,
        message: body.message,
        details: body.details,
      },
    };
  }

  it("creates a hash-only Corporation-scoped Session and a four-hour JWT", async () => {
    const records = await provision();
    const response = await login(
      "LOGIN.localhost:3000",
      " MASTER@example.com ",
    );
    expect(response.statusCode).toBe(200);
    const body = response.json();
    const claims = app.jwt.verify<{
      userId: string;
      corporationId: string;
      sessionId: string;
      role: string;
      companyId?: string;
      iat: number;
      exp: number;
    }>(body.data.accessToken);
    expect(claims).toMatchObject({
      userId: records.administrator.id,
      corporationId: records.corporation.id,
      role: "MASTER_ADMIN",
    });
    expect(claims.companyId).toBeUndefined();
    expect(claims.exp - claims.iat).toBe(ACCESS_TOKEN_TTL_SECONDS);
    expect(body.data.expiresIn).toBe(ACCESS_TOKEN_TTL_SECONDS);

    const session = await app.prisma.session.findUniqueOrThrow({
      where: { id: claims.sessionId },
    });
    expect(session.companyId).toBeNull();
    expect(session.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(session.refreshTokenHash).not.toBe(body.data.refreshToken);
  });

  it("returns an identical generic failure for every enumeration path", async () => {
    const records = await provision();
    await organization.provision({
      corporationName: "Foreign",
      domainHost: "foreign.localhost",
      adminEmail: "master@example.com",
      adminPassword: "foreign integration password",
      companyNames: [],
    });

    const unknownHost = await login("unknown.localhost");
    const malformedHost = await login("bad/host");
    const unknownEmail = await login("login.localhost", "unknown@example.com");
    const wrongPassword = await login(
      "login.localhost",
      "master@example.com",
      "wrong password",
    );
    const crossCorporation = await login(
      "login.localhost",
      "master@example.com",
      "foreign integration password",
    );
    await app.prisma.domain.update({
      where: { id: records.domain.id },
      data: { isActive: false },
    });
    const inactiveDomain = await login("login.localhost");
    await app.prisma.domain.update({
      where: { id: records.domain.id },
      data: { isActive: true },
    });
    await app.prisma.user.update({
      where: { id: records.administrator.id },
      data: { isActive: false },
    });
    const inactiveUser = await login("login.localhost");

    const expected = publicFailure(unknownHost);
    for (const response of [
      malformedHost,
      unknownEmail,
      wrongPassword,
      crossCorporation,
      inactiveDomain,
      inactiveUser,
    ]) {
      expect(publicFailure(response)).toEqual(expected);
    }
    expect(expected).toMatchObject({
      status: 401,
      body: {
        success: false,
        code: "AUTHENTICATION_FAILED",
        message: "Invalid credentials",
      },
    });
  });

  it("revalidates persisted Session and rejects Company-owned routes before handler execution", async () => {
    await provision("scope.localhost");
    const loginResponse = await login("scope.localhost");
    const authorization = `Bearer ${loginResponse.json().data.accessToken}`;

    const inspection = await app.inject({
      method: "GET",
      url: "/api/v1/auth/session",
      headers: { authorization },
    });
    expect(inspection.json().data).toMatchObject({
      scope: "corporation-scoped",
      companyId: null,
    });

    const operational = await app.inject({
      method: "GET",
      url: "/test/company-owned",
      headers: { authorization },
    });
    expect(operational).toMatchObject({ statusCode: 403 });
    expect(operational.json()).toMatchObject({
      code: "COMPANY_CONTEXT_REQUIRED",
    });
  });

  it("rate limits by host and source without locking the User", async () => {
    await provision("limited.localhost");
    const attempts = [];
    for (let index = 0; index < 21; index += 1) {
      attempts.push(
        await login(
          "limited.localhost",
          "master@example.com",
          "wrong password",
        ),
      );
    }
    expect(attempts.at(-1)?.statusCode).toBe(429);
    expect(attempts.at(-1)?.json()).toMatchObject({ code: "RATE_LIMITED" });
    expect(await app.prisma.user.findFirstOrThrow()).toMatchObject({
      isActive: true,
    });
  });

  it("rejects browser-supplied scope fields instead of allowing an override", async () => {
    await provision("trusted.localhost");
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login?corporationId=00000000-0000-4000-8000-000000000099",
      headers: { host: "trusted.localhost" },
      payload: {
        email: "master@example.com",
        password: "correct integration password",
        corporationId: "00000000-0000-4000-8000-000000000099",
        companyId: "00000000-0000-4000-8000-000000000098",
      },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
