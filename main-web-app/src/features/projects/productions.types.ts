import type { GetApiV1ProjectsProjectidProductionsQueryResponse } from "@/generated/models/GetApiV1ProjectsProjectidProductions";
import type { PostApiV1ProjectsProjectidProductionsMutationRequest } from "@/generated/models/PostApiV1ProjectsProjectidProductions";

export type ProjectProductionsPage =
  GetApiV1ProjectsProjectidProductionsQueryResponse["data"];
export type ProjectProductionSummary = ProjectProductionsPage["data"][number];
export type ProjectProductionCommand =
  PostApiV1ProjectsProjectidProductionsMutationRequest;

export type ProjectProductionOptions = {
  project: { id: string; name: string; status: string };
  defaults: { productionDate: string; shift: "day" | "night" };
  capabilities: ProjectProductionsPage["capabilities"];
  responsibleOptions: Array<{ id: string; name: string; jobRole: string }>;
  workFronts: Array<{
    id: string;
    name: string;
    location: string | null;
    services: Array<{
      id: string;
      serviceCode: string;
      unitCode: string;
      quantity: string;
      productionProfile: string;
      dmtPolicy: "not_applicable" | "optional" | "required";
    }>;
    machines: Array<{
      id: string;
      name: string;
      manufacturer: string;
      model: string;
      meterType: "hour_meter" | "odometer";
      identifier: string | null;
      loadVolumeM3: string;
      maxSupportedWeightT: string | null;
      operator: { id: string; name: string };
    }>;
  }>;
};

export type ProjectProductionDetail = {
  id: string;
  projectId: string;
  workFrontId: string;
  workFrontServiceId: string;
  serviceCode: string;
  unitCode: string;
  productionProfile: string;
  dmtPolicy: "not_applicable" | "optional" | "required";
  productionDate: string;
  shift: "day" | "night";
  status: "draft" | "approved";
  entryMode: "direct_total" | "trips";
  revision: number;
  startTime: string | null;
  endTime: string | null;
  endDayOffset: number;
  responsible: { employmentId: string; name: string | null } | null;
  location: string | null;
  startStation: string | null;
  endStation: string | null;
  layer: string | null;
  elevation: string | null;
  materialName: string | null;
  materialCategory: string | null;
  volumeCondition: "cut" | "loose" | "compacted" | null;
  directQuantity: string | null;
  measuredQuantity: string | null;
  conversionFactor: string | null;
  origin: string | null;
  destination: string | null;
  dmtKm: string | null;
  layerThicknessCm: string | null;
  compactionPasses: number | null;
  moistureCondition: string | null;
  evidence: Array<{
    kind: "photo" | "ticket" | "attachment";
    name: string;
    url: string;
    notes: string | null;
  }>;
  notes: string | null;
  metrics: {
    operationalVolumeM3: string;
    officialQuantity: string;
    difference: string | null;
    differencePercent: string | null;
    tripCount: number;
    tripsPerHour: string | null;
    quantityPerHour: string | null;
    dmtKm: string | null;
    transportMomentM3Km: string | null;
    workedMinutes: number;
    stoppedMinutes: number;
  };
  equipment: Array<{
    id: string;
    machineId: string;
    name: string;
    manufacturer: string;
    model: string;
    identifier: string | null;
    meterType: "hour_meter" | "odometer";
    role: ProjectProductionEquipmentRole;
    operator: { employmentId: string; name: string | null } | null;
    initialMeterValue: string | null;
    finalMeterValue: string | null;
    workedMinutes: number | null;
    defaultTripCapacityM3: string | null;
    stoppedMinutes: number;
    stops: Array<{
      id: string;
      durationMinutes: number;
      reason: string;
      notes: string | null;
    }>;
    tripCount: number;
    tripVolumeM3: string;
  }>;
  trips: Array<{
    id: string;
    productionEquipmentId: string;
    idempotencyKey: string;
    recordedAt: string;
    capacityM3: string;
    adjustedVolumeM3: string | null;
    ticketNumber: string | null;
    notes: string | null;
  }>;
  approval: {
    approvedByUserId: string | null;
    approvedAt: string | null;
    direct: boolean;
  };
  rdo: { linked: boolean; stale: boolean };
  lastReopenReason: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ProjectProductionEquipmentRole =
  | "excavation"
  | "loading"
  | "transport"
  | "spreading"
  | "grading"
  | "compaction"
  | "watering"
  | "support";

export type ProjectProductionMutationResult =
  | { kind: "success"; production: ProjectProductionDetail }
  | {
      kind: "failure";
      code: string;
      message: string;
      requestId?: string;
      details?: Record<string, unknown>;
    };

export type ProjectDailyReportProductionSummary = {
  reportId: string;
  productions: Array<
    ProjectProductionSummary & {
      selected: boolean;
      confirmedRevision: number | null;
      stale: boolean;
    }
  >;
  groups: Array<{
    serviceCode: string;
    unitCode: string;
    volumeCondition: string | null;
    origin: string | null;
    destination: string | null;
    officialQuantity: string;
    operationalVolumeM3: string;
    tripCount: number;
    transportMomentM3Km: string;
    weightedDmtKm: string | null;
  }>;
  hasDrafts: boolean;
  needsReconfirmation: boolean;
};
