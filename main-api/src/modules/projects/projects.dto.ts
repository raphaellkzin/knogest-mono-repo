import { z } from "zod";

// eslint-disable-next-line no-control-regex -- rejects control characters from user text.
const controlPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const text = (max: number, multiline = false) =>
  z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(
      z
        .string()
        .min(1)
        .max(max)
        .refine(
          (value) =>
            !controlPattern.test(value) &&
            (multiline || !/[\r\n]/u.test(value)),
          "Invalid text",
        ),
    );
const nullableText = (max: number) => z.union([text(max), z.null()]);
const optionalNullableText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) =>
      typeof value === "string" ? value.trim().normalize("NFC") : value,
    )
    .pipe(
      z.union([
        z
          .string()
          .max(max)
          .refine((value) => !controlPattern.test(value), "Invalid text"),
        z.null(),
        z.undefined(),
      ]),
    )
    .transform((value) => value || null);
const optionalContractText = (max: number) =>
  z
    .union([nullableText(max), z.undefined()])
    .transform((value) => value ?? null);

function decimal(scale: number, integral: number, positive = false) {
  const pattern = new RegExp(`^\\d{1,${integral}}\\.\\d{${scale}}$`, "u");
  return z
    .string()
    .regex(pattern)
    .refine((value) => !positive || !/^0+\.0+$/u.test(value));
}

const coordinate = (min: number, max: number) =>
  z
    .string()
    .regex(/^-?\d{1,3}\.\d{6}$/u)
    .refine((value) => Number(value) >= min && Number(value) <= max);
const uuid = z.string().uuid();
const productionMetricCodeSchema = z.enum([
  "cut",
  "fill",
  "finishing",
  "top_soil",
]);
export const earthworksServiceCodeSchema = z.enum([
  "cut",
  "fill",
  "finishing",
  "top_soil",
  "unsuitable_soil_removal",
  "replacement_fill",
]);
const unitCodeSchema = z.enum(["M3", "M2", "M3_KM"]);
const compensationModeSchema = z.enum([
  "daily",
  "hourly",
  "weekly",
  "fortnightly",
  "monthly",
]);

const supplierInlineSchema = z
  .object({
    entityType: z.enum(["individual", "legal_entity"]),
    document: z.string().trim().min(1).max(32),
    fullName: optionalNullableText(180),
    legalName: optionalNullableText(180),
    tradeName: optionalNullableText(180),
    phone: optionalNullableText(32),
    email: optionalNullableText(254),
    addressLine: optionalNullableText(220),
    city: optionalNullableText(120),
    state: optionalNullableText(80),
    postalCode: optionalNullableText(24),
    saveGlobally: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.entityType === "individual" && !value.fullName)
      ctx.addIssue({
        code: "custom",
        path: ["fullName"],
        message: "Supplier full name required",
      });
    if (value.entityType === "legal_entity" && !value.legalName)
      ctx.addIssue({
        code: "custom",
        path: ["legalName"],
        message: "Supplier legal name required",
      });
  });

const suppliedItemInlineSchema = z
  .object({
    name: text(160),
    baseUnitId: uuid,
    saveGlobally: z.boolean().default(false),
  })
  .strict();

export const projectAddressSchema = z
  .object({
    postalCode: z.string().regex(/^\d{8}$/u),
    street: text(160),
    number: optionalNullableText(30),
    complement: optionalNullableText(100),
    neighborhood: text(100),
    city: text(100),
    state: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.string().regex(/^[A-Z]{2}$/u)),
  })
  .strict()
  .superRefine((address, context) => {
    const formatted = formatProjectAddress(address);
    if (formatted.length > 500)
      context.addIssue({
        code: "custom",
        path: ["street"],
        message: "Address is too long",
      });
  });

export type ProjectAddress = z.infer<typeof projectAddressSchema>;

export function formatProjectAddress(address: ProjectAddress) {
  const cep = `${address.postalCode.slice(0, 5)}-${address.postalCode.slice(5)}`;
  return [
    address.number ? `${address.street}, ${address.number}` : address.street,
    address.complement,
    `${address.neighborhood} - ${address.city}/${address.state}`,
    `CEP ${cep}`,
  ]
    .filter(Boolean)
    .join(" - ");
}

