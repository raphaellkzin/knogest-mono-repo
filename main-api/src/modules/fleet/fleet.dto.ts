import { z } from "zod";

const optionalSearch = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

const optionalIdentifier = z
  .string()
  .trim()
  .max(80)
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine(
    (value) => value === undefined || /[A-Za-z0-9]/u.test(value),
    "Identifier must include at least one letter or number",
  );

export const decimalStringSchema = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/);

export const createMachineSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    type: z.enum(["YELLOW_LINE", "WHITE_LINE"]),
    manufacturer: z.string().trim().min(1).max(120),
    model: z.string().trim().min(1).max(120),
    meterType: z.enum(["HOUR_METER", "ODOMETER"]),
    plate: optionalIdentifier,
    companyTag: optionalIdentifier,
    initialMeterReading: decimalStringSchema,
  })
  .strict()
  .refine((value) => Boolean(value.plate || value.companyTag), {
    message: "At least one identifier is required",
    path: ["plate"],
  });

export type CreateMachineInput = z.infer<typeof createMachineSchema>;

export const listMachinesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().trim().min(1).max(2048).optional(),
    search: optionalSearch,
    type: z.enum(["YELLOW_LINE", "WHITE_LINE"]).optional(),
    availability: z.enum(["available"]).optional(),
    sortBy: z.enum(["name", "createdAt"]).default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type ListMachinesQuery = z.infer<typeof listMachinesQuerySchema>;

export const machineParamsSchema = z
  .object({ machineId: z.string().uuid() })
  .strict();

export const machineReadingParamsSchema = z
  .object({
    machineId: z.string().uuid(),
    readingId: z.string().uuid(),
  })
  .strict();

export const appendMachineMeterReadingSchema = z
  .object({ value: decimalStringSchema })
  .strict();

export type AppendMachineMeterReadingInput = z.infer<
  typeof appendMachineMeterReadingSchema
>;

export const correctMachineMeterReadingSchema = z
  .object({
    value: decimalStringSchema,
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export type CorrectMachineMeterReadingInput = z.infer<
  typeof correctMachineMeterReadingSchema
>;
