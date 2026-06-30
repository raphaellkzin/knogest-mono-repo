"use server";

import { actionError, actionSuccess } from "@/actions/actions.helper";
import { getCurrentSession } from "@/lib/auth/session";

export async function authCheckAction() {
  const session = await getCurrentSession();

  if (!session) {
    return actionError("Não autorizado");
  }

  try {
    return actionSuccess(session);
  } catch (error) {
    return actionError(error);
  }
}
