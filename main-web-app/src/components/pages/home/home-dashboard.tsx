"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Fuel,
  Gauge,
  Layers3,
  MapPin,
  Mountain,
  Route,
  Truck,
  UsersRound,
} from "lucide-react";

import { DashboardToolbar } from "@/components/pages/home/dashboard-toolbar";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/app.store";

type MapLayer = "production" | "equipment" | "risk";

const projectKpis = [
  {
    label: "Avanço físico",
    value: "68%",
    detail: "32.400 m³ movimentados",
    tone: "text-primary",
  },
  {
    label: "Frentes ativas",
    value: "3",
    detail: "Corte, aterro e drenagem",
    tone: "text-primary",
  },
  {
    label: "Frota em campo",
    value: "18",
    detail: "4 aguardando liberação",
    tone: "text-amber-800",
  },
  {
    label: "RDO pendente",
    value: "1",
    detail: "Turno da tarde incompleto",
    tone: "text-red-800",
  },
];

const layers: Array<{ id: MapLayer; label: string; icon: typeof Layers3 }> = [
  { id: "production", label: "Produção", icon: Mountain },
  { id: "equipment", label: "Frota", icon: Truck },
  { id: "risk", label: "Riscos", icon: AlertTriangle },
];

const mapMarkers = [
  {
    label: "Corte C-12",
    detail: "Nivelamento 72%",
    position: "left-[31%] top-[54%]",
    layer: "production",
    tone: "bg-primary text-primary-foreground",
  },
  {
    label: "Aterro A-04",
    detail: "Compactação liberada",
    position: "left-[58%] top-[38%]",
    layer: "production",
    tone: "bg-primary text-primary-foreground",
  },
  {
    label: "Esc. 320",
    detail: "1h12 parada",
    position: "left-[46%] top-[68%]",
    layer: "equipment",
    tone: "bg-amber-500 text-amber-950",
  },
  {
    label: "Comboio diesel",
    detail: "Chega 14:30",
    position: "left-[74%] top-[62%]",
    layer: "equipment",
    tone: "bg-sky-700 text-white",
  },
  {
    label: "Talude úmido",
    detail: "Inspeção antes do corte",
    position: "left-[66%] top-[25%]",
    layer: "risk",
    tone: "bg-red-700 text-white",
  },
  {
    label: "Acesso 2",
    detail: "Poeira acima do limite",
    position: "left-[22%] top-[76%]",
    layer: "risk",
    tone: "bg-orange-600 text-white",
  },
] satisfies Array<{
  label: string;
  detail: string;
  position: string;
  layer: MapLayer;
  tone: string;
}>;

const productionRows = [
  {
    label: "Escavação",
    current: "7.860 m³",
    target: "10.800 m³",
    progress: 73,
    progressClass: "w-[73%]",
  },
  {
    label: "Transporte interno",
    current: "212 viagens",
    target: "260 viagens",
    progress: 82,
    progressClass: "w-[82%]",
  },
  {
    label: "Compactação",
    current: "14.200 m²",
    target: "18.000 m²",
    progress: 79,
    progressClass: "w-[79%]",
  },
  {
    label: "Top soil",
    current: "1.340 m³",
    target: "2.100 m³",
    progress: 64,
    progressClass: "w-[64%]",
  },
];

const equipmentActivity = [
  {
    machine: "Escavadeira CAT 320",
    operator: "João Lima",
    front: "Corte C-12",
    status: "Parada",
    hour: "6.482 h",
  },
  {
    machine: "Motoniveladora 140K",
    operator: "Nádia Rocha",
    front: "Acesso 2",
    status: "Ativa",
    hour: "4.210 h",
  },
  {
    machine: "Rolo compactador CS56",
    operator: "Rui Santos",
    front: "Aterro A-04",
    status: "Ativa",
    hour: "3.908 h",
  },
  {
    machine: "Caminhão pipa 18k",
    operator: "Paulo Diniz",
    front: "Acesso 2",
    status: "Abastecendo",
    hour: "2.477 h",
  },
  {
    machine: "Trator D6",
    operator: "Marta Reis",
    front: "Top soil",
    status: "Ativa",
    hour: "5.019 h",
  },
];

const alerts = [
  {
    title: "Escavadeira CAT 320 parada",
    detail: "Apontador registrou falha hidráulica na frente C-12.",
    tone: "text-red-800 bg-red-50 border-red-200",
  },
  {
    title: "Diesel abaixo do programado",
    detail: "Fornecedor confirma chegada do comboio às 14:30.",
    tone: "text-amber-900 bg-amber-50 border-amber-200",
  },
  {
    title: "RDO da tarde incompleto",
    detail: "Faltam horas de 2 operadores e checklist de uma máquina.",
    tone: "text-sky-900 bg-sky-50 border-sky-200",
  },
];

