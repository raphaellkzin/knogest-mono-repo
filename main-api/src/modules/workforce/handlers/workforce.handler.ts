import type { Prisma } from "../../../db/generated/prisma/client";
import { AppError } from "../../../lib/utils/appError";
import type {
  CursorBoundary,
  SortDirection,
} from "../../../lib/utils/cursor-pagination";
import type { HandlerContext } from "../../../lib/utils/handler.dto";

export interface PersonRecord {
  id: string;
  corporationId: string;
  documentType: "CPF" | "CNPJ";
  ciphertext: string;
  iv: string;
  authTag: string;
  encryptionKeyVersion: string;
  documentDigest: string;
  displayName: string;
  fullName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmploymentPeriodRecord {
  id: string;
  corporationId: string;
  companyId: string;
  employmentId: string;
  admissionDate: Date;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  terminationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmploymentRecord {
  id: string;
  corporationId: string;
  companyId: string;
  personId: string;
  companyRegistrationNumber: string;
  state: "ACTIVE" | "TERMINATED";
  isActive: boolean;
  terminatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  person: PersonRecord;
  periods: EmploymentPeriodRecord[];
}

export interface WorkforceCreateData {
  corporationId: string;
  companyId: string;
  documentType: "CPF";
  ciphertext: string;
  iv: string;
  authTag: string;
  encryptionKeyVersion: string;
  documentDigest: string;
  fullName: string;
  companyRegistrationNumber: string;
  admissionDate: Date;
}

const personSelect = {
  id: true,
  corporationId: true,
  documentType: true,
  ciphertext: true,
  iv: true,
  authTag: true,
  encryptionKeyVersion: true,
  documentDigest: true,
  displayName: true,
  fullName: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const periodSelect = {
  id: true,
  corporationId: true,
  companyId: true,
  employmentId: true,
  admissionDate: true,
  effectiveFrom: true,
  effectiveTo: true,
  terminationReason: true,
  createdAt: true,
  updatedAt: true,
};

const employmentSelect = {
  id: true,
  corporationId: true,
  companyId: true,
  personId: true,
  companyRegistrationNumber: true,
  state: true,
  isActive: true,
  terminatedAt: true,
  createdAt: true,
  updatedAt: true,
  person: { select: personSelect },
  periods: { orderBy: { effectiveFrom: "desc" }, select: periodSelect },
};

function isUniqueError(error: unknown): error is { code: string; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function employmentAlreadyExistsError(): AppError {
  return new AppError({
    code: "EMPLOYMENT_ALREADY_EXISTS",
    message: "Active Employment already exists for this Person and Company",
    statusCode: 409,
  });
}

function registrationNumberAlreadyExistsError(): AppError {
  return new AppError({
    code: "REGISTRATION_NUMBER_ALREADY_EXISTS",
    message: "Company registration number already exists for this Company",
    statusCode: 409,
  });
}

function notFoundError(): AppError {
  return new AppError({
    code: "NOT_FOUND",
    message: "Employee not found",
    statusCode: 404,
  });
}

async function findPersonByDigest(
  context: HandlerContext,
  input: { corporationId: string; documentDigest: string },
): Promise<PersonRecord | null> {
  return (await context.prisma.person.findFirst({
    where: {
      corporationId: input.corporationId,
      documentDigest: input.documentDigest,
    },
    select: personSelect,
  })) as PersonRecord | null;
}

async function createPerson(
  context: HandlerContext,
  input: WorkforceCreateData,
): Promise<PersonRecord> {
  return (await context.prisma.person.create({
    data: {
      corporationId: input.corporationId,
      documentType: input.documentType,
      ciphertext: input.ciphertext,
      iv: input.iv,
      authTag: input.authTag,
      encryptionKeyVersion: input.encryptionKeyVersion,
      documentDigest: input.documentDigest,
      displayName: input.fullName,
      fullName: input.fullName,
    },
    select: personSelect,
  })) as PersonRecord;
}

export async function findOrCreatePersonHandler(
  context: HandlerContext,
  input: WorkforceCreateData,
): Promise<PersonRecord> {
  const existing = await findPersonByDigest(context, input);
  if (existing) return existing;

  try {
    return await createPerson(context, input);
  } catch (error) {
    if (!isUniqueError(error)) throw error;
    const concurrent = await findPersonByDigest(context, input);
    if (concurrent) return concurrent;
    throw error;
  }
}

export async function assertEmploymentCanBeCreatedHandler(
  context: HandlerContext,
  input: {
    corporationId: string;
    companyId: string;
    personId: string;
    companyRegistrationNumber: string;
  },
) {
  const [existingEmployment, existingRegistration] = await Promise.all([
    context.prisma.employment.findFirst({
      where: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        personId: input.personId,
        isActive: true,
      },
      select: { id: true },
    }),
    context.prisma.employment.findFirst({
      where: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        companyRegistrationNumber: input.companyRegistrationNumber,
        isActive: true,
      },
      select: { id: true },
    }),
  ]);

  if (existingEmployment) throw employmentAlreadyExistsError();
  if (existingRegistration) throw registrationNumberAlreadyExistsError();
}

export async function createEmploymentWithFirstPeriodHandler(
  context: HandlerContext,
  input: WorkforceCreateData & { personId: string },
): Promise<EmploymentRecord> {
  try {
    const employment = await context.prisma.employment.create({
      data: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        personId: input.personId,
        companyRegistrationNumber: input.companyRegistrationNumber,
      },
      select: { id: true },
    });
    await context.prisma.employmentPeriod.create({
      data: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        employmentId: employment.id,
        admissionDate: input.admissionDate,
        effectiveFrom: input.admissionDate,
      },
      select: { id: true },
    });
    return findEmployeeDetailHandler(context, {
      corporationId: input.corporationId,
      companyId: input.companyId,
      employmentId: employment.id,
    });
  } catch (error) {
    if (isUniqueError(error)) {
      await assertEmploymentCanBeCreatedHandler(context, input);
      throw registrationNumberAlreadyExistsError();
    }
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
}): Prisma.EmploymentWhereInput | undefined {
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
          { person: { displayName: { gt: displayName } } },
          { person: { displayName }, id: { gt: boundary.id } },
        ],
      }
    : {
        OR: [
          { person: { displayName: { lt: displayName } } },
          { person: { displayName }, id: { lt: boundary.id } },
        ],
      };
}

