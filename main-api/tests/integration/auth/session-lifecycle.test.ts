import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import { hashRefreshCredential } from "../../../src/lib/security/refresh-credential";
import { AuthService } from "../../../src/modules/auth/auth.service";
import { OrganizationService } from "../../../src/modules/organization/organization.service";
import { resetIntegrationData } from "../reset-integration-data";

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
    await resetIntegrationData(app.prisma);
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
    const consumed = await app.prisma.sessionConsumedRefreshCredential.findMany({
      where: { sessionId: session.id },
    });
    expect(consumed).toEqual([
      expect.objectContaining({
        credentialHash: hashRefreshCredential(first.refreshToken),
        consumedAt: expect.any(Date),
      }),
    ]);
  });

  it("revokes the Session when any historically consumed credential is reused", async () => {
    const first = await login();
    const firstRotation = await refresh(first.refreshToken);
    expect(firstRotation.statusCode).toBe(200);
    const secondRotation = await refresh(
      firstRotation.json().data.refreshToken,
    );
    expect(secondRotation.statusCode).toBe(200);

    const replay = await refresh(first.refreshToken);
    expect(replay.statusCode).toBe(401);
    expect(replay.json()).toMatchObject({ code: "SESSION_INVALID" });

    const session = await app.prisma.session.findFirstOrThrow();
    expect(session.revokedAt).toBeInstanceOf(Date);
    expect(session.refreshTokenHash).toBeNull();
    expect(
      await app.prisma.sessionConsumedRefreshCredential.count({
        where: { sessionId: session.id },
      }),
    ).toBe(2);
    expect(
      (await refresh(secondRotation.json().data.refreshToken)).statusCode,
    ).toBe(401);
  });

  it("revokes a racing refresh family and leaves no usable descendant", async () => {
    const first = await login();
    const [left, right] = await Promise.all([
      refresh(first.refreshToken),
      refresh(first.refreshToken),
    ]);
    expect([left.statusCode, right.statusCode].sort()).toEqual([200, 401]);

    const winner = [left, right].find((response) => response.statusCode === 200);
    expect(winner).toBeDefined();
    const session = await app.prisma.session.findFirstOrThrow();
    expect(session.revokedAt).toBeInstanceOf(Date);
    expect(session.refreshTokenHash).toBeNull();
    expect(
      (await refresh(winner!.json().data.refreshToken)).statusCode,
    ).toBe(401);
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

  it.each(["idleExpiresAt", "absoluteExpiresAt"] as const)(
    "enforces the %s boundary exactly",
    async (field) => {
      const auth = new AuthService(app.handlerContext);
      const before = await login();
      const beforeSession = await app.prisma.session.findFirstOrThrow({
        where: { refreshTokenHash: hashRefreshCredential(before.refreshToken) },
      });
      const cutoff = new Date("2030-01-01T00:00:00.000Z");
      const future = new Date("2030-02-01T00:00:00.000Z");
      const expiryData = {
        idleExpiresAt: field === "idleExpiresAt" ? cutoff : future,
        absoluteExpiresAt: field === "absoluteExpiresAt" ? cutoff : future,
      };
      await app.prisma.session.update({
        where: { id: beforeSession.id },
        data: expiryData,
      });
      await expect(
        auth.refresh({
          refreshToken: before.refreshToken,
          now: new Date(cutoff.getTime() - 1),
        }),
      ).resolves.toBeDefined();

      const at = await login();
      const atSession = await app.prisma.session.findFirstOrThrow({
        where: { refreshTokenHash: hashRefreshCredential(at.refreshToken) },
      });
      await app.prisma.session.update({
        where: { id: atSession.id },
        data: expiryData,
      });
      await expect(
        auth.refresh({ refreshToken: at.refreshToken, now: cutoff }),
      ).rejects.toMatchObject({ code: "SESSION_INVALID" });

      const after = await login();
      const afterSession = await app.prisma.session.findFirstOrThrow({
        where: { refreshTokenHash: hashRefreshCredential(after.refreshToken) },
      });
      await app.prisma.session.update({
        where: { id: afterSession.id },
        data: expiryData,
      });
      await expect(
        auth.refresh({
          refreshToken: after.refreshToken,
          now: new Date(cutoff.getTime() + 1),
        }),
      ).rejects.toMatchObject({ code: "SESSION_INVALID" });
    },
  );

  it("preserves the persisted Company context across refresh", async () => {
    const first = await login();
    const claims = app.jwt.verify<{ sessionId: string }>(first.accessToken);
    const company = await app.prisma.company.findFirstOrThrow();
    await app.prisma.session.update({
      where: { id: claims.sessionId },
      data: { companyId: company.id },
    });

    const rotated = await refresh(first.refreshToken);
    expect(rotated.statusCode).toBe(200);
    expect(
      app.jwt.verify<{ companyId?: string }>(rotated.json().data.accessToken),
    ).toMatchObject({ companyId: company.id });
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
