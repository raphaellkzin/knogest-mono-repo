import { AppShell } from "@/components/layout/app-shell";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";
import { EmployeeDetailPage } from "@/features/employees/components/employee-detail-page";
import { changeEmployeeJobRoleAction, rehireEmployeeAction } from "@/features/employees/employees.actions";
import { getEmployeeDetail, getJobRoles } from "@/features/employees/employees.server";

export default async function Page({
  params,
}: {
  params: Promise<{ employmentId: string }>;
}) {
  const [{ companies, selectedCompany, session }, { employmentId }] =
    await Promise.all([requireCompanyWorkspace(), params]);
  const [record, jobRoles] = await Promise.all([getEmployeeDetail(employmentId), getJobRoles()]);

  return (
    <AppShell
      companies={companies}
      selectedCompany={selectedCompany}
      userId={session.user.id}
      currentArea="employees"
    >
      <EmployeeDetailPage action={rehireEmployeeAction} jobRoleAction={changeEmployeeJobRoleAction} jobRoles={jobRoles ?? []} record={record} />
    </AppShell>
  );
}