export const projectScheduleDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    isWorking: z.boolean(),
    startTime: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u)
      .nullable(),
    endTime: z
      .string()
      .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u)
      .nullable(),
  })
  .strict()
  .superRefine((day, context) => {
    if (
      day.isWorking &&
      (!day.startTime || !day.endTime || day.startTime >= day.endTime)
    )
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Invalid same-day window",
      });
    if (!day.isWorking && (day.startTime !== null || day.endTime !== null))
      context.addIssue({
        code: "custom",
        message: "Non-working days cannot contain times",
      });
  });

export const projectCommandSchema = z
  .object({
    name: text(160),
    address: projectAddressSchema,
    latitude: z.union([coordinate(-90, 90), z.null()]),
    longitude: z.union([coordinate(-180, 180), z.null()]),
    contractNumber: optionalContractText(120),
    approvedBudget: decimal(2, 16),
    plannedStartDate: z.iso.date(),
    plannedEndDate: z
      .union([z.iso.date(), z.null(), z.undefined()])
      .transform((value) => value ?? null),
    clientId: uuid,
    managerEmploymentId: uuid,
    technicalResponsibilityEmploymentIds: z.array(uuid).min(1).max(20),
    weeklySchedule: z.array(projectScheduleDaySchema).length(7),
    breakTemplates: z
      .array(
        z
          .object({
            name: text(120),
            durationMinutes: z.number().int().min(1).max(1440),
          })
          .strict(),
      )
      .max(10),
    initialEmployeeAllocations: z
      .array(
        z
          .object({
            employmentId: uuid,
            confirmedJobRoleId: uuid.optional(),
            confirmedJobRolePeriodId: uuid.nullable().optional(),
            confirmedJobRoleName: optionalNullableText(120).optional(),
            expectedDailyWorkloadMinutes: z.number().int().min(1).max(1440),
            compensationMode: z.enum([
              "daily",
              "hourly",
              "weekly",
              "fortnightly",
              "monthly",
            ]),
            compensationValue: decimal(2, 16),
            overtimeRate: decimal(2, 16),
          })
          .strict()
          .superRefine((allocation, context) => {
            const hasExistingRole = Boolean(
              allocation.confirmedJobRoleId ||
              allocation.confirmedJobRolePeriodId,
            );
            const hasTemporaryRole = Boolean(allocation.confirmedJobRoleName);
            if (!hasExistingRole && !hasTemporaryRole)
              context.addIssue({
                code: "custom",
                path: ["confirmedJobRoleId"],
                message: "A job role must be confirmed",
              });
            if (hasExistingRole && hasTemporaryRole)
              context.addIssue({
                code: "custom",
                path: ["confirmedJobRoleName"],
                message: "A temporary job role cannot be mixed with an id",
              });
          }),
      )
      .max(200),
    initialMachineAllocations: z
      .array(
        z
          .object({
            machineId: uuid,
            startMeterReadingId: uuid,
            operatorEmploymentId: uuid,
          })
          .strict(),
      )
      .max(100),
    projectSupplierOffers: z
      .array(
        z
          .object({
            supplierId: uuid.optional(),
            supplier: supplierInlineSchema.optional(),
            itemId: uuid.optional(),
            item: suppliedItemInlineSchema.optional(),
            sourceOfferId: uuid.nullable().optional(),
            purchaseUnitId: uuid,
            conversionToBase: decimal(6, 12, true),
            price: decimal(4, 14, true),
          })
          .strict()
          .superRefine((offer, ctx) => {
            if (!offer.supplierId && !offer.supplier)
              ctx.addIssue({
                code: "custom",
                path: ["supplier"],
                message: "Supplier is required",
              });
            if (offer.supplierId && offer.supplier)
              ctx.addIssue({
                code: "custom",
                path: ["supplierId"],
                message: "Choose an existing supplier or create a new one",
              });
            if (!offer.itemId && !offer.item)
              ctx.addIssue({
                code: "custom",
                path: ["item"],
                message: "Supplied item is required",
              });
            if (offer.itemId && offer.item)
              ctx.addIssue({
                code: "custom",
                path: ["itemId"],
                message: "Choose an existing item or create a new one",
              });
          }),
      )
      .max(0, "Supplier offers can only be configured after project creation"),
  })
  .strict()
  .superRefine((command, context) => {
    if ((command.latitude === null) !== (command.longitude === null))
      context.addIssue({
        code: "custom",
        path: [command.latitude === null ? "latitude" : "longitude"],
        message: "Coordinates must be paired",
      });
    if (
      command.plannedEndDate !== null &&
      command.plannedEndDate < command.plannedStartDate
    )
      context.addIssue({
        code: "custom",
        path: ["plannedEndDate"],
        message: "End date precedes start date",
      });
    if (
      command.weeklySchedule.map((day) => day.dayOfWeek).join(",") !==
        "1,2,3,4,5,6,7" ||
      !command.weeklySchedule.some((day) => day.isWorking)
    )
      context.addIssue({
        code: "custom",
        path: ["weeklySchedule"],
        message: "Invalid week",
      });
    const collections: Array<[string, string[]]> = [
      [
        "technicalResponsibilityEmploymentIds",
        command.technicalResponsibilityEmploymentIds,
      ],
      [
        "initialEmployeeAllocations",
        command.initialEmployeeAllocations.map((item) => item.employmentId),
      ],
      [
        "initialMachineAllocations",
        command.initialMachineAllocations.map((item) => item.machineId),
      ],
      [
        "projectSupplierOffers",
        command.projectSupplierOffers
          .map((item) =>
            item.supplierId && item.itemId && item.purchaseUnitId
              ? `${item.supplierId}:${item.itemId}:${item.purchaseUnitId}`
              : "",
          )
          .filter(Boolean),
      ],
    ];
    for (const [path, ids] of collections)
      if (new Set(ids).size !== ids.length)
        context.addIssue({
          code: "custom",
          path: [path],
          message: "Duplicate ids",
        });
    const teamEmploymentIds = new Set(
      command.initialEmployeeAllocations.map((item) => item.employmentId),
    );
    const machineOperatorIds = command.initialMachineAllocations.map(
      (item) => item.operatorEmploymentId,
    );
    if (new Set(machineOperatorIds).size !== machineOperatorIds.length)
      context.addIssue({
        code: "custom",
        path: ["initialMachineAllocations"],
        message: "Machine operator cannot be assigned to multiple machines",
      });
    command.initialMachineAllocations.forEach((allocation, index) => {
      if (!teamEmploymentIds.has(allocation.operatorEmploymentId))
        context.addIssue({
          code: "custom",
          path: ["initialMachineAllocations", index, "operatorEmploymentId"],
          message: "Machine operator must be part of the initial team",
        });
    });
  });

