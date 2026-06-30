import type { FastifyInstance } from "fastify";

import { env } from "../../lib/config/env";
import { jsonResponse } from "../../lib/utils/jsonResponse";
import { validateBody } from "../../lib/utils/zodResolver";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  createLoginRateLimitKey,
} from "./auth-policy";
import {
  loginRequestSchema,
  selectCompanyRequestSchema,
  type ILoginRequest,
  type ISelectCompanyRequest,
} from "./auth.dto";
import { AuthService } from "./auth.service";
import { assertTrustedOrigin } from "./origin-policy";

const errorSchema = {
  type: "object",
  required: ["success", "code", "message", "requestId"],
  properties: {
    success: { type: "boolean", const: false },
    code: { type: "string" },
    message: { type: "string" },
    details: { type: "object", nullable: true },
    requestId: { type: "string", format: "uuid" },
  },
} as const;

export const v1AuthController = async (app: FastifyInstance) => {
  const authService = new AuthService(app.handlerContext);

  app.post(
    "/login",
    {
      preHandler: [validateBody(loginRequestSchema)],
      onResponse: [
        async (request, reply) => {
          const hostFingerprint = createLoginRateLimitKey(
            request.hostname,
            "",
          ).split(":")[0];
          request.log.info(
            {
              operation: "auth.login",
              requestId: request.id,
              hostFingerprint,
              sourceIp: request.ip,
              outcome: reply.statusCode < 400 ? "success" : "rejected",
              statusCode: reply.statusCode,
              durationMs: reply.elapsedTime,
            },
            "Authentication attempt completed",
          );
        },
      ],
      config: {
        rateLimit: {
          max: env.LOGIN_RATE_LIMIT_MAX,
          timeWindow: env.LOGIN_RATE_LIMIT_WINDOW_MS,
          keyGenerator: (request) =>
            createLoginRateLimitKey(request.hostname, request.ip),
        },
      },
      schema: {
        tags: ["Auth"],
        summary:
          "Authenticate within the Corporation resolved from the trusted host",
        body: {
          type: "object",
          additionalProperties: false,
          required: ["email", "password"],
          properties: {
            email: { type: "string", minLength: 3, maxLength: 300 },
            password: {
              type: "string",
              minLength: 1,
              maxLength: 1024,
              writeOnly: true,
            },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: {
                type: "object",
                required: ["accessToken", "refreshToken", "expiresIn"],
                properties: {
                  accessToken: { type: "string" },
                  refreshToken: { type: "string" },
                  expiresIn: {
                    type: "integer",
                    const: ACCESS_TOKEN_TTL_SECONDS,
                  },
                },
              },
            },
          },
          400: errorSchema,
          401: errorSchema,
          429: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as ILoginRequest;
      const result = await authService.login({
        host: request.hostname,
        email,
        password,
      });
      const accessToken = app.jwt.sign(result.claims, {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      });
      return jsonResponse.success({
        reply,
        data: {
          accessToken,
          refreshToken: result.refreshToken,
          expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        },
      });
    },
  );

  app.post(
    "/refresh",
    {
      preHandler: [
        async (request) => {
          assertTrustedOrigin({
            host: request.hostname,
            origin: request.headers.origin,
            secFetchSite: request.headers["sec-fetch-site"]?.toString(),
          });
        },
      ],
      onResponse: [
        async (request, reply) => {
          request.log.info(
            {
              operation: "session.refresh",
              requestId: request.id,
              outcome: reply.statusCode < 400 ? "success" : "rejected",
              statusCode: reply.statusCode,
              durationMs: reply.elapsedTime,
            },
            "Session refresh completed",
          );
        },
      ],
      schema: {
        tags: ["Auth"],
        summary: "Rotate the current browser refresh credential",
        body: {
          type: "object",
          additionalProperties: false,
          required: ["refreshToken"],
          properties: {
            refreshToken: { type: "string", minLength: 32, writeOnly: true },
          },
        },
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: {
                type: "object",
                required: ["accessToken", "refreshToken", "expiresIn"],
                properties: {
                  accessToken: { type: "string" },
                  refreshToken: { type: "string" },
                  expiresIn: {
                    type: "integer",
                    const: ACCESS_TOKEN_TTL_SECONDS,
                  },
                },
              },
            },
          },
          400: errorSchema,
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { refreshToken } = request.body as { refreshToken: string };
      const result = await authService.refresh({ refreshToken });
      const accessToken = app.jwt.sign(result.claims, {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      });
      return jsonResponse.success({
        reply,
        data: {
          accessToken,
          refreshToken: result.refreshToken,
          expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        },
      });
    },
  );

  app.post(
    "/logout",
    {
      preHandler: [
        async (request) => {
          assertTrustedOrigin({
            host: request.hostname,
            origin: request.headers.origin,
            secFetchSite: request.headers["sec-fetch-site"]?.toString(),
          });
        },
        app.authenticate,
      ],
      onResponse: [
        async (request, reply) => {
          request.log.info(
            {
              operation: "session.logout",
              requestId: request.id,
              sessionId: request.authContext?.sessionId,
              userId: request.authContext?.userId,
              corporationId: request.authContext?.corporationId,
              outcome: reply.statusCode < 400 ? "success" : "rejected",
              statusCode: reply.statusCode,
              durationMs: reply.elapsedTime,
            },
            "Session logout completed",
          );
        },
      ],
      schema: {
        tags: ["Auth"],
        summary: "Revoke the current persisted Session",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: {
                type: "object",
                required: ["revoked"],
                properties: { revoked: { type: "boolean", const: true } },
              },
            },
          },
          401: errorSchema,
          403: errorSchema,
        },
      },
    },
    async (request, reply) => {
      await authService.logout({
        sessionId: request.authContext?.sessionId ?? "",
      });
      return jsonResponse.success({ reply, data: { revoked: true } });
    },
  );

  app.get(
    "/session",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Auth"],
        summary: "Inspect the authenticated persisted Session",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: {
                type: "object",
                required: [
                  "userId",
                  "corporationId",
                  "sessionId",
                  "role",
                  "companyId",
                  "scope",
                  "selectedCompany",
                ],
                properties: {
                  userId: { type: "string", format: "uuid" },
                  corporationId: { type: "string", format: "uuid" },
                  sessionId: { type: "string", format: "uuid" },
                  role: { type: "string", enum: ["MASTER_ADMIN"] },
                  companyId: { type: "string", format: "uuid", nullable: true },
                  scope: {
                    type: "string",
                    enum: ["corporation-scoped", "company-scoped"],
                  },
                  selectedCompany: {
                    type: "object",
                    nullable: true,
                    required: ["id", "name"],
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          401: errorSchema,
        },
      },
    },
    async (request, reply) =>
      jsonResponse.success({
        reply,
        data: {
          userId: request.authContext?.userId,
          corporationId: request.authContext?.corporationId,
          sessionId: request.authContext?.sessionId,
          role: request.authContext?.role,
          companyId: request.authContext?.companyId ?? null,
          scope: request.authContext?.companyId
            ? "company-scoped"
            : "corporation-scoped",
          selectedCompany: null,
        },
      }),
  );

  app.get(
    "/companies",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["Auth"],
        summary: "List active Companies for the authenticated Corporation",
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: {
                type: "object",
                required: ["companies"],
                properties: {
                  companies: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["id", "name"],
                      properties: {
                        id: { type: "string", format: "uuid" },
                        name: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const companies = await authService.listCompanies({
        corporationId: request.authContext?.corporationId ?? "",
      });
      return jsonResponse.success({ reply, data: { companies } });
    },
  );

  app.put(
    "/session/company",
    {
      preHandler: [
        async (request) => {
          assertTrustedOrigin({
            host: request.hostname,
            origin: request.headers.origin,
            secFetchSite: request.headers["sec-fetch-site"]?.toString(),
          });
        },
        app.authenticate,
        validateBody(selectCompanyRequestSchema),
      ],
      schema: {
        tags: ["Auth"],
        summary: "Select or change the active Company for the current Session",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          additionalProperties: false,
          required: ["companyId"],
          properties: { companyId: { type: "string", format: "uuid" } },
        },
        response: {
          200: {
            type: "object",
            required: ["success", "message", "data"],
            properties: {
              success: { type: "boolean", const: true },
              message: { type: "string" },
              data: {
                type: "object",
                required: ["accessToken", "expiresIn", "selectedCompany"],
                properties: {
                  accessToken: { type: "string" },
                  expiresIn: {
                    type: "integer",
                    const: ACCESS_TOKEN_TTL_SECONDS,
                  },
                  selectedCompany: {
                    type: "object",
                    required: ["id", "name"],
                    properties: {
                      id: { type: "string", format: "uuid" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
          },
          400: errorSchema,
          401: errorSchema,
          404: errorSchema,
        },
      },
    },
    async (request, reply) => {
      const { companyId } = request.body as ISelectCompanyRequest;
      const result = await authService.selectCompany({
        corporationId: request.authContext?.corporationId ?? "",
        userId: request.authContext?.userId ?? "",
        sessionId: request.authContext?.sessionId ?? "",
        role: request.authContext?.role ?? "MASTER_ADMIN",
        companyId,
      });
      const accessToken = app.jwt.sign(result.claims, {
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      });
      return jsonResponse.success({
        reply,
        data: {
          accessToken,
          expiresIn: ACCESS_TOKEN_TTL_SECONDS,
          selectedCompany: result.company,
        },
      });
    },
  );
};
