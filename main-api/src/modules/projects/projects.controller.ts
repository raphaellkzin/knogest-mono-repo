import type { FastifyInstance, FastifyRequest } from "fastify";
import { jsonResponse } from "../../lib/utils/jsonResponse";
import {
  projectCommandSchema,
  projectIdempotencyKeySchema,
  projectListQuerySchema,
  projectParamsSchema,
  projectReadinessCommandSchema,
} from "./projects.dto";
import { ProjectsService, type ProjectScope } from "./projects.service";

const errorSchema = {
  type: "object",
  required: ["success", "code", "message", "details", "requestId"],
  properties: {
    success: { type: "boolean", const: false },
    code: { type: "string" },
    message: { type: "string" },
    details: { type: "object", nullable: true, additionalProperties: true },
    requestId: { type: "string" },
  },
} as const;
const successSchema = (data: object) => ({
  type: "object",
  required: ["success", "message", "data"],
  properties: {
    success: { type: "boolean", const: true },
    message: { type: "string" },
    data,
  },
});
const projectLifecycleStatusSchema = {
  enum: ["planned", "active", "paused", "completed", "cancelled"],
} as const;
const projectItemSchema = {
  type: "object",
  required: [
    "id",
    "name",
    "contractNumber",
    "status",
    "actualStartedAt",
    "createdAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    contractNumber: { type: "string", nullable: true },
    status: projectLifecycleStatusSchema,
    actualStartedAt: { type: "string", format: "date-time", nullable: true },
    createdAt: { type: "string", format: "date-time" },
  },
};
const uuid = { type: "string", format: "uuid" } as const;
const projectAddressOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["postalCode", "street", "neighborhood", "city", "state"],
  properties: {
    postalCode: { type: "string", pattern: "^\\d{8}$" },
    street: { type: "string", minLength: 1, maxLength: 160 },
    number: { type: "string", nullable: true, maxLength: 30 },
    complement: { type: "string", nullable: true, maxLength: 100 },
    neighborhood: { type: "string", minLength: 1, maxLength: 100 },
    city: { type: "string", minLength: 1, maxLength: 100 },
    state: { type: "string", pattern: "^[A-Z]{2}$" },
  },
} as const;
const projectCommandOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "address",
    "latitude",
    "longitude",
    "approvedBudget",
    "plannedStartDate",
    "clientId",
    "managerEmploymentId",
    "technicalResponsibilityEmploymentIds",
    "weeklySchedule",
    "breakTemplates",
    "initialEmployeeAllocations",
    "initialMachineAllocations",
    "projectSupplierOffers",
  ],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    address: projectAddressOpenApiSchema,
    latitude: { type: "string", nullable: true },
    longitude: { type: "string", nullable: true },
    contractNumber: { type: "string", nullable: true, maxLength: 120 },
    approvedBudget: { type: "string" },
    plannedStartDate: { type: "string", format: "date" },
    plannedEndDate: { type: "string", format: "date", nullable: true },
    clientId: uuid,
    managerEmploymentId: uuid,
    technicalResponsibilityEmploymentIds: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      uniqueItems: true,
      items: uuid,
    },
    weeklySchedule: {
      type: "array",
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dayOfWeek", "isWorking", "startTime", "endTime"],
        properties: {
          dayOfWeek: { type: "integer", minimum: 1, maximum: 7 },
          isWorking: { type: "boolean" },
          startTime: { type: "string", nullable: true },
          endTime: { type: "string", nullable: true },
        },
      },
    },
    breakTemplates: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "durationMinutes"],
        properties: {
          name: { type: "string", maxLength: 120 },
          durationMinutes: { type: "integer", minimum: 1, maximum: 1440 },
        },
      },
    },
    initialEmployeeAllocations: {
      type: "array",
      maxItems: 200,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "employmentId",
          "expectedDailyWorkloadMinutes",
          "compensationMode",
          "compensationValue",
          "overtimeRate",
        ],
        properties: {
          employmentId: uuid,
          confirmedJobRoleId: uuid,
          confirmedJobRolePeriodId: { ...uuid, nullable: true },
          confirmedJobRoleName: {
            type: "string",
            minLength: 1,
            maxLength: 120,
            nullable: true,
          },
          expectedDailyWorkloadMinutes: {
            type: "integer",
            minimum: 1,
            maximum: 1440,
          },
          compensationMode: {
            enum: ["daily", "hourly", "weekly", "fortnightly", "monthly"],
          },
          compensationValue: { type: "string" },
          overtimeRate: { type: "string" },
        },
      },
    },
    initialMachineAllocations: {
      type: "array",
      maxItems: 100,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["machineId", "startMeterReadingId", "operatorEmploymentId"],
        properties: {
          machineId: uuid,
          startMeterReadingId: uuid,
          operatorEmploymentId: uuid,
        },
      },
    },
    projectSupplierOffers: {
      type: "array",
      maxItems: 0,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["purchaseUnitId", "conversionToBase", "price"],
        properties: {
          supplierId: uuid,
          supplier: {
            type: "object",
            additionalProperties: false,
            required: ["entityType", "document", "saveGlobally"],
            properties: {
              entityType: { enum: ["individual", "legal_entity"] },
              document: { type: "string", maxLength: 32 },
              fullName: { type: "string", nullable: true, maxLength: 180 },
              legalName: { type: "string", nullable: true, maxLength: 180 },
              tradeName: { type: "string", nullable: true, maxLength: 180 },
              phone: { type: "string", nullable: true, maxLength: 32 },
              email: { type: "string", nullable: true, maxLength: 254 },
              addressLine: { type: "string", nullable: true, maxLength: 220 },
              city: { type: "string", nullable: true, maxLength: 120 },
              state: { type: "string", nullable: true, maxLength: 80 },
              postalCode: { type: "string", nullable: true, maxLength: 24 },
              saveGlobally: { type: "boolean", default: false },
            },
          },
          itemId: uuid,
          item: {
            type: "object",
            additionalProperties: false,
            required: ["name", "baseUnitId", "saveGlobally"],
            properties: {
              name: { type: "string", minLength: 1, maxLength: 160 },
              baseUnitId: uuid,
              saveGlobally: { type: "boolean", default: false },
            },
          },
          sourceOfferId: { type: "string", format: "uuid", nullable: true },
          purchaseUnitId: uuid,
          conversionToBase: { type: "string" },
          price: { type: "string" },
        },
      },
    },
  },
} as const;

const projectReadinessCommandOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    plannedEndDate: { type: "string", format: "date" },
    productionMetricTargets: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["metricCode", "targetTotal"],
        properties: {
          metricCode: { enum: ["cut", "fill", "finishing", "top_soil"] },
          targetTotal: { type: "string" },
        },
      },
    },
    fuelOffers: {
      type: "array",
      maxItems: 10,
      items: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["sourceOfferId", "price"],
            properties: {
              mode: { enum: ["existing"] },
              sourceOfferId: uuid,
              conversionToBase: { type: "string" },
              price: { type: "string" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "mode",
              "supplierId",
              "itemId",
              "purchaseUnitId",
              "conversionToBase",
              "price",
            ],
            properties: {
              mode: { enum: ["projectOnly", "companyCatalog"] },
              supplierId: uuid,
              itemId: uuid,
              purchaseUnitId: uuid,
              conversionToBase: { type: "string" },
              price: { type: "string" },
            },
          },
        ],
      },
    },
    materialOffers: {
      type: "array",
      maxItems: 50,
      items: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: ["sourceOfferId", "price"],
            properties: {
              mode: { enum: ["existing"] },
              sourceOfferId: uuid,
              price: { type: "string" },
            },
          },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "mode",
              "supplierId",
              "itemId",
              "purchaseUnitId",
              "conversionToBase",
              "price",
            ],
            properties: {
              mode: { enum: ["projectOnly", "companyCatalog"] },
              supplierId: uuid,
              itemId: uuid,
              purchaseUnitId: uuid,
              conversionToBase: { type: "string" },
              price: { type: "string" },
            },
          },
        ],
      },
    },
    accountability: {
      type: "object",
      additionalProperties: false,
      required: [
        "clientId",
        "managerEmploymentId",
        "technicalResponsibilityEmploymentIds",
      ],
      properties: {
        clientId: uuid,
        managerEmploymentId: uuid,
        technicalResponsibilityEmploymentIds: {
          type: "array",
          minItems: 1,
          maxItems: 20,
          items: uuid,
        },
      },
    },
    employeeAllocations:
      projectCommandOpenApiSchema.properties.initialEmployeeAllocations,
    machineAllocations:
      projectCommandOpenApiSchema.properties.initialMachineAllocations,
    compensationPaymentTerms: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["compensationMode", "daysAfterPeriodEnd"],
        properties: {
          compensationMode: {
            enum: ["daily", "hourly", "weekly", "fortnightly", "monthly"],
          },
          daysAfterPeriodEnd: { type: "integer", minimum: 0, maximum: 60 },
        },
      },
    },
  },
} as const;

