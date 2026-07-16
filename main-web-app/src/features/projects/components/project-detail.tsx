"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  CircleAlert,
  Fuel,
  Gauge,
  HardHat,
  PackageCheck,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  Truck,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { OperationsModal } from "@/components/ui/operations-modal";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { OperationTabs } from "@/components/ui/operation-tabs";
import {
  canonicalDecimalToBrazilian,
  decimalInputToCanonical,
  formatBrazilianDecimalInput,
} from "@/lib/brazilian-input-mask";
import { cn } from "@/lib/utils";
import {
  activateProjectAction,
  saveProjectReadinessAction,
  type ProjectReadinessActionInput,
} from "../projects.actions";
import { emptyProjectCommand, type ProjectCommand } from "../projects-schema";
import type {
  CompensationMode,
  ProductionMetricCode,
  ProjectDetailSnapshot,
  ProjectOfferSnapshot,
  ProjectReadinessOptions,
  SupplierOfferOption,
} from "../projects.server";
import {
  EmployeeMobilization,
  MachineMobilization,
  type ProjectWizardOptions,
} from "./project-wizard";

const metricDefinitions: Array<{
  code: ProductionMetricCode;
  label: string;
  unit: string;
  description: string;
}> = [
  {
    code: "cut",
    label: "Corte",
    unit: "m3 escavados",
    description: "Retirada de material de uma frente de trabalho.",
  },
  {
    code: "fill",
    label: "Aterro",
    unit: "m3 aterrados",
    description: "Depósito de material onde o terreno será elevado.",
  },
  {
    code: "finishing",
    label: "Acabamento",
    unit: "m2 regularizados",
    description: "Regularização da superfície final da obra.",
  },
  {
    code: "top_soil",
    label: "Top Soil",
    unit: "m3/km",
    description: "Camada vegetal removida ou recomposta por extensão.",
  },
];

const compensationLabels: Record<CompensationMode, string> = {
  daily: "Diária",
  hourly: "Hora",
  weekly: "Semanal",
  fortnightly: "Quinzenal",
  monthly: "Mensal",
};

const statusLabels: Record<ProjectDetailSnapshot["status"], string> = {
  planned: "Planejada",
  active: "Ativa",
  paused: "Pausada",
  completed: "Concluída",
  cancelled: "Cancelada",
};

type OfferDraft = {
  key: string;
  mode: "existing" | "new";
  sourceOfferId: string;
  supplierId: string;
  itemId: string;
  purchaseUnitId: string;
  conversionToBase: string;
  price: string;
  saveToCatalog: boolean;
};

type ProjectTab =
  | "planning"
  | "fuel"
  | "accountability"
  | "team"
  | "machines"
  | "payments"
  | "materials";

type ReadinessTone = "ready" | "pending" | "dirty" | "neutral";

const controlClass =
  "min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium text-foreground shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(value: string | null) {
  if (!value) return "Não informado";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "Não iniciado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatMoney(value: string, fractionDigits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(value));
}

function metricInitialState(project: ProjectDetailSnapshot) {
  const existing = new Map(
    project.productionMetricTargets.map((target) => [
      target.metricCode,
      target.targetTotal,
    ]),
  );
  return metricDefinitions.map((metric) => ({
    ...metric,
    enabled: existing.has(metric.code),
    targetTotal: existing.has(metric.code)
      ? canonicalDecimalToBrazilian(existing.get(metric.code)!, 2)
      : "",
  }));
}

function offerInitialState(offers: ProjectOfferSnapshot[]): OfferDraft[] {
  return offers.map((offer) => ({
    key: offer.id,
    mode: offer.sourceOfferId ? "existing" : "new",
    sourceOfferId: offer.sourceOfferId ?? "",
    supplierId: offer.supplier?.id ?? "",
    itemId: offer.item?.id ?? "",
    purchaseUnitId: offer.purchaseUnit?.id ?? "",
    conversionToBase: canonicalDecimalToBrazilian(offer.conversionToBase, 6),
    price: canonicalDecimalToBrazilian(offer.price, 4),
    saveToCatalog: Boolean(offer.sourceOfferId),
  }));
}

function paymentInitialState(project: ProjectDetailSnapshot) {
  return Object.fromEntries(
    project.compensationPaymentTerms.map((term) => [
      term.compensationMode,
      String(term.daysAfterPeriodEnd),
    ]),
  ) as Partial<Record<CompensationMode, string>>;
}

function projectToCommand(project: ProjectDetailSnapshot): ProjectCommand {
  return {
    ...emptyProjectCommand,
    name: project.name,
    address: {
      postalCode: project.address.postalCode ?? "",
      street: project.address.street ?? "",
      number: project.address.number,
      complement: project.address.complement,
      neighborhood: project.address.neighborhood ?? "",
      city: project.address.city ?? "",
      state: project.address.state ?? "",
    },
    latitude: project.latitude,
    longitude: project.longitude,
    contractNumber: project.contractNumber,
    approvedBudget: project.baseline?.approvedBudget ?? "0.00",
    plannedStartDate: project.baseline?.plannedStartDate ?? "",
    plannedEndDate: project.baseline?.plannedEndDate ?? null,
    clientId: project.client?.id ?? "",
    managerEmploymentId: project.manager?.id ?? "",
    technicalResponsibilityEmploymentIds: project.technicalResponsibilities.map(
      (person) => person.id,
    ),
    weeklySchedule:
      project.schedule.days.length === 7
        ? project.schedule.days
        : emptyProjectCommand.weeklySchedule,
    breakTemplates: project.schedule.breakTemplates.map((item) => ({
      name: item.name,
      durationMinutes: item.durationMinutes,
    })),
    initialEmployeeAllocations: project.employeeAllocations
      .filter((allocation) => allocation.employment)
      .map((allocation) => ({
        employmentId: allocation.employment!.id,
        confirmedJobRoleName: allocation.jobRole,
        confirmedJobRolePeriodId: null,
        expectedDailyWorkloadMinutes: allocation.expectedDailyWorkloadMinutes,
        compensationMode: allocation.compensationMode,
        compensationValue: allocation.compensationValue,
        overtimeRate: allocation.overtimeRate,
      })),
    initialMachineAllocations: project.machineAllocations
      .filter(
        (allocation) =>
          allocation.machine &&
          allocation.operator &&
          allocation.startMeterReading,
      )
      .map((allocation) => ({
        machineId: allocation.machine!.id,
        startMeterReadingId: allocation.startMeterReading!.id,
        operatorEmploymentId: allocation.operator!.id,
      })),
    projectSupplierOffers: [],
  };
}

