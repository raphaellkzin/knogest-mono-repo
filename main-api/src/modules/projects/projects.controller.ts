import type { FastifyInstance, FastifyRequest } from "fastify";
import { jsonResponse } from "../../lib/utils/jsonResponse";
import {
  projectCommandSchema,
  projectIdempotencyKeySchema,
  projectListQuerySchema,
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
const projectItemSchema = {
  type: "object",
  required: ["id", "name", "contractNumber", "status", "createdAt"],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    contractNumber: { type: "string", nullable: true },
    status: { const: "planned" },
    createdAt: { type: "string", format: "date-time" },
  },
};
const uuid = { type: "string", format: "uuid" } as const;
const projectCommandOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "address",
    "latitude",
    "longitude",
    "contractNumber",
    "approvedBudget",
    "plannedStartDate",
    "plannedEndDate",
    "clientId",
    "managerEmploymentId",
    "technicalResponsibilityEmploymentIds",
    "weeklySchedule",
    "breakTemplates",
    "initialEmployeeAllocations",
    "initialMachineAllocations",
    "projectFuelAgreements",
  ],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    address: { type: "string", minLength: 1, maxLength: 500 },
    latitude: { type: "string", nullable: true },
    longitude: { type: "string", nullable: true },
    contractNumber: { type: "string", nullable: true, maxLength: 120 },
    approvedBudget: { type: "string" },
    plannedStartDate: { type: "string", format: "date" },
    plannedEndDate: { type: "string", format: "date" },
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
          "confirmedJobRolePeriodId",
          "expectedDailyWorkloadMinutes",
          "compensationMode",
          "compensationValue",
          "overtimeRate",
        ],
        properties: {
          employmentId: uuid,
          confirmedJobRolePeriodId: uuid,
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
        required: ["machineId", "startMeterReadingId"],
        properties: { machineId: uuid, startMeterReadingId: uuid },
      },
    },
    projectFuelAgreements: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["fuelSupplierId", "fuelTypes"],
        properties: {
          fuelSupplierId: uuid,
          fuelTypes: {
            type: "array",
            minItems: 1,
            maxItems: 2,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["fuelTypeId", "pricePerLiter"],
              properties: {
                fuelTypeId: { enum: ["diesel-s10", "diesel-s500"] },
                pricePerLiter: { type: "string" },
              },
            },
          },
        },
      },
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
          200: successSchema({
            type: "object",
            required: [
              "id",
              "name",
              "address",
              "contractNumber",
              "status",
              "createdAt",
            ],
            properties: {
              id: { type: "string", format: "uuid" },
              name: { type: "string" },
              address: { type: "string" },
              contractNumber: { type: "string", nullable: true },
              status: { const: "planned" },
              createdAt: { type: "string", format: "date-time" },
            },
          }),
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
}
