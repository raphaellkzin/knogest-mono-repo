import { AppError } from "../../lib/utils/appError";
import {
  buildCursorPage,
  parseBoundCursor,
} from "../../lib/utils/cursor-pagination";
import type { HandlerContext } from "../../lib/utils/handler.dto";
import type {
  ProductionCommand,
  ProductionListQuery,
  ProductionOptionsQuery,
  ProductionReopen,
  ProductionTransition,
  ProductionTripCommand,
} from "./productions.dto";
import {
  addProductionTripHandler,
  approveProductionHandler,
  confirmDailyReportProductionsHandler,
  countShiftProductionsHandler,
  createProductionHandler,
  findDailyReportForProductionHandler,
  findProductionHandler,
  findProductionOptionsContextHandler,
  listProductionsHandler,
  listShiftProductionsHandler,
  removeProductionTripHandler,
  reopenProductionHandler,
  replaceProductionHandler,
  type ProductionScope,
  type ProductionWriteData,
} from "./handlers/productions.handler";

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

const roleToDb = {
  excavation: "EXCAVATION",
  loading: "LOADING",
  transport: "TRANSPORT",
  spreading: "SPREADING",
  grading: "GRADING",
  compaction: "COMPACTION",
  watering: "WATERING",
  support: "SUPPORT",
} as const;

const profileByServiceCode: Record<
  string,
  ProductionWriteData["productionProfileSnapshot"]
> = {
  cut: "EXCAVATION",
  fill: "COMPACTION",
  finishing: "GRADING",
  top_soil: "SPREADING",
  unsuitable_soil_removal: "TRANSPORT",
  replacement_fill: "COMPACTION",
};

type ProductionRecord = NonNullable<
  Awaited<ReturnType<typeof findProductionHandler>>
>;

export class ProductionsService {
  constructor(private readonly context: HandlerContext) {}

  async options(
    scope: ProductionScope,
    projectId: string,
    query: ProductionOptionsQuery,
  ) {
    const interval = shiftInterval(query.productionDate, query.shift);
    const context = await findProductionOptionsContextHandler(
      this.context,
      scope,
      projectId,
      interval,
      shiftToDb(query.shift),
    );
    if (!context) throw projectUnavailable();
    if (!context.shiftEnabled) throw shiftNotEnabled();
    const assignmentByFront = new Map<string, typeof context.assignments>();
    for (const assignment of context.assignments) {
      const current = assignmentByFront.get(assignment.workFrontId) ?? [];
      if (!current.some((item) => item.machineId === assignment.machineId))
        current.push(assignment);
      assignmentByFront.set(assignment.workFrontId, current);
    }
    return {
      project: context.project,
      defaults: {
        productionDate: query.productionDate,
        shift: query.shift,
      },
      capabilities: capabilities(scope),
      responsibleOptions: uniqueBy(
        context.employeeAllocations.flatMap((allocation) =>
          allocation.employment.isActive &&
          allocation.employment.state === "ACTIVE"
            ? [
                {
                  id: allocation.employmentId,
                  name: allocation.employment.person.displayName,
                  jobRole: allocation.jobRole,
                },
              ]
            : [],
        ),
        (item) => item.id,
      ),
      workFronts: context.fronts.map((front) => ({
        ...front,
        services: context.services
          .filter((service) => service.workFrontId === front.id)
          .map((service) => ({
            id: service.id,
            serviceCode: service.serviceCode,
            unitCode: service.unitCode,
            quantity: service.quantity.toFixed(2),
            productionProfile: resolvedProfile(
              service.productionProfile,
              service.serviceCode,
            ).toLowerCase(),
            dmtPolicy: service.dmtPolicy.toLowerCase(),
          })),
        machines: (assignmentByFront.get(front.id) ?? []).flatMap(
          (assignment) =>
            assignment.machine.isActive
              ? [
                  {
                    id: assignment.machine.id,
                    name: assignment.machine.name,
                    manufacturer: assignment.machine.manufacturer,
                    model: assignment.machine.model,
                    meterType: assignment.machine.meterType.toLowerCase(),
                    identifier:
                      assignment.machine.identifiers[0]?.value ?? null,
                    operator: {
                      id: assignment.operator.id,
                      name: assignment.operator.person.displayName,
                    },
                  },
                ]
              : [],
        ),
      })),
    };
  }

  async create(
    scope: ProductionScope,
    projectId: string,
    command: ProductionCommand,
  ) {
    assertCapability(
      scope,
      command.approveNow ? "publishDirect" : "createDraft",
    );
    return this.context.transaction(async (transactionContext) => {
      const data = await this.resolveWriteData(
        transactionContext,
        scope,
        projectId,
        command,
      );
      const shiftProductionCount = await countShiftProductionsHandler(
        transactionContext,
        scope,
        projectId,
        data.productionDate,
        data.shift,
      );
      if (shiftProductionCount >= 200)
        throw new AppError({
          code: "PRODUCTION_SHIFT_LIMIT_EXCEEDED",
          message: "The production limit for this project shift was reached",
          statusCode: 409,
          data: { limit: 200 },
        });
      if (command.approveNow)
        validateApprovalData(data, {
          operationalQuantity:
            data.measuredQuantity ?? data.directQuantity ?? "0.000",
          tripCount: 0,
        });
      const record = await createProductionHandler(
        transactionContext,
        scope,
        projectId,
        data,
        {
          approved: command.approveNow,
          event: command.approveNow ? "DIRECT_APPROVED" : "CREATED",
          snapshot: snapshotOf(
            command,
            command.approveNow ? "direct-approved" : "created",
          ),
        },
      );
      return toDetailDto(record);
    });
  }

