import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import fastify, { FastifyServerOptions } from "fastify";
import { v1Routes } from "./routes/v1-routes";
import { prismaPlugin } from "./lib/plugins/prisma.plugin";
import { authPlugin } from "./lib/plugins/auth.plugin";
import { env } from "./lib/config/env";
import { jsonResponse } from "./lib/utils/jsonResponse";

export const buildApp = async (options: FastifyServerOptions = {}) => {
  const app = fastify({
    ...options,
    logger: options.logger ?? env.NODE_ENV !== "test",
  });

  app.setErrorHandler((error: unknown, _request, reply) => {
    if (typeof error === "object" && error !== null && "validation" in error) {
      return jsonResponse.error({
        reply,
        data: error.validation,
        statusCode: 400,
        message: "Validation error",
      });
    }

    if (error instanceof Error) {
      app.log.error(error);
    } else {
      app.log.error({ error }, "Unhandled request error");
    }

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
