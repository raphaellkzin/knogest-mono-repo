import { AppShell } from "@/components/layout/app-shell";
import { CompanyResourcePage } from "@/components/pages/company/company-resource-page";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";

export default async function Page() {
  const { companies, selectedCompany, session } =
    await requireCompanyWorkspace();

  return (
    <AppShell
      companies={companies}
      selectedCompany={selectedCompany}
      userId={session.user.id}
      currentArea="suppliers"
    >
      <CompanyResourcePage resource="suppliers" />
    </AppShell>
  );
}
