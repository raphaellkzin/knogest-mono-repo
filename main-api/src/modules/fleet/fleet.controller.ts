import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { AppError } from "../../lib/utils/appError";
import { jsonResponse } from "../../lib/utils/jsonResponse";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../lib/utils/zodResolver";
import {
  appendMachineMeterReadingSchema,
  correctMachineMeterReadingSchema,
  createMachineSchema,
  listMachinesQuerySchema,
  machineParamsSchema,
  machineReadingParamsSchema,
  allocateMachineSchema,
} from "./fleet.dto";
import { FleetService } from "./fleet.service";

const decimalStringOpenApiPattern = "^(?:0|[1-9]\\d{0,11})(?:\\.[0-9]{1,2})?$";
const identifierOpenApiPattern = ".*[A-Za-z0-9].*";

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

const identifierSchema = {
  type: "object",
  required: ["value", "normalizedValue"],
  properties: {
    value: { type: "string" },
    normalizedValue: { type: "string" },
  },
  additionalProperties: false,
} as const;

const machineSchema = {
  type: "object",
  required: [
    "id",
    "name",
    "description",
    "type",
    "manufacturer",
    "model",
    "meterType",
    "identifiers",
    "latestMeterReading",
    "availability",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: { type: "string", format: "uuid" },
    name: { type: "string" },
    description: { type: "string", nullable: true },
    type: { type: "string", enum: ["YELLOW_LINE", "WHITE_LINE"] },
    manufacturer: { type: "string" },
    model: { type: "string" },
    meterType: { type: "string", enum: ["HOUR_METER", "ODOMETER"] },
    identifiers: {
      type: "object",
      required: ["plate", "companyTag"],
      properties: {
        plate: { ...identifierSchema, nullable: true },
        companyTag: { ...identifierSchema, nullable: true },
      },
      additionalProperties: false,
    },
    latestMeterReading: {
      type: "object",
      nullable: true,
      required: ["id", "value", "purpose", "recordedAt"],
      properties: {
        id: { type: "string", format: "uuid" },
        value: { type: "string" },
        purpose: {
          type: "string",
          enum: ["INITIAL", "OWNERSHIP_TRANSFER", "ORDINARY"],
        },
        recordedAt: { type: "string", format: "date-time" },
      },
      additionalProperties: false,
    },
    availability: {
      type: "object",
      required: ["state", "hasOpenAllocation"],
      properties: {
        state: { type: "string", enum: ["available", "unavailable"] },
        hasOpenAllocation: { type: "boolean" },
      },
      additionalProperties: false,
    },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
  additionalProperties: false,
} as const;

const machineDetailSchema = {
  ...machineSchema,
  required: [...machineSchema.required, "ownership"],
  properties: {
    ...machineSchema.properties,
    ownership: {
      type: "object",
      nullable: true,
      required: ["companyId", "effectiveFrom", "effectiveTo"],
      properties: {
        companyId: { type: "string", format: "uuid" },
        effectiveFrom: { type: "string", format: "date-time" },
        effectiveTo: { type: "string", format: "date-time", nullable: true },
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
    data: machineDetailSchema,
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
        data: { type: "array", items: machineSchema },
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

const createMachineBodySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name",
    "type",
    "manufacturer",
    "model",
    "meterType",
    "initialMeterReading",
  ],
  anyOf: [{ required: ["plate"] }, { required: ["companyTag"] }],
  properties: {
    name: { type: "string", minLength: 1, maxLength: 160 },
    description: { type: "string", maxLength: 500 },
    type: { type: "string", enum: ["YELLOW_LINE", "WHITE_LINE"] },
    manufacturer: { type: "string", minLength: 1, maxLength: 120 },
    model: { type: "string", minLength: 1, maxLength: 120 },
    meterType: { type: "string", enum: ["HOUR_METER", "ODOMETER"] },
    plate: { type: "string", maxLength: 80, pattern: identifierOpenApiPattern },
    companyTag: {
      type: "string",
      maxLength: 80,
      pattern: identifierOpenApiPattern,
    },
    initialMeterReading: {
      type: "string",
      pattern: decimalStringOpenApiPattern,
    },
  },
} as const;

const listMachinesOpenApiQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
    cursor: { type: "string", minLength: 1, maxLength: 2048 },
    search: { type: "string", maxLength: 120 },
    type: { type: "string", enum: ["YELLOW_LINE", "WHITE_LINE"] },
    availability: { type: "string", enum: ["available"] },
    sortBy: {
      type: "string",
      enum: ["name", "createdAt"],
      default: "createdAt",
    },
    sortDirection: { type: "string", enum: ["asc", "desc"], default: "desc" },
  },
} as const;

const machineParamsOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["machineId"],
  properties: { machineId: { type: "string", format: "uuid" } },
} as const;

const readingParamsOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: ["machineId", "readingId"],
  properties: {
    machineId: { type: "string", format: "uuid" },
    readingId: { type: "string", format: "uuid" },
  },
} as const;

const appendReadingBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["value"],
  properties: {
    value: { type: "string", pattern: decimalStringOpenApiPattern },
  },
} as const;

const correctReadingBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["value", "reason"],
  properties: {
    value: { type: "string", pattern: decimalStringOpenApiPattern },
    reason: { type: "string", minLength: 1, maxLength: 500 },
  },
} as const;

function scopeFromRequest(request: {
  authContext?: { corporationId: string; companyId?: string; userId?: string };
}) {
  const corporationId = request.authContext?.corporationId;
  const companyId = request.authContext?.companyId;
  const actorUserId = request.authContext?.userId;
  if (!corporationId || !companyId || !actorUserId) {
    throw new AppError({
      code: "COMPANY_CONTEXT_REQUIRED",
      message: "Company context required",
      statusCode: 403,
    });
  }
  return { corporationId, companyId, actorUserId };
}

export const v1FleetController = async (app: FastifyInstance) => {
  const fleetService = new FleetService(app.handlerContext);

  app.post(
    "/machines",
    {
      preHandler: [app.requireCompanyScope, validateBody(createMachineSchema)],
      schema: {
        tags: ["Fleet"],
        summary: "Create a Machine in the selected Company",
        security: [{ bearerAuth: [] }],
        body: createMachineBodySchema,
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
      const data = await fleetService.create(
        scopeFromRequest(request),
        request.body as z.infer<typeof createMachineSchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.get(
    "/machines",
    {
      preHandler: [
        app.requireCompanyScope,
        validateQuery(listMachinesQuerySchema),
      ],
      schema: {
        tags: ["Fleet"],
        summary: "List Machines in the selected Company",
        security: [{ bearerAuth: [] }],
        querystring: listMachinesOpenApiQuerySchema,
        response: {
          200: listResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const data = await fleetService.list(
        scopeFromRequest(request),
        request.query as z.infer<typeof listMachinesQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/machines/:machineId/allocations",
    {
      preHandler: [app.requireCompanyScope, validateParams(machineParamsSchema), validateBody(allocateMachineSchema)],
      schema: {
        tags: ["Fleet"], summary: "Allocate a Machine to an eligible Project", security: [{ bearerAuth: [] }],
        params: machineParamsOpenApiSchema,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["projectId", "operatorEmploymentId"],
          properties: {
            projectId: { type: "string", format: "uuid" },
            operatorEmploymentId: { type: "string", format: "uuid" },
          },
        },
        response: {
          200: { type: "object", additionalProperties: false, required: ["success", "message", "data"], properties: { success: { type: "boolean", const: true }, message: { type: "string" }, data: { type: "object", additionalProperties: false, required: ["id", "projectId", "machineId", "startMeterReadingId", "operatorEmploymentId", "effectiveFrom"], properties: { id: { type: "string", format: "uuid" }, projectId: { type: "string", format: "uuid" }, machineId: { type: "string", format: "uuid" }, startMeterReadingId: { type: "string", format: "uuid" }, operatorEmploymentId: { type: "string", format: "uuid" }, effectiveFrom: { type: "string", format: "date-time" } } } } },
          400: errorSchema, 401: errorSchema, 403: errorSchema, 404: errorSchema, 409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { machineId } = request.params as z.infer<typeof machineParamsSchema>;
      const data = await fleetService.allocate(scopeFromRequest(request), machineId, request.body as z.infer<typeof allocateMachineSchema>);
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/machines/:machineId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(machineParamsSchema),
      ],
      schema: {
        tags: ["Fleet"],
        summary: "Get a Machine detail in the selected Company",
        security: [{ bearerAuth: [] }],
        params: machineParamsOpenApiSchema,
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
      const { machineId } = request.params as z.infer<
        typeof machineParamsSchema
      >;
      const data = await fleetService.detail(
        scopeFromRequest(request),
        machineId,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/machines/:machineId/meter-readings",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(machineParamsSchema),
        validateBody(appendMachineMeterReadingSchema),
      ],
      schema: {
        tags: ["Fleet"],
        summary: "Append a confirmed Machine Meter Reading",
        security: [{ bearerAuth: [] }],
        params: machineParamsOpenApiSchema,
        body: appendReadingBodySchema,
        response: {
          200: detailResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { machineId } = request.params as z.infer<
        typeof machineParamsSchema
      >;
      const data = await fleetService.appendReading(
        scopeFromRequest(request),
        machineId,
        request.body as z.infer<typeof appendMachineMeterReadingSchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/machines/:machineId/meter-readings/:readingId/correction",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(machineReadingParamsSchema),
        validateBody(correctMachineMeterReadingSchema),
      ],
      schema: {
        tags: ["Fleet"],
        summary: "Correct an eligible Machine Meter Reading",
        security: [{ bearerAuth: [] }],
        params: readingParamsOpenApiSchema,
        body: correctReadingBodySchema,
        response: {
          200: detailResponseSchema,
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
          404: errorSchema,
          409: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { machineId, readingId } = request.params as z.infer<
        typeof machineReadingParamsSchema
      >;
      const data = await fleetService.correctReading(
        scopeFromRequest(request),
        machineId,
        readingId,
        request.body as z.infer<typeof correctMachineMeterReadingSchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );
};
