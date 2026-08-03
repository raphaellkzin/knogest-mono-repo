import type { Prisma } from "../../../db/generated/prisma/client";
import type { HandlerContext } from "../../../lib/utils/handler.dto";
import type {
  CursorBoundary,
  SortDirection,
} from "../../../lib/utils/cursor-pagination";
import { invalidCursorError } from "../../../lib/utils/cursor-pagination";

export type ProductionScope = {
  corporationId: string;
  companyId: string;
  actorUserId: string;
  role: "MASTER_ADMIN";
};

export const productionDetailInclude = {
  equipment: {
    orderBy: [
      { role: "asc" as const },
      { machineNameSnapshot: "asc" as const },
    ],
    include: {
      stops: { orderBy: { createdAt: "asc" as const } },
      trips: {
        orderBy: [{ recordedAt: "asc" as const }, { id: "asc" as const }],
      },
    },
  },
  trips: {
    orderBy: [{ recordedAt: "asc" as const }, { id: "asc" as const }],
  },
  revisions: { orderBy: { revision: "desc" as const }, take: 20 },
  dailyReportLinks: { orderBy: { confirmedAt: "desc" as const } },
} satisfies Prisma.ProjectProductionInclude;

export type ProductionWriteData = {
  workFrontId: string;
  workFrontServiceId: string;
  serviceCodeSnapshot: string;
  unitCodeSnapshot: string;
  productionProfileSnapshot:
    | "GENERIC"
    | "EXCAVATION"
    | "LOADING"
    | "TRANSPORT"
    | "SPREADING"
    | "GRADING"
    | "COMPACTION";
  dmtPolicySnapshot: "NOT_APPLICABLE" | "OPTIONAL" | "REQUIRED";
  productionDate: Date;
  shift: "DAY" | "NIGHT";
  shiftOrder: number;
  entryMode: "DIRECT_TOTAL" | "TRIPS";
  startTime: string | null;
  endTime: string | null;
  endDayOffset: number;
  responsibleEmploymentId: string | null;
  responsibleNameSnapshot: string | null;
  location: string | null;
  startStation: string | null;
  endStation: string | null;
  layer: string | null;
  elevation: string | null;
  materialName: string | null;
  materialCategory: string | null;
  volumeCondition: "CUT" | "LOOSE" | "COMPACTED" | null;
  directQuantity: string | null;
  measuredQuantity: string | null;
  conversionFactor: string | null;
  origin: string | null;
  destination: string | null;
  dmtKm: string | null;
  layerThicknessCm: string | null;
  compactionPasses: number | null;
  moistureCondition: string | null;
  evidence: Prisma.InputJsonValue;
  notes: string | null;
  equipment: Array<{
    machineId: string;
    machineNameSnapshot: string;
    manufacturerSnapshot: string;
    modelSnapshot: string;
    identifierSnapshot: string | null;
    meterTypeSnapshot: "HOUR_METER" | "ODOMETER";
    role:
      | "EXCAVATION"
      | "LOADING"
      | "TRANSPORT"
      | "SPREADING"
      | "GRADING"
      | "COMPACTION"
      | "WATERING"
      | "SUPPORT";
    operatorEmploymentId: string | null;
    operatorNameSnapshot: string | null;
    initialMeterValue: string | null;
    finalMeterValue: string | null;
    workedMinutes: number | null;
    defaultTripCapacityM3: string | null;
    stops: Array<{
      durationMinutes: number;
      reason: string;
      notes: string | null;
    }>;
  }>;
};

function scopeWhere(scope: ProductionScope, projectId: string) {
  return {
    corporationId: scope.corporationId,
    companyId: scope.companyId,
    projectId,
  };
}

