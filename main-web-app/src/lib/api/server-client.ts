import "server-only";

import { randomUUID } from "node:crypto";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

import { headers as requestHeaders } from "next/headers";

import { getApiAccessToken } from "@/lib/auth/auth-cookies.server";
import { normalizeHost } from "@/lib/auth/normalize-host";
import { refreshSessionSingleFlight } from "@/lib/auth/session-refresh.server";
import { serverEnv } from "@/lib/config/env.server";
import { ApiClientError } from "./api-client-error";

export { ApiClientError };

export type AuthRefreshPolicy = "redirect" | "retry" | "disabled";

export class SessionRenewalRequiredError extends Error {
  constructor() {
    super("Session renewal must run through the controlled BFF boundary");
    this.name = "SessionRenewalRequiredError";
  }
}

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
  authRefreshPolicy?: AuthRefreshPolicy;
  /** @deprecated Use authRefreshPolicy: "disabled". */
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

async function executeRequest<
  TResponseData,
  _TError = unknown,
  TRequestData = unknown,
>(
  config: RequestConfig<TRequestData>,
  correlationId: string,
): Promise<ResponseConfig<TResponseData>> {
  const {
    authRefreshPolicy: configuredPolicy,
    skipAuthRefresh,
    ...requestConfig
  } = config;
  const authRefreshPolicy = skipAuthRefresh
    ? "disabled"
    : (configuredPolicy ?? "retry");
  const token = await getApiAccessToken();
  let trustedHost: string | undefined;
  let trustedProtocol: "http" | "https" | undefined;
  try {
    const incoming = await requestHeaders();
    trustedHost = normalizeHost(
      incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "",
    );
    const forwardedProtocol = incoming
      .get("x-forwarded-proto")
      ?.split(",", 1)[0]
      ?.trim()
      .toLowerCase();
    trustedProtocol =
      forwardedProtocol === "http" || forwardedProtocol === "https"
        ? forwardedProtocol
        : serverEnv.AUTH_COOKIE_MODE === "secure"
          ? "https"
          : "http";
  } catch {
    trustedHost = undefined;
    trustedProtocol = undefined;
  }
  const headers = {
    ...(requestConfig.headers as Record<string, string> | undefined),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(trustedHost ? { "X-Forwarded-Host": trustedHost } : {}),
    ...(trustedProtocol ? { "X-Forwarded-Proto": trustedProtocol } : {}),
    ...(trustedHost && trustedProtocol
      ? { Origin: `${trustedProtocol}://${trustedHost}` }
      : {}),
    ...(trustedHost ? { "Sec-Fetch-Site": "same-origin" } : {}),
    "X-Correlation-ID": correlationId,
    "X-Request-ID": randomUUID(),
  };

  try {
    const response = await axios.request<
      TResponseData,
      AxiosResponse<TResponseData>
    >({
      baseURL: apiBaseURL,
      ...requestConfig,
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
        authRefreshPolicy !== "disabled" &&
        error.response?.status === 401 &&
        code === "SESSION_INVALID" &&
        requestConfig.url !== "/api/v1/auth/refresh"
      ) {
        if (authRefreshPolicy === "redirect") {
          throw new SessionRenewalRequiredError();
        }
        const refreshResult = await refreshSessionSingleFlight();
        if (refreshResult.kind === "refreshed") {
          return executeRequest<TResponseData, _TError, TRequestData>(
            {
              ...config,
              authRefreshPolicy: "disabled",
              skipAuthRefresh: true,
            },
            correlationId,
          );
        }
      }

      throw new ApiClientError({
        data: error.response?.data,
        message: getErrorMessage(error),
        status: error.response?.status,
      });
    }

    throw error;
  }
}

export const client: Client = (config) =>
  executeRequest(config, randomUUID());

export default client;
