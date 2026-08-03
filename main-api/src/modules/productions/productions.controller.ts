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
  dailyReportProductionConfirmSchema,
  productionCommandSchema,
  productionListQuerySchema,
  productionOptionsQuerySchema,
  productionParamsSchema,
  productionReopenSchema,
  productionTransitionSchema,
  productionTripDeleteQuerySchema,
  productionTripSchema,
} from "./productions.dto";
import { ProductionsService } from "./productions.service";

const uuid = { type: "string", format: "uuid" } as const;
const nullableString = { type: "string", nullable: true } as const;
const decimal = {
  type: "string",
  pattern: "^(?:0|[1-9]\\d{0,11})(?:\\.\\d{1,6})?$",
} as const;
const nullableDecimal = { ...decimal, nullable: true } as const;
const shift = { type: "string", enum: ["day", "night"] } as const;
const productionStatus = {
  type: "string",
  enum: ["draft", "approved"],
} as const;
const equipmentRole = {
  type: "string",
  enum: [
    "excavation",
    "loading",
    "transport",
    "spreading",
    "grading",
    "compaction",
    "watering",
    "support",
  ],
} as const;

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

const projectParams = {
  type: "object",
  additionalProperties: false,
  required: ["projectId"],
  properties: { projectId: uuid },
} as const;
const productionParams = {
  type: "object",
  additionalProperties: false,
  required: ["projectId", "productionId"],
  properties: { projectId: uuid, productionId: uuid },
} as const;
const tripParams = {
  type: "object",
  additionalProperties: false,
  required: ["projectId", "productionId", "tripId"],
  properties: { projectId: uuid, productionId: uuid, tripId: uuid },
} as const;
const reportParams = {
  type: "object",
  additionalProperties: false,
  required: ["projectId", "reportId"],
  properties: { projectId: uuid, reportId: uuid },
} as const;

const stopCommandSchema = {
  type: "object",
  additionalProperties: false,
  required: ["durationMinutes", "reason"],
  properties: {
    durationMinutes: { type: "integer", minimum: 1, maximum: 1440 },
    reason: { type: "string", minLength: 1, maxLength: 160 },
    notes: { type: "string", nullable: true, maxLength: 500 },
  },
} as const;
const equipmentCommandSchema = {
  type: "object",
  additionalProperties: false,
  required: ["machineId", "role"],
  properties: {
    machineId: uuid,
    role: equipmentRole,
    operatorEmploymentId: { ...uuid, nullable: true },
    initialMeterValue: nullableDecimal,
    finalMeterValue: nullableDecimal,
    workedMinutes: {
      type: "integer",
      nullable: true,
      minimum: 0,
      maximum: 1440,
    },
    defaultTripCapacityM3: nullableDecimal,
    stops: { type: "array", maxItems: 20, items: stopCommandSchema },
  },
} as const;
const evidenceSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "name", "url"],
  properties: {
    kind: { type: "string", enum: ["photo", "ticket", "attachment"] },
    name: { type: "string", minLength: 1, maxLength: 160 },
    url: { type: "string", format: "uri", maxLength: 2_000 },
    notes: { type: "string", nullable: true, maxLength: 500 },
  },
} as const;

const productionCommandOpenApiSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "workFrontId",
    "workFrontServiceId",
    "productionDate",
    "shift",
    "entryMode",
  ],
  properties: {
    expectedRevision: { type: "integer", minimum: 1 },
    approveNow: { type: "boolean", default: false },
    workFrontId: uuid,
    workFrontServiceId: uuid,
    productionDate: { type: "string", format: "date" },
    shift,
    entryMode: { type: "string", enum: ["direct_total", "trips"] },
    startTime: {
      type: "string",
      nullable: true,
      pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
    },
    endTime: {
      type: "string",
      nullable: true,
      pattern: "^(?:[01]\\d|2[0-3]):[0-5]\\d$",
    },
    endDayOffset: { type: "integer", minimum: 0, maximum: 1, default: 0 },
    responsibleEmploymentId: { ...uuid, nullable: true },
    location: { type: "string", nullable: true, maxLength: 240 },
    startStation: { type: "string", nullable: true, maxLength: 80 },
    endStation: { type: "string", nullable: true, maxLength: 80 },
    layer: { type: "string", nullable: true, maxLength: 80 },
    elevation: { type: "string", nullable: true, maxLength: 80 },
    materialName: { type: "string", nullable: true, maxLength: 160 },
    materialCategory: { type: "string", nullable: true, maxLength: 120 },
    volumeCondition: {
      type: "string",
      nullable: true,
      enum: ["cut", "loose", "compacted"],
    },
    directQuantity: nullableDecimal,
    measuredQuantity: nullableDecimal,
    conversionFactor: nullableDecimal,
    origin: { type: "string", nullable: true, maxLength: 240 },
    destination: { type: "string", nullable: true, maxLength: 240 },
    dmtKm: nullableDecimal,
    layerThicknessCm: nullableDecimal,
    compactionPasses: {
      type: "integer",
      nullable: true,
      minimum: 0,
      maximum: 100,
    },
    moistureCondition: {
      type: "string",
      nullable: true,
      maxLength: 120,
    },
    evidence: { type: "array", maxItems: 20, items: evidenceSchema },
    notes: { type: "string", nullable: true, maxLength: 10_000 },
    equipment: {
      type: "array",
      maxItems: 100,
      items: equipmentCommandSchema,
    },
  },
} as const;

const metricsSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "operationalVolumeM3",
    "officialQuantity",
    "difference",
    "differencePercent",
    "tripCount",
    "tripsPerHour",
    "quantityPerHour",
    "dmtKm",
    "transportMomentM3Km",
    "workedMinutes",
    "stoppedMinutes",
  ],
  properties: {
    operationalVolumeM3: decimal,
    officialQuantity: decimal,
    difference: nullableString,
    differencePercent: nullableString,
    tripCount: { type: "integer" },
    tripsPerHour: nullableString,
    quantityPerHour: nullableString,
    dmtKm: nullableString,
    transportMomentM3Km: nullableString,
    workedMinutes: { type: "integer" },
    stoppedMinutes: { type: "integer" },
  },
} as const;

const summarySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "serviceCode",
    "unitCode",
    "productionDate",
    "shift",
    "status",
    "revision",
    "location",
    "route",
    "dmtKm",
    "volumeCondition",
    "officialQuantity",
    "operationalVolumeM3",
    "tripCount",
    "equipmentCount",
    "needsApproval",
    "rdo",
    "updatedAt",
  ],
  properties: {
    id: uuid,
    serviceCode: { type: "string" },
    unitCode: { type: "string" },
    productionDate: { type: "string", format: "date" },
    shift,
    status: productionStatus,
    revision: { type: "integer" },
    location: nullableString,
    route: {
      type: "object",
      nullable: true,
      required: ["origin", "destination"],
      properties: { origin: nullableString, destination: nullableString },
    },
    dmtKm: nullableString,
    volumeCondition: nullableString,
    officialQuantity: decimal,
    operationalVolumeM3: decimal,
    tripCount: { type: "integer" },
    equipmentCount: { type: "integer" },
    needsApproval: { type: "boolean" },
    rdo: {
      type: "object",
      required: ["linked", "stale"],
      properties: {
        linked: { type: "boolean" },
        stale: { type: "boolean" },
      },
    },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

const productionDetailSchema = {
  type: "object",
  additionalProperties: true,
  required: [
    "id",
    "projectId",
    "workFrontId",
    "workFrontServiceId",
    "serviceCode",
    "unitCode",
    "productionProfile",
    "dmtPolicy",
    "productionDate",
    "shift",
    "status",
    "entryMode",
    "revision",
    "metrics",
    "equipment",
    "trips",
    "approval",
    "rdo",
    "createdAt",
    "updatedAt",
  ],
  properties: {
    id: uuid,
    projectId: uuid,
    workFrontId: uuid,
    workFrontServiceId: uuid,
    serviceCode: { type: "string" },
    unitCode: { type: "string" },
    productionProfile: { type: "string" },
    dmtPolicy: { type: "string" },
    productionDate: { type: "string", format: "date" },
    shift,
    status: productionStatus,
    entryMode: { type: "string", enum: ["direct_total", "trips"] },
    revision: { type: "integer" },
    evidence: { type: "array", items: evidenceSchema },
    metrics: metricsSchema,
    equipment: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    trips: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    approval: { type: "object", additionalProperties: true },
    rdo: { type: "object", additionalProperties: true },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: "string", format: "date-time" },
  },
} as const;

