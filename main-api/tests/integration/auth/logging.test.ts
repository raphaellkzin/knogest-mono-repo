import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";
import { resetIntegrationData } from "../reset-integration-data";

import type { FastifyBaseLogger, FastifyInstance } from "fastify";

describe("authentication logging", () => {
  let app: FastifyInstance;
  const entries: string[] = [];
  const record = (...values: unknown[]) => entries.push(JSON.stringify(values));
  const logger = {
    level: "info",
    fatal: record,
    error: record,
    warn: record,
    info: record,
    debug: record,
    trace: record,
    silent: record,
    child: () => logger,
  } as FastifyBaseLogger;

  beforeAll(async () => {
    app = await buildApp({ loggerInstance: logger });
    await app.ready();
    await resetIntegrationData(app.prisma);
    await new OrganizationService(app.handlerContext).provision({
      corporationName: "Logging",
      domainHost: "logging.localhost",
      adminEmail: "private@example.com",
      adminPassword: "never-log-this-password",
      companyNames: [],
    });
  });

  afterAll(() => app.close());

  it("records safe metadata without credentials or complete host values", async () => {
    entries.length = 0;
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { host: "logging.localhost" },
      payload: {
        email: "private@example.com",
        password: "never-log-this-password",
      },
    });
    const output = entries.join("\n");
    expect(output).toContain("auth.login");
    expect(output).toContain("hostFingerprint");
    expect(output).not.toContain("private@example.com");
    expect(output).not.toContain("never-log-this-password");
    expect(output).not.toContain("logging.localhost");
  });

  it("records scoped refresh, reuse and logout outcomes without credential material", async () => {
    entries.length = 0;
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { host: "logging.localhost" },
      payload: {
        email: "private@example.com",
        password: "never-log-this-password",
      },
    });
    const credentials = login.json().data as {
      accessToken: string;
      refreshToken: string;
    };

    const rotated = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: {
        host: "logging.localhost",
        origin: "http://logging.localhost",
        "sec-fetch-site": "same-origin",
      },
      payload: { refreshToken: credentials.refreshToken },
    });
    expect(rotated.statusCode).toBe(200);
    const refreshLogs = entries
      .filter((entry) => entry.includes("session.refresh"))
      .join("\n");
    expect(refreshLogs).toContain("requestId");
    expect(refreshLogs).toContain("sessionId");
    expect(refreshLogs).toContain("userId");
    expect(refreshLogs).toContain("corporationId");

    await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: {
        host: "logging.localhost",
        origin: "http://logging.localhost",
        "sec-fetch-site": "same-origin",
      },
      payload: { refreshToken: credentials.refreshToken },
    });

    const secondLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { host: "logging.localhost" },
      payload: {
        email: "private@example.com",
        password: "never-log-this-password",
      },
    });
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/logout",
      headers: {
        host: "logging.localhost",
        origin: "http://logging.localhost",
        "sec-fetch-site": "same-origin",
        authorization: `Bearer ${secondLogin.json().data.accessToken}`,
      },
    });
    const output = entries.join("\n");
    expect(output).toContain("refresh-reuse-detected");
    expect(output).toContain("session.logout");
    expect(output).not.toContain(credentials.accessToken);
    expect(output).not.toContain(credentials.refreshToken);
    expect(output).not.toContain(rotated.json().data.refreshToken);
  });
});