export const projectIdempotencyKeySchema = z
  .string()
  .uuid()
  .refine((value) => value[14] === "4", "UUID v4 required");
export const projectParamsSchema = z
  .object({
    projectId: uuid,
  })
  .strict();

export const projectQuantityBaselineRevisionCommandSchema = z
  .object({
    reason: optionalNullableText(240),
    items: z
      .array(
        z
          .object({
            serviceCode: earthworksServiceCodeSchema,
            unitCode: unitCodeSchema,
            total: decimal(2, 16, true),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
  .superRefine((command, context) => {
    const codes = command.items.map((item) => item.serviceCode);
    if (new Set(codes).size !== codes.length)
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "Duplicate service code",
      });
  });

const workFrontServiceSchema = z
  .object({
    serviceCode: earthworksServiceCodeSchema,
    unitCode: unitCodeSchema,
    quantity: decimal(2, 16, true),
  })
  .strict();

export const projectWorkFrontCommandSchema = z
  .object({
    name: text(160),
    location: optionalNullableText(240),
    notes: optionalNullableText(1000),
    plannedStartDate: z.iso.date().nullable().optional(),
    plannedEndDate: z.iso.date().nullable().optional(),
    services: z.array(workFrontServiceSchema).min(1).max(20),
  })
  .strict()
  .superRefine((command, context) => {
    const codes = command.services.map((item) => item.serviceCode);
    if (new Set(codes).size !== codes.length)
      context.addIssue({
        code: "custom",
        path: ["services"],
        message: "Duplicate service code",
      });
    if (
      command.plannedStartDate &&
      command.plannedEndDate &&
      command.plannedEndDate < command.plannedStartDate
    )
      context.addIssue({
        code: "custom",
        path: ["plannedEndDate"],
        message: "Planned end date must be after planned start date",
      });
  });

export const projectWorkFrontParamsSchema = z
  .object({ projectId: uuid, frontId: uuid })
  .strict();

export const projectActivateCommandSchema = z
  .object({ frontIds: z.array(uuid).min(1).max(100) })
  .strict()
  .superRefine((command, context) => {
    if (new Set(command.frontIds).size !== command.frontIds.length)
      context.addIssue({
        code: "custom",
        path: ["frontIds"],
        message: "Duplicate front ids",
      });
  });
export const projectListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().max(2048).optional(),
    search: z.string().trim().max(120).optional(),
    sortBy: z.enum(["name", "createdAt"]).default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

const projectReadinessExistingOfferSchema = z
  .object({
    mode: z.literal("existing").optional(),
    sourceOfferId: uuid,
    conversionToBase: decimal(6, 12, true).optional(),
    price: decimal(4, 14, true),
  })
  .strict();

const projectReadinessNewOfferSchema = z
  .object({
    mode: z.enum(["projectOnly", "companyCatalog"]),
    supplierId: uuid,
    itemId: uuid,
    purchaseUnitId: uuid,
    conversionToBase: decimal(6, 12, true),
    price: decimal(4, 14, true),
  })
  .strict();

const projectReadinessOfferSchema = z.union([
  projectReadinessExistingOfferSchema,
  projectReadinessNewOfferSchema,
]);

const projectEmployeeReadinessSchema = z
  .object({
    employmentId: uuid,
    confirmedJobRoleId: uuid.optional(),
    confirmedJobRolePeriodId: uuid.nullable().optional(),
    confirmedJobRoleName: optionalNullableText(120).optional(),
    expectedDailyWorkloadMinutes: z.number().int().min(1).max(1440),
    compensationMode: compensationModeSchema,
    compensationValue: decimal(2, 16),
    overtimeRate: decimal(2, 16),
  })
  .strict()
  .superRefine((allocation, context) => {
    const hasExistingRole = Boolean(
      allocation.confirmedJobRoleId || allocation.confirmedJobRolePeriodId,
    );
    const hasTemporaryRole = Boolean(allocation.confirmedJobRoleName);
    if (!hasExistingRole && !hasTemporaryRole)
      context.addIssue({
        code: "custom",
        path: ["confirmedJobRoleId"],
        message: "A job role must be confirmed",
      });
    if (hasExistingRole && hasTemporaryRole)
      context.addIssue({
        code: "custom",
        path: ["confirmedJobRoleName"],
        message: "A temporary job role cannot be mixed with an id",
      });
  });

const projectMachineReadinessSchema = z
  .object({
    machineId: uuid,
    startMeterReadingId: uuid,
    operatorEmploymentId: uuid,
  })
  .strict();

export const projectReadinessCommandSchema = z
  .object({
    plannedEndDate: z.iso.date().optional(),
    productionMetricTargets: z
      .array(
        z
          .object({
            metricCode: productionMetricCodeSchema,
            targetTotal: decimal(2, 16, true),
          })
          .strict(),
      )
      .min(1)
      .max(4)
      .optional(),
    fuelOffers: z.array(projectReadinessOfferSchema).max(10).optional(),
    materialOffers: z.array(projectReadinessOfferSchema).max(50).optional(),
    accountability: z
      .object({
        clientId: uuid,
        managerEmploymentId: uuid,
        technicalResponsibilityEmploymentIds: z.array(uuid).min(1).max(20),
      })
      .strict()
      .optional(),
    employeeAllocations: z
      .array(projectEmployeeReadinessSchema)
      .max(200)
      .optional(),
    machineAllocations: z
      .array(projectMachineReadinessSchema)
      .max(100)
      .optional(),
    compensationPaymentTerms: z
      .array(
        z
          .object({
            compensationMode: compensationModeSchema,
            daysAfterPeriodEnd: z.number().int().min(0).max(60),
          })
          .strict(),
      )
      .max(5)
      .optional(),
  })
  .strict()
  .superRefine((command, context) => {
    if (
      command.plannedEndDate === undefined &&
      command.productionMetricTargets === undefined &&
      command.fuelOffers === undefined &&
      command.materialOffers === undefined &&
      command.accountability === undefined &&
      command.employeeAllocations === undefined &&
      command.machineAllocations === undefined &&
      command.compensationPaymentTerms === undefined
    )
      context.addIssue({
        code: "custom",
        message: "At least one readiness section is required",
      });
    const metrics = (command.productionMetricTargets ?? []).map(
      (item) => item.metricCode,
    );
    if (new Set(metrics).size !== metrics.length)
      context.addIssue({
        code: "custom",
        path: ["productionMetricTargets"],
        message: "Duplicate production metric",
      });
    for (const [path, ids] of [
      [
        "fuelOffers",
        (command.fuelOffers ?? []).map((item) =>
          "sourceOfferId" in item
            ? item.sourceOfferId
            : `${item.mode}:${item.supplierId}:${item.itemId}:${item.purchaseUnitId}`,
        ),
      ],
      [
        "materialOffers",
        (command.materialOffers ?? []).map((item) =>
          "sourceOfferId" in item
            ? item.sourceOfferId
            : `${item.mode}:${item.supplierId}:${item.itemId}:${item.purchaseUnitId}`,
        ),
      ],
      [
        "employeeAllocations",
        (command.employeeAllocations ?? []).map((item) => item.employmentId),
      ],
      [
        "machineAllocations",
        (command.machineAllocations ?? []).map((item) => item.machineId),
      ],
      [
        "technicalResponsibilityEmploymentIds",
        command.accountability?.technicalResponsibilityEmploymentIds ?? [],
      ],
    ] as const) {
      if (new Set(ids).size !== ids.length)
        context.addIssue({
          code: "custom",
          path: [path],
          message: "Duplicate ids",
        });
    }
    const teamEmploymentIds = new Set(
      (command.employeeAllocations ?? []).map((item) => item.employmentId),
    );
    const machineOperatorIds = (command.machineAllocations ?? []).map(
      (item) => item.operatorEmploymentId,
    );
    if (new Set(machineOperatorIds).size !== machineOperatorIds.length)
      context.addIssue({
        code: "custom",
        path: ["machineAllocations"],
        message: "Machine operator cannot be assigned to multiple machines",
      });
    if (command.employeeAllocations && command.machineAllocations)
      command.machineAllocations.forEach((allocation, index) => {
        if (!teamEmploymentIds.has(allocation.operatorEmploymentId))
          context.addIssue({
            code: "custom",
            path: ["machineAllocations", index, "operatorEmploymentId"],
            message: "Machine operator must be part of the Project team",
          });
      });
    const paymentModes = (command.compensationPaymentTerms ?? []).map(
      (item) => item.compensationMode,
    );
    if (new Set(paymentModes).size !== paymentModes.length)
      context.addIssue({
        code: "custom",
        path: ["compensationPaymentTerms"],
        message: "Duplicate compensation mode",
      });
  });

export type ProjectCommand = z.infer<typeof projectCommandSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
export type ProjectParams = z.infer<typeof projectParamsSchema>;
export type ProjectReadinessCommand = z.infer<
  typeof projectReadinessCommandSchema
>;
export type ProjectQuantityBaselineRevisionCommand = z.infer<
  typeof projectQuantityBaselineRevisionCommandSchema
>;
export type ProjectWorkFrontCommand = z.infer<
  typeof projectWorkFrontCommandSchema
>;
export type ProjectActivateCommand = z.infer<
  typeof projectActivateCommandSchema
>;

export const projectFieldDetailSchema = z
  .object({ path: z.string(), code: z.string() })
  .strict();
export const projectResourceDetailSchema = z
  .object({
    kind: z.enum([
      "client",
      "manager",
      "technicalResponsibility",
      "employee",
      "machine",
      "fuelSupplier",
      "fuelType",
      "supplier",
      "suppliedItem",
      "measurementUnit",
      "supplierOffer",
      "workspace",
      "jobRole",
    ]),
    id: z.string(),
    section: z.enum([
      "identity",
      "accountability",
      "schedule",
      "employees",
      "machines",
      "fuelOffers",
      "materialOffers",
      "supplierOffers",
    ]),
    reason: z.enum([
      "unavailable",
      "inactive",
      "foreign",
      "already-allocated",
      "latest-reading-changed",
      "workspace-changed",
      "catalog-inconsistent",
      "job-role-changed",
    ]),
  })
  .strict();