export async function findProductionOptionsContextHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  interval: { startAt: Date; endAt: Date },
  shift: "DAY" | "NIGHT",
) {
  const project = await context.prisma.project.findFirst({
    where: {
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      id: projectId,
      status: "ACTIVE",
    },
    select: { id: true, name: true, status: true },
  });
  if (!project) return null;

  const fronts = await context.prisma.projectWorkFront.findMany({
    where: { ...scopeWhere(scope, projectId), status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, location: true },
  });
  const frontIds = fronts.map((front) => front.id);
  const overlap = {
    effectiveFrom: { lte: interval.endAt },
    OR: [{ effectiveTo: null }, { effectiveTo: { gt: interval.startAt } }],
  };
  const scheduleRevision =
    await context.prisma.projectScheduleRevision.findFirst({
      where: { ...scopeWhere(scope, projectId), ...overlap },
      orderBy: { effectiveFrom: "desc" },
      select: { id: true },
    });
  const shiftEnabled = scheduleRevision
    ? Boolean(
        await context.prisma.projectScheduleDay.findFirst({
          where: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            scheduleRevisionId: scheduleRevision.id,
            shift,
          },
          select: { id: true },
        }),
      )
    : false;
  const [services, assignments, employeeAllocations] = await Promise.all([
    frontIds.length
      ? context.prisma.projectWorkFrontService.findMany({
          where: {
            ...scopeWhere(scope, projectId),
            workFrontId: { in: frontIds },
          },
          orderBy: [{ workFrontId: "asc" }, { serviceCode: "asc" }],
        })
      : [],
    frontIds.length
      ? context.prisma.projectWorkFrontMachineAssignment.findMany({
          where: {
            ...scopeWhere(scope, projectId),
            workFrontId: { in: frontIds },
            ...overlap,
            shift,
          },
          orderBy: { effectiveFrom: "desc" },
          include: {
            machine: {
              include: {
                identifiers: {
                  where: {
                    companyId: scope.companyId,
                    OR: [
                      { releasedAt: null },
                      { releasedAt: { gt: interval.startAt } },
                    ],
                  },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
            operator: { include: { person: true } },
          },
        })
      : [],
    context.prisma.projectEmployeeAllocation.findMany({
      where: { ...scopeWhere(scope, projectId), ...overlap, shift },
      orderBy: { effectiveFrom: "asc" },
    }),
  ]);
  const employmentIds = employeeAllocations.map((item) => item.employmentId);
  const employments = employmentIds.length
    ? await context.prisma.employment.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          id: { in: employmentIds },
        },
        include: { person: true },
      })
    : [];
  const employmentMap = new Map(employments.map((item) => [item.id, item]));
  return {
    project,
    shiftEnabled,
    fronts,
    services,
    assignments,
    employeeAllocations: employeeAllocations.flatMap((allocation) => {
      const employment = employmentMap.get(allocation.employmentId);
      return employment ? [{ ...allocation, employment }] : [];
    }),
  };
}

export async function createProductionHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  data: ProductionWriteData,
  input: {
    approved: boolean;
    event: "CREATED" | "DIRECT_APPROVED";
    snapshot: Prisma.InputJsonValue;
  },
) {
  const now = new Date();
  return context.prisma.projectProduction.create({
    data: {
      ...scopeWhere(scope, projectId),
      ...withoutEquipment(data),
      status: input.approved ? "APPROVED" : "DRAFT",
      createdByUserId: scope.actorUserId,
      approvedByUserId: input.approved ? scope.actorUserId : null,
      approvedAt: input.approved ? now : null,
      equipment: { create: equipmentCreate(data.equipment) },
      revisions: {
        create: {
          revision: 1,
          event: input.event,
          snapshot: input.snapshot,
          actorUserId: scope.actorUserId,
        },
      },
    },
    include: productionDetailInclude,
  });
}

export async function countShiftProductionsHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  productionDate: Date,
  shift: "DAY" | "NIGHT",
) {
  return context.prisma.projectProduction.count({
    where: { ...scopeWhere(scope, projectId), productionDate, shift },
  });
}

