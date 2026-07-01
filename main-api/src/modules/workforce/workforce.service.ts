import { AppError } from "../../lib/utils/appError";
import {
  buildCursorPage,
  parseBoundCursor,
} from "../../lib/utils/cursor-pagination";
import type { HandlerContext } from "../../lib/utils/handler.dto";
import {
  protectSensitiveDocument,
  toMaskedDocumentDto,
  toProtectedDocumentDto,
} from "../../lib/security/sensitive-document";
import type {
  CreateEmployeeInput,
  ListEmployeesQuery,
} from "./workforce.dto";
import {
  assertEmploymentCanBeCreatedHandler,
  createEmploymentWithFirstPeriodHandler,
  findEmployeeDetailHandler,
  findOrCreatePersonHandler,
  listEmployeesHandler,
  type EmploymentRecord,
  type PersonRecord,
} from "./handlers/workforce.handler";

interface AuthenticatedCompanyScope {
  corporationId: string;
  companyId: string;
}

function parseAdmissionDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function protectedPersonDocument(record: PersonRecord) {
  return {
    authTag: record.authTag,
    ciphertext: record.ciphertext,
    documentType: record.documentType,
    encryptionKeyVersion: record.encryptionKeyVersion,
    iv: record.iv,
  };
}

function assertCpf(documentType: "CPF" | "CNPJ") {
  if (documentType !== "CPF") {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Employee document must be a CPF",
      statusCode: 400,
    });
  }
}

function normalizedQueryForCursor(query: ListEmployeesQuery) {
  return {
    availability: query.availability ?? null,
    search: query.search?.toLocaleLowerCase("pt-BR") ?? null,
    state: query.state ?? null,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  };
}

function scopeForCursor(scope: AuthenticatedCompanyScope) {
  return {
    corporationId: scope.corporationId,
    companyId: scope.companyId,
  };
}

function currentPeriod(record: EmploymentRecord) {
  return record.periods.find((period) => period.effectiveTo === null) ?? null;
}

function periodDto(period: EmploymentRecord["periods"][number]) {
  return {
    id: period.id,
    admissionDate: period.admissionDate.toISOString().slice(0, 10),
    effectiveFrom: period.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: period.effectiveTo?.toISOString().slice(0, 10) ?? null,
    terminationReason: period.terminationReason,
    createdAt: period.createdAt.toISOString(),
    updatedAt: period.updatedAt.toISOString(),
  };
}

function availabilityDto(_record: EmploymentRecord) {
  return {
    state: "available" as const,
    hasOpenAllocation: false,
  };
}

function toListDto(record: EmploymentRecord) {
  const openPeriod = currentPeriod(record);
  return {
    id: record.id,
    person: {
      id: record.person.id,
      fullName: record.person.fullName,
      displayName: record.person.displayName,
      document: toMaskedDocumentDto(protectedPersonDocument(record.person)),
    },
    employment: {
      id: record.id,
      companyRegistrationNumber: record.companyRegistrationNumber,
      state: record.state === "ACTIVE" ? "active" : "terminated",
      isActive: record.isActive,
      admissionDate:
        openPeriod?.admissionDate.toISOString().slice(0, 10) ?? null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    },
    availability: availabilityDto(record),
  };
}

function toDetailDto(record: EmploymentRecord) {
  return {
    ...toListDto(record),
    person: {
      id: record.person.id,
      fullName: record.person.fullName,
      displayName: record.person.displayName,
      document: toProtectedDocumentDto(protectedPersonDocument(record.person)),
      createdAt: record.person.createdAt.toISOString(),
      updatedAt: record.person.updatedAt.toISOString(),
    },
    periods: record.periods.map(periodDto),
  };
}

export class WorkforceService {
  constructor(private readonly context: HandlerContext) {}

  async create(scope: AuthenticatedCompanyScope, input: CreateEmployeeInput) {
    return this.context.transaction(async (transactionContext) => {
      const protectedDocument = protectSensitiveDocument({
        document: input.document,
        registryType: "PERSON",
      });
      assertCpf(protectedDocument.documentType);
      const person = await findOrCreatePersonHandler(transactionContext, {
        ...scope,
        ...protectedDocument,
        documentType: "CPF",
        fullName: input.fullName,
        companyRegistrationNumber: input.companyRegistrationNumber,
        admissionDate: parseAdmissionDate(input.admissionDate),
      });
      await assertEmploymentCanBeCreatedHandler(transactionContext, {
        ...scope,
        personId: person.id,
        companyRegistrationNumber: input.companyRegistrationNumber,
      });
      const employment = await createEmploymentWithFirstPeriodHandler(
        transactionContext,
        {
          ...scope,
          ...protectedDocument,
          documentType: "CPF",
          fullName: input.fullName,
          personId: person.id,
          companyRegistrationNumber: input.companyRegistrationNumber,
          admissionDate: parseAdmissionDate(input.admissionDate),
        },
      );
      return toDetailDto(employment);
    });
  }

  async list(scope: AuthenticatedCompanyScope, query: ListEmployeesQuery) {
    const normalizedQuery = normalizedQueryForCursor(query);
    const boundary = parseBoundCursor({
      cursor: query.cursor,
      query: normalizedQuery,
      resource: "employees",
      scope: scopeForCursor(scope),
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    const records = await listEmployeesHandler(this.context, {
      ...scope,
      search: query.search,
      limit: query.limit,
      boundary,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    const page = buildCursorPage({
      items: records,
      limit: query.limit,
      query: normalizedQuery,
      resource: "employees",
      scope: scopeForCursor(scope),
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
      getLast: (item) => ({
        id: item.id,
        value:
          query.sortBy === "createdAt"
            ? item.createdAt.toISOString()
            : item.person.displayName,
      }),
    });
    return {
      data: page.data.map(toListDto),
      pageInfo: page.pageInfo,
    };
  }

  async detail(scope: AuthenticatedCompanyScope, employmentId: string) {
    const record = await findEmployeeDetailHandler(this.context, {
      ...scope,
      employmentId,
    });
    return toDetailDto(record);
  }
}