const projectReadinessBlockerSchema = {
  type: "object",
  required: ["section", "message"],
  properties: {
    section: {
      enum: [
        "dates",
        "metrics",
        "fuel",
        "items",
        "equipment",
        "team",
        "payments",
      ],
    },
    message: { type: "string" },
  },
  additionalProperties: false,
} as const;

const projectDetailSchema = {
  type: "object",
  additionalProperties: true,
  required: [
    "id",
    "name",
    "status",
    "actualStartedAt",
    "createdAt",
    "baseline",
    "readiness",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    contractNumber: { type: "string", nullable: true },
    status: projectLifecycleStatusSchema,
    actualStartedAt: { type: "string", format: "date-time", nullable: true },
    createdAt: { type: "string", format: "date-time" },
    baseline: { type: "object", nullable: true, additionalProperties: true },
    readiness: {
      type: "object",
      required: ["canActivate", "blockers"],
      properties: {
        canActivate: { type: "boolean" },
        blockers: { type: "array", items: projectReadinessBlockerSchema },
      },
      additionalProperties: false,
    },
  },
} as const;

const projectReadinessOptionsSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "clients",
    "employees",
    "machines",
    "jobRoles",
    "suppliers",
    "suppliedItems",
    "suppliedItemCategories",
    "measurementUnits",
    "supplierOffers",
  ],
  properties: {
    clients: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    employees: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    machines: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    jobRoles: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    suppliers: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    suppliedItems: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    suppliedItemCategories: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    measurementUnits: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    supplierOffers: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
  },
} as const;

function scope(request: FastifyRequest): ProjectScope {
  const auth = request.authContext;
  if (!auth?.companyId) throw new Error("Company scope middleware invariant");
  return {
    corporationId: auth.corporationId,
    companyId: auth.companyId,
    sessionId: auth.sessionId,
    userId: auth.userId,
    role: auth.role,
  };
}

