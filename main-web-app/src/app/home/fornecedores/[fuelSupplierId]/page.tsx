import { AppShell } from "@/components/layout/app-shell";
import { RegistryDetailPage } from "@/features/commercial-registry/components/registry-detail-page";
import {
  getRegistryDetail,
  getSupplierCatalogOptions,
} from "@/features/commercial-registry/commercial-registry.server";
import {
  lookupRegistryAddressByCepAction,
  removeSupplierOfferAction,
  removeSuppliedItemAction,
  removeSuppliedItemCategoryAction,
  saveSupplierOfferAction,
  saveSuppliedItemAction,
  saveSuppliedItemCategoryAction,
  updateFuelSupplierAction,
} from "@/features/commercial-registry/commercial-registry.actions";
import { getInitialRegistryActionState } from "@/features/commercial-registry/commercial-registry-action-state";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ fuelSupplierId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [
    { companies, selectedCompany, session },
    { fuelSupplierId },
    resolvedSearchParams,
  ] = await Promise.all([requireCompanyWorkspace(), params, searchParams]);
  const [record, catalog] = await Promise.all([
    getRegistryDetail("suppliers", fuelSupplierId),
    getSupplierCatalogOptions(),
  ]);

  return (
    <AppShell
      companies={companies}
      selectedCompany={selectedCompany}
      userId={session.user.id}
      currentArea="suppliers"
    >
      <RegistryDetailPage
        backHref="/home/fornecedores"
        catalog={catalog}
        initialOfferState={getInitialRegistryActionState()}
        openCatalogOnLoad={resolvedSearchParams.catalog === "new"}
        record={record}
        lookupAddressByCep={lookupRegistryAddressByCepAction}
        removeOfferAction={removeSupplierOfferAction}
        removeSuppliedItemAction={removeSuppliedItemAction}
        removeSuppliedItemCategoryAction={removeSuppliedItemCategoryAction}
        saveOfferAction={saveSupplierOfferAction}
        saveSuppliedItemAction={saveSuppliedItemAction}
        saveSuppliedItemCategoryAction={saveSuppliedItemCategoryAction}
        updateSupplierAction={updateFuelSupplierAction}
        title="Detalhe do fornecedor"
      />
    </AppShell>
  );
}
