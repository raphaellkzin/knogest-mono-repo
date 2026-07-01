import { AppShell } from "@/components/layout/app-shell";
import { ClientsPage } from "@/features/clients/clients-page";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ companies, selectedCompany, session }, resolvedSearchParams] =
    await Promise.all([requireCompanyWorkspace(), searchParams]);

  return (
    <AppShell
      companies={companies}
      selectedCompany={selectedCompany}
      userId={session.user.id}
      currentArea="clients"
    >
      <ClientsPage searchParams={resolvedSearchParams} />
    </AppShell>
  );
}
