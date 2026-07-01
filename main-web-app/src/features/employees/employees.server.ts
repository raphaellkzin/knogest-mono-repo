import "server-only";

import { getApiV1Employees } from "@/generated/clients/getApiV1Employees";
import { getApiV1EmployeesEmploymentid } from "@/generated/clients/getApiV1EmployeesEmploymentid";
import type { GetApiV1EmployeesQueryParams } from "@/generated/models/GetApiV1Employees";

export type EmployeesListQuery = {
  availability?: "available";
  cursor?: string;
  search?: string;
  sortBy?: "name" | "createdAt";
  sortDirection?: "asc" | "desc";
  state?: "active";
};

export type EmployeeListItem = Awaited<
  ReturnType<typeof getApiV1Employees>
>["data"]["data"][number];

export type EmployeeDetail = Awaited<
  ReturnType<typeof getApiV1EmployeesEmploymentid>
>["data"];

const pageSize = 10;

function valueFromParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseEmployeesSearchParams(
  params: Record<string, string | string[] | undefined>,
): EmployeesListQuery {
  const availability = valueFromParam(params.availability);
  const sortBy = valueFromParam(params.sortBy);
  const sortDirection = valueFromParam(params.sortDirection);
  const state = valueFromParam(params.state);
  return {
    availability: availability === "available" ? "available" : undefined,
    cursor: valueFromParam(params.cursor),
    search: valueFromParam(params.search),
    sortBy: sortBy === "name" ? "name" : "createdAt",
    sortDirection: sortDirection === "asc" ? "asc" : "desc",
    state: state === "active" ? "active" : undefined,
  };
}

export async function getEmployeesList(query: EmployeesListQuery) {
  const params: GetApiV1EmployeesQueryParams = {
    availability: query.availability,
    cursor: query.cursor,
    limit: pageSize,
    search: query.search,
    sortBy: query.sortBy ?? "createdAt",
    sortDirection: query.sortDirection ?? "desc",
    state: query.state,
  };
  const response = await getApiV1Employees({ params });
  return response.data;
}

export async function getEmployeeDetail(employmentId: string) {
  const response = await getApiV1EmployeesEmploymentid({ employmentId });
  return response.data as EmployeeDetail;
}
