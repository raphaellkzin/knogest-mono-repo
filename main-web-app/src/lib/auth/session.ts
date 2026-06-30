import "server-only";

import { redirect } from "next/navigation";
import { z } from "zod";

import { getApiV1AuthSession } from "@/generated/clients/getApiV1AuthSession";
import { getApiAccessToken } from "@/lib/auth/auth-cookies.server";

const sessionSchema = z.object({
  success: z.literal(true),
  data: z.object({
    userId: z.string().uuid(),
    corporationId: z.string().uuid(),
    sessionId: z.string().uuid(),
    role: z.literal("MASTER_ADMIN"),
    companyId: z.string().uuid().nullable(),
    scope: z.enum(["corporation-scoped", "company-scoped"]),
  }),
});

export async function getCurrentSession() {
  if (!(await getApiAccessToken())) return null;
  try {
    const response = sessionSchema.parse(await getApiV1AuthSession());
    return { ...response.data, user: { id: response.data.userId } };
  } catch {
    return null;
  }
}

export async function requireAuthenticatedSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/auth/login");
  return session;
}