function orderBy({
  sortBy,
  sortDirection,
}: {
  sortBy: "name" | "createdAt";
  sortDirection: SortDirection;
}): Prisma.EmploymentOrderByWithRelationInput[] {
  if (sortBy === "name") {
    return [{ person: { displayName: sortDirection } }, { id: sortDirection }];
  }
  return [{ createdAt: sortDirection }, { id: sortDirection }];
}

function searchWhere(search?: string): Prisma.EmploymentWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { companyRegistrationNumber: { contains: search, mode: "insensitive" } },
      { person: { displayName: { contains: search, mode: "insensitive" } } },
      { person: { fullName: { contains: search, mode: "insensitive" } } },
    ],
  };
}

export async function listEmployeesHandler(
  context: HandlerContext,
  input: {
    corporationId: string;
    companyId: string;
    search?: string;
    limit: number;
    boundary: CursorBoundary | null;
    sortBy: "name" | "createdAt";
    sortDirection: SortDirection;
  },
): Promise<EmploymentRecord[]> {
  return (await context.prisma.employment.findMany({
    where: {
      corporationId: input.corporationId,
      companyId: input.companyId,
      isActive: true,
      ...searchWhere(input.search),
      ...boundaryWhere(input),
    },
    orderBy: orderBy(input),
    take: input.limit + 1,
    select: employmentSelect,
  })) as EmploymentRecord[];
}

export async function findEmployeeDetailHandler(
  context: HandlerContext,
  input: { corporationId: string; companyId: string; employmentId: string },
): Promise<EmploymentRecord> {
  const record = (await context.prisma.employment.findFirst({
    where: {
      id: input.employmentId,
      corporationId: input.corporationId,
      companyId: input.companyId,
      isActive: true,
    },
    select: employmentSelect,
  })) as EmploymentRecord | null;

  if (!record) throw notFoundError();
  return record;
}
