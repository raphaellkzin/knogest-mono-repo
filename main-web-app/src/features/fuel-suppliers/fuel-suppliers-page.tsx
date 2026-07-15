import {
  addSupplierToSuppliedItemAction,
  createFuelSupplierAction,
  lookupFuelSupplierOptionsAction,
  lookupRegistryAddressByCepAction,
  removeFuelSupplierAction,
  removeSuppliedItemAction,
  removeSuppliedItemCategoryAction,
  saveSuppliedItemAction,
  saveSuppliedItemCategoryAction,
} from "@/features/commercial-registry/commercial-registry.actions";
import { getInitialRegistryActionState } from "@/features/commercial-registry/commercial-registry-action-state";
import {
  getRegistryList,
  getSupplierCatalogOptions,
  parseRegistrySearchParams,
} from "@/features/commercial-registry/commercial-registry.server";
import { FuelSuppliersTabs } from "./fuel-suppliers-tabs";

export async function FuelSuppliersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = parseRegistrySearchParams(searchParams);
  const [page, supplierCatalog] = await Promise.all([
    getRegistryList("suppliers", query),
    getSupplierCatalogOptions(),
  ]);
  const initialTab =
    query.cursor || query.entityType || query.search ? "suppliers" : "items";
  return (
    <FuelSuppliersTabs
      addSupplierToSuppliedItemAction={addSupplierToSuppliedItemAction}
      createSupplierAction={createFuelSupplierAction}
      initialState={getInitialRegistryActionState()}
      initialTab={initialTab}
      lookupAddressByCep={lookupRegistryAddressByCepAction}
      lookupFuelSupplierOptionsAction={lookupFuelSupplierOptionsAction}
      pageInfo={page.pageInfo}
      query={query}
      removeSuppliedItemAction={removeSuppliedItemAction}
      removeSuppliedItemCategoryAction={removeSuppliedItemCategoryAction}
      removeSupplierAction={removeFuelSupplierAction}
      rows={page.data}
      saveSuppliedItemAction={saveSuppliedItemAction}
      saveSuppliedItemCategoryAction={saveSuppliedItemCategoryAction}
      supplierCatalog={supplierCatalog}
    />
  );
}
