import { AppShell } from "@/components/layout/app-shell";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";
import { EmployeeDetailPage } from "@/features/employees/components/employee-detail-page";
import { getEmployeeDetail } from "@/features/employees/employees.server";

export default async function Page({
  params,
}: {
  params: Promise<{ employmentId: string }>;
}) {
  const [{ companies, selectedCompany, session }, { employmentId }] =
    await Promise.all([requireCompanyWorkspace(), params]);
  const record = await getEmployeeDetail(employmentId);

  return (
    <AppShell
      companies={companies}
      selectedCompany={selectedCompany}
      userId={session.user.id}
      currentArea="employees"
    >
      <EmployeeDetailPage record={record} />
    </AppShell>
  );
}