const capabilitiesSchema = {
  type: "object",
  additionalProperties: false,
  required: ["createDraft", "publishDirect", "approveOthers", "reopen"],
  properties: {
    createDraft: { type: "boolean" },
    publishDirect: { type: "boolean" },
    approveOthers: { type: "boolean" },
    reopen: { type: "boolean" },
  },
} as const;

const commonErrors = {
  400: errorSchema,
  401: errorSchema,
  403: errorSchema,
  404: errorSchema,
  409: errorSchema,
  422: errorSchema,
} as const;

function scopeFromRequest(request: {
  authContext?: {
    corporationId: string;
    companyId?: string;
    userId?: string;
    role: "MASTER_ADMIN";
  };
}) {
  const corporationId = request.authContext?.corporationId;
  const companyId = request.authContext?.companyId;
  const actorUserId = request.authContext?.userId;
  const role = request.authContext?.role;
  if (!corporationId || !companyId || !actorUserId || !role)
    throw new AppError({
      code: "COMPANY_CONTEXT_REQUIRED",
      message: "Company context required",
      statusCode: 403,
    });
  return { corporationId, companyId, actorUserId, role };
}

export const v1ProductionsController = async (app: FastifyInstance) => {
  const service = new ProductionsService(app.handlerContext);

  app.get(
    "/projects/:projectId/productions",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
        validateQuery(productionListQuerySchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "List earthworks productions",
        security: [{ bearerAuth: [] }],
        params: projectParams,
        querystring: {
          type: "object",
          additionalProperties: false,
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 100, default: 25 },
            cursor: { type: "string" },
            productionDate: { type: "string", format: "date" },
            shift,
            status: productionStatus,
            workFrontId: uuid,
            sortBy: {
              type: "string",
              enum: ["productionDate"],
              default: "productionDate",
            },
            sortDirection: {
              type: "string",
              enum: ["asc", "desc"],
              default: "desc",
            },
          },
        },
        response: {
          200: successSchema({
            type: "object",
            required: ["data", "pageInfo", "capabilities"],
            properties: {
              data: { type: "array", items: summarySchema },
              pageInfo: {
                type: "object",
                required: ["hasNextPage", "nextCursor"],
                properties: {
                  hasNextPage: { type: "boolean" },
                  nextCursor: { type: "string", nullable: true },
                },
              },
              capabilities: capabilitiesSchema,
            },
          }),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const data = await service.list(
        scopeFromRequest(request),
        projectId,
        request.query as z.infer<typeof productionListQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/projects/:projectId/productions/options",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
        validateQuery(productionOptionsQuerySchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "Resolve production options for a shift",
        security: [{ bearerAuth: [] }],
        params: projectParams,
        querystring: {
          type: "object",
          additionalProperties: false,
          required: ["productionDate", "shift"],
          properties: {
            productionDate: { type: "string", format: "date" },
            shift,
          },
        },
        response: {
          200: successSchema({ type: "object", additionalProperties: true }),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const data = await service.options(
        scopeFromRequest(request),
        projectId,
        request.query as z.infer<typeof productionOptionsQuerySchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/projects/:projectId/productions/:productionId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "Get an earthworks production",
        security: [{ bearerAuth: [] }],
        params: productionParams,
        response: {
          200: successSchema(productionDetailSchema),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId, productionId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const data = await service.detail(
        scopeFromRequest(request),
        projectId,
        productionId!,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/projects/:projectId/productions",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
        validateBody(productionCommandSchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "Create a production draft or publish directly",
        security: [{ bearerAuth: [] }],
        params: projectParams,
        body: productionCommandOpenApiSchema,
        response: {
          201: successSchema(productionDetailSchema),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const data = await service.create(
        scopeFromRequest(request),
        projectId,
        request.body as z.infer<typeof productionCommandSchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.put(
    "/projects/:projectId/productions/:productionId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
        validateBody(productionCommandSchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "Replace a production draft with optimistic revision control",
        security: [{ bearerAuth: [] }],
        params: productionParams,
        body: productionCommandOpenApiSchema,
        response: {
          200: successSchema(productionDetailSchema),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId, productionId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const data = await service.update(
        scopeFromRequest(request),
        projectId,
        productionId!,
        request.body as z.infer<typeof productionCommandSchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/projects/:projectId/productions/:productionId/approve",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
        validateBody(productionTransitionSchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "Approve a production draft",
        security: [{ bearerAuth: [] }],
        params: productionParams,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["expectedRevision"],
          properties: { expectedRevision: { type: "integer", minimum: 1 } },
        },
        response: {
          200: successSchema(productionDetailSchema),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId, productionId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const data = await service.approve(
        scopeFromRequest(request),
        projectId,
        productionId!,
        request.body as z.infer<typeof productionTransitionSchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/projects/:projectId/productions/:productionId/reopen",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
        validateBody(productionReopenSchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "Reopen an approved production with an audit reason",
        security: [{ bearerAuth: [] }],
        params: productionParams,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["expectedRevision", "reason"],
          properties: {
            expectedRevision: { type: "integer", minimum: 1 },
            reason: { type: "string", minLength: 3, maxLength: 500 },
          },
        },
        response: {
          200: successSchema(productionDetailSchema),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId, productionId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const data = await service.reopen(
        scopeFromRequest(request),
        projectId,
        productionId!,
        request.body as z.infer<typeof productionReopenSchema>,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/projects/:projectId/productions/:productionId/trips",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
        validateBody(productionTripSchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "Quick-add an idempotent truck trip",
        security: [{ bearerAuth: [] }],
        params: productionParams,
        body: {
          type: "object",
          additionalProperties: false,
          required: [
            "expectedRevision",
            "idempotencyKey",
            "productionEquipmentId",
          ],
          properties: {
            expectedRevision: { type: "integer", minimum: 1 },
            idempotencyKey: uuid,
            productionEquipmentId: uuid,
            recordedAt: { type: "string", format: "date-time" },
            capacityM3: decimal,
            adjustedVolumeM3: nullableDecimal,
            ticketNumber: { type: "string", nullable: true, maxLength: 80 },
            notes: { type: "string", nullable: true, maxLength: 500 },
          },
        },
        response: {
          201: successSchema(productionDetailSchema),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId, productionId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const data = await service.addTrip(
        scopeFromRequest(request),
        projectId,
        productionId!,
        request.body as z.infer<typeof productionTripSchema>,
      );
      return jsonResponse.success({ reply, data, statusCode: 201 });
    },
  );

  app.delete(
    "/projects/:projectId/productions/:productionId/trips/:tripId",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
        validateQuery(productionTripDeleteQuerySchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "Remove a trip from a production draft",
        security: [{ bearerAuth: [] }],
        params: tripParams,
        querystring: {
          type: "object",
          additionalProperties: false,
          required: ["expectedRevision"],
          properties: { expectedRevision: { type: "integer", minimum: 1 } },
        },
        response: {
          200: successSchema(productionDetailSchema),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId, productionId, tripId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const { expectedRevision } = request.query as z.infer<
        typeof productionTripDeleteQuerySchema
      >;
      const data = await service.removeTrip(
        scopeFromRequest(request),
        projectId,
        productionId!,
        tripId!,
        expectedRevision,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.get(
    "/projects/:projectId/daily-reports/:reportId/productions",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "Get the production summary for a daily report",
        security: [{ bearerAuth: [] }],
        params: reportParams,
        response: {
          200: successSchema({ type: "object", additionalProperties: true }),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId, reportId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const data = await service.dailyReportSummary(
        scopeFromRequest(request),
        projectId,
        reportId!,
      );
      return jsonResponse.success({ reply, data });
    },
  );

  app.post(
    "/projects/:projectId/daily-reports/:reportId/productions/confirm",
    {
      preHandler: [
        app.requireCompanyScope,
        validateParams(productionParamsSchema),
        validateBody(dailyReportProductionConfirmSchema),
      ],
      schema: {
        tags: ["Project productions"],
        summary: "Confirm approved production revisions in a daily report",
        security: [{ bearerAuth: [] }],
        params: reportParams,
        body: {
          type: "object",
          additionalProperties: false,
          required: ["productionIds"],
          properties: {
            productionIds: { type: "array", maxItems: 200, items: uuid },
          },
        },
        response: {
          200: successSchema({ type: "object", additionalProperties: true }),
          ...commonErrors,
        },
      },
    },
    async (request, reply) => {
      const { projectId, reportId } = request.params as z.infer<
        typeof productionParamsSchema
      >;
      const { productionIds } = request.body as z.infer<
        typeof dailyReportProductionConfirmSchema
      >;
      const data = await service.confirmDailyReport(
        scopeFromRequest(request),
        projectId,
        reportId!,
        productionIds,
      );
      return jsonResponse.success({ reply, data });
    },
  );
};
