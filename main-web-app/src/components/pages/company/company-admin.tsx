import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  Fuel,
  HardHat,
  Map,
  Truck,
  UsersRound,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

const modules = [
  {
    href: "#funcionarios",
    label: "Funcionários",
    value: "126",
    detail: "34 em campo hoje",
    icon: UsersRound,
    tone: "bg-accent text-accent-foreground border-primary/20",
  },
  {
    href: "#projetos",
    label: "Projetos",
    value: "8",
    detail: "3 em execução",
    icon: Map,
    tone: "bg-sky-50 text-sky-900 border-sky-200",
  },
  {
    href: "#fornecedores",
    label: "Fornecedores",
    value: "14",
    detail: "4 com contrato ativo",
    icon: Fuel,
    tone: "bg-amber-50 text-amber-950 border-amber-200",
  },
  {
    href: "#maquinas",
    label: "Máquinas",
    value: "42",
    detail: "18 alocadas agora",
    icon: Truck,
    tone: "bg-accent text-accent-foreground border-primary/20",
  },
];

const employees = [
  {
    name: "Nádia Rocha",
    role: "Operadora",
    project: "BR-381 Lote 07",
    status: "Em campo",
  },
  {
    name: "João Lima",
    role: "Operador",
    project: "BR-381 Lote 07",
    status: "Aguardando manutenção",
  },
  {
    name: "Marcos Alves",
    role: "Apontador",
    project: "Contorno Oeste",
    status: "Em campo",
  },
  {
    name: "Rita Gomes",
    role: "Engenheira",
    project: "Pátio Serra Azul",
    status: "Administrativo",
  },
];

const projects = [
  {
    name: "BR-381 Lote 07",
    city: "Betim, MG",
    progress: "68%",
    status: "Em execução",
  },
  {
    name: "Contorno Oeste",
    city: "Campinas, SP",
    progress: "42%",
    status: "Em execução",
  },
  {
    name: "Pátio Serra Azul",
    city: "Itabira, MG",
    progress: "91%",
    status: "Medição",
  },
];

const suppliers = [
  {
    name: "Petrobase Diesel",
    category: "Fornecimento",
    contract: "R$ 6,11/L",
    status: "Ativo",
  },
  {
    name: "SoloLab",
    category: "Ensaios",
    contract: "Por medição",
    status: "Ativo",
  },
  {
    name: "TransRota",
    category: "Transporte",
    contract: "R$ 184/viagem",
    status: "Revisar",
  },
];

const machines = [
  {
    name: "Escavadeira CAT 320",
    meter: "6.482 h",
    project: "BR-381 Lote 07",
    status: "Manutenção",
  },
  {
    name: "Motoniveladora 140K",
    meter: "4.210 h",
    project: "BR-381 Lote 07",
    status: "Operando",
  },
  {
    name: "Rolo compactador CS56",
    meter: "3.908 h",
    project: "BR-381 Lote 07",
    status: "Operando",
  },
  {
    name: "Trator D6",
    meter: "5.019 h",
    project: "BR-381 Lote 07",
    status: "Operando",
  },
];

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-sm px-2 py-1 text-xs font-bold",
        (status === "Ativo" ||
          status === "Operando" ||
          status === "Em campo" ||
          status === "Em execução") &&
          "bg-emerald-100 text-emerald-900",
        (status === "Medição" || status === "Administrativo") &&
          "bg-sky-100 text-sky-900",
        (status === "Revisar" ||
          status === "Aguardando manutenção" ||
          status === "Manutenção") &&
          "bg-amber-100 text-amber-950",
      )}
    >
      {status}
    </span>
  );
}

