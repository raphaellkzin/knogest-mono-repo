import Link from "next/link";
import {
  Building2,
  ChevronDown,
  Map,
  ShieldCheck,
  SunMedium,
  Warehouse,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

type AppArea = "project" | "company" | "workspaces";

const areaMeta: Record<
  AppArea,
  { label: string; title: string; subtitle: string }
> = {
  project: {
    label: "Projeto",
    title: "BR-381 Lote 07",
    subtitle: "Frente Norte · terraplanagem em execução",
  },
  company: {
    label: "Administração",
    title: "Terraplanagem Norte",
    subtitle: "Funcionários, máquinas, fornecedores e projetos",
  },
  workspaces: {
    label: "Workspace",
    title: "Selecionar empresa",
    subtitle: "Corporação GTR · 3 empresas disponíveis",
  },
};

const navItems = [
  { href: "/home", label: "Projeto", icon: Map, area: "project" },
  { href: "/home/company", label: "Empresa", icon: Building2, area: "company" },
  {
    href: "/home/workspaces",
    label: "Workspaces",
    icon: Warehouse,
    area: "workspaces",
  },
] satisfies Array<{
  href: string;
  label: string;
  icon: typeof Map;
  area: AppArea;
}>;

export function AppShell({
  children,
  userId,
  currentArea = "project",
}: {
  children: React.ReactNode;
  userId: string;
  currentArea?: AppArea;
}) {
  const meta = areaMeta[currentArea];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-sidebar-border bg-sidebar px-4 py-5 md:flex md:flex-col">
        <Link href="/home" className="flex items-center gap-3 px-2">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            KG
          </span>
          <span>
            <span className="block text-sm font-bold">KnoGest</span>
            <span className="block text-xs font-medium text-muted-foreground">
              Operação de campo
            </span>
          </span>
        </Link>

        <Link
          href="/home/workspaces"
          className="mt-6 block rounded-lg border border-sidebar-border bg-card px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <span className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground">
            Empresa ativa
            <ChevronDown className="size-4" />
          </span>
          <span className="mt-2 block text-sm font-semibold">
            Terraplanagem Norte
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            3 projetos ativos · 42 máquinas
          </span>
        </Link>

        <nav className="mt-6 space-y-1" aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.area === currentArea;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-amber-950">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SunMedium className="size-4" />
            Condição de campo
          </div>
          <p className="mt-2 text-xs leading-5 text-amber-900">
            Sol forte no trecho norte. Poeira alta no acesso 2 e compactação
            liberada até 16:00.
          </p>
        </div>

        <div className="mt-auto rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-950">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4" />
            Sessão corporativa
          </div>
          <p className="mt-2 break-all text-emerald-900">{userId}</p>
        </div>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-muted-foreground">
                {meta.label}
              </p>
              <h1 className="truncate text-lg font-bold leading-tight">
                {meta.title}
              </h1>
              <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
                {meta.subtitle}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground lg:inline-flex">
                Atualizado 09:42
              </span>
              <SignOutButton />
            </div>
          </div>

          <nav
            className="grid grid-cols-3 gap-2 border-t border-border px-3 py-2 md:hidden"
            aria-label="Navegação principal"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.area === currentArea;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-11 items-center justify-center gap-2 rounded-md px-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="px-3 py-4 sm:px-5 md:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1500px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
