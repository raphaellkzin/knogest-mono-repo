import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";

import type { FastifyInstance } from "fastify";

describe("pilot provisioning", () => {
  const execFileAsync = promisify(execFile);
  let app: FastifyInstance;
  let service: OrganizationService;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    service = new OrganizationService(app.handlerContext);
  });

  beforeEach(async () => {
    await app.prisma.session.deleteMany();
    await app.prisma.company.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.domain.deleteMany();
    await app.prisma.corporation.deleteMany();
  });

  afterAll(() => app.close());

  const provision = (suffix: string, companyNames: string[] = []) =>
    service.provision({
      corporationName: `Pilot ${suffix}`,
      domainHost: `${suffix}.localhost`,
      adminEmail: "master@example.com",
      adminPassword: "strong integration password",
      companyNames,
    });

  it("provisions zero or three Companies and supports a later Company", async () => {
    const empty = await provision("empty");
    expect(empty.companies).toHaveLength(0);
    expect(
      await app.prisma.company.count({
        where: { corporationId: empty.corporation.id },
      }),
    ).toBe(0);
    await service.addCompany({
      corporationId: empty.corporation.id,
      companyName: "Later",
    });

    const full = await provision("full", ["One", "Two", "Three"]);
    expect(full.companies).toHaveLength(3);
    expect(
      await app.prisma.user.findUnique({
        where: {
          corporationId_email: {
            corporationId: full.corporation.id,
            email: "master@example.com",
          },
        },
      }),
    ).toMatchObject({ passwordHash: expect.stringMatching(/^\$argon2id\$/) });
  });

  it("allows the same normalized email in different Corporations", async () => {
    await provision("first");
    await provision("second");
    expect(
      await app.prisma.user.count({ where: { email: "master@example.com" } }),
    ).toBe(2);
  });

  it("rolls back every record after duplicate Domain or mid-command failure", async () => {
    await provision("duplicate");
    const before = await app.prisma.corporation.count();
    await expect(provision("duplicate")).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await expect(provision("rollback", ["Same", "Same"])).rejects.toMatchObject(
      { code: "CONFLICT" },
    );
    expect(await app.prisma.corporation.count()).toBe(before);
    expect(
      await app.prisma.domain.count({ where: { host: "rollback.localhost" } }),
    ).toBe(0);
  });

  it("lets only one concurrent provisioning claim a Domain", async () => {
    const results = await Promise.allSettled([
      provision("race"),
      provision("race"),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      await app.prisma.domain.count({ where: { host: "race.localhost" } }),
    ).toBe(1);
  });

  it("rejects a Session whose Company belongs to another Corporation", async () => {
    const first = await provision("owner", ["Owned"]);
    const second = await provision("foreign", ["Foreign"]);
    await expect(
      app.prisma.session.create({
        data: {
          corporationId: first.corporation.id,
          userId: first.administrator.id,
          companyId: second.companies[0].id,
          idleExpiresAt: new Date(Date.now() + 60_000),
          absoluteExpiresAt: new Date(Date.now() + 120_000),
        },
      }),
    ).rejects.toBeTruthy();
  });

  it("keeps CLI output and failures free of credential material", async () => {
    const secret = "never-print-this-password";
    const { stdout, stderr } = await execFileAsync(
      "sh",
      [
        "-c",
        'printf "%s\\n" "$ADMIN_PASSWORD" | pnpm admin -- provision --corporation-name "CLI Pilot" --domain cli.localhost --admin-email cli@example.com --password-stdin',
      ],
      { cwd: process.cwd(), env: { ...process.env, ADMIN_PASSWORD: secret } },
    );
    expect(stdout).not.toContain(secret);
    expect(stdout).not.toContain("argon2");
    expect(stderr).not.toContain(secret);
    expect(JSON.parse(stdout.trim().split("\n").at(-1) ?? "{}")).toMatchObject({
      success: true,
    });

    await expect(
      execFileAsync(
        "sh",
        [
          "-c",
          'printf "%s\\n" "$ADMIN_PASSWORD" | pnpm admin -- provision --corporation-name "CLI Duplicate" --domain cli.localhost --admin-email other@example.com --password-stdin',
        ],
        { cwd: process.cwd(), env: { ...process.env, ADMIN_PASSWORD: secret } },
      ),
    ).rejects.toMatchObject({ stderr: expect.not.stringContaining(secret) });
  });
});
