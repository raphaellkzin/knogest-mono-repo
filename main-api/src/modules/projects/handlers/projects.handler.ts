import { Prisma } from "../../../db/generated/prisma/client";
import type { HandlerContext } from "../../../lib/utils/handler.dto";
import { AppError } from "../../../lib/utils/appError";
import {
  protectSensitiveDocument,
} from "../../../lib/security/sensitive-document";
import {
  buildCursorPage,
  parseBoundCursor,
} from "../../../lib/utils/cursor-pagination";
import { hashProjectCommand } from "../project-canonicalization";
import {
  formatProjectAddress,
  type ProjectCommand,
  type ProjectListQuery,
} from "../projects.dto";

export type ProjectScope = {
  corporationId: string;
  companyId: string;
  sessionId: string;
  userId: string;
  role: "MASTER_ADMIN";
};

const operation = "project-finalization:v1";
const resource = (
  kind: string,
  id: string,
  section: string,
  reason = "unavailable",
) => ({ kind, id, section, reason });

function conflict(resources: Array<ReturnType<typeof resource>> = []) {
  return new AppError({
    code: "PROJECT_RESOURCE_CONFLICT",
    statusCode: 409,
    message: "Project resources changed",
    data: { fields: [], resources },
  });
}

function mapEntityType(entityType: "individual" | "legal_entity") {
  return entityType === "individual" ? "INDIVIDUAL" : "LEGAL_ENTITY";
}

async function assertWorkspace(
  context: HandlerContext,
  scope: ProjectScope,
  expectedCompanyId: string,
) {
  const session = await context.prisma.session.findFirst({
    where: {
      id: scope.sessionId,
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      revokedAt: null,
      user: { id: scope.userId, isActive: true, role: "MASTER_ADMIN" },
      company: { id: expectedCompanyId, isActive: true },
    },
  });
  if (!session || expectedCompanyId !== scope.companyId)
    throw new AppError({
      code: "PROJECT_WORKSPACE_CHANGED",
      statusCode: 409,
      message: "Project workspace changed",
      data: { fields: [], resources: [] },
    });
}

