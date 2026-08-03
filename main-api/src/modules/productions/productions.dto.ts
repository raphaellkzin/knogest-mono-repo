import { z } from "zod";

const uuid = z.string().uuid();
const date = z.string().date();
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u);
const decimal = z.string().regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,6})?$/u);
const positiveDecimal = z
  .string()
  .regex(/^(?:0*[1-9]\d{0,11})(?:\.\d{1,6})?$/u);

export const productionParamsSchema = z
  .object({
    projectId: uuid,
    productionId: uuid.optional(),
    tripId: uuid.optional(),
    reportId: uuid.optional(),
  })
  .strict();

export const productionListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z
      .string()
      .min(1)
      .max(2048)
      .regex(/^[A-Za-z0-9_-]+$/u)
      .optional(),
    productionDate: date.optional(),
    shift: z.enum(["day", "night"]).optional(),
    status: z.enum(["draft", "approved"]).optional(),
    workFrontId: uuid.optional(),
    sortBy: z.literal("productionDate").default("productionDate"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export const productionOptionsQuerySchema = z
  .object({
    productionDate: date,
    shift: z.enum(["day", "night"]),
  })
  .strict();

const stopSchema = z
  .object({
    durationMinutes: z.number().int().min(1).max(1440),
    reason: z.string().trim().min(1).max(160),
    notes: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

const equipmentSchema = z
  .object({
    machineId: uuid,
    role: z.enum([
      "excavation",
      "loading",
      "transport",
      "spreading",
      "grading",
      "compaction",
      "watering",
      "support",
    ]),
    operatorEmploymentId: uuid.nullable().default(null),
    initialMeterValue: decimal.nullable().default(null),
    finalMeterValue: decimal.nullable().default(null),
    workedMinutes: z.number().int().min(0).max(1440).nullable().default(null),
    defaultTripCapacityM3: positiveDecimal.nullable().default(null),
    stops: z.array(stopSchema).max(20).default([]),
  })
  .strict();

const evidenceSchema = z
  .object({
    kind: z.enum(["photo", "ticket", "attachment"]),
    name: z.string().trim().min(1).max(160),
    url: z.string().url().max(2_000),
    notes: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

export const productionCommandSchema = z
  .object({
    expectedRevision: z.number().int().positive().optional(),
    approveNow: z.boolean().default(false),
    workFrontId: uuid,
    workFrontServiceId: uuid,
    productionDate: date,
    shift: z.enum(["day", "night"]),
    entryMode: z.enum(["direct_total", "trips"]),
    startTime: time.nullable().default(null),
    endTime: time.nullable().default(null),
    endDayOffset: z.number().int().min(0).max(1).default(0),
    responsibleEmploymentId: uuid.nullable().default(null),
    location: z.string().trim().max(240).nullable().default(null),
    startStation: z.string().trim().max(80).nullable().default(null),
    endStation: z.string().trim().max(80).nullable().default(null),
    layer: z.string().trim().max(80).nullable().default(null),
    elevation: z.string().trim().max(80).nullable().default(null),
    materialName: z.string().trim().max(160).nullable().default(null),
    materialCategory: z.string().trim().max(120).nullable().default(null),
    volumeCondition: z
      .enum(["cut", "loose", "compacted"])
      .nullable()
      .default(null),
    directQuantity: decimal.nullable().default(null),
    measuredQuantity: decimal.nullable().default(null),
    conversionFactor: positiveDecimal.nullable().default(null),
    origin: z.string().trim().max(240).nullable().default(null),
    destination: z.string().trim().max(240).nullable().default(null),
    dmtKm: decimal.nullable().default(null),
    layerThicknessCm: decimal.nullable().default(null),
    compactionPasses: z.number().int().min(0).max(100).nullable().default(null),
    moistureCondition: z.string().trim().max(120).nullable().default(null),
    evidence: z.array(evidenceSchema).max(20).default([]),
    notes: z.string().trim().max(10_000).nullable().default(null),
    equipment: z.array(equipmentSchema).max(100).default([]),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.startTime &&
      value.endTime &&
      value.shift === "day" &&
      value.endDayOffset !== 0
    )
      context.addIssue({
        code: "custom",
        path: ["endDayOffset"],
        message: "Day shift must end on the production date",
      });
    value.equipment.forEach((equipment, index) => {
      if (
        equipment.initialMeterValue &&
        equipment.finalMeterValue &&
        Number(equipment.finalMeterValue) < Number(equipment.initialMeterValue)
      )
        context.addIssue({
          code: "custom",
          path: ["equipment", index, "finalMeterValue"],
          message: "Final meter value cannot be lower than initial value",
        });
    });
    const machineIds = new Set<string>();
    value.equipment.forEach((equipment, index) => {
      if (machineIds.has(equipment.machineId))
        context.addIssue({
          code: "custom",
          path: ["equipment", index, "machineId"],
          message: "Machine cannot be repeated",
        });
      machineIds.add(equipment.machineId);
    });
  });

export const productionTransitionSchema = z
  .object({ expectedRevision: z.number().int().positive() })
  .strict();

export const productionReopenSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export const productionTripSchema = z
  .object({
    expectedRevision: z.number().int().positive(),
    idempotencyKey: uuid,
    productionEquipmentId: uuid,
    recordedAt: z.string().datetime({ offset: true }).optional(),
    capacityM3: positiveDecimal.optional(),
    adjustedVolumeM3: positiveDecimal.nullable().default(null),
    ticketNumber: z.string().trim().max(80).nullable().default(null),
    notes: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

export const productionTripDeleteQuerySchema = z
  .object({ expectedRevision: z.coerce.number().int().positive() })
  .strict();

export const dailyReportProductionConfirmSchema = z
  .object({
    productionIds: z.array(uuid).max(200),
  })
  .strict();

export type ProductionCommand = z.infer<typeof productionCommandSchema>;
export type ProductionListQuery = z.infer<typeof productionListQuerySchema>;
export type ProductionOptionsQuery = z.infer<
  typeof productionOptionsQuerySchema
>;
export type ProductionTransition = z.infer<typeof productionTransitionSchema>;
export type ProductionReopen = z.infer<typeof productionReopenSchema>;
export type ProductionTripCommand = z.infer<typeof productionTripSchema>;
