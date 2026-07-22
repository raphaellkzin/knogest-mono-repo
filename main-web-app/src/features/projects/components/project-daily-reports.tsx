"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  Clipboard,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FormErrorDeclaration } from "@/components/forms/form-error-declaration";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FormSection } from "@/components/ui/form-section";
import { Input } from "@/components/ui/input";
import { OperationsModal } from "@/components/ui/operations-modal";
import { cn } from "@/lib/utils";
import {
  finalizeProjectDailyReportAction,
  getMoreProjectDailyReportsAction,
  getProjectDailyReportAction,
  getProjectDailyReportOptionsAction,
  saveProjectDailyReportAction,
} from "../daily-reports.actions";
import { buildProjectDailyReportMessage } from "../daily-report-message";
import type {
  ProjectDailyReportCommand,
  ProjectDailyReportDetail,
  ProjectDailyReportOptions,
  ProjectDailyReportsPage,
  ProjectDailyReportSummary,
} from "../daily-reports.types";
import { copyTextToClipboard } from "../copy-to-clipboard";

const time = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u, "Use HH:MM.");
const duration = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u, "Use HH:MM.");
const decimal = z
  .string()
  .trim()
  .regex(/^\d{1,8}(?:[,.]\d{1,2})?$/u, "Informe um valor não negativo.");
const formSchema = z
  .object({
    reportDate: z.iso.date(),
    shift: z.enum(["day", "night"]),
    schedulePeriods: z
      .array(
        z.object({
          startTime: time,
          endTime: time,
          startDayOffset: z.number().int().min(0).max(1),
          endDayOffset: z.number().int().min(0).max(1),
        }),
      )
      .min(1)
      .max(6),
    activityStartTime: time,
    activityEndTime: time,
    activityEndDayOffset: z.number().int().min(0).max(1),
    activityTypes: z
      .array(z.enum(["earthworks", "drainage", "paving"]))
      .min(1, "Selecione ao menos uma atividade."),
    climateConditions: z
      .array(z.enum(["rain", "dry", "waterlogged_soil"]))
      .min(1, "Selecione ao menos uma condição climática."),
    dailyRainfallMm: decimal,
    monthlyRainfallMm: decimal,
    supervisorEmploymentId: z.string().uuid("Selecione o supervisor."),
    technicalResponsibilityEmploymentIds: z
      .array(z.string().uuid())
      .min(1, "Selecione ao menos um responsável técnico."),
    employees: z
      .array(
        z.object({
          employmentId: z.string().uuid(),
          completedFullShift: z.boolean(),
          regularDuration: duration,
          overtimeDuration: duration,
        }),
      )
      .min(1, "Selecione ao menos um participante."),
    machines: z.array(
      z.object({
        machineId: z.string().uuid(),
        endMeterReadingValue: decimal,
      }),
    ),
    executedActivities: z
      .string()
      .trim()
      .min(1, "Descreva as atividades executadas.")
      .max(10_000),
    interferences: z.string().trim().max(10_000),
  })
  .superRefine((values, context) => {
    const periods = values.schedulePeriods.map((period) => ({
      start: period.startDayOffset * 1440 + clockMinutes(period.startTime),
      end: period.endDayOffset * 1440 + clockMinutes(period.endTime),
    }));
    periods.forEach((period, index) => {
      if (period.end <= period.start)
        context.addIssue({
          code: "custom",
          path: ["schedulePeriods", index, "endTime"],
          message: "A faixa deve terminar depois do início.",
        });
      if (period.end - period.start > 1440)
        context.addIssue({
          code: "custom",
          path: ["schedulePeriods", index, "endTime"],
          message: "A faixa não pode ultrapassar 24 horas.",
        });
      if (index > 0 && period.start < periods[index - 1]!.end)
        context.addIssue({
          code: "custom",
          path: ["schedulePeriods", index, "startTime"],
          message: "As faixas devem estar ordenadas e não podem se sobrepor.",
        });
    });
    if (values.shift === "day" && values.activityEndDayOffset !== 0)
      context.addIssue({
        code: "custom",
        path: ["activityEndDayOffset"],
        message: "O turno diurno deve terminar na data do RDO.",
      });
    const activityStart = clockMinutes(values.activityStartTime);
    const inferredOffset =
      values.shift === "night" &&
      values.activityEndDayOffset === 0 &&
      clockMinutes(values.activityEndTime) <= activityStart
        ? 1
        : values.activityEndDayOffset;
    const activityEnd =
      inferredOffset * 1440 + clockMinutes(values.activityEndTime);
    if (activityEnd <= activityStart || activityEnd - activityStart > 1440)
      context.addIssue({
        code: "custom",
        path: ["activityEndTime"],
        message: "A janela efetiva deve ser positiva e ter no máximo 24 horas.",
      });
    values.employees.forEach((employee, index) => {
      const worked =
        durationMinutes(employee.regularDuration) +
        durationMinutes(employee.overtimeDuration);
      if (worked === 0 || worked > 1440)
        context.addIssue({
          code: "custom",
          path: ["employees", index, "regularDuration"],
          message: "A jornada deve ser positiva e ter no máximo 24 horas.",
        });
    });
  });

