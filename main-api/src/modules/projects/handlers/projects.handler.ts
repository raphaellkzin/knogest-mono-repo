import { Prisma } from "../../../db/generated/prisma/client";
import type { HandlerContext } from "../../../lib/utils/handler.dto";
import { AppError } from "../../../lib/utils/appError";
import {
  protectSensitiveDocument,
  toMaskedDocumentDto,
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
  type ProjectReadinessCommand,
} from "../projects.dto";

export type ProjectScope = {
  corporationId: string;
  companyId: string;
  sessionId: string;
  userId: string;
  role: "MASTER_ADMIN";
};

const operation = "project-finalization:v1";
const lifecycleStatuses = [
  "PLANNED",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "CANCELLED",
] as const;
const compensationModes = [
  "daily",
  "hourly",
  "weekly",
  "fortnightly",
  "monthly",
] as const;
type ProjectStatusDto = Lowercase<(typeof lifecycleStatuses)[number]>;
const resource = (
  kind: string,
  id: string,
  section: string,
  reason = "unavailable",
) => ({ kind, id, section, reason });

type ReadinessBlocker = {
  section:
    | "dates"
    | "metrics"
    | "fuel"
    | "items"
    | "equipment"
    | "team"
    | "payments";
  message: string;
};

function decimalString(value: Prisma.Decimal | number | string, scale: number) {
  if (typeof value === "string") return new Prisma.Decimal(value).toFixed(scale);
  if (typeof value === "number") return new Prisma.Decimal(value).toFixed(scale);
  return value.toFixed(scale);
}

