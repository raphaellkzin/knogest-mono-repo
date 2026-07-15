import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined));

const patchText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => {
      if (value === undefined) return undefined;
      if (value === null || value.length === 0) return null;
      return value;
    });

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
    addressStreet: optionalText(160),
    addressNumber: optionalText(30),
    addressComplement: optionalText(100),
    addressNeighborhood: optionalText(100),
    city: optionalText(120),
    state: optionalText(80),
    postalCode: optionalText(24),
  })
  .strict();

const decimal = (scale: number, integral: number, positive = false) => {
  const pattern = new RegExp(`^\\d{1,${integral}}\\.\\d{${scale}}$`, "u");
  return z
    .string()
    .regex(pattern)
    .refine((value) => !positive || !/^0+\\.0+$/u.test(value));
};

const uuid = z.string().uuid();

const supplierOfferBaseSchema = z
  .object({
    itemId: uuid.optional(),
    itemName: optionalText(160),
    baseUnitId: uuid,
    purchaseUnitId: uuid,
    conversionToBase: decimal(6, 12, true),
    price: decimal(4, 14, true).optional(),
  })
  .strict();

export const supplierOfferSchema = supplierOfferBaseSchema.superRefine(
  (value, ctx) => {
    if (!value.itemId && !value.itemName) {
      ctx.addIssue({
        code: "custom",
        path: ["itemName"],
        message: "Item name is required when no item id is provided",
      });
    }
  },
);

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

export const createSupplierSchema = entityBaseSchema.superRefine(
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

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = z
  .object({
    fullName: patchText(180),
    legalName: patchText(180),
    tradeName: patchText(180),
    phone: patchText(32),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .nullable()
      .optional()
      .or(z.literal("").transform(() => null)),
    addressLine: patchText(220),
    addressStreet: patchText(160),
    addressNumber: patchText(30),
    addressComplement: patchText(100),
    addressNeighborhood: patchText(100),
    city: patchText(120),
    state: patchText(80),
    postalCode: patchText(24),
  })
  .strict();

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const updateSupplierOfferSchema = supplierOfferBaseSchema
  .partial()
  .extend({
    price: decimal(4, 14, true).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.itemId && !value.itemName && value.baseUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["itemId"],
        message: "Item is required when changing the base unit",
      });
    }
    if (value.itemName && !value.baseUnitId) {
      ctx.addIssue({
        code: "custom",
        path: ["baseUnitId"],
        message: "Base unit is required when creating a new item",
      });
    }
  });

export type CreateSupplierOfferInput = z.infer<typeof supplierOfferSchema>;
export type UpdateSupplierOfferInput = z.infer<
  typeof updateSupplierOfferSchema
>;

export const createMeasurementUnitSchema = z
  .object({
    code: z.string().trim().min(1).max(24),
    name: z.string().trim().min(1).max(80),
  })
  .strict();

export type CreateMeasurementUnitInput = z.infer<
  typeof createMeasurementUnitSchema
>;

export const createSuppliedItemSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    baseUnitId: uuid,
    categoryId: uuid.nullable().optional(),
    valueUnitQuantity: decimal(6, 12, true).optional(),
    basePrice: decimal(4, 14).optional(),
  })
  .strict();

export type CreateSuppliedItemInput = z.infer<typeof createSuppliedItemSchema>;

export const updateSuppliedItemSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    baseUnitId: uuid.optional(),
    categoryId: uuid.nullable().optional(),
    valueUnitQuantity: decimal(6, 12, true).optional(),
    basePrice: decimal(4, 14).optional(),
    propagateMirrorToExistingOffers: z.boolean().default(false),
  })
  .strict();

export type UpdateSuppliedItemInput = z.infer<typeof updateSuppliedItemSchema>;

export const addSupplierToSuppliedItemSchema = z
  .object({
    supplierId: uuid,
    price: decimal(4, 14, true),
    conversionToBase: decimal(6, 12, true),
  })
  .strict();

export type AddSupplierToSuppliedItemInput = z.infer<
  typeof addSupplierToSuppliedItemSchema
>;

export const createSuppliedItemCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    parentId: uuid.nullable().optional(),
  })
  .strict();

export type CreateSuppliedItemCategoryInput = z.infer<
  typeof createSuppliedItemCategorySchema
>;

export const updateSuppliedItemCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    parentId: uuid.nullable().optional(),
  })
  .strict();

export type UpdateSuppliedItemCategoryInput = z.infer<
  typeof updateSuppliedItemCategorySchema
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

export const listSuppliedItemOffersQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    cursor: z.string().trim().min(1).max(2048).optional(),
  })
  .strict();

export type ListSuppliedItemOffersQuery = z.infer<
  typeof listSuppliedItemOffersQuerySchema
>;
