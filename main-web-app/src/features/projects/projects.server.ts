import "server-only";
import { getApiV1Projects } from "@/generated/clients/getApiV1Projects";
import { getApiV1ProjectsProjectid } from "@/generated/clients/getApiV1ProjectsProjectid";
import { getApiV1Clients } from "@/generated/clients/getApiV1Clients";
import { getApiV1Employees } from "@/generated/clients/getApiV1Employees";
import { getApiV1Machines } from "@/generated/clients/getApiV1Machines";
import client from "@/lib/api/server-client";

export async function getProjectRegistry(search?: string, cursor?: string) {
  return (
    await getApiV1Projects({
      params: {
        limit: 25,
        search,
        cursor,
        sortBy: "createdAt",
        sortDirection: "desc",
      },
    })
  ).data;
}

export async function getProjectDetail(projectId: string) {
  return (await getApiV1ProjectsProjectid({ projectId })).data;
}

export async function getProjectWizardOptions() {
  const [clients, employees, machines, suppliers, suppliedItems, units] =
    await Promise.all([
      getApiV1Clients({
        params: {
          limit: 100,
          sortBy: "name",
          sortDirection: "asc",
        },
      }),
      getApiV1Employees({
        params: {
          limit: 100,
          state: "active",
          sortBy: "name",
          sortDirection: "asc",
        },
      }),
      getApiV1Machines({
        params: {
          limit: 100,
          availability: "available",
          sortBy: "name",
          sortDirection: "asc",
        },
      }),
      client<{
        success: true;
        data: {
          data: Array<{
            id: string;
            name: string;
            document: { maskedDocument: string };
          }>;
        };
      }>({
        url: "/api/v1/suppliers",
        method: "GET",
        params: { limit: 100, sortBy: "name", sortDirection: "asc" },
      }),
      client<{
        success: true;
        data: Array<{ id: string; name: string; baseUnitId: string }>;
      }>({ url: "/api/v1/supplied-items", method: "GET" }),
      client<{
        success: true;
        data: Array<{ id: string; code: string; name: string }>;
      }>({ url: "/api/v1/measurement-units", method: "GET" }),
    ]);
  return {
    clients: clients.data.data.map((item) => ({
      id: item.id,
      label: item.name,
      detail: item.document.maskedDocument,
    })),
    employees: employees.data.data
      .filter((item) => item.availability.state === "available")
      .map((item) => ({
        id: item.employment.id,
        label: item.person.displayName,
        detail: item.employment.jobRole?.name ?? item.person.document.maskedDocument,
        jobRolePeriodId: item.employment.jobRole?.periodId,
      })),
    machines: machines.data.data
      .filter(
        (item) =>
          item.availability.state === "available" && item.latestMeterReading,
      )
      .map((item) => ({
        id: item.id,
        label: item.name,
        detail: `${item.latestMeterReading!.value}`,
        readingId: item.latestMeterReading!.id,
      })),
    suppliers: suppliers.data.data.data.map((item) => ({
      id: item.id,
      label: item.name,
      detail: item.document.maskedDocument,
    })),
    suppliedItems: suppliedItems.data.data.map((item) => ({
      id: item.id,
      label: item.name,
      detail: item.baseUnitId,
      baseUnitId: item.baseUnitId,
    })),
    units: units.data.data.map((item) => ({
      id: item.id,
      label: item.code,
      detail: item.name,
    })),
  };
}
