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
  jobRolePeriods: Array<{ id: string; jobRoleId: string; effectiveFrom: Date; effectiveTo: Date | null; reason: string | null; jobRole: { id: string; name: string; isActive: boolean } }>;
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
  periods: { orderBy: { effectiveFrom: "desc" as const }, select: periodSelect },
  jobRolePeriods: { orderBy: { effectiveFrom: "desc" as const }, select: { id: true, jobRoleId: true, effectiveFrom: true, effectiveTo: true, reason: true, jobRole: { select: { id: true, name: true, isActive: true } } } },
};

function isUniqueError(error: unknown): error is { code: string; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function isOpenPeriodUniqueError(error: unknown): boolean {
  if (!isUniqueError(error)) return false;
  const meta = error.meta;
  if (typeof meta !== "object" || meta === null || !("target" in meta)) {
    return false;
  }
  const target = meta.target;
  return (
    target === "employment_periods_open_period_unique" ||
    (Array.isArray(target) &&
      target.includes("corporation_id") &&
      target.includes("company_id") &&
      target.includes("employment_id"))
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

function currentStateConflictError(): AppError {
  return new AppError({
    code: "EMPLOYMENT_CURRENT_STATE_CONFLICT",
    message: "Employment current state does not allow rehire",
    statusCode: 409,
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
  input: WorkforceCreateData & { personId: string; jobRoleId: string },
): Promise<EmploymentRecord> {
  try {
    const role = await context.prisma.jobRole.findFirst({ where: { id: input.jobRoleId, corporationId: input.corporationId, companyId: input.companyId, isActive: true }, select: { id: true } });
    if (!role) throw new AppError({ code: "JOB_ROLE_UNAVAILABLE", message: "Job role is unavailable", statusCode: 409 });
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
    await context.prisma.employmentJobRolePeriod.create({ data: { corporationId: input.corporationId, companyId: input.companyId, employmentId: employment.id, jobRoleId: role.id, effectiveFrom: input.admissionDate } });
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

const normalizeRoleName = (value: string) => value.trim().normalize("NFC").toLocaleLowerCase("pt-BR");

export async function listJobRolesHandler(context: HandlerContext, scope: { corporationId: string; companyId: string }) {
  return context.prisma.jobRole.findMany({ where: { ...scope }, orderBy: [{ name: "asc" }, { id: "asc" }], select: { id: true, name: true, isActive: true, createdAt: true, updatedAt: true } });
}

export async function createJobRoleHandler(context: HandlerContext, input: { corporationId: string; companyId: string; name: string }) {
  try { return await context.prisma.jobRole.create({ data: { ...input, normalizedName: normalizeRoleName(input.name) }, select: { id: true, name: true, isActive: true, createdAt: true, updatedAt: true } }); }
  catch (error) { if (isUniqueError(error)) throw new AppError({ code: "JOB_ROLE_ALREADY_EXISTS", message: "A job role with this name already exists", statusCode: 409 }); throw error; }
}

export async function updateJobRoleHandler(context: HandlerContext, input: { corporationId: string; companyId: string; jobRoleId: string; name?: string; isActive?: boolean }) {
  const existing = await context.prisma.jobRole.findFirst({ where: { id: input.jobRoleId, corporationId: input.corporationId, companyId: input.companyId }, select: { id: true } });
  if (!existing) throw new AppError({ code: "NOT_FOUND", message: "Job role not found", statusCode: 404 });
  try { return await context.prisma.jobRole.update({ where: { id: existing.id }, data: { ...(input.name === undefined ? {} : { name: input.name, normalizedName: normalizeRoleName(input.name) }), ...(input.isActive === undefined ? {} : { isActive: input.isActive }) }, select: { id: true, name: true, isActive: true, createdAt: true, updatedAt: true } }); }
  catch (error) { if (isUniqueError(error)) throw new AppError({ code: "JOB_ROLE_ALREADY_EXISTS", message: "A job role with this name already exists", statusCode: 409 }); throw error; }
}

export async function changeEmploymentJobRoleHandler(context: HandlerContext, input: { corporationId: string; companyId: string; employmentId: string; jobRoleId: string; reason: string; effectiveDate: Date }) {
  const employment = await context.prisma.employment.findFirst({ where: { id: input.employmentId, corporationId: input.corporationId, companyId: input.companyId, isActive: true, state: "ACTIVE" }, select: { id: true } });
  const role = await context.prisma.jobRole.findFirst({ where: { id: input.jobRoleId, corporationId: input.corporationId, companyId: input.companyId, isActive: true }, select: { id: true } });
  const current = await context.prisma.employmentJobRolePeriod.findFirst({ where: { corporationId: input.corporationId, companyId: input.companyId, employmentId: input.employmentId, effectiveTo: null }, select: { id: true, jobRoleId: true } });
  if (!employment) throw notFoundError();
  if (!role) throw new AppError({ code: "JOB_ROLE_UNAVAILABLE", message: "Job role is unavailable", statusCode: 409 });
  if (!current || current.jobRoleId === role.id) throw new AppError({ code: "JOB_ROLE_CHANGE_CONFLICT", message: "Employment does not have a different current job role", statusCode: 409 });
  try {
    await context.prisma.employmentJobRolePeriod.update({ where: { id: current.id }, data: { effectiveTo: input.effectiveDate } });
    await context.prisma.employmentJobRolePeriod.create({ data: { corporationId: input.corporationId, companyId: input.companyId, employmentId: input.employmentId, jobRoleId: role.id, reason: input.reason, effectiveFrom: input.effectiveDate } });
  } catch (error) {
    if (isUniqueError(error)) throw new AppError({ code: "JOB_ROLE_CHANGE_CONFLICT", message: "Employee job role changed concurrently", statusCode: 409 });
    throw error;
  }
  return findEmployeeDetailHandler(context, input);
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
    state?: "active" | "terminated";
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
      ...(input.state === "terminated"
        ? { isActive: false, state: "TERMINATED" as const }
        : { isActive: true, state: "ACTIVE" as const }),
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
    },
    select: employmentSelect,
  })) as EmploymentRecord | null;

  if (!record) throw notFoundError();
  return record;
}

export async function rehireEmploymentHandler(
  context: HandlerContext,
  input: {
    corporationId: string;
    companyId: string;
    employmentId: string;
    effectiveDate: Date;
  },
): Promise<EmploymentRecord> {
  const employment = await context.prisma.employment.findFirst({
    where: {
      id: input.employmentId,
      corporationId: input.corporationId,
      companyId: input.companyId,
    },
    select: { id: true, state: true, isActive: true },
  });

  if (!employment) throw notFoundError();

  const openPeriod = await context.prisma.employmentPeriod.findFirst({
    where: {
      corporationId: input.corporationId,
      companyId: input.companyId,
      employmentId: input.employmentId,
      effectiveTo: null,
    },
    select: { id: true },
  });

  if (employment.isActive || employment.state === "ACTIVE" || openPeriod) {
    throw currentStateConflictError();
  }

  try {
    await context.prisma.employmentPeriod.create({
      data: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        employmentId: input.employmentId,
        admissionDate: input.effectiveDate,
        effectiveFrom: input.effectiveDate,
      },
      select: { id: true },
    });
    await context.prisma.employment.update({
      where: {
        corporationId_companyId_id: {
          corporationId: input.corporationId,
          companyId: input.companyId,
          id: input.employmentId,
        },
      },
      data: {
        isActive: true,
        state: "ACTIVE",
        terminatedAt: null,
      },
      select: { id: true },
    });
  } catch (error) {
    if (isOpenPeriodUniqueError(error)) {
      throw currentStateConflictError();
    }
    throw error;
  }

  return findEmployeeDetailHandler(context, input);
}
