import fastifyJwt from "@fastify/jwt";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { z } from "zod";

import type { AccessClaims } from "../../modules/auth/auth-policy";
import { findValidSessionHandler } from "../../modules/auth/handlers/login.handler";
import { env } from "../config/env";
import { jsonResponse } from "../utils/jsonResponse";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AccessClaims;
    user: AccessClaims;
  }
}

declare module "fastify" {
  interface FastifyRequest {
    authContext?: AccessClaims;
  }
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
    requireCompanyScope(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<void>;
  }
}

function rejectSession(reply: FastifyReply) {
  return jsonResponse.error({
    reply,
    statusCode: 401,
    code: "SESSION_INVALID",
    message: "Invalid or expired session",
  });
}

const accessClaimsSchema = z.object({
  userId: z.string().uuid(),
  corporationId: z.string().uuid(),
  sessionId: z.string().uuid(),
  role: z.literal("MASTER_ADMIN"),
  companyId: z.string().uuid().optional(),
});

export const authPlugin = fp(async function authPlugin(app: FastifyInstance) {
  await app.register(fastifyJwt, { secret: env.JWT_SECRET_KEY });

  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
        const claims = accessClaimsSchema.parse(request.user);
        const session = await findValidSessionHandler(app.handlerContext, {
          sessionId: claims.sessionId,
          now: new Date(),
        });
        if (
          !session ||
          session.userId !== claims.userId ||
          session.corporationId !== claims.corporationId ||
          session.companyId !== (claims.companyId ?? null) ||
          session.user.role !== claims.role
        ) {
          rejectSession(reply);
          return;
        }
        request.authContext = claims;
      } catch {
        rejectSession(reply);
      }
    },
  );

  app.decorate(
    "requireCompanyScope",
    async (request: FastifyRequest, reply: FastifyReply) => {
      await app.authenticate(request, reply);
      if (reply.sent) return;
      if (!request.authContext?.companyId) {
        jsonResponse.error({
          reply,
          statusCode: 403,
          code: "COMPANY_CONTEXT_REQUIRED",
          message: "Company context required",
        });
      }
    },
  );
});
