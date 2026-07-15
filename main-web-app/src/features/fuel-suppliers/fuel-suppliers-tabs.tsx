"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { OperationTabs } from "@/components/ui/operation-tabs";
import type { RegistryActionState } from "@/features/commercial-registry/commercial-registry-action-state";
import type {
  RegistryListItem,
  RegistryListQuery,
  SupplierSelectorOption,
  SuppliedItemOffersPage,
} from "@/features/commercial-registry/commercial-registry.server";
import { RegistryPage } from "@/features/commercial-registry/components/registry-page";
import { SuppliedItemsCatalog } from "@/features/commercial-registry/components/supplied-items-catalog";
import type {
  MeasurementUnitOption,
  SuppliedItemCatalogItem,
  SuppliedItemCategory,
  SuppliedItemOption,
} from "@/features/commercial-registry/commercial-registry.server";

type RegistryAction = (
  state: RegistryActionState,
  formData: FormData,
) => Promise<RegistryActionState>;

type RegistryCepLookupResult =
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

type RegistryCepLookupAction = (
  postalCode: string,
) => Promise<RegistryCepLookupResult>;

type SupplierTab = "items" | "suppliers";

export function FuelSuppliersTabs({
  addSupplierToSuppliedItemAction,
  createSupplierAction,
  initialState,
  initialTab,
  lookupAddressByCep,
  lookupFuelSupplierOptionsAction,
  lookupSuppliedItemOfferSupplierIdsAction,
  lookupSuppliedItemOffersAction,
  pageInfo,
  query,
  removeSuppliedItemAction,
  removeSuppliedItemCategoryAction,
  removeSupplierAction,
  rows,
  saveSupplierOfferAction,
  saveSuppliedItemAction,
  saveSuppliedItemCategoryAction,
  supplierCatalog,
}: {
  addSupplierToSuppliedItemAction: RegistryAction;
  createSupplierAction: RegistryAction;
  initialState: RegistryActionState;
  initialTab: SupplierTab;
  lookupAddressByCep?: RegistryCepLookupAction;
  lookupFuelSupplierOptionsAction: (
    search: string,
  ) => Promise<SupplierSelectorOption[]>;
  lookupSuppliedItemOfferSupplierIdsAction: (
    itemId: string,
  ) => Promise<string[]>;
  lookupSuppliedItemOffersAction: (input: {
    cursor?: string | null;
    itemId: string;
  }) => Promise<SuppliedItemOffersPage>;
  pageInfo: { hasNextPage: boolean; nextCursor: string | null };
  query: RegistryListQuery;
  removeSuppliedItemAction: RegistryAction;
  removeSuppliedItemCategoryAction: RegistryAction;
  removeSupplierAction: RegistryAction;
  rows: RegistryListItem[];
  saveSupplierOfferAction: RegistryAction;
  saveSuppliedItemAction: RegistryAction;
  saveSuppliedItemCategoryAction: RegistryAction;
  supplierCatalog: {
    units: MeasurementUnitOption[];
    items: SuppliedItemOption[];
    categories?: SuppliedItemCategory[];
    catalogItems?: SuppliedItemCatalogItem[];
  };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<SupplierTab>(initialTab);
  const handleTabChange = (nextTab: SupplierTab) => {
    setTab(nextTab);
    const params = new URLSearchParams();
    if (nextTab === "suppliers") {
      params.set("tab", "suppliers");
      if (query.search) params.set("search", query.search);
      if (query.entityType) params.set("entityType", query.entityType);
      if (query.sortBy) params.set("sortBy", query.sortBy);
      if (query.sortDirection) params.set("sortDirection", query.sortDirection);
    }
    const search = params.toString();
    router.replace(
      search ? `/home/fornecedores?${search}` : "/home/fornecedores",
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <OperationTabs<SupplierTab>
          value={tab}
          onValueChange={handleTabChange}
          tabs={[
            { value: "items", label: "Itens fornecidos" },
            { value: "suppliers", label: "Fornecedores" },
          ]}
        />
      </div>

      {tab === "items" ? (
        <SuppliedItemsCatalog
          addSupplierToSuppliedItemAction={addSupplierToSuppliedItemAction}
          catalog={supplierCatalog}
          initialState={initialState}
          lookupFuelSupplierOptionsAction={lookupFuelSupplierOptionsAction}
          lookupSuppliedItemOfferSupplierIdsAction={
            lookupSuppliedItemOfferSupplierIdsAction
          }
          lookupSuppliedItemOffersAction={lookupSuppliedItemOffersAction}
          removeSuppliedItemAction={removeSuppliedItemAction}
          removeSuppliedItemCategoryAction={removeSuppliedItemCategoryAction}
          saveSupplierOfferAction={saveSupplierOfferAction}
          saveSuppliedItemAction={saveSuppliedItemAction}
          saveSuppliedItemCategoryAction={saveSuppliedItemCategoryAction}
        />
      ) : (
        <RegistryPage
          action={createSupplierAction}
          copy={{
            basePath: "/home/fornecedores",
            createLabel: "Novo fornecedor",
            detailBasePath: "/home/fornecedores",
            emptyDescription: "Fornecedores ativos aparecem aqui por empresa.",
            emptyTitle: "Nenhum fornecedor encontrado",
            newTitle: "Cadastrar fornecedor",
            removeLabel: "Remover",
            searchPlaceholder: "Buscar por razão social, nome ou contato",
          }}
          persistentParams={{ tab: "suppliers" }}
          initialState={initialState}
          lookupAddressByCep={lookupAddressByCep}
          pageInfo={pageInfo}
          query={query}
          removeAction={removeSupplierAction}
          rows={rows}
        />
      )}
    </div>
  );
}
