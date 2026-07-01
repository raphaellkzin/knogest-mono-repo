"use server";

import { revalidatePath } from "next/cache";

import { postApiV1Employees } from "@/generated/clients/postApiV1Employees";
import type { PostApiV1EmployeesMutationRequest } from "@/generated/models/PostApiV1Employees";
import { ApiClientError } from "@/lib/api/server-client";
import type { EmployeeActionState } from "./employees-action-state";

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return "";
  return value.trim();
}

function payload(formData: FormData): PostApiV1EmployeesMutationRequest {
  return {
    admissionDate: optionalString(formData, "admissionDate"),
    companyRegistrationNumber: optionalString(
      formData,
      "companyRegistrationNumber",
    ),
    document: optionalString(formData, "document"),
    fullName: optionalString(formData, "fullName"),
  };
}

function failureMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.code === "EMPLOYMENT_ALREADY_EXISTS") {
      return "Esta pessoa já possui vínculo ativo nesta empresa.";
    }
    if (error.code === "REGISTRATION_NUMBER_ALREADY_EXISTS") {
      return "Esta matrícula já está em uso nesta empresa.";
    }
    if (error.code === "VALIDATION_ERROR") {
      return "Revise CPF, nome, matrícula e admissão.";
    }
    if (error.status === 401 || error.status === 403) {
      return "Sua sessão não tem permissão para concluir esta operação.";
    }
    return error.message;
  }
  return "Não foi possível cadastrar o funcionário agora.";
}

export async function createEmployeeAction(
  _state: EmployeeActionState,
  formData: FormData,
): Promise<EmployeeActionState> {
  try {
    await postApiV1Employees({ data: payload(formData) });
    revalidatePath("/home/funcionarios");
    return { ok: true, message: "Funcionário cadastrado." };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}
