import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { jsonResponse } from "../../lib/utils/jsonResponse";
import {
  maskedSensitiveDocumentSchema,
  protectedSensitiveDocumentSchema,
} from "../../lib/utils/swaggerSchemas";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../lib/utils/zodResolver";
import {
  addSupplierToSuppliedItemSchema,
  createSuppliedItemCategorySchema,
  createMeasurementUnitSchema,
  createCommercialRegistrySchema,
  createSuppliedItemSchema,
  createSupplierSchema,
  supplierOfferSchema as createSupplierOfferBodySchema,
  listCommercialRegistryQuerySchema,
  listSuppliedItemSelectorsQuerySchema,
  listSuppliedItemOffersQuerySchema,
  selectorQuerySchema,
  updateSuppliedItemCategorySchema,
  updateSuppliedItemSchema,
  updateSupplierOfferSchema,
  updateSupplierSchema,
} from "./commercial.dto";
import { CommercialService } from "./commercial.service";
import { listActiveFuelTypesHandler } from "./handlers/commercial-registry.handler";

const errorSchema = {
  type: "object",
  required: ["success", "code", "message", "details", "requestId"],
  properties: {
    success: { type: "boolean", const: false },
    code: { type: "string" },
    message: { type: "string" },
    details: { type: "object", nullable: true },
    requestId: { type: "string", format: "uuid" },
  },
} as const;

const createRegistryBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["entityType", "document"],
  properties: {
    entityType: { type: "string", enum: ["individual", "legal_entity"] },
    document: { type: "string", minLength: 1, maxLength: 32, writeOnly: true },
    fullName: { type: "string", maxLength: 180 },
    legalName: { type: "string", maxLength: 180 },
    tradeName: { type: "string", maxLength: 180 },
    phone: { type: "string", maxLength: 32 },
    email: { type: "string", format: "email", maxLength: 254 },
    addressLine: { type: "string", maxLength: 220 },
    addressStreet: { type: "string", maxLength: 160 },
    addressNumber: { type: "string", maxLength: 30 },
    addressComplement: { type: "string", maxLength: 100 },
    addressNeighborhood: { type: "string", maxLength: 100 },
    city: { type: "string", maxLength: 120 },
    state: { type: "string", maxLength: 80 },
    postalCode: { type: "string", maxLength: 24 },
  },
} as const;

const createSupplierBodySchema = createRegistryBodySchema;

const updateSupplierBodySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fullName: { type: "string", nullable: true, maxLength: 180 },
    legalName: { type: "string", nullable: true, maxLength: 180 },
    tradeName: { type: "string", nullable: true, maxLength: 180 },
    phone: { type: "string", nullable: true, maxLength: 32 },
    email: {
      type: "string",
      nullable: true,
      format: "email",
      maxLength: 254,
    },
    addressLine: { type: "string", nullable: true, maxLength: 220 },
    addressStreet: { type: "string", nullable: true, maxLength: 160 },
    addressNumber: { type: "string", nullable: true, maxLength: 30 },
    addressComplement: { type: "string", nullable: true, maxLength: 100 },
    addressNeighborhood: { type: "string", nullable: true, maxLength: 100 },
    city: { type: "string", nullable: true, maxLength: 120 },
    state: { type: "string", nullable: true, maxLength: 80 },
    postalCode: { type: "string", nullable: true, maxLength: 24 },
  },
} as const;

const supplierOfferBodyOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["baseUnitId", "purchaseUnitId", "conversionToBase"],
  properties: {
    itemId: { type: "string", format: "uuid" },
    itemName: { type: "string", maxLength: 160 },
    baseUnitId: { type: "string", format: "uuid" },
    purchaseUnitId: { type: "string", format: "uuid" },
    conversionToBase: { type: "string", pattern: "^\\d{1,12}\\.\\d{6}$" },
    price: { type: "string", pattern: "^\\d{1,14}\\.\\d{4}$" },
  },
} as const;

const updateSupplierOfferBodyOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  properties: supplierOfferBodyOpenApiSchema.properties,
} as const;

const addSupplierToSuppliedItemBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["supplierId", "price", "conversionToBase"],
  properties: {
    supplierId: { type: "string", format: "uuid" },
    price: { type: "string", pattern: "^\\d{1,14}\\.\\d{4}$" },
    conversionToBase: { type: "string", pattern: "^\\d{1,12}\\.\\d{6}$" },
  },
} as const;

const listRegistryQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
    cursor: { type: "string", minLength: 1, maxLength: 2048 },
    search: { type: "string", maxLength: 120 },
    entityType: { type: "string", enum: ["individual", "legal_entity"] },
    sortBy: {
      type: "string",
      enum: ["name", "createdAt"],
      default: "createdAt",
    },
    sortDirection: { type: "string", enum: ["asc", "desc"], default: "desc" },
  },
} as const;

const selectorOpenApiQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    search: { type: "string", maxLength: 120 },
    limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
  },
} as const;

const suppliedItemOffersOpenApiQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 30 },
    cursor: { type: "string", minLength: 1, maxLength: 2048 },
    supplierId: { type: "string", format: "uuid" },
  },
} as const;

const suppliedItemSelectorsOpenApiQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
    cursor: { type: "string", minLength: 1, maxLength: 2048 },
    search: { type: "string", maxLength: 120 },
    categoryId: { type: "string", format: "uuid" },
    includeDescendants: { type: "boolean", default: true },
    onlyWithActiveOffers: { type: "boolean", default: false },
  },
} as const;

const clientParamsOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["clientId"],
  properties: { clientId: { type: "string", format: "uuid" } },
} as const;

const fuelSupplierParamsOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["fuelSupplierId"],
  properties: { fuelSupplierId: { type: "string", format: "uuid" } },
} as const;

const supplierParamsOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["supplierId"],
  properties: { supplierId: { type: "string", format: "uuid" } },
} as const;

const supplierOfferParamsOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["supplierId", "offerId"],
  properties: {
    supplierId: { type: "string", format: "uuid" },
    offerId: { type: "string", format: "uuid" },
  },
} as const;

const registryListItemSchema = {
  type: "object",
  required: [
    "id",
    "entityType",
    "name",
    "document",
    "isActive",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    entityType: { type: "string", enum: ["individual", "legal_entity"] },
    name: { type: "string" },
    fullName: { type: "string", nullable: true },
    legalName: { type: "string", nullable: true },
    tradeName: { type: "string", nullable: true },
    phone: { type: "string", nullable: true },
    email: { type: "string", nullable: true },
    addressLine: { type: "string", nullable: true },
    addressStreet: { type: "string", nullable: true },
    addressNumber: { type: "string", nullable: true },
    addressComplement: { type: "string", nullable: true },
    addressNeighborhood: { type: "string", nullable: true },
    city: { type: "string", nullable: true },
    state: { type: "string", nullable: true },
    postalCode: { type: "string", nullable: true },
    document: maskedSensitiveDocumentSchema,
    isActive: { type: "boolean" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  additionalProperties: false,
} as const;

const registryDetailSchema = {
  ...registryListItemSchema,
  properties: {
    ...registryListItemSchema.properties,
    document: protectedSensitiveDocumentSchema,
  },
} as const;

const supplierOfferSchema = {
  type: "object",
  required: [
    "id",
    "item",
    "baseUnit",
    "purchaseUnit",
    "conversionToBase",
    "currentPrice",
    "priceHistory",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    item: {
      type: "object",
      nullable: true,
      required: ["id", "name", "baseUnitId"],
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        baseUnitId: { type: "string", format: "uuid" },
      },
      additionalProperties: false,
    },
    baseUnit: {
      type: "object",
      nullable: true,
      required: ["id", "code", "name"],
      properties: {
        id: { type: "string", format: "uuid" },
        code: { type: "string" },
        name: { type: "string" },
      },
      additionalProperties: false,
    },
    purchaseUnit: {
      type: "object",
      nullable: true,
      required: ["id", "code", "name"],
      properties: {
        id: { type: "string", format: "uuid" },
        code: { type: "string" },
        name: { type: "string" },
      },
      additionalProperties: false,
    },
    conversionToBase: { type: "string" },
    currentPrice: {
      type: "object",
      nullable: true,
      required: ["id", "price", "effectiveFrom"],
      properties: {
        id: { type: "string", format: "uuid" },
        price: { type: "string" },
        effectiveFrom: { type: "string", format: "date-time" },
      },
      additionalProperties: false,
    },
    priceHistory: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "price", "effectiveFrom", "effectiveTo"],
        properties: {
          id: { type: "string", format: "uuid" },
          price: { type: "string" },
          effectiveFrom: { type: "string", format: "date-time" },
          effectiveTo: { type: "string", format: "date-time", nullable: true },
        },
        additionalProperties: false,
      },
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  additionalProperties: false,
} as const;

