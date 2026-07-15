"use client";

import { useState } from "react";

import { OperationTabs } from "@/components/ui/operation-tabs";
import type { RegistryActionState } from "@/features/commercial-registry/commercial-registry-action-state";
import type {
  RegistryListItem,
  RegistryListQuery,
  SupplierSelectorOption,
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
  pageInfo,
  query,
  removeSuppliedItemAction,
  removeSuppliedItemCategoryAction,
  removeSupplierAction,
  rows,
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
  pageInfo: { hasNextPage: boolean; nextCursor: string | null };
  query: RegistryListQuery;
  removeSuppliedItemAction: RegistryAction;
  removeSuppliedItemCategoryAction: RegistryAction;
  removeSupplierAction: RegistryAction;
  rows: RegistryListItem[];
  saveSuppliedItemAction: RegistryAction;
  saveSuppliedItemCategoryAction: RegistryAction;
  supplierCatalog: {
    units: MeasurementUnitOption[];
    items: SuppliedItemOption[];
    categories?: SuppliedItemCategory[];
    catalogItems?: SuppliedItemCatalogItem[];
  };
}) {
  const [tab, setTab] = useState<SupplierTab>(initialTab);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <OperationTabs<SupplierTab>
          value={tab}
          onValueChange={setTab}
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
          removeSuppliedItemAction={removeSuppliedItemAction}
          removeSuppliedItemCategoryAction={removeSuppliedItemCategoryAction}
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
