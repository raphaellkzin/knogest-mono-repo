import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastifyRateLimit from "@fastify/rate-limit";
import { randomUUID } from "node:crypto";
import fastify, { FastifyServerOptions } from "fastify";
import { v1Routes } from "./routes/v1-routes";
import { prismaPlugin } from "./lib/plugins/prisma.plugin";
import { authPlugin } from "./lib/plugins/auth.plugin";
import { env } from "./lib/config/env";
import { jsonResponse } from "./lib/utils/jsonResponse";
import { isAppError } from "./lib/utils/appError";
import { getAuthAuditContext } from "./modules/auth/auth-audit-context";

const invalidRequestBodyErrorCodes = new Set([
  "FST_ERR_CTP_EMPTY_JSON_BODY",
  "FST_ERR_CTP_INVALID_CONTENT_LENGTH",
  "FST_ERR_CTP_INVALID_JSON_BODY",
]);

function safeErrorLogContext(error: unknown) {
  const record =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : null;
  const stackFrames =
    error instanceof Error && error.stack
      ? error.stack.split("\n").slice(1).join("\n")
      : undefined;

  return {
    errorType: error instanceof Error ? error.name : "UnknownError",
    ...(typeof record?.code === "string" ? { errorCode: record.code } : {}),
    ...(typeof record?.statusCode === "number"
      ? { statusCode: record.statusCode }
      : {}),
    ...(stackFrames ? { stackFrames } : {}),
  };
}

export const buildApp = async (options: FastifyServerOptions = {}) => {
  const { logger: configuredLogger, ...restOptions } = options;
  const app = fastify({
    ...restOptions,
    disableRequestLogging: options.disableRequestLogging ?? true,
    ...(options.loggerInstance
      ? {}
      : { logger: configuredLogger ?? env.NODE_ENV !== "test" }),
    trustProxy:
      options.trustProxy ??
      env.TRUST_PROXY.split(",").map((value) => value.trim()),
    genReqId:
      options.genReqId ??
      ((request) => {
        const incoming = request.headers["x-request-id"];
        return typeof incoming === "string" && /^[0-9a-f-]{36}$/i.test(incoming)
          ? incoming
          : randomUUID();
      }),
    ajv: options.ajv ?? { customOptions: { removeAdditional: false } },
  });

  app.setErrorHandler((error: unknown, request, reply) => {
    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined;

    if (errorCode === "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
      request.log.warn(
        {
          requestId: request.id,
          ...safeErrorLogContext(error),
        },
        "Request format rejected",
      );
      return jsonResponse.error({
        reply,
        statusCode: 415,
        code: "BAD_REQUEST",
        message: "Unsupported media type",
      });
    }

    if (errorCode && invalidRequestBodyErrorCodes.has(errorCode)) {
      request.log.warn(
        {
          requestId: request.id,
          ...safeErrorLogContext(error),
        },
        "Request body rejected",
      );
      return jsonResponse.error({
        reply,
        statusCode: 400,
        code: "BAD_REQUEST",
        message: "Invalid request body",
      });
    }

    if (errorCode === "FST_ERR_CTP_BODY_TOO_LARGE") {
      return jsonResponse.error({
        reply,
        statusCode: 413,
        code: "PROJECT_WIZARD_BODY_TOO_LARGE",
        message: "Project command body is too large",
      });
    }
    if (typeof error === "object" && error !== null && "validation" in error) {
      return jsonResponse.error({
        reply,
        details: error.validation,
        code: "VALIDATION_ERROR",
        statusCode: 400,
        message: "Validation error",
      });
    }

    if (
      typeof error === "object" &&
      error !== null &&
      (("statusCode" in error && error.statusCode === 429) ||
        ("code" in error && error.code === "RATE_LIMITED"))
    ) {
      return jsonResponse.error({
        reply,
        statusCode: 429,
        code: "RATE_LIMITED",
        message: "Too many authentication attempts",
      });
    }

    if (isAppError(error)) {
      const audit = getAuthAuditContext(error);
      if (audit) {
        request.log.warn(
          {
            ...audit,
            requestId: request.id,
            outcome: "rejected",
            statusCode: error.statusCode,
          },
          "Authentication session request rejected",
        );
      }
      return jsonResponse.fromError({ reply, error });
    }

    request.log.error(
      {
        requestId: request.id,
        ...safeErrorLogContext(error),
      },
      "Unhandled request error",
    );

    return jsonResponse.fromError({ reply, error });
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: "API Doc",
        description: "Documentacao da API",
        version: "1.0.0",
      },
      servers: [
        {
          url: `http://${env.HOST}:${env.PORT}`,
          description: "Servidor local",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
    },
  });

  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(fastifyRateLimit, {
    global: false,
    errorResponseBuilder: (request) => ({
      success: false,
      code: "RATE_LIMITED",
      message: "Too many authentication attempts",
      details: null,
      requestId: request.id,
    }),
  });

  await app.register(
    async (instance) => {
      await instance.register(v1Routes, { prefix: "/v1" });
    },
    { prefix: "/api" },
  );

  await app.register(fastifySwaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "full",
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  });

  return app;
};
