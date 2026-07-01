import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const entityBaseSchema = z
  .object({
    entityType: z.enum(["individual", "legal_entity"]),
    document: z.string().trim().min(1).max(32),
    fullName: optionalText(180),
    legalName: optionalText(180),
    tradeName: optionalText(180),
    phone: optionalText(32),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    addressLine: optionalText(220),
    city: optionalText(120),
    state: optionalText(80),
    postalCode: optionalText(24),
  })
  .strict();

export const createCommercialRegistrySchema = entityBaseSchema.superRefine(
  (value, ctx) => {
    if (value.entityType === "individual" && !value.fullName) {
      ctx.addIssue({
        code: "custom",
        message: "Full name is required for individual records",
        path: ["fullName"],
      });
    }
    if (value.entityType === "legal_entity" && !value.legalName) {
      ctx.addIssue({
        code: "custom",
        message: "Legal name is required for legal entity records",
        path: ["legalName"],
      });
    }
  },
);

export type CreateCommercialRegistryInput = z.infer<
  typeof createCommercialRegistrySchema
>;

export const commercialRegistryParamsSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

export type CommercialRegistryParams = z.infer<
  typeof commercialRegistryParamsSchema
>;

export const listCommercialRegistryQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().trim().min(1).max(2048).optional(),
    search: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    entityType: z.enum(["individual", "legal_entity"]).optional(),
    sortBy: z.enum(["name", "createdAt"]).default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

export type ListCommercialRegistryQuery = z.infer<
  typeof listCommercialRegistryQuerySchema
>;

export const selectorQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => (value && value.length > 0 ? value : undefined)),
    limit: z.coerce.number().int().min(1).max(100).default(25),
  })
  .strict();

export type SelectorQuery = z.infer<typeof selectorQuerySchema>;
