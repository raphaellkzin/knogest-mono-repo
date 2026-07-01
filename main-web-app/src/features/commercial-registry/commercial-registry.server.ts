import "server-only";

import { getApiV1Clients } from "@/generated/clients/getApiV1Clients";
import { getApiV1ClientsClientid } from "@/generated/clients/getApiV1ClientsClientid";
import { getApiV1FuelSuppliers } from "@/generated/clients/getApiV1FuelSuppliers";
import { getApiV1FuelSuppliersFuelsupplierid } from "@/generated/clients/getApiV1FuelSuppliersFuelsupplierid";
import type { GetApiV1ClientsQueryParams } from "@/generated/models/GetApiV1Clients";
import type { GetApiV1FuelSuppliersQueryParams } from "@/generated/models/GetApiV1FuelSuppliers";

export type RegistryKind = "clients" | "fuel-suppliers";

export type RegistryListQuery = {
  cursor?: string;
  entityType?: "individual" | "legal_entity";
  search?: string;
  sortBy?: "name" | "createdAt";
  sortDirection?: "asc" | "desc";
};

export type RegistryListItem = Awaited<
  ReturnType<typeof getApiV1Clients>
>["data"]["data"][number] | Awaited<
  ReturnType<typeof getApiV1FuelSuppliers>
>["data"]["data"][number];

export type RegistryDetail = Awaited<
  ReturnType<typeof getApiV1ClientsClientid>
>["data"] | Awaited<
  ReturnType<typeof getApiV1FuelSuppliersFuelsupplierid>
>["data"];

const pageSize = 10;

function valueFromParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseRegistrySearchParams(
  params: Record<string, string | string[] | undefined>,
): RegistryListQuery {
  const entityType = valueFromParam(params.entityType);
  const sortBy = valueFromParam(params.sortBy);
  const sortDirection = valueFromParam(params.sortDirection);
  return {
    cursor: valueFromParam(params.cursor),
    search: valueFromParam(params.search),
    entityType:
      entityType === "individual" || entityType === "legal_entity"
        ? entityType
        : undefined,
    sortBy: sortBy === "name" ? "name" : "createdAt",
    sortDirection: sortDirection === "asc" ? "asc" : "desc",
  };
}

export function buildRegistryHref(
  basePath: string,
  query: RegistryListQuery,
  override: Partial<RegistryListQuery> = {},
) {
  const params = new URLSearchParams();
  const next = { ...query, ...override };
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
  }
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
}

export async function getRegistryList(
  kind: RegistryKind,
  query: RegistryListQuery,
) {
  const params: GetApiV1ClientsQueryParams | GetApiV1FuelSuppliersQueryParams =
    {
      limit: pageSize,
      cursor: query.cursor,
      search: query.search,
      entityType: query.entityType,
      sortBy: query.sortBy ?? "createdAt",
      sortDirection: query.sortDirection ?? "desc",
    };

  if (kind === "clients") {
    const response = await getApiV1Clients({
      params: params as GetApiV1ClientsQueryParams,
    });
    return response.data;
  }

  const response = await getApiV1FuelSuppliers({
    params: params as GetApiV1FuelSuppliersQueryParams,
  });
  return response.data;
}

export async function getRegistryDetail(kind: RegistryKind, id: string) {
  if (kind === "clients") {
    const response = await getApiV1ClientsClientid({ clientId: id });
    return response.data as RegistryDetail;
  }
  const response = await getApiV1FuelSuppliersFuelsupplierid({
    fuelSupplierId: id,
  });
  return response.data as RegistryDetail;
}