type DailyReportFormValues = z.infer<typeof formSchema>;

const activityOptions = [
  ["earthworks", "Terraplanagem"],
  ["drainage", "Drenagem"],
  ["paving", "Pavimentação"],
] as const;
const climateOptions = [
  ["rain", "Chuva"],
  ["dry", "Seco"],
  ["waterlogged_soil", "Solo encharcado"],
] as const;

export function ProjectDailyReports({
  initialPage,
  projectId,
}: {
  initialPage: ProjectDailyReportsPage;
  projectId: string;
}) {
  const [reports, setReports] = React.useState(initialPage.data);
  const [pageInfo, setPageInfo] = React.useState(initialPage.pageInfo);
  const [options, setOptions] =
    React.useState<ProjectDailyReportOptions | null>(null);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ProjectDailyReportDetail | null>(
    null,
  );
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailOpen, setDetailOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [issues, setIssues] = React.useState<
    React.ComponentProps<typeof FormErrorDeclaration>["issues"]
  >([]);
  const form = useForm<DailyReportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: emptyValues(),
  });
  const periods = useFieldArray({
    control: form.control,
    name: "schedulePeriods",
  });
  const selectedEmployees = useWatch({
    control: form.control,
    name: "employees",
  });
  const selectedMachines = useWatch({
    control: form.control,
    name: "machines",
  });
  const selectedActivities = useWatch({
    control: form.control,
    name: "activityTypes",
  });
  const selectedClimates = useWatch({
    control: form.control,
    name: "climateConditions",
  });
  const selectedTechnicians = useWatch({
    control: form.control,
    name: "technicalResponsibilityEmploymentIds",
  });
  const watchedPeriods = useWatch({
    control: form.control,
    name: "schedulePeriods",
  });
  const watchedActivityEndDayOffset = useWatch({
    control: form.control,
    name: "activityEndDayOffset",
  });
  const reportDateRegistration = form.register("reportDate");
  const shiftRegistration = form.register("shift");

  async function openNew() {
    setBusy(true);
    setIssues([]);
    try {
      const resolved = await getProjectDailyReportOptionsAction({
        projectId,
        reportDate: todayInSaoPaulo(),
        shift: "day",
      });
      setOptions(resolved);
      setEditingId(null);
      form.reset(valuesFromOptions(resolved));
      setFormOpen(true);
    } catch {
      toast.error("Não foi possível carregar o contexto vigente da obra.");
    } finally {
      setBusy(false);
    }
  }

  async function openReport(summary: ProjectDailyReportSummary) {
    setBusy(true);
    setIssues([]);
    try {
      const loaded = await getProjectDailyReportAction(projectId, summary.id);
      if (loaded.status === "finalized") {
        setDetail(loaded);
        setDetailOpen(true);
        return;
      }
      const resolved = await getProjectDailyReportOptionsAction({
        projectId,
        reportDate: loaded.reportDate,
        shift: loaded.shift,
      });
      setOptions(resolved);
      setEditingId(loaded.id);
      setDetail(loaded);
      form.reset(valuesFromDetail(loaded));
      setFormOpen(true);
    } catch {
      toast.error("Não foi possível abrir este RDO.");
    } finally {
      setBusy(false);
    }
  }

  async function replaceTemporalContext(
    reportDate: string,
    shift: "day" | "night",
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(reportDate)) return;
    if (
      options?.defaults.reportDate === reportDate &&
      options.defaults.shift === shift
    )
      return;
    setBusy(true);
    try {
      const resolved = await getProjectDailyReportOptionsAction({
        projectId,
        reportDate,
        shift,
      });
      setOptions(resolved);
      form.reset(valuesFromOptions(resolved));
      setDetail(null);
      toast.info("Contexto do RDO atualizado para a nova data e turno.");
    } catch {
      toast.error("A obra não está disponível nessa data e turno.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(values: DailyReportFormValues) {
    if (!options) return;
    setBusy(true);
    setIssues([]);
    const invalidMachine = values.machines.find((entry) => {
      const machine = options.machineOptions.find(
        (option) => option.id === entry.machineId,
      );
      return (
        machine &&
        Number(canonicalDecimal(entry.endMeterReadingValue)) <
          Number(machine.startMeterReading.value)
      );
    });
    if (invalidMachine) {
      setIssues([
        {
          location: "Máquinas",
          message: "A leitura final não pode ser menor que a leitura inicial.",
        },
      ]);
      setBusy(false);
      return;
    }
    const result = await saveProjectDailyReportAction({
      projectId,
      reportId: editingId ?? undefined,
      command: toCommand(values),
    });
    setBusy(false);
    if (result.kind === "failure") {
      setIssues([
        {
          location: "RDO",
          message: `${translatedError(result.code, result.message)}${result.requestId ? ` Solicitação: ${result.requestId}.` : ""}`,
        },
      ]);
      return;
    }
    setEditingId(result.report.id);
    setDetail(result.report);
    upsertSummary(result.report);
    toast.success("Rascunho do RDO salvo.");
  }

  async function finalize(values: DailyReportFormValues) {
    if (!editingId) return;
    setBusy(true);
    setIssues([]);
    const saved = await saveProjectDailyReportAction({
      projectId,
      reportId: editingId,
      command: toCommand(values),
    });
    if (saved.kind === "failure") {
      setBusy(false);
      setIssues([
        {
          location: "Finalização",
          message: translatedError(saved.code, saved.message),
        },
      ]);
      return;
    }
    upsertSummary(saved.report);
    const result = await finalizeProjectDailyReportAction(
      projectId,
      saved.report.id,
    );
    setBusy(false);
    if (result.kind === "failure") {
      setIssues([
        {
          location: "Finalização",
          message: translatedError(result.code, result.message),
        },
      ]);
      return;
    }
    upsertSummary(result.report);
    setDetail(result.report);
    setFormOpen(false);
    setDetailOpen(true);
    toast.success("RDO finalizado. Jornadas e medidores foram registrados.");
  }

  function upsertSummary(report: ProjectDailyReportDetail) {
    const summary = summaryFromDetail(report);
    setReports((current) =>
      [summary, ...current.filter((item) => item.id !== summary.id)].sort(
        compareSummaries,
      ),
    );
  }

  async function loadMore() {
    if (!pageInfo.nextCursor) return;
    setBusy(true);
    try {
      const next = await getMoreProjectDailyReportsAction(
        projectId,
        pageInfo.nextCursor,
      );
      setReports((current) => [
        ...current,
        ...next.data.filter(
          (item) => !current.some((existing) => existing.id === item.id),
        ),
      ]);
      setPageInfo(next.pageInfo);
    } catch {
      toast.error("Não foi possível carregar mais RDOs.");
    } finally {
      setBusy(false);
    }
  }

  async function copyMessage() {
    if (!detail || detail.status !== "finalized") return;
    const copied = await copyTextToClipboard(
      buildProjectDailyReportMessage(detail),
    );
    if (copied) toast.success("Mensagem do RDO copiada.");
    else toast.error("Não foi possível copiar a mensagem neste dispositivo.");
  }

  const formIssues = [...issues, ...collectFormIssues(form.formState.errors)];

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold">Relatórios Diários de Obra</h3>
          <p className="text-sm text-muted-foreground">
            Um RDO por data e turno. Finalizados preservam o histórico da obra.
          </p>
        </div>
        <Button onClick={openNew} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Plus />}
          Novo RDO
        </Button>
      </div>

      {reports.length ? (
        <div className="grid gap-2">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => openReport(report)}
              className="flex min-h-14 items-center justify-between gap-3 rounded-md border border-border bg-background px-4 py-3 text-left transition-colors hover:bg-muted"
            >
              <span className="flex min-w-0 items-center gap-3">
                <CalendarDays className="size-5 shrink-0 text-primary" />
                <span>
                  <span className="block font-bold">
                    {formatDate(report.reportDate)} ·{" "}
                    {report.shift === "day" ? "Diurno" : "Noturno"}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {report.activityStartTime}–{report.activityEndTime}
                    {report.activityEndDayOffset ? " (+1 dia)" : ""}
                  </span>
                </span>
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold",
                  report.status === "finalized"
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                )}
              >
                {report.status === "finalized" ? "Finalizado" : "Rascunho"}
              </span>
            </button>
          ))}
          {pageInfo.hasNextPage && (
            <Button variant="outline" onClick={loadMore} disabled={busy}>
              Carregar mais
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-8 text-center">
          <FileText className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="font-bold">Nenhum RDO cadastrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie o primeiro relatório diário desta obra.
          </p>
        </div>
      )}

      <OperationsModal
        open={formOpen}
        onOpenChange={setFormOpen}
        size="xl"
        icon={FileText}
        title={editingId ? "Continuar RDO" : "Novo RDO"}
        description="Preencha o relatório manual. O rascunho ainda não altera jornadas ou medidores."
        footer={
          <>
            <div>
              {editingId && (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button variant="destructive" disabled={busy}>
                        Finalizar RDO
                      </Button>
                    }
                  />
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Finalizar este RDO?</AlertDialogTitle>
                      <AlertDialogDescription>
                        As jornadas e leituras finais das máquinas serão
                        gravadas. Depois disso, o relatório não poderá mais ser
                        editado.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        Não, continuar editando
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void form.handleSubmit(finalize)()}
                        disabled={busy}
                      >
                        Sim, finalizar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                Fechar
              </Button>
              <Button
                onClick={form.handleSubmit(submit)}
                disabled={busy || !options}
              >
                {busy && <Loader2 className="animate-spin" />}
                Salvar rascunho
              </Button>
            </div>
          </>
        }
      >
        <form className="grid gap-4" onSubmit={form.handleSubmit(submit)}>
          <FormErrorDeclaration issues={formIssues} />
          <FormSection title="Identificação">
            <div className="grid gap-2 rounded-md border border-border bg-muted/40 p-3 text-sm sm:grid-cols-3">
              <Info label="Obra" value={options?.project.name ?? "—"} />
              <Info
                label="Município"
                value={
                  [options?.project.municipality, options?.project.state]
                    .filter(Boolean)
                    .join("/") || "Não informado"
                }
              />
              <Info
                label="Contrato"
                value={options?.project.contract ?? "Não informado"}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Data do RDO">
                <Input
                  type="date"
                  max={todayInSaoPaulo()}
                  {...reportDateRegistration}
                  onBlur={(event) => {
                    void reportDateRegistration.onBlur(event);
                    void replaceTemporalContext(
                      event.target.value,
                      form.getValues("shift"),
                    );
                  }}
                />
              </Field>
              <Field label="Turno">
                <select
                  className={controlClass}
                  {...shiftRegistration}
                  onChange={(event) => {
                    void shiftRegistration.onChange(event);
                    void replaceTemporalContext(
                      form.getValues("reportDate"),
                      event.target.value as "day" | "night",
                    );
                  }}
                >
                  <option value="day">Diurno</option>
                  <option value="night">Noturno</option>
                </select>
              </Field>
              <Field label="Supervisor">
                <select
                  className={controlClass}
                  {...form.register("supervisorEmploymentId")}
                >
                  <option value="">Selecione</option>
                  {options?.responsibleOptions.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-1.5 text-sm">
                <span className="font-semibold">Responsáveis técnicos</span>
                <div className="grid gap-2 rounded-md border border-border p-3">
                  {options?.responsibleOptions.map((person) => (
                    <CheckLine
                      key={person.id}
                      checked={selectedTechnicians.includes(person.id)}
                      label={person.name}
                      onChange={(checked) =>
                        toggleString(
                          form,
                          "technicalResponsibilityEmploymentIds",
                          person.id,
                          checked,
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Horário e clima"
            description={`Escala vigente: ${options?.defaults.scheduleScale ?? "carregando…"}`}
          >
            <div className="grid gap-3">
              {periods.fields.map((period, index) => (
                <div
                  key={period.id}
                  className="grid items-end gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                >
                  <Field label={`Faixa ${index + 1} — início`}>
                    <Input
                      type="time"
                      {...form.register(`schedulePeriods.${index}.startTime`)}
                    />
                  </Field>
                  <Field label="Fim">
                    <Input
                      type="time"
                      {...form.register(`schedulePeriods.${index}.endTime`)}
                    />
                  </Field>
                  <CheckLine
                    checked={watchedPeriods[index]?.endDayOffset === 1}
                    label="Dia seguinte"
                    onChange={(checked) =>
                      form.setValue(
                        `schedulePeriods.${index}.endDayOffset`,
                        checked ? 1 : 0,
                        { shouldDirty: true },
                      )
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Remover faixa"
                    disabled={periods.fields.length === 1}
                    onClick={() => periods.remove(index)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              {periods.fields.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    periods.append({
                      startTime: "13:00",
                      endTime: "18:00",
                      startDayOffset: 0,
                      endDayOffset: 0,
                    })
                  }
                >
                  <Plus /> Adicionar faixa
                </Button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Início efetivo">
                <Input type="time" {...form.register("activityStartTime")} />
              </Field>
              <Field label="Encerramento efetivo">
                <Input type="time" {...form.register("activityEndTime")} />
              </Field>
              <CheckLine
                checked={watchedActivityEndDayOffset === 1}
                label="Encerramento no dia seguinte"
                onChange={(checked) =>
                  form.setValue("activityEndDayOffset", checked ? 1 : 0, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <ChoiceGrid title="Atividades">
              {activityOptions.map(([value, label]) => (
                <CheckLine
                  key={value}
                  checked={selectedActivities.includes(value)}
                  label={label}
                  onChange={(checked) =>
                    toggleString(form, "activityTypes", value, checked)
                  }
                />
              ))}
            </ChoiceGrid>
            <ChoiceGrid title="Condições climáticas">
              {climateOptions.map(([value, label]) => (
                <CheckLine
                  key={value}
                  checked={selectedClimates.includes(value)}
                  label={label}
                  onChange={(checked) =>
                    toggleString(form, "climateConditions", value, checked)
                  }
                />
              ))}
            </ChoiceGrid>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Índice pluviométrico diário (mm)">
                <Input
                  inputMode="decimal"
                  {...form.register("dailyRainfallMm")}
                />
              </Field>
              <Field label="Acumulado mensal (mm)">
                <Input
                  inputMode="decimal"
                  {...form.register("monthlyRainfallMm")}
                />
              </Field>
            </div>
          </FormSection>

          <FormSection
            title="Equipe"
            description="Marque quem participou e ajuste somente as exceções."
          >
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  form.setValue(
                    "employees",
                    (options?.employeeOptions ?? []).map((employee) => ({
                      employmentId: employee.id,
                      completedFullShift: true,
                      regularDuration: formatDuration(
                        employee.expectedDailyWorkloadMinutes,
                      ),
                      overtimeDuration: "00:00",
                    })),
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
              >
                Todos completaram o turno
              </Button>
            </div>
            <div className="grid gap-2">
              {options?.employeeOptions.map((employee) => {
                const index = selectedEmployees.findIndex(
                  (entry) => entry.employmentId === employee.id,
                );
                const selected = index >= 0;
                return (
                  <div
                    key={employee.id}
                    className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[minmax(12rem,1fr)_auto_8rem_8rem] md:items-end"
                  >
                    <CheckLine
                      checked={selected}
                      label={`${employee.name} — ${employee.jobRole}`}
                      onChange={(checked) => {
                        const current = form.getValues("employees");
                        form.setValue(
                          "employees",
                          checked
                            ? [
                                ...current,
                                {
                                  employmentId: employee.id,
                                  completedFullShift: true,
                                  regularDuration: formatDuration(
                                    employee.expectedDailyWorkloadMinutes,
                                  ),
                                  overtimeDuration: "00:00",
                                },
                              ]
                            : current.filter(
                                (entry) => entry.employmentId !== employee.id,
                              ),
                          { shouldDirty: true, shouldValidate: true },
                        );
                      }}
                    />
                    {selected && (
                      <>
                        <CheckLine
                          checked={selectedEmployees[index]!.completedFullShift}
                          label="Turno completo"
                          onChange={(checked) => {
                            form.setValue(
                              `employees.${index}.completedFullShift`,
                              checked,
                              { shouldDirty: true },
                            );
                            if (checked)
                              form.setValue(
                                `employees.${index}.regularDuration`,
                                formatDuration(
                                  employee.expectedDailyWorkloadMinutes,
                                ),
                                { shouldDirty: true },
                              );
                          }}
                        />
                        <Field label="Horas normais">
                          <Input
                            inputMode="numeric"
                            disabled={
                              selectedEmployees[index]!.completedFullShift
                            }
                            {...form.register(
                              `employees.${index}.regularDuration`,
                            )}
                          />
                        </Field>
                        <Field label="Horas extras">
                          <Input
                            inputMode="numeric"
                            {...form.register(
                              `employees.${index}.overtimeDuration`,
                            )}
                          />
                        </Field>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </FormSection>

          <FormSection
            title="Máquinas"
            description="A leitura inicial oficial é bloqueada. Informe apenas a leitura final."
          >
            <div className="grid gap-2">
              {options?.machineOptions.length ? (
                options.machineOptions.map((machine) => {
                  const index = selectedMachines.findIndex(
                    (entry) => entry.machineId === machine.id,
                  );
                  const selected = index >= 0;
                  return (
                    <div
                      key={machine.id}
                      className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[minmax(12rem,1fr)_9rem_9rem] sm:items-end"
                    >
                      <CheckLine
                        checked={selected}
                        label={`${machine.name} — ${machine.manufacturer} ${machine.model} · ${machine.meterType === "hour_meter" ? "Horímetro" : "Odômetro"}`}
                        onChange={(checked) => {
                          const current = form.getValues("machines");
                          form.setValue(
                            "machines",
                            checked
                              ? [
                                  ...current,
                                  {
                                    machineId: machine.id,
                                    endMeterReadingValue:
                                      machine.startMeterReading.value,
                                  },
                                ]
                              : current.filter(
                                  (entry) => entry.machineId !== machine.id,
                                ),
                            { shouldDirty: true, shouldValidate: true },
                          );
                        }}
                      />
                      <Field label="Leitura inicial">
                        <Input
                          value={machine.startMeterReading.value}
                          disabled
                        />
                      </Field>
                      {selected && (
                        <Field label="Leitura final">
                          <Input
                            inputMode="decimal"
                            {...form.register(
                              `machines.${index}.endMeterReadingValue`,
                            )}
                          />
                        </Field>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma máquina mobilizada possui leitura oficial anterior a
                  este turno.
                </p>
              )}
            </div>
          </FormSection>

          <FormSection title="Ocorrências">
            <Field label="Atividades executadas">
              <textarea
                className={cn(controlClass, "min-h-32 resize-y py-3")}
                {...form.register("executedActivities")}
              />
            </Field>
            <Field label="Interferências (opcional)">
              <textarea
                className={cn(controlClass, "min-h-24 resize-y py-3")}
                {...form.register("interferences")}
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              Abastecimento: não informado nesta primeira versão.
            </p>
          </FormSection>
        </form>
      </OperationsModal>

      <OperationsModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        size="xl"
        icon={FileText}
        title="Detalhes do RDO"
        description="Registro finalizado e imutável."
        footer={
          detail?.status === "finalized" ? (
            <>
              <span className="text-sm text-muted-foreground">
                Finalizado em {formatDateTime(detail.finalizedAt)}
              </span>
              <Button onClick={copyMessage}>
                <Clipboard /> Copiar mensagem
              </Button>
            </>
          ) : undefined
        }
      >
        {detail && (
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6">
            {buildProjectDailyReportMessage(detail)}
          </pre>
        )}
      </OperationsModal>
    </div>
  );
}

function valuesFromOptions(
  options: ProjectDailyReportOptions,
): DailyReportFormValues {
  return {
    reportDate: options.defaults.reportDate,
    shift: options.defaults.shift,
    schedulePeriods: options.defaults.schedulePeriods,
    activityStartTime: options.defaults.activityStartTime,
    activityEndTime: options.defaults.activityEndTime,
    activityEndDayOffset: options.defaults.activityEndDayOffset,
    activityTypes: ["earthworks"],
    climateConditions: ["dry"],
    dailyRainfallMm: "0,00",
    monthlyRainfallMm: "0,00",
    supervisorEmploymentId: options.defaults.supervisorEmploymentId ?? "",
    technicalResponsibilityEmploymentIds:
      options.defaults.technicalResponsibilityEmploymentIds,
    employees: [],
    machines: [],
    executedActivities: "",
    interferences: "",
  };
}

function valuesFromDetail(
  report: ProjectDailyReportDetail,
): DailyReportFormValues {
  return {
    reportDate: report.reportDate,
    shift: report.shift,
    schedulePeriods: report.schedulePeriods,
    activityStartTime: report.activityWindow.startTime,
    activityEndTime: report.activityWindow.endTime,
    activityEndDayOffset: report.activityWindow.endDayOffset,
    activityTypes: [...report.activityTypes],
    climateConditions: [...report.climateConditions],
    dailyRainfallMm: report.rainfall.dailyMm.replace(".", ","),
    monthlyRainfallMm: report.rainfall.monthlyMm.replace(".", ","),
    supervisorEmploymentId: report.supervisor.employmentId,
    technicalResponsibilityEmploymentIds: report.technicalResponsibilities.map(
      (item) => item.employmentId,
    ),
    employees: report.employees.map((employee) => ({
      employmentId: employee.employmentId,
      completedFullShift: employee.completedFullShift,
      regularDuration: formatDuration(employee.regularWorkedMinutes),
      overtimeDuration: formatDuration(employee.overtimeMinutes),
    })),
    machines: report.machines.map((machine) => ({
      machineId: machine.machineId,
      endMeterReadingValue: machine.endMeterReading.value.replace(".", ","),
    })),
    executedActivities: report.executedActivities,
    interferences: report.interferences ?? "",
  };
}

function emptyValues(): DailyReportFormValues {
  return {
    reportDate: todayInSaoPaulo(),
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
    activityTypes: ["earthworks"],
    climateConditions: ["dry"],
    dailyRainfallMm: "0,00",
    monthlyRainfallMm: "0,00",
    supervisorEmploymentId: "",
    technicalResponsibilityEmploymentIds: [],
    employees: [],
    machines: [],
    executedActivities: "",
    interferences: "",
  };
}

function toCommand(values: DailyReportFormValues): ProjectDailyReportCommand {
  return {
    reportDate: values.reportDate,
    shift: values.shift,
    schedulePeriods: values.schedulePeriods,
    activityStartTime: values.activityStartTime,
    activityEndTime: values.activityEndTime,
    activityEndDayOffset: values.activityEndDayOffset,
    activityTypes: values.activityTypes,
    climateConditions: values.climateConditions,
    dailyRainfallMm: canonicalDecimal(values.dailyRainfallMm),
    monthlyRainfallMm: canonicalDecimal(values.monthlyRainfallMm),
    supervisorEmploymentId: values.supervisorEmploymentId,
    technicalResponsibilityEmploymentIds:
      values.technicalResponsibilityEmploymentIds,
    employees: values.employees.map((employee) => ({
      employmentId: employee.employmentId,
      completedFullShift: employee.completedFullShift,
      regularWorkedMinutes: durationMinutes(employee.regularDuration),
      overtimeMinutes: durationMinutes(employee.overtimeDuration),
    })),
    machines: values.machines.map((machine) => ({
      machineId: machine.machineId,
      endMeterReadingValue: canonicalDecimal(machine.endMeterReadingValue),
    })),
    executedActivities: values.executedActivities.trim(),
    interferences: values.interferences.trim() || null,
  };
}

function summaryFromDetail(
  report: ProjectDailyReportDetail,
): ProjectDailyReportSummary {
  return {
    id: report.id,
    reportDate: report.reportDate,
    shift: report.shift,
    status: report.status,
    activityStartTime: report.activityWindow.startTime,
    activityEndTime: report.activityWindow.endTime,
    activityEndDayOffset: report.activityWindow.endDayOffset,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    finalizedAt: report.finalizedAt,
  };
}

function compareSummaries(
  left: ProjectDailyReportSummary,
  right: ProjectDailyReportSummary,
) {
  const date = right.reportDate.localeCompare(left.reportDate);
  if (date) return date;
  return Number(right.shift === "night") - Number(left.shift === "night");
}

function toggleString(
  form: UseFormReturn<DailyReportFormValues>,
  name:
    | "technicalResponsibilityEmploymentIds"
    | "activityTypes"
    | "climateConditions",
  value: string,
  checked: boolean,
) {
  if (name === "technicalResponsibilityEmploymentIds") {
    const current = form.getValues(name);
    form.setValue(
      name,
      checked
        ? [...new Set([...current, value])]
        : current.filter((item) => item !== value),
      { shouldDirty: true, shouldValidate: true },
    );
    return;
  }
  if (name === "activityTypes") {
    const activity = value as DailyReportFormValues["activityTypes"][number];
    const current = form.getValues(name);
    form.setValue(
      name,
      checked
        ? [...new Set([...current, activity])]
        : current.filter((item) => item !== activity),
      { shouldDirty: true, shouldValidate: true },
    );
    return;
  }
  const climate = value as DailyReportFormValues["climateConditions"][number];
  const current = form.getValues(name);
  form.setValue(
    name,
    checked
      ? [...new Set([...current, climate])]
      : current.filter((item) => item !== climate),
    { shouldDirty: true, shouldValidate: true },
  );
}

function collectFormIssues(errors: object, prefix = "") {
  const issues: React.ComponentProps<typeof FormErrorDeclaration>["issues"] =
    [];
  Object.entries(errors).forEach(([key, value]) => {
    if (!value || typeof value !== "object") return;
    const field = prefix ? `${prefix}.${key}` : key;
    if ("message" in value && typeof value.message === "string")
      issues.push({ field: formFieldLabel(field), message: value.message });
    else issues.push(...collectFormIssues(value, field));
  });
  return issues;
}

function formFieldLabel(field: string) {
  const labels: Array<[string, string]> = [
    ["schedulePeriods", "Horário padrão"],
    ["activityStartTime", "Início efetivo"],
    ["activityEndTime", "Encerramento efetivo"],
    ["activityTypes", "Atividades"],
    ["climateConditions", "Clima"],
    ["dailyRainfallMm", "Índice pluviométrico"],
    ["monthlyRainfallMm", "Acumulado mensal"],
    ["supervisorEmploymentId", "Supervisor"],
    ["technicalResponsibilityEmploymentIds", "Responsáveis técnicos"],
    ["employees", "Jornada individual"],
    ["machines", "Máquinas"],
    ["executedActivities", "Atividades executadas"],
    ["interferences", "Interferências"],
    ["reportDate", "Data do RDO"],
    ["shift", "Turno"],
  ];
  return labels.find(([prefix]) => field.startsWith(prefix))?.[1] ?? "RDO";
}

function translatedError(code: string, fallback: string) {
  const messages: Record<string, string> = {
    DAILY_REPORT_ALREADY_EXISTS: "Já existe um RDO para esta data e turno.",
    DAILY_REPORT_IMMUTABLE:
      "Este RDO já foi finalizado e não pode ser alterado.",
    DAILY_REPORT_PROJECT_UNAVAILABLE:
      "A obra não está disponível para esse período.",
    DAILY_REPORT_RESOURCE_UNAVAILABLE:
      "Um responsável, funcionário ou equipamento deixou de estar disponível.",
    DAILY_REPORT_METER_READING_CONFLICT:
      "O histórico de uma máquina mudou. Reabra o RDO para atualizar a leitura inicial.",
  };
  return messages[code] ?? fallback;
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 block truncate font-semibold" title={value}>
        {value}
      </span>
    </div>
  );
}

function ChoiceGrid({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="grid gap-2 text-sm">
      <span className="font-semibold">{title}</span>
      <div className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-3">
        {children}
      </div>
    </div>
  );
}

function CheckLine({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

const controlClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

function canonicalDecimal(value: string) {
  return value.replace(",", ".");
}

function durationMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours! * 60 + minutes!;
}

function clockMinutes(value: string) {
  return durationMinutes(value);
}

function formatDuration(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T12:00:00.000Z`),
  );
}

function formatDateTime(value: string | null) {
  if (!value) return "não informado";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function todayInSaoPaulo() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}
