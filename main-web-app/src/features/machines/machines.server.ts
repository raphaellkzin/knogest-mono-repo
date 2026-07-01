import "server-only";

import { getApiV1Machines } from "@/generated/clients/getApiV1Machines";
import { getApiV1MachinesMachineid } from "@/generated/clients/getApiV1MachinesMachineid";
import type { GetApiV1MachinesQueryParams } from "@/generated/models/GetApiV1Machines";

export type MachinesListQuery = {
  availability?: "available";
  cursor?: string;
  search?: string;
  sortBy?: "name" | "createdAt";
  sortDirection?: "asc" | "desc";
  type?: "YELLOW_LINE" | "WHITE_LINE";
};

export type MachineListItem = Awaited<
  ReturnType<typeof getApiV1Machines>
>["data"]["data"][number];

export type MachineDetail = Awaited<
  ReturnType<typeof getApiV1MachinesMachineid>
>["data"];

const pageSize = 10;

function valueFromParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseMachinesSearchParams(
  params: Record<string, string | string[] | undefined>,
): MachinesListQuery {
  const availability = valueFromParam(params.availability);
  const sortBy = valueFromParam(params.sortBy);
  const sortDirection = valueFromParam(params.sortDirection);
  const type = valueFromParam(params.type);
  return {
    availability: availability === "available" ? "available" : undefined,
    cursor: valueFromParam(params.cursor),
    search: valueFromParam(params.search),
    sortBy: sortBy === "name" ? "name" : "createdAt",
    sortDirection: sortDirection === "asc" ? "asc" : "desc",
    type:
      type === "YELLOW_LINE" || type === "WHITE_LINE" ? type : undefined,
  };
}

export async function getMachinesList(query: MachinesListQuery) {
  const params: GetApiV1MachinesQueryParams = {
    availability: query.availability,
    cursor: query.cursor,
    limit: pageSize,
    search: query.search,
    sortBy: query.sortBy ?? "createdAt",
    sortDirection: query.sortDirection ?? "desc",
    type: query.type,
  };
  const response = await getApiV1Machines({ params });
  return response.data;
}

export async function getMachineDetail(machineId: string) {
  const response = await getApiV1MachinesMachineid({ machineId });
  return response.data as MachineDetail;
}
