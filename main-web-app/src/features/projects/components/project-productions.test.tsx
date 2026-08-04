// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../productions.actions", () => ({
  addProjectProductionTripAction: vi.fn(),
  approveProjectProductionAction: vi.fn(),
  getMoreProjectProductionsAction: vi.fn(),
  getProjectProductionAction: vi.fn(),
  getProjectProductionOptionsAction: vi.fn(),
  removeProjectProductionTripAction: vi.fn(),
  reopenProjectProductionAction: vi.fn(),
  saveProjectProductionAction: vi.fn(),
}));

import {
  getProjectProductionOptionsAction,
  saveProjectProductionAction,
} from "../productions.actions";
import type {
  ProjectProductionDetail,
  ProjectProductionOptions,
  ProjectProductionsPage,
} from "../productions.types";
import { ProjectProductions } from "./project-productions";

const projectId = "11111111-1111-4111-8111-111111111111";
const frontId = "22222222-2222-4222-8222-222222222222";
const serviceId = "33333333-3333-4333-8333-333333333333";
const machineId = "44444444-4444-4444-8444-444444444444";
const employmentId = "55555555-5555-4555-8555-555555555555";

const page: ProjectProductionsPage = {
  data: [],
  pageInfo: { hasNextPage: false, nextCursor: null },
  capabilities: {
    createDraft: true,
    publishDirect: true,
    approveOthers: true,
    reopen: true,
  },
};

const options: ProjectProductionOptions = {
  project: { id: projectId, name: "BR-101", status: "ACTIVE" },
  defaults: { productionDate: "2026-07-28", shift: "day" },
  capabilities: page.capabilities,
  responsibleOptions: [
    { id: employmentId, name: "Ana Silva", jobRole: "Apontadora" },
  ],
  workFronts: [
    {
      id: frontId,
      name: "Frente Norte",
      location: "Estaca 10",
      services: [
        {
          id: serviceId,
          serviceCode: "cut",
          unitCode: "M3",
          quantity: "1000.00",
          productionProfile: "excavation",
          dmtPolicy: "optional",
        },
      ],
      machines: [
        {
          id: machineId,
          name: "Escavadeira 01",
          manufacturer: "CAT",
          model: "320",
          meterType: "hour_meter",
          identifier: "EQ-01",
          loadVolumeM3: "12.000",
          maxSupportedWeightT: "20.000",
          operator: { id: employmentId, name: "João Operador" },
        },
      ],
    },
  ],
};

describe("ProjectProductions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProjectProductionOptionsAction).mockResolvedValue(options);
  });

  afterEach(cleanup);

  it("opens the field form with current fronts, services and machines", async () => {
    const user = userEvent.setup();
    render(<ProjectProductions projectId={projectId} initialPage={page} />);

    await user.click(
      screen.getByRole("button", { name: "Adicionar produção" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Adicionar produção" }),
    ).toBeTruthy();
    expect((screen.getByLabelText("Frente") as HTMLSelectElement).value).toBe(
      frontId,
    );
    expect((screen.getByLabelText("Serviço") as HTMLSelectElement).value).toBe(
      serviceId,
    );
    expect(screen.getByText("Escavadeira 01")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Lançar direto" })).toBeTruthy();
  });

  it("creates a draft before enabling quick trip capture", async () => {
    const user = userEvent.setup();
    vi.mocked(saveProjectProductionAction).mockResolvedValue({
      kind: "success",
      production: tripDraftDetail(),
    });
    render(<ProjectProductions projectId={projectId} initialPage={page} />);

    await user.click(
      screen.getByRole("button", { name: "Adicionar produção" }),
    );
    await screen.findByRole("heading", { name: "Adicionar produção" });
    await user.selectOptions(
      screen.getByLabelText("Forma de lançamento"),
      "trips",
    );
    await user.click(screen.getByText("Escavadeira 01"));
    await user.selectOptions(screen.getByLabelText("Função"), "transport");
    expect(
      (screen.getByLabelText("Capacidade padrão") as HTMLInputElement).value,
    ).toBe("12,000 m³");
    await user.click(
      screen.getByRole("button", { name: "Criar e registrar viagens" }),
    );

    await waitFor(() =>
      expect(saveProjectProductionAction).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId,
          command: expect.objectContaining({
            entryMode: "trips",
            approveNow: false,
            equipment: [
              expect.objectContaining({ defaultTripCapacityM3: "12.000" }),
            ],
          }),
        }),
      ),
    );
    expect(
      await screen.findByRole("button", { name: "1 viagem" }),
    ).toBeTruthy();
  });
});

function tripDraftDetail(): ProjectProductionDetail {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    projectId,
    workFrontId: frontId,
    workFrontServiceId: serviceId,
    serviceCode: "cut",
    unitCode: "M3",
    productionProfile: "excavation",
    dmtPolicy: "optional",
    productionDate: "2026-07-28",
    shift: "day",
    status: "draft",
    entryMode: "trips",
    revision: 1,
    startTime: "07:00",
    endTime: "17:00",
    endDayOffset: 0,
    responsible: { employmentId, name: "Ana Silva" },
    location: "Estaca 10",
    startStation: null,
    endStation: null,
    layer: null,
    elevation: null,
    materialName: null,
    materialCategory: null,
    volumeCondition: "loose",
    directQuantity: null,
    measuredQuantity: null,
    conversionFactor: null,
    origin: null,
    destination: null,
    dmtKm: null,
    layerThicknessCm: null,
    compactionPasses: null,
    moistureCondition: null,
    evidence: [],
    notes: null,
    metrics: {
      operationalVolumeM3: "0.000",
      officialQuantity: "0.000",
      difference: null,
      differencePercent: null,
      tripCount: 0,
      tripsPerHour: "0.00",
      quantityPerHour: "0.000",
      dmtKm: null,
      transportMomentM3Km: null,
      workedMinutes: 0,
      stoppedMinutes: 0,
    },
    equipment: [
      {
        id: "77777777-7777-4777-8777-777777777777",
        machineId,
        name: "Escavadeira 01",
        manufacturer: "CAT",
        model: "320",
        identifier: "EQ-01",
        meterType: "hour_meter",
        role: "transport",
        operator: { employmentId, name: "João Operador" },
        initialMeterValue: null,
        finalMeterValue: null,
        workedMinutes: null,
        defaultTripCapacityM3: "12.000",
        stoppedMinutes: 0,
        stops: [],
        tripCount: 0,
        tripVolumeM3: "0.000",
      },
    ],
    trips: [],
    approval: {
      approvedByUserId: null,
      approvedAt: null,
      direct: false,
    },
    rdo: { linked: false, stale: false },
    lastReopenReason: null,
    createdByUserId: "88888888-8888-4888-8888-888888888888",
    createdAt: "2026-07-28T10:00:00.000Z",
    updatedAt: "2026-07-28T10:00:00.000Z",
  };
}
