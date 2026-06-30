"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { postApiV1AuthLogin } from "@/generated/clients/postApiV1AuthLogin";
import { ApiClientError } from "@/lib/api/server-client";
import { setAuthCookies } from "@/lib/auth/auth-cookies.server";
import { normalizeHost } from "@/lib/auth/normalize-host";

const loginInputSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(1024),
  callbackUrl: z.string().optional(),
});

export type LoginActionResult =
  | { success: true; url: string }
  | {
      success: false;
      code: "AUTHENTICATION_FAILED" | "RATE_LIMITED" | "INVALID_REQUEST";
      message: string;
    };

function safeCallbackUrl(value?: string): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/home";
}

export async function loginAction(input: unknown): Promise<LoginActionResult> {
  const parsed = loginInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      code: "INVALID_REQUEST",
      message: "Revise os campos informados",
    };
  }

  try {
    const requestHeaders = await headers();
    const originalHost =
      requestHeaders.get("x-forwarded-host") ??
      requestHeaders.get("host") ??
      "";
    const host = normalizeHost(originalHost);
    const response = await postApiV1AuthLogin(
      { data: { email: parsed.data.email, password: parsed.data.password } },
      { headers: { "X-Forwarded-Host": host } },
    );
    await setAuthCookies({
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      accessMaxAge: response.data.expiresIn,
    });
    return { success: true, url: safeCallbackUrl(parsed.data.callbackUrl) };
  } catch (error) {
    const code =
      error instanceof ApiClientError && error.code === "RATE_LIMITED"
        ? "RATE_LIMITED"
        : "AUTHENTICATION_FAILED";
    return {
      success: false,
      code,
      message:
        code === "RATE_LIMITED"
          ? "Muitas tentativas. Aguarde um momento e tente novamente."
          : "Credenciais inválidas",
    };
  }
}
