"use client";

import * as React from "react";
import { HardHat, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UseFormReturn } from "react-hook-form";
import {
  BaseFormModal,
  type WizardStep,
} from "@/components/modals/BaseFormModal";
import { Button } from "@/components/ui/button";
import {
  finalizeProjectAction,
  type ProjectSubmissionResult,
} from "../projects.actions";
import {
  emptyProjectCommand,
  projectCommandSchema,
  type ProjectCommand,
} from "../projects-schema";

type Option = {
  id: string;
  label: string;
  detail?: string;
  readingId?: string;
  jobRolePeriodId?: string;
};
export type ProjectWizardOptions = {
  clients: Option[];
  employees: Option[];
  machines: Option[];
  suppliers: Option[];
  fuelTypes: Array<{ id: string; name: string }>;
};

const inputClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const sectionClass = "grid gap-4 sm:grid-cols-2";

function Field({
  form,
  name,
  label,
  type = "text",
}: {
  form: UseFormReturn<ProjectCommand>;
  name: keyof ProjectCommand;
  label: string;
  type?: string;
}) {
  const error = form.formState.errors[name];
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      <input
        className={inputClass}
        type={type}
        {...form.register(name as never)}
        aria-invalid={Boolean(error)}
      />
      {error && (
        <span role="alert" className="text-destructive">
          Valor inválido
        </span>
      )}
    </label>
  );
}

