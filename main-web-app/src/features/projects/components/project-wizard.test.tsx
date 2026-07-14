// @vitest-environment jsdom

import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useWatch } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../projects.actions", () => ({
  finalizeProjectAction: vi.fn(),
}));

import type { BaseFormModalRenderHelpers } from "@/components/modals/BaseFormModal";
import {
  MachineMobilization,
  ProjectWizardIdentity,
  ProjectWizardReview,
  ProjectWizardSubmissionNotice,
  type ProjectWizardOptions,
} from "./project-wizard";
import { emptyProjectCommand, type ProjectCommand } from "../projects-schema";

const options: ProjectWizardOptions = {
  clients: [{ id: "client-1", label: "Cliente Norte" }],
  employees: [{ id: "employee-1", label: "Ana Silva", detail: "Engenheira" }],
  machines: [
    {
      id: "machine-1",
      label: "Escavadeira",
      detail: "10.00",
      readingId: "reading-1",
    },
  ],
  suppliers: [],
  fuelTypes: [],
};

const command: ProjectCommand = {
  ...structuredClone(emptyProjectCommand),
  name: "Obra Norte",
  address: "Rua A, 10",
  approvedBudget: "100.00",
  plannedStartDate: "2026-07-01",
  plannedEndDate: "2026-07-31",
  clientId: "client-1",
  managerEmploymentId: "employee-1",
  technicalResponsibilityEmploymentIds: ["employee-1"],
};

afterEach(cleanup);

function IdentityHarness() {
  const form = useForm<ProjectCommand>({ defaultValues: emptyProjectCommand });

  React.useEffect(() => {
    form.setError("name", {
      type: "required",
      message: "Informe o nome da obra.",
    });
  }, [form]);

  return <ProjectWizardIdentity form={form} />;
}

function ReviewHarness() {
  const form = useForm<ProjectCommand>({ defaultValues: command });
  const [step, setStep] = React.useState<number | null>(null);
  const helpers: BaseFormModalRenderHelpers = {
    closeModal: () => undefined,
    currentStep: 6,
    goToStep: setStep,
  };

  return (
    <>
      <ProjectWizardReview form={form} helpers={helpers} options={options} />
      <output>
        {form.getValues("name")}:{step ?? "none"}
      </output>
    </>
  );
}

function MachineHarness() {
  const form = useForm<ProjectCommand>({
    defaultValues: {
      ...structuredClone(emptyProjectCommand),
      initialEmployeeAllocations: [
        {
          employmentId: "employee-1",
          confirmedJobRolePeriodId: "role-period-1",
          expectedDailyWorkloadMinutes: 480,
          compensationMode: "monthly",
          compensationValue: "0.00",
          overtimeRate: "0.00",
        },
      ],
    },
  });
  const machineAllocations = useWatch({
    control: form.control,
    name: "initialMachineAllocations",
  });

  return (
    <>
      <MachineMobilization form={form} options={options} />
      <button
        type="button"
        onClick={() =>
          form.setValue("initialEmployeeAllocations", [], {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      >
        Remover equipe
      </button>
      <output>{JSON.stringify(machineAllocations)}</output>
    </>
  );
}

describe("Project wizard polish", () => {
  it("shows field-level validation feedback in the operational form", async () => {
    render(<IdentityHarness />);

    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
    expect(
      document.getElementById("project-name")?.getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("returns to a review section without discarding the entered data", async () => {
    const user = userEvent.setup();
    render(<ReviewHarness />);

    await user.click(screen.getAllByRole("button", { name: "Alterar" })[0]);

    expect(screen.getByText("Obra Norte:0")).toBeTruthy();
  });

  it("explains an unknown finalization outcome with a safe recovery action", () => {
    render(
      <ProjectWizardSubmissionNotice result={{ kind: "unknown-outcome" }} />,
    );

    expect(screen.getByRole("alert").textContent).toContain("Tentar novamente");
    expect(screen.getByRole("alert").textContent).toContain(
      "consulte o registro de obras",
    );
  });

  it("requires a selected Machine to use an operator from the initial team", async () => {
    const user = userEvent.setup();
    render(<MachineHarness />);

    await user.click(screen.getByLabelText(/Escavadeira/));
    await user.selectOptions(screen.getByLabelText("Operador"), "employee-1");

    expect(screen.getByRole("status").textContent).toContain(
      '"operatorEmploymentId":"employee-1"',
    );

    await user.click(screen.getByRole("button", { name: "Remover equipe" }));

    expect(screen.getByRole("status").textContent).toContain(
      '"operatorEmploymentId":""',
    );
  });
});
