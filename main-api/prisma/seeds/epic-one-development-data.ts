import type { PrismaClient } from "../../src/db/generated/prisma/client";
import { hashPassword } from "../../src/lib/security/password";

const PILOT_CORPORATION_ID = "00000000-0000-4000-8000-000000000001";
const PILOT_ADMIN_ID = "00000000-0000-4000-8000-000000000011";
const SIBLING_CORPORATION_ID = "00000000-0000-4000-8000-000000000002";
const SIBLING_ADMIN_ID = "00000000-0000-4000-8000-000000000021";

const pilotCompanies = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    name: "Terraplanagem Norte",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    name: "Mineração Serra Azul",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    name: "Base Sul",
    isActive: true,
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    name: "Canteiro Inativo",
    isActive: false,
  },
] as const;

export async function seedEpicOneDevelopmentData(prisma: PrismaClient) {
  const passwordHash = await hashPassword("1234");
  const siblingPasswordHash = await hashPassword("sibling-password-1234");

  await prisma.corporation.upsert({
    where: { id: PILOT_CORPORATION_ID },
    update: { name: "Pilot Development Corporation", isActive: true },
    create: {
      id: PILOT_CORPORATION_ID,
      name: "Pilot Development Corporation",
      isActive: true,
    },
  });

  await prisma.domain.upsert({
    where: { host: "piloto.localhost" },
    update: { corporationId: PILOT_CORPORATION_ID, isActive: true },
    create: {
      corporationId: PILOT_CORPORATION_ID,
      host: "piloto.localhost",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: {
      corporationId_email: {
        corporationId: PILOT_CORPORATION_ID,
        email: "master@piloto.localhost",
      },
    },
    update: {
      passwordHash,
      role: "MASTER_ADMIN",
      isActive: true,
    },
    create: {
      id: PILOT_ADMIN_ID,
      corporationId: PILOT_CORPORATION_ID,
      email: "master@piloto.localhost",
      passwordHash,
      role: "MASTER_ADMIN",
      isActive: true,
    },
  });

  for (const company of pilotCompanies) {
    await prisma.company.upsert({
      where: {
        corporationId_name: {
          corporationId: PILOT_CORPORATION_ID,
          name: company.name,
        },
      },
      update: {
        isActive: company.isActive,
      },
      create: {
        id: company.id,
        corporationId: PILOT_CORPORATION_ID,
        name: company.name,
        isActive: company.isActive,
      },
    });
  }

  await prisma.corporation.upsert({
    where: { id: SIBLING_CORPORATION_ID },
    update: { name: "Sibling Development Corporation", isActive: true },
    create: {
      id: SIBLING_CORPORATION_ID,
      name: "Sibling Development Corporation",
      isActive: true,
    },
  });

  await prisma.domain.upsert({
    where: { host: "sibling.localhost" },
    update: { corporationId: SIBLING_CORPORATION_ID, isActive: true },
    create: {
      corporationId: SIBLING_CORPORATION_ID,
      host: "sibling.localhost",
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: {
      corporationId_email: {
        corporationId: SIBLING_CORPORATION_ID,
        email: "master@piloto.localhost",
      },
    },
    update: {
      passwordHash: siblingPasswordHash,
      role: "MASTER_ADMIN",
      isActive: true,
    },
    create: {
      id: SIBLING_ADMIN_ID,
      corporationId: SIBLING_CORPORATION_ID,
      email: "master@piloto.localhost",
      passwordHash: siblingPasswordHash,
      role: "MASTER_ADMIN",
      isActive: true,
    },
  });

  await prisma.company.upsert({
    where: {
      corporationId_name: {
        corporationId: SIBLING_CORPORATION_ID,
        name: "Empresa Irmã",
      },
    },
    update: { isActive: true },
    create: {
      id: "00000000-0000-4000-8000-000000000201",
      corporationId: SIBLING_CORPORATION_ID,
      name: "Empresa Irmã",
      isActive: true,
    },
  });

  const pilotAdmin = await prisma.user.findUniqueOrThrow({
    where: {
      corporationId_email: {
        corporationId: PILOT_CORPORATION_ID,
        email: "master@piloto.localhost",
      },
    },
    select: { id: true },
  });
  const siblingAdmin = await prisma.user.findUniqueOrThrow({
    where: {
      corporationId_email: {
        corporationId: SIBLING_CORPORATION_ID,
        email: "master@piloto.localhost",
      },
    },
    select: { id: true },
  });
  const activeCompanies = await prisma.company.findMany({
    where: { corporationId: PILOT_CORPORATION_ID, isActive: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true },
  });
  const inactiveCompany = await prisma.company.findFirst({
    where: { corporationId: PILOT_CORPORATION_ID, name: "Canteiro Inativo" },
    select: { id: true },
  });

  return {
    pilot: {
      corporationId: PILOT_CORPORATION_ID,
      domain: "piloto.localhost",
      adminId: pilotAdmin.id,
      adminEmail: "master@piloto.localhost",
      activeCompanies,
      inactiveCompanyId: inactiveCompany?.id ?? null,
    },
    sibling: {
      corporationId: SIBLING_CORPORATION_ID,
      domain: "sibling.localhost",
      adminId: siblingAdmin.id,
      adminEmail: "master@piloto.localhost",
    },
  };
}
