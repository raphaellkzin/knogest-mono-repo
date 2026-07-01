"use server";

import { revalidatePath } from "next/cache";

import { postApiV1Clients } from "@/generated/clients/postApiV1Clients";
import { postApiV1FuelSuppliers } from "@/generated/clients/postApiV1FuelSuppliers";
import type { PostApiV1ClientsMutationRequest } from "@/generated/models/PostApiV1Clients";
import type { PostApiV1FuelSuppliersMutationRequest } from "@/generated/models/PostApiV1FuelSuppliers";
import { ApiClientError } from "@/lib/api/server-client";

export type RegistryActionState = {
  ok: boolean;
  message: string;
};

const initialState: RegistryActionState = { ok: false, message: "" };

export function getInitialRegistryActionState() {
  return initialState;
}

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function formPayload(
  formData: FormData,
): PostApiV1ClientsMutationRequest | PostApiV1FuelSuppliersMutationRequest {
  const entityType = optionalString(formData, "entityType");
  return {
    entityType: entityType === "legal_entity" ? "legal_entity" : "individual",
    document: optionalString(formData, "document") ?? "",
    fullName: optionalString(formData, "fullName"),
    legalName: optionalString(formData, "legalName"),
    tradeName: optionalString(formData, "tradeName"),
    phone: optionalString(formData, "phone"),
    email: optionalString(formData, "email"),
    addressLine: optionalString(formData, "addressLine"),
    city: optionalString(formData, "city"),
    state: optionalString(formData, "state"),
    postalCode: optionalString(formData, "postalCode"),
  };
}

function failureMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.code === "DOCUMENT_ALREADY_EXISTS") {
      return "Já existe um registro ativo com este documento nesta empresa.";
    }
    if (error.code === "VALIDATION_ERROR") {
      return "Revise os dados informados e tente novamente.";
    }
    if (error.status === 401 || error.status === 403) {
      return "Sua sessão não tem permissão para concluir esta operação.";
    }
    return error.message;
  }
  return "Não foi possível salvar o registro agora.";
}

export async function createClientAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  try {
    await postApiV1Clients({ data: formPayload(formData) });
    revalidatePath("/home/clientes");
    return { ok: true, message: "Cliente cadastrado." };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function createFuelSupplierAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  try {
    await postApiV1FuelSuppliers({ data: formPayload(formData) });
    revalidatePath("/home/fornecedores");
    return { ok: true, message: "Fornecedor de combustível cadastrado." };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}