const suppliedItemOfferSchema = {
  type: "object",
  required: [
    "id",
    "supplier",
    "baseUnit",
    "conversionToBase",
    "currentPrice",
    "priceHistory",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    supplier: {
      type: "object",
      required: ["id", "name", "tradeName", "document"],
      properties: {
        id: { type: "string", format: "uuid" },
        name: { type: "string" },
        tradeName: { type: "string", nullable: true },
        document: maskedSensitiveDocumentSchema,
      },
      additionalProperties: false,
    },
    baseUnit: {
      type: "object",
      nullable: true,
      required: ["id", "code", "name"],
      properties: {
        id: { type: "string", format: "uuid" },
        code: { type: "string" },
        name: { type: "string" },
      },
      additionalProperties: false,
    },
    conversionToBase: { type: "string" },
    currentPrice: {
      type: "object",
      nullable: true,
      required: ["id", "price", "effectiveFrom"],
      properties: {
        id: { type: "string", format: "uuid" },
        price: { type: "string" },
        effectiveFrom: { type: "string", format: "date-time" },
      },
      additionalProperties: false,
    },
    priceHistory: supplierOfferSchema.properties.priceHistory,
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  additionalProperties: false,
} as const;

const suppliedItemOffersResponseSchema = {
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: {
      type: "object",
      required: ["data", "pageInfo"],
      properties: {
        data: { type: "array", items: suppliedItemOfferSchema },
        pageInfo: {
          type: "object",
          required: ["hasNextPage", "nextCursor"],
          properties: {
            hasNextPage: { type: "boolean" },
            nextCursor: { type: "string", nullable: true },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
} as const;

const suppliedItemOfferSupplierIdsResponseSchema = {
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: { type: "array", items: { type: "string", format: "uuid" } },
  },
} as const;

const supplierDetailSchema = {
  ...registryDetailSchema,
  required: [...registryDetailSchema.required, "offers"],
  properties: {
    ...registryDetailSchema.properties,
    offers: { type: "array", items: supplierOfferSchema },
  },
} as const;

const supplierDetailResponseSchema = {
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: supplierDetailSchema,
  },
} as const;

const measurementUnitSchema = {
  type: "object",
  required: ["id", "code", "name"],
  properties: {
    id: { type: "string", format: "uuid" },
    code: { type: "string" },
    name: { type: "string" },
  },
  additionalProperties: false,
} as const;

const suppliedItemSchema = {
  type: "object",
  required: ["id", "name", "baseUnitId"],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    baseUnitId: { type: "string", format: "uuid" },
    categoryId: { type: "string", format: "uuid", nullable: true },
    valueUnitQuantity: { type: "string" },
    basePrice: { type: "string" },
  },
  additionalProperties: false,
} as const;

const suppliedItemCategorySchema = {
  type: "object",
  required: ["id", "name", "parentId", "createdAt", "updatedAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    parentId: { type: "string", format: "uuid", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  additionalProperties: false,
} as const;

const suppliedItemCatalogItemSchema = {
  type: "object",
  required: [
    "id",
    "name",
    "categoryId",
    "baseUnitId",
    "baseUnit",
    "valueUnitQuantity",
    "basePrice",
    "activeSupplierCount",
    "spentQuantity",
    "lastSpentAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    categoryId: { type: "string", format: "uuid", nullable: true },
    baseUnitId: { type: "string", format: "uuid" },
    baseUnit: { ...measurementUnitSchema, nullable: true },
    valueUnitQuantity: { type: "string" },
    basePrice: { type: "string" },
    activeSupplierCount: { type: "integer", minimum: 0 },
    spentQuantity: { type: "string", nullable: true },
    lastSpentAt: { type: "string", format: "date-time", nullable: true },
    updatedAt: { type: "string", format: "date-time" },
  },
  additionalProperties: false,
} as const;

const suppliedItemCatalogResponseSchema = {
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: {
      type: "object",
      required: ["categories", "items"],
      properties: {
        categories: { type: "array", items: suppliedItemCategorySchema },
        items: { type: "array", items: suppliedItemCatalogItemSchema },
      },
      additionalProperties: false,
    },
  },
} as const;

const suppliedItemSelectorSchema = {
  type: "object",
  required: [
    "id",
    "name",
    "baseUnitId",
    "categoryId",
    "categoryPath",
    "activeSupplierCount",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    baseUnitId: { type: "string", format: "uuid" },
    categoryId: { type: "string", format: "uuid", nullable: true },
    categoryPath: { type: "array", items: { type: "string" } },
    activeSupplierCount: { type: "integer", minimum: 0 },
  },
  additionalProperties: false,
} as const;

const suppliedItemSelectorsResponseSchema = {
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: {
      type: "object",
      required: ["data", "pageInfo"],
      properties: {
        data: { type: "array", items: suppliedItemSelectorSchema },
        pageInfo: {
          type: "object",
          required: ["hasNextPage", "nextCursor"],
          properties: {
            hasNextPage: { type: "boolean" },
            nextCursor: { type: "string", nullable: true },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
} as const;

const listResponseSchema = {
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: {
      type: "object",
      required: ["data", "pageInfo"],
      properties: {
        data: { type: "array", items: registryListItemSchema },
        pageInfo: {
          type: "object",
          required: ["hasNextPage", "nextCursor"],
          properties: {
            hasNextPage: { type: "boolean" },
            nextCursor: { type: "string", nullable: true },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
} as const;

const detailResponseSchema = {
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: registryDetailSchema,
  },
} as const;

const selectorResponseSchema = {
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "name", "document"],
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          tradeName: { type: "string", nullable: true },
          document: maskedSensitiveDocumentSchema,
        },
        additionalProperties: false,
      },
    },
  },
} as const;

function scopeFromRequest(request: {
  authContext?: { corporationId: string; companyId?: string };
}) {
  const corporationId = request.authContext?.corporationId;
  const companyId = request.authContext?.companyId;
  if (!corporationId || !companyId) {
    throw new Error("Company-scoped route executed without auth context");
  }
  return { corporationId, companyId };
}

function actorScopeFromRequest(request: {
  authContext?: { corporationId: string; companyId?: string; userId?: string };
}) {
  const scope = scopeFromRequest(request);
  const actorUserId = request.authContext?.userId;
  if (!actorUserId) {
    throw new Error("Company-scoped route executed without user context");
  }
  return { ...scope, actorUserId };
}

const removalResponseSchema = {
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: {
      type: "object",
      required: ["id", "isActive", "removedAt"],
      properties: {
        id: { type: "string", format: "uuid" },
        isActive: { type: "boolean", const: false },
        removedAt: { type: "string", format: "date-time" },
      },
      additionalProperties: false,
    },
  },
} as const;

const deactivationResponseSchema = {
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data: {
      type: "object",
      required: ["id", "isActive"],
      properties: {
        id: { type: "string", format: "uuid" },
        isActive: { type: "boolean", const: false },
      },
      additionalProperties: false,
    },
  },
} as const;

const clientParamsSchema = z.object({ clientId: z.string().uuid() }).strict();
const fuelSupplierParamsSchema = z
  .object({ fuelSupplierId: z.string().uuid() })
  .strict();
const supplierParamsSchema = z
  .object({ supplierId: z.string().uuid() })
  .strict();
const supplierOfferParamsSchema = z
  .object({ supplierId: z.string().uuid(), offerId: z.string().uuid() })
  .strict();
const suppliedItemParamsSchema = z
  .object({ itemId: z.string().uuid() })
  .strict();
const suppliedItemCategoryParamsSchema = z
  .object({ categoryId: z.string().uuid() })
  .strict();

export const v1CommercialController = async (app: FastifyInstance) => {
  const commercialService = new CommercialService(app.handlerContext);

  app.post(
    "/clients",
    {
      preHandler: [
        app.requireCompanyScope,
        validateBody(createCommercialRegistrySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Create a Client in the selected Company",
        security: [{ bearerAuth: [] }],
        body: createRegistryBodySchema,
        response: {
          201: detailResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.create(
        "clients",
        scopeFromRequest(request),
        request.body as z.infer<typeof createCommercialRegistrySchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.get(
    "/clients",
    {
      preHandler: [
        app.requireCompanyScope,
        validateQuery(listCommercialRegistryQuerySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "List Clients in the selected Company",
        security: [{ bearerAuth: [] }],
        querystring: listRegistryQuerySchema,
        response: {
          200: listResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.list(
        "clients",
        scopeFromRequest(request),
        request.query as z.infer<typeof listCommercialRegistryQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/clients/:clientId",
    {
      preHandler: [app.requireCompanyScope, validateParams(clientParamsSchema)],
      schema: {
        tags: ["Commercial"],
        summary: "Get an authorized Client detail",
        security: [{ bearerAuth: [] }],
        params: clientParamsOpenApiSchema,
        response: {
          200: detailResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { clientId } = request.params as z.infer<typeof clientParamsSchema>;
      const data = await commercialService.detail(
        "clients",
        scopeFromRequest(request),
        clientId,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.delete(
    "/clients/:clientId",
    {
      preHandler: [app.requireCompanyScope, validateParams(clientParamsSchema)],
      schema: {
        tags: ["Commercial"],
        summary: "Remove a Client from operational use",
        security: [{ bearerAuth: [] }],
        params: clientParamsOpenApiSchema,
        response: {
          200: removalResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { clientId } = request.params as z.infer<typeof clientParamsSchema>;
      const data = await commercialService.remove(
        "clients",
        actorScopeFromRequest(request),
        clientId,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/suppliers",
    {
      preHandler: [app.requireCompanyScope, validateBody(createSupplierSchema)],
      schema: {
        tags: ["Commercial"],
        summary: "Create a Supplier in the selected Company",
        security: [{ bearerAuth: [] }],
        body: createSupplierBodySchema,
        response: {
          201: supplierDetailResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.createSupplier(
        scopeFromRequest(request),
        request.body as z.infer<typeof createSupplierSchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.get(
    "/suppliers",
    {
      preHandler: [
        app.requireCompanyScope,
        validateQuery(listCommercialRegistryQuerySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "List Suppliers in the selected Company",
        security: [{ bearerAuth: [] }],
        querystring: listRegistryQuerySchema,
        response: {
          200: listResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.list(
        "suppliers",
        scopeFromRequest(request),
        request.query as z.infer<typeof listCommercialRegistryQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/suppliers/:supplierId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(supplierParamsSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Get an authorized Supplier detail",
        security: [{ bearerAuth: [] }],
        params: supplierParamsOpenApiSchema,
        response: {
          200: supplierDetailResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { supplierId } = request.params as z.infer<
        typeof supplierParamsSchema
      >;
      const data = await commercialService.detail(
        "suppliers",
        scopeFromRequest(request),
        supplierId,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.patch(
    "/suppliers/:supplierId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(supplierParamsSchema),
        validateBody(updateSupplierSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Update Supplier registry information",
        security: [{ bearerAuth: [] }],
        params: supplierParamsOpenApiSchema,
        body: updateSupplierBodySchema,
        response: {
          200: supplierDetailResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { supplierId } = request.params as z.infer<
        typeof supplierParamsSchema
      >;
      const data = await commercialService.updateSupplier(
        scopeFromRequest(request),
        supplierId,
        request.body as z.infer<typeof updateSupplierSchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/suppliers/:supplierId/offers",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(supplierParamsSchema),
        validateBody(createSupplierOfferBodySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Create a Supplier catalog offer",
        security: [{ bearerAuth: [] }],
        params: supplierParamsOpenApiSchema,
        body: supplierOfferBodyOpenApiSchema,
        response: {
          201: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: supplierOfferSchema,
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { supplierId } = request.params as z.infer<
        typeof supplierParamsSchema
      >;
      const data = await commercialService.createSupplierOffer(
        scopeFromRequest(request),
        supplierId,
        request.body as z.infer<typeof createSupplierOfferBodySchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.patch(
    "/suppliers/:supplierId/offers/:offerId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(supplierOfferParamsSchema),
        validateBody(updateSupplierOfferSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Update a Supplier catalog offer",
        security: [{ bearerAuth: [] }],
        params: supplierOfferParamsOpenApiSchema,
        body: updateSupplierOfferBodyOpenApiSchema,
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: supplierOfferSchema,
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { supplierId, offerId } = request.params as z.infer<
        typeof supplierOfferParamsSchema
      >;
      const data = await commercialService.updateSupplierOffer(
        scopeFromRequest(request),
        supplierId,
        offerId,
        request.body as z.infer<typeof updateSupplierOfferSchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.delete(
    "/suppliers/:supplierId/offers/:offerId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(supplierOfferParamsSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Deactivate a Supplier catalog offer",
        security: [{ bearerAuth: [] }],
        params: supplierOfferParamsOpenApiSchema,
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: {
                type: "object",
                required: ["id", "isActive"],
                properties: {
                  id: { type: "string", format: "uuid" },
                  isActive: { type: "boolean", const: false },
                },
                additionalProperties: false,
              },
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { supplierId, offerId } = request.params as z.infer<
        typeof supplierOfferParamsSchema
      >;
      const data = await commercialService.removeSupplierOffer(
        scopeFromRequest(request),
        supplierId,
        offerId,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.delete(
    "/suppliers/:supplierId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(supplierParamsSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Remove a Supplier from operational use",
        security: [{ bearerAuth: [] }],
        params: supplierParamsOpenApiSchema,
        response: {
          200: removalResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { supplierId } = request.params as z.infer<
        typeof supplierParamsSchema
      >;
      const data = await commercialService.remove(
        "suppliers",
        actorScopeFromRequest(request),
        supplierId,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/measurement-units",
    {
      preHandler: app.requireCompanyScope,
      schema: {
        tags: ["Commercial"],
        summary: "List Measurement Units",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: { type: "array", items: measurementUnitSchema },
            },
          },
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.listMeasurementUnits(
        scopeFromRequest(request),
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/measurement-units",
    {
      preHandler: [
        app.requireCompanyScope,
        validateBody(createMeasurementUnitSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Create a Company Measurement Unit",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["code", "name"],
          properties: {
            code: { type: "string", minLength: 1, maxLength: 24 },
            name: { type: "string", minLength: 1, maxLength: 80 },
          },
        },
        response: {
          201: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: measurementUnitSchema,
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.createMeasurementUnit(
        scopeFromRequest(request),
        request.body as z.infer<typeof createMeasurementUnitSchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.get(
    "/supplied-items/catalog",
    {
      preHandler: app.requireCompanyScope,
      schema: {
        tags: ["Commercial"],
        summary: "List the global Supplied Item catalog tree",
        security: [{ bearerAuth: [] }],
        response: {
          200: suppliedItemCatalogResponseSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.listSuppliedItemCatalog(
        scopeFromRequest(request),
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/supplied-item-categories",
    {
      preHandler: [
        app.requireCompanyScope,
        validateBody(createSuppliedItemCategorySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Create a Supplied Item Category",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 120 },
            parentId: { type: "string", format: "uuid", nullable: true },
          },
        },
        response: {
          201: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: suppliedItemCategorySchema,
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.createSuppliedItemCategory(
        scopeFromRequest(request),
        request.body as z.infer<typeof createSuppliedItemCategorySchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.patch(
    "/supplied-item-categories/:categoryId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(suppliedItemCategoryParamsSchema),
        validateBody(updateSuppliedItemCategorySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Update a Supplied Item Category",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          additionalProperties: false,
          required: ["categoryId"],
          properties: { categoryId: { type: "string", format: "uuid" } },
        },
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 120 },
            parentId: { type: "string", format: "uuid", nullable: true },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: suppliedItemCategorySchema,
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { categoryId } = request.params as z.infer<
        typeof suppliedItemCategoryParamsSchema
      >;
      const data = await commercialService.updateSuppliedItemCategory(
        scopeFromRequest(request),
        categoryId,
        request.body as z.infer<typeof updateSuppliedItemCategorySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.delete(
    "/supplied-item-categories/:categoryId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(suppliedItemCategoryParamsSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Deactivate a Supplied Item Category subtree",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          additionalProperties: false,
          required: ["categoryId"],
          properties: { categoryId: { type: "string", format: "uuid" } },
        },
        response: {
          200: deactivationResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { categoryId } = request.params as z.infer<
        typeof suppliedItemCategoryParamsSchema
      >;
      const data = await commercialService.removeSuppliedItemCategory(
        scopeFromRequest(request),
        categoryId,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/supplied-items",
    {
      preHandler: app.requireCompanyScope,
      schema: {
        tags: ["Commercial"],
        summary: "List global Supplied Items",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: { type: "array", items: suppliedItemSchema },
            },
          },
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.listSuppliedItems(
        scopeFromRequest(request),
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/supplied-items/selectors/active",
    {
      preHandler: [
        app.requireCompanyScope,
        validateQuery(listSuppliedItemSelectorsQuerySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Search active global Supplied Items for selectors",
        security: [{ bearerAuth: [] }],
        querystring: suppliedItemSelectorsOpenApiQuerySchema,
        response: {
          200: suppliedItemSelectorsResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.listSuppliedItemSelectors(
        scopeFromRequest(request),
        request.query as z.infer<typeof listSuppliedItemSelectorsQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/supplied-items",
    {
      preHandler: [
        app.requireCompanyScope,
        validateBody(createSuppliedItemSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Create a global Supplied Item",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["name", "baseUnitId"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 160 },
            baseUnitId: { type: "string", format: "uuid" },
            categoryId: { type: "string", format: "uuid", nullable: true },
            valueUnitQuantity: {
              type: "string",
              pattern: "^\\d{1,12}\\.\\d{6}$",
            },
            basePrice: { type: "string", pattern: "^\\d{1,14}\\.\\d{4}$" },
          },
        },
        response: {
          201: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: suppliedItemSchema,
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.createSuppliedItem(
        scopeFromRequest(request),
        request.body as z.infer<typeof createSuppliedItemSchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.patch(
    "/supplied-items/:itemId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(suppliedItemParamsSchema),
        validateBody(updateSuppliedItemSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Update a global Supplied Item",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          additionalProperties: false,
          required: ["itemId"],
          properties: { itemId: { type: "string", format: "uuid" } },
        },
        body: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 160 },
            baseUnitId: { type: "string", format: "uuid" },
            categoryId: { type: "string", format: "uuid", nullable: true },
            valueUnitQuantity: {
              type: "string",
              pattern: "^\\d{1,12}\\.\\d{6}$",
            },
            basePrice: { type: "string", pattern: "^\\d{1,14}\\.\\d{4}$" },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: suppliedItemSchema,
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { itemId } = request.params as z.infer<
        typeof suppliedItemParamsSchema
      >;
      const data = await commercialService.updateSuppliedItem(
        scopeFromRequest(request),
        itemId,
        request.body as z.infer<typeof updateSuppliedItemSchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/supplied-items/:itemId/suppliers",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(suppliedItemParamsSchema),
        validateBody(addSupplierToSuppliedItemSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Create a Supplier Offer from a global Supplied Item",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          additionalProperties: false,
          required: ["itemId"],
          properties: { itemId: { type: "string", format: "uuid" } },
        },
        body: addSupplierToSuppliedItemBodySchema,
        response: {
          201: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: supplierOfferSchema,
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { itemId } = request.params as z.infer<
        typeof suppliedItemParamsSchema
      >;
      const data = await commercialService.addSupplierToSuppliedItem(
        scopeFromRequest(request),
        itemId,
        request.body as z.infer<typeof addSupplierToSuppliedItemSchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.get(
    "/supplied-items/:itemId/offer-supplier-ids",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(suppliedItemParamsSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary:
          "List Supplier ids with active offers for a global Supplied Item",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          additionalProperties: false,
          required: ["itemId"],
          properties: { itemId: { type: "string", format: "uuid" } },
        },
        response: {
          200: suppliedItemOfferSupplierIdsResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { itemId } = request.params as z.infer<
        typeof suppliedItemParamsSchema
      >;
      const data = await commercialService.listSuppliedItemOfferSupplierIds(
        scopeFromRequest(request),
        itemId,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/supplied-items/:itemId/offer-suppliers",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(suppliedItemParamsSchema),
        validateQuery(selectorQuerySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary:
          "List active Suppliers with active offers for a global Supplied Item",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          additionalProperties: false,
          required: ["itemId"],
          properties: { itemId: { type: "string", format: "uuid" } },
        },
        querystring: selectorOpenApiQuerySchema,
        response: {
          200: selectorResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { itemId } = request.params as z.infer<
        typeof suppliedItemParamsSchema
      >;
      const data = await commercialService.listSuppliedItemOfferSuppliers(
        scopeFromRequest(request),
        itemId,
        request.query as z.infer<typeof selectorQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/supplied-items/:itemId/offers",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(suppliedItemParamsSchema),
        validateQuery(listSuppliedItemOffersQuerySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "List active Supplier Offers for a global Supplied Item",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          additionalProperties: false,
          required: ["itemId"],
          properties: { itemId: { type: "string", format: "uuid" } },
        },
        querystring: suppliedItemOffersOpenApiQuerySchema,
        response: {
          200: suppliedItemOffersResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { itemId } = request.params as z.infer<
        typeof suppliedItemParamsSchema
      >;
      const data = await commercialService.listSuppliedItemOffers(
        scopeFromRequest(request),
        itemId,
        request.query as z.infer<typeof listSuppliedItemOffersQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.delete(
    "/supplied-items/:itemId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(suppliedItemParamsSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Deactivate a global Supplied Item",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          additionalProperties: false,
          required: ["itemId"],
          properties: { itemId: { type: "string", format: "uuid" } },
        },
        response: {
          200: deactivationResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { itemId } = request.params as z.infer<
        typeof suppliedItemParamsSchema
      >;
      const data = await commercialService.removeSuppliedItem(
        scopeFromRequest(request),
        itemId,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/fuel-suppliers",
    {
      preHandler: [
        app.requireCompanyScope,
        validateBody(createCommercialRegistrySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Create a Fuel Supplier in the selected Company",
        security: [{ bearerAuth: [] }],
        body: createRegistryBodySchema,
        response: {
          201: detailResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.create(
        "fuel-suppliers",
        scopeFromRequest(request),
        request.body as z.infer<typeof createCommercialRegistrySchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.get(
    "/fuel-suppliers",
    {
      preHandler: [
        app.requireCompanyScope,
        validateQuery(listCommercialRegistryQuerySchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "List Fuel Suppliers in the selected Company",
        security: [{ bearerAuth: [] }],
        querystring: listRegistryQuerySchema,
        response: {
          200: listResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.list(
        "fuel-suppliers",
        scopeFromRequest(request),
        request.query as z.infer<typeof listCommercialRegistryQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/fuel-suppliers/selectors/active",
    {
      preHandler: [app.requireCompanyScope, validateQuery(selectorQuerySchema)],
      schema: {
        tags: ["Commercial"],
        summary:
          "List active Fuel Suppliers eligible for operational selectors",
        security: [{ bearerAuth: [] }],
        querystring: selectorOpenApiQuerySchema,
        response: {
          200: selectorResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await commercialService.listFuelSupplierSelector(
        scopeFromRequest(request),
        request.query as z.infer<typeof selectorQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/fuel-types",
    {
      preHandler: app.requireCompanyScope,
      schema: {
        tags: ["Commercial"],
        summary: "List the immutable active Fuel Type catalog",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: {
                type: "array",
                maxItems: 99,
                items: {
                  type: "object",
                  required: ["id", "name"],
                  properties: {
                    id: { enum: ["diesel-s10", "diesel-s500"] },
                    name: { type: "string" },
                  },
                },
              },
            },
          },
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (_request, reply) => {
      const data = await listActiveFuelTypesHandler(app.handlerContext);
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/fuel-suppliers/:fuelSupplierId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(fuelSupplierParamsSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Get an authorized Fuel Supplier detail",
        security: [{ bearerAuth: [] }],
        params: fuelSupplierParamsOpenApiSchema,
        response: {
          200: detailResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { fuelSupplierId } = request.params as z.infer<
        typeof fuelSupplierParamsSchema
      >;
      const data = await commercialService.detail(
        "fuel-suppliers",
        scopeFromRequest(request),
        fuelSupplierId,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.delete(
    "/fuel-suppliers/:fuelSupplierId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(fuelSupplierParamsSchema),
      ],
      schema: {
        tags: ["Commercial"],
        summary: "Remove a Fuel Supplier from operational use",
        security: [{ bearerAuth: [] }],
        params: fuelSupplierParamsOpenApiSchema,
        response: {
          200: removalResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { fuelSupplierId } = request.params as z.infer<
        typeof fuelSupplierParamsSchema
      >;
      const data = await commercialService.remove(
        "fuel-suppliers",
        actorScopeFromRequest(request),
        fuelSupplierId,
      );
      return jsonResponse.success({ reply, data });
    },
  );
};
