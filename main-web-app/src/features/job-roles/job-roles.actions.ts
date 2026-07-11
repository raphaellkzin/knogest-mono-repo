"use server";

import { revalidatePath } from "next/cache";
import { postApiV1JobRoles } from "@/generated/clients/postApiV1JobRoles";
import { putApiV1JobRolesJobroleid } from "@/generated/clients/putApiV1JobRolesJobroleid";
import { ApiClientError } from "@/lib/api/server-client";

export type JobRoleActionState = { ok: boolean; message: string };
const initialFailure = "Não foi possível atualizar as funções agora.";

function messageFor(error: unknown) {
  if (error instanceof ApiClientError && error.code === "VALIDATION_ERROR") return "Informe uma função válida.";
  if (error instanceof ApiClientError && error.status === 401) return "Sua sessão expirou. Entre novamente para continuar.";
  return error instanceof Error && error.message ? error.message : initialFailure;
}

export async function createJobRoleForEmployee(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Informe o nome da função." } as const;
  try {
    const response = await postApiV1JobRoles({ data: { name } });
    revalidatePath("/home/configuracoes");
    revalidatePath("/home/funcionarios");
    return { ok: true, data: response.data, message: "Função criada e selecionada." } as const;
  } catch (error) { return { ok: false, message: messageFor(error) } as const; }
}

export async function createJobRoleAction(_state: JobRoleActionState, formData: FormData): Promise<JobRoleActionState> {
  const result = await createJobRoleForEmployee(formData);
  return { ok: result.ok, message: result.message };
}

export async function renameJobRoleAction(_state: JobRoleActionState, formData: FormData): Promise<JobRoleActionState> {
  const jobRoleId = String(formData.get("jobRoleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!jobRoleId || !name) return { ok: false, message: "Informe o nome da função." };
  try { await putApiV1JobRolesJobroleid({ jobRoleId, data: { name } }); revalidatePath("/home/configuracoes"); revalidatePath("/home/funcionarios"); return { ok: true, message: "Função renomeada." }; } catch (error) { return { ok: false, message: messageFor(error) }; }
}

export async function deactivateJobRoleAction(_state: JobRoleActionState, formData: FormData): Promise<JobRoleActionState> {
  const jobRoleId = String(formData.get("jobRoleId") ?? "");
  if (!jobRoleId) return { ok: false, message: initialFailure };
  try { await putApiV1JobRolesJobroleid({ jobRoleId, data: { isActive: false } }); revalidatePath("/home/configuracoes"); revalidatePath("/home/funcionarios"); return { ok: true, message: "Função desativada para novos vínculos e alocações." }; } catch (error) { return { ok: false, message: messageFor(error) }; }
}
