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

  app.setErrorHandler((error: unknown, _request, reply) => {
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
      return jsonResponse.fromError({ reply, error });
    }

    app.log.error(
      {
        requestId: reply.request.id,
        errorType: error instanceof Error ? error.name : "UnknownError",
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
