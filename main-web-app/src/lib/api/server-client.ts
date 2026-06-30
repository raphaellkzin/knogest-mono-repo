import "server-only";

import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

import { headers as requestHeaders } from "next/headers";

import { getApiAccessToken } from "@/lib/auth/auth-cookies.server";
import { normalizeHost } from "@/lib/auth/normalize-host";
import { refreshSessionSingleFlight } from "@/lib/auth/session-refresh.server";
import { serverEnv } from "@/lib/config/env.server";

export type RequestConfig<TData = unknown> = {
  baseURL?: string;
  url?: string;
  method?: "GET" | "PUT" | "PATCH" | "POST" | "DELETE" | "OPTIONS" | "HEAD";
  params?: unknown;
  data?: TData | FormData;
  responseType?:
    | "arraybuffer"
    | "blob"
    | "document"
    | "json"
    | "text"
    | "stream";
  signal?: AbortSignal;
  validateStatus?: (status: number) => boolean;
  headers?: AxiosRequestConfig["headers"];
  paramsSerializer?: AxiosRequestConfig["paramsSerializer"];
  skipAuthRefresh?: boolean;
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
  code?: string;

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
    this.code =
      data &&
      typeof data === "object" &&
      "code" in data &&
      typeof data.code === "string"
        ? data.code
        : undefined;
  }
}

const apiBaseURL = serverEnv.API_BASE_URL;

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
  let trustedHost: string | undefined;
  try {
    const incoming = await requestHeaders();
    trustedHost = normalizeHost(
      incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "",
    );
  } catch {
    trustedHost = undefined;
  }
  const headers = {
    ...(config.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(trustedHost ? { "X-Forwarded-Host": trustedHost } : {}),
    ...(trustedHost ? { Origin: `http://${trustedHost}` } : {}),
    ...(trustedHost ? { "Sec-Fetch-Site": "same-origin" } : {}),
  };

  try {
    const response = await axios.request<
      TResponseData,
      AxiosResponse<TResponseData>
    >({
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
      const code =
        error.response?.data &&
        typeof error.response.data === "object" &&
        "code" in error.response.data &&
        typeof error.response.data.code === "string"
          ? error.response.data.code
          : undefined;

      if (
        !config.skipAuthRefresh &&
        error.response?.status === 401 &&
        code === "SESSION_INVALID" &&
        config.url !== "/api/v1/auth/refresh"
      ) {
        const refreshed = await refreshSessionSingleFlight();
        if (refreshed) {
          return client<TResponseData, _TError, TRequestData>({
            ...config,
            skipAuthRefresh: true,
          });
        }
      }

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
