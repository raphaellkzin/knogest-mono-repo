import "server-only";

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

import { getApiAccessToken } from "@/lib/auth/api-token";

export type RequestConfig<TData = unknown> = {
  baseURL?: string;
  url?: string;
  method?: "GET" | "PUT" | "PATCH" | "POST" | "DELETE" | "OPTIONS" | "HEAD";
  params?: unknown;
  data?: TData | FormData;
  responseType?: "arraybuffer" | "blob" | "document" | "json" | "text" | "stream";
  signal?: AbortSignal;
  validateStatus?: (status: number) => boolean;
  headers?: AxiosRequestConfig["headers"];
  paramsSerializer?: AxiosRequestConfig["paramsSerializer"];
};

export type ResponseConfig<TData = unknown> = {
  data: TData;
  status: number;
  statusText: string;
  headers: AxiosResponse["headers"];
};

export type ResponseErrorConfig<TError = unknown> = AxiosError<TError>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Client = <TResponseData, _TError = unknown, TRequestData = unknown>(
  config: RequestConfig<TRequestData>,
) => Promise<ResponseConfig<TResponseData>>;

export class ApiClientError extends Error {
  status?: number;
  data?: unknown;

  constructor({
    cause,
    data,
    message,
    status,
  }: {
    cause?: unknown;
    data?: unknown;
    message: string;
    status?: number;
  }) {
    super(message, { cause });
    this.name = "ApiClientError";
    this.status = status;
    this.data = data;
  }
}

const apiBaseURL = process.env.API_BASE_URL || "http://localhost:3333";

function getErrorMessage(error: AxiosError) {
  const responseData = error.response?.data;

  if (
    responseData &&
    typeof responseData === "object" &&
    "message" in responseData &&
    typeof responseData.message === "string"
  ) {
    return responseData.message;
  }

  return "Não foi possível completar a requisição";
}

export const client: Client = async <
  TResponseData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _TError = unknown,
  TRequestData = unknown,
>(
  config: RequestConfig<TRequestData>,
) => {
  const token = await getApiAccessToken();
  const headers = {
    ...(config.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  try {
    const response = await axios.request<TResponseData, AxiosResponse<TResponseData>>({
      baseURL: apiBaseURL,
      ...config,
      headers,
    });

    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new ApiClientError({
        cause: error,
        data: error.response?.data,
        message: getErrorMessage(error),
        status: error.response?.status,
      });
    }

    throw error;
  }
};

export default client;
