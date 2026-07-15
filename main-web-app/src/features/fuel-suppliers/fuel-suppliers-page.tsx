import {
  addSupplierToSuppliedItemAction,
  createFuelSupplierAction,
  lookupFuelSupplierOptionsAction,
  lookupSuppliedItemOfferSupplierIdsAction,
  lookupRegistryAddressByCepAction,
  lookupSuppliedItemOffersAction,
  removeFuelSupplierAction,
  removeSuppliedItemAction,
  removeSuppliedItemCategoryAction,
  saveSupplierOfferAction,
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
  const requestedTab = Array.isArray(searchParams.tab)
    ? searchParams.tab[0]
    : searchParams.tab;
  const initialTab: "items" | "suppliers" =
    requestedTab === "suppliers" ||
    query.cursor ||
    query.entityType ||
    query.search
      ? "suppliers"
      : "items";
  return (
    <FuelSuppliersTabs
      addSupplierToSuppliedItemAction={addSupplierToSuppliedItemAction}
      createSupplierAction={createFuelSupplierAction}
      initialState={getInitialRegistryActionState()}
      initialTab={initialTab}
      lookupAddressByCep={lookupRegistryAddressByCepAction}
      lookupFuelSupplierOptionsAction={lookupFuelSupplierOptionsAction}
      lookupSuppliedItemOfferSupplierIdsAction={
        lookupSuppliedItemOfferSupplierIdsAction
      }
      lookupSuppliedItemOffersAction={lookupSuppliedItemOffersAction}
      pageInfo={page.pageInfo}
      query={query}
      removeSuppliedItemAction={removeSuppliedItemAction}
      removeSuppliedItemCategoryAction={removeSuppliedItemCategoryAction}
      removeSupplierAction={removeFuelSupplierAction}
      rows={page.data}
      saveSupplierOfferAction={saveSupplierOfferAction}
      saveSuppliedItemAction={saveSuppliedItemAction}
      saveSuppliedItemCategoryAction={saveSuppliedItemCategoryAction}
      supplierCatalog={supplierCatalog}
    />
  );
}
