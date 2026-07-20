"use server";

import { revalidatePath } from "next/cache";

import { deleteApiV1ClientsClientid } from "@/generated/clients/deleteApiV1ClientsClientid";
import { postApiV1Clients } from "@/generated/clients/postApiV1Clients";
import type { PostApiV1ClientsMutationRequest } from "@/generated/models/PostApiV1Clients";
import client, { ApiClientError } from "@/lib/api/server-client";
import { decimalInputToCanonicalFixed } from "@/lib/brazilian-input-mask";
import type { RegistryActionState } from "./commercial-registry-action-state";
import type {
  SupplierSelectorOption,
  SuppliedItemOffersPage,
} from "./commercial-registry.server";
import { suppliedItemPayload } from "./commercial-registry-item-payload";
import { supplierOfferPayload } from "./commercial-registry-offer-payload";
import { z } from "zod";

const viaCepSchema = z
  .object({
    erro: z.boolean().optional(),
    logradouro: z.string().optional(),
    bairro: z.string().optional(),
    localidade: z.string().optional(),
    uf: z.string().optional(),
  })
  .passthrough();

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function nullableString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type CommercialRegistryPayload = PostApiV1ClientsMutationRequest & {
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
};

function formPayload(formData: FormData): CommercialRegistryPayload {
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
    addressStreet: optionalString(formData, "addressStreet"),
    addressNumber: optionalString(formData, "addressNumber"),
    addressComplement: optionalString(formData, "addressComplement"),
    addressNeighborhood: optionalString(formData, "addressNeighborhood"),
    city: optionalString(formData, "city"),
    state: optionalString(formData, "state"),
    postalCode: optionalString(formData, "postalCode"),
  };
}

function updateSupplierPayload(formData: FormData) {
  return {
    fullName: nullableString(formData, "fullName"),
    legalName: nullableString(formData, "legalName"),
    tradeName: nullableString(formData, "tradeName"),
    phone: nullableString(formData, "phone"),
    email: nullableString(formData, "email"),
    addressLine: nullableString(formData, "addressLine"),
    addressStreet: nullableString(formData, "addressStreet"),
    addressNumber: nullableString(formData, "addressNumber"),
    addressComplement: nullableString(formData, "addressComplement"),
    addressNeighborhood: nullableString(formData, "addressNeighborhood"),
    city: nullableString(formData, "city"),
    state: nullableString(formData, "state"),
    postalCode: nullableString(formData, "postalCode"),
  };
}

function suppliedItemUpdatePayload(formData: FormData) {
  return {
    ...suppliedItemPayload(formData),
    propagateMirrorToExistingOffers: Boolean(
      optionalString(formData, "propagateMirrorToExistingOffers"),
    ),
  };
}

function suppliedItemCategoryPayload(formData: FormData) {
  return {
    name: optionalString(formData, "name") ?? "",
    parentId: optionalString(formData, "parentId") ?? null,
  };
}

function itemSupplierOfferPayload(formData: FormData) {
  return {
    supplierId: optionalString(formData, "supplierId") ?? "",
    price: decimalInputToCanonicalFixed(
      optionalString(formData, "price") ?? "",
      4,
      4,
    ),
    conversionToBase: decimalInputToCanonicalFixed(
      optionalString(formData, "conversionToBase") ?? "1,00000",
      5,
      6,
    ),
  };
}

function validationFieldSummary(error: ApiClientError) {
  const details =
    error.data &&
    typeof error.data === "object" &&
    "details" in error.data &&
    error.data.details &&
    typeof error.data.details === "object"
      ? error.data.details
      : null;
  if (!details) return "";

  const paths = new Set<string>();
  if (
    "fields" in details &&
    Array.isArray((details as { fields?: unknown }).fields)
  ) {
    for (const field of (details as { fields: unknown[] }).fields) {
      if (field && typeof field === "object" && "path" in field) {
        const path = String(field.path);
        if (path) paths.add(path);
      }
    }
  }

  const fieldErrors =
    "fieldErrors" in details &&
    details.fieldErrors &&
    typeof details.fieldErrors === "object"
      ? details.fieldErrors
      : details;
  for (const [path, issues] of Object.entries(fieldErrors)) {
    if (path === "fields" || path === "formErrors") continue;
    if (Array.isArray(issues) && issues.length > 0) paths.add(path);
  }

  return paths.size ? ` Campos: ${Array.from(paths).join(", ")}.` : "";
}

function failureMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    if (error.code === "DOCUMENT_ALREADY_EXISTS") {
      return "Já existe um registro ativo com este documento nesta empresa.";
    }
    if (error.code === "VALIDATION_ERROR") {
      return `Revise os dados informados e tente novamente.${validationFieldSummary(error)}`;
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
    if (error.code === "SUPPLIER_NOT_FOUND") {
      return "Fornecedor não encontrado ou indisponível.";
    }
    if (error.code === "SUPPLIER_OFFER_NOT_FOUND") {
      return "Oferta não encontrada ou já removida do catálogo ativo.";
    }
    if (error.code === "SUPPLIER_OFFER_ALREADY_EXISTS") {
      return "Este fornecedor já tem uma oferta ativa para este item.";
    }
    if (error.code === "SUPPLIED_ITEM_NOT_FOUND") {
      return "Item fornecido não encontrado ou indisponível.";
    }
    if (error.code === "MEASUREMENT_UNIT_NOT_FOUND") {
      return "Unidade de medida não encontrada ou indisponível.";
    }
    if (error.code === "SUPPLIED_ITEM_CATEGORY_NOT_FOUND") {
      return "Categoria não encontrada ou indisponível.";
    }
    if (error.code === "SUPPLIED_ITEM_CATEGORY_DEPTH_EXCEEDED") {
      return "O limite de profundidade de subcategorias é de 3 níveis.";
    }
    if (error.code === "SUPPLIED_ITEM_CATEGORY_INVALID_TREE") {
      return "A hierarquia da categoria selecionada não é válida.";
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
    const response = await client<{
      success: true;
      data: { id: string };
    }>({
      url: "/api/v1/suppliers",
      method: "POST",
      data: formPayload(formData),
    });
    revalidatePath("/home/fornecedores");
    return {
      ok: true,
      message: "Fornecedor cadastrado.",
      createdId: response.data.data.id,
    };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function updateFuelSupplierAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const supplierId = optionalString(formData, "supplierId") ?? "";
  try {
    await client({
      url: `/api/v1/suppliers/${supplierId}`,
      method: "PATCH",
      data: updateSupplierPayload(formData),
    });
    revalidatePath("/home/fornecedores");
    revalidatePath(`/home/fornecedores/${supplierId}`);
    return { ok: true, message: "Fornecedor atualizado." };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function saveSupplierOfferAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const supplierId = optionalString(formData, "supplierId") ?? "";
  const offerId = optionalString(formData, "offerId");
  try {
    await client({
      url: offerId
        ? `/api/v1/suppliers/${supplierId}/offers/${offerId}`
        : `/api/v1/suppliers/${supplierId}/offers`,
      method: offerId ? "PATCH" : "POST",
      data: supplierOfferPayload(formData),
    });
    revalidatePath(`/home/fornecedores/${supplierId}`);
    revalidatePath("/home/fornecedores");
    return {
      ok: true,
      message: offerId ? "Oferta atualizada." : "Oferta cadastrada.",
    };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function removeSupplierOfferAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const supplierId = optionalString(formData, "supplierId") ?? "";
  const offerId = optionalString(formData, "offerId") ?? "";
  try {
    await client({
      url: `/api/v1/suppliers/${supplierId}/offers/${offerId}`,
      method: "DELETE",
    });
    revalidatePath(`/home/fornecedores/${supplierId}`);
    return { ok: true, message: "Oferta removida do catálogo ativo." };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function saveSuppliedItemAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const supplierId = optionalString(formData, "supplierId") ?? "";
  const itemId = optionalString(formData, "itemId");
  try {
    await client({
      url: itemId
        ? `/api/v1/supplied-items/${itemId}`
        : "/api/v1/supplied-items",
      method: itemId ? "PATCH" : "POST",
      data: itemId
        ? suppliedItemUpdatePayload(formData)
        : suppliedItemPayload(formData),
    });
    revalidatePath("/home/fornecedores");
    if (supplierId) revalidatePath(`/home/fornecedores/${supplierId}`);
    return {
      ok: true,
      message: itemId ? "Item atualizado." : "Item cadastrado.",
    };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function removeSuppliedItemAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const supplierId = optionalString(formData, "supplierId") ?? "";
  const itemId = optionalString(formData, "itemId") ?? "";
  const isActive = optionalString(formData, "isActive") === "true";
  try {
    await client({
      url: `/api/v1/supplied-items/${itemId}/status`,
      method: "PATCH",
      data: { isActive },
    });
    revalidatePath("/home/fornecedores");
    if (supplierId) revalidatePath(`/home/fornecedores/${supplierId}`);
    return {
      ok: true,
      message: isActive ? "Item reativado." : "Item desativado.",
    };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function saveSuppliedItemCategoryAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const supplierId = optionalString(formData, "supplierId") ?? "";
  const categoryId = optionalString(formData, "categoryId");
  try {
    await client({
      url: categoryId
        ? `/api/v1/supplied-item-categories/${categoryId}`
        : "/api/v1/supplied-item-categories",
      method: categoryId ? "PATCH" : "POST",
      data: suppliedItemCategoryPayload(formData),
    });
    revalidatePath("/home/fornecedores");
    if (supplierId) revalidatePath(`/home/fornecedores/${supplierId}`);
    return {
      ok: true,
      message: categoryId ? "Categoria atualizada." : "Categoria cadastrada.",
    };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function removeSuppliedItemCategoryAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const supplierId = optionalString(formData, "supplierId") ?? "";
  const categoryId = optionalString(formData, "categoryId") ?? "";
  const isActive = optionalString(formData, "isActive") === "true";
  try {
    await client({
      url: `/api/v1/supplied-item-categories/${categoryId}/status`,
      method: "PATCH",
      data: { isActive },
    });
    revalidatePath("/home/fornecedores");
    if (supplierId) revalidatePath(`/home/fornecedores/${supplierId}`);
    return {
      ok: true,
      message: isActive ? "Categoria reativada." : "Categoria desativada.",
    };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function addSupplierToSuppliedItemAction(
  _state: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const itemId = optionalString(formData, "itemId") ?? "";
  try {
    await client({
      url: `/api/v1/supplied-items/${itemId}/suppliers`,
      method: "POST",
      data: itemSupplierOfferPayload(formData),
    });
    revalidatePath("/home/fornecedores");
    return { ok: true, message: "Fornecedor vinculado ao item." };
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  }
}

export async function lookupFuelSupplierOptionsAction(
  search: string,
): Promise<SupplierSelectorOption[]> {
  const response = await client<{
    success: true;
    data: SupplierSelectorOption[];
  }>({
    url: "/api/v1/fuel-suppliers/selectors/active",
    method: "GET",
    params: { search, limit: 25 },
  });
  return response.data.data;
}

export async function lookupSuppliedItemOffersAction({
  cursor,
  itemId,
}: {
  cursor?: string | null;
  itemId: string;
}): Promise<SuppliedItemOffersPage> {
  const response = await client<{
    success: true;
    data: SuppliedItemOffersPage;
  }>({
    url: `/api/v1/supplied-items/${itemId}/offers`,
    method: "GET",
    params: { limit: 30, cursor: cursor ?? undefined },
  });
  return response.data.data;
}

export async function lookupSuppliedItemOfferSupplierIdsAction(
  itemId: string,
): Promise<string[]> {
  const response = await client<{
    success: true;
    data: string[];
  }>({
    url: `/api/v1/supplied-items/${itemId}/offer-supplier-ids`,
    method: "GET",
  });
  return response.data.data;
}

export type RegistryCepLookupResult =
  | {
      kind: "success";
      address: {
        street: string;
        neighborhood: string;
        city: string;
        state: string;
      };
    }
  | { kind: "failure"; message: string };

export async function lookupRegistryAddressByCepAction(
  postalCode: string,
): Promise<RegistryCepLookupResult> {
  const digits = postalCode.replace(/\D/g, "");
  if (!/^\d{8}$/u.test(digits))
    return { kind: "failure", message: "Informe um CEP com 8 dígitos." };

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok)
      return {
        kind: "failure",
        message: "Não foi possível consultar o CEP agora.",
      };

    const parsed = viaCepSchema.safeParse(await response.json());
    if (!parsed.success || parsed.data.erro)
      return { kind: "failure", message: "CEP não encontrado." };

    return {
      kind: "success",
      address: {
        street: parsed.data.logradouro ?? "",
        neighborhood: parsed.data.bairro ?? "",
        city: parsed.data.localidade ?? "",
        state: parsed.data.uf ?? "",
      },
    };
  } catch {
    return {
      kind: "failure",
      message: "Não foi possível consultar o CEP agora.",
    };
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
    await client({
      url: `/api/v1/suppliers/${idFromFormData(formData)}`,
      method: "DELETE",
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
