import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  getApiRefreshToken: vi.fn(),
  setAuthCookies: vi.fn(),
  clearAuthCookies: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("axios", () => ({
  default: {
    post: mocks.post,
    isAxiosError: (error: unknown) =>
      typeof error === "object" && error !== null && "response" in error,
  },
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("./auth-cookies.server", () => ({
  getApiRefreshToken: mocks.getApiRefreshToken,
  setAuthCookies: mocks.setAuthCookies,
  clearAuthCookies: mocks.clearAuthCookies,
}));

import { refreshSessionSingleFlight } from "./session-refresh.server";

describe("server-only Session refresh coordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiRefreshToken.mockResolvedValue("refresh-current");
    mocks.headers.mockResolvedValue(
      new Headers({
        host: "piloto.localhost:3000",
        "x-forwarded-proto": "http",
      }),
    );
  });

  it("shares one transport flight while applying replacement cookies per waiter", async () => {
    let resolveRequest!: (value: unknown) => void;
    mocks.post.mockReturnValue(
      new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );

    const left = refreshSessionSingleFlight();
    const right = refreshSessionSingleFlight();
    resolveRequest({
      data: {
        success: true,
        data: {
          accessToken: "access-next",
          refreshToken: "refresh-next",
          expiresIn: 900,
        },
      },
    });

    await expect(Promise.all([left, right])).resolves.toEqual([
      { kind: "refreshed" },
      { kind: "refreshed" },
    ]);
    expect(mocks.post).toHaveBeenCalledTimes(1);
    expect(mocks.setAuthCookies).toHaveBeenCalledTimes(2);
    expect(mocks.clearAuthCookies).not.toHaveBeenCalled();
  });

  it("classifies canonical invalid Sessions as terminal and clears cookies", async () => {
    mocks.post.mockRejectedValue({
      response: { status: 401, data: { code: "SESSION_INVALID" } },
    });

    await expect(refreshSessionSingleFlight()).resolves.toEqual({
      kind: "terminal",
    });
    expect(mocks.clearAuthCookies).toHaveBeenCalledOnce();
  });

  it("preserves the refresh cookie on transient transport failures", async () => {
    mocks.post.mockRejectedValue({
      response: { status: 503, data: { code: "INTERNAL_ERROR" } },
    });

    await expect(refreshSessionSingleFlight()).resolves.toEqual({
      kind: "retryable",
    });
    expect(mocks.clearAuthCookies).not.toHaveBeenCalled();
    expect(mocks.setAuthCookies).not.toHaveBeenCalled();
  });

  it("uses the trusted forwarded protocol when building the API Origin", async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        host: "piloto.localhost",
        "x-forwarded-proto": "https",
      }),
    );
    mocks.post.mockResolvedValue({
      data: {
        success: true,
        data: {
          accessToken: "access-next",
          refreshToken: "refresh-next",
          expiresIn: 900,
        },
      },
    });

    await refreshSessionSingleFlight();
    expect(mocks.post).toHaveBeenCalledWith(
      "/api/v1/auth/refresh",
      { refreshToken: "refresh-current" },
      expect.objectContaining({
        headers: expect.objectContaining({
          Origin: "https://piloto.localhost",
        }),
      }),
    );
  });
});
