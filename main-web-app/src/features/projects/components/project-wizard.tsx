"use client";

import * as React from "react";
import { HardHat, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { UseFormReturn } from "react-hook-form";

import {
  BaseFormModal,
  type BaseFormModalRenderHelpers,
  type WizardStep,
} from "@/components/modals/BaseFormModal";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
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

const controlClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";
const fieldGridClass = "grid gap-3 md:grid-cols-2";

function errorMessage(error: unknown) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  )
    return error.message;
  return undefined;
}

function FieldError({ id, error }: { id: string; error: unknown }) {
  const message = errorMessage(error);
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

function FormField({
  form,
  label,
  name,
  type = "text",
}: {
  form: UseFormReturn<ProjectCommand>;
  label: string;
  name: keyof ProjectCommand;
  type?: React.HTMLInputTypeAttribute;
}) {
  const id = `project-${String(name)}`;
  const error = form.formState.errors[name];
  const descriptionId = `${id}-error`;
  return (
    <label className="grid gap-1.5 text-sm font-semibold" htmlFor={id}>
      <span>{label}</span>
      <Input
        id={id}
        type={type}
        className="h-11"
        aria-describedby={error ? descriptionId : undefined}
        aria-invalid={Boolean(error)}
        {...form.register(name as never)}
      />
      <FieldError id={descriptionId} error={error} />
    </label>
  );
}

function FormSelect({
  form,
  label,
  name,
  options,
}: {
  form: UseFormReturn<ProjectCommand>;
  label: string;
  name: "clientId" | "managerEmploymentId";
  options: Option[];
}) {
  const id = `project-${name}`;
  const error = form.formState.errors[name];
  const descriptionId = `${id}-error`;
  return (
    <label className="grid gap-1.5 text-sm font-semibold" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        className={controlClass}
        aria-describedby={error ? descriptionId : undefined}
        aria-invalid={Boolean(error)}
        {...form.register(name)}
      >
        <option value="">Selecione</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
            {option.detail ? ` — ${option.detail}` : ""}
          </option>
        ))}
      </select>
      <FieldError id={descriptionId} error={error} />
    </label>
  );
}

