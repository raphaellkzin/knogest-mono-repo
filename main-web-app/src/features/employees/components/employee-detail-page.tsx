import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  FileSearch,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import type { EmployeeDetail } from "../employees.server";

export function EmployeeDetailPage({ record }: { record: EmployeeDetail }) {
  return (
    <div className="space-y-4">
      <Link
        href="/home/funcionarios"
        className={buttonVariants({ variant: "outline" })}
      >
        <ArrowLeft className="size-4" />
        Funcionários
      </Link>

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
          </DetailGroup>
          <DetailGroup icon={CalendarDays} title="Período atual">
            {record.periods.map((period) => (
              <div key={period.id} className="rounded-md bg-muted p-3">
                <Detail label="Admissão" value={formatDate(period.admissionDate)} />
                <Detail
                  label="Início efetivo"
                  value={formatDate(period.effectiveFrom)}
                />
                <Detail
                  label="Fim efetivo"
                  value={period.effectiveTo ? formatDate(period.effectiveTo) : "Aberto"}
                />
              </div>
            ))}
          </DetailGroup>
        </div>
      </section>
    </div>
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
