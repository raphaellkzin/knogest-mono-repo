export type AppErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNPROCESSABLE_ENTITY"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly statusCode: number;
  public readonly data: unknown;

  constructor({
    code,
    data = null,
    message,
    statusCode,
  }: {
    code: AppErrorCode;
    data?: unknown;
    message: string;
    statusCode: number;
  }) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.data = data;
    this.statusCode = statusCode;
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};
