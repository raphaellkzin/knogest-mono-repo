import { z } from "zod";
import { decimalInputToCanonical, onlyDigits } from "@/lib/brazilian-input-mask";

const controlPattern = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;

const text = (
  max: number,
  multiline = false,
  requiredMessage = "Preencha este campo.",
) =>
  z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(
      z
        .string()
        .min(1, requiredMessage)
        .max(max, `Use no máximo ${max} caracteres.`)
        .refine(
          (value) =>
            !controlPattern.test(value) &&
            (multiline || !/[\r\n]/u.test(value)),
          "Remova caracteres inválidos do texto.",
        ),
    );

const optionalText = (max: number) =>
  z.union([z.null(), z.undefined(), z
    .string()
    .transform((value) => value.trim().normalize("NFC"))
    .pipe(
      z
        .string()
        .max(max, `Use no máximo ${max} caracteres.`)
        .refine(
          (value) => !controlPattern.test(value),
          "Remova caracteres inválidos do texto.",
        ),
    )])
    .transform((value) => value || null);

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
          .max(max, `Use no máximo ${max} caracteres.`)
          .refine((value) => !controlPattern.test(value), {
            message: "Remova caracteres inválidos do texto.",
          }),
        z.null(),
        z.undefined(),
      ]),
    )
    .transform((value) => value || null);

function decimal(scale: number, integral: number, positive: boolean) {
  const pattern = new RegExp(
    `^\\d{1,${integral}}(?:\\.\\d{1,${scale}})?$`,
    "u",
  );
  return z
    .string()
    .trim()
    .transform((value) =>
      value.includes(",") || /[^\d.]/u.test(value)
        ? decimalInputToCanonical(value, scale)
        : value,
    )
    .pipe(z.string().regex(pattern, "Informe um valor válido."))
    .transform((value) => {
      const [whole, fraction = ""] = value.split(".");
      return `${whole.replace(/^0+(?=\d)/u, "")}.${fraction.padEnd(scale, "0")}`;
    })
    .refine(
      (value) => !positive || !/^0+\.0+$/u.test(value),
      "Informe um valor maior que zero.",
    );
}

const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => (typeof value === "string" ? value.trim() : value))
  .pipe(
    z.union([z.string().regex(datePattern), z.literal(""), z.null(), z.undefined()]),
  )
  .transform((value) => value || null);

export const projectAddressSchema = z
  .object({
    postalCode: z
      .string()
      .transform((value) => onlyDigits(value, 8))
      .pipe(z.string().regex(/^\d{8}$/u, "Informe um CEP com 8 dígitos.")),
    street: text(160, false, "Informe o logradouro."),
    number: optionalNullableText(30),
    complement: optionalNullableText(100),
    neighborhood: text(100, false, "Informe o bairro."),
    city: text(100, false, "Informe a cidade."),
    state: z
      .string()
      .trim()
      .transform((value) => value.toUpperCase())
      .pipe(z.string().regex(/^[A-Z]{2}$/u, "Informe a UF com 2 letras.")),
  })
  .strict()
  .superRefine((address, context) => {
    const formatted = [
      address.number ? `${address.street}, ${address.number}` : address.street,
      address.complement,
      `${address.neighborhood} - ${address.city}/${address.state}`,
      `CEP ${address.postalCode.slice(0, 5)}-${address.postalCode.slice(5)}`,
    ]
      .filter(Boolean)
      .join(" - ");
    if (formatted.length > 500)
      context.addIssue({
        code: "custom",
        path: ["street"],
        message:
          "O endereço ficou muito longo. Revise os campos de localização.",
      });
  });

const coordinate = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^-?\d{1,3}(?:\.\d{1,6})?$/u, "Informe uma coordenada válida.")
    .refine(
      (value) => Number(value) >= min && Number(value) <= max,
      "Informe uma coordenada dentro do intervalo permitido.",
    )
    .transform((value) => {
      const number = Number(value);
      return (Object.is(number, -0) ? 0 : number).toFixed(6);
    });

const optionalCoordinate = (min: number, max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" ? value.trim() : value))
    .pipe(z.union([coordinate(min, max), z.literal(""), z.null(), z.undefined()]))
    .transform((value) => value || null);

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
          message: "Remova os horários de dias sem trabalho.",
        });
      return;
    }
    if (!day.startTime || !timePattern.test(day.startTime))
      context.addIssue({
        code: "custom",
        path: ["startTime"],
        message: "Informe um horário inicial válido.",
      });
    if (!day.endTime || !timePattern.test(day.endTime))
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "Informe um horário final válido.",
      });
    if (day.startTime && day.endTime && day.startTime >= day.endTime)
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "O horário final deve ser posterior ao inicial.",
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
  operatorEmploymentId: z.string().uuid(),
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
    name: text(160, false, "Informe o nome da obra."),
    address: projectAddressSchema,
    latitude: optionalCoordinate(-90, 90),
    longitude: optionalCoordinate(-180, 180),
    contractNumber: optionalText(120),
    approvedBudget: decimal(2, 16, false),
    plannedStartDate: z
      .string()
      .regex(datePattern, "Informe a data de início planejada."),
    plannedEndDate: optionalDate,
    clientId: z.string().uuid("Selecione o cliente."),
    managerEmploymentId: z.string().uuid("Selecione o gestor da obra."),
    technicalResponsibilityEmploymentIds: z
      .array(z.string().uuid())
      .min(1, "Selecione pelo menos um responsável técnico.")
      .max(20, "Selecione no máximo 20 responsáveis técnicos."),
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
        message: "Informe latitude e longitude para usar a prévia do mapa.",
      });
    if (
      command.plannedEndDate !== null &&
      command.plannedEndDate < command.plannedStartDate
    )
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
    const teamEmploymentIds = new Set(
      command.initialEmployeeAllocations.map((item) => item.employmentId),
    );
    command.initialMachineAllocations.forEach((allocation, index) => {
      if (!teamEmploymentIds.has(allocation.operatorEmploymentId))
        context.addIssue({
          code: "custom",
          path: ["initialMachineAllocations", index, "operatorEmploymentId"],
          message: "Selecione um operador da equipe inicial",
        });
    });
  });

export type ProjectCommand = z.infer<typeof projectCommandSchema>;

export const emptyProjectCommand: ProjectCommand = {
  name: "",
  address: {
    postalCode: "",
    street: "",
    number: "",
    complement: null,
    neighborhood: "",
    city: "",
    state: "",
  },
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
