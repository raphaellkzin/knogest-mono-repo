import { z } from "zod";

type JsonSchema = Record<string, unknown>;

export const zodToJsonSchema = (
  schema: z.ZodTypeAny,
): Record<string, unknown> => {
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema["$schema"];
  return jsonSchema;
};

const errorResponse = (message: string) =>
  ({
    type: "object",
    properties: {
      success: { type: "boolean", example: false },
      message: { type: "string", example: message },
      data: { type: "object", nullable: true },
    },
  }) as const;

const successResponse = (dataSchema: JsonSchema) =>
  ({
    type: "object",
    properties: {
      success: { type: "boolean", example: true },
      message: { type: "string", example: "Success" },
      data: dataSchema,
    },
  }) as const;

export const paginatedDataSchema = (
  itemSchema: JsonSchema,
  avulse?: JsonSchema,
): JsonSchema => ({
  type: "object",
  properties: {
    data: {
      type: "array",
      items: itemSchema,
    },
    ...(avulse && avulse),
    hasNextPage: { type: "boolean" },
    length: { type: "number", nullable: true },
    nextCursor: {
      type: "string",
      nullable: true,
    },
  },
});

export function buildResponseSchema(
  dataSchema: JsonSchema,
  opts?: { statusCode?: number; auth?: boolean },
) {
  const statusCode = opts?.statusCode ?? 200;
  const auth = opts?.auth ?? false;

  const response: Record<number, JsonSchema> = {
    [statusCode]: successResponse(dataSchema),
    422: errorResponse("Error"),
  };

  if (auth) {
    response[401] = errorResponse("Token inválido ou ausente.");
    response[403] = errorResponse(
      "Você não tem permissão para acessar esta rota.",
    );
  }

  return response;
}
