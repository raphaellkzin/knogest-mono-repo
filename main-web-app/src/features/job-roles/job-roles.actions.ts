"use server";

import { revalidatePath } from "next/cache";
import { postApiV1JobRoles } from "@/generated/clients/postApiV1JobRoles";
import { putApiV1JobRolesJobroleid } from "@/generated/clients/putApiV1JobRolesJobroleid";

export async function createJobRoleForEmployee(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const response = await postApiV1JobRoles({ data: { name } });
  revalidatePath("/home/configuracoes");
  revalidatePath("/home/funcionarios");
  return response.data;
}

export async function createJobRoleAction(formData: FormData) {
  await createJobRoleForEmployee(formData);
}

export async function renameJobRoleAction(formData: FormData) {
  const jobRoleId = String(formData.get("jobRoleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!jobRoleId || !name) return;
  await putApiV1JobRolesJobroleid({ jobRoleId, data: { name } });
  revalidatePath("/home/configuracoes");
  revalidatePath("/home/funcionarios");
}

export async function deactivateJobRoleAction(formData: FormData) {
  const jobRoleId = String(formData.get("jobRoleId") ?? "");
  if (!jobRoleId) return;
  await putApiV1JobRolesJobroleid({ jobRoleId, data: { isActive: false } });
  revalidatePath("/home/configuracoes");
  revalidatePath("/home/funcionarios");
}
