"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  ArrowLeft,
  CalendarDays,
  FileSearch,
  RotateCcw,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import type { EmployeeActionState } from "../employees-action-state";
import type { EmployeeDetail } from "../employees.server";

type EmployeeAction = (
  state: EmployeeActionState,
  formData: FormData,
) => Promise<EmployeeActionState>;

const initialState: EmployeeActionState = { ok: false, message: "" };

export function EmployeeDetailPage({
  action,
  jobRoleAction,
  jobRoles,
  record,
}: {
  action: EmployeeAction;
  jobRoleAction: EmployeeAction;
  jobRoles: Array<{ id: string; name: string; isActive: boolean }>;
  record: EmployeeDetail;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const [jobRoleState, jobRoleFormAction] = useActionState(jobRoleAction, initialState);
  const canRehire = record.employment.state === "terminated";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/home/funcionarios"
          className={buttonVariants({ variant: "outline" })}
        >
          <ArrowLeft className="size-4" />
          Funcionários
        </Link>

        {canRehire && (
          <form action={formAction} className="flex flex-col gap-2 sm:items-end">
            <input type="hidden" name="employmentId" value={record.id} />
            <RehireButton />
            {state.message && (
              <p
                role="status"
                className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                  state.ok
                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                    : "border-red-200 bg-red-50 text-red-950"
                }`}
              >
                {state.message}
              </p>
            )}
          </form>
        )}
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-secondary/60 px-4 py-3">
          <h1 className="text-xl font-bold">{record.person.fullName}</h1>
          <p className="text-sm font-semibold text-muted-foreground">
            Matrícula {record.employment.companyRegistrationNumber}
          </p>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-3">
          <DetailGroup icon={UserRound} title="Pessoa">
            <Detail label="Nome" value={record.person.fullName} />
            <Detail
              label="CPF autorizado"
              value={record.person.document.plaintextDocument}
            />
            <Detail
              label="CPF mascarado"
              value={record.person.document.maskedDocument}
            />
          </DetailGroup>
          <DetailGroup icon={FileSearch} title="Vínculo">
            <Detail
              label="Estado"
              value={
                record.employment.state === "active" ? "Ativo" : "Encerrado"
              }
            />
            <Detail
              label="Disponibilidade"
              value={
                record.availability.state === "available"
                  ? "Disponível"
                  : "Indisponível"
              }
            />
            <Detail
              label="Alocação aberta"
              value={record.availability.hasOpenAllocation ? "Sim" : "Não"}
            />
            <Detail label="Função atual" value={record.employment.jobRole?.name ?? "Função pendente"} />
            {record.availability.functionPending && <p className="text-sm text-destructive">Defina uma função antes de alocar este funcionário.</p>}
          </DetailGroup>
          <DetailGroup icon={UserRound} title="Histórico de funções">
            {record.jobRolePeriods.map((period) => <div key={period.id} className="rounded-md bg-muted p-3"><Detail label="Função" value={period.jobRole.name} /><Detail label="Estado" value={period.state === "current" ? "Atual" : "Encerrada"} /><Detail label="Início" value={formatDate(period.effectiveFrom)} />{period.reason && <Detail label="Motivo" value={period.reason} />}</div>)}
          </DetailGroup>
          <DetailGroup icon={CalendarDays} title="Histórico de períodos">
            {record.periods.map((period) => (
              <div key={period.id} className="rounded-md bg-muted p-3">
                <Detail
                  label="Estado"
                  value={period.state === "current" ? "Atual" : "Encerrado"}
                />
                <Detail
                  label="Admissão"
                  value={formatDate(period.admissionDate)}
                />
                <Detail
                  label="Início efetivo"
                  value={formatDate(period.effectiveFrom)}
                />
                <Detail
                  label="Fim efetivo"
                  value={
                    period.effectiveTo ? formatDate(period.effectiveTo) : "Aberto"
                  }
                />
                {period.terminationReason && (
                  <Detail label="Motivo" value={period.terminationReason} />
                )}
              </div>
            ))}
          </DetailGroup>
        </div>
        {record.employment.state === "active" && <form action={jobRoleFormAction} className="grid gap-3 border-t p-4 sm:grid-cols-3"><input type="hidden" name="employmentId" value={record.id} /><select name="jobRoleId" required defaultValue="" className="h-10 rounded-md border px-3"><option value="">Alterar função…</option>{jobRoles.filter((role) => role.isActive && role.id !== record.employment.jobRole?.id).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select><input name="reason" required maxLength={240} placeholder="Motivo da alteração" className="h-10 rounded-md border px-3" /><Button type="submit">Salvar função</Button>{jobRoleState.message && <p role="status" className="text-sm sm:col-span-3">{jobRoleState.message}</p>}</form>}
      </section>
    </div>
  );
}

function RehireButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <RotateCcw className="size-4" />
      {pending ? "Recontratando" : "Recontratar funcionário"}
    </Button>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(value),
  );
}

function DetailGroup({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <article className="space-y-3">
      <h2 className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground">
        <Icon className="size-4" />
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-muted-foreground">
        {label}
      </p>
      <p className="break-words text-sm font-semibold">{value}</p>
    </div>
  );
}
