import "server-only";
import { getApiV1Clients } from "@/generated/clients/getApiV1Clients";
import { getApiV1Employees } from "@/generated/clients/getApiV1Employees";
import { getApiV1JobRoles } from "@/generated/clients/getApiV1JobRoles";
import { getApiV1Machines } from "@/generated/clients/getApiV1Machines";
import client from "@/lib/api/server-client";

export type ProjectLifecycleStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type ProjectDetailSnapshot = {
  id: string;
  name: string;
  address: {
    formatted: string;
    postalCode: string | null;
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
  };
  latitude: string | null;
  longitude: string | null;
  contractNumber: string | null;
  status: ProjectLifecycleStatus;
  actualStartedAt: string | null;
  createdAt: string;
  baseline: {
    approvedBudget: string;
    plannedStartDate: string | null;
    plannedEndDate: string | null;
    effectiveFrom: string;
  } | null;
  client: {
    id: string;
    name: string;
    document: { documentType: string; maskedDocument: string };
    isActive: boolean;
  } | null;
  manager: ProjectEmployeeSummary | null;
  technicalResponsibilities: ProjectEmployeeSummary[];
  schedule: {
    days: {
      dayOfWeek: number;
      isWorking: boolean;
      startTime: string | null;
      endTime: string | null;
    }[];
    breakTemplates: {
      id: string;
      name: string;
      durationMinutes: number;
    }[];
  };
  employeeAllocations: {
    id: string;
    employment: ProjectEmployeeSummary | null;
    jobRole: string;
    expectedDailyWorkloadMinutes: number;
    compensationMode: CompensationMode;
    compensationValue: string;
    overtimeRate: string;
    effectiveFrom: string;
  }[];
  machineAllocations: {
    id: string;
    machine: {
      id: string;
      name: string;
      meterType: string;
      identifier: { kind: string; value: string } | null;
      isActive: boolean;
    } | null;
    operator: ProjectEmployeeSummary | null;
    startMeterReading: { id: string; value: string } | null;
    effectiveFrom: string;
  }[];
  fuelOffers: ProjectOfferSnapshot[];
  supplierOffers: ProjectOfferSnapshot[];
  productionMetricTargets: {
    metricCode: ProductionMetricCode;
    targetTotal: string;
  }[];
  compensationPaymentTerms: {
    compensationMode: CompensationMode;
    daysAfterPeriodEnd: number;
  }[];
  readiness: {
    canActivate: boolean;
    blockers: {
      section:
        | "dates"
        | "metrics"
        | "fuel"
        | "items"
        | "equipment"
        | "team"
        | "payments";
      message: string;
    }[];
  };
};

export type ProjectOfferSnapshot = {
  id: string;
  usageKind?: "fuel" | "material";
  sourceOfferId: string | null;
  sourceOfferIsActive?: boolean;
  supplier: FuelSupplierOption | null;
  item: { id: string; name: string; isActive: boolean } | null;
  purchaseUnit: {
    id: string;
    code: string;
    name: string;
    isActive: boolean;
  } | null;
  conversionToBase: string;
  price: string;
  effectiveFrom: string;
};

export type ProjectEmployeeSummary = {
  id: string;
  name: string;
  jobRole: string | null;
  isActive: boolean;
};

export type ProductionMetricCode = "cut" | "fill" | "finishing" | "top_soil";
export type CompensationMode =
  | "daily"
  | "hourly"
  | "weekly"
  | "fortnightly"
  | "monthly";
export type FuelSupplierOption = {
  id: string;
  name: string;
  tradeName: string | null;
  document: { documentType: string; maskedDocument: string };
  isActive?: boolean;
};
export type ProjectOption = {
  id: string;
  label: string;
  detail?: string | null;
  readingId?: string | null;
  jobRolePeriodId?: string | null;
  jobRoleId?: string | null;
  available?: boolean;
};
export type SupplierOfferOption = {
  id: string;
  supplier: FuelSupplierOption;
  item: { id: string; name: string; baseUnitId: string };
  purchaseUnit: { id: string; code: string; name: string };
  conversionToBase: string;
  currentPrice: { price: string; effectiveFrom: string };
  isFuelCandidate: boolean;
};
export type ProjectReadinessOptions = {
  clients: ProjectOption[];
  employees: ProjectOption[];
  machines: ProjectOption[];
  jobRoles: ProjectOption[];
  suppliers: FuelSupplierOption[];
  suppliedItems: { id: string; name: string; baseUnitId: string }[];
  measurementUnits: { id: string; code: string; name: string }[];
  supplierOffers: SupplierOfferOption[];
};

export type ProjectRegistryPage = {
  data: {
    id: string;
    name: string;
    contractNumber: string | null;
    status: ProjectLifecycleStatus;
    actualStartedAt: string | null;
    createdAt: string;
  }[];
  pageInfo: { hasNextPage: boolean; nextCursor: string | null };
};

export async function getProjectRegistry(search?: string, cursor?: string) {
  const response = await client<{ success: true; data: ProjectRegistryPage }>({
    url: "/api/v1/projects",
    method: "GET",
    params: {
      limit: 25,
      search,
      cursor,
      sortBy: "createdAt",
      sortDirection: "desc",
    },
  });
  return response.data.data;
}

export async function getProjectDetail(projectId: string) {
  const response = await client<{
    success: true;
    data: ProjectDetailSnapshot;
  }>({
    url: `/api/v1/projects/${projectId}`,
    method: "GET",
  });
  return response.data.data;
}

export async function getProjectReadinessOptions(
  projectId: string,
): Promise<ProjectReadinessOptions> {
  const response = await client<{
    success: true;
    data: ProjectReadinessOptions;
  }>({
    url: `/api/v1/projects/${projectId}/readiness-options`,
    method: "GET",
  });
  return response.data.data;
}

export async function getProjectWizardOptions() {
  const [clients, employees, machines, jobRoles] = await Promise.all([
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
    getApiV1JobRoles(),
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
        detail:
          item.employment.jobRole?.name ?? item.person.document.maskedDocument,
        jobRolePeriodId: item.employment.jobRole?.periodId,
        jobRoleId: item.employment.jobRole?.id,
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
    jobRoles: (jobRoles.data ?? [])
      .filter((item) => item.isActive)
      .map((item) => ({ id: item.id, label: item.name })),
  };
}
