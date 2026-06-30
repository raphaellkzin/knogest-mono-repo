import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";

import type { FastifyInstance } from "fastify";

describe("browser Session lifecycle", () => {
  let app: FastifyInstance;
  let organization: OrganizationService;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    app.get(
      "/test/security-sensitive",
      { preHandler: [app.authenticate] },
      async () => ({ ok: true }),
    );
    await app.ready();
    organization = new OrganizationService(app.handlerContext);
  });

  beforeEach(async () => {
    await app.prisma.session.deleteMany();
    await app.prisma.company.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.domain.deleteMany();
    await app.prisma.corporation.deleteMany();
    await organization.provision({
      corporationName: "Lifecycle",
      domainHost: "life.localhost",
      adminEmail: "master@example.com",
      adminPassword: "correct integration password",
      companyNames: ["Norte"],
    });
  });

  afterAll(() => app.close());

  async function login() {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { host: "life.localhost" },
      payload: {
        email: "master@example.com",
        password: "correct integration password",
      },
    });
    expect(response.statusCode).toBe(200);
    return response.json().data as {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
  }

  function refresh(refreshToken: string, origin = "http://life.localhost") {
    return app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: {
        host: "life.localhost",
        origin,
        "sec-fetch-site": "same-origin",
      },
      payload: { refreshToken },
    });
  }

  it("rotates the refresh credential and persists only the replacement hash", async () => {
    const first = await login();
    const rotated = await refresh(first.refreshToken);

    expect(rotated.statusCode).toBe(200);
    const body = rotated.json().data;
    expect(body.refreshToken).not.toBe(first.refreshToken);
    expect(body.accessToken).not.toBe(first.accessToken);

    const session = await app.prisma.session.findFirstOrThrow();
    expect(session.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(session.refreshTokenHash).not.toBe(body.refreshToken);
    expect(session.consumedRefreshTokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(session.refreshConsumedAt).toBeInstanceOf(Date);
  });

  it("revokes the whole Session when a consumed refresh credential is reused", async () => {
    const first = await login();
    const rotated = await refresh(first.refreshToken);
    expect(rotated.statusCode).toBe(200);

    const reused = await refresh(first.refreshToken);
    expect(reused.statusCode).toBe(401);
    expect(reused.json()).toMatchObject({ code: "SESSION_INVALID" });

    const session = await app.prisma.session.findFirstOrThrow();
    expect(session.revokedAt).toBeInstanceOf(Date);
    expect(session.refreshTokenHash).toBeNull();

    const descendant = await refresh(rotated.json().data.refreshToken);
    expect(descendant.statusCode).toBe(401);
  });

  it("rejects idle and absolute expired Sessions regardless of token validity", async () => {
    const first = await login();
    const session = await app.prisma.session.findFirstOrThrow();

    await app.prisma.session.update({
      where: { id: session.id },
      data: { idleExpiresAt: new Date(Date.now() - 1_000) },
    });
    expect((await refresh(first.refreshToken)).statusCode).toBe(401);

    const second = await login();
    const secondSession = await app.prisma.session.findFirstOrThrow({
      where: { refreshTokenHash: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    await app.prisma.session.update({
      where: { id: secondSession.id },
      data: { absoluteExpiresAt: new Date(Date.now() - 1_000) },
    });
    expect((await refresh(second.refreshToken)).statusCode).toBe(401);
  });

  it("revokes on logout and rejects an otherwise valid access JWT", async () => {
    const first = await login();
    const logout = await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        host: "life.localhost",
        origin: "http://life.localhost",
        "sec-fetch-site": "same-origin",
        authorization: `Bearer ${first.accessToken}`,
      },
    });
    expect(logout.statusCode).toBe(200);

    const sensitive = await app.inject({
      method: "GET",
      url: "/test/security-sensitive",
      headers: { authorization: `Bearer ${first.accessToken}` },
    });
    expect(sensitive.statusCode).toBe(401);
  });

  it("rejects cookie-authenticated mutations from untrusted origins", async () => {
    const first = await login();
    const missingOrigin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { host: "life.localhost" },
      payload: { refreshToken: first.refreshToken },
    });
    const foreign = await refresh(first.refreshToken, "https://evil.example");

    expect(missingOrigin.statusCode).toBe(403);
    expect(foreign.statusCode).toBe(403);
  });
});
