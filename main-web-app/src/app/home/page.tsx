import { AppShell } from "@/components/layout/app-shell";
import { CompanyOverview } from "@/components/pages/company/company-overview";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";

export default async function Page() {
  const { companies, selectedCompany, session } =
    await requireCompanyWorkspace();

  return (
    <AppShell
      companies={companies}
      selectedCompany={selectedCompany}
      userId={session.user.id}
      currentArea="dashboard"
    >
      <CompanyOverview />
    </AppShell>
  );
}
