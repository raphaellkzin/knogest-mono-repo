import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, Gauge, Tag, Truck } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { MachineDetail } from "../machines.server";

export function MachineDetailPage({ machine }: { machine: MachineDetail }) {
  return (
    <div className="space-y-4">
      <Link
        href="/home/maquinas"
        className={buttonVariants({ size: "sm", variant: "outline" })}
      >
        <ArrowLeft className="size-4" />
        Voltar
      </Link>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-secondary/60 px-4 py-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-muted-foreground">
              {typeLabel(machine.type)}
            </p>
            <h2 className="text-2xl font-bold">{machine.name}</h2>
          </div>
        </div>

        <div className="grid gap-4 p-4 lg:grid-cols-3">
          <DetailBlock
            icon={Truck}
            label="Fabricante / modelo"
            value={`${machine.manufacturer} / ${machine.model}`}
          />
          <DetailBlock
            icon={Tag}
            label="Identificadores"
            value={identifierLabel(machine)}
          />
          <DetailBlock
            icon={Gauge}
            label="Leitura confirmada"
            value={machine.latestMeterReading?.value ?? "Sem leitura"}
          />
        </div>

        <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
          <Info label="Disponibilidade">
            {machine.availability.state === "available"
              ? "Disponível"
              : "Indisponível"}
          </Info>
          <Info label="Alocação aberta">
            {machine.availability.hasOpenAllocation ? "Sim" : "Não"}
          </Info>
          <Info label="Leitura registrada em">
            {machine.latestMeterReading
              ? formatDateTime(machine.latestMeterReading.recordedAt)
              : "Sem leitura"}
          </Info>
          <Info label="Propriedade atual">
            {machine.ownership
              ? `Desde ${formatDateTime(machine.ownership.effectiveFrom)}`
              : "Sem propriedade atual"}
          </Info>
          <Info label="Descrição">{machine.description ?? "Sem descrição"}</Info>
        </div>
      </section>
    </div>
  );
}

function DetailBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-background px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="size-4" />
        {label}
      </div>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </article>
  );
}

function Info({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold">{children}</p>
    </div>
  );
}

function identifierLabel(machine: MachineDetail) {
  const plate = machine.identifiers.plate?.value;
  const tag = machine.identifiers.companyTag?.value;
  if (plate && tag) return `${plate} · ${tag}`;
  return plate ?? tag ?? "Sem identificador";
}

function typeLabel(type: MachineDetail["type"]) {
  return type === "YELLOW_LINE" ? "Linha amarela" : "Linha branca";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
