"use server";

import { authCheck } from "@/generated/clients/authCheck";
import { actionError, actionSuccess } from "@/actions/actions.helper";
import { getCurrentSession } from "@/lib/auth/session";

export async function authCheckAction() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    return actionError("Não autorizado");
  }

  try {
    const response = await authCheck();
    return actionSuccess(response);
  } catch (error) {
    return actionError(error);
  }
}