function SelectionRow({
  checked,
  children,
  disabled,
  onChange,
}: {
  checked: boolean;
  children: React.ReactNode;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold transition-colors",
        checked && "border-primary bg-primary/5",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 accent-primary"
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function GroupError({ error, id }: { error: unknown; id: string }) {
  const message = errorMessage(error);
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-sm font-medium text-destructive">
      {message}
    </p>
  );
}

export function ProjectWizardIdentity({
  form,
}: {
  form: UseFormReturn<ProjectCommand>;
}) {
  const addressError = form.formState.errors.address;
  return (
    <div className="grid gap-4">
      <FormSection title="Identificação">
        <div className={fieldGridClass}>
          <FormField form={form} name="name" label="Nome da obra" />
          <FormField
            form={form}
            name="contractNumber"
            label="Número do contrato"
          />
        </div>
      </FormSection>

      <FormSection title="Localização">
        <label
          className="grid gap-1.5 text-sm font-semibold"
          htmlFor="project-address"
        >
          <span>Endereço</span>
          <textarea
            id="project-address"
            rows={3}
            className={cn(controlClass, "min-h-24 resize-y")}
            aria-describedby={
              addressError ? "project-address-error" : undefined
            }
            aria-invalid={Boolean(addressError)}
            {...form.register("address")}
          />
          <FieldError id="project-address-error" error={addressError} />
        </label>
        <div className={fieldGridClass}>
          <FormField form={form} name="latitude" label="Latitude" />
          <FormField form={form} name="longitude" label="Longitude" />
        </div>
      </FormSection>

      <FormSection title="Planejamento comercial">
        <div className={fieldGridClass}>
          <FormField
            form={form}
            name="approvedBudget"
            label="Orçamento aprovado"
            type="number"
          />
          <span className="hidden md:block" aria-hidden="true" />
          <FormField
            form={form}
            name="plannedStartDate"
            label="Início planejado"
            type="date"
          />
          <FormField
            form={form}
            name="plannedEndDate"
            label="Fim planejado"
            type="date"
          />
        </div>
      </FormSection>
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
  const error = form.formState.errors.technicalResponsibilityEmploymentIds;
  return (
    <div className="grid gap-4">
      <FormSection title="Cliente e gestão">
        <div className={fieldGridClass}>
          <FormSelect
            form={form}
            name="clientId"
            label="Cliente"
            options={options.clients}
          />
          <FormSelect
            form={form}
            name="managerEmploymentId"
            label="Gestor da obra"
            options={options.employees}
          />
        </div>
      </FormSection>

      <FormSection
        title="Responsabilidades técnicas"
        description="Selecione de 1 a 20 responsáveis técnicos para esta obra."
      >
        <div
          className="grid gap-2"
          aria-describedby={
            error ? "technical-responsibilities-error" : undefined
          }
        >
          {options.employees.length > 0 ? (
            options.employees.map((option) => {
              const checked = selected.includes(option.id);
              return (
                <SelectionRow
                  key={option.id}
                  checked={checked}
                  onChange={(nextChecked) =>
                    form.setValue(
                      "technicalResponsibilityEmploymentIds",
                      nextChecked
                        ? [...selected, option.id]
                        : selected.filter((id) => id !== option.id),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                >
                  {option.label}
                  {option.detail ? ` — ${option.detail}` : ""}
                </SelectionRow>
              );
            })
          ) : (
            <p className="text-sm font-medium text-muted-foreground">
              Nenhum funcionário disponível para seleção.
            </p>
          )}
        </div>
        <GroupError id="technical-responsibilities-error" error={error} />
      </FormSection>
    </div>
  );
}

function Schedule({ form }: { form: UseFormReturn<ProjectCommand> }) {
  const days = form.watch("weeklySchedule");
  const breaks = form.watch("breakTemplates");
  const labels = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
    "Domingo",
  ];
  const scheduleError = form.formState.errors.weeklySchedule;
  const breaksError = form.formState.errors.breakTemplates;

  return (
    <div className="grid gap-4">
      <FormSection
        title="Jornada semanal"
        description="Defina os dias de trabalho e os horários previstos da obra."
      >
        <div
          className="divide-y divide-border rounded-md border border-border bg-background"
          aria-describedby={scheduleError ? "weekly-schedule-error" : undefined}
        >
          {days.map((day, index) => (
            <div
              key={day.dayOfWeek}
              className="grid gap-3 p-3 sm:grid-cols-[minmax(9rem,1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-end"
            >
              <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={day.isWorking}
                  className="size-4 accent-primary"
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
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>Início</span>
                <Input
                  type="time"
                  className="h-11"
                  disabled={!day.isWorking}
                  {...form.register(`weeklySchedule.${index}.startTime`)}
                />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>Fim</span>
                <Input
                  type="time"
                  className="h-11"
                  disabled={!day.isWorking}
                  {...form.register(`weeklySchedule.${index}.endTime`)}
                />
              </label>
            </div>
          ))}
        </div>
        <GroupError id="weekly-schedule-error" error={scheduleError} />
      </FormSection>

      <FormSection
        title="Intervalos sugeridos"
        description="Opcional. Adicione até 10 pausas previstas para a equipe."
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted-foreground">
            {breaks.length}/10 intervalo(s) configurado(s)
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={breaks.length >= 10}
            onClick={() =>
              form.setValue(
                "breakTemplates",
                [...breaks, { name: "Intervalo", durationMinutes: 60 }],
                { shouldDirty: true, shouldValidate: true },
              )
            }
          >
            Adicionar intervalo
          </Button>
        </div>
        {breaks.length > 0 && (
          <div className="grid gap-3">
            {breaks.map((item, index) => (
              <div
                key={`${index}-${item.name}`}
                className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end"
              >
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Nome do intervalo</span>
                  <Input
                    className="h-11"
                    aria-label={`Nome do intervalo ${index + 1}`}
                    {...form.register(`breakTemplates.${index}.name`)}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Duração (minutos)</span>
                  <Input
                    className="h-11"
                    type="number"
                    min={1}
                    max={1440}
                    aria-label={`Duração do intervalo ${index + 1}`}
                    {...form.register(
                      `breakTemplates.${index}.durationMinutes`,
                    )}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  aria-label={`Remover intervalo ${index + 1}`}
                  onClick={() =>
                    form.setValue(
                      "breakTemplates",
                      breaks.filter((_, itemIndex) => itemIndex !== index),
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        <GroupError id="break-templates-error" error={breaksError} />
      </FormSection>
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
  const error = form.formState.errors.initialEmployeeAllocations;
  const replaceAllocation = (
    employmentId: string,
    patch: Partial<ProjectCommand["initialEmployeeAllocations"][number]>,
  ) =>
    form.setValue(
      "initialEmployeeAllocations",
      allocations.map((item) =>
        item.employmentId === employmentId ? { ...item, ...patch } : item,
      ),
      { shouldDirty: true, shouldValidate: true },
    );

  return (
    <FormSection
      title="Mobilização inicial da equipe"
      description="Opcional. Selecione quem inicia na obra e confirme as condições de trabalho."
    >
      <p className="text-sm font-semibold text-muted-foreground">
        {allocations.length} funcionário(s) selecionado(s)
      </p>
      <div
        className="grid gap-3"
        aria-describedby={error ? "employee-mobilization-error" : undefined}
      >
        {options.employees.length > 0 ? (
          options.employees.map((option) => {
            const allocation = allocations.find(
              (item) => item.employmentId === option.id,
            );
            const selected = Boolean(allocation);
            const roleCanBeConfirmed = Boolean(option.jobRolePeriodId);
            return (
              <div key={option.id} className="grid gap-3">
                <SelectionRow
                  checked={selected}
                  onChange={(nextChecked) =>
                    form.setValue(
                      "initialEmployeeAllocations",
                      nextChecked
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
                  }
                >
                  {option.label}
                  {option.detail ? ` — ${option.detail}` : ""}
                </SelectionRow>
                {allocation && (
                  <div className="grid gap-3 border-t border-border pt-3 md:grid-cols-2">
                    <label className="flex min-h-11 items-center gap-2 text-sm font-semibold md:col-span-2">
                      <input
                        type="checkbox"
                        checked={
                          roleCanBeConfirmed &&
                          allocation.confirmedJobRolePeriodId ===
                            option.jobRolePeriodId
                        }
                        disabled={!roleCanBeConfirmed}
                        className="size-4 accent-primary"
                        onChange={(event) =>
                          replaceAllocation(option.id, {
                            confirmedJobRolePeriodId: event.target.checked
                              ? (option.jobRolePeriodId ?? "")
                              : "",
                          })
                        }
                      />
                      {roleCanBeConfirmed
                        ? `Confirmo a função ${option.detail} para esta obra`
                        : "Função indisponível para confirmação"}
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold">
                      <span>Carga diária (minutos)</span>
                      <Input
                        className="h-11"
                        type="number"
                        min={1}
                        max={1440}
                        value={allocation.expectedDailyWorkloadMinutes}
                        onChange={(event) =>
                          replaceAllocation(option.id, {
                            expectedDailyWorkloadMinutes: Number(
                              event.target.value,
                            ),
                          })
                        }
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold">
                      <span>Modalidade de pagamento</span>
                      <select
                        className={controlClass}
                        value={allocation.compensationMode}
                        onChange={(event) =>
                          replaceAllocation(option.id, {
                            compensationMode: event.target
                              .value as typeof allocation.compensationMode,
                          })
                        }
                      >
                        <option value="daily">Diária</option>
                        <option value="hourly">Hora</option>
                        <option value="weekly">Semanal</option>
                        <option value="fortnightly">Quinzenal</option>
                        <option value="monthly">Mensal</option>
                      </select>
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold">
                      <span>Valor</span>
                      <Input
                        className="h-11"
                        inputMode="decimal"
                        value={allocation.compensationValue}
                        onChange={(event) =>
                          replaceAllocation(option.id, {
                            compensationValue: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="grid gap-1.5 text-sm font-semibold">
                      <span>Hora extra</span>
                      <Input
                        className="h-11"
                        inputMode="decimal"
                        value={allocation.overtimeRate}
                        onChange={(event) =>
                          replaceAllocation(option.id, {
                            overtimeRate: event.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum funcionário disponível para mobilização.
          </p>
        )}
      </div>
      <GroupError id="employee-mobilization-error" error={error} />
    </FormSection>
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
  const error = form.formState.errors.initialMachineAllocations;
  return (
    <FormSection
      title="Mobilização inicial de máquinas"
      description="Opcional. Selecione as máquinas que estarão disponíveis desde o início da obra."
    >
      <p className="text-sm font-semibold text-muted-foreground">
        {allocations.length} máquina(s) selecionada(s)
      </p>
      <div
        className="grid gap-2"
        aria-describedby={error ? "machine-mobilization-error" : undefined}
      >
        {options.machines.length > 0 ? (
          options.machines.map((option) => {
            const checked = allocations.some(
              (item) => item.machineId === option.id,
            );
            return (
              <SelectionRow
                key={option.id}
                checked={checked}
                disabled={!option.readingId}
                onChange={(nextChecked) =>
                  form.setValue(
                    "initialMachineAllocations",
                    nextChecked && option.readingId
                      ? [
                          ...allocations,
                          {
                            machineId: option.id,
                            startMeterReadingId: option.readingId,
                          },
                        ]
                      : allocations.filter(
                          (item) => item.machineId !== option.id,
                        ),
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
              >
                {option.label}
                {option.detail ? ` — leitura ${option.detail}` : ""}
                {!option.readingId ? " — leitura indisponível" : ""}
              </SelectionRow>
            );
          })
        ) : (
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma máquina disponível para mobilização.
          </p>
        )}
      </div>
      <GroupError id="machine-mobilization-error" error={error} />
    </FormSection>
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
  const error = form.formState.errors.projectFuelAgreements;
  return (
    <FormSection
      title="Acordos de combustível"
      description="Opcional. Selecione até 10 fornecedores para iniciar o abastecimento da obra."
    >
      <p className="text-sm font-semibold text-muted-foreground">
        {agreements.length}/10 acordo(s) configurado(s)
      </p>
      <div
        className="grid gap-2"
        aria-describedby={error ? "fuel-agreements-error" : undefined}
      >
        {options.suppliers.length > 0 ? (
          options.suppliers.map((option) => {
            const checked = agreements.some(
              (item) => item.fuelSupplierId === option.id,
            );
            return (
              <SelectionRow
                key={option.id}
                checked={checked}
                onChange={(nextChecked) =>
                  form.setValue(
                    "projectFuelAgreements",
                    nextChecked
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
              >
                {option.label} — Diesel S10 inicial
              </SelectionRow>
            );
          })
        ) : (
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum fornecedor de combustível disponível.
          </p>
        )}
      </div>
      <GroupError id="fuel-agreements-error" error={error} />
    </FormSection>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid gap-0.5 sm:grid-cols-[minmax(10rem,0.8fr)_minmax(0,1.2fr)] sm:gap-3">
      <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}

function ChangeStepButton({
  helpers,
  step,
}: {
  helpers: BaseFormModalRenderHelpers;
  step: number;
}) {
  return (
    <Button
      type="button"
      variant="link"
      className="h-auto justify-self-start px-0 py-0 text-sm"
      onClick={() => helpers.goToStep(step)}
    >
      Alterar
    </Button>
  );
}

export function ProjectWizardReview({
  form,
  helpers,
  options,
}: {
  form: UseFormReturn<ProjectCommand>;
  helpers: BaseFormModalRenderHelpers;
  options: ProjectWizardOptions;
}) {
  const value = form.getValues();
  const labelFor = (items: Option[], id: string) =>
    items.find((item) => item.id === id)?.label ?? "Não informado";
  const formatMoney = (amount: string) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(amount));

  return (
    <div className="grid gap-4">
      <FormSection title="Identificação">
        <dl className="grid gap-3">
          <SummaryRow label="Obra" value={value.name || "Não informado"} />
          <SummaryRow
            label="Contrato"
            value={value.contractNumber || "Não informado"}
          />
          <SummaryRow
            label="Endereço"
            value={value.address || "Não informado"}
          />
          <SummaryRow
            label="Coordenadas"
            value={
              value.latitude && value.longitude
                ? `${value.latitude}, ${value.longitude}`
                : "Não informado"
            }
          />
          <SummaryRow
            label="Orçamento aprovado"
            value={formatMoney(value.approvedBudget)}
          />
          <SummaryRow
            label="Período planejado"
            value={
              value.plannedStartDate && value.plannedEndDate
                ? `${value.plannedStartDate} a ${value.plannedEndDate}`
                : "Não informado"
            }
          />
        </dl>
        <ChangeStepButton helpers={helpers} step={0} />
      </FormSection>

      <FormSection title="Responsáveis">
        <dl className="grid gap-3">
          <SummaryRow
            label="Cliente"
            value={labelFor(options.clients, value.clientId)}
          />
          <SummaryRow
            label="Gestor"
            value={labelFor(options.employees, value.managerEmploymentId)}
          />
          <SummaryRow
            label="Responsáveis técnicos"
            value={
              value.technicalResponsibilityEmploymentIds.length > 0
                ? value.technicalResponsibilityEmploymentIds
                    .map((id) => labelFor(options.employees, id))
                    .join(", ")
                : "Não informado"
            }
          />
        </dl>
        <ChangeStepButton helpers={helpers} step={1} />
      </FormSection>

      <FormSection title="Configuração inicial">
        <dl className="grid gap-3">
          <SummaryRow
            label="Dias de trabalho"
            value={`${value.weeklySchedule.filter((day) => day.isWorking).length} por semana`}
          />
          <SummaryRow
            label="Intervalos"
            value={
              value.breakTemplates.length > 0
                ? `${value.breakTemplates.length} configurado(s)`
                : "Não informado"
            }
          />
          <SummaryRow
            label="Equipe inicial"
            value={
              value.initialEmployeeAllocations.length > 0
                ? `${value.initialEmployeeAllocations.length} funcionário(s)`
                : "Não informado"
            }
          />
          <SummaryRow
            label="Máquinas iniciais"
            value={
              value.initialMachineAllocations.length > 0
                ? `${value.initialMachineAllocations.length} máquina(s)`
                : "Não informado"
            }
          />
          <SummaryRow
            label="Acordos de combustível"
            value={
              value.projectFuelAgreements.length > 0
                ? `${value.projectFuelAgreements.length} acordo(s)`
                : "Não informado"
            }
          />
        </dl>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          <ChangeStepButton helpers={helpers} step={2} />
          <ChangeStepButton helpers={helpers} step={3} />
          <ChangeStepButton helpers={helpers} step={4} />
          <ChangeStepButton helpers={helpers} step={5} />
        </div>
      </FormSection>
    </div>
  );
}

export function ProjectWizardSubmissionNotice({
  result,
}: {
  result: ProjectSubmissionResult | null;
}) {
  if (!result || result.kind === "success") return null;

  const content = {
    "recoverable-conflict": {
      className: "border-amber-300 bg-amber-50 text-amber-950",
      title: "Revise os dados antes de tentar novamente.",
      description:
        "Algumas informações mudaram enquanto esta obra era preparada. Seus dados continuam disponíveis para ajuste.",
    },
    "unknown-outcome": {
      className: "border-amber-300 bg-amber-50 text-amber-950",
      title: "Não foi possível confirmar a criação da obra.",
      description:
        "Use “Tentar novamente” sem alterar os dados ou consulte o registro de obras antes de iniciar uma nova criação.",
    },
    "terminal-failure": {
      className: "border-destructive/40 bg-destructive/10 text-foreground",
      title: "Não foi possível concluir esta criação.",
      description:
        "Corrija os dados informados ou tente novamente mais tarde. A obra ainda não foi criada.",
    },
  }[result.kind];

  return (
    <div
      role="alert"
      className={cn("rounded-md border px-3 py-3 text-sm", content.className)}
    >
      <p className="font-bold">{content.title}</p>
      <p className="mt-1 leading-5">{content.description}</p>
      {result.kind !== "unknown-outcome" && (
        <p className="mt-2 text-xs font-semibold">Código: {result.code}</p>
      )}
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
        component: (form) => <ProjectWizardIdentity form={form} />,
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
        component: (form, helpers) => (
          <ProjectWizardReview
            form={form}
            helpers={helpers}
            options={options}
          />
        ),
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
    <BaseFormModal<ProjectCommand>
      title="Nova obra"
      description="Os dados existem somente enquanto este assistente estiver aberto; nenhum rascunho é salvo."
      icon={HardHat}
      size="xl"
      schema={projectCommandSchema}
      defaultValues={emptyProjectCommand}
      steps={steps}
      notice={<ProjectWizardSubmissionNotice result={result} />}
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
  );
}