export function CompanyAdmin() {
  return (
    <div className="space-y-4">
      <section
        className="rounded-lg border border-border bg-card px-4 py-4 lg:px-5"
        aria-labelledby="company-title"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <Building2 className="size-4" />
              Administração da empresa
            </div>
            <h2
              id="company-title"
              className="mt-2 text-2xl font-bold tracking-normal"
            >
              Terraplanagem Norte
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pessoas, obras, fornecedores e máquinas aparecem como recursos de
              campo, com vínculo claro de projeto e disponibilidade.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4 lg:w-[520px]">
            <div className="rounded-md bg-muted px-3 py-3">
              <p className="font-bold">3</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                empresas
              </p>
            </div>
            <div className="rounded-md bg-muted px-3 py-3">
              <p className="font-bold">8</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                projetos
              </p>
            </div>
            <div className="rounded-md bg-muted px-3 py-3">
              <p className="font-bold">42</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                máquinas
              </p>
            </div>
            <div className="rounded-md bg-muted px-3 py-3">
              <p className="font-bold">14</p>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                fornecedores
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Módulos administrativos"
      >
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              key={module.href}
              href={module.href}
              className={cn(
                "rounded-lg border bg-card px-4 py-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                module.tone,
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <Icon className="size-5" />
                <span className="text-2xl font-bold">{module.value}</span>
              </div>
              <p className="mt-4 text-sm font-bold">{module.label}</p>
              <p className="mt-1 text-sm font-medium opacity-80">
                {module.detail}
              </p>
            </Link>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <DataTable
            id="funcionarios"
            title="Funcionários"
            description="Papel, projeto atual e disponibilidade."
            columns={["Nome", "Função", "Projeto", "Status"]}
            rows={employees.map((item) => [
              item.name,
              item.role,
              item.project,
              <StatusBadge key={item.name} status={item.status} />,
            ])}
          />

          <DataTable
            id="projetos"
            title="Projetos"
            description="Obras por localização, avanço físico e fase."
            columns={["Projeto", "Local", "Avanço", "Status"]}
            rows={projects.map((item) => [
              item.name,
              item.city,
              item.progress,
              <StatusBadge key={item.name} status={item.status} />,
            ])}
          />
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-primary px-4 py-4 text-primary-foreground">
            <div className="flex items-center gap-3">
              <BadgeCheck className="size-5" />
              <h3 className="text-base font-bold">Governança multiempresa</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/90">
              O usuário pertence à corporação, mas cada tela sempre deixa claro
              qual empresa e projeto estão em foco.
            </p>
          </section>

          <DataPanel
            id="fornecedores"
            title="Fornecedores"
            description="Contratos que afetam a operação de campo."
            icon={Fuel}
            rows={suppliers.map((item) => ({
              title: item.name,
              detail: `${item.category} · ${item.contract}`,
              status: item.status,
            }))}
          />

          <DataPanel
            id="maquinas"
            title="Máquinas"
            description="Frota com projeto atual e horímetro."
            icon={Wrench}
            rows={machines.map((item) => ({
              title: item.name,
              detail: `${item.project} · ${item.meter}`,
              status: item.status,
            }))}
          />
        </aside>
      </section>
    </div>
  );
}

function DataTable({
  id,
  title,
  description,
  columns,
  rows,
}: {
  id: string;
  title: string;
  description: string;
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <section
      id={id}
      className="rounded-lg border border-border bg-card"
      aria-labelledby={`${id}-title`}
    >
      <div className="border-b border-border px-4 py-4">
        <h3 id={`${id}-title`} className="text-base font-bold">
          {title}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted text-xs font-semibold text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row, rowIndex) => (
              <tr key={`${id}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${id}-${rowIndex}-${cellIndex}`}
                    className="px-4 py-3 align-top font-medium"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DataPanel({
  id,
  title,
  description,
  icon: Icon,
  rows,
}: {
  id: string;
  title: string;
  description: string;
  icon: typeof HardHat;
  rows: Array<{ title: string; detail: string; status: string }>;
}) {
  return (
    <section
      id={id}
      className="rounded-lg border border-border bg-card"
      aria-labelledby={`${id}-title`}
    >
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <Icon className="size-5 text-primary" />
          <h3 id={`${id}-title`} className="text-base font-bold">
            {title}
          </h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div
            key={row.title}
            className="flex items-start justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{row.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{row.detail}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
        ))}
      </div>
    </section>
  );
}