function Select({
  form,
  name,
  label,
  options,
}: {
  form: UseFormReturn<ProjectCommand>;
  name: "clientId" | "managerEmploymentId";
  label: string;
  options: Option[];
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      <select className={inputClass} {...form.register(name)}>
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label} — {option.detail}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProjectIdentity({ form }: { form: UseFormReturn<ProjectCommand> }) {
  return (
    <div className={sectionClass}>
      <Field form={form} name="name" label="Nome da obra" />
      <Field
        form={form}
        name="contractNumber"
        label="Número do contrato (opcional)"
      />
      <label className="grid gap-1 text-sm font-medium sm:col-span-2">
        <span>Endereço</span>
        <textarea className={inputClass} {...form.register("address")} />
      </label>
      <Field form={form} name="latitude" label="Latitude (opcional)" />
      <Field form={form} name="longitude" label="Longitude (opcional)" />
      <Field form={form} name="approvedBudget" label="Orçamento aprovado" />
      <Field
        form={form}
        name="plannedStartDate"
        label="Início planejado"
        type="date"
      />
      <Field
        form={form}
        name="plannedEndDate"
        label="Fim planejado"
        type="date"
      />
    </div>
  );
}

function Accountability({
  form,
  options,
}: {
  form: UseFormReturn<ProjectCommand>;
  options: ProjectWizardOptions;
}) {
  const selected = form.watch("technicalResponsibilityEmploymentIds");
  return (
    <div className="space-y-4">
      <div className={sectionClass}>
        <Select
          form={form}
          name="clientId"
          label="Cliente"
          options={options.clients}
        />
        <Select
          form={form}
          name="managerEmploymentId"
          label="Gestor"
          options={options.employees}
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="font-medium">
          Responsabilidades técnicas (1–20)
        </legend>
        {options.employees.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 items-center gap-3 rounded-md border p-3"
          >
            <input
              type="checkbox"
              checked={selected.includes(option.id)}
              onChange={(event) =>
                form.setValue(
                  "technicalResponsibilityEmploymentIds",
                  event.target.checked
                    ? [...selected, option.id]
                    : selected.filter((id) => id !== option.id),
                  { shouldDirty: true, shouldValidate: true },
                )
              }
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}

function Schedule({ form }: { form: UseFormReturn<ProjectCommand> }) {
  const days = form.watch("weeklySchedule");
  const breaks = form.watch("breakTemplates");
  const labels = [
    "Segunda",
    "Terça",
    "Quarta",
    "Quinta",
    "Sexta",
    "Sábado",
    "Domingo",
  ];
  return (
    <div className="space-y-3">
      {days.map((day, index) => (
        <fieldset
          key={day.dayOfWeek}
          className="grid items-end gap-3 rounded-md border p-3 sm:grid-cols-3"
        >
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={day.isWorking}
              onChange={(event) => {
                const next = [...days];
                next[index] = {
                  ...day,
                  isWorking: event.target.checked,
                  startTime: event.target.checked ? "08:00" : null,
                  endTime: event.target.checked ? "17:00" : null,
                };
                form.setValue("weeklySchedule", next, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
              }}
            />
            {labels[index]}
          </label>
          <label className="grid gap-1 text-sm">
            Início
            <input
              className={inputClass}
              type="time"
              disabled={!day.isWorking}
              {...form.register(`weeklySchedule.${index}.startTime`)}
            />
          </label>
          <label className="grid gap-1 text-sm">
            Fim
            <input
              className={inputClass}
              type="time"
              disabled={!day.isWorking}
              {...form.register(`weeklySchedule.${index}.endTime`)}
            />
          </label>
        </fieldset>
      ))}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">Intervalos sugeridos</h3>
          <Button
            type="button"
            variant="outline"
            disabled={breaks.length >= 10}
            onClick={() =>
              form.setValue(
                "breakTemplates",
                [...breaks, { name: "Intervalo", durationMinutes: 60 }],
                { shouldDirty: true },
              )
            }
          >
            Adicionar
          </Button>
        </div>
        {breaks.map((item, index) => (
          <div
            key={`${index}-${item.name}`}
            className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]"
          >
            <input
              className={inputClass}
              aria-label={`Nome do intervalo ${index + 1}`}
              {...form.register(`breakTemplates.${index}.name`)}
            />
            <input
              className={inputClass}
              aria-label={`Duração do intervalo ${index + 1}`}
              type="number"
              min={1}
              max={1440}
              {...form.register(`breakTemplates.${index}.durationMinutes`)}
            />
            <Button
              type="button"
              variant="outline"
              aria-label={`Remover intervalo ${index + 1}`}
              onClick={() =>
                form.setValue(
                  "breakTemplates",
                  breaks.filter((_, itemIndex) => itemIndex !== index),
                  { shouldDirty: true },
                )
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}

function EmployeeMobilization({
  form,
  options,
}: {
  form: UseFormReturn<ProjectCommand>;
  options: ProjectWizardOptions;
}) {
  const allocations = form.watch("initialEmployeeAllocations");
  const replaceAllocation = (employmentId: string, patch: Partial<ProjectCommand["initialEmployeeAllocations"][number]>) =>
    form.setValue("initialEmployeeAllocations", allocations.map((item) => item.employmentId === employmentId ? { ...item, ...patch } : item), { shouldDirty: true, shouldValidate: true });
  return (
    <div className="space-y-3">
      <p>{allocations.length} selecionado(s)</p>
      {options.employees.map((option) => {
        const selected = allocations.some(
          (item) => item.employmentId === option.id,
        );
        return (
          <div
            key={option.id}
            className="space-y-3 rounded-md border p-3"
          >
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" checked={selected} onChange={(event) =>
                form.setValue(
                  "initialEmployeeAllocations",
                  event.target.checked
                    ? [
                        ...allocations,
                        {
                          employmentId: option.id,
                          confirmedJobRolePeriodId: "",
                          expectedDailyWorkloadMinutes: 480,
                          compensationMode: "monthly",
                          compensationValue: "0.00",
                          overtimeRate: "0.00",
                        },
                      ]
                    : allocations.filter(
                        (item) => item.employmentId !== option.id,
                      ),
                  { shouldDirty: true, shouldValidate: true },
                )
              } />
              <span>{option.label}{option.detail ? ` — ${option.detail}` : ""}</span>
            </label>
            {selected && (() => {
              const allocation = allocations.find((item) => item.employmentId === option.id)!;
              const confirmed = allocation.confirmedJobRolePeriodId === option.jobRolePeriodId;
              return <div className="grid gap-3 border-t pt-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={confirmed} onChange={(event) => replaceAllocation(option.id, { confirmedJobRolePeriodId: event.target.checked ? option.jobRolePeriodId! : "" })} />Confirmo a função {option.detail} para esta obra</label>
                <label className="grid gap-1 text-sm font-medium">Carga diária (minutos)<input className={inputClass} type="number" min="1" max="1440" value={allocation.expectedDailyWorkloadMinutes} onChange={(event) => replaceAllocation(option.id, { expectedDailyWorkloadMinutes: Number(event.target.value) })} /></label>
                <label className="grid gap-1 text-sm font-medium">Modalidade de pagamento<select className={inputClass} value={allocation.compensationMode} onChange={(event) => replaceAllocation(option.id, { compensationMode: event.target.value as typeof allocation.compensationMode })}><option value="daily">Diária</option><option value="hourly">Hora</option><option value="weekly">Semanal</option><option value="fortnightly">Quinzenal</option><option value="monthly">Mensal</option></select></label>
                <label className="grid gap-1 text-sm font-medium">Valor<input className={inputClass} inputMode="decimal" value={allocation.compensationValue} onChange={(event) => replaceAllocation(option.id, { compensationValue: event.target.value })} /></label>
                <label className="grid gap-1 text-sm font-medium">Hora extra<input className={inputClass} inputMode="decimal" value={allocation.overtimeRate} onChange={(event) => replaceAllocation(option.id, { overtimeRate: event.target.value })} /></label>
              </div>;
            })()}
          </div>
        );
      })}
    </div>
  );
}

function MachineMobilization({
  form,
  options,
}: {
  form: UseFormReturn<ProjectCommand>;
  options: ProjectWizardOptions;
}) {
  const allocations = form.watch("initialMachineAllocations");
  return (
    <div className="space-y-3">
      <p>{allocations.length} selecionada(s)</p>
      {options.machines.map((option) => {
        const selected = allocations.some(
          (item) => item.machineId === option.id,
        );
        return (
          <label
            key={option.id}
            className="flex min-h-11 items-center gap-3 rounded-md border p-3"
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) =>
                form.setValue(
                  "initialMachineAllocations",
                  event.target.checked
                    ? [
                        ...allocations,
                        {
                          machineId: option.id,
                          startMeterReadingId: option.readingId!,
                        },
                      ]
                    : allocations.filter(
                        (item) => item.machineId !== option.id,
                      ),
                  { shouldDirty: true, shouldValidate: true },
                )
              }
            />
            {option.label} — leitura {option.detail}
          </label>
        );
      })}
    </div>
  );
}

function FuelAgreements({
  form,
  options,
}: {
  form: UseFormReturn<ProjectCommand>;
  options: ProjectWizardOptions;
}) {
  const agreements = form.watch("projectFuelAgreements");
  return (
    <div className="space-y-3">
      <p>Opcional — {agreements.length}/10 acordo(s)</p>
      {options.suppliers.map((option) => {
        const selected = agreements.some(
          (item) => item.fuelSupplierId === option.id,
        );
        return (
          <label
            key={option.id}
            className="flex min-h-11 items-center gap-3 rounded-md border p-3"
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={(event) =>
                form.setValue(
                  "projectFuelAgreements",
                  event.target.checked
                    ? [
                        ...agreements,
                        {
                          fuelSupplierId: option.id,
                          fuelTypes: [
                            {
                              fuelTypeId: "diesel-s10",
                              pricePerLiter: "1.0000",
                            },
                          ],
                        },
                      ]
                    : agreements.filter(
                        (item) => item.fuelSupplierId !== option.id,
                      ),
                  { shouldDirty: true, shouldValidate: true },
                )
              }
            />
            {option.label} — Diesel S10 inicial
          </label>
        );
      })}
    </div>
  );
}

function Review({ form }: { form: UseFormReturn<ProjectCommand> }) {
  const value = form.getValues();
  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4">
        <h3 className="font-semibold">{value.name || "Obra sem nome"}</h3>
        <p>{value.address}</p>
        <p>Contrato: {value.contractNumber || "Não informado"}</p>
        <p>Orçamento: R$ {value.approvedBudget}</p>
      </div>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="font-medium">Responsabilidades técnicas</dt>
          <dd>{value.technicalResponsibilityEmploymentIds.length}</dd>
        </div>
        <div>
          <dt className="font-medium">Funcionários iniciais</dt>
          <dd>{value.initialEmployeeAllocations.length}</dd>
        </div>
        <div>
          <dt className="font-medium">Máquinas iniciais</dt>
          <dd>{value.initialMachineAllocations.length}</dd>
        </div>
        <div>
          <dt className="font-medium">Acordos de combustível</dt>
          <dd>{value.projectFuelAgreements.length}</dd>
        </div>
      </dl>
    </div>
  );
}

export function ProjectWizard({
  expectedCompanyId,
  options,
}: {
  expectedCompanyId: string;
  options: ProjectWizardOptions;
}) {
  const router = useRouter();
  const [key, setKey] = React.useState("");
  const [result, setResult] = React.useState<ProjectSubmissionResult | null>(
    null,
  );
  const [snapshot, setSnapshot] = React.useState<ProjectCommand | null>(null);
  const steps = React.useMemo<WizardStep<ProjectCommand>[]>(
    () => [
      {
        title: "Identidade",
        fields: [
          "name",
          "address",
          "latitude",
          "longitude",
          "contractNumber",
          "approvedBudget",
          "plannedStartDate",
          "plannedEndDate",
        ],
        component: (form) => <ProjectIdentity form={form} />,
      },
      {
        title: "Responsáveis",
        fields: [
          "clientId",
          "managerEmploymentId",
          "technicalResponsibilityEmploymentIds",
        ],
        component: (form) => <Accountability form={form} options={options} />,
      },
      {
        title: "Agenda",
        fields: ["weeklySchedule", "breakTemplates"],
        component: (form) => <Schedule form={form} />,
      },
      {
        title: "Equipe",
        fields: ["initialEmployeeAllocations"],
        component: (form) => (
          <EmployeeMobilization form={form} options={options} />
        ),
      },
      {
        title: "Máquinas",
        fields: ["initialMachineAllocations"],
        component: (form) => (
          <MachineMobilization form={form} options={options} />
        ),
      },
      {
        title: "Combustível",
        fields: ["projectFuelAgreements"],
        component: (form) => <FuelAgreements form={form} options={options} />,
      },
      {
        title: "Revisão",
        fields: [],
        component: (form) => <Review form={form} />,
      },
    ],
    [options],
  );

  const submit = async (command: ProjectCommand) => {
    const frozen = snapshot ?? structuredClone(command);
    setSnapshot(frozen);
    const next = await finalizeProjectAction({
      idempotencyKey: key,
      expectedCompanyId,
      command: frozen,
    });
    setResult(next);
    if (next.kind === "success") {
      setSnapshot(null);
      setKey("");
      router.replace(`/home/obras/${next.projectId}`);
      router.refresh();
      return true;
    }
    if (next.kind === "recoverable-conflict") setSnapshot(null);
    return false;
  };

  return (
    <div className="space-y-2">
      <BaseFormModal<ProjectCommand>
        title="Nova obra"
        description="Os dados existem somente enquanto este assistente estiver aberto; nenhum rascunho é salvo."
        icon={HardHat}
        size="xl"
        schema={projectCommandSchema}
        defaultValues={emptyProjectCommand}
        steps={steps}
        submitLabel={snapshot ? "Tentar novamente" : "Criar obra"}
        onSessionStart={() => {
          setKey(crypto.randomUUID());
          setResult(null);
          setSnapshot(null);
        }}
        confirmClose={() =>
          snapshot
            ? window.confirm(
                "O resultado da criação é desconhecido. Consulte o registro antes de iniciar outra obra. Deseja descartar mesmo assim?",
              )
            : window.confirm("Descartar os dados não salvos desta obra?")
        }
        onSubmit={submit}
        trigger={
          <Button type="button" size="lg">
            <Plus className="size-4" />
            Nova obra
          </Button>
        }
      />
      {result?.kind === "recoverable-conflict" && (
        <p role="alert" className="text-sm text-destructive">
          Alguns dados mudaram. Revise as seções marcadas e envie novamente.
          Código: {result.code}
        </p>
      )}
      {result?.kind === "unknown-outcome" && (
        <p role="alert" className="text-sm text-amber-700">
          Não foi possível confirmar o resultado. Use “Tentar novamente” sem
          alterar os dados.
        </p>
      )}
      {result?.kind === "terminal-failure" && (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível concluir esta sessão. Código: {result.code}
        </p>
      )}
    </div>
  );
}
