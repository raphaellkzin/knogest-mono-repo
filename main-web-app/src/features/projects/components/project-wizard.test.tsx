// @vitest-environment jsdom

import * as React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm, useWatch } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../projects.actions", () => ({
  finalizeProjectAction: vi.fn(),
  lookupProjectAddressByCepAction: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}));

import type { BaseFormModalRenderHelpers } from "@/components/modals/BaseFormModal";
import {
  MachineMobilization,
  ProjectWizard,
  ProjectWizardIdentity,
  ProjectWizardReview,
  ProjectWizardSubmissionNotice,
  type ProjectWizardOptions,
} from "./project-wizard";
import { emptyProjectCommand, type ProjectCommand } from "../projects-schema";
import { toast } from "sonner";
import { lookupProjectAddressByCepAction } from "../projects.actions";

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
  suppliedItems: [],
  units: [{ id: "unit-1", label: "L", detail: "Litro" }],
};

const command: ProjectCommand = {
  ...structuredClone(emptyProjectCommand),
  name: "Obra Norte",
  address: {
    postalCode: "60170000",
    street: "Rua A",
    number: "10",
    complement: null,
    neighborhood: "Meireles",
    city: "Fortaleza",
    state: "CE",
  },
  approvedBudget: "100.00",
  plannedStartDate: "2026-07-01",
  plannedEndDate: null,
  clientId: "client-1",
  managerEmploymentId: "employee-1",
  technicalResponsibilityEmploymentIds: ["employee-1"],
};

const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.mocked(lookupProjectAddressByCepAction).mockReset();
});

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
  it("marks invalid fields without inline validation messages", () => {
    render(<IdentityHarness />);

    expect(
      document.getElementById("project-name")?.getAttribute("aria-invalid"),
    ).toBe("true");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByLabelText("Endereço")).toBeNull();
    expect(screen.getByLabelText("CEP")).toBeTruthy();
  });

  it("shows a formal readable validation declaration when advancing with invalid data", async () => {
    const user = userEvent.setup();
    render(
      <ProjectWizard
        expectedCompanyId="00000000-0000-4000-8000-000000000001"
        options={options}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Nova obra" }));
    await user.click(screen.getByRole("button", { name: "Avançar" }));

    const declaration = await screen.findByRole("alert");
    expect(declaration.textContent).toContain("Há erros nesta etapa");
    expect(declaration.textContent).toContain("Nome da obra");
    expect(declaration.textContent).toContain("Informe o nome da obra");
    expect(declaration.textContent).toContain("Logradouro");
    expect(declaration.textContent).toContain("Informe o logradouro");
    expect(declaration.textContent).not.toContain("address.street");
    expect(declaration.textContent).not.toContain("Muito pequeno");
  });

  it("fills structured address fields from ViaCEP", async () => {
    const user = userEvent.setup();
    vi.mocked(lookupProjectAddressByCepAction).mockResolvedValue({
      kind: "success",
      address: {
        street: "Avenida Beira Mar",
        neighborhood: "Meireles",
        city: "Fortaleza",
        state: "CE",
      },
    });
    render(<IdentityHarness />);

    expect(input("Logradouro").disabled).toBe(true);
    expect(input("Latitude").disabled).toBe(false);
    expect(input("Longitude").disabled).toBe(false);
    await user.type(screen.getByLabelText("CEP"), "60170000");

    expect(await screen.findByDisplayValue("Avenida Beira Mar")).toBeTruthy();
    expect(screen.getByDisplayValue("Meireles")).toBeTruthy();
    expect(screen.getByDisplayValue("Fortaleza")).toBeTruthy();
    expect(screen.getByDisplayValue("CE")).toBeTruthy();
    expect(input("Logradouro").disabled).toBe(true);
    expect(input("Bairro").disabled).toBe(true);
    expect(input("Cidade").disabled).toBe(true);
    expect(input("UF").disabled).toBe(true);
    expect(input("Número").disabled).toBe(false);
    expect(input("Complemento (opcional)").disabled).toBe(false);
    expect(input("Latitude").disabled).toBe(false);
    expect(input("Longitude").disabled).toBe(false);
  });

  it("shows a temporary toast and releases address fields when ViaCEP fails", async () => {
    const user = userEvent.setup();
    vi.mocked(lookupProjectAddressByCepAction).mockResolvedValue({
      kind: "failure",
      message: "CEP não encontrado.",
    });
    render(<IdentityHarness />);

    await user.type(screen.getByLabelText("CEP"), "60170000");

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "CEP não encontrado. Preencha o endereço manualmente.",
        { position: "top-center", duration: 3500 },
      ),
    );
    expect(input("Logradouro").disabled).toBe(false);
    expect(input("Número").disabled).toBe(false);
    expect(input("Bairro").disabled).toBe(false);
    expect(input("Cidade").disabled).toBe(false);
    expect(input("UF").disabled).toBe(false);
    expect(input("Latitude").disabled).toBe(false);
    expect(input("Longitude").disabled).toBe(false);
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
