import { AppShell } from "@/components/layout/app-shell";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";
import { EmployeesPage } from "@/features/employees/employees-page";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { companies, selectedCompany, session } =
    await requireCompanyWorkspace();
  const resolvedSearchParams = await searchParams;

  return (
    <AppShell
      companies={companies}
      selectedCompany={selectedCompany}
      userId={session.user.id}
      currentArea="employees"
    >
      <EmployeesPage searchParams={resolvedSearchParams} />
    </AppShell>
  );
}
