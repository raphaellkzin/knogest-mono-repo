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
        details: z.flattenError(result.error).fieldErrors,
        code: "VALIDATION_ERROR",
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
      jsonResponse.error({
        reply,
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Validation error",
        details: result.error.flatten().fieldErrors,
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
      jsonResponse.error({
        reply,
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Validation error",
        details: result.error.flatten().fieldErrors,
      });
      return;
    }
    request.query = result.data as z.infer<T>;
  };
}
