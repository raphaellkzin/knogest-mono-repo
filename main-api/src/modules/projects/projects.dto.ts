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
            confirmedJobRolePeriodId: uuid,
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
          .strict(),
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
      .min(1)
      .max(50),
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
export const projectListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().max(2048).optional(),
    search: z.string().trim().max(120).optional(),
    sortBy: z.enum(["name", "createdAt"]).default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type ProjectCommand = z.infer<typeof projectCommandSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

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
      "fuelAgreements",
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
