import { createEmployeeAction } from "./employees.actions";
import { getInitialEmployeeActionState } from "./employees-action-state";
import {
  getEmployeesList,
  getJobRoles,
  parseEmployeesSearchParams,
} from "./employees.server";
import { EmployeesPageView } from "./components/employees-page";

export async function EmployeesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = parseEmployeesSearchParams(searchParams);
  const [page, jobRoles] = await Promise.all([getEmployeesList(query), getJobRoles()]);
  return (
    <EmployeesPageView
      action={createEmployeeAction}
      initialState={getInitialEmployeeActionState()}
      pageInfo={page.pageInfo}
      query={query}
      rows={page.data}
      jobRoles={jobRoles ?? []}
    />
  );
}
