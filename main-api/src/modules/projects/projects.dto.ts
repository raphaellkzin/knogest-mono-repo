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
const unique = <T>(items: T[], key: (item: T) => string) =>
  new Set(items.map(key)).size === items.length;

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
    address: text(500, true),
    latitude: z.union([coordinate(-90, 90), z.null()]),
    longitude: z.union([coordinate(-180, 180), z.null()]),
    contractNumber: nullableText(120),
    approvedBudget: decimal(2, 16),
    plannedStartDate: z.iso.date(),
    plannedEndDate: z.iso.date(),
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
      .array(z.object({ machineId: uuid, startMeterReadingId: uuid }).strict())
      .max(100),
    projectFuelAgreements: z
      .array(
        z
          .object({
            fuelSupplierId: uuid,
            fuelTypes: z
              .array(
                z
                  .object({
                    fuelTypeId: z.enum(["diesel-s10", "diesel-s500"]),
                    pricePerLiter: decimal(4, 14, true),
                  })
                  .strict(),
              )
              .min(1)
              .max(2)
              .refine((items) => unique(items, (item) => item.fuelTypeId)),
          })
          .strict(),
      )
      .max(10),
  })
  .strict()
  .superRefine((command, context) => {
    if ((command.latitude === null) !== (command.longitude === null))
      context.addIssue({
        code: "custom",
        path: [command.latitude === null ? "latitude" : "longitude"],
        message: "Coordinates must be paired",
      });
    if (command.plannedEndDate < command.plannedStartDate)
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
        "projectFuelAgreements",
        command.projectFuelAgreements.map((item) => item.fuelSupplierId),
      ],
    ];
    for (const [path, ids] of collections)
      if (new Set(ids).size !== ids.length)
        context.addIssue({
          code: "custom",
          path: [path],
          message: "Duplicate ids",
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