export async function v1ProjectsController(app: FastifyInstance) {
  const service = new ProjectsService(app.handlerContext);

  app.post(
    "/projects",
    {
      bodyLimit: 1_048_576,
      preHandler: app.requireCompanyScope,
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
          keyGenerator: (request: FastifyRequest) =>
            `${request.authContext?.sessionId ?? request.ip}:${request.authContext?.companyId ?? "unknown"}`,
        },
      },
      schema: {
        tags: ["Projects"],
        summary: "Create a complete Project aggregate",
        security: [{ bearerAuth: [] }],
        consumes: ["application/json"],
        headers: {
          type: "object",
          required: ["idempotency-key", "x-expected-company-id"],
          properties: {
            "idempotency-key": { type: "string", format: "uuid" },
            "x-expected-company-id": { type: "string", format: "uuid" },
            "content-type": { const: "application/json" },
          },
        },
        body: projectCommandOpenApiSchema,
        response: {
          201: successSchema({
            type: "object",
            required: ["projectId", "status"],
            properties: {
              projectId: { type: "string", format: "uuid" },
              status: { const: "planned" },
            },
          }),
          400: errorSchema,
          409: errorSchema,
          413: errorSchema,
          429: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const contentType = request.headers["content-type"]
        ?.split(";", 1)[0]
        ?.trim()
        .toLowerCase();
      if (contentType !== "application/json")
        return jsonResponse.error({
          reply,
          statusCode: 415,
          code: "BAD_REQUEST",
          message: "Content-Type must be application/json",
        });
      const rawKey = request.headers["idempotency-key"];
      if (typeof rawKey !== "string")
        return jsonResponse.error({
          reply,
          statusCode: 400,
          code: "IDEMPOTENCY_KEY_REQUIRED",
          message: "Idempotency-Key is required",
        });
      const parsedKey = projectIdempotencyKeySchema.safeParse(
        rawKey.toLowerCase(),
      );
      if (!parsedKey.success)
        return jsonResponse.error({
          reply,
          statusCode: 400,
          code: "IDEMPOTENCY_KEY_INVALID",
          message: "Idempotency-Key must be a UUID v4",
        });
      const expected = request.headers["x-expected-company-id"];
      if (typeof expected !== "string")
        return jsonResponse.error({
          reply,
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Expected Company is required",
        });
      const parsed = projectCommandSchema.safeParse(request.body);
      if (!parsed.success)
        return jsonResponse.error({
          reply,
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Project command is invalid",
          details: {
            fields: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              code: issue.code,
            })),
            resources: [],
          },
        });
      try {
        return jsonResponse.success({
          reply,
          statusCode: 201,
          message: "Project created",
          data: await service.finalize(
            scope(request),
            expected,
            parsedKey.data,
            parsed.data,
          ),
        });
      } catch (error) {
        return jsonResponse.fromError({ reply, error });
      }
    },
  );

  app.get(
    "/projects",
    {
      preHandler: app.requireCompanyScope,
      schema: {
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 100 },
            cursor: { type: "string", maxLength: 2048 },
            search: { type: "string", maxLength: 120 },
            sortBy: { enum: ["name", "createdAt"] },
            sortDirection: { enum: ["asc", "desc"] },
          },
        },
        response: {
          200: successSchema({
            type: "object",
            required: ["data", "pageInfo"],
            properties: {
              data: { type: "array", items: projectItemSchema },
              pageInfo: {
                type: "object",
                required: ["hasNextPage", "nextCursor"],
                properties: {
                  hasNextPage: { type: "boolean" },
                  nextCursor: { type: "string", nullable: true },
                },
              },
            },
          }),
          400: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const parsed = projectListQuerySchema.safeParse(request.query);
      if (!parsed.success)
        return jsonResponse.error({
          reply,
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid Project query",
        });
      try {
        return jsonResponse.success({
          reply,
          data: await service.list(scope(request), parsed.data),
        });
      } catch (error) {
        return jsonResponse.fromError({ reply, error });
      }
    },
  );

  app.get<{ Params: { projectId: string } }>(
    "/projects/:projectId",
    {
      preHandler: app.requireCompanyScope,
      schema: {
        tags: ["Projects"],
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["projectId"],
          properties: { projectId: { type: "string", format: "uuid" } },
        },
        response: {
          200: successSchema(projectDetailSchema),
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        return jsonResponse.success({
          reply,
          data: await service.detail(scope(request), request.params.projectId),
        });
      } catch (error) {
        return jsonResponse.fromError({ reply, error });
      }
    },
  );

  app.get<{ Params: { projectId: string } }>(
    "/projects/:projectId/readiness-options",
    {
      preHandler: app.requireCompanyScope,
      schema: {
        tags: ["Projects"],
        summary: "List Project readiness editor options",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["projectId"],
          properties: { projectId: { type: "string", format: "uuid" } },
        },
        response: {
          200: successSchema(projectReadinessOptionsSchema),
          400: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const parsedParams = projectParamsSchema.safeParse(request.params);
      if (!parsedParams.success)
        return jsonResponse.error({
          reply,
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid Project params",
        });
      try {
        return jsonResponse.success({
          reply,
          data: await service.readinessOptions(
            scope(request),
            parsedParams.data.projectId,
          ),
        });
      } catch (error) {
        return jsonResponse.fromError({ reply, error });
      }
    },
  );

  app.put<{ Params: { projectId: string } }>(
    "/projects/:projectId/readiness",
    {
      preHandler: app.requireCompanyScope,
      schema: {
        tags: ["Projects"],
        summary:
          "Save the operational readiness checklist for a planned Project",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["projectId"],
          properties: { projectId: { type: "string", format: "uuid" } },
        },
        body: projectReadinessCommandOpenApiSchema,
        response: {
          200: successSchema(projectDetailSchema),
          400: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const parsedParams = projectParamsSchema.safeParse(request.params);
      if (!parsedParams.success)
        return jsonResponse.error({
          reply,
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid Project params",
        });
      const parsedBody = projectReadinessCommandSchema.safeParse(request.body);
      if (!parsedBody.success)
        return jsonResponse.error({
          reply,
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Project readiness command is invalid",
          details: {
            fields: parsedBody.error.issues.map((issue) => ({
              path: issue.path.join("."),
              code: issue.code,
            })),
            resources: [],
          },
        });
      try {
        return jsonResponse.success({
          reply,
          data: await service.saveReadiness(
            scope(request),
            parsedParams.data.projectId,
            parsedBody.data,
          ),
        });
      } catch (error) {
        return jsonResponse.fromError({ reply, error });
      }
    },
  );

  app.post<{ Params: { projectId: string } }>(
    "/projects/:projectId/activate",
    {
      preHandler: app.requireCompanyScope,
      schema: {
        tags: ["Projects"],
        summary: "Activate a planned Project after readiness validation",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          required: ["projectId"],
          properties: { projectId: { type: "string", format: "uuid" } },
        },
        response: {
          200: successSchema(projectDetailSchema),
          400: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const parsedParams = projectParamsSchema.safeParse(request.params);
      if (!parsedParams.success)
        return jsonResponse.error({
          reply,
          statusCode: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid Project params",
        });
      try {
        return jsonResponse.success({
          reply,
          data: await service.activate(
            scope(request),
            parsedParams.data.projectId,
          ),
        });
      } catch (error) {
        return jsonResponse.fromError({ reply, error });
      }
    },
  );
}
