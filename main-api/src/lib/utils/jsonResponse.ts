import { FastifyReply } from "fastify";
import { isAppError } from "./appError";

interface JsonResponseBase {
  reply: FastifyReply;
  data?: unknown;
  statusCode?: number;
  message?: string;
}

export const jsonResponse = {
  success({
    reply,
    data = null,
    statusCode = 200,
    message = "Success",
  }: JsonResponseBase) {
    const response = {
      success: true,
      message,
      data,
    };

    return reply.code(statusCode).send(response);
  },

  error({
    reply,
    data = null,
    statusCode = 500,
    message = "Internal server error",
  }: JsonResponseBase) {
    const response = {
      success: false,
      message,
      data,
    };

    return reply.code(statusCode).send(response);
  },

  fromError({ reply, error }: { reply: FastifyReply; error: unknown }) {
    if (isAppError(error)) {
      return this.error({
        reply,
        data: error.data,
        statusCode: error.statusCode,
        message: error.message,
      });
    }

    return this.error({ reply });
  },
};
