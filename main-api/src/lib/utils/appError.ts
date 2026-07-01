export type AppErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_FAILED"
  | "RATE_LIMITED"
  | "SESSION_INVALID"
  | "COMPANY_CONTEXT_REQUIRED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DOCUMENT_ALREADY_EXISTS"
  | "REGISTRY_RECORD_UNAVAILABLE"
  | "CLIENT_REMOVAL_BLOCKED_BY_PROJECTS"
  | "FUEL_SUPPLIER_REMOVAL_BLOCKED_BY_AGREEMENTS"
  | "EMPLOYMENT_ALREADY_EXISTS"
  | "EMPLOYMENT_CURRENT_STATE_CONFLICT"
  | "REGISTRATION_NUMBER_ALREADY_EXISTS"
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
