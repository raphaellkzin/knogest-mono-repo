import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

import { createPrismaClient } from "../../../main-api/src/db/prisma.db";
import { protectSensitiveDocument } from "../../../main-api/src/lib/security/sensitive-document";

const apiRoot = resolve(process.cwd(), "../main-api");
const databaseUrl = "postgres://test:testpass@localhost:5433/knogest_test";
const terminatedEmployeeSyntheticCpfFixture = "111.444.777-35";
const environment: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  TEST_DATABASE_URL: databaseUrl,
  JWT_SECRET_KEY: "e2e-secret-key-with-at-least-thirty-two-characters",
  NODE_ENV: "test" as const,
};

export default function globalSetup() {
  Object.assign(process.env, environment);
  execFileSync("node", ["scripts/reset-test-database.mjs"], {
    cwd: apiRoot,
    env: environment,
    stdio: "inherit",
  });
  const result = spawnSync(
    "pnpm",
    [
      "admin",
      "--",
      "provision",
      "--corporation-name",
      "Pilot E2E Corporation",
      "--domain",
      "piloto.localhost",
      "--admin-email",
      "master@pilot.test",
      "--password-stdin",
    ],
    {
      cwd: apiRoot,
      env: environment,
      input: "correct e2e password\n",
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    throw new Error(`E2E provisioning failed: ${result.stderr}`);
  }
  return seedTerminatedEmployee();
}

async function seedTerminatedEmployee() {
  const { prisma, pool } = createPrismaClient();
  try {
    const corporation = await prisma.corporation.findFirstOrThrow({
      where: { domains: { some: { host: "piloto.localhost" } } },
      select: { id: true },
    });
    const company = await prisma.company.findFirstOrThrow({
      where: { corporationId: corporation.id, isActive: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const protectedDocument = protectSensitiveDocument({
      document: terminatedEmployeeSyntheticCpfFixture,
      registryType: "PERSON",
    });
    const person = await prisma.person.create({
      data: {
        corporationId: corporation.id,
        documentType: "CPF",
        ciphertext: protectedDocument.ciphertext,
        iv: protectedDocument.iv,
        authTag: protectedDocument.authTag,
        encryptionKeyVersion: protectedDocument.encryptionKeyVersion,
        documentDigest: protectedDocument.documentDigest,
        displayName: "Synthetic Rehire Fixture",
        fullName: "Synthetic Rehire Fixture",
      },
      select: { id: true },
    });
    const employment = await prisma.employment.create({
      data: {
        corporationId: corporation.id,
        companyId: company.id,
        personId: person.id,
        companyRegistrationNumber: "E2E-REHIRE",
        isActive: false,
        state: "TERMINATED",
        terminatedAt: new Date("2026-06-30T00:00:00.000Z"),
      },
      select: { id: true },
    });
    await prisma.employmentPeriod.create({
      data: {
        corporationId: corporation.id,
        companyId: company.id,
        employmentId: employment.id,
        admissionDate: new Date("2026-06-01T00:00:00.000Z"),
        effectiveFrom: new Date("2026-06-01T00:00:00.000Z"),
        effectiveTo: new Date("2026-06-30T00:00:00.000Z"),
        terminationReason: "Synthetic termination fixture",
      },
      select: { id: true },
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