const crewAndSuppliers = [
  { label: "Equipe em campo", value: "34 pessoas", icon: UsersRound },
  { label: "Fornecedor diesel", value: "Petrobase · R$ 6,11/L", icon: Fuel },
  { label: "Próxima medição", value: "Sexta, 18:00", icon: CalendarClock },
];

function matchesSearch(value: string, searchTerm: string) {
  return value.toLowerCase().includes(searchTerm.trim().toLowerCase());
}

export function HomeDashboard({ userId }: { userId: string }) {
  const [activeLayer, setActiveLayer] = useState<MapLayer>("production");
  const dashboardDensity = useAppStore((state) => state.dashboardDensity);
  const searchTerm = useAppStore((state) => state.searchTerm);

  const visibleMarkers = mapMarkers.filter(
    (marker) => marker.layer === activeLayer,
  );
  const rowPadding = dashboardDensity === "compact" ? "py-2" : "py-3";
  const filteredEquipment = equipmentActivity.filter((item) =>
    matchesSearch(
      `${item.machine} ${item.operator} ${item.front} ${item.status}`,
      searchTerm,
    ),
  );
  const filteredAlerts = alerts.filter((item) =>
    matchesSearch(`${item.title} ${item.detail}`, searchTerm),
  );

  return (
    <div className="space-y-4">
      <DashboardToolbar />

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Resumo do projeto"
      >
        {projectKpis.map((item) => (
          <article
            key={item.label}
            className="rounded-lg border border-border bg-card px-4 py-3"
          >
            <p className="text-sm font-semibold text-muted-foreground">
              {item.label}
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <p className={cn("text-2xl font-bold leading-none", item.tone)}>
                {item.value}
              </p>
              <CheckCircle2 className="size-5 text-primary" />
            </div>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              {item.detail}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.75fr)]">
        <section
          className="overflow-hidden rounded-lg border border-border bg-card"
          aria-labelledby="project-map-title"
        >
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="project-map-title" className="text-base font-bold">
                Mapa operacional da obra
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Localização, frentes de produção, frota e riscos no mesmo
                contexto.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-1 rounded-md border border-border bg-background p-1">
              {layers.map((layer) => {
                const Icon = layer.icon;
                const isActive = layer.id === activeLayer;

                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => setActiveLayer(layer.id)}
                    className={cn(
                      "flex min-h-10 items-center justify-center gap-2 rounded-sm px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="size-4" />
                    <span className="hidden sm:inline">{layer.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative h-[420px] overflow-hidden bg-[oklch(0.952_0.014_250)] sm:h-[500px]">
            <svg
              aria-hidden="true"
              className="absolute inset-0 size-full"
              viewBox="0 0 900 560"
              preserveAspectRatio="none"
            >
              <path
                d="M0 438 C128 390 206 332 296 352 C420 380 470 252 570 230 C690 204 778 268 900 198 L900 560 L0 560 Z"
                fill="oklch(0.74 0.08 250 / 0.18)"
              />
              <path
                d="M0 132 C118 86 214 138 320 112 C452 80 552 94 658 54 C756 18 832 40 900 16 L900 0 L0 0 Z"
                fill="oklch(0.72 0.128 82 / 0.16)"
              />
              <path
                d="M50 430 C162 346 210 380 306 296 C416 198 526 226 648 136 C744 64 820 82 862 48"
                fill="none"
                stroke="oklch(0.38 0.09 255)"
                strokeLinecap="round"
                strokeWidth="18"
              />
              <path
                d="M72 454 C184 390 272 428 388 360 C512 286 590 328 704 254 C778 206 824 222 886 188"
                fill="none"
                stroke="oklch(0.72 0.128 82)"
                strokeLinecap="round"
                strokeWidth="11"
                opacity="0.72"
              />
              <path
                d="M92 96 L192 164 L286 122 L390 184 L498 142 L606 190 L710 132 L832 172"
                fill="none"
                stroke="oklch(0.38 0.034 260 / 0.22)"
                strokeDasharray="12 14"
                strokeLinecap="round"
                strokeWidth="3"
              />
              <path
                d="M142 510 L246 446 L354 486 L466 430 L582 470 L706 410 L840 452"
                fill="none"
                stroke="oklch(0.38 0.034 260 / 0.2)"
                strokeDasharray="10 14"
                strokeLinecap="round"
                strokeWidth="3"
              />
            </svg>

            <div className="absolute left-4 top-4 rounded-md border border-border bg-card px-3 py-2">
              <div className="flex items-center gap-2 text-sm font-bold">
                <MapPin className="size-4 text-primary" />
                Km 742,4
              </div>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                23°19&apos;S · 46°40&apos;W
              </p>
            </div>

            <div className="absolute bottom-4 left-4 right-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Rota crítica
                </p>
                <p className="mt-1 text-sm font-bold">
                  Corte C-12 → Aterro A-04
                </p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Janela climática
                </p>
                <p className="mt-1 text-sm font-bold">Sol forte até 16:00</p>
              </div>
              <div className="rounded-md border border-border bg-card px-3 py-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Apontamento
                </p>
                <p className="mt-1 text-sm font-bold">RDO fecha em 2h18</p>
              </div>
            </div>

            {visibleMarkers.map((marker) => (
              <div
                key={marker.label}
                className={cn(
                  "absolute size-9 -translate-x-1/2 -translate-y-1/2",
                  marker.position,
                )}
              >
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full",
                    marker.tone,
                  )}
                >
                  <Route className="size-4" />
                </div>
                <span className="sr-only">
                  {marker.label}: {marker.detail}
                </span>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section
            className="rounded-lg border border-border bg-card"
            aria-labelledby="decision-title"
          >
            <div className="border-b border-border px-4 py-4">
              <h2 id="decision-title" className="text-base font-bold">
                Decisões próximas
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                O que exige atenção nas próximas 6 horas.
              </p>
            </div>

            <div className="divide-y divide-border">
              {(filteredAlerts.length ? filteredAlerts : alerts).map(
                (alert) => (
                  <article
                    key={alert.title}
                    className={cn("border-l-0 px-4 py-4", alert.tone)}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold">{alert.title}</h3>
                        <p className="mt-1 text-sm leading-5">{alert.detail}</p>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>

          <section
            className="rounded-lg border border-border bg-card px-4 py-4"
            aria-labelledby="crew-title"
          >
            <h2 id="crew-title" className="text-base font-bold">
              Equipe e suprimentos
            </h2>
            <div className="mt-4 space-y-3">
              {crewAndSuppliers.map((item) => {
                const Icon = item.icon;

                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="block truncate text-sm font-bold">
                        {item.value}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-primary px-4 py-4 text-primary-foreground">
            <div className="flex items-center gap-3">
              <Gauge className="size-5" />
              <h2 className="text-base font-bold">Ritmo do turno</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/90">
              Frente Norte com janela favorável até 16:00. Replanejar comboio se
              o diesel atrasar mais de 30 minutos.
            </p>
            <p className="mt-4 text-xs font-semibold text-primary-foreground/80">
              Sessão {userId.slice(0, 8)}
            </p>
          </section>
        </aside>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section
          className="rounded-lg border border-border bg-card"
          aria-labelledby="production-title"
        >
          <div className="border-b border-border px-4 py-4">
            <h2 id="production-title" className="text-base font-bold">
              Produção do dia
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Metas comparadas com apontamentos recebidos.
            </p>
          </div>

          <div className="divide-y divide-border">
            {productionRows.map((row) => (
              <div key={row.label} className="px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold">{row.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.current} de {row.target}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-primary">
                    {row.progress}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary",
                      row.progressClass,
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="rounded-lg border border-border bg-card"
          aria-labelledby="equipment-title"
        >
          <div className="border-b border-border px-4 py-4">
            <h2 id="equipment-title" className="text-base font-bold">
              Frota em campo
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Máquina, operador, frente e horímetro.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Máquina</th>
                  <th className="px-4 py-3">Frente</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Horímetro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEquipment.map((item) => (
                  <tr key={item.machine}>
                    <td className={cn("px-4 align-top", rowPadding)}>
                      <p className="font-bold">{item.machine}</p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">
                        {item.operator}
                      </p>
                    </td>
                    <td
                      className={cn(
                        "px-4 font-medium text-muted-foreground",
                        rowPadding,
                      )}
                    >
                      {item.front}
                    </td>
                    <td className={cn("px-4", rowPadding)}>
                      <span
                        className={cn(
                          "rounded-sm px-2 py-1 text-xs font-bold",
                          item.status === "Ativa" &&
                            "bg-emerald-100 text-emerald-900",
                          item.status === "Parada" && "bg-red-100 text-red-900",
                          item.status === "Abastecendo" &&
                            "bg-amber-100 text-amber-950",
                        )}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className={cn("px-4 text-right font-bold", rowPadding)}>
                      {item.hour}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filteredEquipment.length && (
              <div className="px-4 py-8 text-center">
                <Clock3 className="mx-auto size-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-bold">
                  Nenhuma máquina encontrada
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste a busca para ver a frota em operação.
                </p>
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
