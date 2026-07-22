// @vitest-environment jsdom

import * as React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../daily-reports.actions", () => ({
  finalizeProjectDailyReportAction: vi.fn(),
  getMoreProjectDailyReportsAction: vi.fn(),
  getProjectDailyReportAction: vi.fn(),
  getProjectDailyReportOptionsAction: vi.fn(),
  saveProjectDailyReportAction: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}));

import {
  finalizeProjectDailyReportAction,
  getProjectDailyReportOptionsAction,
  saveProjectDailyReportAction,
} from "../daily-reports.actions";
import type {
  ProjectDailyReportDetail,
  ProjectDailyReportOptions,
  ProjectDailyReportsPage,
} from "../daily-reports.types";
import { ProjectDailyReports } from "./project-daily-reports";

const projectId = "00000000-0000-4000-8000-000000000001";
const employmentId = "00000000-0000-4000-8000-000000000002";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ProjectDailyReports", () => {
  it("prefills context, records a full shift and asks before finalizing", async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectDailyReportOptionsAction).mockResolvedValue(options);
    vi.mocked(saveProjectDailyReportAction).mockResolvedValue({
      kind: "success",
      report: draft,
    });
    vi.mocked(finalizeProjectDailyReportAction).mockResolvedValue({
      kind: "success",
      report: { ...draft, status: "finalized", finalizedAt: draft.updatedAt },
    });
    render(
      <ProjectDailyReports projectId={projectId} initialPage={emptyPage} />,
    );

    await user.click(screen.getByRole("button", { name: "Novo RDO" }));
    expect(
      await screen.findByRole("heading", { name: "Novo RDO" }),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Supervisor") as HTMLSelectElement).value,
    ).toBe(employmentId);
    expect(screen.getByText("Escala vigente: Seg. a Sáb.")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Todos completaram o turno" }),
    );
    await user.type(
      screen.getByLabelText("Atividades executadas"),
      "Transporte e compactação de material.",
    );
    await user.click(screen.getByRole("button", { name: "Salvar rascunho" }));

    await waitFor(() =>
      expect(saveProjectDailyReportAction).toHaveBeenCalled(),
    );
    expect(
      vi.mocked(saveProjectDailyReportAction).mock.calls[0]?.[0],
    ).toMatchObject({
      projectId,
      command: {
        employees: [
          {
            employmentId,
            completedFullShift: true,
            regularWorkedMinutes: 480,
            overtimeMinutes: 0,
          },
        ],
      },
    });

    await user.click(screen.getByRole("button", { name: "Finalizar RDO" }));
    expect(
      screen.getByRole("heading", { name: "Finalizar este RDO?" }),
    ).toBeTruthy();
    expect(finalizeProjectDailyReportAction).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Não, continuar editando" }),
    );
    expect(finalizeProjectDailyReportAction).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Finalizar RDO" }));
    await user.click(screen.getByRole("button", { name: "Sim, finalizar" }));
    await waitFor(() =>
      expect(finalizeProjectDailyReportAction).toHaveBeenCalledWith(
        projectId,
        draft.id,
      ),
    );
  });
});

const emptyPage: ProjectDailyReportsPage = {
  data: [],
  pageInfo: { hasNextPage: false, nextCursor: null },
};

const options: ProjectDailyReportOptions = {
  project: {
    id: projectId,
    name: "Jardim das Oliveiras",
    municipality: "Imperatriz",
    state: "MA",
    contract: "Loteamento Jardins das Oliveiras I",
  },
  defaults: {
    reportDate: "2026-07-20",
    shift: "day",
    schedulePeriods: [
      {
        startTime: "07:00",
        endTime: "18:00",
        startDayOffset: 0,
        endDayOffset: 0,
      },
    ],
    activityStartTime: "07:00",
    activityEndTime: "18:00",
    activityEndDayOffset: 0,
    scheduleScale: "Seg. a Sáb.",
    supervisorEmploymentId: employmentId,
    technicalResponsibilityEmploymentIds: [employmentId],
  },
  responsibleOptions: [{ id: employmentId, name: "Rafael Brito" }],
  employeeOptions: [
    {
      id: employmentId,
      name: "Rafael Brito",
      jobRole: "Supervisor",
      expectedDailyWorkloadMinutes: 480,
    },
  ],
  machineOptions: [],
};

const draft: ProjectDailyReportDetail = {
  id: "00000000-0000-4000-8000-000000000003",
  projectId,
  reportDate: "2026-07-20",
  shift: "day",
  status: "draft",
  project: options.project,
  scheduleScale: "Seg. a Sáb.",
  supervisor: { employmentId, name: "Rafael Brito" },
  technicalResponsibilities: [{ employmentId, name: "Rafael Brito" }],
  schedulePeriods: options.defaults.schedulePeriods,
  activityWindow: {
    startTime: "07:00",
    endTime: "18:00",
    endDayOffset: 0,
  },
  activityTypes: ["earthworks"],
  climateConditions: ["dry"],
  rainfall: { dailyMm: "0.00", monthlyMm: "0.00" },
  employees: [
    {
      employmentId,
      name: "Rafael Brito",
      jobRole: "Supervisor",
      expectedDailyWorkloadMinutes: 480,
      completedFullShift: true,
      regularWorkedMinutes: 480,
      overtimeMinutes: 0,
    },
  ],
  machines: [],
  executedActivities: "Transporte e compactação de material.",
  interferences: null,
  createdBy: {
    id: "00000000-0000-4000-8000-000000000004",
    email: "master@example.com",
  },
  finalizedBy: null,
  finalizedAt: null,
  createdAt: "2026-07-20T18:00:00.000Z",
  updatedAt: "2026-07-20T18:00:00.000Z",
};
