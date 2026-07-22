import { z } from "zod";

const uuid = z.string().uuid();
const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u);
const decimal = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/u);
const optionalText = (max: number) =>
  z
    .union([z.string().trim().max(max), z.null(), z.undefined()])
    .transform((value) => (value ? value : null));

export const dailyReportShiftSchema = z.enum(["day", "night"]);
export const dailyReportStatusSchema = z.enum(["draft", "finalized"]);
export const dailyReportActivityTypeSchema = z.enum([
  "earthworks",
  "drainage",
  "paving",
]);
export const dailyReportClimateConditionSchema = z.enum([
  "rain",
  "dry",
  "waterlogged_soil",
]);

export const dailyReportParamsSchema = z
  .object({
    projectId: uuid,
    reportId: uuid.optional(),
  })
  .strict();

export const dailyReportOptionsQuerySchema = z
  .object({
    reportDate: z.iso.date(),
    shift: dailyReportShiftSchema,
  })
  .strict();

export const dailyReportListQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().trim().min(1).max(2048).optional(),
    shift: dailyReportShiftSchema.optional(),
    status: dailyReportStatusSchema.optional(),
    sortBy: z.literal("reportDate").default("reportDate"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

const schedulePeriodSchema = z
  .object({
    startTime: time,
    endTime: time,
    startDayOffset: z.number().int().min(0).max(1).default(0),
    endDayOffset: z.number().int().min(0).max(1).default(0),
  })
  .strict()
  .superRefine((period, context) => {
    if (period.endDayOffset < period.startDayOffset) {
      context.addIssue({
        code: "custom",
        path: ["endDayOffset"],
        message: "Schedule period cannot end before it starts",
      });
      return;
    }
    const start = period.startDayOffset * 1440 + minutes(period.startTime);
    const end = period.endDayOffset * 1440 + minutes(period.endTime);
    if (end <= start)
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Schedule period must have a positive duration",
      });
    if (end - start > 1440)
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Schedule period cannot exceed 24 hours",
      });
  });

const employeeEntrySchema = z
  .object({
    employmentId: uuid,
    completedFullShift: z.boolean(),
    regularWorkedMinutes: z.number().int().min(0).max(1440),
    overtimeMinutes: z.number().int().min(0).max(1440),
  })
  .strict()
  .refine(
    (entry) => entry.regularWorkedMinutes + entry.overtimeMinutes <= 1440,
    { message: "Worked time cannot exceed 24 hours" },
  )
  .refine((entry) => entry.regularWorkedMinutes + entry.overtimeMinutes > 0, {
    message: "A participating employee must have worked time",
  });

const machineEntrySchema = z
  .object({ machineId: uuid, endMeterReadingValue: decimal })
  .strict();

export const dailyReportCommandSchema = z
  .object({
    reportDate: z.iso.date(),
    shift: dailyReportShiftSchema,
    schedulePeriods: z.array(schedulePeriodSchema).min(1).max(6),
    activityStartTime: time,
    activityEndTime: time,
    activityEndDayOffset: z.number().int().min(0).max(1),
    activityTypes: z.array(dailyReportActivityTypeSchema).min(1).max(3),
    climateConditions: z.array(dailyReportClimateConditionSchema).min(1).max(3),
    dailyRainfallMm: decimal,
    monthlyRainfallMm: decimal,
    supervisorEmploymentId: uuid,
    technicalResponsibilityEmploymentIds: z.array(uuid).min(1).max(20),
    employees: z.array(employeeEntrySchema).min(1).max(200),
    machines: z.array(machineEntrySchema).max(100),
    executedActivities: z.string().trim().min(1).max(10_000),
    interferences: optionalText(10_000),
  })
  .strict()
  .superRefine((command, context) => {
    uniqueValues(
      command.activityTypes,
      context,
      "activityTypes",
      "Duplicate activity type",
    );
    uniqueValues(
      command.climateConditions,
      context,
      "climateConditions",
      "Duplicate climate condition",
    );
    uniqueValues(
      command.technicalResponsibilityEmploymentIds,
      context,
      "technicalResponsibilityEmploymentIds",
      "Duplicate technical responsibility",
    );
    uniqueValues(
      command.employees.map((entry) => entry.employmentId),
      context,
      "employees",
      "Duplicate employee",
    );
    uniqueValues(
      command.machines.map((entry) => entry.machineId),
      context,
      "machines",
      "Duplicate machine",
    );

    const start = minutes(command.activityStartTime);
    const inferredEndDayOffset =
      command.shift === "night" &&
      command.activityEndDayOffset === 0 &&
      minutes(command.activityEndTime) <= start
        ? 1
        : command.activityEndDayOffset;
    const end = inferredEndDayOffset * 1440 + minutes(command.activityEndTime);
    if (command.shift === "day" && command.activityEndDayOffset !== 0)
      context.addIssue({
        code: "custom",
        path: ["activityEndDayOffset"],
        message: "Day shift must end on the report date",
      });
    if (end <= start)
      context.addIssue({
        code: "custom",
        path: ["activityEndTime"],
        message: "Activity end must be after its start",
      });
    if (end - start > 1440)
      context.addIssue({
        code: "custom",
        path: ["activityEndTime"],
        message: "Activity window cannot exceed 24 hours",
      });

    const periods = command.schedulePeriods.map((period) => ({
      start: period.startDayOffset * 1440 + minutes(period.startTime),
      end: period.endDayOffset * 1440 + minutes(period.endTime),
    }));
    periods.forEach((period, index) => {
      if (index > 0 && period.start < periods[index - 1]!.end)
        context.addIssue({
          code: "custom",
          path: ["schedulePeriods", index, "startTime"],
          message: "Schedule periods must be ordered and cannot overlap",
        });
    });
  })
  .transform((command) => ({
    ...command,
    activityEndDayOffset:
      command.shift === "night" &&
      command.activityEndDayOffset === 0 &&
      minutes(command.activityEndTime) <= minutes(command.activityStartTime)
        ? 1
        : command.activityEndDayOffset,
  }));

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour! * 60 + minute!;
}

function uniqueValues(
  values: string[],
  context: z.RefinementCtx,
  path: string,
  message: string,
) {
  if (new Set(values).size !== values.length)
    context.addIssue({ code: "custom", path: [path], message });
}

export type DailyReportCommand = z.infer<typeof dailyReportCommandSchema>;
export type DailyReportListQuery = z.infer<typeof dailyReportListQuerySchema>;
export type DailyReportOptionsQuery = z.infer<
  typeof dailyReportOptionsQuerySchema
>;
