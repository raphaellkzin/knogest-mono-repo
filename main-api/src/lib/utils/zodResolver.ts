import { z } from "zod";
import { FastifyReply, FastifyRequest } from "fastify";
import { jsonResponse } from "./jsonResponse";

/**
 * Valida o corpo da requisição usando um schema Zod.
 * Se falhar, envia resposta 400 automaticamente.
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      jsonResponse.error({
        reply,
        data: z.flattenError(result.error).fieldErrors,
        message: "Validation error",
        statusCode: 400,
      });
      return;
    }
    // Substitui body por versão validada/tipada
    request.body = result.data as z.infer<T>;
  };
}

/**
 * (Opcional) valida params
 */
export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.params);
    if (!result.success) {
      reply.code(400).send({
        success: false,
        message: "Validation error",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }
    request.params = result.data as z.infer<T>;
  };
}

/**
 * (Opcional) valida querystring
 */
export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const result = schema.safeParse(request.query);
    if (!result.success) {
      reply.code(400).send({
        success: false,
        message: "Validation error",
        errors: result.error.flatten().fieldErrors,
      });
      return;
    }
    request.query = result.data as z.infer<T>;
  };
}
