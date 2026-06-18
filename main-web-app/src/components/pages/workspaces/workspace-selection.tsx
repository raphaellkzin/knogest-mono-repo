import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Fuel,
  Map,
  ShieldCheck,
  Truck,
  UsersRound,
} from "lucide-react";

const workspaces = [
  {
    name: "Terraplanagem Norte",
    region: "Minas Gerais e interior de SP",
    projects: "3 projetos ativos",
    crew: "126 funcionários",
    fleet: "42 máquinas",
    supplier: "Petrobase Diesel",
    selected: true,
  },
  {
    name: "Mineração Serra Azul",
    region: "Quadrilátero Ferrífero",
    projects: "1 projeto ativo",
    crew: "48 funcionários",
    fleet: "16 máquinas",
    supplier: "Serra Combustíveis",
    selected: false,
  },
  {
    name: "Base Sul",
    region: "Paraná e Santa Catarina",
    projects: "Sem projeto em execução",
    crew: "22 funcionários",
    fleet: "9 máquinas",
    supplier: "Contrato a revisar",
    selected: false,
  },
];

export function WorkspaceSelection() {
  return (
    <div className="space-y-4">
      <section
        className="rounded-lg border border-border bg-card px-4 py-4 lg:px-5"
        aria-labelledby="workspace-title"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <ShieldCheck className="size-4" />
              Corporação GTR
            </div>
            <h2
              id="workspace-title"
              className="mt-2 text-2xl font-bold tracking-normal"
            >
              Escolha a empresa antes de operar
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Cada empresa mantém suas próprias equipes, máquinas, fornecedores
              e obras. Escolha uma base antes de abrir o painel.
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm">
            <p className="font-bold">Admin da corporação</p>
            <p className="mt-1 text-muted-foreground">
              Acesso a 3 empresas · sessão protegida
            </p>
          </div>
        </div>
      </section>

      <section
        className="grid gap-4 xl:grid-cols-3"
        aria-label="Empresas disponíveis"
      >
        {workspaces.map((workspace) => (
          <article
            key={workspace.name}
            className="rounded-lg border border-border bg-card"
          >
            <div className="border-b border-border px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent text-primary">
                    <Building2 className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold">{workspace.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {workspace.region}
                    </p>
                  </div>
                </div>
                {workspace.selected && (
                  <CheckCircle2 className="size-5 shrink-0 text-primary" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 px-4 py-4 text-sm">
              <WorkspaceFact
                icon={Map}
                label="Projetos"
                value={workspace.projects}
              />
              <WorkspaceFact
                icon={UsersRound}
                label="Equipe"
                value={workspace.crew}
              />
              <WorkspaceFact
                icon={Truck}
                label="Frota"
                value={workspace.fleet}
              />
              <WorkspaceFact
                icon={Fuel}
                label="Fornecedor"
                value={workspace.supplier}
              />
            </div>

            <div className="border-t border-border px-4 py-4">
              <Link
                href={workspace.selected ? "/home" : "/home/company"}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md bg-primary px-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {workspace.selected
                  ? "Entrar no projeto ativo"
                  : "Ver administração"}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function WorkspaceFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="size-4 text-primary" />
        {label}
      </div>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
