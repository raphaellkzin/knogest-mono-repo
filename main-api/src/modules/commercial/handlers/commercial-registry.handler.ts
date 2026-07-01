import type { Prisma } from "../../../db/generated/prisma/client";
import { AppError } from "../../../lib/utils/appError";
import type {
  CursorBoundary,
  SortDirection,
} from "../../../lib/utils/cursor-pagination";
import type { HandlerContext } from "../../../lib/utils/handler.dto";

type RegistryKind = "client" | "fuelSupplier";
type EntityType = "INDIVIDUAL" | "LEGAL_ENTITY";

export interface CommercialRegistryRecord {
  id: string;
  corporationId: string;
  companyId: string;
  entityType: EntityType;
  documentType: "CPF" | "CNPJ";
  ciphertext: string;
  iv: string;
  authTag: string;
  encryptionKeyVersion: string;
  documentDigest: string;
  displayName: string;
  fullName: string | null;
  legalName: string | null;
  tradeName: string | null;
  phone: string | null;
  email: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  isActive: boolean;
  removedAt: Date | null;
  removedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommercialRemovalBlocker {
  projectIds: string[];
  action: "replace_client" | "end_fuel_agreement";
}

export interface CommercialRegistryCreateData {
  corporationId: string;
  companyId: string;
  entityType: EntityType;
  documentType: "CPF" | "CNPJ";
  ciphertext: string;
  iv: string;
  authTag: string;
  encryptionKeyVersion: string;
  documentDigest: string;
  displayName: string;
  fullName?: string;
  legalName?: string;
  tradeName?: string;
  phone?: string;
  email?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  postalCode?: string;
}

const registrySelect = {
  id: true,
  corporationId: true,
  companyId: true,
  entityType: true,
  documentType: true,
  ciphertext: true,
  iv: true,
  authTag: true,
  encryptionKeyVersion: true,
  documentDigest: true,
  displayName: true,
  fullName: true,
  legalName: true,
  tradeName: true,
  phone: true,
  email: true,
  addressLine: true,
  city: true,
  state: true,
  postalCode: true,
  isActive: true,
  removedAt: true,
  removedByUserId: true,
  createdAt: true,
  updatedAt: true,
};

function isUniqueError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function duplicateDocumentError(): AppError {
  return new AppError({
    code: "DOCUMENT_ALREADY_EXISTS",
    message: "Document already exists for this active registry scope",
    statusCode: 409,
  });
}

function notFoundError(): AppError {
  return new AppError({
    code: "NOT_FOUND",
    message: "Registry record not found",
    statusCode: 404,
  });
}

function unavailableError(): AppError {
  return new AppError({
    code: "REGISTRY_RECORD_UNAVAILABLE",
    message: "Registry record is unavailable for operational use",
    statusCode: 404,
  });
}

export async function createCommercialRegistryHandler(
  context: HandlerContext,
  kind: RegistryKind,
  data: CommercialRegistryCreateData,
): Promise<CommercialRegistryRecord> {
  try {
    if (kind === "client") {
      return (await context.prisma.client.create({
        data,
        select: registrySelect,
      })) as CommercialRegistryRecord;
    }
    return (await context.prisma.fuelSupplier.create({
      data,
      select: registrySelect,
    })) as CommercialRegistryRecord;
  } catch (error) {
    if (isUniqueError(error)) throw duplicateDocumentError();
    throw error;
  }
}

function boundaryWhere({
  boundary,
  sortBy,
  sortDirection,
}: {
  boundary: CursorBoundary | null;
  sortBy: "name" | "createdAt";
  sortDirection: SortDirection;
}): Prisma.ClientWhereInput | Prisma.FuelSupplierWhereInput | undefined {
  if (!boundary) return undefined;
  if (sortBy === "createdAt") {
    const createdAt = new Date(String(boundary.value));
    return sortDirection === "asc"
      ? {
          OR: [
            { createdAt: { gt: createdAt } },
            { createdAt, id: { gt: boundary.id } },
          ],
        }
      : {
          OR: [
            { createdAt: { lt: createdAt } },
            { createdAt, id: { lt: boundary.id } },
          ],
        };
  }

  const displayName = String(boundary.value);
  return sortDirection === "asc"
    ? {
        OR: [
          { displayName: { gt: displayName } },
          { displayName, id: { gt: boundary.id } },
        ],
      }
    : {
        OR: [
          { displayName: { lt: displayName } },
          { displayName, id: { lt: boundary.id } },
        ],
      };
}

function orderBy({
  sortBy,
  sortDirection,
}: {
  sortBy: "name" | "createdAt";
  sortDirection: SortDirection;
}): Prisma.ClientOrderByWithRelationInput[] {
  const field = sortBy === "name" ? "displayName" : "createdAt";
  return [{ [field]: sortDirection }, { id: sortDirection }];
}

function searchWhere(
  search?: string,
): Prisma.ClientWhereInput | Prisma.FuelSupplierWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { displayName: { contains: search, mode: "insensitive" } },
      { tradeName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ],
  };
}

