import { z } from "zod";

const controlPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

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
          "Texto contém caracteres inválidos",
        ),
    );

const optionalText = (max: number) =>
  z.union([z.null(), z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(
      z
        .string()
        .max(max)
        .refine((value) => !controlPattern.test(value)),
    )])
    .transform((value) => value || null);

function decimal(scale: number, integral: number, positive: boolean) {
  const pattern = new RegExp(
    `^\\d{1,${integral}}(?:\\.\\d{1,${scale}})?$`,
    "u",
  );
  return z
    .string()
    .trim()
    .regex(pattern)
    .transform((value) => {
      const [whole, fraction = ""] = value.split(".");
      return `${whole.replace(/^0+(?=\d)/u, "")}.${fraction.padEnd(scale, "0")}`;
    })
    .refine(
      (value) => !positive || !/^0+\.0+$/u.test(value),
      "Deve ser positivo",
    );
}

const coordinate = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^-?\d{1,3}(?:\.\d{1,6})?$/u)
    .refine((value) => Number(value) >= min && Number(value) <= max)
    .transform((value) => {
      const number = Number(value);
      return (Object.is(number, -0) ? 0 : number).toFixed(6);
    });

export const weekDays = [1, 2, 3, 4, 5, 6, 7] as const;

const scheduleDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(1).max(7),
    isWorking: z.boolean(),
    startTime: z.string().nullable(),
    endTime: z.string().nullable(),
  })
  .strict()
  .superRefine((day, context) => {
    if (!day.isWorking) {
      if (day.startTime !== null || day.endTime !== null)
        context.addIssue({
          code: "custom",
          message: "Dia sem trabalho não possui horário",
        });
      return;
    }
    if (!day.startTime || !timePattern.test(day.startTime))
      context.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Horário inicial inválido",
      });
    if (!day.endTime || !timePattern.test(day.endTime))
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Horário final inválido",
      });
    if (day.startTime && day.endTime && day.startTime >= day.endTime)
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "O fim deve ser posterior ao início",
      });
  });

const breakTemplateSchema = z.object({
  name: text(120),
  durationMinutes: z.coerce.number().int().min(1).max(1440),
});

const employeeAllocationSchema = z.object({
  employmentId: z.string().uuid(),
  confirmedJobRolePeriodId: z.string().uuid(),
  expectedDailyWorkloadMinutes: z.coerce.number().int().min(1).max(1440),
  compensationMode: z.enum([
    "daily",
    "hourly",
    "weekly",
    "fortnightly",
    "monthly",
  ]),
  compensationValue: decimal(2, 16, false),
  overtimeRate: decimal(2, 16, false),
});

const machineAllocationSchema = z.object({
  machineId: z.string().uuid(),
  startMeterReadingId: z.string().uuid(),
});

const fuelAgreementSchema = z.object({
  fuelSupplierId: z.string().uuid(),
  fuelTypes: z
    .array(
      z.object({
        fuelTypeId: z.enum(["diesel-s10", "diesel-s500"]),
        pricePerLiter: decimal(4, 14, true),
      }),
    )
    .min(1)
    .max(2)
    .refine(
      (items) =>
        new Set(items.map((item) => item.fuelTypeId)).size === items.length,
    ),
});

export const projectCommandSchema = z
  .object({
    name: text(160),
    address: text(500, true),
    latitude: z.union([coordinate(-90, 90), z.null()]),
    longitude: z.union([coordinate(-180, 180), z.null()]),
    contractNumber: optionalText(120),
    approvedBudget: decimal(2, 16, false),
    plannedStartDate: z.string().regex(datePattern),
    plannedEndDate: z.string().regex(datePattern),
    clientId: z.string().uuid(),
    managerEmploymentId: z.string().uuid(),
    technicalResponsibilityEmploymentIds: z
      .array(z.string().uuid())
      .min(1)
      .max(20),
    weeklySchedule: z.array(scheduleDaySchema).length(7),
    breakTemplates: z.array(breakTemplateSchema).max(10),
    initialEmployeeAllocations: z.array(employeeAllocationSchema).max(200),
    initialMachineAllocations: z.array(machineAllocationSchema).max(100),
    projectFuelAgreements: z.array(fuelAgreementSchema).max(10),
  })
  .strict()
  .superRefine((command, context) => {
    if ((command.latitude === null) !== (command.longitude === null))
      context.addIssue({
        code: "custom",
        path: [command.latitude === null ? "latitude" : "longitude"],
        message: "Informe as duas coordenadas",
      });
    if (command.plannedEndDate < command.plannedStartDate)
      context.addIssue({
        code: "custom",
        path: ["plannedEndDate"],
        message: "A data final deve ser posterior à inicial",
      });
    if (
      command.weeklySchedule.map((day) => day.dayOfWeek).join(",") !==
      "1,2,3,4,5,6,7"
    )
      context.addIssue({
        code: "custom",
        path: ["weeklySchedule"],
        message: "A semana deve conter segunda a domingo",
      });
    if (!command.weeklySchedule.some((day) => day.isWorking))
      context.addIssue({
        code: "custom",
        path: ["weeklySchedule"],
        message: "Informe ao menos um dia de trabalho",
      });
    for (const [path, values] of [
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
    ] as const) {
      if (new Set(values).size !== values.length)
        context.addIssue({
          code: "custom",
          path: [path],
          message: "Itens duplicados",
        });
    }
  });

export type ProjectCommand = z.infer<typeof projectCommandSchema>;

export const emptyProjectCommand: ProjectCommand = {
  name: "",
  address: "",
  latitude: null,
  longitude: null,
  contractNumber: null,
  approvedBudget: "0.00",
  plannedStartDate: "",
  plannedEndDate: "",
  clientId: "",
  managerEmploymentId: "",
  technicalResponsibilityEmploymentIds: [],
  weeklySchedule: weekDays.map((dayOfWeek) => ({
    dayOfWeek,
    isWorking: dayOfWeek <= 5,
    startTime: dayOfWeek <= 5 ? "08:00" : null,
    endTime: dayOfWeek <= 5 ? "17:00" : null,
  })),
  breakTemplates: [],
  initialEmployeeAllocations: [],
  initialMachineAllocations: [],
  projectFuelAgreements: [],
};
