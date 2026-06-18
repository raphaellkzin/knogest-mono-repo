import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../config/env";
import { jsonResponse } from "../utils/jsonResponse";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      userId: string;
    };
    user: {
      userId: string;
    };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}
export const authPlugin = fp(async function authPlugin(
  fastify: FastifyInstance,
) {
  fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET_KEY,
  });

  fastify.decorate(
    "authenticate",
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        await request.jwtVerify();
      } catch {
        return jsonResponse.error({
          reply,
          statusCode: 401,
          message: "Token invalido ou ausente.",
        });
      }
    },
  );
});
