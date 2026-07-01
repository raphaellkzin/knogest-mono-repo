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
});