export async function replaceProductionHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  productionId: string,
  expectedRevision: number,
  data: ProductionWriteData,
  snapshot: Prisma.InputJsonValue,
) {
  const bumped = await context.prisma.projectProduction.updateMany({
    where: {
      id: productionId,
      ...scopeWhere(scope, projectId),
      status: "DRAFT",
      revision: expectedRevision,
    },
    data: { revision: { increment: 1 } },
  });
  if (bumped.count !== 1) return null;

  const currentEquipment =
    await context.prisma.projectProductionEquipment.findMany({
      where: { productionId },
      select: { id: true, machineId: true },
    });
  const desiredMachineIds = new Set(
    data.equipment.map((item) => item.machineId),
  );
  const removedIds = currentEquipment
    .filter((item) => !desiredMachineIds.has(item.machineId))
    .map((item) => item.id);
  if (removedIds.length)
    await context.prisma.projectProductionEquipment.deleteMany({
      where: { id: { in: removedIds }, trips: { none: {} } },
    });

  for (const item of data.equipment) {
    const existing = currentEquipment.find(
      (equipment) => equipment.machineId === item.machineId,
    );
    if (existing) {
      await context.prisma.projectProductionStop.deleteMany({
        where: { productionEquipmentId: existing.id },
      });
      await context.prisma.projectProductionEquipment.update({
        where: { id: existing.id },
        data: {
          ...equipmentScalars(item),
          stops: { create: item.stops },
        },
      });
    } else {
      await context.prisma.projectProductionEquipment.create({
        data: {
          productionId,
          ...equipmentScalars(item),
          stops: { create: item.stops },
        },
      });
    }
  }

  return context.prisma.projectProduction.update({
    where: { id: productionId },
    data: {
      ...withoutEquipment(data),
      revisions: {
        create: {
          revision: expectedRevision + 1,
          event: "UPDATED",
          snapshot,
          actorUserId: scope.actorUserId,
        },
      },
    },
    include: productionDetailInclude,
  });
}

export async function findProductionHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  productionId: string,
) {
  return context.prisma.projectProduction.findFirst({
    where: { id: productionId, ...scopeWhere(scope, projectId) },
    include: productionDetailInclude,
  });
}

export async function listProductionsHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  input: {
    boundary: CursorBoundary | null;
    limit: number;
    productionDate?: Date;
    shift?: "DAY" | "NIGHT";
    status?: "DRAFT" | "APPROVED";
    workFrontId?: string;
    sortDirection: SortDirection;
  },
) {
  const boundary = productionBoundary(input.boundary, input.sortDirection);
  return context.prisma.projectProduction.findMany({
    where: {
      ...scopeWhere(scope, projectId),
      ...(input.productionDate ? { productionDate: input.productionDate } : {}),
      ...(input.shift ? { shift: input.shift } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.workFrontId ? { workFrontId: input.workFrontId } : {}),
      ...(boundary ? { OR: boundary } : {}),
    },
    orderBy: [
      { productionDate: input.sortDirection },
      { shiftOrder: input.sortDirection },
      { id: input.sortDirection },
    ],
    take: input.limit + 1,
    include: productionDetailInclude,
  });
}

export async function approveProductionHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  productionId: string,
  expectedRevision: number,
  snapshot: Prisma.InputJsonValue,
  event: "APPROVED" | "DIRECT_APPROVED" = "APPROVED",
) {
  const updated = await context.prisma.projectProduction.updateMany({
    where: {
      id: productionId,
      ...scopeWhere(scope, projectId),
      status: "DRAFT",
      revision: expectedRevision,
    },
    data: {
      status: "APPROVED",
      revision: { increment: 1 },
      approvedByUserId: scope.actorUserId,
      approvedAt: new Date(),
    },
  });
  if (updated.count !== 1) return null;
  await context.prisma.projectProductionRevision.create({
    data: {
      productionId,
      revision: expectedRevision + 1,
      event,
      snapshot,
      actorUserId: scope.actorUserId,
    },
  });
  return findProductionHandler(context, scope, projectId, productionId);
}

export async function reopenProductionHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  productionId: string,
  expectedRevision: number,
  reason: string,
  snapshot: Prisma.InputJsonValue,
) {
  const updated = await context.prisma.projectProduction.updateMany({
    where: {
      id: productionId,
      ...scopeWhere(scope, projectId),
      status: "APPROVED",
      revision: expectedRevision,
    },
    data: {
      status: "DRAFT",
      revision: { increment: 1 },
      approvedByUserId: null,
      approvedAt: null,
      lastReopenReason: reason,
    },
  });
  if (updated.count !== 1) return null;
  await Promise.all([
    context.prisma.projectProductionRevision.create({
      data: {
        productionId,
        revision: expectedRevision + 1,
        event: "REOPENED",
        reason,
        snapshot,
        actorUserId: scope.actorUserId,
      },
    }),
    context.prisma.projectDailyReportProduction.updateMany({
      where: { productionId },
      data: { isStale: true },
    }),
  ]);
  return findProductionHandler(context, scope, projectId, productionId);
}

