import "server-only";

import { getApiV1Clients } from "@/generated/clients/getApiV1Clients";
import { getApiV1ClientsClientid } from "@/generated/clients/getApiV1ClientsClientid";
import type { GetApiV1ClientsQueryParams } from "@/generated/models/GetApiV1Clients";
import client from "@/lib/api/server-client";

export type RegistryKind = "clients" | "suppliers";

export type RegistryListQuery = {
  cursor?: string;
  entityType?: "individual" | "legal_entity";
  search?: string;
  sortBy?: "name" | "createdAt";
  sortDirection?: "asc" | "desc";
};

export type RegistryListItem = Awaited<
  ReturnType<typeof getApiV1Clients>
>["data"]["data"][number];

export type RegistryDetail = Awaited<
  ReturnType<typeof getApiV1ClientsClientid>
>["data"] & {
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressNeighborhood?: string | null;
  offers?: SupplierOfferDetail[];
};

export type SupplierOfferDetail = {
  id: string;
  item: { id: string; name: string; baseUnitId: string } | null;
  baseUnit: { id: string; code: string; name: string } | null;
  purchaseUnit: { id: string; code: string; name: string } | null;
  conversionToBase: string;
  currentPrice: { id: string; price: string; effectiveFrom: string } | null;
  priceHistory: {
    id: string;
    price: string;
    effectiveFrom: string;
    effectiveTo: string | null;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type MeasurementUnitOption = { id: string; code: string; name: string };
export type SuppliedItemOption = {
  id: string;
  name: string;
  baseUnitId: string;
  categoryId?: string | null;
  valueUnitQuantity?: string;
  basePrice?: string;
};
export type SuppliedItemCategory = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
};
export type SuppliedItemCatalogItem = {
  id: string;
  name: string;
  categoryId: string | null;
  baseUnitId: string;
  baseUnit: MeasurementUnitOption | null;
  valueUnitQuantity: string;
  basePrice: string;
  activeSupplierCount: number;
  spentQuantity: string | null;
  lastSpentAt: string | null;
  updatedAt: string;
};
export type SupplierSelectorOption = {
  id: string;
  name: string;
  tradeName: string | null;
  document: { documentType: string; maskedDocument: string };
};

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
  const params: GetApiV1ClientsQueryParams = {
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

  const response = await client<{
    success: true;
    data: {
      data: RegistryListItem[];
      pageInfo: { hasNextPage: boolean; nextCursor: string | null };
    };
  }>({
    url: "/api/v1/suppliers",
    method: "GET",
    params,
  });
  return response.data.data;
}

export async function getRegistryDetail(kind: RegistryKind, id: string) {
  if (kind === "clients") {
    const response = await getApiV1ClientsClientid({ clientId: id });
    return response.data as RegistryDetail;
  }
  const response = await client<{
    success: true;
    data: RegistryDetail;
  }>({
    url: `/api/v1/suppliers/${id}`,
    method: "GET",
  });
  return response.data.data;
}

export async function getSupplierCatalogOptions() {
  const [units, items, catalog] = await Promise.all([
    client<{ success: true; data: MeasurementUnitOption[] }>({
      url: "/api/v1/measurement-units",
      method: "GET",
    }),
    client<{ success: true; data: SuppliedItemOption[] }>({
      url: "/api/v1/supplied-items",
      method: "GET",
    }),
    client<{
      success: true;
      data: {
        categories: SuppliedItemCategory[];
        items: SuppliedItemCatalogItem[];
      };
    }>({
      url: "/api/v1/supplied-items/catalog",
      method: "GET",
    }),
  ]);
  return {
    units: units.data.data,
    items: items.data.data,
    categories: catalog.data.data.categories,
    catalogItems: catalog.data.data.items,
  };
}
