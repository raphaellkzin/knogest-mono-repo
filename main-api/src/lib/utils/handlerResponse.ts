import { AppError } from "./appError";

export const sucessHandlerResponse = <T>(
  data: T,
): { error: boolean; data: T } => {
  return {
    error: false,
    data,
  };
};

export const successHandlerResponse = sucessHandlerResponse;

const prismaErrorMap: Record<
  string,
  { code: "CONFLICT" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_ERROR"; message: string; statusCode: number }
> = {
  P2000: {
    code: "BAD_REQUEST",
    message: "Valor fornecido e muito longo para o campo",
    statusCode: 400,
  },
  P2001: {
    code: "NOT_FOUND",
    message: "Registro nao encontrado",
    statusCode: 404,
  },
  P2002: {
    code: "CONFLICT",
    message: "Ja existe uma entidade com essas propriedades unicas",
    statusCode: 409,
  },
  P2003: {
    code: "BAD_REQUEST",
    message: "Violacao de chave estrangeira",
    statusCode: 400,
  },
  P2025: {
    code: "NOT_FOUND",
    message: "Registro nao encontrado",
    statusCode: 404,
  },
};

export const failedHandlerResponse = ({
  error,
  message,
  type,
  entities,
}: {
  message?: string;
  type?:
    | "ANY"
    | "CREATION"
    | "VIEW"
    | "HANDLING"
    | "LINKING"
    | "UPDATING"
    | "LISTING";
  error: unknown;
  entities?: string[];
}): AppError => {
  const prismaCode =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code)
      : null;

  if (prismaCode) {
    const mapped = prismaErrorMap[prismaCode] ?? {
      code: "INTERNAL_ERROR" as const,
      message: "Erro desconhecido no banco de dados",
      statusCode: 500,
    };

    return new AppError(mapped);
  }

  return new AppError({
    code: "UNPROCESSABLE_ENTITY",
    message:
      typeof error === "string"
        ? error
        : (message ??
          `Nao foi possivel completar ${type ?? "ANY"} ${entities?.join(", ") ?? ""}`),
    statusCode: 422,
  });
};
