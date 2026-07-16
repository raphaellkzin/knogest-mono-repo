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
import { Input } from "@/components/ui/input";
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
import {
  emptyProjectCommand,
  type ProjectCommand,
} from "../projects-schema";
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
  sourceOfferId: string;
  price: string;
};

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
    sourceOfferId: offer.sourceOfferId ?? "",
    price: canonicalDecimalToBrazilian(offer.price, 4),
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
        expectedDailyWorkloadMinutes:
          allocation.expectedDailyWorkloadMinutes,
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
  title,
}: {
  action?: React.ReactNode;
  children: React.ReactNode;
  description?: string;
  icon: typeof HardHat;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold">{title}</h2>
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

function optionLabel(option: SupplierOfferOption) {
  return `${option.item.name} · ${option.supplier.name} · ${option.purchaseUnit.code}`;
}

function OfferRows({
  drafts,
  emptyText,
  options,
  setDrafts,
}: {
  drafts: OfferDraft[];
  emptyText: string;
  options: SupplierOfferOption[];
  setDrafts: React.Dispatch<React.SetStateAction<OfferDraft[]>>;
}) {
  return (
    <div className="grid gap-3">
      {drafts.map((draft) => {
        const selected = options.find(
          (option) => option.id === draft.sourceOfferId,
        );
        return (
          <div
            key={draft.key}
            className="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[minmax(0,1fr)_9rem_auto] md:items-end"
          >
            <label className="grid gap-1.5 text-sm font-semibold">
              <span>Oferta do fornecedor</span>
              <select
                className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
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
                            price: formatBrazilianDecimalInput(
                              event.target.value,
                              4,
                            ),
                          }
                        : item,
                    ),
                  )
                }
              />
            </label>
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
        );
      })}
      {drafts.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm font-medium text-muted-foreground">
          {emptyText}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="min-h-10 justify-self-start"
        disabled={options.length === 0}
        onClick={() =>
          setDrafts((current) => [
            ...current,
            { key: crypto.randomUUID(), sourceOfferId: "", price: "" },
          ])
        }
      >
        <Plus className="size-4" />
        Adicionar oferta
      </Button>
    </div>
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
  const [openModal, setOpenModal] = React.useState<
    "team" | "machines" | "fuel" | "materials" | "payments" | null
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
          (watchedEmployeeAllocations ?? [])
            .map((allocation) => allocation.compensationMode),
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
    const command = drafts.map((draft) => ({
      sourceOfferId: draft.sourceOfferId,
      price: decimalInputToCanonical(draft.price, 4),
    }));
    const hasIncompleteOffer = command.some(
      (draft) =>
        !draft.sourceOfferId || !draft.price || draft.price === "0.0000",
    );
    const offerIds = command.map((draft) => draft.sourceOfferId);
    const hasDuplicateOffer = new Set(offerIds).size !== offerIds.length;
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
    savePatch(
      { materialOffers },
      "Itens e fornecedores salvos.",
      () => {
        setMaterialDirty(false);
        setOpenModal(null);
      },
    );
  };

  const saveTeam = () => {
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
        employeeAllocations: values.initialEmployeeAllocations,
      },
      "Equipe e responsáveis salvos.",
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
    savePatch(
      { compensationPaymentTerms },
      "Pagamentos salvos.",
      () => {
        setPaymentDirty(false);
        setOpenModal(null);
      },
    );
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

  const setOfferDrafts = (
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

      <header className="rounded-lg border border-border bg-card px-4 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
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
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-normal">
              {project.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {project.address.formatted}
            </p>
          </div>
          {isEditable && (
            <Button
              type="button"
              className="min-h-10"
              disabled={
                isPending ||
                hasKnownBlockers ||
                hasUnsavedChanges
              }
              onClick={activateProject}
            >
              <Play className="size-4" />
              Iniciar obra
            </Button>
          )}
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.62fr)]">
        <div className="space-y-4">
          <Section
            icon={CalendarDays}
            title="Datas planejadas"
            description="A data final é obrigatória para liberar o início operacional."
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

          <Section
            icon={Fuel}
            title="Combustível"
            description="Selecione ofertas cadastradas no fornecedor e confirme o preço da obra."
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
        </div>

        <aside className="space-y-4">
          <Section
            icon={UsersRound}
            title="Equipe e responsáveis"
            description="Cliente, gestores, responsáveis técnicos e equipe operacional."
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
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-bold">Gestor: </span>
                {project.manager?.name ?? "Não informado"}
              </p>
              <p>
                <span className="font-bold">Responsáveis técnicos: </span>
                {project.technicalResponsibilities.length
                  ? project.technicalResponsibilities
                      .map((person) => person.name)
                      .join(", ")
                  : "Não informado"}
              </p>
              <p className="font-bold">
                {project.employeeAllocations.length} funcionário(s) alocado(s)
              </p>
            </div>
          </Section>

          <Section
            icon={Truck}
            title="Máquinas e operadores"
            description="Cada máquina precisa de operador presente na equipe."
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
                <p className="text-muted-foreground">
                  Nenhuma máquina alocada.
                </p>
              )}
            </div>
          </Section>

          <Section
            icon={WalletCards}
            title="Pagamento por modalidade"
            description="Dias após o fechamento do período de cada modalidade presente."
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
              <p className="text-sm text-muted-foreground">
                Nenhum prazo de pagamento confirmado.
              </p>
            )}
          </Section>

          <Section
            icon={PackageCheck}
            title="Itens e fornecedores"
            description="Ofertas não-combustível vinculadas à obra."
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
                <p className="text-muted-foreground">
                  Nenhum item adicional configurado.
                </p>
              )}
            </div>
          </Section>
        </aside>
      </div>

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
            <Button
              type="button"
              variant="outline"
              onClick={closeFuelModal}
            >
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
          options={fuelOptions}
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
          options={options.supplierOffers}
          setDrafts={setOfferDrafts(setMaterialDrafts, () =>
            setMaterialDirty(true),
          )}
        />
      </OperationsModal>

      <OperationsModal
        icon={UsersRound}
        open={openModal === "team"}
        onOpenChange={(open) => {
          if (!open && !isPending) closeTeamOrMachineModal();
        }}
        size="xl"
        title="Editar equipe e responsáveis"
        description="Confirme cliente, gestor, responsáveis técnicos e funcionários da obra."
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
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold">
              <span>Cliente</span>
              <select
                className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
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
                className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
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

          <div className="grid gap-2 rounded-md border border-border bg-background p-3">
            <p className="text-sm font-bold">Responsáveis técnicos</p>
            {modalOptions.employees.map((option) => {
              const selected = watchedTechnicalResponsibilityIds ?? [];
              const checked = selected.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex min-h-10 items-center gap-2 text-sm font-semibold"
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={checked}
                    onChange={(event) =>
                      readinessForm.setValue(
                        "technicalResponsibilityEmploymentIds",
                        event.target.checked
                          ? [...selected, option.id]
                          : selected.filter((id) => id !== option.id),
                        { shouldDirty: true },
                      )
                    }
                  />
                  {option.label}
                  {option.detail ? ` · ${option.detail}` : ""}
                </label>
              );
            })}
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
