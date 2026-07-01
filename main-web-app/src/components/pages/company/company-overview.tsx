import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  Fuel,
  Gauge,
  HardHat,
  Map,
  Route,
  Truck,
  UsersRound,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

const overviewCards = [
  {
    label: "Obras em execução",
    value: "3",
    detail: "BR-381 concentra 54% da frota",
    icon: Map,
    tone: "bg-accent text-accent-foreground border-primary/20",
  },
  {
    label: "Funcionários ativos",
    value: "126",
    detail: "34 apontados em campo hoje",
    icon: UsersRound,
    tone: "bg-emerald-50 text-emerald-950 border-emerald-200",
  },
  {
    label: "Máquinas disponíveis",
    value: "29",
    detail: "7 em manutenção ou espera",
    icon: Truck,
    tone: "bg-sky-50 text-sky-950 border-sky-200",
  },
  {
    label: "Pendências críticas",
    value: "5",
    detail: "2 contratos e 3 cadastros",
    icon: AlertTriangle,
    tone: "bg-amber-50 text-amber-950 border-amber-200",
  },
];

const works = [
  {
    name: "BR-381 Lote 07",
    location: "Betim, MG",
    progress: 68,
    progressClass: "w-[68%]",
    fleet: "18 máquinas",
    status: "Em execução",
  },
  {
    name: "Contorno Oeste",
    location: "Campinas, SP",
    progress: 42,
    progressClass: "w-[42%]",
    fleet: "9 máquinas",
    status: "Mobilização",
  },
  {
    name: "Pátio Serra Azul",
    location: "Itabira, MG",
    progress: 91,
    progressClass: "w-[91%]",
    fleet: "6 máquinas",
    status: "Medição",
  },
];

const decisions = [
  {
    title: "Contrato TransRota vence em 12 dias",
    detail: "Afeta transporte interno no Contorno Oeste.",
    tone: "border-amber-200 bg-amber-50 text-amber-950",
  },
  {
    title: "Escavadeira CAT 320 sem responsável fixo",
    detail: "Cadastro da máquina precisa de operador titular.",
    tone: "border-red-200 bg-red-50 text-red-900",
  },
  {
    title: "Petrobase confirmou comboio 14:30",
    detail: "Abastecimento libera frente norte da BR-381.",
    tone: "border-sky-200 bg-sky-50 text-sky-950",
  },
];

const resourceLinks = [
  {
    href: "/home/funcionarios",
    label: "Funcionários",
    detail: "Cadastro e vínculo por empresa",
    icon: UsersRound,
  },
  {
    href: "/home/clientes",
    label: "Clientes",
    detail: "Contratantes reutilizáveis por empresa",
    icon: Building2,
  },
  {
    href: "/home/maquinas",
    label: "Máquinas",
    detail: "Frota, horímetro e condição",
    icon: Wrench,
  },
  {
    href: "/home/obras",
    label: "Obras",
    detail: "Cadastro administrativo das obras",
    icon: HardHat,
  },
  {
    href: "/home/fornecedores",
    label: "Combustível",
    detail: "Fornecedores elegíveis para abastecimento",
    icon: Fuel,
  },
];

export function CompanyOverview() {
  return (
    <div className="space-y-4">
      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Resumo da empresa"
      >
        {overviewCards.map((item) => {
          const Icon = item.icon;

          return (
            <article
              key={item.label}
              className={cn("rounded-lg border bg-card px-4 py-3", item.tone)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold opacity-80">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold tracking-normal">
                    {item.value}
                  </p>
                </div>
                <Icon className="size-5 shrink-0" />
              </div>
              <p className="mt-3 text-sm font-medium opacity-85">
                {item.detail}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-primary">
                  <Gauge className="size-4" />
                  Ritmo operacional da empresa
                </div>
                <h2 className="mt-2 text-xl font-bold tracking-normal">
                  Obras, frota e equipe no mesmo plano
                </h2>
              </div>
              <Link
                href="/home/obras"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                Ver obras
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="relative min-h-[360px] overflow-hidden rounded-lg border border-border bg-[oklch(0.956_0.018_250)]">
              <div className="absolute inset-0">
                <div className="absolute left-[8%] top-[16%] h-[68%] w-[82%] rounded-[48%] border border-primary/20" />
                <div className="absolute left-[18%] top-[30%] h-[42%] w-[62%] rounded-[48%] border border-primary/25" />
                <div className="absolute left-[15%] top-[58%] h-2 w-[70%] -rotate-6 rounded-full bg-primary/15" />
                <div className="absolute left-[20%] top-[38%] h-2 w-[54%] rotate-12 rounded-full bg-amber-500/25" />
              </div>

              <MapMarker
                className="left-[28%] top-[58%]"
                label="BR-381"
                detail="18 máquinas"
                tone="bg-primary text-primary-foreground"
              />
              <MapMarker
                className="left-[60%] top-[34%]"
                label="Contorno Oeste"
                detail="mobilização"
                tone="bg-amber-500 text-amber-950"
              />
              <MapMarker
                className="left-[49%] top-[72%]"
                label="Serra Azul"
                detail="medição"
                tone="bg-sky-700 text-white"
              />

              <div className="absolute bottom-3 left-3 right-3 grid gap-2 sm:grid-cols-3">
                <MapFact icon={Truck} label="Frota em campo" value="33" />
                <MapFact icon={UsersRound} label="Equipe apontada" value="34" />
                <MapFact icon={Route} label="Rotas ativas" value="7" />
              </div>
            </div>

            <div className="space-y-3">
              {works.map((work) => (
                <div
                  key={work.name}
                  className="rounded-lg border border-border bg-background px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{work.name}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {work.location} · {work.fleet}
                      </p>
                    </div>
                    <StatusBadge status={work.status} />
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full bg-primary",
                        work.progressClass,
                      )}
                    />
                  </div>
                  <p className="mt-2 text-xs font-bold text-muted-foreground">
                    {work.progress}% de avanço físico
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-700" />
                <h2 className="text-base font-bold">Decisões próximas</h2>
              </div>
            </div>
            <div className="space-y-2 p-3">
              {decisions.map((decision) => (
                <article
                  key={decision.title}
                  className={cn("rounded-md border px-3 py-3", decision.tone)}
                >
                  <p className="text-sm font-bold">{decision.title}</p>
                  <p className="mt-1 text-sm leading-5 opacity-85">
                    {decision.detail}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-5 text-primary" />
                <h2 className="text-base font-bold">Módulos do MVP</h2>
              </div>
            </div>
            <div className="divide-y divide-border">
              {resourceLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold">
                          {item.label}
                        </span>
                        <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">
                          {item.detail}
                        </span>
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}

function MapMarker({
  className,
  detail,
  label,
  tone,
}: {
  className: string;
  detail: string;
  label: string;
  tone: string;
}) {
  return (
    <div
      className={cn("absolute -translate-x-1/2 -translate-y-1/2", className)}
    >
      <div className={cn("rounded-md px-2.5 py-2 text-xs font-bold", tone)}>
        <p>{label}</p>
        <p className="mt-0.5 font-semibold opacity-85">{detail}</p>
      </div>
    </div>
  );
}

function MapFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Truck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-sm px-2 text-xs font-bold",
        status === "Em execução" && "bg-emerald-100 text-emerald-900",
        status === "Mobilização" && "bg-amber-100 text-amber-950",
        status === "Medição" && "bg-sky-100 text-sky-900",
      )}
    >
      {status}
    </span>
  );
}
