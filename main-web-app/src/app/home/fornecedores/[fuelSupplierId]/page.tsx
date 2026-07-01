import { AppShell } from "@/components/layout/app-shell";
import { RegistryDetailPage } from "@/features/commercial-registry/components/registry-detail-page";
import { getRegistryDetail } from "@/features/commercial-registry/commercial-registry.server";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";

export default async function Page({
  params,
}: {
  params: Promise<{ fuelSupplierId: string }>;
}) {
  const [{ companies, selectedCompany, session }, { fuelSupplierId }] =
    await Promise.all([requireCompanyWorkspace(), params]);
  const record = await getRegistryDetail("fuel-suppliers", fuelSupplierId);

  return (
    <AppShell
      companies={companies}
      selectedCompany={selectedCompany}
      userId={session.user.id}
      currentArea="suppliers"
    >
      <RegistryDetailPage
        backHref="/home/fornecedores"
        record={record}
        title="Detalhe do fornecedor de combustível"
      />
    </AppShell>
  );
}
