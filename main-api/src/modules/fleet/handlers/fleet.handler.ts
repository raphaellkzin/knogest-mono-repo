import type { Prisma } from "../../../db/generated/prisma/client";
import { AppError } from "../../../lib/utils/appError";
import type {
  CursorBoundary,
  SortDirection,
} from "../../../lib/utils/cursor-pagination";
import type { HandlerContext } from "../../../lib/utils/handler.dto";

export interface MachineRecord {
  id: string;
  corporationId: string;
  name: string;
  description: string | null;
  type: "YELLOW_LINE" | "WHITE_LINE";
  manufacturer: string;
  model: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  ownershipPeriods: {
    id: string;
    corporationId: string;
    companyId: string;
    machineId: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }[];
  identifiers: {
    id: string;
    kind: "PLATE" | "COMPANY_TAG";
    value: string;
    normalizedValue: string;
    releasedAt: Date | null;
  }[];
  meterReadings: {
    id: string;
    value: Prisma.Decimal;
    status: "CONFIRMED";
    purpose: "INITIAL" | "OWNERSHIP_TRANSFER" | "ORDINARY";
    actorUserId: string;
    recordedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }[];
}

const machineSelect = {
  id: true,
  corporationId: true,
  name: true,
  description: true,
  type: true,
  manufacturer: true,
  model: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  ownershipPeriods: {
    where: { effectiveTo: null },
    orderBy: { effectiveFrom: "desc" as const },
    take: 1,
    select: {
      id: true,
      corporationId: true,
      companyId: true,
      machineId: true,
      effectiveFrom: true,
      effectiveTo: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  identifiers: {
    where: { releasedAt: null },
    orderBy: { kind: "asc" as const },
    select: {
      id: true,
      kind: true,
      value: true,
      normalizedValue: true,
      releasedAt: true,
    },
  },
  meterReadings: {
    where: { status: "CONFIRMED" as const },
    orderBy: [{ recordedAt: "desc" as const }, { id: "desc" as const }],
    take: 1,
    select: {
      id: true,
      value: true,
      status: true,
      purpose: true,
      actorUserId: true,
      recordedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  },
};

function isUniqueError(error: unknown): error is { code: string; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function identifierConflictError(): AppError {
  return new AppError({
    code: "MACHINE_IDENTIFIER_CONFLICT",
    message: "Machine identifier already exists in this Company",
    statusCode: 409,
  });
}

function notFoundError(): AppError {
  return new AppError({
    code: "NOT_FOUND",
    message: "Machine not found",
    statusCode: 404,
  });
}

function readingDecreaseError(): AppError {
  return new AppError({
    code: "MACHINE_READING_DECREASE",
    message: "Machine meter reading cannot be lower than the latest reading",
    statusCode: 409,
  });
}

function immutableReadingError(): AppError {
  return new AppError({
    code: "MACHINE_READING_IMMUTABLE",
    message: "Machine meter reading cannot be corrected",
    statusCode: 409,
  });
}

function neighborBoundError(): AppError {
  return new AppError({
    code: "MACHINE_READING_NEIGHBOR_BOUND_VIOLATION",
    message: "Machine meter reading correction violates neighbor bounds",
    statusCode: 409,
  });
}

function boundaryWhere({
  boundary,
  sortBy,
  sortDirection,
}: {
  boundary: CursorBoundary | null;
  sortBy: "name" | "createdAt";
  sortDirection: SortDirection;
}): Prisma.MachineWhereInput | undefined {
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

  const name = String(boundary.value);
  return sortDirection === "asc"
    ? { OR: [{ name: { gt: name } }, { name, id: { gt: boundary.id } }] }
    : { OR: [{ name: { lt: name } }, { name, id: { lt: boundary.id } }] };
}

function orderBy({
  sortBy,
  sortDirection,
}: {
  sortBy: "name" | "createdAt";
  sortDirection: SortDirection;
}): Prisma.MachineOrderByWithRelationInput[] {
  if (sortBy === "name") return [{ name: sortDirection }, { id: sortDirection }];
  return [{ createdAt: sortDirection }, { id: sortDirection }];
}

function searchWhere(search?: string): Prisma.MachineWhereInput | undefined {
  if (!search) return undefined;
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { manufacturer: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      {
        identifiers: {
          some: {
            releasedAt: null,
            normalizedValue: { contains: search.replace(/\W/gu, "").toUpperCase() },
          },
        },
      },
    ],
  };
}

async function lockMachine(context: HandlerContext, machineId: string) {
  await context.prisma.$queryRawUnsafe(
    `SELECT id FROM "machines" WHERE "id" = $1 FOR UPDATE`,
    machineId,
  );
}

export async function createMachineHandler(
  context: HandlerContext,
  input: {
    corporationId: string;
    companyId: string;
    actorUserId: string;
    name: string;
    description?: string;
    type: "YELLOW_LINE" | "WHITE_LINE";
    manufacturer: string;
    model: string;
    identifiers: { kind: "PLATE" | "COMPANY_TAG"; value: string; normalizedValue: string }[];
    initialMeterReading: string;
  },
): Promise<MachineRecord> {
  try {
    const machine = await context.prisma.machine.create({
      data: {
        corporationId: input.corporationId,
        name: input.name,
        description: input.description,
        type: input.type,
        manufacturer: input.manufacturer,
        model: input.model,
      },
      select: { id: true },
    });
    await context.prisma.machineOwnershipPeriod.create({
      data: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        machineId: machine.id,
      },
      select: { id: true },
    });
    await context.prisma.machineIdentifier.createMany({
      data: input.identifiers.map((identifier) => ({
        corporationId: input.corporationId,
        companyId: input.companyId,
        machineId: machine.id,
        kind: identifier.kind,
        value: identifier.value,
        normalizedValue: identifier.normalizedValue,
      })),
    });
    await context.prisma.machineMeterReading.create({
      data: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        machineId: machine.id,
        value: input.initialMeterReading,
        purpose: "INITIAL",
        actorUserId: input.actorUserId,
      },
      select: { id: true },
    });
    return findMachineDetailHandler(context, {
      corporationId: input.corporationId,
      companyId: input.companyId,
      machineId: machine.id,
    });
  } catch (error) {
    if (isUniqueError(error)) throw identifierConflictError();
    throw error;
  }
}

export async function listMachinesHandler(
  context: HandlerContext,
  input: {
    corporationId: string;
    companyId: string;
    search?: string;
    type?: "YELLOW_LINE" | "WHITE_LINE";
    limit: number;
    boundary: CursorBoundary | null;
    sortBy: "name" | "createdAt";
    sortDirection: SortDirection;
  },
): Promise<MachineRecord[]> {
  return (await context.prisma.machine.findMany({
    where: {
      corporationId: input.corporationId,
      isActive: true,
      ownershipPeriods: {
        some: {
          corporationId: input.corporationId,
          companyId: input.companyId,
          effectiveTo: null,
        },
      },
      ...(input.type ? { type: input.type } : {}),
      ...searchWhere(input.search),
      ...boundaryWhere(input),
    },
    orderBy: orderBy(input),
    take: input.limit + 1,
    select: machineSelect,
  })) as MachineRecord[];
}

export async function findMachineDetailHandler(
  context: HandlerContext,
  input: { corporationId: string; companyId: string; machineId: string },
): Promise<MachineRecord> {
  const record = (await context.prisma.machine.findFirst({
    where: {
      id: input.machineId,
      corporationId: input.corporationId,
      isActive: true,
      ownershipPeriods: {
        some: {
          corporationId: input.corporationId,
          companyId: input.companyId,
          effectiveTo: null,
        },
      },
    },
    select: machineSelect,
  })) as MachineRecord | null;

  if (!record) throw notFoundError();
  return record;
}

export async function appendMachineMeterReadingHandler(
  context: HandlerContext,
  input: {
    corporationId: string;
    companyId: string;
    machineId: string;
    actorUserId: string;
    value: string;
    valueCents: bigint;
  },
) {
  await findMachineDetailHandler(context, input);
  await lockMachine(context, input.machineId);
  const latest = await context.prisma.machineMeterReading.findFirst({
    where: {
      corporationId: input.corporationId,
      companyId: input.companyId,
      machineId: input.machineId,
      status: "CONFIRMED",
    },
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    select: { value: true },
  });
  if (latest && decimalToCents(String(latest.value)) > input.valueCents) {
    throw readingDecreaseError();
  }
  await context.prisma.machineMeterReading.create({
    data: {
      corporationId: input.corporationId,
      companyId: input.companyId,
      machineId: input.machineId,
      value: input.value,
      purpose: "ORDINARY",
      actorUserId: input.actorUserId,
    },
    select: { id: true },
  });
  return findMachineDetailHandler(context, input);
}

export async function correctMachineMeterReadingHandler(
  context: HandlerContext,
  input: {
    corporationId: string;
    companyId: string;
    machineId: string;
    readingId: string;
    actorUserId: string;
    value: string;
    valueCents: bigint;
    reason: string;
  },
) {
  await findMachineDetailHandler(context, input);
  await lockMachine(context, input.machineId);
  const reading = await context.prisma.machineMeterReading.findFirst({
    where: {
      id: input.readingId,
      corporationId: input.corporationId,
      companyId: input.companyId,
      machineId: input.machineId,
      status: "CONFIRMED",
    },
    select: {
      id: true,
      value: true,
      purpose: true,
      recordedAt: true,
      references: { select: { id: true }, take: 1 },
    },
  });
  if (!reading) throw notFoundError();
  if (
    !["INITIAL", "OWNERSHIP_TRANSFER"].includes(reading.purpose) ||
    reading.references.length > 0
  ) {
    throw immutableReadingError();
  }

  const [previous, next] = await Promise.all([
    context.prisma.machineMeterReading.findFirst({
      where: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        machineId: input.machineId,
        status: "CONFIRMED",
        OR: [
          { recordedAt: { lt: reading.recordedAt } },
          { recordedAt: reading.recordedAt, id: { lt: reading.id } },
        ],
      },
      orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
      select: { value: true },
    }),
    context.prisma.machineMeterReading.findFirst({
      where: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        machineId: input.machineId,
        status: "CONFIRMED",
        OR: [
          { recordedAt: { gt: reading.recordedAt } },
          { recordedAt: reading.recordedAt, id: { gt: reading.id } },
        ],
      },
      orderBy: [{ recordedAt: "asc" }, { id: "asc" }],
      select: { value: true },
    }),
  ]);

  if (previous && decimalToCents(String(previous.value)) > input.valueCents) {
    throw neighborBoundError();
  }
  if (next && decimalToCents(String(next.value)) < input.valueCents) {
    throw neighborBoundError();
  }

  await context.prisma.machineMeterReading.update({
    where: {
      corporationId_companyId_machineId_id: {
        corporationId: input.corporationId,
        companyId: input.companyId,
        machineId: input.machineId,
        id: input.readingId,
      },
    },
    data: { value: input.value },
    select: { id: true },
  });
  await context.prisma.machineMeterReadingCorrection.create({
    data: {
      corporationId: input.corporationId,
      companyId: input.companyId,
      machineId: input.machineId,
      readingId: input.readingId,
      actorUserId: input.actorUserId,
      oldValue: String(reading.value),
      newValue: input.value,
      reason: input.reason,
    },
    select: { id: true },
  });
  return findMachineDetailHandler(context, input);
}

function decimalToCents(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
}