export async function addProductionTripHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  productionId: string,
  input: {
    expectedRevision: number;
    idempotencyKey: string;
    productionEquipmentId: string;
    recordedAt: Date;
    capacityM3: string;
    adjustedVolumeM3: string | null;
    ticketNumber: string | null;
    notes: string | null;
  },
  snapshot: Prisma.InputJsonValue,
) {
  const duplicate = await context.prisma.projectProductionTrip.findUnique({
    where: {
      productionId_idempotencyKey: {
        productionId,
        idempotencyKey: input.idempotencyKey,
      },
    },
  });
  if (duplicate) {
    const samePayload =
      duplicate.productionEquipmentId === input.productionEquipmentId &&
      duplicate.capacityM3.toFixed(3) === input.capacityM3 &&
      (duplicate.adjustedVolumeM3?.toFixed(3) ?? null) ===
        input.adjustedVolumeM3 &&
      duplicate.ticketNumber === input.ticketNumber &&
      duplicate.notes === input.notes;
    return {
      duplicate,
      payloadConflict: !samePayload,
      production: await findProductionHandler(
        context,
        scope,
        projectId,
        productionId,
      ),
    };
  }

  const bumped = await context.prisma.projectProduction.updateMany({
    where: {
      id: productionId,
      ...scopeWhere(scope, projectId),
      status: "DRAFT",
      entryMode: "TRIPS",
      revision: input.expectedRevision,
    },
    data: { revision: { increment: 1 } },
  });
  if (bumped.count !== 1) return null;
  const trip = await context.prisma.projectProductionTrip.create({
    data: {
      productionId,
      productionEquipmentId: input.productionEquipmentId,
      idempotencyKey: input.idempotencyKey,
      recordedAt: input.recordedAt,
      capacityM3: input.capacityM3,
      adjustedVolumeM3: input.adjustedVolumeM3,
      ticketNumber: input.ticketNumber,
      notes: input.notes,
      createdByUserId: scope.actorUserId,
    },
  });
  await context.prisma.projectProductionRevision.create({
    data: {
      productionId,
      revision: input.expectedRevision + 1,
      event: "TRIP_ADDED",
      snapshot,
      actorUserId: scope.actorUserId,
    },
  });
  return {
    duplicate: trip,
    payloadConflict: false,
    production: await findProductionHandler(
      context,
      scope,
      projectId,
      productionId,
    ),
  };
}

export async function removeProductionTripHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  productionId: string,
  tripId: string,
  expectedRevision: number,
  snapshot: Prisma.InputJsonValue,
) {
  const existing = await context.prisma.projectProductionTrip.findFirst({
    where: { id: tripId, productionId },
    select: { id: true },
  });
  if (!existing) return { missing: true as const };
  const bumped = await context.prisma.projectProduction.updateMany({
    where: {
      id: productionId,
      ...scopeWhere(scope, projectId),
      status: "DRAFT",
      revision: expectedRevision,
    },
    data: { revision: { increment: 1 } },
  });
  if (bumped.count !== 1) return null;
  await context.prisma.projectProductionTrip.deleteMany({
    where: { id: tripId, productionId },
  });
  await context.prisma.projectProductionRevision.create({
    data: {
      productionId,
      revision: expectedRevision + 1,
      event: "TRIP_REMOVED",
      snapshot,
      actorUserId: scope.actorUserId,
    },
  });
  return {
    missing: false as const,
    production: await findProductionHandler(
      context,
      scope,
      projectId,
      productionId,
    ),
  };
}

export async function findDailyReportForProductionHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  reportId: string,
) {
  return context.prisma.projectDailyReport.findFirst({
    where: { id: reportId, ...scopeWhere(scope, projectId) },
    select: {
      id: true,
      projectId: true,
      reportDate: true,
      shift: true,
      status: true,
    },
  });
}

