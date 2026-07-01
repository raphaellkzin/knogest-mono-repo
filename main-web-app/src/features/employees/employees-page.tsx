import { createEmployeeAction } from "./employees.actions";
import { getInitialEmployeeActionState } from "./employees-action-state";
import {
  getEmployeesList,
  parseEmployeesSearchParams,
} from "./employees.server";
import { EmployeesPageView } from "./components/employees-page";

export async function EmployeesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = parseEmployeesSearchParams(searchParams);
  const page = await getEmployeesList(query);
  return (
    <EmployeesPageView
      action={createEmployeeAction}
      initialState={getInitialEmployeeActionState()}
      pageInfo={page.pageInfo}
      query={query}
      rows={page.data}
    />
  );
}
