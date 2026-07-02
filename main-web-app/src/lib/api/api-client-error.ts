export class ApiClientError extends Error {
  status?: number;
  data?: unknown;
  code?: string;

  constructor({
    data,
    message,
    status,
  }: {
    data?: unknown;
    message: string;
    status?: number;
  }) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
    this.code =
      data &&
      typeof data === "object" &&
      "code" in data &&
      typeof data.code === "string"
        ? data.code
        : undefined;
  }
}
