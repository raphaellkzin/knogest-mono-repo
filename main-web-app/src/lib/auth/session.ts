import "server-only";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth/options";

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

export async function requireAuthenticatedSession() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  return session;
}