  async update(
    scope: ProductionScope,
    projectId: string,
    productionId: string,
    command: ProductionCommand,
  ) {
    assertCapability(scope, "createDraft");
    if (command.approveNow) assertCapability(scope, "publishDirect");
    const expectedRevision = command.expectedRevision;
    if (!expectedRevision) throw revisionRequired();
    return this.context.transaction(async (transactionContext) => {
      const current = await findProductionHandler(
        transactionContext,
        scope,
        projectId,
        productionId,
      );
      if (!current) throw notFound();
      if (current.status !== "DRAFT") throw immutable();
      assertEquipmentWithTripsPreserved(current, command);
      const data = await this.resolveWriteData(
        transactionContext,
        scope,
        projectId,
        command,
      );
      const record = await replaceProductionHandler(
        transactionContext,
        scope,
        projectId,
        productionId,
        expectedRevision,
        data,
        snapshotOf(command, "updated"),
      );
      if (!record) throw changedConcurrently();
      if (command.approveNow) {
        validateApproval(record);
        const approved = await approveProductionHandler(
          transactionContext,
          scope,
          projectId,
          productionId,
          record.revision,
          snapshotOf(toDetailDto(record), "direct-approved"),
          "DIRECT_APPROVED",
        );
        if (!approved) throw changedConcurrently();
        return toDetailDto(approved);
      }
      return toDetailDto(record);
    });
  }

  async detail(
    scope: ProductionScope,
    projectId: string,
    productionId: string,
  ) {
    const record = await findProductionHandler(
      this.context,
      scope,
      projectId,
      productionId,
    );
    if (!record) throw notFound();
    return toDetailDto(record);
  }

