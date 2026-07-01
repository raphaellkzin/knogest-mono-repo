"use server";

import { revalidatePath } from "next/cache";

import { deleteApiV1ClientsClientid } from "@/generated/clients/deleteApiV1ClientsClientid";
import { deleteApiV1FuelSuppliersFuelsupplierid } from "@/generated/clients/deleteApiV1FuelSuppliersFuelsupplierid";
import { postApiV1Clients } from "@/generated/clients/postApiV1Clients";
import { postApiV1FuelSuppliers } from "@/generated/clients/postApiV1FuelSuppliers";
import type { PostApiV1ClientsMutationRequest } from "@/generated/models/PostApiV1Clients";
import type { PostApiV1FuelSuppliersMutationRequest } from "@/generated/models/PostApiV1FuelSuppliers";
import { ApiClientError } from "@/lib/api/server-client";
import type { RegistryActionState } from "./commercial-registry-action-state";

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
    if (error.code === "REGISTRY_RECORD_UNAVAILABLE") {
      return "Este registro já não está disponível para uso operacional.";
    }
    if (error.code === "CLIENT_REMOVAL_BLOCKED_BY_PROJECTS") {
      return "Substitua este cliente nas obras atuais antes de removê-lo.";
    }
    if (error.code === "FUEL_SUPPLIER_REMOVAL_BLOCKED_BY_AGREEMENTS") {
      return "Encerre os acordos atuais deste fornecedor antes de removê-lo.";
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

function idFromFormData(formData: FormData) {
  const id = formData.get("id");
  return typeof id === "string" ? id : "";
}

export async function removeClientAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  try {
    await deleteApiV1ClientsClientid({ clientId: idFromFormData(formData) });
    revalidatePath("/home/clientes");
    return { ok: true, message: "Cliente removido do uso operacional." };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function removeFuelSupplierAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  try {
    await deleteApiV1FuelSuppliersFuelsupplierid({
      fuelSupplierId: idFromFormData(formData),
    });
    revalidatePath("/home/fornecedores");
    return {
      ok: true,
      message: "Fornecedor removido do uso operacional.",
    };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}