function civilDateString(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function statusDto(status: (typeof lifecycleStatuses)[number]): ProjectStatusDto {
  return status.toLowerCase() as ProjectStatusDto;
}

function projectNotFound(): never {
  throw new AppError({
    code: "NOT_FOUND",
    statusCode: 404,
    message: "Project not found",
  });
}

function projectLifecycleConflict(message: string): never {
  throw new AppError({
    code: "PROJECT_RESOURCE_CONFLICT",
    statusCode: 409,
    message,
    data: { fields: [], resources: [] },
  });
}

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
  const jobRoleIds = command.initialEmployeeAllocations
    .map((item) => item.confirmedJobRoleId)
    .filter((id): id is string => Boolean(id));

  const [
    client,
    employments,
    suppliers,
    items,
    units,
    sourceOffers,
    machines,
    jobRoles,
  ] = await Promise.all([
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
            jobRole: { select: { id: true, name: true, isActive: true } },
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
    context.prisma.jobRole.findMany({
      where: {
        id: { in: [...new Set(jobRoleIds)] },
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
      },
      select: { id: true, name: true },
    }),
  ]);
  if (!client) throw conflict();
  const employmentMap = new Map(employments.map((item) => [item.id, item]));
  const jobRoleMap = new Map(jobRoles.map((item) => [item.id, item]));
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
      const selectedRole = allocation.confirmedJobRoleId
        ? jobRoleMap.get(allocation.confirmedJobRoleId)
        : undefined;
      const temporaryRoleIsConfirmed = Boolean(
        allocation.confirmedJobRoleName &&
          !allocation.confirmedJobRoleId &&
          !allocation.confirmedJobRolePeriodId,
      );
      const legacyRoleIsConfirmed =
        !selectedRole &&
        !temporaryRoleIsConfirmed &&
        Boolean(currentRole?.jobRole.isActive) &&
        currentRole?.id === allocation.confirmedJobRolePeriodId;
      const suppliedPeriodIsValid =
        !allocation.confirmedJobRolePeriodId ||
        (currentRole?.id === allocation.confirmedJobRolePeriodId &&
          currentRole.jobRole.id === selectedRole?.id);
      if (
        (!selectedRole && !legacyRoleIsConfirmed && !temporaryRoleIsConfirmed) ||
        !suppliedPeriodIsValid
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
  return { employmentMap, jobRoleMap };
}

async function createInlineSupplier(
  tx: HandlerContext,
  scope: ProjectScope,
  projectId: string,
  supplier: NonNullable<
    ProjectCommand["projectSupplierOffers"][number]["supplier"]
  >,
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
    supplier.entityType === "individual"
      ? supplier.fullName
      : supplier.legalName;
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

type ReadinessOffer = NonNullable<ProjectReadinessCommand["fuelOffers"]>[number];
type ReadinessEmployeeAllocation = NonNullable<
  ProjectReadinessCommand["employeeAllocations"]
>[number];
type ReadinessMachineAllocation = NonNullable<
  ProjectReadinessCommand["machineAllocations"]
>[number];
type ProjectOfferUsageKind = "fuel" | "material";

function validationError(path: string, code: string, message: string): never {
  throw new AppError({
    code: "VALIDATION_ERROR",
    statusCode: 400,
    message,
    data: { fields: [{ path, code }], resources: [] },
  });
}

function projectScopeWhere(scope: ProjectScope, projectId: string) {
  return {
    corporationId: scope.corporationId,
    companyId: scope.companyId,
    projectId,
  };
}

async function replaceAccountability(
  tx: HandlerContext,
  scope: ProjectScope,
  projectId: string,
  accountability: NonNullable<ProjectReadinessCommand["accountability"]>,
  now: Date,
) {
  const employmentIds = [
    accountability.managerEmploymentId,
    ...accountability.technicalResponsibilityEmploymentIds,
  ];
  const [client, employments] = await Promise.all([
    tx.prisma.client.findFirst({
      where: {
        id: accountability.clientId,
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
        removedAt: null,
      },
      select: { id: true },
    }),
    tx.prisma.employment.findMany({
      where: {
        id: { in: [...new Set(employmentIds)] },
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        state: "ACTIVE",
        isActive: true,
        periods: { some: { effectiveTo: null } },
      },
      select: { id: true },
    }),
  ]);
  if (!client) throw conflict([resource("client", accountability.clientId, "accountability")]);
  const employmentSet = new Set(employments.map((item) => item.id));
  for (const id of employmentIds)
    if (!employmentSet.has(id))
      throw conflict([
        resource(
          id === accountability.managerEmploymentId
            ? "manager"
            : "technicalResponsibility",
          id,
          "accountability",
        ),
      ]);

  const scopeWhere = projectScopeWhere(scope, projectId);
  await tx.prisma.projectClientPeriod.deleteMany({ where: scopeWhere });
  await tx.prisma.projectClientPeriod.create({
    data: { ...scopeWhere, clientId: accountability.clientId, effectiveFrom: now },
  });
  await tx.prisma.projectManagerTenure.deleteMany({ where: scopeWhere });
  await tx.prisma.projectManagerTenure.create({
    data: {
      ...scopeWhere,
      employmentId: accountability.managerEmploymentId,
      effectiveFrom: now,
    },
  });
  await tx.prisma.projectTechnicalResponsibility.deleteMany({ where: scopeWhere });
  await tx.prisma.projectTechnicalResponsibility.createMany({
    data: accountability.technicalResponsibilityEmploymentIds.map((employmentId) => ({
      ...scopeWhere,
      employmentId,
      effectiveFrom: now,
    })),
  });
}

async function replaceProjectOffers(
  tx: HandlerContext,
  scope: ProjectScope,
  projectId: string,
  usageKind: ProjectOfferUsageKind,
  offers: ReadinessOffer[],
  now: Date,
) {
  const sourceOfferIds = offers
    .map((item) => ("sourceOfferId" in item ? item.sourceOfferId : null))
    .filter((id): id is string => Boolean(id));
  const newOffers = offers.filter(
    (item): item is Extract<ReadinessOffer, { mode: "projectOnly" | "companyCatalog" }> =>
      !("sourceOfferId" in item),
  );
  const sourceOffers = await tx.prisma.supplierOffer.findMany({
    where: {
      id: { in: [...new Set(sourceOfferIds)] },
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      isActive: true,
    },
    select: {
      id: true,
      supplierId: true,
      itemId: true,
      purchaseUnitId: true,
      conversionToBase: true,
    },
  });
  if (sourceOffers.length !== new Set(sourceOfferIds).size)
    throw conflict([resource("supplierOffer", "unknown", "supplierOffers")]);

  const sourceById = new Map(sourceOffers.map((item) => [item.id, item]));
  const supplierIds = [
    ...sourceOffers.map((item) => item.supplierId),
    ...newOffers.map((item) => item.supplierId),
  ];
  const itemIds = [
    ...sourceOffers.map((item) => item.itemId),
    ...newOffers.map((item) => item.itemId),
  ];
  const unitIds = [
    ...sourceOffers.map((item) => item.purchaseUnitId),
    ...newOffers.map((item) => item.purchaseUnitId),
  ];
  const [suppliers, items, units] = await Promise.all([
    tx.prisma.fuelSupplier.findMany({
      where: {
        id: { in: [...new Set(supplierIds)] },
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
        removedAt: null,
        isGlobal: true,
      },
      select: { id: true },
    }),
    tx.prisma.suppliedItem.findMany({
      where: {
        id: { in: [...new Set(itemIds)] },
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
        isGlobal: true,
      },
      select: { id: true },
    }),
    tx.prisma.measurementUnit.findMany({
      where: {
        id: { in: [...new Set(unitIds)] },
        isActive: true,
        OR: [
          { corporationId: null, companyId: null },
          { corporationId: scope.corporationId, companyId: scope.companyId },
        ],
      },
      select: { id: true },
    }),
  ]);
  if (suppliers.length !== new Set(supplierIds).size)
    throw conflict([resource("supplier", "unknown", "supplierOffers")]);
  if (items.length !== new Set(itemIds).size)
    throw conflict([resource("suppliedItem", "unknown", "supplierOffers")]);
  if (units.length !== new Set(unitIds).size)
    throw conflict([resource("measurementUnit", "unknown", "supplierOffers")]);

  const supplierSet = new Set(suppliers.map((item) => item.id));
  const itemSet = new Set(items.map((item) => item.id));
  const unitSet = new Set(units.map((item) => item.id));
  for (const offer of newOffers) {
    if (!supplierSet.has(offer.supplierId))
      throw conflict([resource("supplier", offer.supplierId, "supplierOffers")]);
    if (!itemSet.has(offer.itemId))
      throw conflict([resource("suppliedItem", offer.itemId, "supplierOffers")]);
    if (!unitSet.has(offer.purchaseUnitId))
      throw conflict([
        resource("measurementUnit", offer.purchaseUnitId, "supplierOffers"),
      ]);
  }

  const normalizedOffers: Array<{
    sourceOfferId: string | null;
    supplierId: string;
    itemId: string;
    purchaseUnitId: string;
    conversionToBase: Prisma.Decimal | string;
    price: string;
  }> = [];

  for (const offer of offers) {
    if ("sourceOfferId" in offer) {
      const source = sourceById.get(offer.sourceOfferId);
      if (!source)
        throw conflict([
          resource("supplierOffer", offer.sourceOfferId, "supplierOffers"),
        ]);
      normalizedOffers.push({
        sourceOfferId: source.id,
        supplierId: source.supplierId,
        itemId: source.itemId,
        purchaseUnitId: source.purchaseUnitId,
        conversionToBase: source.conversionToBase,
        price: offer.price,
      });
      continue;
    }

    if (offer.mode === "projectOnly") {
      normalizedOffers.push({
        sourceOfferId: null,
        supplierId: offer.supplierId,
        itemId: offer.itemId,
        purchaseUnitId: offer.purchaseUnitId,
        conversionToBase: offer.conversionToBase,
        price: offer.price,
      });
      continue;
    }

    const duplicate = await tx.prisma.supplierOffer.findFirst({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        supplierId: offer.supplierId,
        itemId: offer.itemId,
        isActive: true,
      },
      select: { id: true },
    });
    if (duplicate)
      throw conflict([resource("supplierOffer", duplicate.id, "supplierOffers")]);

    const source = await tx.prisma.supplierOffer.create({
      data: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        supplierId: offer.supplierId,
        itemId: offer.itemId,
        purchaseUnitId: offer.purchaseUnitId,
        conversionToBase: offer.conversionToBase,
      },
      select: {
        id: true,
        supplierId: true,
        itemId: true,
        purchaseUnitId: true,
        conversionToBase: true,
      },
    });
    await tx.prisma.supplierOfferPrice.create({
      data: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        offerId: source.id,
        price: offer.price,
        effectiveFrom: now,
      },
    });
    normalizedOffers.push({
      sourceOfferId: source.id,
      supplierId: source.supplierId,
      itemId: source.itemId,
      purchaseUnitId: source.purchaseUnitId,
      conversionToBase: source.conversionToBase,
      price: offer.price,
    });
  }

  const scopeWhere = projectScopeWhere(scope, projectId);
  const currentOffers = await tx.prisma.projectSupplierOffer.findMany({
    where: { ...scopeWhere, usageKind },
    select: { id: true },
  });
  if (currentOffers.length)
    await tx.prisma.projectSupplierOfferPrice.deleteMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        projectOfferId: { in: currentOffers.map((offer) => offer.id) },
      },
    });
  await tx.prisma.projectSupplierOffer.deleteMany({
    where: { ...scopeWhere, usageKind },
  });

  for (const offer of normalizedOffers) {
    const row = await tx.prisma.projectSupplierOffer.create({
      data: {
        ...scopeWhere,
        usageKind,
        supplierId: offer.supplierId,
        itemId: offer.itemId,
        sourceOfferId: offer.sourceOfferId,
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
}

async function replaceEmployeeAllocations(
  tx: HandlerContext,
  scope: ProjectScope,
  projectId: string,
  allocations: ReadinessEmployeeAllocation[],
  now: Date,
) {
  const employmentIds = allocations.map((item) => item.employmentId);
  const jobRoleIds = allocations
    .map((item) => item.confirmedJobRoleId)
    .filter((id): id is string => Boolean(id));
  const [employments, conflictingAllocations, jobRoles] = await Promise.all([
    tx.prisma.employment.findMany({
      where: {
        id: { in: [...new Set(employmentIds)] },
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
            jobRole: { select: { id: true, name: true, isActive: true } },
          },
          take: 1,
        },
      },
    }),
    tx.prisma.projectEmployeeAllocation.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        employmentId: { in: [...new Set(employmentIds)] },
        effectiveTo: null,
        NOT: { projectId },
      },
      select: { employmentId: true },
    }),
    tx.prisma.jobRole.findMany({
      where: {
        id: { in: [...new Set(jobRoleIds)] },
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
      },
      select: { id: true, name: true },
    }),
  ]);
  if (conflictingAllocations.length)
    throw conflict([
      resource("employee", conflictingAllocations[0].employmentId, "employees", "already-allocated"),
    ]);
  const employmentMap = new Map(employments.map((item) => [item.id, item]));
  const jobRoleMap = new Map(jobRoles.map((item) => [item.id, item]));
  for (const allocation of allocations) {
    const employment = employmentMap.get(allocation.employmentId);
    if (!employment)
      throw conflict([resource("employee", allocation.employmentId, "employees")]);
    const currentRole = employment.jobRolePeriods[0];
    const selectedRole = allocation.confirmedJobRoleId
      ? jobRoleMap.get(allocation.confirmedJobRoleId)
      : undefined;
    const hasTemporaryRole = Boolean(
      allocation.confirmedJobRoleName && !allocation.confirmedJobRoleId,
    );
    const usesCurrentRole =
      !selectedRole &&
      !hasTemporaryRole &&
      Boolean(currentRole?.jobRole.isActive) &&
      currentRole?.id === allocation.confirmedJobRolePeriodId;
    if (!selectedRole && !hasTemporaryRole && !usesCurrentRole)
      throw conflict([
        resource("jobRole", allocation.employmentId, "employees", "job-role-changed"),
      ]);
  }

  const scopeWhere = projectScopeWhere(scope, projectId);
  await tx.prisma.projectEmployeeAllocation.deleteMany({ where: scopeWhere });
  if (!allocations.length) return;
  for (const allocation of allocations) {
    const employment = employmentMap.get(allocation.employmentId)!;
    const currentRole = employment.jobRolePeriods[0];
    const selectedRole = allocation.confirmedJobRoleId
      ? jobRoleMap.get(allocation.confirmedJobRoleId)!
      : allocation.confirmedJobRoleName
        ? null
        : currentRole!.jobRole;
    const referencesEmploymentRole =
      selectedRole !== null && currentRole?.jobRole.id === selectedRole.id;
    const jobRoleName = allocation.confirmedJobRoleName ?? selectedRole?.name;
    if (!jobRoleName)
      validationError("employeeAllocations", "job-role-required", "A job role must be confirmed");
    await tx.prisma.projectEmployeeAllocation.create({
      data: {
        ...scopeWhere,
        personId: employment.personId,
        effectiveFrom: now,
        employmentId: allocation.employmentId,
        employmentJobRolePeriodId: referencesEmploymentRole ? currentRole?.id : null,
        jobRole: jobRoleName,
        expectedDailyWorkloadMinutes: allocation.expectedDailyWorkloadMinutes,
        compensationMode: allocation.compensationMode,
        compensationValue: allocation.compensationValue,
        overtimeRate: allocation.overtimeRate,
        createdByUserId: scope.userId,
      },
    });
  }
}

