"use client";

import * as React from "react";
import {
  Check,
  Gauge,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Shovel,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { OperationsModal } from "@/components/ui/operations-modal";
import {
  canonicalDecimalToBrazilian,
  decimalInputToCanonical,
  formatBrazilianDecimalInput,
} from "@/lib/brazilian-input-mask";
import { cn } from "@/lib/utils";

import {
  addProjectProductionTripAction,
  approveProjectProductionAction,
  getMoreProjectProductionsAction,
  getProjectProductionAction,
  getProjectProductionOptionsAction,
  removeProjectProductionTripAction,
  reopenProjectProductionAction,
  saveProjectProductionAction,
} from "../productions.actions";
import type {
  ProjectProductionCommand,
  ProjectProductionDetail,
  ProjectProductionEquipmentRole,
  ProjectProductionOptions,
  ProjectProductionsPage,
} from "../productions.types";

const serviceLabels: Record<string, string> = {
  cut: "Corte",
  fill: "Aterro",
  finishing: "Acabamento",
  top_soil: "Top soil",
  unsuitable_soil_removal: "Remoção de solo impróprio",
  replacement_fill: "Aterro de substituição",
};

const roleLabels: Record<ProjectProductionEquipmentRole, string> = {
  excavation: "Escavação",
  loading: "Carga",
  transport: "Transporte",
  spreading: "Espalhamento",
  grading: "Regularização",
  compaction: "Compactação",
  watering: "Umectação",
  support: "Apoio",
};

type EquipmentDraft = {
  selected: boolean;
  role: ProjectProductionEquipmentRole;
  initialMeterValue: string;
  finalMeterValue: string;
  workedMinutes: string;
  capacityM3: string;
  stopMinutes: string;
  stopReason: string;
};

type ProductionDraft = {
  workFrontId: string;
  workFrontServiceId: string;
  productionDate: string;
  shift: "day" | "night";
  entryMode: "direct_total" | "trips";
  startTime: string;
  endTime: string;
  responsibleEmploymentId: string;
  location: string;
  startStation: string;
  endStation: string;
  layer: string;
  elevation: string;
  materialName: string;
  materialCategory: string;
  volumeCondition: "" | "cut" | "loose" | "compacted";
  directQuantity: string;
  measuredQuantity: string;
  conversionFactor: string;
  origin: string;
  destination: string;
  dmtKm: string;
  layerThicknessCm: string;
  compactionPasses: string;
  moistureCondition: string;
  photoUrls: string;
  ticketUrls: string;
  attachmentUrls: string;
  notes: string;
  equipment: Record<string, EquipmentDraft>;
};

const controlClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-semibold outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60";

export function ProjectProductions({
  initialPage,
  projectId,
}: {
  initialPage: ProjectProductionsPage;
  projectId: string;
}) {
  const [productions, setProductions] = React.useState(initialPage.data);
  const [pageInfo, setPageInfo] = React.useState(initialPage.pageInfo);
  const [options, setOptions] = React.useState<ProjectProductionOptions | null>(
    null,
  );
  const [detail, setDetail] = React.useState<ProjectProductionDetail | null>(
    null,
  );
  const [draft, setDraft] = React.useState<ProductionDraft>(() => emptyDraft());
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [reopenReason, setReopenReason] = React.useState("");
  const editable = !detail || detail.status === "draft";
  const selectedFront = options?.workFronts.find(
    (front) => front.id === draft.workFrontId,
  );
  const selectedService = selectedFront?.services.find(
    (service) => service.id === draft.workFrontServiceId,
  );

  async function openNew() {
    setBusy(true);
    try {
      const resolved = await getProjectProductionOptionsAction({
        projectId,
        productionDate: todayInSaoPaulo(),
        shift: "day",
      });
      const next = emptyDraft();
      next.workFrontId = resolved.workFronts[0]?.id ?? "";
      next.workFrontServiceId = resolved.workFronts[0]?.services[0]?.id ?? "";
      next.responsibleEmploymentId = resolved.responsibleOptions[0]?.id ?? "";
      next.location = resolved.workFronts[0]?.location ?? "";
      next.equipment = machineDrafts(resolved, next.workFrontId);
      setOptions(resolved);
      setDetail(null);
      setDraft(next);
      setReopenReason("");
      setOpen(true);
    } catch {
      toast.error(
        "Não foi possível carregar as frentes e máquinas disponíveis.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function openExisting(id: string) {
    setBusy(true);
    try {
      const loaded = await getProjectProductionAction(projectId, id);
      const resolved = await getProjectProductionOptionsAction({
        projectId,
        productionDate: loaded.productionDate,
        shift: loaded.shift,
      });
      setOptions(resolved);
      setDetail(loaded);
      setDraft(draftFromDetail(loaded, resolved));
      setReopenReason("");
      setOpen(true);
    } catch {
      toast.error("Não foi possível abrir este lançamento.");
    } finally {
      setBusy(false);
    }
  }

  async function save(approveNow: boolean) {
    if (!options) return;
    setBusy(true);
    const result = await saveProjectProductionAction({
      projectId,
      productionId: detail?.id,
      command: toCommand(draft, detail?.revision, approveNow, options),
    });
    setBusy(false);
    if (result.kind === "failure") {
      toast.error(translateError(result.code));
      return;
    }
    setDetail(result.production);
    upsert(result.production);
    if (approveNow) {
      setOpen(false);
      toast.success("Produção lançada e aprovada.");
    } else {
      setDraft(draftFromDetail(result.production, options));
      toast.success("Rascunho de produção salvo.");
    }
  }

  async function approve() {
    if (!detail) return;
    setBusy(true);
    const result = await approveProjectProductionAction(
      projectId,
      detail.id,
      detail.revision,
    );
    setBusy(false);
    if (result.kind === "failure") {
      toast.error(translateError(result.code));
      return;
    }
    setDetail(result.production);
    upsert(result.production);
    setOpen(false);
    toast.success("Produção aprovada.");
  }

  async function reopen() {
    if (!detail || reopenReason.trim().length < 3) {
      toast.error("Informe o motivo da reabertura.");
      return;
    }
    setBusy(true);
    const result = await reopenProjectProductionAction({
      projectId,
      productionId: detail.id,
      expectedRevision: detail.revision,
      reason: reopenReason,
    });
    setBusy(false);
    if (result.kind === "failure") {
      toast.error(translateError(result.code));
      return;
    }
    setDetail(result.production);
    setDraft(draftFromDetail(result.production, options!));
    upsert(result.production);
    toast.success(
      result.production.rdo.stale
        ? "Produção reaberta. O RDO precisará ser reconfirmado."
        : "Produção reaberta.",
    );
  }

  async function addTrip(equipmentId: string, capacity?: string | null) {
    if (!detail) return;
    setBusy(true);
    const result = await addProjectProductionTripAction({
      projectId,
      productionId: detail.id,
      expectedRevision: detail.revision,
      productionEquipmentId: equipmentId,
      idempotencyKey: crypto.randomUUID(),
      capacityM3: capacity ?? undefined,
    });
    setBusy(false);
    if (result.kind === "failure") {
      toast.error(translateError(result.code));
      return;
    }
    setDetail(result.production);
    upsert(result.production);
    toast.success("Viagem registrada.");
  }

  async function removeTrip(tripId: string) {
    if (!detail) return;
    setBusy(true);
    const result = await removeProjectProductionTripAction({
      projectId,
      productionId: detail.id,
      tripId,
      expectedRevision: detail.revision,
    });
    setBusy(false);
    if (result.kind === "failure") {
      toast.error(translateError(result.code));
      return;
    }
    setDetail(result.production);
    upsert(result.production);
    toast.success("Viagem removida.");
  }

  async function loadMore() {
    if (!pageInfo.nextCursor) return;
    setLoadingMore(true);
    try {
      const page = await getMoreProjectProductionsAction(
        projectId,
        pageInfo.nextCursor,
      );
      setProductions((current) => [
        ...current,
        ...page.data.filter(
          (item) => !current.some((existing) => existing.id === item.id),
        ),
      ]);
      setPageInfo(page.pageInfo);
    } catch {
      toast.error("Não foi possível carregar mais produções.");
    } finally {
      setLoadingMore(false);
    }
  }

  function upsert(production: ProjectProductionDetail) {
    const summary = summaryFromDetail(production);
    setProductions((current) => [
      summary,
      ...current.filter((item) => item.id !== summary.id),
    ]);
  }

  function changeFront(workFrontId: string) {
    if (!options) return;
    const front = options.workFronts.find((item) => item.id === workFrontId);
    setDraft((current) => ({
      ...current,
      workFrontId,
      workFrontServiceId: front?.services[0]?.id ?? "",
      location: front?.location ?? "",
      equipment: machineDrafts(options, workFrontId),
    }));
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold">Produção de terraplenagem</h3>
          <p className="text-sm text-muted-foreground">
            Aponte o total do turno ou registre cada viagem durante o dia.
          </p>
        </div>
        <Button
          onClick={openNew}
          disabled={busy || !initialPage.capabilities.createDraft}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          Adicionar produção
        </Button>
      </div>

      <ProductionTotals productions={productions} />

      {productions.length ? (
        <div className="grid gap-2">
          {productions.map((production) => (
            <button
              key={production.id}
              type="button"
              onClick={() => openExisting(production.id)}
              className="grid min-h-20 gap-3 rounded-md border border-border bg-background p-3 text-left transition-colors hover:bg-muted sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <span className="flex min-w-0 items-start gap-3">
                {production.tripCount ? (
                  <Truck className="mt-0.5 size-5 shrink-0 text-primary" />
                ) : (
                  <Shovel className="mt-0.5 size-5 shrink-0 text-primary" />
                )}
                <span className="min-w-0">
                  <span className="block font-bold">
                    {serviceLabel(production.serviceCode)} ·{" "}
                    {formatDate(production.productionDate)}
                  </span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {formatQuantity(production.officialQuantity)}{" "}
                    {production.unitCode} · {production.tripCount} viagem(ns) ·{" "}
                    {production.equipmentCount} máquina(s)
                  </span>
                  {(production.route || production.dmtKm) && (
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {production.route?.origin ?? "Origem"} →{" "}
                      {production.route?.destination ?? "Destino"}
                      {production.dmtKm
                        ? ` · DMT ${formatQuantity(production.dmtKm)} km`
                        : ""}
                    </span>
                  )}
                </span>
              </span>
              <span className="flex items-center gap-2">
                {production.rdo.stale && (
                  <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-bold text-red-700">
                    RDO desatualizado
                  </span>
                )}
                <StatusBadge status={production.status} />
              </span>
            </button>
          ))}
          {pageInfo.hasNextPage && (
            <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
              {loadingMore && <Loader2 className="animate-spin" />}
              Carregar mais
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <Gauge className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-bold">Nenhuma produção lançada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Comece o apontamento do primeiro turno desta obra.
          </p>
        </div>
      )}

      <OperationsModal
        open={open}
        onOpenChange={(next) => !busy && setOpen(next)}
        size="xl"
        icon={Shovel}
        title={
          detail
            ? detail.status === "approved"
              ? "Produção aprovada"
              : "Continuar produção"
            : "Adicionar produção"
        }
        description="O volume medido prevalece como oficial. As viagens permanecem como memória operacional."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Fechar
            </Button>
            {editable ? (
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => save(false)}
                  disabled={busy}
                >
                  {busy ? <Loader2 className="animate-spin" /> : <Save />}
                  Salvar rascunho
                </Button>
                {detail ? (
                  <Button onClick={approve} disabled={busy}>
                    <Check /> Aprovar produção
                  </Button>
                ) : draft.entryMode === "trips" ? (
                  <Button onClick={() => save(false)} disabled={busy}>
                    <Truck /> Criar e registrar viagens
                  </Button>
                ) : (
                  <Button onClick={() => save(true)} disabled={busy}>
                    <Check /> Lançar direto
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={reopenReason}
                  onChange={(event) => setReopenReason(event.target.value)}
                  placeholder="Motivo da reabertura"
                  className="sm:w-64"
                  maxLength={500}
                />
                <Button variant="outline" onClick={reopen} disabled={busy}>
                  <RotateCcw /> Reabrir
                </Button>
              </div>
            )}
          </>
        }
      >
        {options ? (
          <div className="grid gap-4">
            {detail && <MetricsPanel detail={detail} />}
            <FormSection
              title="Turno e serviço"
              description="Uma mudança de rota deve ser lançada como outra produção."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Data">
                  <Input
                    type="date"
                    value={draft.productionDate}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({ ...draft, productionDate: event.target.value })
                    }
                  />
                </Field>
                <Field label="Turno">
                  <select
                    className={controlClass}
                    value={draft.shift}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        shift: event.target.value as "day" | "night",
                      })
                    }
                  >
                    <option value="day">Diurno</option>
                    <option value="night">Noturno</option>
                  </select>
                </Field>
                <Field label="Frente">
                  <select
                    className={controlClass}
                    value={draft.workFrontId}
                    disabled={!editable}
                    onChange={(event) => changeFront(event.target.value)}
                  >
                    {options.workFronts.map((front) => (
                      <option key={front.id} value={front.id}>
                        {front.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Serviço">
                  <select
                    className={controlClass}
                    value={draft.workFrontServiceId}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        workFrontServiceId: event.target.value,
                      })
                    }
                  >
                    {selectedFront?.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {serviceLabel(service.serviceCode)} · {service.unitCode}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Responsável">
                  <select
                    className={controlClass}
                    value={draft.responsibleEmploymentId}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        responsibleEmploymentId: event.target.value,
                      })
                    }
                  >
                    <option value="">Selecione</option>
                    {options.responsibleOptions.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name} · {person.jobRole}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Início">
                    <Input
                      type="time"
                      value={draft.startTime}
                      disabled={!editable}
                      onChange={(event) =>
                        setDraft({ ...draft, startTime: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Fim">
                    <Input
                      type="time"
                      value={draft.endTime}
                      disabled={!editable}
                      onChange={(event) =>
                        setDraft({ ...draft, endTime: event.target.value })
                      }
                    />
                  </Field>
                </div>
              </div>
            </FormSection>

            <FormSection title="Medição e localização">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Forma de lançamento">
                  <select
                    className={controlClass}
                    value={draft.entryMode}
                    disabled={!editable || Boolean(detail?.trips.length)}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        entryMode: event.target.value as
                          | "direct_total"
                          | "trips",
                      })
                    }
                  >
                    <option value="direct_total">Total consolidado</option>
                    <option value="trips">Viagem por viagem</option>
                  </select>
                </Field>
                <Field label="Condição do volume">
                  <select
                    className={controlClass}
                    value={draft.volumeCondition}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        volumeCondition: event.target
                          .value as ProductionDraft["volumeCondition"],
                      })
                    }
                  >
                    <option value="">Não se aplica</option>
                    <option value="cut">Em corte</option>
                    <option value="loose">Solto</option>
                    <option value="compacted">Compactado</option>
                  </select>
                </Field>
                {draft.entryMode === "direct_total" && (
                  <DecimalField
                    label={`Quantidade total (${selectedService?.unitCode ?? "un."})`}
                    value={draft.directQuantity}
                    disabled={!editable}
                    onChange={(directQuantity) =>
                      setDraft({ ...draft, directQuantity })
                    }
                  />
                )}
                <DecimalField
                  label="Quantidade medida/aceita"
                  value={draft.measuredQuantity}
                  disabled={!editable}
                  onChange={(measuredQuantity) =>
                    setDraft({ ...draft, measuredQuantity })
                  }
                />
                <Field label="Local/trecho">
                  <Input
                    value={draft.location}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({ ...draft, location: event.target.value })
                    }
                    maxLength={240}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Estaca inicial">
                    <Input
                      value={draft.startStation}
                      disabled={!editable}
                      onChange={(event) =>
                        setDraft({ ...draft, startStation: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Estaca final">
                    <Input
                      value={draft.endStation}
                      disabled={!editable}
                      onChange={(event) =>
                        setDraft({ ...draft, endStation: event.target.value })
                      }
                    />
                  </Field>
                </div>
                <Field label="Material">
                  <Input
                    value={draft.materialName}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({ ...draft, materialName: event.target.value })
                    }
                  />
                </Field>
                <Field label="Categoria/classificação">
                  <Input
                    value={draft.materialCategory}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        materialCategory: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Camada">
                  <Input
                    value={draft.layer}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({ ...draft, layer: event.target.value })
                    }
                  />
                </Field>
                <Field label="Cota">
                  <Input
                    value={draft.elevation}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({ ...draft, elevation: event.target.value })
                    }
                  />
                </Field>
                <DecimalField
                  label="Espessura da camada (cm)"
                  value={draft.layerThicknessCm}
                  disabled={!editable}
                  onChange={(layerThicknessCm) =>
                    setDraft({ ...draft, layerThicknessCm })
                  }
                />
                <Field label="Passadas de compactação">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.compactionPasses}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        compactionPasses: event.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Condição de umidade">
                  <Input
                    value={draft.moistureCondition}
                    disabled={!editable}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        moistureCondition: event.target.value,
                      })
                    }
                  />
                </Field>
              </div>
            </FormSection>

            {selectedService?.dmtPolicy !== "not_applicable" && (
              <FormSection
                title="Transporte e DMT"
                description={
                  selectedService?.dmtPolicy === "required"
                    ? "Origem, destino e DMT são obrigatórios para este serviço."
                    : "Preencha somente quando o contrato ou a medição controlar transporte."
                }
              >
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Origem">
                    <Input
                      value={draft.origin}
                      disabled={!editable}
                      onChange={(event) =>
                        setDraft({ ...draft, origin: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Destino">
                    <Input
                      value={draft.destination}
                      disabled={!editable}
                      onChange={(event) =>
                        setDraft({ ...draft, destination: event.target.value })
                      }
                    />
                  </Field>
                  <DecimalField
                    label="DMT (km)"
                    value={draft.dmtKm}
                    disabled={!editable}
                    onChange={(dmtKm) => setDraft({ ...draft, dmtKm })}
                  />
                </div>
              </FormSection>
            )}

            <FormSection
              title="Máquinas participantes"
              description="Selecione a função de cada máquina, horas, medidores e paradas."
            >
              <div className="grid gap-3">
                {selectedFront?.machines.map((machine) => {
                  const item =
                    draft.equipment[machine.id] ?? emptyEquipmentDraft();
                  return (
                    <div
                      key={machine.id}
                      className={cn(
                        "rounded-md border border-border bg-background p-3",
                        item.selected && "border-primary/50 bg-primary/5",
                      )}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          disabled={!editable}
                          onChange={(event) =>
                            updateEquipment(machine.id, {
                              selected: event.target.checked,
                            })
                          }
                          className="mt-1 size-4 accent-primary"
                        />
                        <span>
                          <span className="block font-bold">
                            {machine.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {machine.manufacturer} {machine.model}
                            {machine.identifier
                              ? ` · ${machine.identifier}`
                              : ""}{" "}
                            · Operador: {machine.operator.name}
                          </span>
                        </span>
                      </label>
                      {item.selected && (
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          <Field label="Função">
                            <select
                              className={controlClass}
                              value={item.role}
                              disabled={!editable}
                              onChange={(event) =>
                                updateEquipment(machine.id, {
                                  role: event.target
                                    .value as ProjectProductionEquipmentRole,
                                })
                              }
                            >
                              {Object.entries(roleLabels).map(
                                ([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ),
                              )}
                            </select>
                          </Field>
                          <Field label="Minutos trabalhados">
                            <Input
                              type="number"
                              min={0}
                              max={1440}
                              value={item.workedMinutes}
                              disabled={!editable}
                              onChange={(event) =>
                                updateEquipment(machine.id, {
                                  workedMinutes: event.target.value,
                                })
                              }
                            />
                          </Field>
                          {item.role === "transport" && (
                            <DecimalField
                              label="Capacidade (m³)"
                              value={item.capacityM3}
                              disabled={!editable}
                              onChange={(capacityM3) =>
                                updateEquipment(machine.id, { capacityM3 })
                              }
                            />
                          )}
                          <DecimalField
                            label={
                              machine.meterType === "hour_meter"
                                ? "Horímetro inicial"
                                : "Odômetro inicial"
                            }
                            value={item.initialMeterValue}
                            disabled={!editable}
                            onChange={(initialMeterValue) =>
                              updateEquipment(machine.id, { initialMeterValue })
                            }
                          />
                          <DecimalField
                            label={
                              machine.meterType === "hour_meter"
                                ? "Horímetro final"
                                : "Odômetro final"
                            }
                            value={item.finalMeterValue}
                            disabled={!editable}
                            onChange={(finalMeterValue) =>
                              updateEquipment(machine.id, { finalMeterValue })
                            }
                          />
                          <Field label="Parada (min)">
                            <Input
                              type="number"
                              min={0}
                              max={1440}
                              value={item.stopMinutes}
                              disabled={!editable}
                              onChange={(event) =>
                                updateEquipment(machine.id, {
                                  stopMinutes: event.target.value,
                                })
                              }
                            />
                          </Field>
                          {Number(item.stopMinutes) > 0 && (
                            <Field label="Motivo da parada">
                              <Input
                                value={item.stopReason}
                                disabled={!editable}
                                onChange={(event) =>
                                  updateEquipment(machine.id, {
                                    stopReason: event.target.value,
                                  })
                                }
                              />
                            </Field>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </FormSection>

            {detail?.entryMode === "trips" && (
              <FormSection
                title="Viagens do turno"
                description="Um toque registra a viagem com o horário atual e a capacidade configurada."
              >
                <div className="grid gap-2">
                  {detail.equipment
                    .filter((item) => item.role === "transport")
                    .map((equipment) => (
                      <div
                        key={equipment.id}
                        className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-bold">{equipment.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {equipment.tripCount} viagem(ns) ·{" "}
                            {formatQuantity(equipment.tripVolumeM3)} m³
                          </p>
                        </div>
                        {detail.status === "draft" && (
                          <Button
                            type="button"
                            onClick={() =>
                              addTrip(
                                equipment.id,
                                equipment.defaultTripCapacityM3,
                              )
                            }
                            disabled={busy}
                          >
                            {busy ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Plus />
                            )}
                            1 viagem
                          </Button>
                        )}
                      </div>
                    ))}
                  {!detail.equipment.some(
                    (item) => item.role === "transport",
                  ) && (
                    <p className="text-sm text-muted-foreground">
                      Selecione uma máquina com função Transporte e informe sua
                      capacidade.
                    </p>
                  )}
                  {detail.trips.length > 0 && (
                    <div className="mt-2 grid gap-2 border-t border-border pt-3">
                      {detail.trips.map((trip, index) => (
                        <div
                          key={trip.id}
                          className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-2"
                        >
                          <p className="min-w-0 text-sm">
                            <span className="font-bold">
                              Viagem {index + 1}
                            </span>{" "}
                            · {formatTripTime(trip.recordedAt)} ·{" "}
                            {formatQuantity(
                              trip.adjustedVolumeM3 ?? trip.capacityM3,
                            )}{" "}
                            m³
                            {trip.ticketNumber
                              ? ` · Ticket ${trip.ticketNumber}`
                              : ""}
                          </p>
                          {detail.status === "draft" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remover viagem ${index + 1}`}
                              disabled={busy}
                              onClick={() => removeTrip(trip.id)}
                            >
                              <Trash2 />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </FormSection>
            )}

            <FormSection
              title="Evidências"
              description="Cole um link por linha. Fotos, tickets e outros anexos ficam preservados no histórico da produção."
            >
              <div className="grid gap-3 lg:grid-cols-3">
                <EvidenceField
                  label="Fotos"
                  value={draft.photoUrls}
                  disabled={!editable}
                  onChange={(photoUrls) => setDraft({ ...draft, photoUrls })}
                />
                <EvidenceField
                  label="Tickets"
                  value={draft.ticketUrls}
                  disabled={!editable}
                  onChange={(ticketUrls) => setDraft({ ...draft, ticketUrls })}
                />
                <EvidenceField
                  label="Outros anexos"
                  value={draft.attachmentUrls}
                  disabled={!editable}
                  onChange={(attachmentUrls) =>
                    setDraft({ ...draft, attachmentUrls })
                  }
                />
              </div>
            </FormSection>

            <FormSection title="Observações">
              <textarea
                className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
                value={draft.notes}
                disabled={!editable}
                maxLength={10_000}
                onChange={(event) =>
                  setDraft({ ...draft, notes: event.target.value })
                }
              />
            </FormSection>
          </div>
        ) : (
          <div className="grid min-h-40 place-items-center">
            <Loader2 className="animate-spin text-primary" />
          </div>
        )}
      </OperationsModal>
    </div>
  );

  function updateEquipment(machineId: string, patch: Partial<EquipmentDraft>) {
    setDraft((current) => ({
      ...current,
      equipment: {
        ...current.equipment,
        [machineId]: {
          ...(current.equipment[machineId] ?? emptyEquipmentDraft()),
          ...patch,
        },
      },
    }));
  }
}

function ProductionTotals({
  productions,
}: {
  productions: ProjectProductionsPage["data"];
}) {
  const approved = productions.filter((item) => item.status === "approved");
  const trips = productions.reduce((total, item) => total + item.tripCount, 0);
  const pending = productions.length - approved.length;
  return (
    <dl className="grid gap-2 sm:grid-cols-3">
      <Metric label="Lançamentos" value={String(productions.length)} />
      <Metric label="Viagens registradas" value={String(trips)} />
      <Metric label="Aguardando aprovação" value={String(pending)} />
    </dl>
  );
}

function MetricsPanel({ detail }: { detail: ProjectProductionDetail }) {
  return (
    <dl className="grid gap-2 rounded-md border border-border bg-primary/5 p-3 sm:grid-cols-4">
      <Metric
        label="Quantidade oficial"
        value={`${formatQuantity(detail.metrics.officialQuantity)} ${detail.unitCode}`}
      />
      <Metric
        label="Volume operacional"
        value={`${formatQuantity(detail.metrics.operationalVolumeM3)} m³`}
      />
      <Metric label="Viagens" value={String(detail.metrics.tripCount)} />
      <Metric
        label="Produtividade"
        value={
          detail.metrics.quantityPerHour
            ? `${formatQuantity(detail.metrics.quantityPerHour)} ${detail.unitCode}/h`
            : "Sem janela"
        }
      />
    </dl>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <dt className="text-xs font-bold text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-bold">{value}</dd>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-bold">
      <span>{label}</span>
      {children}
    </label>
  );
}

function DecimalField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Field label={label}>
      <Input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(formatBrazilianDecimalInput(event.target.value, 3))
        }
      />
    </Field>
  );
}

function EvidenceField({
  disabled,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <Field label={label}>
      <textarea
        className="min-h-24 w-full rounded-md border border-input bg-background p-3 text-sm font-normal outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-60"
        value={value}
        disabled={disabled}
        placeholder="https://..."
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

function StatusBadge({ status }: { status: "draft" | "approved" }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-bold",
        status === "approved"
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
      )}
    >
      {status === "approved" ? "Aprovado" : "Rascunho"}
    </span>
  );
}

function emptyDraft(): ProductionDraft {
  return {
    workFrontId: "",
    workFrontServiceId: "",
    productionDate: todayInSaoPaulo(),
    shift: "day",
    entryMode: "direct_total",
    startTime: "07:00",
    endTime: "17:00",
    responsibleEmploymentId: "",
    location: "",
    startStation: "",
    endStation: "",
    layer: "",
    elevation: "",
    materialName: "",
    materialCategory: "",
    volumeCondition: "",
    directQuantity: "",
    measuredQuantity: "",
    conversionFactor: "",
    origin: "",
    destination: "",
    dmtKm: "",
    layerThicknessCm: "",
    compactionPasses: "",
    moistureCondition: "",
    photoUrls: "",
    ticketUrls: "",
    attachmentUrls: "",
    notes: "",
    equipment: {},
  };
}

function emptyEquipmentDraft(): EquipmentDraft {
  return {
    selected: false,
    role: "support",
    initialMeterValue: "",
    finalMeterValue: "",
    workedMinutes: "",
    capacityM3: "",
    stopMinutes: "",
    stopReason: "",
  };
}

function machineDrafts(options: ProjectProductionOptions, frontId: string) {
  return Object.fromEntries(
    (
      options.workFronts.find((front) => front.id === frontId)?.machines ?? []
    ).map((machine) => [machine.id, emptyEquipmentDraft()]),
  );
}

function draftFromDetail(
  detail: ProjectProductionDetail,
  options: ProjectProductionOptions,
): ProductionDraft {
  const equipment = machineDrafts(options, detail.workFrontId);
  for (const item of detail.equipment)
    equipment[item.machineId] = {
      selected: true,
      role: item.role,
      initialMeterValue: displayDecimal(item.initialMeterValue),
      finalMeterValue: displayDecimal(item.finalMeterValue),
      workedMinutes:
        item.workedMinutes === null ? "" : String(item.workedMinutes),
      capacityM3: displayDecimal(item.defaultTripCapacityM3),
      stopMinutes: item.stoppedMinutes ? String(item.stoppedMinutes) : "",
      stopReason: item.stops[0]?.reason ?? "",
    };
  return {
    workFrontId: detail.workFrontId,
    workFrontServiceId: detail.workFrontServiceId,
    productionDate: detail.productionDate,
    shift: detail.shift,
    entryMode: detail.entryMode,
    startTime: detail.startTime ?? "",
    endTime: detail.endTime ?? "",
    responsibleEmploymentId: detail.responsible?.employmentId ?? "",
    location: detail.location ?? "",
    startStation: detail.startStation ?? "",
    endStation: detail.endStation ?? "",
    layer: detail.layer ?? "",
    elevation: detail.elevation ?? "",
    materialName: detail.materialName ?? "",
    materialCategory: detail.materialCategory ?? "",
    volumeCondition: detail.volumeCondition ?? "",
    directQuantity: displayDecimal(detail.directQuantity),
    measuredQuantity: displayDecimal(detail.measuredQuantity),
    conversionFactor: displayDecimal(detail.conversionFactor),
    origin: detail.origin ?? "",
    destination: detail.destination ?? "",
    dmtKm: displayDecimal(detail.dmtKm),
    layerThicknessCm: displayDecimal(detail.layerThicknessCm),
    compactionPasses:
      detail.compactionPasses === null ? "" : String(detail.compactionPasses),
    moistureCondition: detail.moistureCondition ?? "",
    photoUrls: evidenceLines(detail, "photo"),
    ticketUrls: evidenceLines(detail, "ticket"),
    attachmentUrls: evidenceLines(detail, "attachment"),
    notes: detail.notes ?? "",
    equipment,
  };
}

function toCommand(
  draft: ProductionDraft,
  expectedRevision: number | undefined,
  approveNow: boolean,
  options: ProjectProductionOptions,
): ProjectProductionCommand {
  const front = options.workFronts.find(
    (item) => item.id === draft.workFrontId,
  );
  return {
    expectedRevision,
    approveNow,
    workFrontId: draft.workFrontId,
    workFrontServiceId: draft.workFrontServiceId,
    productionDate: draft.productionDate,
    shift: draft.shift,
    entryMode: draft.entryMode,
    startTime: draft.startTime || null,
    endTime: draft.endTime || null,
    endDayOffset:
      draft.shift === "night" && draft.endTime <= draft.startTime ? 1 : 0,
    responsibleEmploymentId: draft.responsibleEmploymentId || null,
    location: draft.location || null,
    startStation: draft.startStation || null,
    endStation: draft.endStation || null,
    layer: draft.layer || null,
    elevation: draft.elevation || null,
    materialName: draft.materialName || null,
    materialCategory: draft.materialCategory || null,
    volumeCondition: draft.volumeCondition || null,
    directQuantity: optionalDecimal(draft.directQuantity, 3),
    measuredQuantity: optionalDecimal(draft.measuredQuantity, 3),
    conversionFactor: optionalDecimal(draft.conversionFactor, 6),
    origin: draft.origin || null,
    destination: draft.destination || null,
    dmtKm: optionalDecimal(draft.dmtKm, 3),
    layerThicknessCm: optionalDecimal(draft.layerThicknessCm, 2),
    compactionPasses: draft.compactionPasses
      ? Number(draft.compactionPasses)
      : null,
    moistureCondition: draft.moistureCondition || null,
    evidence: [
      ...parseEvidenceLines(draft.photoUrls, "photo"),
      ...parseEvidenceLines(draft.ticketUrls, "ticket"),
      ...parseEvidenceLines(draft.attachmentUrls, "attachment"),
    ],
    notes: draft.notes || null,
    equipment: Object.entries(draft.equipment).flatMap(([machineId, item]) => {
      if (!item.selected) return [];
      const machine = front?.machines.find((option) => option.id === machineId);
      return [
        {
          machineId,
          role: item.role,
          operatorEmploymentId: machine?.operator.id ?? null,
          initialMeterValue: optionalDecimal(item.initialMeterValue, 2),
          finalMeterValue: optionalDecimal(item.finalMeterValue, 2),
          workedMinutes: item.workedMinutes ? Number(item.workedMinutes) : null,
          defaultTripCapacityM3: optionalDecimal(item.capacityM3, 3),
          stops:
            Number(item.stopMinutes) > 0 && item.stopReason.trim()
              ? [
                  {
                    durationMinutes: Number(item.stopMinutes),
                    reason: item.stopReason.trim(),
                    notes: null,
                  },
                ]
              : [],
        },
      ];
    }),
  };
}

function summaryFromDetail(
  detail: ProjectProductionDetail,
): ProjectProductionsPage["data"][number] {
  return {
    id: detail.id,
    serviceCode: detail.serviceCode,
    unitCode: detail.unitCode,
    productionDate: detail.productionDate,
    shift: detail.shift,
    status: detail.status,
    revision: detail.revision,
    location: detail.location,
    route:
      detail.origin || detail.destination
        ? { origin: detail.origin, destination: detail.destination }
        : null,
    dmtKm: detail.dmtKm,
    volumeCondition: detail.volumeCondition,
    officialQuantity: detail.metrics.officialQuantity,
    operationalVolumeM3: detail.metrics.operationalVolumeM3,
    tripCount: detail.metrics.tripCount,
    equipmentCount: detail.equipment.length,
    needsApproval: detail.status === "draft",
    rdo: detail.rdo,
    updatedAt: detail.updatedAt,
  };
}

function optionalDecimal(value: string, digits: number) {
  return value ? decimalInputToCanonical(value, digits) : null;
}

function evidenceLines(
  detail: ProjectProductionDetail,
  kind: ProjectProductionDetail["evidence"][number]["kind"],
) {
  return detail.evidence
    .filter((item) => item.kind === kind)
    .map((item) => item.url)
    .join("\n");
}

function parseEvidenceLines(
  value: string,
  kind: ProjectProductionDetail["evidence"][number]["kind"],
) {
  return value
    .split(/\r?\n/u)
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url, index) => ({
      kind,
      name: evidenceName(url, kind, index),
      url,
      notes: null,
    }));
}

function evidenceName(
  url: string,
  kind: ProjectProductionDetail["evidence"][number]["kind"],
  index: number,
) {
  try {
    const path = new URL(url).pathname.split("/").filter(Boolean).at(-1);
    if (path) return decodeURIComponent(path).slice(0, 160);
  } catch {
    // The API returns the canonical URL validation error.
  }
  const label =
    kind === "photo" ? "Foto" : kind === "ticket" ? "Ticket" : "Anexo";
  return `${label} ${index + 1}`;
}

function displayDecimal(value: string | null) {
  return value ? canonicalDecimalToBrazilian(value, 3) : "";
}

function formatQuantity(value: string) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00.000Z`),
  );
}

function formatTripTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function serviceLabel(code: string) {
  return serviceLabels[code] ?? code;
}

function translateError(code: string) {
  const messages: Record<string, string> = {
    PRODUCTION_APPROVAL_INCOMPLETE:
      "Complete responsável, horários, quantidade, máquinas e os campos técnicos obrigatórios.",
    PRODUCTION_REVISION_CONFLICT:
      "Este lançamento foi alterado em outro dispositivo. Reabra para atualizar.",
    PRODUCTION_DMT_REQUIRED: "Informe origem, destino e DMT para este serviço.",
    PRODUCTION_RESOURCE_UNAVAILABLE:
      "Uma frente, máquina, operador ou responsável não está mais disponível.",
    PRODUCTION_EQUIPMENT_HAS_TRIPS:
      "Não é possível remover um caminhão que já possui viagens.",
  };
  return messages[code] ?? "Não foi possível concluir o lançamento.";
}
