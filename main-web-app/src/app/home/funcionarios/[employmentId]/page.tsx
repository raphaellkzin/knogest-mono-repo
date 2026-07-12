import { AppShell } from "@/components/layout/app-shell";
import { requireCompanyWorkspace } from "@/features/company-selection/company-selection.server";
import { EmployeeDetailPage } from "@/features/employees/components/employee-detail-page";
import {
  allocateEmployeeAction,
  changeEmployeeJobRoleAction,
  reallocateEmployeeAction,
  rehireEmployeeAction,
  releaseEmployeeAllocationAction,
  replaceEmployeeAllocationTermsAction,
} from "@/features/employees/employees.actions";
import {
  getEmployeeDetail,
  getJobRoles,
} from "@/features/employees/employees.server";
import { getProjectRegistry } from "@/features/projects/projects.server";

export default async function Page({
  params,
}: {
  params: Promise<{ employmentId: string }>;
}) {
  const [{ companies, selectedCompany, session }, { employmentId }] =
    await Promise.all([requireCompanyWorkspace(), params]);
  const [record, jobRoles, projectRegistry] = await Promise.all([
    getEmployeeDetail(employmentId),
    getJobRoles(),
    getProjectRegistry(),
  ]);

  return (
    <AppShell
      companies={companies}
      selectedCompany={selectedCompany}
      userId={session.user.id}
      currentArea="employees"
    >
      <EmployeeDetailPage
        action={rehireEmployeeAction}
        allocateAction={allocateEmployeeAction}
        releaseAction={releaseEmployeeAllocationAction}
        termsAction={replaceEmployeeAllocationTermsAction}
        reallocateAction={reallocateEmployeeAction}
        companyId={selectedCompany.id}
        projects={projectRegistry.data.map((project) => ({
          id: project.id,
          name: project.name,
        }))}
        jobRoleAction={changeEmployeeJobRoleAction}
        jobRoles={jobRoles ?? []}
        record={record}
      />
    </AppShell>
  );
}
