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
  createEmployeeSchema,
  listEmployeesQuerySchema,
} from "./workforce.dto";
import { WorkforceService } from "./workforce.service";

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

const createEmployeeBodySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "document",
    "fullName",
    "companyRegistrationNumber",
    "admissionDate",
  ],
  properties: {
    document: { type: "string", minLength: 1, maxLength: 32, writeOnly: true },
    fullName: { type: "string", minLength: 1, maxLength: 180 },
    companyRegistrationNumber: {
      type: "string",
      minLength: 1,
      maxLength: 80,
    },
    admissionDate: { type: "string", format: "date" },
  },
} as const;

const listEmployeesOpenApiQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
    cursor: { type: "string", minLength: 1, maxLength: 2048 },
    search: { type: "string", maxLength: 120 },
    state: { type: "string", enum: ["active"] },
    availability: { type: "string", enum: ["available"] },
    sortBy: { type: "string", enum: ["name", "createdAt"], default: "createdAt" },
    sortDirection: { type: "string", enum: ["asc", "desc"], default: "desc" },
  },
} as const;

const employeeParamsOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["employmentId"],
  properties: { employmentId: { type: "string", format: "uuid" } },
} as const;

const employeeListItemSchema = {
  type: "object",
  required: ["id", "person", "employment", "availability"],
  properties: {
    id: { type: "string", format: "uuid" },
    person: {
      type: "object",
      required: ["id", "fullName", "displayName", "document"],
      properties: {
        id: { type: "string", format: "uuid" },
        fullName: { type: "string" },
        displayName: { type: "string" },
        document: maskedSensitiveDocumentSchema,
      },
      additionalProperties: false,
    },
    employment: {
      type: "object",
      required: [
        "id",
        "companyRegistrationNumber",
        "state",
        "isActive",
        "admissionDate",
        "createdAt",
        "updatedAt",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        companyRegistrationNumber: { type: "string" },
        state: { type: "string", enum: ["active", "terminated"] },
        isActive: { type: "boolean" },
        admissionDate: { type: "string", format: "date", nullable: true },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      additionalProperties: false,
    },
    availability: {
      type: "object",
      required: ["state", "hasOpenAllocation"],
      properties: {
        state: { type: "string", enum: ["available"] },
        hasOpenAllocation: { type: "boolean" },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

const employeeDetailSchema = {
  ...employeeListItemSchema,
  required: ["id", "person", "employment", "availability", "periods"],
  properties: {
    ...employeeListItemSchema.properties,
    person: {
      type: "object",
      required: [
        "id",
        "fullName",
        "displayName",
        "document",
        "createdAt",
        "updatedAt",
      ],
      properties: {
        id: { type: "string", format: "uuid" },
        fullName: { type: "string" },
        displayName: { type: "string" },
        document: protectedSensitiveDocumentSchema,
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
      additionalProperties: false,
    },
    periods: {
      type: "array",
      items: {
        type: "object",
        required: [
          "id",
          "admissionDate",
          "effectiveFrom",
          "effectiveTo",
          "terminationReason",
          "createdAt",
          "updatedAt",
        ],
        properties: {
          id: { type: "string", format: "uuid" },
          admissionDate: { type: "string", format: "date" },
          effectiveFrom: { type: "string", format: "date" },
          effectiveTo: { type: "string", format: "date", nullable: true },
          terminationReason: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
        additionalProperties: false,
      },
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
        data: { type: "array", items: employeeListItemSchema },
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
    data: employeeDetailSchema,
  },
} as const;

const employeeParamsSchema = z
  .object({ employmentId: z.string().uuid() })
  .strict();

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

export const v1WorkforceController = async (app: FastifyInstance) => {
  const workforceService = new WorkforceService(app.handlerContext);

  app.post(
    "/employees",
    {
      preHandler: [app.requireCompanyScope, validateBody(createEmployeeSchema)],
      schema: {
        tags: ["Workforce"],
        summary: "Create a Person Employment in the selected Company",
        security: [{ bearerAuth: [] }],
        body: createEmployeeBodySchema,
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
      const data = await workforceService.create(
        scopeFromRequest(request),
        request.body as z.infer<typeof createEmployeeSchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.get(
    "/employees",
    {
      preHandler: [
        app.requireCompanyScope,
        validateQuery(listEmployeesQuerySchema),
      ],
      schema: {
        tags: ["Workforce"],
        summary: "List Employees in the selected Company",
        security: [{ bearerAuth: [] }],
        querystring: listEmployeesOpenApiQuerySchema,
        response: {
          200: listResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await workforceService.list(
        scopeFromRequest(request),
        request.query as z.infer<typeof listEmployeesQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/employees/:employmentId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(employeeParamsSchema),
      ],
      schema: {
        tags: ["Workforce"],
        summary: "Get an authorized Employee detail",
        security: [{ bearerAuth: [] }],
        params: employeeParamsOpenApiSchema,
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
      const { employmentId } = request.params as z.infer<
        typeof employeeParamsSchema
      >;
      const data = await workforceService.detail(
        scopeFromRequest(request),
        employmentId,
      );
      return jsonResponse.success({ reply, data });
    },
  );
};