  async list(
    scope: ProductionScope,
    projectId: string,
    query: ProductionListQuery,
  ) {
    const normalizedQuery = {
      productionDate: query.productionDate ?? null,
      shift: query.shift ?? null,
      status: query.status ?? null,
      workFrontId: query.workFrontId ?? null,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    };
    const cursorScope = {
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      projectId,
    };
    const boundary = parseBoundCursor({
      cursor: query.cursor,
      query: normalizedQuery,
      resource: "project-productions",
      scope: cursorScope,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    const records = await listProductionsHandler(
      this.context,
      scope,
      projectId,
      {
        boundary,
        limit: query.limit,
        productionDate: query.productionDate
          ? civilDateValue(query.productionDate)
          : undefined,
        shift: query.shift ? shiftToDb(query.shift) : undefined,
        status:
          query.status === "approved"
            ? "APPROVED"
            : query.status === "draft"
              ? "DRAFT"
              : undefined,
        workFrontId: query.workFrontId,
        sortDirection: query.sortDirection,
      },
    );
    const page = buildCursorPage({
      items: records,
      limit: query.limit,
      query: normalizedQuery,
      resource: "project-productions",
      scope: cursorScope,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
      getLast: (item) => ({
        id: item.id,
        value: `${civilDate(item.productionDate)}|${item.shiftOrder}`,
      }),
    });
    return {
      data: page.data.map(toSummaryDto),
      pageInfo: page.pageInfo,
      capabilities: capabilities(scope),
    };
  }

  async approve(
    scope: ProductionScope,
    projectId: string,
    productionId: string,
    command: ProductionTransition,
  ) {
    const current = await findProductionHandler(
      this.context,
      scope,
      projectId,
      productionId,
    );
    if (!current) throw notFound();
    assertCapability(
      scope,
      current.createdByUserId === scope.actorUserId
        ? "publishDirect"
        : "approveOthers",
    );
    if (current.status !== "DRAFT") throw immutable();
    validateApproval(current);
    const record = await this.context.transaction((transactionContext) =>
      approveProductionHandler(
        transactionContext,
        scope,
        projectId,
        productionId,
        command.expectedRevision,
        snapshotOf(toDetailDto(current), "approved"),
      ),
    );
    if (!record) throw changedConcurrently();
    return toDetailDto(record);
  }

  async reopen(
    scope: ProductionScope,
    projectId: string,
    productionId: string,
    command: ProductionReopen,
  ) {
    assertCapability(scope, "reopen");
    const current = await findProductionHandler(
      this.context,
      scope,
      projectId,
      productionId,
    );
    if (!current) throw notFound();
    if (current.status !== "APPROVED") throw immutable();
    const record = await this.context.transaction((transactionContext) =>
      reopenProductionHandler(
        transactionContext,
        scope,
        projectId,
        productionId,
        command.expectedRevision,
        command.reason,
        snapshotOf(toDetailDto(current), "reopened"),
      ),
    );
    if (!record) throw changedConcurrently();
    return toDetailDto(record);
  }

  async addTrip(
    scope: ProductionScope,
    projectId: string,
    productionId: string,
    command: ProductionTripCommand,
  ) {
    assertCapability(scope, "createDraft");
    return this.context.transaction(async (transactionContext) => {
      const production = await findProductionHandler(
        transactionContext,
        scope,
        projectId,
        productionId,
      );
      if (!production) throw notFound();
      if (production.status !== "DRAFT" || production.entryMode !== "TRIPS")
        throw immutable();
      const equipment = production.equipment.find(
        (item) => item.id === command.productionEquipmentId,
      );
      if (!equipment || equipment.role !== "TRANSPORT")
        throw resourceUnavailable("transport-equipment");
      const capacity =
        command.capacityM3 ?? equipment.defaultTripCapacityM3?.toFixed(3);
      if (!capacity) throw resourceUnavailable("trip-capacity");
      const recordedAt = command.recordedAt
        ? new Date(command.recordedAt)
        : new Date();
      const interval = shiftInterval(
        civilDate(production.productionDate),
        production.shift === "DAY" ? "day" : "night",
      );
      if (
        recordedAt.getTime() < interval.startAt.getTime() ||
        recordedAt.getTime() > interval.endAt.getTime()
      )
        throw new AppError({
          code: "PRODUCTION_RESOURCE_UNAVAILABLE",
          message: "Trip timestamp is outside the production shift",
          statusCode: 422,
          data: { resource: "trip-recorded-at" },
        });
      const result = await addProductionTripHandler(
        transactionContext,
        scope,
        projectId,
        productionId,
        {
          expectedRevision: command.expectedRevision,
          idempotencyKey: command.idempotencyKey,
          productionEquipmentId: command.productionEquipmentId,
          recordedAt,
          capacityM3: normalizeDecimal(capacity, 3),
          adjustedVolumeM3: command.adjustedVolumeM3
            ? normalizeDecimal(command.adjustedVolumeM3, 3)
            : null,
          ticketNumber: command.ticketNumber,
          notes: command.notes,
        },
        snapshotOf(command, "trip-added"),
      );
      if (!result) throw changedConcurrently();
      if (result.payloadConflict)
        throw new AppError({
          code: "IDEMPOTENCY_PAYLOAD_CONFLICT",
          message: "Idempotency key was already used with another trip payload",
          statusCode: 409,
        });
      if (!result.production) throw notFound();
      return toDetailDto(result.production);
    });
  }

  async removeTrip(
    scope: ProductionScope,
    projectId: string,
    productionId: string,
    tripId: string,
    expectedRevision: number,
  ) {
    assertCapability(scope, "createDraft");
    const result = await this.context.transaction((transactionContext) =>
      removeProductionTripHandler(
        transactionContext,
        scope,
        projectId,
        productionId,
        tripId,
        expectedRevision,
        snapshotOf({ tripId }, "trip-removed"),
      ),
    );
    if (!result) throw changedConcurrently();
    if (result.missing) throw notFound();
    if (!result.production) throw notFound();
    return toDetailDto(result.production);
  }

  async dailyReportSummary(
    scope: ProductionScope,
    projectId: string,
    reportId: string,
  ) {
    const report = await findDailyReportForProductionHandler(
      this.context,
      scope,
      projectId,
      reportId,
    );
    if (!report) throw notFound();
    const records = await listShiftProductionsHandler(
      this.context,
      scope,
      projectId,
      report.reportDate,
      report.shift,
    );
    assertShiftCollectionBound(records);
    return summarizeForDailyReport(report.id, records);
  }

  async confirmDailyReport(
    scope: ProductionScope,
    projectId: string,
    reportId: string,
    productionIds: string[],
  ) {
    const report = await findDailyReportForProductionHandler(
      this.context,
      scope,
      projectId,
      reportId,
    );
    if (!report) throw notFound();
    const records = await listShiftProductionsHandler(
      this.context,
      scope,
      projectId,
      report.reportDate,
      report.shift,
    );
    assertShiftCollectionBound(records);
    const selected = records.filter((record) =>
      productionIds.includes(record.id),
    );
    if (
      selected.length !== new Set(productionIds).size ||
      selected.some((record) => record.status !== "APPROVED")
    )
      throw new AppError({
        code: "PRODUCTION_RDO_CONFIRMATION_REQUIRED",
        message:
          "Only approved productions from the report shift can be confirmed",
        statusCode: 409,
      });
    await this.context.transaction((transactionContext) =>
      confirmDailyReportProductionsHandler(
        transactionContext,
        scope,
        reportId,
        selected.map((record) => ({
          id: record.id,
          revision: record.revision,
        })),
      ),
    );
    const refreshed = await listShiftProductionsHandler(
      this.context,
      scope,
      projectId,
      report.reportDate,
      report.shift,
    );
    assertShiftCollectionBound(refreshed);
    return summarizeForDailyReport(report.id, refreshed);
  }

  private async resolveWriteData(
    context: HandlerContext,
    scope: ProductionScope,
    projectId: string,
    command: ProductionCommand,
  ): Promise<ProductionWriteData> {
    const options = await findProductionOptionsContextHandler(
      context,
      scope,
      projectId,
      shiftInterval(command.productionDate, command.shift),
      shiftToDb(command.shift),
    );
    if (!options) throw projectUnavailable();
    if (!options.shiftEnabled) throw shiftNotEnabled();
    const front = options.fronts.find(
      (item) => item.id === command.workFrontId,
    );
    const service = options.services.find(
      (item) =>
        item.id === command.workFrontServiceId &&
        item.workFrontId === command.workFrontId,
    );
    if (!front || !service) throw resourceUnavailable("work-front-service");
    const assignments = options.assignments.filter(
      (item) => item.workFrontId === command.workFrontId,
    );
    const assignmentByMachine = new Map(
      assignments.map((item) => [item.machineId, item]),
    );
    const responsible = command.responsibleEmploymentId
      ? options.employeeAllocations.find(
          (item) => item.employmentId === command.responsibleEmploymentId,
        )?.employment
      : null;
    if (
      command.responsibleEmploymentId &&
      (!responsible || !responsible.isActive || responsible.state !== "ACTIVE")
    )
      throw resourceUnavailable("responsible");

    const equipment = command.equipment.map((entry) => {
      const assignment = assignmentByMachine.get(entry.machineId);
      if (!assignment || !assignment.machine.isActive)
        throw resourceUnavailable("machine");
      if (
        entry.operatorEmploymentId &&
        entry.operatorEmploymentId !== assignment.operatorEmploymentId
      )
        throw resourceUnavailable("operator");
      return {
        machineId: assignment.machine.id,
        machineNameSnapshot: assignment.machine.name,
        manufacturerSnapshot: assignment.machine.manufacturer,
        modelSnapshot: assignment.machine.model,
        identifierSnapshot: assignment.machine.identifiers[0]?.value ?? null,
        meterTypeSnapshot: assignment.machine.meterType,
        role: roleToDb[entry.role],
        operatorEmploymentId: entry.operatorEmploymentId,
        operatorNameSnapshot: entry.operatorEmploymentId
          ? assignment.operator.person.displayName
          : null,
        initialMeterValue: entry.initialMeterValue
          ? normalizeDecimal(entry.initialMeterValue, 2)
          : null,
        finalMeterValue: entry.finalMeterValue
          ? normalizeDecimal(entry.finalMeterValue, 2)
          : null,
        workedMinutes: entry.workedMinutes,
        defaultTripCapacityM3: entry.defaultTripCapacityM3
          ? normalizeDecimal(entry.defaultTripCapacityM3, 3)
          : null,
        stops: entry.stops,
      };
    });
    const profile = resolvedProfile(
      service.productionProfile,
      service.serviceCode,
    );
    validateDmt(service.dmtPolicy, command);

    return {
      workFrontId: command.workFrontId,
      workFrontServiceId: command.workFrontServiceId,
      serviceCodeSnapshot: service.serviceCode,
      unitCodeSnapshot: service.unitCode,
      productionProfileSnapshot: profile,
      dmtPolicySnapshot: service.dmtPolicy,
      productionDate: civilDateValue(command.productionDate),
      shift: shiftToDb(command.shift),
      shiftOrder: command.shift === "day" ? 0 : 1,
      entryMode: command.entryMode === "trips" ? "TRIPS" : "DIRECT_TOTAL",
      startTime: command.startTime,
      endTime: command.endTime,
      endDayOffset: command.endDayOffset,
      responsibleEmploymentId: command.responsibleEmploymentId,
      responsibleNameSnapshot: responsible?.person.displayName ?? null,
      location: command.location || front.location,
      startStation: command.startStation,
      endStation: command.endStation,
      layer: command.layer,
      elevation: command.elevation,
      materialName: command.materialName,
      materialCategory: command.materialCategory,
      volumeCondition: command.volumeCondition
        ? (command.volumeCondition.toUpperCase() as
            | "CUT"
            | "LOOSE"
            | "COMPACTED")
        : null,
      directQuantity: command.directQuantity
        ? normalizeDecimal(command.directQuantity, 3)
        : null,
      measuredQuantity: command.measuredQuantity
        ? normalizeDecimal(command.measuredQuantity, 3)
        : null,
      conversionFactor: command.conversionFactor
        ? normalizeDecimal(command.conversionFactor, 6)
        : null,
      origin: command.origin,
      destination: command.destination,
      dmtKm: command.dmtKm ? normalizeDecimal(command.dmtKm, 3) : null,
      layerThicknessCm: command.layerThicknessCm
        ? normalizeDecimal(command.layerThicknessCm, 2)
        : null,
      compactionPasses: command.compactionPasses,
      moistureCondition: command.moistureCondition,
      evidence: command.evidence,
      notes: command.notes,
      equipment,
    };
  }
}

export function toDetailDto(record: ProductionRecord) {
  const metrics = calculateMetrics(record);
  return {
    id: record.id,
    projectId: record.projectId,
    workFrontId: record.workFrontId,
    workFrontServiceId: record.workFrontServiceId,
    serviceCode: record.serviceCodeSnapshot,
    unitCode: record.unitCodeSnapshot,
    productionProfile: record.productionProfileSnapshot.toLowerCase(),
    dmtPolicy: record.dmtPolicySnapshot.toLowerCase(),
    productionDate: civilDate(record.productionDate),
    shift: record.shift.toLowerCase(),
    status: record.status.toLowerCase(),
    entryMode: record.entryMode.toLowerCase(),
    revision: record.revision,
    startTime: record.startTime,
    endTime: record.endTime,
    endDayOffset: record.endDayOffset,
    responsible: record.responsibleEmploymentId
      ? {
          employmentId: record.responsibleEmploymentId,
          name: record.responsibleNameSnapshot,
        }
      : null,
    location: record.location,
    startStation: record.startStation,
    endStation: record.endStation,
    layer: record.layer,
    elevation: record.elevation,
    materialName: record.materialName,
    materialCategory: record.materialCategory,
    volumeCondition: record.volumeCondition?.toLowerCase() ?? null,
    directQuantity: record.directQuantity?.toFixed(3) ?? null,
    measuredQuantity: record.measuredQuantity?.toFixed(3) ?? null,
    conversionFactor: record.conversionFactor?.toFixed(6) ?? null,
    origin: record.origin,
    destination: record.destination,
    dmtKm: record.dmtKm?.toFixed(3) ?? null,
    layerThicknessCm: record.layerThicknessCm?.toFixed(2) ?? null,
    compactionPasses: record.compactionPasses,
    moistureCondition: record.moistureCondition,
    evidence: productionEvidence(record.evidence),
    notes: record.notes,
    metrics,
    equipment: record.equipment.map((item) => ({
      id: item.id,
      machineId: item.machineId,
      name: item.machineNameSnapshot,
      manufacturer: item.manufacturerSnapshot,
      model: item.modelSnapshot,
      identifier: item.identifierSnapshot,
      meterType: item.meterTypeSnapshot.toLowerCase(),
      role: item.role.toLowerCase(),
      operator: item.operatorEmploymentId
        ? {
            employmentId: item.operatorEmploymentId,
            name: item.operatorNameSnapshot,
          }
        : null,
      initialMeterValue: item.initialMeterValue?.toFixed(2) ?? null,
      finalMeterValue: item.finalMeterValue?.toFixed(2) ?? null,
      workedMinutes: item.workedMinutes,
      defaultTripCapacityM3: item.defaultTripCapacityM3?.toFixed(3) ?? null,
      stoppedMinutes: item.stops.reduce(
        (total, stop) => total + stop.durationMinutes,
        0,
      ),
      stops: item.stops.map((stop) => ({
        id: stop.id,
        durationMinutes: stop.durationMinutes,
        reason: stop.reason,
        notes: stop.notes,
      })),
      tripCount: item.trips.length,
      tripVolumeM3: sumTripVolume(item.trips),
    })),
    trips: record.trips.map((trip) => ({
      id: trip.id,
      productionEquipmentId: trip.productionEquipmentId,
      idempotencyKey: trip.idempotencyKey,
      recordedAt: trip.recordedAt.toISOString(),
      capacityM3: trip.capacityM3.toFixed(3),
      adjustedVolumeM3: trip.adjustedVolumeM3?.toFixed(3) ?? null,
      ticketNumber: trip.ticketNumber,
      notes: trip.notes,
    })),
    approval: {
      approvedByUserId: record.approvedByUserId,
      approvedAt: record.approvedAt?.toISOString() ?? null,
      direct: record.revisions.some((item) => item.event === "DIRECT_APPROVED"),
    },
    rdo: {
      linked: record.dailyReportLinks.length > 0,
      stale: record.dailyReportLinks.some((item) => item.isStale),
    },
    lastReopenReason: record.lastReopenReason,
    createdByUserId: record.createdByUserId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toSummaryDto(record: ProductionRecord) {
  const detail = toDetailDto(record);
  return {
    id: detail.id,
    serviceCode: detail.serviceCode,
    unitCode: detail.unitCode,
    productionDate: detail.productionDate,
    shift: detail.shift,
    status: detail.status,
    revision: detail.revision,
    location: detail.location,
    route:
      detail.origin || detail.destination
        ? { origin: detail.origin, destination: detail.destination }
        : null,
    dmtKm: detail.dmtKm,
    volumeCondition: detail.volumeCondition,
    officialQuantity: detail.metrics.officialQuantity,
    operationalVolumeM3: detail.metrics.operationalVolumeM3,
    tripCount: detail.metrics.tripCount,
    equipmentCount: detail.equipment.length,
    needsApproval: detail.status === "draft",
    rdo: detail.rdo,
    updatedAt: detail.updatedAt,
  };
}

function calculateMetrics(record: ProductionRecord) {
  return calculateProductionMetrics({
    tripVolumesM3: record.trips.map(
      (trip) => trip.adjustedVolumeM3?.toFixed(3) ?? trip.capacityM3.toFixed(3),
    ),
    measuredQuantity: record.measuredQuantity?.toFixed(3) ?? null,
    directQuantity: record.directQuantity?.toFixed(3) ?? null,
    conversionFactor: record.conversionFactor?.toFixed(6) ?? null,
    entryMode: record.entryMode,
    dmtKm: record.dmtKm?.toFixed(3) ?? null,
    unitCode: record.unitCodeSnapshot,
    startTime: record.startTime,
    endTime: record.endTime,
    endDayOffset: record.endDayOffset,
    workedMinutes: record.equipment.reduce(
      (total, item) => total + (item.workedMinutes ?? 0),
      0,
    ),
    stoppedMinutes: record.equipment.reduce(
      (total, item) =>
        total +
        item.stops.reduce(
          (stopTotal, stop) => stopTotal + stop.durationMinutes,
          0,
        ),
      0,
    ),
  });
}

export function calculateProductionMetrics(input: {
  tripVolumesM3: string[];
  measuredQuantity: string | null;
  directQuantity: string | null;
  conversionFactor: string | null;
  entryMode: "DIRECT_TOTAL" | "TRIPS";
  dmtKm: string | null;
  unitCode: string;
  startTime: string | null;
  endTime: string | null;
  endDayOffset: number;
  workedMinutes: number;
  stoppedMinutes: number;
}) {
  const operationalVolumeM3 = scaledToDecimal(
    input.tripVolumesM3.reduce(
      (sum, volume) => sum + decimalToScaled(volume, 3),
      BigInt(0),
    ),
    3,
  );
  const officialQuantity =
    input.measuredQuantity ??
    (input.entryMode === "TRIPS"
      ? isVolumetric(input.unitCode)
        ? operationalVolumeM3
        : input.conversionFactor
          ? multiplyDecimal(
              operationalVolumeM3,
              input.conversionFactor,
              3,
              3,
              6,
            )
          : "0.000"
      : (input.directQuantity ?? "0.000"));
  const difference =
    input.measuredQuantity &&
    input.tripVolumesM3.length &&
    isVolumetric(input.unitCode)
      ? subtractDecimal(input.measuredQuantity, operationalVolumeM3)
      : null;
  const differencePercent =
    difference && Number(operationalVolumeM3) > 0
      ? ((Number(difference) / Number(operationalVolumeM3)) * 100).toFixed(2)
      : null;
  const duration = activityDuration(
    input.startTime,
    input.endTime,
    input.endDayOffset,
  );
  const hours = duration ? duration / 60 : null;
  return {
    operationalVolumeM3,
    officialQuantity,
    difference,
    differencePercent,
    tripCount: input.tripVolumesM3.length,
    tripsPerHour:
      hours && hours > 0
        ? (input.tripVolumesM3.length / hours).toFixed(2)
        : null,
    quantityPerHour:
      hours && hours > 0 ? (Number(officialQuantity) / hours).toFixed(3) : null,
    dmtKm: input.dmtKm,
    transportMomentM3Km:
      input.dmtKm &&
      (input.tripVolumesM3.length || isVolumetric(input.unitCode))
        ? multiplyDecimal(
            input.tripVolumesM3.length ? operationalVolumeM3 : officialQuantity,
            input.dmtKm,
            3,
          )
        : null,
    workedMinutes: input.workedMinutes,
    stoppedMinutes: input.stoppedMinutes,
  };
}

function validateApproval(record: ProductionRecord) {
  const metrics = calculateMetrics(record);
  validateApprovalData(
    {
      unitCodeSnapshot: record.unitCodeSnapshot,
      entryMode: record.entryMode,
      volumeCondition: record.volumeCondition,
      responsibleEmploymentId: record.responsibleEmploymentId,
      startTime: record.startTime,
      endTime: record.endTime,
      dmtPolicySnapshot: record.dmtPolicySnapshot,
      dmtKm: record.dmtKm?.toFixed(3) ?? null,
      conversionFactor: record.conversionFactor?.toFixed(6) ?? null,
      origin: record.origin,
      destination: record.destination,
      productionProfileSnapshot: record.productionProfileSnapshot,
      layerThicknessCm: record.layerThicknessCm?.toFixed(2) ?? null,
      compactionPasses: record.compactionPasses,
      equipment: record.equipment.map((item) => ({
        role: item.role,
        defaultTripCapacityM3: item.defaultTripCapacityM3?.toFixed(3) ?? null,
      })),
    },
    {
      operationalQuantity: metrics.officialQuantity,
      tripCount: metrics.tripCount,
    },
  );
}

function validateApprovalData(
  data: Omit<
    Pick<
      ProductionWriteData,
      | "unitCodeSnapshot"
      | "entryMode"
      | "volumeCondition"
      | "responsibleEmploymentId"
      | "startTime"
      | "endTime"
      | "dmtPolicySnapshot"
      | "dmtKm"
      | "conversionFactor"
      | "origin"
      | "destination"
      | "productionProfileSnapshot"
      | "layerThicknessCm"
      | "compactionPasses"
    >,
    never
  > & {
    equipment: Array<{
      role: ProductionWriteData["equipment"][number]["role"];
      defaultTripCapacityM3: string | null;
    }>;
  },
  metrics: { operationalQuantity: string; tripCount: number },
) {
  const missing: string[] = [];
  if (!data.responsibleEmploymentId) missing.push("responsible");
  if (!data.startTime || !data.endTime) missing.push("activity-window");
  if (!data.equipment.length) missing.push("equipment");
  if (Number(metrics.operationalQuantity) <= 0) missing.push("quantity");
  if (isVolumetric(data.unitCodeSnapshot) && !data.volumeCondition)
    missing.push("volume-condition");
  if (
    data.productionProfileSnapshot === "TRANSPORT" &&
    !data.equipment.some((item) => item.role === "TRANSPORT")
  )
    missing.push("transport-equipment");
  if (data.entryMode === "TRIPS") {
    if (metrics.tripCount <= 0) missing.push("trips");
    if (
      !data.equipment.some(
        (item) =>
          item.role === "TRANSPORT" && Boolean(item.defaultTripCapacityM3),
      )
    )
      missing.push("transport-equipment-capacity");
    if (!isVolumetric(data.unitCodeSnapshot) && !data.conversionFactor)
      missing.push("conversion-factor");
  }
  if (
    data.dmtPolicySnapshot === "REQUIRED" &&
    (!data.dmtKm || !data.origin || !data.destination)
  )
    missing.push("route-dmt");
  if (
    ["SPREADING", "COMPACTION"].includes(data.productionProfileSnapshot) &&
    !data.layerThicknessCm
  )
    missing.push("layer-thickness");
  if (
    data.productionProfileSnapshot === "COMPACTION" &&
    data.compactionPasses === null
  )
    missing.push("compaction-passes");
  if (missing.length)
    throw new AppError({
      code: "PRODUCTION_APPROVAL_INCOMPLETE",
      message: "Production is incomplete and cannot be approved",
      statusCode: 422,
      data: { fields: missing },
    });
}

function validateDmt(
  policy: "NOT_APPLICABLE" | "OPTIONAL" | "REQUIRED",
  command: ProductionCommand,
) {
  if (
    policy === "NOT_APPLICABLE" &&
    (command.dmtKm || command.origin || command.destination)
  )
    throw new AppError({
      code: "PRODUCTION_DMT_NOT_APPLICABLE",
      message: "DMT is not applicable to this service",
      statusCode: 422,
    });
  if (
    policy === "REQUIRED" &&
    (!command.dmtKm || !command.origin || !command.destination)
  )
    throw new AppError({
      code: "PRODUCTION_DMT_REQUIRED",
      message: "Origin, destination and DMT are required",
      statusCode: 422,
    });
  if (
    policy === "OPTIONAL" &&
    command.dmtKm &&
    (!command.origin || !command.destination)
  )
    throw new AppError({
      code: "PRODUCTION_DMT_REQUIRED",
      message: "Origin and destination are required when DMT is informed",
      statusCode: 422,
    });
}

function summarizeForDailyReport(
  reportId: string,
  records: ProductionRecord[],
) {
  const rows = records.map((record) => {
    const link = record.dailyReportLinks.find(
      (item) => item.dailyReportId === reportId,
    );
    return {
      ...toSummaryDto(record),
      selected: Boolean(link),
      confirmedRevision: link?.confirmedRevision ?? null,
      stale: Boolean(
        link?.isStale || (link && link.confirmedRevision !== record.revision),
      ),
    };
  });
  const groups = new Map<
    string,
    {
      serviceCode: string;
      unitCode: string;
      volumeCondition: string | null;
      origin: string | null;
      destination: string | null;
      officialQuantity: bigint;
      operationalVolumeM3: bigint;
      tripCount: number;
      transportMomentM3Km: bigint;
      dmtWeightedVolumeM3Km: bigint;
      dmtWeightM3: bigint;
    }
  >();
  for (const record of records) {
    const detail = toDetailDto(record);
    const key = [
      detail.serviceCode,
      detail.unitCode,
      detail.volumeCondition ?? "",
      detail.origin ?? "",
      detail.destination ?? "",
    ].join("|");
    const group = groups.get(key) ?? {
      serviceCode: detail.serviceCode,
      unitCode: detail.unitCode,
      volumeCondition: detail.volumeCondition,
      origin: detail.origin,
      destination: detail.destination,
      officialQuantity: BigInt(0),
      operationalVolumeM3: BigInt(0),
      tripCount: 0,
      transportMomentM3Km: BigInt(0),
      dmtWeightedVolumeM3Km: BigInt(0),
      dmtWeightM3: BigInt(0),
    };
    group.officialQuantity += decimalToScaled(
      detail.metrics.officialQuantity,
      3,
    );
    group.operationalVolumeM3 += decimalToScaled(
      detail.metrics.operationalVolumeM3,
      3,
    );
    group.tripCount += detail.metrics.tripCount;
    group.transportMomentM3Km += decimalToScaled(
      detail.metrics.transportMomentM3Km ?? "0.000",
      3,
    );
    if (detail.dmtKm && isVolumetric(detail.unitCode)) {
      const weight =
        Number(detail.metrics.operationalVolumeM3) > 0
          ? detail.metrics.operationalVolumeM3
          : detail.metrics.officialQuantity;
      group.dmtWeightedVolumeM3Km +=
        decimalToScaled(weight, 3) * decimalToScaled(detail.dmtKm, 3);
      group.dmtWeightM3 += decimalToScaled(weight, 3);
    }
    groups.set(key, group);
  }
  return {
    reportId,
    productions: rows,
    groups: [...groups.values()].map((group) => {
      const {
        dmtWeightM3,
        dmtWeightedVolumeM3Km,
        officialQuantity,
        operationalVolumeM3,
        transportMomentM3Km,
        ...identity
      } = group;
      return {
        ...identity,
        officialQuantity: scaledToDecimal(officialQuantity, 3),
        operationalVolumeM3: scaledToDecimal(operationalVolumeM3, 3),
        transportMomentM3Km: scaledToDecimal(transportMomentM3Km, 3),
        weightedDmtKm:
          dmtWeightM3 > BigInt(0)
            ? scaledToDecimal(
                divideRounded(dmtWeightedVolumeM3Km, dmtWeightM3),
                3,
              )
            : null,
      };
    }),
    hasDrafts: records.some((record) => record.status === "DRAFT"),
    needsReconfirmation: rows.some((row) => row.stale),
  };
}

function capabilities(_scope: ProductionScope) {
  return {
    createDraft: true,
    publishDirect: true,
    approveOthers: true,
    reopen: true,
  };
}

function assertCapability(
  scope: ProductionScope,
  capability: "createDraft" | "publishDirect" | "approveOthers" | "reopen",
) {
  if (!capabilities(scope)[capability])
    throw new AppError({
      code: "FORBIDDEN",
      message: "Insufficient production permission",
      statusCode: 403,
    });
}

function assertEquipmentWithTripsPreserved(
  current: ProductionRecord,
  command: ProductionCommand,
) {
  const desired = new Set(command.equipment.map((item) => item.machineId));
  const inUse = current.equipment.filter(
    (item) => item.trips.length > 0 && !desired.has(item.machineId),
  );
  if (inUse.length)
    throw new AppError({
      code: "PRODUCTION_EQUIPMENT_HAS_TRIPS",
      message: "A machine with recorded trips cannot be removed",
      statusCode: 409,
      data: { machineIds: inUse.map((item) => item.machineId) },
    });
}

function assertShiftCollectionBound(records: ProductionRecord[]) {
  if (records.length > 200)
    throw new AppError({
      code: "PRODUCTION_SHIFT_LIMIT_EXCEEDED",
      message: "The production limit for this project shift was exceeded",
      statusCode: 409,
      data: { limit: 200 },
    });
}

function shiftToDb(shift: "day" | "night") {
  return shift === "day" ? ("DAY" as const) : ("NIGHT" as const);
}

function shiftInterval(productionDate: string, shift: "day" | "night") {
  return shift === "day"
    ? intervalFromLocal(productionDate, "00:00", "23:59", 0)
    : intervalFromLocal(productionDate, "18:00", "06:00", 1);
}

function intervalFromLocal(
  date: string,
  startTime: string,
  endTime: string,
  endDayOffset: number,
) {
  return {
    startAt: zonedDate(date, startTime, 0),
    endAt: zonedDate(date, endTime, endDayOffset),
  };
}

function zonedDate(date: string, time: string, dayOffset: number) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const base = new Date(
    Date.UTC(year, month - 1, day + dayOffset, hour, minute),
  );
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(base);
  const offset =
    parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT-3";
  const match = /GMT([+-])(\d{1,2})(?::(\d{2}))?/u.exec(offset);
  const minutes = match
    ? (match[1] === "+" ? 1 : -1) *
      (Number(match[2]) * 60 + Number(match[3] ?? 0))
    : -180;
  return new Date(base.getTime() - minutes * 60_000);
}

function civilDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function civilDateValue(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function resolvedProfile(
  stored:
    | "GENERIC"
    | "EXCAVATION"
    | "LOADING"
    | "TRANSPORT"
    | "SPREADING"
    | "GRADING"
    | "COMPACTION",
  serviceCode: string,
) {
  return stored === "GENERIC"
    ? (profileByServiceCode[serviceCode] ?? "GENERIC")
    : stored;
}

function normalizeDecimal(value: string, fractionDigits: number) {
  const [whole, fraction = ""] = value.split(".");
  return `${whole}.${fraction.padEnd(fractionDigits, "0").slice(0, fractionDigits)}`;
}

function sumTripVolume(
  trips: Array<{
    capacityM3: { toFixed(digits: number): string };
    adjustedVolumeM3: { toFixed(digits: number): string } | null;
  }>,
) {
  const total = trips.reduce(
    (sum, trip) =>
      sum +
      decimalToScaled(
        trip.adjustedVolumeM3?.toFixed(3) ?? trip.capacityM3.toFixed(3),
        3,
      ),
    BigInt(0),
  );
  return scaledToDecimal(total, 3);
}

function subtractDecimal(left: string, right: string) {
  return scaledToDecimal(
    decimalToScaled(left, 3) - decimalToScaled(right, 3),
    3,
  );
}

function multiplyDecimal(
  left: string,
  right: string,
  outputDigits: number,
  leftDigits = outputDigits,
  rightDigits = outputDigits,
) {
  const scale = BigInt(10 ** (leftDigits + rightDigits - outputDigits));
  const product =
    decimalToScaled(left, leftDigits) * decimalToScaled(right, rightDigits);
  return scaledToDecimal(divideRounded(product, scale), outputDigits);
}

function divideRounded(numerator: bigint, denominator: bigint) {
  if (denominator === BigInt(0)) return BigInt(0);
  const negative = numerator < BigInt(0) !== denominator < BigInt(0);
  const absoluteNumerator = numerator < BigInt(0) ? -numerator : numerator;
  const absoluteDenominator =
    denominator < BigInt(0) ? -denominator : denominator;
  const result =
    (absoluteNumerator + absoluteDenominator / BigInt(2)) / absoluteDenominator;
  return negative ? -result : result;
}

function decimalToScaled(value: string, digits: number) {
  const negative = value.startsWith("-");
  const normalized = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = normalized.split(".");
  const scaled =
    BigInt(whole || "0") * BigInt(10 ** digits) +
    BigInt(fraction.padEnd(digits, "0").slice(0, digits) || "0");
  return negative ? -scaled : scaled;
}

function scaledToDecimal(value: bigint, digits: number) {
  const negative = value < BigInt(0);
  const absolute = negative ? -value : value;
  const divisor = BigInt(10 ** digits);
  return `${negative ? "-" : ""}${absolute / divisor}.${String(
    absolute % divisor,
  ).padStart(digits, "0")}`;
}

function activityDuration(
  startTime: string | null,
  endTime: string | null,
  endDayOffset: number,
) {
  if (!startTime || !endTime) return null;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endDayOffset * 1440 + endHour * 60 + endMinute;
  return end > start ? end - start : null;
}

function isVolumetric(unitCode: string) {
  return /^M3(?:_|$)/u.test(unitCode.toUpperCase());
}

type ProductionJsonValue =
  | string
  | number
  | boolean
  | null
  | ProductionJsonValue[]
  | { [key: string]: ProductionJsonValue };

function snapshotOf(
  value: unknown,
  event: string,
): { event: string; value: ProductionJsonValue } {
  return {
    event,
    value: JSON.parse(JSON.stringify(value)) as ProductionJsonValue,
  };
}

function productionEvidence(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      Array.isArray(item) ||
      !["photo", "ticket", "attachment"].includes(String(item.kind)) ||
      typeof item.name !== "string" ||
      typeof item.url !== "string"
    )
      return [];
    return [
      {
        kind: item.kind as "photo" | "ticket" | "attachment",
        name: item.name,
        url: item.url,
        notes: typeof item.notes === "string" ? item.notes : null,
      },
    ];
  });
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const value = key(item);
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

function projectUnavailable() {
  return new AppError({
    code: "PRODUCTION_PROJECT_UNAVAILABLE",
    message: "Project is unavailable for production",
    statusCode: 409,
  });
}

function shiftNotEnabled() {
  return new AppError({
    code: "PROJECT_SHIFT_NOT_ENABLED",
    message: "O turno selecionado não está habilitado para esta obra",
    statusCode: 409,
  });
}

function resourceUnavailable(resource: string) {
  return new AppError({
    code: "PRODUCTION_RESOURCE_UNAVAILABLE",
    message: "Production resource is unavailable",
    statusCode: 409,
    data: { resource },
  });
}

function notFound() {
  return new AppError({
    code: "NOT_FOUND",
    message: "Production not found",
    statusCode: 404,
  });
}

function immutable() {
  return new AppError({
    code: "PRODUCTION_IMMUTABLE",
    message: "Production state does not allow this operation",
    statusCode: 409,
  });
}

function changedConcurrently() {
  return new AppError({
    code: "PRODUCTION_REVISION_CONFLICT",
    message: "Production changed concurrently",
    statusCode: 409,
  });
}

function revisionRequired() {
  return new AppError({
    code: "VALIDATION_ERROR",
    message: "Expected revision is required when updating a production",
    statusCode: 400,
  });
}
