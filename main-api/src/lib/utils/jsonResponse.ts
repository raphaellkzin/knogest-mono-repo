import type { FastifyReply } from "fastify";

import { isAppError } from "./appError";

interface JsonResponseBase {
  reply: FastifyReply;
  data?: unknown;
  details?: unknown;
  statusCode?: number;
  code?: string;
  message?: string;
}

export const jsonResponse = {
  success({
    reply,
    data = null,
    statusCode = 200,
    message = "Success",
  }: JsonResponseBase) {
    return reply.code(statusCode).send({ success: true, message, data });
  },

  error({
    reply,
    details = null,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    message = "Internal server error",
  }: JsonResponseBase) {
    return reply.code(statusCode).send({
      success: false,
      code,
      message,
      details,
      requestId: reply.request.id,
    });
  },

  fromError({ reply, error }: { reply: FastifyReply; error: unknown }) {
    if (isAppError(error)) {
      return this.error({
        reply,
        details: error.data,
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
      });
    }
    return this.error({ reply });
  },
};
