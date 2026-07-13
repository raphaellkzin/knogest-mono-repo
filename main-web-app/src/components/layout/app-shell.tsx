"use client";

import { useRef, type ReactNode } from "react";
import Link from "next/link";
import {
  Building2,
  ChevronDown,
  Fuel,
  Gauge,
  LayoutDashboard,
  Map,
  Settings,
  ShieldCheck,
  SunMedium,
  Truck,
  UsersRound,
} from "lucide-react";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";
import { selectCompanyAction } from "@/features/company-selection/actions/select-company.action";
import type { CompanyOption } from "@/features/company-selection/types";

export type AppArea =
  | "dashboard"
  | "clients"
  | "employees"
  | "machines"
  | "works"
  | "suppliers"
  | "settings";

const areaMeta: Record<
  AppArea,
  { label?: string; title: string; subtitle?: string }
> = {
  dashboard: {
    label: "Visão geral",
    title: "Workspace ativo",
  },
  employees: {
    title: "Funcionários",
  },
  clients: {
    title: "Clientes",
  },
  machines: {
    title: "Máquinas",
  },
  works: {
    title: "Obras",
  },
  suppliers: {
    title: "Fornecedores de combustível",
  },
  settings: {
    title: "Configurações",
  },
};

const navItems = [
  {
    href: "/home",
    label: "Visão geral",
    icon: LayoutDashboard,
    area: "dashboard",
  },
  {
    href: "/home/funcionarios",
    label: "Funcionários",
    icon: UsersRound,
    area: "employees",
  },
  {
    href: "/home/clientes",
    label: "Clientes",
    icon: Building2,
    area: "clients",
  },
  {
    href: "/home/maquinas",
    label: "Máquinas",
    icon: Truck,
    area: "machines",
  },
  { href: "/home/obras", label: "Obras", icon: Map, area: "works" },
  {
    href: "/home/fornecedores",
    label: "Combustível",
    icon: Fuel,
    area: "suppliers",
  },
  {
    href: "/home/configuracoes",
    label: "Configurações",
    icon: Settings,
    area: "settings",
  },
] satisfies Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  area: AppArea;
}>;

export function AppShell({
  children,
  companies,
  userId,
  selectedCompany,
  currentArea = "dashboard",
}: {
  children: ReactNode;
  companies: CompanyOption[];
  userId: string;
  selectedCompany: CompanyOption;
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

        <CompanySelector
          companies={companies}
          selectedCompany={selectedCompany}
          className="mt-6"
        />

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

        <div className="mt-6 rounded-lg border border-border bg-card px-3 py-3 text-sm">
          <div className="flex items-center gap-2 font-semibold">
            <SunMedium className="size-4 text-primary" />
            Escopo confiável
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            As rotas operacionais usam somente a Company persistida na sessão.
          </p>
        </div>

        <div className="mt-auto rounded-lg border border-sidebar-border bg-accent px-3 py-3 text-xs text-accent-foreground">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4" />
            Sessão corporativa
          </div>
          <p className="mt-2 break-all text-primary">{userId}</p>
        </div>
      </aside>

      <div className="md:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 md:px-6 lg:px-8">
            <div className="min-w-0">
              {meta.label && (
                <p className="text-xs font-semibold text-muted-foreground">
                  {meta.label}
                </p>
              )}
              <h1 className="truncate text-lg font-bold leading-tight">
                {currentArea === "dashboard"
                  ? selectedCompany.name
                  : meta.title}
              </h1>
              {meta.subtitle && (
                <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">
                  {meta.subtitle}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground lg:inline-flex">
                <Gauge className="size-3.5 text-primary" />
                Sessão protegida
              </span>
              <SignOutButton />
            </div>
          </div>

          <div className="border-t border-border px-3 py-2 md:hidden">
            <CompanySelector
              companies={companies}
              selectedCompany={selectedCompany}
              compact
            />
          </div>

          <nav
            className="grid grid-cols-3 gap-2 border-t border-border px-3 py-2 sm:grid-cols-6 md:hidden"
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
                    "flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="size-4" />
                  <span className="truncate">{item.label}</span>
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

function CompanySelector({
  className,
  compact = false,
  companies,
  selectedCompany,
}: {
  className?: string;
  compact?: boolean;
  companies: CompanyOption[];
  selectedCompany: CompanyOption;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  return (
    <details ref={detailsRef} className={cn("group relative", className)}>
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-sidebar-border bg-card text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          compact ? "px-3 py-2" : "px-3 py-3",
        )}
      >
        <span className="min-w-0">
          <span className="block text-xs font-medium text-muted-foreground">
            Seletor de empresas
          </span>
          <span className="mt-1 block truncate text-sm font-semibold">
            {selectedCompany.name}
          </span>
          {!compact && (
            <span className="mt-1 block truncate text-xs text-muted-foreground">
              Workspace ativo da sessão
            </span>
          )}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="absolute left-0 right-0 z-30 mt-2 rounded-lg border border-border bg-popover p-1 text-popover-foreground ring-1 ring-foreground/10">
        {companies.map((company) => (
          <form key={company.name} action={selectCompanyAction}>
            <input type="hidden" name="companyId" value={company.id} />
            <button
              type="submit"
              onClick={() => detailsRef.current?.removeAttribute("open")}
              className={cn(
                "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                company.id === selectedCompany.id && "bg-accent",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border",
                  company.id === selectedCompany.id
                    ? "border-primary/30 bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground",
                )}
              >
                <Building2 className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
                  {company.name}
                </span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">
                  {company.id === selectedCompany.id
                    ? "Workspace atual"
                    : "Trocar para esta empresa"}
                </span>
              </span>
            </button>
          </form>
        ))}
      </div>
    </details>
  );
}
