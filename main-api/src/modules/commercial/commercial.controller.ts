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
  createCommercialRegistrySchema,
  listCommercialRegistryQuerySchema,
  selectorQuerySchema,
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
    city: { type: "string", maxLength: 120 },
    state: { type: "string", maxLength: 80 },
    postalCode: { type: "string", maxLength: 24 },
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

const clientParamsSchema = z.object({ clientId: z.string().uuid() }).strict();
const fuelSupplierParamsSchema = z
  .object({ fuelSupplierId: z.string().uuid() })
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