export async function listShiftProductionsHandler(
  context: HandlerContext,
  scope: ProductionScope,
  projectId: string,
  productionDate: Date,
  shift: "DAY" | "NIGHT",
) {
  return context.prisma.projectProduction.findMany({
    where: { ...scopeWhere(scope, projectId), productionDate, shift },
    orderBy: [{ serviceCodeSnapshot: "asc" }, { id: "asc" }],
    take: 201,
    include: productionDetailInclude,
  });
}

export async function confirmDailyReportProductionsHandler(
  context: HandlerContext,
  scope: ProductionScope,
  reportId: string,
  productions: Array<{ id: string; revision: number }>,
) {
  const ids = productions.map((item) => item.id);
  await context.prisma.projectDailyReportProduction.deleteMany({
    where: { dailyReportId: reportId, productionId: { notIn: ids } },
  });
  const confirmedAt = new Date();
  for (const production of productions)
    await context.prisma.projectDailyReportProduction.upsert({
      where: {
        dailyReportId_productionId: {
          dailyReportId: reportId,
          productionId: production.id,
        },
      },
      create: {
        dailyReportId: reportId,
        productionId: production.id,
        confirmedRevision: production.revision,
        isStale: false,
        confirmedByUserId: scope.actorUserId,
        confirmedAt,
      },
      update: {
        confirmedRevision: production.revision,
        isStale: false,
        confirmedByUserId: scope.actorUserId,
        confirmedAt,
      },
    });
  return context.prisma.projectDailyReportProduction.findMany({
    where: { dailyReportId: reportId },
    orderBy: { confirmedAt: "asc" },
  });
}

export async function dailyReportProductionReadinessHandler(
  context: HandlerContext,
  scope: { corporationId: string; companyId: string },
  input: {
    projectId: string;
    reportId: string;
    productionDate: Date;
    shift: "DAY" | "NIGHT";
  },
) {
  const productions = await context.prisma.projectProduction.findMany({
    where: {
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      projectId: input.projectId,
      productionDate: input.productionDate,
      shift: input.shift,
    },
    take: 201,
    select: {
      id: true,
      status: true,
      revision: true,
      dailyReportLinks: {
        where: { dailyReportId: input.reportId },
        select: { confirmedRevision: true, isStale: true },
      },
    },
  });
  return {
    count: productions.length,
    hasDrafts: productions.some((production) => production.status === "DRAFT"),
    hasUnconfirmed: productions.some((production) => {
      const link = production.dailyReportLinks[0];
      return (
        !link || link.isStale || link.confirmedRevision !== production.revision
      );
    }),
  };
}

function withoutEquipment(data: ProductionWriteData) {
  const { equipment, ...scalars } = data;
  void equipment;
  return scalars;
}

function equipmentScalars(item: ProductionWriteData["equipment"][number]) {
  const { stops, ...scalars } = item;
  void stops;
  return scalars;
}

function equipmentCreate(items: ProductionWriteData["equipment"]) {
  return items.map((item) => ({
    ...equipmentScalars(item),
    stops: { create: item.stops },
  }));
}

function productionBoundary(
  boundary: CursorBoundary | null,
  direction: SortDirection,
): Prisma.ProjectProductionWhereInput[] | null {
  if (!boundary) return null;
  if (typeof boundary.value !== "string") throw invalidCursorError();
  const match = /^(\d{4}-\d{2}-\d{2})\|([01])$/u.exec(boundary.value);
  if (!match || !/^[0-9a-f-]{36}$/iu.test(boundary.id))
    throw invalidCursorError();
  const productionDate = new Date(`${match[1]}T00:00:00.000Z`);
  if (Number.isNaN(productionDate.getTime())) throw invalidCursorError();
  const shiftOrder = Number(match[2]);
  const operator = direction === "asc" ? "gt" : "lt";
  return [
    { productionDate: { [operator]: productionDate } },
    { productionDate, shiftOrder: { [operator]: shiftOrder } },
    { productionDate, shiftOrder, id: { [operator]: boundary.id } },
  ];
}