async function replaceMachineAllocations(
  tx: HandlerContext,
  scope: ProjectScope,
  projectId: string,
  allocations: ReadinessMachineAllocation[],
  now: Date,
) {
  const scopeWhere = projectScopeWhere(scope, projectId);
  const teamRows = await tx.prisma.projectEmployeeAllocation.findMany({
    where: { ...scopeWhere, effectiveTo: null },
    select: { employmentId: true },
  });
  const teamEmploymentIds = new Set(teamRows.map((item) => item.employmentId));
  for (const allocation of allocations)
    if (!teamEmploymentIds.has(allocation.operatorEmploymentId))
      throw conflict([resource("employee", allocation.operatorEmploymentId, "machines")]);

  const machineIds = allocations.map((item) => item.machineId);
  const [machines, conflicts] = await Promise.all([
    tx.prisma.machine.findMany({
      where: {
        id: { in: [...new Set(machineIds)] },
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
    tx.prisma.projectMachineAllocation.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        machineId: { in: [...new Set(machineIds)] },
        effectiveTo: null,
        NOT: { projectId },
      },
      select: { machineId: true },
    }),
  ]);
  if (conflicts.length)
    throw conflict([
      resource("machine", conflicts[0].machineId, "machines", "already-allocated"),
    ]);
  const machineMap = new Map(machines.map((item) => [item.id, item]));
  for (const allocation of allocations) {
    const machine = machineMap.get(allocation.machineId);
    if (!machine)
      throw conflict([resource("machine", allocation.machineId, "machines")]);
    if (machine.meterReadings[0]?.id !== allocation.startMeterReadingId)
      throw conflict([
        resource(
          "machine",
          allocation.machineId,
          "machines",
          "latest-reading-changed",
        ),
      ]);
  }

  const current = await tx.prisma.projectMachineAllocation.findMany({
    where: scopeWhere,
    select: { id: true },
  });
  if (current.length)
    await tx.prisma.machineMeterReadingReference.deleteMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        sourceType: "PROJECT_ALLOCATION",
        sourceId: { in: current.map((item) => item.id) },
      },
    });
  await tx.prisma.projectMachineAllocation.deleteMany({ where: scopeWhere });
  for (const allocation of allocations) {
    const row = await tx.prisma.projectMachineAllocation.create({
      data: { ...scopeWhere, effectiveFrom: now, ...allocation },
      select: { id: true },
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
}

async function replacePaymentTerms(
  tx: HandlerContext,
  scope: ProjectScope,
  projectId: string,
  terms: NonNullable<ProjectReadinessCommand["compensationPaymentTerms"]>,
) {
  const scopeWhere = projectScopeWhere(scope, projectId);
  const teamModes = await tx.prisma.projectEmployeeAllocation.findMany({
    where: { ...scopeWhere, effectiveTo: null },
    select: { compensationMode: true },
  });
  const requiredPaymentModes = [
    ...new Set(teamModes.map((item) => item.compensationMode).sort()),
  ];
  const suppliedPaymentModes = terms.map((item) => item.compensationMode).sort();
  if (
    requiredPaymentModes.length !== suppliedPaymentModes.length ||
    requiredPaymentModes.some((mode, index) => mode !== suppliedPaymentModes[index])
  )
    validationError(
      "compensationPaymentTerms",
      "payment-modes-mismatch",
      "Payment terms must match Project compensation modes",
    );

  await tx.prisma.projectCompensationPaymentTerm.deleteMany({
    where: scopeWhere,
  });
  if (terms.length)
    await tx.prisma.projectCompensationPaymentTerm.createMany({
      data: terms.map((term) => ({
        ...scopeWhere,
        compensationMode: term.compensationMode,
        daysAfterPeriodEnd: term.daysAfterPeriodEnd,
      })),
    });
}

async function buildProjectReadinessOptions(
  context: HandlerContext,
  scope: ProjectScope,
  projectId: string,
) {
  const project = await context.prisma.project.findFirst({
    where: {
      id: projectId,
      corporationId: scope.corporationId,
      companyId: scope.companyId,
    },
    select: { id: true },
  });
  if (!project) projectNotFound();

  const scopeWhere = projectScopeWhere(scope, projectId);
  const [clients, employments, currentEmployeeAllocations, currentMachineAllocations, machines, jobRoles, supplierOffers, suppliers, suppliedItems, measurementUnits] =
    await Promise.all([
      context.prisma.client.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
          removedAt: null,
        },
        orderBy: { displayName: "asc" },
        take: 200,
        select: {
          id: true,
          displayName: true,
          documentType: true,
          ciphertext: true,
          iv: true,
          authTag: true,
          encryptionKeyVersion: true,
        },
      }),
      context.prisma.employment.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          state: "ACTIVE",
          isActive: true,
          periods: { some: { effectiveTo: null } },
        },
        orderBy: { person: { displayName: "asc" } },
        take: 300,
        select: {
          id: true,
          personId: true,
          person: { select: { displayName: true } },
          jobRolePeriods: {
            where: { effectiveTo: null },
            select: {
              id: true,
              jobRole: { select: { id: true, name: true, isActive: true } },
            },
            take: 1,
          },
        },
      }),
      context.prisma.projectEmployeeAllocation.findMany({
        where: { ...scopeWhere, effectiveTo: null },
        select: { employmentId: true, personId: true },
      }),
      context.prisma.projectMachineAllocation.findMany({
        where: { ...scopeWhere, effectiveTo: null },
        select: { machineId: true },
      }),
      context.prisma.machine.findMany({
        where: {
          corporationId: scope.corporationId,
          isActive: true,
          ownershipPeriods: {
            some: { companyId: scope.companyId, effectiveTo: null },
          },
        },
        orderBy: { name: "asc" },
        take: 300,
        select: {
          id: true,
          name: true,
          meterReadings: {
            where: { status: "CONFIRMED" },
            orderBy: { readingSequence: "desc" },
            take: 1,
            select: { id: true, value: true },
          },
        },
      }),
      context.prisma.jobRole.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
        },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      context.prisma.supplierOffer.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 500,
        select: {
          id: true,
          supplierId: true,
          itemId: true,
          purchaseUnitId: true,
          conversionToBase: true,
        },
      }),
      context.prisma.fuelSupplier.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
          removedAt: null,
          isGlobal: true,
        },
        orderBy: { displayName: "asc" },
        take: 300,
        select: {
          id: true,
          displayName: true,
          tradeName: true,
          documentType: true,
          ciphertext: true,
          iv: true,
          authTag: true,
          encryptionKeyVersion: true,
        },
      }),
      context.prisma.suppliedItem.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
          isGlobal: true,
        },
        orderBy: { name: "asc" },
        take: 500,
        select: { id: true, name: true, baseUnitId: true },
      }),
      context.prisma.measurementUnit.findMany({
        where: {
          isActive: true,
          OR: [
            { corporationId: null, companyId: null },
            { corporationId: scope.corporationId, companyId: scope.companyId },
          ],
        },
        orderBy: [{ code: "asc" }, { id: "asc" }],
        select: { id: true, code: true, name: true },
      }),
    ]);

  const [offerSuppliers, offerItems, offerUnits, offerPrices] =
    await Promise.all([
      context.prisma.fuelSupplier.findMany({
        where: {
          id: { in: [...new Set(supplierOffers.map((item) => item.supplierId))] },
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
          removedAt: null,
          isGlobal: true,
        },
        select: {
          id: true,
          displayName: true,
          tradeName: true,
          documentType: true,
          ciphertext: true,
          iv: true,
          authTag: true,
          encryptionKeyVersion: true,
        },
      }),
      context.prisma.suppliedItem.findMany({
        where: {
          id: { in: [...new Set(supplierOffers.map((item) => item.itemId))] },
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
          isGlobal: true,
        },
        select: { id: true, name: true, baseUnitId: true },
      }),
      context.prisma.measurementUnit.findMany({
        where: {
          id: {
            in: [...new Set(supplierOffers.map((item) => item.purchaseUnitId))],
          },
          isActive: true,
          OR: [
            { corporationId: null, companyId: null },
            { corporationId: scope.corporationId, companyId: scope.companyId },
          ],
        },
        select: { id: true, code: true, name: true },
      }),
      context.prisma.supplierOfferPrice.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          offerId: { in: supplierOffers.map((item) => item.id) },
          effectiveTo: null,
        },
        orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
        select: { offerId: true, price: true, effectiveFrom: true },
      }),
    ]);
  const offerSupplierMap = new Map(offerSuppliers.map((item) => [item.id, item]));
  const offerItemMap = new Map(offerItems.map((item) => [item.id, item]));
  const offerUnitMap = new Map(offerUnits.map((item) => [item.id, item]));
  const offerPriceMap = new Map(offerPrices.map((item) => [item.offerId, item]));

  const currentEmploymentIds = new Set(
    currentEmployeeAllocations.map((item) => item.employmentId),
  );
  const currentPersonIds = new Set(
    currentEmployeeAllocations.map((item) => item.personId),
  );
  const currentMachineIds = new Set(
    currentMachineAllocations.map((item) => item.machineId),
  );

  const [otherEmployeeAllocations, otherMachineAllocations] = await Promise.all([
    context.prisma.projectEmployeeAllocation.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        personId: { in: employments.map((item) => item.personId) },
        effectiveTo: null,
        NOT: { projectId },
      },
      select: { personId: true },
    }),
    context.prisma.projectMachineAllocation.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        machineId: { in: machines.map((item) => item.id) },
        effectiveTo: null,
        NOT: { projectId },
      },
      select: { machineId: true },
    }),
  ]);
  const unavailablePersonIds = new Set(
    otherEmployeeAllocations.map((item) => item.personId),
  );
  const unavailableMachineIds = new Set(
    otherMachineAllocations.map((item) => item.machineId),
  );

  return {
    clients: clients.map((client) => ({
      id: client.id,
      label: client.displayName,
      detail: toMaskedDocumentDto(client).maskedDocument,
    })),
    employees: employments
      .filter(
        (employment) =>
          !unavailablePersonIds.has(employment.personId) ||
          currentPersonIds.has(employment.personId),
      )
      .map((employment) => {
        const role = employment.jobRolePeriods[0];
        return {
          id: employment.id,
          label: employment.person.displayName,
          detail: role?.jobRole.name ?? null,
          jobRolePeriodId: role?.id ?? null,
          jobRoleId: role?.jobRole.id ?? null,
          available:
            !unavailablePersonIds.has(employment.personId) ||
            currentEmploymentIds.has(employment.id),
        };
      }),
    machines: machines
      .filter(
        (machine) =>
          (!unavailableMachineIds.has(machine.id) ||
            currentMachineIds.has(machine.id)) &&
          machine.meterReadings.length > 0,
      )
      .map((machine) => ({
        id: machine.id,
        label: machine.name,
        detail: machine.meterReadings[0]
          ? decimalString(machine.meterReadings[0].value, 2)
          : null,
        readingId: machine.meterReadings[0]?.id ?? null,
        available:
          !unavailableMachineIds.has(machine.id) ||
          currentMachineIds.has(machine.id),
    })),
    jobRoles: jobRoles.map((role) => ({ id: role.id, label: role.name })),
    suppliers: suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.displayName,
      tradeName: supplier.tradeName,
      document: toMaskedDocumentDto(supplier),
    })),
    suppliedItems: suppliedItems.map((item) => ({
      id: item.id,
      name: item.name,
      baseUnitId: item.baseUnitId,
    })),
    measurementUnits,
    supplierOffers: supplierOffers
      .filter((offer) => {
        const supplier = offerSupplierMap.get(offer.supplierId);
        const item = offerItemMap.get(offer.itemId);
        const unit = offerUnitMap.get(offer.purchaseUnitId);
        const price = offerPriceMap.get(offer.id);
        return Boolean(supplier && item && unit && price);
      })
      .map((offer) => {
        const supplier = offerSupplierMap.get(offer.supplierId)!;
        const item = offerItemMap.get(offer.itemId)!;
        const unit = offerUnitMap.get(offer.purchaseUnitId)!;
        const price = offerPriceMap.get(offer.id)!;
        const itemName = item.name.toLocaleLowerCase("pt-BR");
        return {
          id: offer.id,
          supplier: {
            id: supplier.id,
            name: supplier.displayName,
            tradeName: supplier.tradeName,
            document: toMaskedDocumentDto(supplier),
          },
          item: {
            id: item.id,
            name: item.name,
            baseUnitId: item.baseUnitId,
          },
          purchaseUnit: unit,
          conversionToBase: decimalString(offer.conversionToBase, 6),
          currentPrice: {
            price: decimalString(price.price, 4),
            effectiveFrom: price.effectiveFrom.toISOString(),
          },
          isFuelCandidate:
            itemName.includes("diesel") ||
            itemName.includes("gasolina") ||
            itemName.includes("combust"),
        };
      }),
  };
}

