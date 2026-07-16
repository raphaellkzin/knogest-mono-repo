"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Fuel,
  Gauge,
  HardHat,
  PackageCheck,
  Play,
  Save,
  Truck,
  UsersRound,
  WalletCards,
} from "lucide-react";

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
import type {
  CompensationMode,
  ProductionMetricCode,
  ProjectDetailSnapshot,
  ProjectReadinessOptions,
} from "../projects.server";

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

type FuelTypeId = "diesel-s10" | "diesel-s500";

type FuelDraft = {
  key: string;
  fuelSupplierId: string;
  fuelTypes: Record<FuelTypeId, { enabled: boolean; price: string }>;
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

function emptyFuelDraft(key = crypto.randomUUID()): FuelDraft {
  return {
    key,
    fuelSupplierId: "",
    fuelTypes: {
      "diesel-s10": { enabled: false, price: "" },
      "diesel-s500": { enabled: false, price: "" },
    },
  };
}

function fuelInitialState(project: ProjectDetailSnapshot): FuelDraft[] {
  if (project.fuelAgreements.length === 0) return [emptyFuelDraft("initial")];
  return project.fuelAgreements.map((agreement) => {
    const draft = emptyFuelDraft(agreement.id);
    draft.fuelSupplierId = agreement.fuelSupplier?.id ?? "";
    for (const fuelType of agreement.fuelTypes) {
      draft.fuelTypes[fuelType.fuelTypeId] = {
        enabled: true,
        price: canonicalDecimalToBrazilian(fuelType.pricePerLiter, 4),
      };
    }
    return draft;
  });
}

function paymentInitialState(project: ProjectDetailSnapshot) {
  return Object.fromEntries(
    project.compensationPaymentTerms.map((term) => [
      term.compensationMode,
      String(term.daysAfterPeriodEnd),
    ]),
  ) as Partial<Record<CompensationMode, string>>;
}

function Section({
  children,
  description,
  icon: Icon,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  icon: typeof HardHat;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-4 py-4">
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
    fuelInitialState(project),
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

  const paymentModes = React.useMemo(
    () =>
      [
        ...new Set(
          project.employeeAllocations.map(
            (allocation) => allocation.compensationMode,
          ),
        ),
      ].sort() as CompensationMode[],
    [project.employeeAllocations],
  );

  const allBlockers = apiBlockers.length
    ? apiBlockers
    : project.readiness.blockers;
  const isEditable = project.status === "planned";

  const buildCommand = (): ProjectReadinessActionInput | null => {
    const productionMetricTargets = metrics
      .filter((metric) => metric.enabled)
      .map((metric) => ({
        metricCode: metric.code,
        targetTotal: decimalInputToCanonical(metric.targetTotal, 2),
      }))
      .filter((metric) => metric.targetTotal && metric.targetTotal !== "0.00");

    const fuelAgreements = fuelDrafts
      .map((draft) => ({
        fuelSupplierId: draft.fuelSupplierId,
        fuelTypes: options.fuelTypes
          .filter((fuelType) => draft.fuelTypes[fuelType.id].enabled)
          .map((fuelType) => ({
            fuelTypeId: fuelType.id,
            pricePerLiter: decimalInputToCanonical(
              draft.fuelTypes[fuelType.id].price,
              4,
            ),
          }))
          .filter(
            (fuelType) =>
              fuelType.pricePerLiter && fuelType.pricePerLiter !== "0.0000",
          ),
      }))
      .filter(
        (agreement) =>
          agreement.fuelSupplierId && agreement.fuelTypes.length > 0,
      );

    const compensationPaymentTerms = paymentModes
      .map((mode) => ({
        compensationMode: mode,
        daysAfterPeriodEnd: Number(paymentTerms[mode] ?? ""),
      }))
      .filter((term) => Number.isInteger(term.daysAfterPeriodEnd));

    if (!plannedEndDate) {
      setNotice({
        tone: "warning",
        text: "Informe a data prevista de fim antes de salvar.",
      });
      return null;
    }
    if (productionMetricTargets.length === 0) {
      setNotice({
        tone: "warning",
        text: "Selecione ao menos uma métrica com meta total.",
      });
      return null;
    }
    if (fuelAgreements.length === 0) {
      setNotice({
        tone: "warning",
        text: "Configure ao menos um fornecedor de combustível.",
      });
      return null;
    }
    if (compensationPaymentTerms.length !== paymentModes.length) {
      setNotice({
        tone: "warning",
        text: "Preencha o prazo de pagamento de todas as modalidades da equipe.",
      });
      return null;
    }

    return {
      plannedEndDate,
      productionMetricTargets,
      fuelAgreements,
      compensationPaymentTerms,
    };
  };

  const saveReadiness = () => {
    const command = buildCommand();
    if (!command) return;
    setNotice(null);
    setApiBlockers([]);
    startTransition(async () => {
      const result = await saveProjectReadinessAction(project.id, command);
      if (result.kind === "success") {
        setNotice({ tone: "success", text: "Checklist salvo." });
        router.refresh();
        return;
      }
      setNotice({
        tone: result.kind === "recoverable-conflict" ? "warning" : "error",
        text: "Não foi possível salvar o checklist. Revise as pendências.",
      });
      setApiBlockers(
        result.kind === "recoverable-conflict" ? (result.blockers ?? []) : [],
      );
    });
  };

  const activateProject = () => {
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
        text: "A obra ainda não pode ser iniciada.",
      });
      setApiBlockers(
        result.kind === "recoverable-conflict" ? (result.blockers ?? []) : [],
      );
    });
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
              <span className="text-sm font-semibold text-muted-foreground">
                Criada em {formatDate(project.createdAt.slice(0, 10))}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-normal">
              {project.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {project.address.formatted}
            </p>
          </div>
          {isEditable && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-h-10"
                disabled={isPending}
                onClick={saveReadiness}
              >
                <Save className="size-4" />
                Salvar checklist
              </Button>
              <Button
                type="button"
                className="min-h-10"
                disabled={isPending || !project.readiness.canActivate}
                onClick={activateProject}
              >
                <Play className="size-4" />
                Iniciar obra
              </Button>
            </div>
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
                  onChange={(event) => setPlannedEndDate(event.target.value)}
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
                      onChange={(event) =>
                        setMetrics((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, enabled: event.target.checked }
                              : item,
                          ),
                        )
                      }
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
                      onChange={(event) =>
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
                        )
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          </Section>

          <Section
            icon={Fuel}
            title="Combustível"
            description="Confirme fornecedor, tipos de diesel e preços da obra."
          >
            <div className="grid gap-3">
              {fuelDrafts.map((draft, index) => (
                <div
                  key={draft.key}
                  className="rounded-md border border-border bg-background px-3 py-3"
                >
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                    <label className="grid gap-1.5 text-sm font-semibold">
                      <span>Fornecedor de combustível</span>
                      <select
                        className="min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
                        value={draft.fuelSupplierId}
                        disabled={!isEditable}
                        onChange={(event) =>
                          setFuelDrafts((current) =>
                            current.map((item) =>
                              item.key === draft.key
                                ? {
                                    ...item,
                                    fuelSupplierId: event.target.value,
                                  }
                                : item,
                            ),
                          )
                        }
                      >
                        <option value="">Selecione</option>
                        {options.fuelSuppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>
                            {supplier.name} · {supplier.document.maskedDocument}
                          </option>
                        ))}
                      </select>
                    </label>
                    {isEditable && fuelDrafts.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-h-11"
                        onClick={() =>
                          setFuelDrafts((current) =>
                            current.filter((item) => item.key !== draft.key),
                          )
                        }
                      >
                        Remover
                      </Button>
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {options.fuelTypes.map((fuelType) => {
                      const state = draft.fuelTypes[fuelType.id];
                      return (
                        <div
                          key={fuelType.id}
                          className="grid gap-2 rounded-md border border-border bg-card px-3 py-3"
                        >
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input
                              type="checkbox"
                              className="size-4 accent-primary"
                              checked={state.enabled}
                              disabled={!isEditable}
                              onChange={(event) =>
                                setFuelDrafts((current) =>
                                  current.map((item) =>
                                    item.key === draft.key
                                      ? {
                                          ...item,
                                          fuelTypes: {
                                            ...item.fuelTypes,
                                            [fuelType.id]: {
                                              ...state,
                                              enabled: event.target.checked,
                                            },
                                          },
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                            {fuelType.name}
                          </label>
                          <Input
                            className="h-11"
                            inputMode="decimal"
                            placeholder="R$/L"
                            value={state.price}
                            disabled={!isEditable || !state.enabled}
                            onChange={(event) =>
                              setFuelDrafts((current) =>
                                current.map((item) =>
                                  item.key === draft.key
                                    ? {
                                        ...item,
                                        fuelTypes: {
                                          ...item.fuelTypes,
                                          [fuelType.id]: {
                                            ...state,
                                            price: formatBrazilianDecimalInput(
                                              event.target.value,
                                              4,
                                            ),
                                          },
                                        },
                                      }
                                    : item,
                                ),
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {isEditable && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 justify-self-start"
                  onClick={() =>
                    setFuelDrafts((current) => [...current, emptyFuelDraft()])
                  }
                >
                  Adicionar fornecedor
                </Button>
              )}
            </div>
          </Section>
        </div>

        <aside className="space-y-4">
          <Section
            icon={UsersRound}
            title="Equipe e responsáveis"
            description="Resumo da equipe atual que será usada na abertura da obra."
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
              <div>
                <p className="font-bold">Funcionários alocados</p>
                <ul className="mt-2 grid gap-2">
                  {project.employeeAllocations.length ? (
                    project.employeeAllocations.map((allocation) => (
                      <li
                        key={allocation.id}
                        className="rounded-md border border-border bg-background px-3 py-2"
                      >
                        <span className="block font-semibold">
                          {allocation.employment?.name ?? "Funcionário"}
                        </span>
                        <span className="text-muted-foreground">
                          {allocation.jobRole} ·{" "}
                          {compensationLabels[allocation.compensationMode]}
                        </span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">
                      Nenhum funcionário operacional alocado.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </Section>

          <Section
            icon={Truck}
            title="Máquinas e operadores"
            description="Cada máquina precisa de operador presente na equipe."
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
                    <p className="text-muted-foreground">
                      Leitura inicial:{" "}
                      {allocation.startMeterReading?.value ?? "Não informada"}
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
          >
            {paymentModes.length ? (
              <div className="grid gap-3">
                {paymentModes.map((mode) => (
                  <label
                    key={mode}
                    className="grid gap-1.5 text-sm font-semibold"
                  >
                    <span>{compensationLabels[mode]}</span>
                    <Input
                      className="h-11"
                      type="number"
                      min={0}
                      max={60}
                      value={paymentTerms[mode] ?? ""}
                      disabled={!isEditable}
                      onChange={(event) =>
                        setPaymentTerms((current) => ({
                          ...current,
                          [mode]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sem modalidades de pagamento porque não há equipe operacional
                alocada.
              </p>
            )}
          </Section>

          <Section
            icon={PackageCheck}
            title="Itens e fornecedores"
            description="Fornecimentos não-combustível já vinculados à obra."
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
    </article>
  );
}
