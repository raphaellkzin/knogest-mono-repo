import {
  buildCursorPage,
  parseBoundCursor,
} from "../../lib/utils/cursor-pagination";
import { AppError } from "../../lib/utils/appError";
import type { HandlerContext } from "../../lib/utils/handler.dto";
import type {
  AppendMachineMeterReadingInput,
  CorrectMachineMeterReadingInput,
  CreateMachineInput,
  AllocateMachineInput,
  ListMachinesQuery,
} from "./fleet.dto";
import {
  appendMachineMeterReadingHandler,
  correctMachineMeterReadingHandler,
  createMachineHandler,
  findMachineDetailHandler,
  findAllocatedMachineIdsHandler,
  allocateMachineHandler,
  listMachinesHandler,
  type MachineRecord,
} from "./handlers/fleet.handler";
import {
  MvpMachineOperationalStatusPort,
  type MachineOperationalStatusPort,
} from "./machine-operational-status.port";

interface AuthenticatedCompanyScope {
  corporationId: string;
  companyId: string;
  actorUserId: string;
}

function normalizeIdentifier(value: string) {
  return value.replace(/[^A-Za-z0-9]/gu, "").toUpperCase();
}

function normalizeDecimal(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(2, "0").slice(0, 2)}`;
}

function decimalToCents(value: string): bigint {
  const [whole, fraction = ""] = normalizeDecimal(value).split(".");
  return BigInt(whole) * 100n + BigInt(fraction);
}

function normalizedQueryForCursor(query: ListMachinesQuery) {
  return {
    availability: query.availability ?? null,
    search: query.search?.toLocaleLowerCase("pt-BR") ?? null,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
    type: query.type ?? null,
  };
}

function scopeForCursor(scope: AuthenticatedCompanyScope) {
  return {
    corporationId: scope.corporationId,
    companyId: scope.companyId,
  };
}

function currentIdentifier(
  record: MachineRecord,
  kind: "PLATE" | "COMPANY_TAG",
) {
  return (
    record.identifiers.find((identifier) => identifier.kind === kind) ?? null
  );
}

function latestReading(record: MachineRecord) {
  const reading = record.meterReadings[0] ?? null;
  if (!reading) return null;
  return {
    id: reading.id,
    value: normalizeDecimal(String(reading.value)),
    purpose: reading.purpose,
    recordedAt: reading.recordedAt.toISOString(),
  };
}

function ownershipDto(record: MachineRecord) {
  const ownership = record.ownershipPeriods[0] ?? null;
  return ownership
    ? {
        companyId: ownership.companyId,
        effectiveFrom: ownership.effectiveFrom.toISOString(),
        effectiveTo: ownership.effectiveTo?.toISOString() ?? null,
      }
    : null;
}

function availabilityDto(record: MachineRecord, hasOpenAllocation = false) {
  return {
    state:
      record.isActive &&
      record.ownershipPeriods.length === 1 &&
      !hasOpenAllocation
        ? ("available" as const)
        : ("unavailable" as const),
    hasOpenAllocation,
  };
}

function toMachineDto(
  record: MachineRecord,
  allocatedMachineIds = new Set<string>(),
) {
  const plate = currentIdentifier(record, "PLATE");
  const companyTag = currentIdentifier(record, "COMPANY_TAG");
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    type: record.type,
    manufacturer: record.manufacturer,
    model: record.model,
    meterType: record.meterType,
    identifiers: {
      plate: plate
        ? { value: plate.value, normalizedValue: plate.normalizedValue }
        : null,
      companyTag: companyTag
        ? {
            value: companyTag.value,
            normalizedValue: companyTag.normalizedValue,
          }
        : null,
    },
    latestMeterReading: latestReading(record),
    availability: availabilityDto(record, allocatedMachineIds.has(record.id)),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toMachineDetailDto(record: MachineRecord) {
  return {
    ...toMachineDto(record),
    ownership: ownershipDto(record),
  };
}

function identifiersFromInput(input: CreateMachineInput) {
  const identifiers = [
    input.plate
      ? {
          kind: "PLATE" as const,
          value: input.plate,
          normalizedValue: normalizeIdentifier(input.plate),
        }
      : null,
    input.companyTag
      ? {
          kind: "COMPANY_TAG" as const,
          value: input.companyTag,
          normalizedValue: normalizeIdentifier(input.companyTag),
        }
      : null,
  ].filter(
    (
      identifier,
    ): identifier is {
      kind: "PLATE" | "COMPANY_TAG";
      value: string;
      normalizedValue: string;
    } => identifier !== null,
  );

  if (
    identifiers.some((identifier) => identifier.normalizedValue.length === 0)
  ) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Machine identifier must include at least one letter or number",
      statusCode: 400,
    });
  }
  return identifiers;
}

export class FleetService {
  constructor(
    private readonly context: HandlerContext,
    private readonly operationalStatus: MachineOperationalStatusPort = new MvpMachineOperationalStatusPort(),
  ) {}

  async create(scope: AuthenticatedCompanyScope, input: CreateMachineInput) {
    return this.context.transaction(async (transactionContext) => {
      const record = await createMachineHandler(transactionContext, {
        ...scope,
        identifiers: identifiersFromInput(input),
        name: input.name,
        description: input.description,
        type: input.type,
        manufacturer: input.manufacturer,
        model: input.model,
        meterType: input.meterType,
        initialMeterReading: normalizeDecimal(input.initialMeterReading),
      });
      return toMachineDetailDto(record);
    });
  }

  async list(scope: AuthenticatedCompanyScope, query: ListMachinesQuery) {
    const normalizedQuery = normalizedQueryForCursor(query);
    const boundary = parseBoundCursor({
      cursor: query.cursor,
      query: normalizedQuery,
      resource: "machines",
      scope: scopeForCursor(scope),
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    const records = await listMachinesHandler(this.context, {
      ...scope,
      search: query.search,
      type: query.type,
      limit: query.limit,
      boundary,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    const page = buildCursorPage({
      items: records,
      limit: query.limit,
      query: normalizedQuery,
      resource: "machines",
      scope: scopeForCursor(scope),
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
      getLast: (item) => ({
        id: item.id,
        value:
          query.sortBy === "createdAt"
            ? item.createdAt.toISOString()
            : item.name,
      }),
    });
    const allocationRows = await findAllocatedMachineIdsHandler(
      this.context,
      scope.corporationId,
      page.data.map((item) => item.id),
    );
    const allocatedMachineIds = new Set(
      allocationRows.map((row) => row.machineId),
    );
    return {
      data: page.data.map((record) =>
        toMachineDto(record, allocatedMachineIds),
      ),
      pageInfo: page.pageInfo,
    };
  }

  async detail(scope: AuthenticatedCompanyScope, machineId: string) {
    const record = await findMachineDetailHandler(this.context, {
      ...scope,
      machineId,
    });
    return toMachineDetailDto(record);
  }

  async allocate(scope: AuthenticatedCompanyScope, machineId: string, input: AllocateMachineInput) {
    return runSerializableWithRetry(() =>
      this.context.transaction(async (tx) => {
        const status = await this.operationalStatus.getStatus({ ...scope, machineId });
        if (status.hasOpenShift || status.hasPendingFinalReading) {
          throw new AppError({ code: "MACHINE_ALLOCATION_OPERATIONALLY_BLOCKED", message: "Machine has an operational blocker", statusCode: 409 });
        }
        const allocation = await allocateMachineHandler(tx, { ...scope, machineId, projectId: input.projectId, operatorEmploymentId: input.operatorEmploymentId, effectiveFrom: new Date() });
        return { ...allocation, effectiveFrom: allocation.effectiveFrom.toISOString() };
      }, { isolationLevel: "Serializable" }),
    );
  }

  async appendReading(
    scope: AuthenticatedCompanyScope,
    machineId: string,
    input: AppendMachineMeterReadingInput,
  ) {
    return runSerializableWithRetry(async () =>
      this.context.transaction(
        async (transactionContext) => {
          const record = await appendMachineMeterReadingHandler(
            transactionContext,
            {
              ...scope,
              machineId,
              value: normalizeDecimal(input.value),
              valueCents: decimalToCents(input.value),
            },
          );
          return toMachineDetailDto(record);
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }

  async correctReading(
    scope: AuthenticatedCompanyScope,
    machineId: string,
    readingId: string,
    input: CorrectMachineMeterReadingInput,
  ) {
    return runSerializableWithRetry(async () =>
      this.context.transaction(
        async (transactionContext) => {
          const record = await correctMachineMeterReadingHandler(
            transactionContext,
            {
              ...scope,
              machineId,
              readingId,
              value: normalizeDecimal(input.value),
              valueCents: decimalToCents(input.value),
              reason: input.reason,
            },
          );
          return toMachineDetailDto(record);
        },
        { isolationLevel: "Serializable" },
      ),
    );
  }
}

async function runSerializableWithRetry<T>(work: () => Promise<T>) {
  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await work();
    } catch (error) {
      if (!isRetryableTransactionError(error) || attempt === maxAttempts) {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError;
}

function isRetryableTransactionError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2034"
  );
}