function Section({
  action,
  children,
  description,
  icon: Icon,
  status,
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  icon: typeof HardHat;
  status?: { label: string; tone: ReadinessTone };
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-secondary/35 px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold">{title}</h2>
              {status && (
                <span
                  className={cn(
                    "inline-flex min-h-6 items-center rounded-md px-2 text-xs font-bold",
                    status.tone === "ready" &&
                      "bg-emerald-100 text-emerald-900",
                    status.tone === "pending" && "bg-amber-100 text-amber-950",
                    status.tone === "dirty" && "bg-primary/10 text-primary",
                    status.tone === "neutral" &&
                      "bg-background text-muted-foreground",
                  )}
                >
                  {status.label}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-semibold text-foreground">
        {value}
      </dd>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 min-w-0 break-words text-sm font-semibold">
        {value}
      </dd>
    </div>
  );
}

function EmptyBlock({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-background px-3 py-5 text-center text-sm font-semibold text-muted-foreground">
      {children}
    </p>
  );
}

function SelectableRow({
  checked,
  children,
  onChange,
}: {
  checked: boolean;
  children: React.ReactNode;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold transition-colors",
        checked && "border-primary bg-primary/5 text-foreground",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 shrink-0 accent-primary"
      />
      <span className="min-w-0 flex-1">{children}</span>
    </label>
  );
}

function TabLabel({
  label,
  status,
}: {
  label: string;
  status: { label: string; tone: ReadinessTone };
}) {
  return (
    <span className="flex items-center gap-2">
      <span>{label}</span>
      <span
        className={cn(
          "rounded-sm px-1.5 py-0.5 text-[11px] font-bold leading-4",
          status.tone === "ready" && "bg-emerald-100 text-emerald-900",
          status.tone === "pending" && "bg-amber-100 text-amber-950",
          status.tone === "dirty" && "bg-primary/10 text-primary",
          status.tone === "neutral" && "bg-background text-muted-foreground",
        )}
      >
        {status.label}
      </span>
    </span>
  );
}

function optionLabel(option: SupplierOfferOption) {
  return `${option.item.name} · ${option.supplier.name} · ${option.purchaseUnit.code}`;
}

function defaultUnitId(
  units: ProjectReadinessOptions["measurementUnits"],
  item?: ProjectReadinessOptions["suppliedItems"][number],
) {
  if (item?.baseUnitId) return item.baseUnitId;
  const liter = units.find(
    (unit) => unit.code.toLocaleLowerCase("pt-BR") === "l",
  );
  return liter?.id ?? units[0]?.id ?? "";
}

function OfferRows({
  drafts,
  emptyText,
  kind,
  options,
  suppliers,
  suppliedItems,
  measurementUnits,
  setDrafts,
}: {
  drafts: OfferDraft[];
  emptyText: string;
  kind: "fuel" | "material";
  options: SupplierOfferOption[];
  suppliers: ProjectReadinessOptions["suppliers"];
  suppliedItems: ProjectReadinessOptions["suppliedItems"];
  measurementUnits: ProjectReadinessOptions["measurementUnits"];
  setDrafts: React.Dispatch<React.SetStateAction<OfferDraft[]>>;
}) {
  const newLabel = kind === "fuel" ? "Novo combustível" : "Novo item";
  return (
    <div className="grid gap-3">
      {drafts.map((draft) => {
        const selected = options.find(
          (option) => option.id === draft.sourceOfferId,
        );
        const selectedItem = suppliedItems.find(
          (item) => item.id === draft.itemId,
        );
        return (
          <div
            key={draft.key}
            className="grid gap-3 rounded-md border border-border bg-background p-3"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="inline-flex rounded-md border border-border bg-secondary/50 p-1">
                {(["existing", "new"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "min-h-9 rounded-sm px-3 text-sm font-bold transition-colors",
                      draft.mode === mode
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    onClick={() =>
                      setDrafts((current) =>
                        current.map((item) =>
                          item.key === draft.key
                            ? {
                                ...item,
                                mode,
                                sourceOfferId:
                                  mode === "new" ? "" : item.sourceOfferId,
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    {mode === "existing" ? "Oferta existente" : newLabel}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon-lg"
                aria-label="Remover oferta"
                onClick={() =>
                  setDrafts((current) =>
                    current.filter((item) => item.key !== draft.key),
                  )
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>

            {draft.mode === "existing" ? (
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem] md:items-end">
                <label className="grid gap-1.5 text-sm font-semibold">
                  <span>Oferta do fornecedor</span>
                  <select
                    className={controlClass}
                    value={draft.sourceOfferId}
                    onChange={(event) => {
                      const nextOffer = options.find(
                        (option) => option.id === event.target.value,
                      );
                      setDrafts((current) =>
                        current.map((item) =>
                          item.key === draft.key
                            ? {
                                ...item,
                                sourceOfferId: event.target.value,
                                supplierId:
                                  nextOffer?.supplier.id ?? item.supplierId,
                                itemId: nextOffer?.item.id ?? item.itemId,
                                purchaseUnitId:
                                  nextOffer?.purchaseUnit.id ??
                                  item.purchaseUnitId,
                                conversionToBase: nextOffer
                                  ? canonicalDecimalToBrazilian(
                                      nextOffer.conversionToBase,
                                      6,
                                    )
                                  : item.conversionToBase,
                                price: nextOffer
                                  ? canonicalDecimalToBrazilian(
                                      nextOffer.currentPrice.price,
                                      4,
                                    )
                                  : item.price,
                              }
                            : item,
                        ),
                      );
                    }}
                  >
                    <option value="">Selecione</option>
                    {options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {optionLabel(option)} ·{" "}
                        {formatMoney(option.currentPrice.price, 4)}
                      </option>
                    ))}
                  </select>
                  {selected && (
                    <span className="text-xs font-medium text-muted-foreground">
                      Conversão {selected.conversionToBase} para unidade base.
                    </span>
                  )}
                </label>
                <OfferPriceInput draft={draft} setDrafts={setDrafts} />
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Fornecedor</span>
                    <select
                      className={controlClass}
                      value={draft.supplierId}
                      onChange={(event) =>
                        setDrafts((current) =>
                          current.map((item) =>
                            item.key === draft.key
                              ? { ...item, supplierId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Selecione</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Item</span>
                    <select
                      className={controlClass}
                      value={draft.itemId}
                      onChange={(event) => {
                        const nextItem = suppliedItems.find(
                          (item) => item.id === event.target.value,
                        );
                        setDrafts((current) =>
                          current.map((item) =>
                            item.key === draft.key
                              ? {
                                  ...item,
                                  itemId: event.target.value,
                                  purchaseUnitId: defaultUnitId(
                                    measurementUnits,
                                    nextItem,
                                  ),
                                }
                              : item,
                          ),
                        );
                      }}
                    >
                      <option value="">Selecione</option>
                      {suppliedItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_9rem] md:items-end">
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Unidade</span>
                    <select
                      className={controlClass}
                      value={draft.purchaseUnitId}
                      onChange={(event) =>
                        setDrafts((current) =>
                          current.map((item) =>
                            item.key === draft.key
                              ? { ...item, purchaseUnitId: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option value="">Selecione</option>
                      {measurementUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.code} - {unit.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Conversão</span>
                    <Input
                      className="h-11"
                      inputMode="decimal"
                      value={draft.conversionToBase}
                      onChange={(event) =>
                        setDrafts((current) =>
                          current.map((item) =>
                            item.key === draft.key
                              ? {
                                  ...item,
                                  conversionToBase: formatBrazilianDecimalInput(
                                    event.target.value,
                                    6,
                                  ),
                                }
                              : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <OfferPriceInput draft={draft} setDrafts={setDrafts} />
                </div>
                <label className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-secondary/40 px-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={draft.saveToCatalog}
                    onChange={(event) =>
                      setDrafts((current) =>
                        current.map((item) =>
                          item.key === draft.key
                            ? { ...item, saveToCatalog: event.target.checked }
                            : item,
                        ),
                      )
                    }
                    className="size-4 accent-primary"
                  />
                  Criar item no catálogo da empresa (opcional)
                </label>
              </div>
            )}
          </div>
        );
      })}
      {drafts.length === 0 && <EmptyBlock>{emptyText}</EmptyBlock>}
      <Button
        type="button"
        variant="outline"
        className="min-h-10 justify-self-start"
        disabled={
          suppliers.length === 0 ||
          suppliedItems.length === 0 ||
          measurementUnits.length === 0
        }
        onClick={() =>
          setDrafts((current) => [
            ...current,
            {
              key: crypto.randomUUID(),
              mode: options.length > 0 ? "existing" : "new",
              sourceOfferId: "",
              supplierId: "",
              itemId: "",
              purchaseUnitId: defaultUnitId(measurementUnits),
              conversionToBase: "1,000000",
              price: "",
              saveToCatalog: false,
            },
          ])
        }
      >
        <Plus className="size-4" />
        Adicionar oferta
      </Button>
    </div>
  );
}

function OfferPriceInput({
  draft,
  setDrafts,
}: {
  draft: OfferDraft;
  setDrafts: React.Dispatch<React.SetStateAction<OfferDraft[]>>;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      <span>Preço</span>
      <Input
        className="h-11"
        inputMode="decimal"
        value={draft.price}
        onChange={(event) =>
          setDrafts((current) =>
            current.map((item) =>
              item.key === draft.key
                ? {
                    ...item,
                    price: formatBrazilianDecimalInput(event.target.value, 4),
                  }
                : item,
            ),
          )
        }
      />
    </label>
  );
}

export function ProjectDetail({
  options,
  project,
}: {
  options: ProjectReadinessOptions;
  project: ProjectDetailSnapshot;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [plannedEndDate, setPlannedEndDate] = React.useState(
    project.baseline?.plannedEndDate ?? "",
  );
  const [metrics, setMetrics] = React.useState(() =>
    metricInitialState(project),
  );
  const [fuelDrafts, setFuelDrafts] = React.useState(() =>
    offerInitialState(project.fuelOffers),
  );
  const [materialDrafts, setMaterialDrafts] = React.useState(() =>
    offerInitialState(project.supplierOffers),
  );
  const [paymentTerms, setPaymentTerms] = React.useState(() =>
    paymentInitialState(project),
  );
  const [notice, setNotice] = React.useState<{
    tone: "success" | "warning" | "error";
    text: string;
  } | null>(null);
  const [apiBlockers, setApiBlockers] = React.useState<
    { section: string; message: string }[]
  >([]);
  const [planningDirty, setPlanningDirty] = React.useState(false);
  const [fuelDirty, setFuelDirty] = React.useState(false);
  const [materialDirty, setMaterialDirty] = React.useState(false);
  const [paymentDirty, setPaymentDirty] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<ProjectTab>("planning");
  const [openModal, setOpenModal] = React.useState<
    | "accountability"
    | "team"
    | "machines"
    | "fuel"
    | "materials"
    | "payments"
    | null
  >(null);
  const readinessForm = useForm<ProjectCommand>({
    defaultValues: projectToCommand(project),
  });
  const watchedEmployeeAllocations = useWatch({
    control: readinessForm.control,
    name: "initialEmployeeAllocations",
  });
  const watchedClientId = useWatch({
    control: readinessForm.control,
    name: "clientId",
  });
  const watchedManagerEmploymentId = useWatch({
    control: readinessForm.control,
    name: "managerEmploymentId",
  });
  const watchedTechnicalResponsibilityIds = useWatch({
    control: readinessForm.control,
    name: "technicalResponsibilityEmploymentIds",
  });

  React.useEffect(() => {
    readinessForm.reset(projectToCommand(project));
    setPlannedEndDate(project.baseline?.plannedEndDate ?? "");
    setMetrics(metricInitialState(project));
    setFuelDrafts(offerInitialState(project.fuelOffers));
    setMaterialDrafts(offerInitialState(project.supplierOffers));
    setPaymentTerms(paymentInitialState(project));
    setPlanningDirty(false);
    setFuelDirty(false);
    setMaterialDirty(false);
    setPaymentDirty(false);
  }, [project, readinessForm]);

  const modalOptions = React.useMemo<ProjectWizardOptions>(
    () => ({
      clients: options.clients.map((option) => ({
        id: option.id,
        label: option.label,
        detail: option.detail ?? undefined,
      })),
      employees: options.employees.map((option) => ({
        id: option.id,
        label: option.label,
        detail: option.detail ?? undefined,
        jobRolePeriodId: option.jobRolePeriodId ?? undefined,
        jobRoleId: option.jobRoleId ?? undefined,
      })),
      machines: options.machines.map((option) => ({
        id: option.id,
        label: option.label,
        detail: option.detail ?? undefined,
        readingId: option.readingId ?? undefined,
      })),
      jobRoles: options.jobRoles.map((option) => ({
        id: option.id,
        label: option.label,
        detail: option.detail ?? undefined,
      })),
    }),
    [options],
  );

  const paymentModes = React.useMemo(
    () =>
      [
        ...new Set(
          (watchedEmployeeAllocations ?? []).map(
            (allocation) => allocation.compensationMode,
          ),
        ),
      ].sort() as CompensationMode[],
    [watchedEmployeeAllocations],
  );

  const allBlockers = apiBlockers.length
    ? apiBlockers
    : project.readiness.blockers;
  const isEditable = project.status === "planned";
  const fuelOptions = React.useMemo(() => {
    const candidates = options.supplierOffers.filter(
      (offer) => offer.isFuelCandidate,
    );
    return candidates.length ? candidates : options.supplierOffers;
  }, [options.supplierOffers]);
  const hasUnsavedChanges =
    planningDirty ||
    fuelDirty ||
    materialDirty ||
    paymentDirty ||
    readinessForm.formState.isDirty;
  const hasKnownBlockers =
    apiBlockers.length > 0 || !project.readiness.canActivate;
  const accountabilityReady = Boolean(
    project.client &&
    project.manager &&
    project.technicalResponsibilities.length > 0,
  );
  const planningReady = Boolean(
    project.baseline?.plannedEndDate && project.productionMetricTargets.length,
  );
  const teamReady = project.employeeAllocations.length > 0;
  const machinesReady = project.machineAllocations.length > 0;
  const paymentsReady =
    project.compensationPaymentTerms.length > 0 &&
    project.compensationPaymentTerms.length === paymentModes.length;
  const fuelReady = project.fuelOffers.length > 0;
  const planningStatus = planningDirty
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : planningReady
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const metricsStatus = planningDirty
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : project.productionMetricTargets.length
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const fuelStatus = fuelDirty
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : fuelReady
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const accountabilityStatus =
    readinessForm.formState.dirtyFields.clientId ||
    readinessForm.formState.dirtyFields.managerEmploymentId ||
    readinessForm.formState.dirtyFields.technicalResponsibilityEmploymentIds
      ? ({ label: "Alterado", tone: "dirty" } as const)
      : accountabilityReady
        ? ({ label: "OK", tone: "ready" } as const)
        : ({ label: "Pendente", tone: "pending" } as const);
  const teamStatus = readinessForm.formState.dirtyFields
    .initialEmployeeAllocations
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : teamReady
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const machinesStatus = readinessForm.formState.dirtyFields
    .initialMachineAllocations
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : machinesReady
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const paymentsStatus = paymentDirty
    ? ({ label: "Reconfirmar", tone: "dirty" } as const)
    : paymentsReady
      ? ({ label: "OK", tone: "ready" } as const)
      : ({ label: "Pendente", tone: "pending" } as const);
  const materialsStatus = materialDirty
    ? ({ label: "Alterado", tone: "dirty" } as const)
    : project.supplierOffers.length
      ? ({ label: "Configurado", tone: "neutral" } as const)
      : ({ label: "Opcional", tone: "neutral" } as const);
  const tabs = React.useMemo(
    () => [
      {
        value: "planning" as const,
        label: <TabLabel label="Planejamento" status={planningStatus} />,
      },
      {
        value: "fuel" as const,
        label: <TabLabel label="Combustível" status={fuelStatus} />,
      },
      {
        value: "accountability" as const,
        label: <TabLabel label="Responsáveis" status={accountabilityStatus} />,
      },
      {
        value: "team" as const,
        label: <TabLabel label="Equipe" status={teamStatus} />,
      },
      {
        value: "machines" as const,
        label: <TabLabel label="Máquinas" status={machinesStatus} />,
      },
      {
        value: "payments" as const,
        label: <TabLabel label="Pagamentos" status={paymentsStatus} />,
      },
      {
        value: "materials" as const,
        label: <TabLabel label="Itens" status={materialsStatus} />,
      },
    ],
    [
      accountabilityStatus,
      fuelStatus,
      machinesStatus,
      materialsStatus,
      paymentsStatus,
      planningStatus,
      teamStatus,
    ],
  );

  const savePatch = (
    command: ProjectReadinessActionInput,
    successText: string,
    onSuccess?: () => void,
  ) => {
    setNotice(null);
    setApiBlockers([]);
    startTransition(async () => {
      const result = await saveProjectReadinessAction(project.id, command);
      if (result.kind === "success") {
        setNotice({ tone: "success", text: successText });
        onSuccess?.();
        router.refresh();
        return;
      }
      setNotice({
        tone: result.kind === "recoverable-conflict" ? "warning" : "error",
        text: "Não foi possível salvar esta seção. Revise as pendências.",
      });
      setApiBlockers(
        result.kind === "recoverable-conflict" ? (result.blockers ?? []) : [],
      );
    });
  };

  const savePlanning = () => {
    const productionMetricTargets = metrics
      .filter((metric) => metric.enabled)
      .map((metric) => ({
        metricCode: metric.code,
        targetTotal: decimalInputToCanonical(metric.targetTotal, 2),
      }))
      .filter((metric) => metric.targetTotal && metric.targetTotal !== "0.00");
    if (!plannedEndDate) {
      setNotice({
        tone: "warning",
        text: "Informe a data prevista de fim antes de salvar.",
      });
      return;
    }
    if (productionMetricTargets.length === 0) {
      setNotice({
        tone: "warning",
        text: "Selecione ao menos uma métrica com meta total.",
      });
      return;
    }
    savePatch(
      { plannedEndDate, productionMetricTargets },
      "Datas e métricas salvas.",
      () => setPlanningDirty(false),
    );
  };

  const buildOfferCommand = (drafts: OfferDraft[]) => {
    const command = drafts.map((draft) => {
      const price = decimalInputToCanonical(draft.price, 4);
      if (draft.mode === "existing") {
        return {
          mode: "existing" as const,
          sourceOfferId: draft.sourceOfferId,
          price,
        };
      }
      return {
        mode: draft.saveToCatalog
          ? ("companyCatalog" as const)
          : ("projectOnly" as const),
        supplierId: draft.supplierId,
        itemId: draft.itemId,
        purchaseUnitId: draft.purchaseUnitId,
        conversionToBase: decimalInputToCanonical(draft.conversionToBase, 6),
        price,
      };
    });
    const hasIncompleteOffer = command.some((draft) => {
      if (!draft.price || draft.price === "0.0000") return true;
      if (draft.mode === "existing") return !draft.sourceOfferId;
      return (
        !draft.supplierId ||
        !draft.itemId ||
        !draft.purchaseUnitId ||
        !draft.conversionToBase ||
        draft.conversionToBase === "0.000000"
      );
    });
    const offerKeys = command.map((draft) =>
      draft.mode === "existing"
        ? `existing:${draft.sourceOfferId}`
        : `${draft.mode}:${draft.supplierId}:${draft.itemId}:${draft.purchaseUnitId}`,
    );
    const hasDuplicateOffer = new Set(offerKeys).size !== offerKeys.length;
    if (hasIncompleteOffer || hasDuplicateOffer) return null;
    return command;
  };

  const saveFuel = () => {
    const fuelOffers = buildOfferCommand(fuelDrafts);
    if (!fuelOffers || fuelOffers.length === 0) {
      setNotice({
        tone: "warning",
        text: "Selecione ofertas de combustível sem duplicidade e com preço positivo.",
      });
      return;
    }
    savePatch({ fuelOffers }, "Combustível salvo.", () => {
      setFuelDirty(false);
      setOpenModal(null);
    });
  };

  const saveMaterials = () => {
    const materialOffers = buildOfferCommand(materialDrafts);
    if (!materialOffers) {
      setNotice({
        tone: "warning",
        text: "Revise ofertas incompletas, duplicadas ou sem preço positivo.",
      });
      return;
    }
    savePatch({ materialOffers }, "Itens e fornecedores salvos.", () => {
      setMaterialDirty(false);
      setOpenModal(null);
    });
  };

  const saveAccountability = () => {
    const values = readinessForm.getValues();
    if (
      !values.clientId ||
      !values.managerEmploymentId ||
      values.technicalResponsibilityEmploymentIds.length === 0
    ) {
      setNotice({
        tone: "warning",
        text: "Confirme cliente, gestor e responsável técnico.",
      });
      return;
    }
    savePatch(
      {
        accountability: {
          clientId: values.clientId,
          managerEmploymentId: values.managerEmploymentId,
          technicalResponsibilityEmploymentIds:
            values.technicalResponsibilityEmploymentIds,
        },
      },
      "Responsáveis da obra salvos.",
      () => {
        readinessForm.reset(values);
        setOpenModal(null);
      },
    );
  };

  const saveTeam = () => {
    const values = readinessForm.getValues();
    savePatch(
      {
        employeeAllocations: values.initialEmployeeAllocations,
      },
      "Equipe operacional salva.",
      () => {
        readinessForm.reset(values);
        setPaymentTerms({});
        setPaymentDirty(true);
        setOpenModal(null);
      },
    );
  };

  const saveMachines = () => {
    const values = readinessForm.getValues();
    savePatch(
      { machineAllocations: values.initialMachineAllocations },
      "Máquinas e operadores salvos.",
      () => {
        readinessForm.reset(values);
        setOpenModal(null);
      },
    );
  };

  const savePayments = () => {
    const compensationPaymentTerms = paymentModes
      .map((mode) => ({
        compensationMode: mode,
        daysAfterPeriodEnd: Number(paymentTerms[mode] ?? ""),
      }))
      .filter((term) => Number.isInteger(term.daysAfterPeriodEnd));
    if (compensationPaymentTerms.length !== paymentModes.length) {
      setNotice({
        tone: "warning",
        text: "Preencha o prazo de pagamento de todas as modalidades da equipe.",
      });
      return;
    }
    savePatch({ compensationPaymentTerms }, "Pagamentos salvos.", () => {
      setPaymentDirty(false);
      setOpenModal(null);
    });
  };

  const activateProject = () => {
    if (hasUnsavedChanges) {
      setNotice({
        tone: "warning",
        text: "Salve as alterações abertas antes de iniciar a obra.",
      });
      return;
    }
    setNotice(null);
    setApiBlockers([]);
    startTransition(async () => {
      const result = await activateProjectAction(project.id);
      if (result.kind === "success") {
        setNotice({ tone: "success", text: "Obra iniciada." });
        router.refresh();
        return;
      }
      setNotice({
        tone: result.kind === "recoverable-conflict" ? "warning" : "error",
        text:
          result.kind === "recoverable-conflict"
            ? "A obra ainda tem pendências de início."
            : "Não foi possível iniciar a obra.",
      });
      setApiBlockers(
        result.kind === "recoverable-conflict" ? (result.blockers ?? []) : [],
      );
    });
  };

  const setOfferDrafts =
    (
      setter: React.Dispatch<React.SetStateAction<OfferDraft[]>>,
      markDirty: () => void,
    ): React.Dispatch<React.SetStateAction<OfferDraft[]>> =>
    (value) => {
      markDirty();
      setter(value);
    };

  const closeFuelModal = () => {
    setFuelDrafts(offerInitialState(project.fuelOffers));
    setFuelDirty(false);
    setOpenModal(null);
  };

  const closeMaterialsModal = () => {
    setMaterialDrafts(offerInitialState(project.supplierOffers));
    setMaterialDirty(false);
    setOpenModal(null);
  };

  const closeTeamOrMachineModal = () => {
    readinessForm.reset(projectToCommand(project));
    setOpenModal(null);
  };

  const closePaymentsModal = () => {
    setPaymentTerms(paymentInitialState(project));
    setPaymentDirty(false);
    setOpenModal(null);
  };

  return (
    <article className="space-y-4">
      <Link
        className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        href="/home/obras"
      >
        <ArrowLeft className="size-4" />
        Voltar para obras
      </Link>

      <header className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border bg-secondary/40 px-4 py-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-bold",
                  project.status === "active"
                    ? "bg-emerald-100 text-emerald-900"
                    : "bg-secondary text-secondary-foreground",
                )}
              >
                {statusLabels[project.status]}
              </span>
              {hasUnsavedChanges && isEditable && (
                <span className="inline-flex min-h-8 items-center rounded-md bg-amber-100 px-2.5 text-xs font-bold text-amber-950">
                  Alterações não salvas
                </span>
              )}
              {isEditable && (
                <span
                  className={cn(
                    "inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-bold",
                    project.readiness.canActivate
                      ? "bg-emerald-100 text-emerald-900"
                      : "bg-amber-100 text-amber-950",
                  )}
                >
                  {project.readiness.canActivate
                    ? "Pronta para iniciar"
                    : "Checklist pendente"}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-normal">
              {project.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {project.address.formatted}
            </p>
          </div>
          {isEditable && (
            <div className="grid gap-2 xl:min-w-56">
              <Button
                type="button"
                className="min-h-11 justify-center"
                disabled={isPending || hasKnownBlockers || hasUnsavedChanges}
                onClick={activateProject}
              >
                <Play className="size-4" />
                Iniciar obra
              </Button>
              <p className="text-xs font-semibold leading-5 text-muted-foreground">
                {hasUnsavedChanges
                  ? "Salve as alterações abertas antes de iniciar."
                  : hasKnownBlockers
                    ? "Resolva as pendências do checklist para liberar."
                    : "Tudo pronto para ativar a obra."}
              </p>
            </div>
          )}
        </div>

        <dl className="grid gap-3 px-4 py-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryItem
            label="Contrato"
            value={project.contractNumber ?? "Não informado"}
          />
          <SummaryItem
            label="Cliente"
            value={project.client?.name ?? "Não informado"}
          />
          <SummaryItem
            label="Início planejado"
            value={formatDate(project.baseline?.plannedStartDate ?? null)}
          />
          <SummaryItem
            label="Início real"
            value={formatDateTime(project.actualStartedAt)}
          />
        </dl>
      </header>

      {(notice || allBlockers.length > 0) && (
        <section
          className={cn(
            "rounded-lg border px-4 py-3",
            notice?.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-950"
              : "border-amber-200 bg-amber-50 text-amber-950",
          )}
        >
          <div className="flex items-start gap-3">
            {notice?.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
            ) : (
              <CircleAlert className="mt-0.5 size-5 shrink-0" />
            )}
            <div className="min-w-0">
              {notice && <p className="text-sm font-bold">{notice.text}</p>}
              {allBlockers.length > 0 && (
                <ul className="mt-2 grid gap-1 text-sm font-semibold">
                  {allBlockers.map((blocker, index) => (
                    <li key={`${blocker.section}-${index}`}>
                      {blocker.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-secondary/40 px-3 py-3">
          <div className="overflow-x-auto">
            <OperationTabs<ProjectTab>
              className="min-w-max"
              value={activeTab}
              tabs={tabs}
              onValueChange={setActiveTab}
            />
          </div>
        </div>
        <div className="p-4">
          {activeTab === "planning" && (
            <div className="space-y-4">
              <Section
                icon={CalendarDays}
                title="Datas planejadas"
                description="A data final é obrigatória para liberar o início operacional."
                status={planningStatus}
                action={
                  isEditable && (
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-10"
                      disabled={isPending || !planningDirty}
                      onClick={savePlanning}
                    >
                      <Save className="size-4" />
                      Salvar datas/metas
                    </Button>
                  )
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Início planejado</span>
                    <Input
                      className="h-11"
                      value={project.baseline?.plannedStartDate ?? ""}
                      disabled
                    />
                  </label>
                  <label className="grid gap-1.5 text-sm font-semibold">
                    <span>Fim previsto</span>
                    <Input
                      className="h-11"
                      type="date"
                      value={plannedEndDate}
                      disabled={!isEditable}
                      onChange={(event) => {
                        setPlannedEndDate(event.target.value);
                        setPlanningDirty(true);
                      }}
                    />
                  </label>
                </div>
              </Section>

              <Section
                icon={Gauge}
                title="Métricas de produção"
                description="Selecione as métricas usadas nesta obra e informe a meta total."
                status={metricsStatus}
              >
                <div className="grid gap-3">
                  {metrics.map((metric, index) => (
                    <div
                      key={metric.code}
                      className={cn(
                        "grid gap-3 rounded-md border border-border bg-background px-3 py-3 md:grid-cols-[minmax(0,1fr)_180px]",
                        metric.enabled && "border-primary bg-primary/5",
                      )}
                    >
                      <label className="flex min-w-0 items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 size-4 accent-primary"
                          checked={metric.enabled}
                          disabled={!isEditable}
                          onChange={(event) => {
                            setMetrics((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? { ...item, enabled: event.target.checked }
                                  : item,
                              ),
                            );
                            setPlanningDirty(true);
                          }}
                        />
                        <span className="min-w-0">
                          <span className="block text-sm font-bold">
                            {metric.label}
                          </span>
                          <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                            {metric.description}
                          </span>
                        </span>
                      </label>
                      <label className="grid gap-1.5 text-sm font-semibold">
                        <span>Meta total ({metric.unit})</span>
                        <Input
                          className="h-11"
                          inputMode="decimal"
                          value={metric.targetTotal}
                          disabled={!isEditable || !metric.enabled}
                          onChange={(event) => {
                            setMetrics((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      targetTotal: formatBrazilianDecimalInput(
                                        event.target.value,
                                        2,
                                      ),
                                    }
                                  : item,
                              ),
                            );
                            setPlanningDirty(true);
                          }}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {activeTab === "fuel" && (
            <Section
              icon={Fuel}
              title="Combustível"
              description="Selecione ofertas cadastradas no fornecedor e confirme o preço da obra."
              status={fuelStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("fuel")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              <div className="grid gap-2 text-sm">
                {project.fuelOffers.length ? (
                  project.fuelOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="rounded-md border border-border bg-background px-3 py-2"
                    >
                      <p className="font-bold">
                        {offer.item?.name ?? "Item não encontrado"}
                      </p>
                      <p className="text-muted-foreground">
                        {offer.supplier?.name ?? "Fornecedor não encontrado"} ·{" "}
                        {offer.purchaseUnit?.code ?? "un."} ·{" "}
                        {formatMoney(offer.price, 4)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    Nenhum combustível confirmado.
                  </p>
                )}
              </div>
            </Section>
          )}

          {activeTab === "accountability" && (
            <Section
              icon={HardHat}
              title="Responsáveis da obra"
              description="Cliente, gestor e responsabilidade técnica."
              status={accountabilityStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("accountability")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              <dl className="grid gap-2">
                <DetailRow
                  label="Cliente"
                  value={project.client?.name ?? "Não informado"}
                />
                <DetailRow
                  label="Gestor"
                  value={project.manager?.name ?? "Não informado"}
                />
                <DetailRow
                  label="Responsáveis técnicos"
                  value={
                    project.technicalResponsibilities.length
                      ? project.technicalResponsibilities
                          .map((person) => person.name)
                          .join(", ")
                      : "Não informado"
                  }
                />
              </dl>
            </Section>
          )}

          {activeTab === "team" && (
            <Section
              icon={UsersRound}
              title="Equipe operacional"
              description="Funcionários mobilizados com função, jornada e remuneração."
              status={teamStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("team")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              {project.employeeAllocations.length ? (
                <div className="grid gap-2 text-sm">
                  {project.employeeAllocations.slice(0, 4).map((allocation) => (
                    <div
                      key={allocation.id}
                      className="rounded-md border border-border bg-background px-3 py-2"
                    >
                      <p className="font-bold">
                        {allocation.employment?.name ?? "Funcionário"}
                      </p>
                      <p className="text-muted-foreground">
                        {allocation.jobRole} ·{" "}
                        {compensationLabels[allocation.compensationMode]}
                      </p>
                    </div>
                  ))}
                  {project.employeeAllocations.length > 4 && (
                    <p className="text-sm font-semibold text-muted-foreground">
                      +{project.employeeAllocations.length - 4} funcionário(s)
                    </p>
                  )}
                </div>
              ) : (
                <EmptyBlock>Nenhum funcionário mobilizado.</EmptyBlock>
              )}
            </Section>
          )}

          {activeTab === "machines" && (
            <Section
              icon={Truck}
              title="Máquinas e operadores"
              description="Cada máquina precisa de operador presente na equipe."
              status={machinesStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("machines")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              <div className="grid gap-2 text-sm">
                {project.machineAllocations.length ? (
                  project.machineAllocations.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="rounded-md border border-border bg-background px-3 py-2"
                    >
                      <p className="font-bold">
                        {allocation.machine?.name ?? "Máquina"}
                      </p>
                      <p className="text-muted-foreground">
                        Operador: {allocation.operator?.name ?? "Não informado"}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyBlock>Nenhuma máquina alocada.</EmptyBlock>
                )}
              </div>
            </Section>
          )}

          {activeTab === "payments" && (
            <Section
              icon={WalletCards}
              title="Pagamento por modalidade"
              description="Dias após o fechamento do período de cada modalidade presente."
              status={paymentsStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("payments")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              {project.compensationPaymentTerms.length ? (
                <div className="grid gap-2 text-sm">
                  {project.compensationPaymentTerms.map((term) => (
                    <p
                      key={term.compensationMode}
                      className="rounded-md border border-border bg-background px-3 py-2"
                    >
                      <span className="font-bold">
                        {compensationLabels[term.compensationMode]}:{" "}
                      </span>
                      {term.daysAfterPeriodEnd} dia(s)
                    </p>
                  ))}
                </div>
              ) : (
                <EmptyBlock>Nenhum prazo de pagamento confirmado.</EmptyBlock>
              )}
            </Section>
          )}

          {activeTab === "materials" && (
            <Section
              icon={PackageCheck}
              title="Itens e fornecedores"
              description="Ofertas não-combustível vinculadas à obra."
              status={materialsStatus}
              action={
                isEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    className="min-h-10"
                    onClick={() => setOpenModal("materials")}
                  >
                    <Pencil className="size-4" />
                    Editar
                  </Button>
                )
              }
            >
              <div className="grid gap-2 text-sm">
                {project.supplierOffers.length ? (
                  project.supplierOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="rounded-md border border-border bg-background px-3 py-2"
                    >
                      <p className="font-bold">
                        {offer.item?.name ?? "Item não encontrado"}
                      </p>
                      <p className="text-muted-foreground">
                        {offer.supplier?.name ?? "Fornecedor não encontrado"} ·{" "}
                        {offer.purchaseUnit?.code ?? "un."} ·{" "}
                        {formatMoney(offer.price, 4)}
                      </p>
                    </div>
                  ))
                ) : (
                  <EmptyBlock>Nenhum item adicional configurado.</EmptyBlock>
                )}
              </div>
            </Section>
          )}
        </div>
      </section>

      <OperationsModal
        icon={Fuel}
        open={openModal === "fuel"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeFuelModal();
        }}
        size="xl"
        title="Editar combustível"
        description="Use uma oferta já cadastrada no fornecedor e confirme o preço específico desta obra."
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeFuelModal}>
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={saveFuel}>
              <Check className="size-4" />
              Salvar combustível
            </Button>
          </>
        }
      >
        <OfferRows
          drafts={fuelDrafts}
          emptyText="Nenhuma oferta de combustível selecionada."
          kind="fuel"
          options={fuelOptions}
          suppliers={options.suppliers}
          suppliedItems={options.suppliedItems}
          measurementUnits={options.measurementUnits}
          setDrafts={setOfferDrafts(setFuelDrafts, () => setFuelDirty(true))}
        />
      </OperationsModal>

      <OperationsModal
        icon={PackageCheck}
        open={openModal === "materials"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeMaterialsModal();
        }}
        size="xl"
        title="Editar itens e fornecedores"
        description="Adicione ou remova ofertas cadastradas no fornecedor e confirme o preço da obra."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeMaterialsModal}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={saveMaterials}>
              <Check className="size-4" />
              Salvar itens
            </Button>
          </>
        }
      >
        <OfferRows
          drafts={materialDrafts}
          emptyText="Nenhum item adicional selecionado."
          kind="material"
          options={options.supplierOffers}
          suppliers={options.suppliers}
          suppliedItems={options.suppliedItems}
          measurementUnits={options.measurementUnits}
          setDrafts={setOfferDrafts(setMaterialDrafts, () =>
            setMaterialDirty(true),
          )}
        />
      </OperationsModal>

      <OperationsModal
        icon={HardHat}
        open={openModal === "accountability"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeTeamOrMachineModal();
        }}
        size="xl"
        title="Editar responsáveis da obra"
        description="Defina quem responde pela obra. Esta seleção não mobiliza funcionários para produção."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeTeamOrMachineModal}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={saveAccountability}
            >
              <Check className="size-4" />
              Salvar responsáveis
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <FormSection
            title="Governança da obra"
            description="Cliente e gestor aparecem no resumo operacional e nas validações de início."
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>Cliente</span>
                <select
                  className={controlClass}
                  value={watchedClientId ?? ""}
                  onChange={(event) =>
                    readinessForm.setValue("clientId", event.target.value, {
                      shouldDirty: true,
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {modalOptions.clients.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                      {option.detail ? ` · ${option.detail}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                <span>Gestor da obra</span>
                <select
                  className={controlClass}
                  value={watchedManagerEmploymentId ?? ""}
                  onChange={(event) =>
                    readinessForm.setValue(
                      "managerEmploymentId",
                      event.target.value,
                      { shouldDirty: true },
                    )
                  }
                >
                  <option value="">Selecione</option>
                  {modalOptions.employees.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                      {option.detail ? ` · ${option.detail}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </FormSection>

          <FormSection
            title="Responsabilidade técnica"
            description="Selecione quem responde tecnicamente pela obra. A equipe operacional é configurada em outro modal."
          >
            <div className="grid gap-2">
              {modalOptions.employees.length ? (
                modalOptions.employees.map((option) => {
                  const selected = watchedTechnicalResponsibilityIds ?? [];
                  const checked = selected.includes(option.id);
                  return (
                    <SelectableRow
                      key={option.id}
                      checked={checked}
                      onChange={(nextChecked) =>
                        readinessForm.setValue(
                          "technicalResponsibilityEmploymentIds",
                          nextChecked
                            ? [...selected, option.id]
                            : selected.filter((id) => id !== option.id),
                          { shouldDirty: true },
                        )
                      }
                    >
                      {option.label}
                      {option.detail ? ` · ${option.detail}` : ""}
                    </SelectableRow>
                  );
                })
              ) : (
                <EmptyBlock>
                  Nenhum funcionário disponível para responsabilidade técnica.
                </EmptyBlock>
              )}
            </div>
          </FormSection>
        </div>
      </OperationsModal>

      <OperationsModal
        icon={UsersRound}
        open={openModal === "team"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeTeamOrMachineModal();
        }}
        size="xl"
        title="Editar equipe operacional"
        description="Mobilize funcionários que entram na obra com função, jornada e remuneração confirmadas."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeTeamOrMachineModal}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={saveTeam}>
              <Check className="size-4" />
              Salvar equipe
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <div className="rounded-md border border-border bg-secondary/30 px-4 py-3">
            <p className="text-sm font-bold">Mobilização inicial</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">
              Esta lista define quem pode operar máquinas e quais modalidades
              precisam de prazo de pagamento. Responsáveis técnicos ficam no
              modal de responsáveis da obra.
            </p>
          </div>
          <EmployeeMobilization
            form={readinessForm}
            options={modalOptions}
            sessionKey={project.id}
          />
        </div>
      </OperationsModal>

      <OperationsModal
        icon={Truck}
        open={openModal === "machines"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeTeamOrMachineModal();
        }}
        size="xl"
        title="Editar máquinas e operadores"
        description="Adicione, remova ou remaneje operadores das máquinas confirmadas."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closeTeamOrMachineModal}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={saveMachines}>
              <Check className="size-4" />
              Salvar máquinas
            </Button>
          </>
        }
      >
        <MachineMobilization form={readinessForm} options={modalOptions} />
      </OperationsModal>

      <OperationsModal
        icon={WalletCards}
        open={openModal === "payments"}
        onOpenChange={(open) => {
          if (!open && !isPending) closePaymentsModal();
        }}
        size="lg"
        title="Editar pagamentos"
        description="Defina os dias após o fechamento para cada modalidade presente na equipe."
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={closePaymentsModal}
            >
              Cancelar
            </Button>
            <Button type="button" disabled={isPending} onClick={savePayments}>
              <Check className="size-4" />
              Salvar pagamentos
            </Button>
          </>
        }
      >
        {paymentModes.length ? (
          <div className="grid gap-3">
            {paymentModes.map((mode) => (
              <label key={mode} className="grid gap-1.5 text-sm font-semibold">
                <span>{compensationLabels[mode]}</span>
                <Input
                  className="h-11"
                  type="number"
                  min={0}
                  max={60}
                  value={paymentTerms[mode] ?? ""}
                  onChange={(event) => {
                    setPaymentTerms((current) => ({
                      ...current,
                      [mode]: event.target.value,
                    }));
                    setPaymentDirty(true);
                  }}
                />
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm font-medium text-muted-foreground">
            Não há modalidades porque a obra ainda não possui equipe
            operacional.
          </p>
        )}
      </OperationsModal>
    </article>
  );
}