async function validateResources(
  context: HandlerContext,
  scope: ProjectScope,
  command: ProjectCommand,
) {
  const existingSupplierIds = command.projectSupplierOffers
    .map((item) => item.supplierId)
    .filter((id): id is string => Boolean(id));
  const uniqueExistingSupplierIds = [...new Set(existingSupplierIds)];
  const existingItemIds = command.projectSupplierOffers
    .map((item) => item.itemId)
    .filter((id): id is string => Boolean(id));
  const uniqueExistingItemIds = [...new Set(existingItemIds)];
  const unitIds = [
    ...command.projectSupplierOffers.map((item) => item.purchaseUnitId),
    ...command.projectSupplierOffers
      .map((item) => item.item?.baseUnitId)
      .filter((id): id is string => Boolean(id)),
  ];
  const sourceOfferIds = command.projectSupplierOffers
    .map((item) => item.sourceOfferId)
    .filter((id): id is string => Boolean(id));

  const [client, employments, suppliers, items, units, sourceOffers, machines] =
    await Promise.all([
      context.prisma.client.findFirst({
        where: {
          id: command.clientId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
          removedAt: null,
        },
      }),
      context.prisma.employment.findMany({
        where: {
          id: {
            in: [
              ...new Set([
                command.managerEmploymentId,
                ...command.technicalResponsibilityEmploymentIds,
                ...command.initialEmployeeAllocations.map(
                  (item) => item.employmentId,
                ),
              ]),
            ],
          },
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          state: "ACTIVE",
          isActive: true,
          periods: { some: { effectiveTo: null } },
        },
        select: {
          id: true,
          personId: true,
          jobRolePeriods: {
            where: { effectiveTo: null },
            select: {
              id: true,
              jobRole: { select: { name: true, isActive: true } },
            },
          },
        },
      }),
      context.prisma.fuelSupplier.findMany({
        where: {
          id: { in: uniqueExistingSupplierIds },
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
          removedAt: null,
          isGlobal: true,
        },
        select: { id: true },
      }),
      context.prisma.suppliedItem.findMany({
        where: {
          id: { in: uniqueExistingItemIds },
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isGlobal: true,
          isActive: true,
        },
        select: { id: true },
      }),
      context.prisma.measurementUnit.findMany({
        where: {
          id: { in: unitIds },
          isActive: true,
          OR: [
            { corporationId: null, companyId: null },
            { corporationId: scope.corporationId, companyId: scope.companyId },
          ],
        },
        select: { id: true },
      }),
      context.prisma.supplierOffer.findMany({
        where: {
          id: { in: sourceOfferIds },
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
        },
        select: { id: true },
      }),
      context.prisma.machine.findMany({
        where: {
          id: {
            in: command.initialMachineAllocations.map((item) => item.machineId),
          },
          corporationId: scope.corporationId,
          isActive: true,
          ownershipPeriods: {
            some: { companyId: scope.companyId, effectiveTo: null },
          },
        },
        select: {
          id: true,
          meterReadings: {
            where: { status: "CONFIRMED" },
            orderBy: { readingSequence: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      }),
    ]);
  if (!client) throw conflict();
  const employmentMap = new Map(employments.map((item) => [item.id, item]));
  for (const id of [
    command.managerEmploymentId,
    ...command.technicalResponsibilityEmploymentIds,
  ])
    if (!employmentMap.has(id))
      throw conflict([
        resource(
          id === command.managerEmploymentId
            ? "manager"
            : "technicalResponsibility",
          id,
          "accountability",
        ),
      ]);
  for (const allocation of command.initialEmployeeAllocations)
    if (!employmentMap.has(allocation.employmentId))
      throw conflict([
        resource("employee", allocation.employmentId, "employees"),
      ]);
    else {
      const employment = employmentMap.get(allocation.employmentId)!;
      const currentRole = employment.jobRolePeriods[0];
      if (
        !currentRole ||
        !currentRole.jobRole.isActive ||
        currentRole.id !== allocation.confirmedJobRolePeriodId
      )
        throw conflict([
          resource(
            "jobRole",
            allocation.employmentId,
            "employees",
            "job-role-changed",
          ),
        ]);
    }
  const teamEmploymentIds = new Set(
    command.initialEmployeeAllocations.map((item) => item.employmentId),
  );
  for (const allocation of command.initialMachineAllocations)
    if (!teamEmploymentIds.has(allocation.operatorEmploymentId))
      throw conflict([
        resource("employee", allocation.operatorEmploymentId, "machines"),
      ]);
  if (suppliers.length !== uniqueExistingSupplierIds.length)
    throw conflict([resource("supplier", "unknown", "supplierOffers")]);
  if (items.length !== uniqueExistingItemIds.length)
    throw conflict([resource("suppliedItem", "unknown", "supplierOffers")]);
  if (units.length !== new Set(unitIds).size)
    throw conflict([resource("measurementUnit", "unknown", "supplierOffers")]);
  if (sourceOffers.length !== sourceOfferIds.length)
    throw conflict([resource("supplierOffer", "unknown", "supplierOffers")]);
  const machineMap = new Map(machines.map((item) => [item.id, item]));
  for (const allocation of command.initialMachineAllocations) {
    const machine = machineMap.get(allocation.machineId);
    if (
      !machine ||
      machine.meterReadings[0]?.id !== allocation.startMeterReadingId
    )
      throw conflict(
        machine
          ? [
              resource(
                "machine",
                allocation.machineId,
                "machines",
                "latest-reading-changed",
              ),
            ]
          : [],
      );
  }
  return employmentMap;
}

async function createInlineSupplier(
  tx: HandlerContext,
  scope: ProjectScope,
  projectId: string,
  supplier: NonNullable<ProjectCommand["projectSupplierOffers"][number]["supplier"]>,
) {
  const protectedDocumentResult = protectSensitiveDocument({
    document: supplier.document,
    registryType: "FUEL_SUPPLIER",
  });
  if (
    (supplier.entityType === "individual" &&
      protectedDocumentResult.documentType !== "CPF") ||
    (supplier.entityType === "legal_entity" &&
      protectedDocumentResult.documentType !== "CNPJ")
  )
    throw new AppError({
      code: "VALIDATION_ERROR",
      statusCode: 400,
      message: "Supplier document type does not match entity type",
    });
  const displayName =
    supplier.entityType === "individual" ? supplier.fullName : supplier.legalName;
  if (!displayName)
    throw new AppError({
      code: "VALIDATION_ERROR",
      statusCode: 400,
      message: "Supplier name is required",
    });
  const row = await tx.prisma.fuelSupplier.create({
    data: {
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      ...protectedDocumentResult,
      displayName,
      entityType: mapEntityType(supplier.entityType),
      fullName: supplier.fullName,
      legalName: supplier.legalName,
      tradeName: supplier.tradeName,
      phone: supplier.phone,
      email: supplier.email,
      addressLine: supplier.addressLine,
      city: supplier.city,
      state: supplier.state,
      postalCode: supplier.postalCode,
      isGlobal: supplier.saveGlobally,
      projectId: supplier.saveGlobally ? null : projectId,
    },
    select: { id: true },
  });
  return row.id;
}

async function createInlineItem(
  tx: HandlerContext,
  scope: ProjectScope,
  projectId: string,
  item: NonNullable<ProjectCommand["projectSupplierOffers"][number]["item"]>,
) {
  const row = await tx.prisma.suppliedItem.create({
    data: {
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      projectId: item.saveGlobally ? null : projectId,
      name: item.name,
      baseUnitId: item.baseUnitId,
      isGlobal: item.saveGlobally,
    },
    select: { id: true },
  });
  return row.id;
}

async function runSerializable<T>(
  context: HandlerContext,
  work: (tx: HandlerContext) => Promise<T>,
) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await context.transaction(work, {
        isolationLevel: "Serializable",
        maxWait: 5_000,
        timeout: 15_000,
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2034" ||
        attempt === 3
      )
        throw error;
    }
  }
  throw new Error("Unreachable serializable retry state");
}

export class ProjectsHandler {
  constructor(private readonly context: HandlerContext) {}

  async finalize(
    scope: ProjectScope,
    expectedCompanyId: string,
    key: string,
    command: ProjectCommand,
  ) {
    const requestHash = hashProjectCommand(command);
    try {
      return await runSerializable(this.context, async (tx) => {
        await assertWorkspace(tx, scope, expectedCompanyId);
        const existing = await tx.prisma.idempotencyRecord.findUnique({
          where: {
            sessionId_corporationId_companyId_operation_key: {
              sessionId: scope.sessionId,
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              operation,
              key,
            },
          },
        });
        if (existing) {
          if (existing.requestHash !== requestHash)
            throw new AppError({
              code: "IDEMPOTENCY_PAYLOAD_CONFLICT",
              statusCode: 409,
              message: "Idempotency key has a different payload",
            });
          return { projectId: existing.projectId, status: "planned" as const };
        }
        const employments = await validateResources(tx, scope, command);
        const now = new Date();
        const formattedAddress = formatProjectAddress(command.address);
        const project = await tx.prisma.project.create({
          data: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            name: command.name,
            address: formattedAddress,
            addressPostalCode: command.address.postalCode,
            addressStreet: command.address.street,
            addressNumber: command.address.number,
            addressComplement: command.address.complement,
            addressNeighborhood: command.address.neighborhood,
            addressCity: command.address.city,
            addressState: command.address.state,
            latitude: command.latitude,
            longitude: command.longitude,
            contractNumber: command.contractNumber,
            normalizedContractNumber:
              command.contractNumber?.toLocaleLowerCase("pt-BR") ?? null,
            status: "PLANNED",
          },
        });
        await tx.prisma.projectBaseline.create({
          data: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            projectId: project.id,
            approvedBudget: command.approvedBudget,
            plannedStartDate: new Date(
              `${command.plannedStartDate}T00:00:00.000Z`,
            ),
            plannedEndDate:
              command.plannedEndDate === null
                ? null
                : new Date(`${command.plannedEndDate}T00:00:00.000Z`),
            effectiveFrom: now,
          },
        });
        await tx.prisma.projectClientPeriod.create({
          data: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            projectId: project.id,
            clientId: command.clientId,
            effectiveFrom: now,
          },
        });
        await tx.prisma.projectManagerTenure.create({
          data: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            projectId: project.id,
            employmentId: command.managerEmploymentId,
            effectiveFrom: now,
          },
        });
        await tx.prisma.projectTechnicalResponsibility.createMany({
          data: command.technicalResponsibilityEmploymentIds.map(
            (employmentId) => ({
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              projectId: project.id,
              employmentId,
              effectiveFrom: now,
            }),
          ),
        });
        const schedule = await tx.prisma.projectScheduleRevision.create({
          data: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            projectId: project.id,
            effectiveFrom: now,
          },
        });
        await tx.prisma.projectScheduleDay.createMany({
          data: command.weeklySchedule.map((day) => ({
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            scheduleRevisionId: schedule.id,
            ...day,
          })),
        });
        if (command.breakTemplates.length)
          await tx.prisma.projectBreakTemplate.createMany({
            data: command.breakTemplates.map((item, position) => ({
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              scheduleRevisionId: schedule.id,
              position,
              ...item,
            })),
          });
        for (const allocation of command.initialEmployeeAllocations) {
          const employment = employments.get(allocation.employmentId)!;
          const confirmedRole = employment.jobRolePeriods[0]!;
          await tx.prisma.projectEmployeeAllocation.create({
            data: {
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              projectId: project.id,
              personId: employment.personId,
              effectiveFrom: now,
              employmentId: allocation.employmentId,
              employmentJobRolePeriodId: confirmedRole.id,
              jobRole: confirmedRole.jobRole.name,
              expectedDailyWorkloadMinutes:
                allocation.expectedDailyWorkloadMinutes,
              compensationMode: allocation.compensationMode,
              compensationValue: allocation.compensationValue,
              overtimeRate: allocation.overtimeRate,
              createdByUserId: scope.userId,
            },
          });
        }
        for (const allocation of command.initialMachineAllocations) {
          const row = await tx.prisma.projectMachineAllocation.create({
            data: {
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              projectId: project.id,
              effectiveFrom: now,
              ...allocation,
            },
          });
          await tx.prisma.machineMeterReadingReference.create({
            data: {
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              machineId: allocation.machineId,
              readingId: allocation.startMeterReadingId,
              sourceType: "PROJECT_ALLOCATION",
              sourceId: row.id,
            },
          });
        }
        for (const offer of command.projectSupplierOffers) {
          const supplierId =
            offer.supplierId ??
            (await createInlineSupplier(tx, scope, project.id, offer.supplier!));
          const itemId =
            offer.itemId ??
            (await createInlineItem(tx, scope, project.id, offer.item!));
          const row = await tx.prisma.projectSupplierOffer.create({
            data: {
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              projectId: project.id,
              supplierId,
              itemId,
              sourceOfferId: offer.sourceOfferId ?? null,
              purchaseUnitId: offer.purchaseUnitId,
              conversionToBase: offer.conversionToBase,
              price: offer.price,
              effectiveFrom: now,
            },
            select: { id: true },
          });
          await tx.prisma.projectSupplierOfferPrice.create({
            data: {
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              projectOfferId: row.id,
              price: offer.price,
              effectiveFrom: now,
            },
          });
        }
        await tx.prisma.idempotencyRecord.create({
          data: {
            sessionId: scope.sessionId,
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            operation,
            key,
            requestHash,
            projectId: project.id,
            completedAt: now,
            expiresAt: new Date(now.getTime() + 30 * 86_400_000),
          },
        });
        return { projectId: project.id, status: "planned" as const };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const completed =
          await this.context.prisma.idempotencyRecord.findUnique({
            where: {
              sessionId_corporationId_companyId_operation_key: {
                sessionId: scope.sessionId,
                corporationId: scope.corporationId,
                companyId: scope.companyId,
                operation,
                key,
              },
            },
          });
        if (completed) {
          if (completed.requestHash !== requestHash)
            throw new AppError({
              code: "IDEMPOTENCY_PAYLOAD_CONFLICT",
              statusCode: 409,
              message: "Idempotency key has a different payload",
            });
          return { projectId: completed.projectId, status: "planned" as const };
        }
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2002", "P2003", "P2004"].includes(error.code)
      )
        throw conflict();
      throw error;
    }
  }

  async list(scope: ProjectScope, query: ProjectListQuery) {
    const normalizedSearch = query.search?.toLocaleLowerCase("pt-BR");
    const boundary = parseBoundCursor({
      cursor: query.cursor,
      resource: "projects",
      scope: { corporationId: scope.corporationId, companyId: scope.companyId },
      query: { search: normalizedSearch },
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    const comparison = query.sortDirection === "asc" ? "gt" : "lt";
    const cursorWhere: Prisma.ProjectWhereInput | undefined = boundary
      ? query.sortBy === "name"
        ? {
            OR: [
              { name: { [comparison]: String(boundary.value) } },
              {
                name: String(boundary.value),
                id: { [comparison]: boundary.id },
              },
            ],
          }
        : {
            OR: [
              { createdAt: { [comparison]: new Date(String(boundary.value)) } },
              {
                createdAt: new Date(String(boundary.value)),
                id: { [comparison]: boundary.id },
              },
            ],
          }
      : undefined;
    const searchWhere: Prisma.ProjectWhereInput | undefined = normalizedSearch
      ? {
          OR: [
            { name: { contains: query.search!, mode: "insensitive" } },
            { normalizedContractNumber: { contains: normalizedSearch } },
          ],
        }
      : undefined;
    const rows = await this.context.prisma.project.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        AND: [searchWhere, cursorWhere].filter(
          (item): item is Prisma.ProjectWhereInput => Boolean(item),
        ),
      },
      orderBy: [
        { [query.sortBy]: query.sortDirection },
        { id: query.sortDirection },
      ],
      take: query.limit + 1,
    });
    return buildCursorPage({
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        contractNumber: row.contractNumber,
        status: row.status.toLowerCase(),
        createdAt: row.createdAt.toISOString(),
      })),
      limit: query.limit,
      resource: "projects",
      scope: { corporationId: scope.corporationId, companyId: scope.companyId },
      query: { search: normalizedSearch },
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
      getLast: (row) => ({
        value: query.sortBy === "name" ? row.name : row.createdAt,
        id: row.id,
      }),
    });
  }

  async detail(scope: ProjectScope, projectId: string) {
    const project = await this.context.prisma.project.findFirst({
      where: {
        id: projectId,
        corporationId: scope.corporationId,
        companyId: scope.companyId,
      },
    });
    if (!project)
      throw new AppError({
        code: "NOT_FOUND",
        statusCode: 404,
        message: "Project not found",
      });
    return {
      id: project.id,
      name: project.name,
      address: project.address,
      contractNumber: project.contractNumber,
      status: project.status.toLowerCase(),
      createdAt: project.createdAt.toISOString(),
    };
  }
}