export async function listCommercialRegistryHandler(
  context: HandlerContext,
  kind: RegistryKind,
  input: {
    corporationId: string;
    companyId: string;
    entityType?: "INDIVIDUAL" | "LEGAL_ENTITY";
    search?: string;
    limit: number;
    boundary: CursorBoundary | null;
    sortBy: "name" | "createdAt";
    sortDirection: SortDirection;
  },
): Promise<CommercialRegistryRecord[]> {
  const where = {
    corporationId: input.corporationId,
    companyId: input.companyId,
    isActive: true,
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...searchWhere(input.search),
    ...boundaryWhere(input),
  };
  if (kind === "client") {
    return (await context.prisma.client.findMany({
      where: where as Prisma.ClientWhereInput,
      orderBy: orderBy(input),
      take: input.limit + 1,
      select: registrySelect,
    })) as CommercialRegistryRecord[];
  }
  return (await context.prisma.fuelSupplier.findMany({
    where: where as Prisma.FuelSupplierWhereInput,
    orderBy: orderBy(input) as Prisma.FuelSupplierOrderByWithRelationInput[],
    take: input.limit + 1,
    select: registrySelect,
  })) as CommercialRegistryRecord[];
}

export async function findCommercialRegistryDetailHandler(
  context: HandlerContext,
  kind: RegistryKind,
  input: { corporationId: string; companyId: string; id: string },
): Promise<CommercialRegistryRecord> {
  const where = {
    id: input.id,
    corporationId: input.corporationId,
    companyId: input.companyId,
    isActive: true,
  };
  const record =
    kind === "client"
      ? ((await context.prisma.client.findFirst({
          where,
          select: registrySelect,
        })) as CommercialRegistryRecord | null)
      : ((await context.prisma.fuelSupplier.findFirst({
          where,
          select: registrySelect,
        })) as CommercialRegistryRecord | null);

  if (!record) throw notFoundError();
  return record;
}

export async function findCommercialRegistryForRemovalHandler(
  context: HandlerContext,
  kind: RegistryKind,
  input: { corporationId: string; companyId: string; id: string },
): Promise<CommercialRegistryRecord> {
  return findCommercialRegistryDetailHandler(context, kind, input);
}

export async function findCommercialRemovalBlockersHandler(
  context: HandlerContext,
  kind: RegistryKind,
  input: { corporationId: string; companyId: string; id: string },
): Promise<CommercialRemovalBlocker | null> {
  if (kind === "client") {
    const rows = await context.prisma.projectClientPeriod.findMany({
      where: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        clientId: input.id,
        effectiveTo: null,
      },
      select: { projectId: true },
      take: 100,
    });
    return rows.length
      ? {
          projectIds: rows.map((row) => row.projectId),
          action: "replace_client",
        }
      : null;
  }
  const rows = await context.prisma.projectFuelAgreement.findMany({
    where: {
      corporationId: input.corporationId,
      companyId: input.companyId,
      fuelSupplierId: input.id,
      effectiveTo: null,
    },
    select: { projectId: true },
    take: 100,
  });
  return rows.length
    ? {
        projectIds: rows.map((row) => row.projectId),
        action: "end_fuel_agreement",
      }
    : null;
}

export async function removeCommercialRegistryHandler(
  context: HandlerContext,
  kind: RegistryKind,
  input: {
    corporationId: string;
    companyId: string;
    id: string;
    actorUserId: string;
    removedAt: Date;
  },
): Promise<CommercialRegistryRecord> {
  const data = {
    isActive: false,
    inactivatedAt: input.removedAt,
    removedAt: input.removedAt,
    removedByUserId: input.actorUserId,
  };
  const where = {
    id: input.id,
    corporationId: input.corporationId,
    companyId: input.companyId,
    isActive: true,
  };
  const result =
    kind === "client"
      ? await context.prisma.client.updateMany({ where, data })
      : await context.prisma.fuelSupplier.updateMany({ where, data });

  if (result.count === 0) throw unavailableError();

  const removedWhere = {
    id: input.id,
    corporationId: input.corporationId,
    companyId: input.companyId,
  };
  const record =
    kind === "client"
      ? ((await context.prisma.client.findFirst({
          where: removedWhere,
          select: registrySelect,
        })) as CommercialRegistryRecord | null)
      : ((await context.prisma.fuelSupplier.findFirst({
          where: removedWhere,
          select: registrySelect,
        })) as CommercialRegistryRecord | null);

  if (!record) throw unavailableError();
  return record;
}

export async function listActiveFuelSupplierSelectorHandler(
  context: HandlerContext,
  input: {
    corporationId: string;
    companyId: string;
    search?: string;
    limit: number;
  },
): Promise<CommercialRegistryRecord[]> {
  return (await context.prisma.fuelSupplier.findMany({
    where: {
      corporationId: input.corporationId,
      companyId: input.companyId,
      isActive: true,
      ...(searchWhere(input.search) as Prisma.FuelSupplierWhereInput),
    },
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
    take: input.limit,
    select: registrySelect,
  })) as CommercialRegistryRecord[];
}
