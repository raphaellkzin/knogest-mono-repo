import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  getApiAccessToken: vi.fn(),
  refreshSessionSingleFlight: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("axios", () => ({
  default: {
    request: mocks.request,
    isAxiosError: (error: unknown) =>
      typeof error === "object" && error !== null && "response" in error,
  },
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/auth/auth-cookies.server", () => ({
  getApiAccessToken: mocks.getApiAccessToken,
}));
vi.mock("@/lib/auth/session-refresh.server", () => ({
  refreshSessionSingleFlight: mocks.refreshSessionSingleFlight,
}));

import client, {
  ApiClientError,
  SessionRenewalRequiredError,
} from "./server-client";

const sessionInvalid = {
  response: {
    status: 401,
    data: { code: "SESSION_INVALID", message: "Invalid session" },
  },
};

describe("server API authentication refresh policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiAccessToken.mockResolvedValue("access-old");
    mocks.headers.mockResolvedValue(
      new Headers({ host: "piloto.localhost", "x-forwarded-proto": "http" }),
    );
  });

  it("does not refresh when policy is disabled", async () => {
    mocks.request.mockRejectedValue(sessionInvalid);

    await expect(
      client({ method: "POST", url: "/command", authRefreshPolicy: "disabled" }),
    ).rejects.toBeInstanceOf(ApiClientError);
    expect(mocks.refreshSessionSingleFlight).not.toHaveBeenCalled();
    expect(mocks.request.mock.calls[0]?.[0].headers).toMatchObject({
      "Content-Type": null,
    });
  });

  it("signals a controlled renewal redirect for Server Component queries", async () => {
    mocks.request.mockRejectedValue(sessionInvalid);

    await expect(
      client({ method: "GET", url: "/query", authRefreshPolicy: "redirect" }),
    ).rejects.toBeInstanceOf(SessionRenewalRequiredError);
    expect(mocks.refreshSessionSingleFlight).not.toHaveBeenCalled();
  });

  it("refreshes and retries a mutation once with new credentials", async () => {
    mocks.request
      .mockRejectedValueOnce(sessionInvalid)
      .mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
      });
    mocks.refreshSessionSingleFlight.mockImplementation(async () => {
      mocks.getApiAccessToken.mockResolvedValue("access-next");
      return { kind: "refreshed" };
    });

    await expect(
      client({ method: "POST", url: "/command", authRefreshPolicy: "retry" }),
    ).resolves.toMatchObject({ status: 200 });
    expect(mocks.refreshSessionSingleFlight).toHaveBeenCalledOnce();
    expect(mocks.request).toHaveBeenCalledTimes(2);
    expect(mocks.request.mock.calls[0]?.[0].headers).toMatchObject({
      "Content-Type": null,
    });
    expect(mocks.request.mock.calls[1]?.[0].headers).toMatchObject({
      Authorization: "Bearer access-next",
      "Content-Type": null,
    });
  });

  it("preserves an explicit JSON content type when a body exists", async () => {
    mocks.request.mockResolvedValue({
      data: { success: true },
      status: 200,
      statusText: "OK",
      headers: {},
    });

    await client({
      method: "POST",
      url: "/command",
      data: { value: "kept" },
      headers: { "content-type": "application/json" },
    });

    expect(mocks.request.mock.calls[0]?.[0]).toMatchObject({
      data: { value: "kept" },
      headers: { "content-type": "application/json" },
    });
    expect(mocks.request.mock.calls[0]?.[0].headers).not.toHaveProperty(
      "Content-Type",
    );
  });

  it("uses one correlation id and a distinct request id for retry calls", async () => {
    mocks.request
      .mockRejectedValueOnce(sessionInvalid)
      .mockResolvedValueOnce({
        data: { success: true },
        status: 200,
        statusText: "OK",
        headers: {},
      });
    mocks.refreshSessionSingleFlight.mockImplementation(async () => {
      mocks.getApiAccessToken.mockResolvedValue("access-next");
      return { kind: "refreshed" };
    });

    await client({
      method: "GET",
      url: "/query",
      authRefreshPolicy: "retry",
    });
    const firstHeaders = mocks.request.mock.calls[0]?.[0].headers;
    const retryHeaders = mocks.request.mock.calls[1]?.[0].headers;
    expect(firstHeaders["X-Correlation-ID"]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(retryHeaders["X-Correlation-ID"]).toBe(
      firstHeaders["X-Correlation-ID"],
    );
    expect(retryHeaders["X-Request-ID"]).not.toBe(
      firstHeaders["X-Request-ID"],
    );
  });
});