async function buildProjectSnapshot(
  context: HandlerContext,
  scope: ProjectScope,
  projectId: string,
) {
  const scopeWhere = {
    corporationId: scope.corporationId,
    companyId: scope.companyId,
    projectId,
  };
  const project = await context.prisma.project.findFirst({
    where: {
      id: projectId,
      corporationId: scope.corporationId,
      companyId: scope.companyId,
    },
  });
  if (!project) projectNotFound();

  const [
    baseline,
    clientPeriod,
    managerTenure,
    technicalResponsibilities,
    scheduleRevision,
    employeeAllocations,
    machineAllocations,
    supplierOffers,
    productionMetricTargets,
    compensationPaymentTerms,
  ] = await Promise.all([
    context.prisma.projectBaseline.findFirst({
      where: { ...scopeWhere, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    }),
    context.prisma.projectClientPeriod.findFirst({
      where: { ...scopeWhere, effectiveTo: null },
    }),
    context.prisma.projectManagerTenure.findFirst({
      where: { ...scopeWhere, effectiveTo: null },
    }),
    context.prisma.projectTechnicalResponsibility.findMany({
      where: { ...scopeWhere, effectiveTo: null },
      orderBy: { effectiveFrom: "asc" },
    }),
    context.prisma.projectScheduleRevision.findFirst({
      where: { ...scopeWhere, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    }),
    context.prisma.projectEmployeeAllocation.findMany({
      where: { ...scopeWhere, effectiveTo: null },
      orderBy: { effectiveFrom: "asc" },
    }),
    context.prisma.projectMachineAllocation.findMany({
      where: { ...scopeWhere, effectiveTo: null },
      orderBy: { effectiveFrom: "asc" },
    }),
    context.prisma.projectSupplierOffer.findMany({
      where: { ...scopeWhere, effectiveTo: null },
      orderBy: { effectiveFrom: "asc" },
    }),
    context.prisma.projectProductionMetricTarget.findMany({
      where: scopeWhere,
      orderBy: { metricCode: "asc" },
    }),
    context.prisma.projectCompensationPaymentTerm.findMany({
      where: scopeWhere,
      orderBy: { compensationMode: "asc" },
    }),
  ]);

  const [scheduleDays, breakTemplates] = scheduleRevision
    ? await Promise.all([
        context.prisma.projectScheduleDay.findMany({
          where: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            scheduleRevisionId: scheduleRevision.id,
          },
          orderBy: { dayOfWeek: "asc" },
        }),
        context.prisma.projectBreakTemplate.findMany({
          where: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            scheduleRevisionId: scheduleRevision.id,
          },
          orderBy: { position: "asc" },
        }),
      ])
    : [[], []];

  const employmentIds = [
    managerTenure?.employmentId,
    ...technicalResponsibilities.map((item) => item.employmentId),
    ...employeeAllocations.map((item) => item.employmentId),
    ...machineAllocations.map((item) => item.operatorEmploymentId),
  ].filter((id): id is string => Boolean(id));
  const machineIds = machineAllocations.map((item) => item.machineId);
  const readingIds = machineAllocations.map((item) => item.startMeterReadingId);
  const fuelSupplierIds = supplierOffers.map((item) => item.supplierId);
  const supplierItemIds = supplierOffers.map((item) => item.itemId);
  const purchaseUnitIds = supplierOffers.map((item) => item.purchaseUnitId);
  const sourceOfferIds = supplierOffers
    .map((item) => item.sourceOfferId)
    .filter((id): id is string => Boolean(id));

  const projectSupplierOfferPrices = supplierOffers.length
    ? await context.prisma.projectSupplierOfferPrice.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          projectOfferId: { in: supplierOffers.map((item) => item.id) },
          effectiveTo: null,
        },
      })
    : [];

  const [
    client,
    employments,
    machines,
    readings,
    fuelSuppliers,
    suppliedItems,
    measurementUnits,
    sourceOffers,
  ] = await Promise.all([
    clientPeriod
      ? context.prisma.client.findFirst({
          where: {
            id: clientPeriod.clientId,
            corporationId: scope.corporationId,
            companyId: scope.companyId,
          },
          select: {
            id: true,
            displayName: true,
            documentType: true,
            ciphertext: true,
            iv: true,
            authTag: true,
            encryptionKeyVersion: true,
            isActive: true,
            removedAt: true,
          },
        })
      : null,
    employmentIds.length
      ? context.prisma.employment.findMany({
          where: {
            id: { in: [...new Set(employmentIds)] },
            corporationId: scope.corporationId,
            companyId: scope.companyId,
          },
          select: {
            id: true,
            state: true,
            isActive: true,
            person: { select: { displayName: true } },
            periods: {
              where: { effectiveTo: null },
              select: { id: true },
              take: 1,
            },
            jobRolePeriods: {
              where: { effectiveTo: null },
              select: {
                jobRole: { select: { name: true } },
              },
              take: 1,
            },
          },
        })
      : [],
    machineIds.length
      ? context.prisma.machine.findMany({
          where: {
            id: { in: [...new Set(machineIds)] },
            corporationId: scope.corporationId,
          },
          select: {
            id: true,
            name: true,
            meterType: true,
            isActive: true,
            identifiers: {
              where: { companyId: scope.companyId, releasedAt: null },
              select: { kind: true, value: true },
              take: 1,
            },
          },
        })
      : [],
    readingIds.length
      ? context.prisma.machineMeterReading.findMany({
          where: {
            id: { in: [...new Set(readingIds)] },
            corporationId: scope.corporationId,
            companyId: scope.companyId,
          },
          select: { id: true, value: true },
        })
      : [],
    fuelSupplierIds.length
      ? context.prisma.fuelSupplier.findMany({
          where: {
            id: { in: [...new Set(fuelSupplierIds)] },
            corporationId: scope.corporationId,
            companyId: scope.companyId,
          },
          select: {
            id: true,
            displayName: true,
            tradeName: true,
            documentType: true,
            ciphertext: true,
            iv: true,
            authTag: true,
            encryptionKeyVersion: true,
            isActive: true,
            removedAt: true,
          },
        })
      : [],
    supplierItemIds.length
      ? context.prisma.suppliedItem.findMany({
          where: {
            id: { in: [...new Set(supplierItemIds)] },
            corporationId: scope.corporationId,
            companyId: scope.companyId,
          },
          select: { id: true, name: true, isActive: true },
        })
      : [],
    purchaseUnitIds.length
      ? context.prisma.measurementUnit.findMany({
          where: {
            id: { in: [...new Set(purchaseUnitIds)] },
            OR: [
              { corporationId: null, companyId: null },
              { corporationId: scope.corporationId, companyId: scope.companyId },
            ],
          },
          select: { id: true, code: true, name: true, isActive: true },
        })
      : [],
    sourceOfferIds.length
      ? context.prisma.supplierOffer.findMany({
          where: {
            id: { in: [...new Set(sourceOfferIds)] },
            corporationId: scope.corporationId,
            companyId: scope.companyId,
          },
          select: { id: true, isActive: true },
        })
      : [],
  ]);

  const employmentMap = new Map(employments.map((item) => [item.id, item]));
  const machineMap = new Map(machines.map((item) => [item.id, item]));
  const readingMap = new Map(readings.map((item) => [item.id, item]));
  const fuelSupplierMap = new Map(fuelSuppliers.map((item) => [item.id, item]));
  const suppliedItemMap = new Map(suppliedItems.map((item) => [item.id, item]));
  const unitMap = new Map(measurementUnits.map((item) => [item.id, item]));
  const sourceOfferMap = new Map(sourceOffers.map((item) => [item.id, item]));
  const projectOfferPriceMap = new Map(
    projectSupplierOfferPrices.map((item) => [item.projectOfferId, item]),
  );
  const currentTeamEmploymentIds = new Set(
    employeeAllocations.map((item) => item.employmentId),
  );

  const employeeDto = (employmentId: string) => {
    const employment = employmentMap.get(employmentId);
    if (!employment) return null;
    return {
      id: employment.id,
      name: employment.person.displayName,
      jobRole: employment.jobRolePeriods[0]?.jobRole.name ?? null,
      isActive:
        employment.isActive &&
        employment.state === "ACTIVE" &&
        employment.periods.length > 0,
    };
  };

  const fuelSupplierDto = (fuelSupplierId: string) => {
    const supplier = fuelSupplierMap.get(fuelSupplierId);
    if (!supplier) return null;
    return {
      id: supplier.id,
      name: supplier.displayName,
      tradeName: supplier.tradeName,
      document: toMaskedDocumentDto(supplier),
      isActive: supplier.isActive && supplier.removedAt === null,
    };
  };

  const employeeAllocationDtos = employeeAllocations.map((allocation) => ({
    id: allocation.id,
    employment: employeeDto(allocation.employmentId),
    jobRole: allocation.jobRole,
    expectedDailyWorkloadMinutes: allocation.expectedDailyWorkloadMinutes,
    compensationMode: allocation.compensationMode,
    compensationValue: decimalString(allocation.compensationValue, 2),
    overtimeRate: decimalString(allocation.overtimeRate, 2),
    effectiveFrom: allocation.effectiveFrom.toISOString(),
  }));

  const machineAllocationDtos = machineAllocations.map((allocation) => {
    const machine = machineMap.get(allocation.machineId);
    const reading = readingMap.get(allocation.startMeterReadingId);
    return {
      id: allocation.id,
      machine: machine
        ? {
            id: machine.id,
            name: machine.name,
            meterType: machine.meterType.toLowerCase(),
            identifier: machine.identifiers[0] ?? null,
            isActive: machine.isActive,
          }
        : null,
      operator: employeeDto(allocation.operatorEmploymentId),
      startMeterReading: reading
        ? {
            id: reading.id,
            value: decimalString(reading.value, 2),
          }
        : null,
      effectiveFrom: allocation.effectiveFrom.toISOString(),
    };
  });

  const supplierOfferDtos = supplierOffers.map((offer) => {
    const item = suppliedItemMap.get(offer.itemId);
    const unit = unitMap.get(offer.purchaseUnitId);
    const sourceOffer = offer.sourceOfferId
      ? sourceOfferMap.get(offer.sourceOfferId)
      : null;
    return {
      id: offer.id,
      usageKind: offer.usageKind,
      sourceOfferId: offer.sourceOfferId,
      sourceOfferIsActive: sourceOffer?.isActive ?? false,
      supplier: fuelSupplierDto(offer.supplierId),
      item: item ? { id: item.id, name: item.name, isActive: item.isActive } : null,
      purchaseUnit: unit
        ? { id: unit.id, code: unit.code, name: unit.name, isActive: unit.isActive }
        : null,
      conversionToBase: decimalString(offer.conversionToBase, 6),
      price: decimalString(
        projectOfferPriceMap.get(offer.id)?.price ?? offer.price,
        4,
      ),
      effectiveFrom: offer.effectiveFrom.toISOString(),
    };
  });
  const fuelOfferDtos = supplierOfferDtos.filter(
    (offer) => offer.usageKind === "fuel",
  );
  const materialOfferDtos = supplierOfferDtos.filter(
    (offer) => offer.usageKind !== "fuel",
  );
  const hasInvalidProjectOffer = (offer: (typeof supplierOfferDtos)[number]) =>
    (offer.sourceOfferId !== null && !offer.sourceOfferIsActive) ||
    !offer.supplier?.isActive ||
    !offer.item?.isActive ||
    !offer.purchaseUnit?.isActive;

  const blockers: ReadinessBlocker[] = [];
  if (!baseline?.plannedEndDate)
    blockers.push({
      section: "dates",
      message: "Informe a data prevista de fim da obra.",
    });
  if (productionMetricTargets.length === 0)
    blockers.push({
      section: "metrics",
      message: "Selecione ao menos uma métrica de produção com meta total.",
    });
  if (
    fuelOfferDtos.length === 0 ||
    fuelOfferDtos.some((offer) => hasInvalidProjectOffer(offer))
  )
    blockers.push({
      section: "fuel",
      message: "Confirme uma oferta ativa de combustível e o preço da obra.",
    });
  if (!client || !client.isActive || client.removedAt)
    blockers.push({
      section: "team",
      message: "Confirme um cliente ativo para a obra.",
    });
  if (!managerTenure || !employeeDto(managerTenure.employmentId)?.isActive)
    blockers.push({
      section: "team",
      message: "Confirme um gestor ativo para a obra.",
    });
  if (
    technicalResponsibilities.length === 0 ||
    technicalResponsibilities.some(
      (item) => !employeeDto(item.employmentId)?.isActive,
    )
  )
    blockers.push({
      section: "team",
      message: "Confirme ao menos um responsável técnico ativo.",
    });
  if (
    scheduleDays.length !== 7 ||
    !scheduleDays.some((day) => day.isWorking) ||
    scheduleDays.some(
      (day) =>
        (day.isWorking && (!day.startTime || !day.endTime)) ||
        (!day.isWorking && (day.startTime || day.endTime)),
    )
  )
    blockers.push({
      section: "team",
      message: "Confirme uma agenda semanal válida.",
    });
  if (
    machineAllocations.some(
      (allocation) =>
        !currentTeamEmploymentIds.has(allocation.operatorEmploymentId),
    )
  )
    blockers.push({
      section: "equipment",
      message: "Cada máquina precisa de operador presente na equipe da obra.",
    });
  if (materialOfferDtos.some((offer) => hasInvalidProjectOffer(offer)))
    blockers.push({
      section: "items",
      message: "Revise fornecedores, itens e unidades configurados.",
    });
  const requiredPaymentModes = [
    ...new Set(
      employeeAllocationDtos.map((item) => item.compensationMode).sort(),
    ),
  ];
  const suppliedPaymentModes = compensationPaymentTerms
    .map((item) => item.compensationMode)
    .sort();
  if (
    requiredPaymentModes.length !== suppliedPaymentModes.length ||
    requiredPaymentModes.some((mode, index) => mode !== suppliedPaymentModes[index])
  )
    blockers.push({
      section: "payments",
      message:
        "Defina o prazo de pagamento para cada modalidade presente na equipe.",
    });

  return {
    id: project.id,
    name: project.name,
    address: {
      formatted: project.address,
      postalCode: project.addressPostalCode,
      street: project.addressStreet,
      number: project.addressNumber,
      complement: project.addressComplement,
      neighborhood: project.addressNeighborhood,
      city: project.addressCity,
      state: project.addressState,
    },
    latitude: project.latitude ? decimalString(project.latitude, 6) : null,
    longitude: project.longitude ? decimalString(project.longitude, 6) : null,
    contractNumber: project.contractNumber,
    status: statusDto(project.status),
    actualStartedAt: project.actualStartedAt?.toISOString() ?? null,
    createdAt: project.createdAt.toISOString(),
    baseline: baseline
      ? {
          approvedBudget: decimalString(baseline.approvedBudget, 2),
          plannedStartDate: civilDateString(baseline.plannedStartDate),
          plannedEndDate: civilDateString(baseline.plannedEndDate),
          effectiveFrom: baseline.effectiveFrom.toISOString(),
        }
      : null,
    client: client
      ? {
          id: client.id,
          name: client.displayName,
          document: toMaskedDocumentDto(client),
          isActive: client.isActive && client.removedAt === null,
        }
      : null,
    manager: managerTenure ? employeeDto(managerTenure.employmentId) : null,
    technicalResponsibilities: technicalResponsibilities
      .map((item) => employeeDto(item.employmentId))
      .filter(Boolean),
    schedule: {
      days: scheduleDays.map((day) => ({
        dayOfWeek: day.dayOfWeek,
        isWorking: day.isWorking,
        startTime: day.startTime,
        endTime: day.endTime,
      })),
      breakTemplates: breakTemplates.map((item) => ({
        id: item.id,
        name: item.name,
        durationMinutes: item.durationMinutes,
      })),
    },
    employeeAllocations: employeeAllocationDtos,
    machineAllocations: machineAllocationDtos,
    fuelOffers: fuelOfferDtos,
    supplierOffers: materialOfferDtos,
    productionMetricTargets: productionMetricTargets.map((item) => ({
      metricCode: item.metricCode,
      targetTotal: decimalString(item.targetTotal, 2),
    })),
    compensationPaymentTerms: compensationPaymentTerms.map((item) => ({
      compensationMode: item.compensationMode,
      daysAfterPeriodEnd: item.daysAfterPeriodEnd,
    })),
    readiness: {
      canActivate: blockers.length === 0,
      blockers,
    },
  };
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
        const { employmentMap: employments, jobRoleMap } =
          await validateResources(tx, scope, command);
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
          const currentRole = employment.jobRolePeriods[0];
          const confirmedRole = allocation.confirmedJobRoleId
            ? jobRoleMap.get(allocation.confirmedJobRoleId)!
            : allocation.confirmedJobRoleName
              ? null
              : currentRole!.jobRole;
          const referencesEmploymentRole =
            confirmedRole !== null &&
            currentRole?.jobRole.id === confirmedRole.id;
          const jobRoleName =
            allocation.confirmedJobRoleName ?? confirmedRole?.name;
          if (!jobRoleName)
            throw new AppError({
              code: "VALIDATION_ERROR",
              message: "A job role must be confirmed",
              statusCode: 400,
            });
          await tx.prisma.projectEmployeeAllocation.create({
            data: {
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              projectId: project.id,
              personId: employment.personId,
              effectiveFrom: now,
              employmentId: allocation.employmentId,
              employmentJobRolePeriodId: referencesEmploymentRole
                ? currentRole?.id
                : null,
              jobRole: jobRoleName,
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
            (await createInlineSupplier(
              tx,
              scope,
              project.id,
              offer.supplier!,
            ));
          const itemId =
            offer.itemId ??
            (await createInlineItem(tx, scope, project.id, offer.item!));
          const row = await tx.prisma.projectSupplierOffer.create({
            data: {
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              projectId: project.id,
              usageKind: "material",
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

  async saveReadiness(
    scope: ProjectScope,
    projectId: string,
    command: ProjectReadinessCommand,
  ) {
    return runSerializable(this.context, async (tx) => {
      const project = await tx.prisma.project.findFirst({
        where: {
          id: projectId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
        },
        select: { id: true, status: true },
      });
      if (!project) projectNotFound();
      if (project.status !== "PLANNED")
        projectLifecycleConflict("Only planned Projects can update readiness");

      const now = new Date();
      const scopeWhere = projectScopeWhere(scope, projectId);

      if (command.plannedEndDate !== undefined) {
        const updatedBaseline = await tx.prisma.projectBaseline.updateMany({
          where: { ...scopeWhere, effectiveTo: null },
          data: {
            plannedEndDate: new Date(
              `${command.plannedEndDate}T00:00:00.000Z`,
            ),
          },
        });
        if (updatedBaseline.count !== 1)
          throw conflict([resource("project", projectId, "identity")]);
      }

      if (command.productionMetricTargets !== undefined) {
        await tx.prisma.projectProductionMetricTarget.deleteMany({
          where: scopeWhere,
        });
        await tx.prisma.projectProductionMetricTarget.createMany({
          data: command.productionMetricTargets.map((target) => ({
            ...scopeWhere,
            metricCode: target.metricCode,
            targetTotal: target.targetTotal,
          })),
        });
      }

      if (command.fuelOffers !== undefined)
        await replaceProjectOffers(
          tx,
          scope,
          projectId,
          "fuel",
          command.fuelOffers,
          now,
        );

      if (command.materialOffers !== undefined)
        await replaceProjectOffers(
          tx,
          scope,
          projectId,
          "material",
          command.materialOffers,
          now,
        );

      if (command.accountability !== undefined)
        await replaceAccountability(
          tx,
          scope,
          projectId,
          command.accountability,
          now,
        );

      if (command.employeeAllocations !== undefined) {
        await replaceEmployeeAllocations(
          tx,
          scope,
          projectId,
          command.employeeAllocations,
          now,
        );
        await tx.prisma.projectCompensationPaymentTerm.deleteMany({
          where: scopeWhere,
        });
      }

      if (command.machineAllocations !== undefined)
        await replaceMachineAllocations(
          tx,
          scope,
          projectId,
          command.machineAllocations,
          now,
        );

      if (command.compensationPaymentTerms !== undefined)
        await replacePaymentTerms(
          tx,
          scope,
          projectId,
          command.compensationPaymentTerms,
        );

      return buildProjectSnapshot(tx, scope, projectId);
    });
  }

  async activate(scope: ProjectScope, projectId: string) {
    return runSerializable(this.context, async (tx) => {
      const snapshot = await buildProjectSnapshot(tx, scope, projectId);
      if (snapshot.status !== "planned")
        projectLifecycleConflict("Project is not planned");
      if (!snapshot.readiness.canActivate)
        throw new AppError({
          code: "PROJECT_RESOURCE_CONFLICT",
          statusCode: 409,
          message: "Project readiness is incomplete",
          data: {
            fields: [],
            resources: [],
            blockers: snapshot.readiness.blockers,
          },
        });

      const now = new Date();
      const updated = await tx.prisma.project.updateMany({
        where: {
          id: projectId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          status: "PLANNED",
          actualStartedAt: null,
        },
        data: {
          status: "ACTIVE",
          actualStartedAt: now,
        },
      });
      if (updated.count !== 1) projectLifecycleConflict("Project changed");
      await tx.prisma.projectLifecycleEvent.create({
        data: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          projectId,
          fromStatus: "PLANNED",
          toStatus: "ACTIVE",
          occurredAt: now,
          actorUserId: scope.userId,
          reason: null,
        },
      });
      return buildProjectSnapshot(tx, scope, projectId);
    });
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
        status: statusDto(row.status),
        actualStartedAt: row.actualStartedAt?.toISOString() ?? null,
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
    return buildProjectSnapshot(this.context, scope, projectId);
  }

  async readinessOptions(scope: ProjectScope, projectId: string) {
    return buildProjectReadinessOptions(this.context, scope, projectId);
  }
}
