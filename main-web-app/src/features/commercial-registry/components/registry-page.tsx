"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  ArrowDownAZ,
  CalendarArrowDown,
  ChevronRight,
  Eye,
  FileSearch,
  Plus,
  Search,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { RegistryActionState } from "../commercial-registry.actions";
import type {
  RegistryListItem,
  RegistryListQuery,
} from "../commercial-registry.server";

type RegistryCopy = {
  basePath: string;
  createLabel: string;
  detailPath: (id: string) => string;
  documentLabel: string;
  emptyDescription: string;
  emptyTitle: string;
  newTitle: string;
  searchPlaceholder: string;
};

type RegistryAction = (
  state: RegistryActionState,
  formData: FormData,
) => Promise<RegistryActionState>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Salvando" : label}
    </Button>
  );
}

function Field({
  label,
  name,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold">
      <span>{label}</span>
      <Input name={name} required={required} type={type} className="h-10" />
    </label>
  );
}

export function RegistryPage({
  action,
  copy,
  initialState,
  pageInfo,
  query,
  rows,
}: {
  action: RegistryAction;
  copy: RegistryCopy;
  initialState: RegistryActionState;
  pageInfo: { hasNextPage: boolean; nextCursor: string | null };
  query: RegistryListQuery;
  rows: RegistryListItem[];
}) {
  const [entityType, setEntityType] = React.useState<
    "individual" | "legal_entity"
  >("individual");
  const [state, formAction] = useActionState(action, initialState);
  const hasFilters = Boolean(query.search || query.entityType);
  const nextParams = new URLSearchParams();
  if (query.search) nextParams.set("search", query.search);
  if (query.entityType) nextParams.set("entityType", query.entityType);
  if (query.sortBy) nextParams.set("sortBy", query.sortBy);
  if (query.sortDirection) nextParams.set("sortDirection", query.sortDirection);
  if (pageInfo.nextCursor) nextParams.set("cursor", pageInfo.nextCursor);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-3" aria-label="Resumo">
        <Summary label="Registros ativos" value={String(rows.length)} />
        <Summary
          label="Pessoa física"
          value={String(rows.filter((row) => row.entityType === "individual").length)}
        />
        <Summary
          label="Pessoa jurídica"
          value={String(
            rows.filter((row) => row.entityType === "legal_entity").length,
          )}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-secondary/60 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form
              action={copy.basePath}
              className="grid gap-2 md:grid-cols-[minmax(220px,360px)_150px_150px_auto]"
            >
              <label className="relative block">
                <span className="sr-only">{copy.searchPlaceholder}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="search"
                  defaultValue={query.search}
                  placeholder={copy.searchPlaceholder}
                  className="h-10 bg-background pl-9"
                />
              </label>
              <select
                name="entityType"
                defaultValue={query.entityType ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
              >
                <option value="">Todos</option>
                <option value="individual">Pessoa física</option>
                <option value="legal_entity">Pessoa jurídica</option>
              </select>
              <select
                name="sortBy"
                defaultValue={query.sortBy ?? "createdAt"}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
              >
                <option value="createdAt">Mais recentes</option>
                <option value="name">Nome</option>
              </select>
              <Button type="submit" variant="outline">
                <FileSearch className="size-4" />
                Filtrar
              </Button>
            </form>

            <Dialog>
              <DialogTrigger render={<Button />}>
                <Plus className="size-4" />
                {copy.createLabel}
              </DialogTrigger>
              <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{copy.newTitle}</DialogTitle>
                  <DialogDescription>
                    O documento completo aparece somente no detalhe autorizado.
                  </DialogDescription>
                </DialogHeader>
                <form action={formAction} className="grid gap-4">
                  <input name="entityType" type="hidden" value={entityType} />
                  <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => setEntityType("individual")}
                      className={`h-10 rounded-sm text-sm font-bold ${
                        entityType === "individual"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      Pessoa física
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntityType("legal_entity")}
                      className={`h-10 rounded-sm text-sm font-bold ${
                        entityType === "legal_entity"
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground"
                      }`}
                    >
                      Pessoa jurídica
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Field
                      label={copy.documentLabel}
                      name="document"
                      required
                    />
                    {entityType === "individual" ? (
                      <Field label="Nome completo" name="fullName" required />
                    ) : (
                      <Field label="Razão social" name="legalName" required />
                    )}
                    <Field label="Nome fantasia" name="tradeName" />
                    <Field label="Telefone" name="phone" />
                    <Field label="Email" name="email" type="email" />
                    <Field label="Endereço" name="addressLine" />
                    <Field label="Cidade" name="city" />
                    <Field label="Estado" name="state" />
                    <Field label="CEP" name="postalCode" />
                  </div>

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

                  <DialogFooter>
                    <SubmitButton label={copy.createLabel} />
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <TableHead icon={ArrowDownAZ} label="Nome" />
                <TableHead icon={FileSearch} label="Documento" />
                <TableHead label="Tipo" />
                <TableHead label="Contato" />
                <TableHead icon={CalendarArrowDown} label="Cadastro" />
                <th className="px-4 py-3 text-right text-xs font-bold text-muted-foreground">
                  Detalhe
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-border">
                    <td className="px-4 py-3 font-bold">
                      <span className="block max-w-[28ch] truncate">
                        {row.name}
                      </span>
                      {row.tradeName && (
                        <span className="block max-w-[28ch] truncate text-xs font-semibold text-muted-foreground">
                          {row.tradeName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {row.document.maskedDocument}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {row.entityType === "individual"
                        ? "Pessoa física"
                        : "Pessoa jurídica"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.email ?? row.phone ?? "Sem contato"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Intl.DateTimeFormat("pt-BR").format(
                        new Date(row.createdAt),
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={copy.detailPath(row.id)}
                        className={buttonVariants({
                          size: "sm",
                          variant: "outline",
                        })}
                      >
                        <Eye className="size-4" />
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-14 text-center">
                    <p className="text-base font-bold">{copy.emptyTitle}</p>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                      {copy.emptyDescription}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 bg-secondary/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-muted-foreground">
            {rows.length} registros nesta página
            {hasFilters ? " · filtros ativos" : ""}
          </p>
          <div className="flex items-center gap-2">
            {pageInfo.nextCursor ? (
              <Link
                className={buttonVariants({ size: "sm", variant: "outline" })}
                href={`${copy.basePath}?${nextParams.toString()}`}
              >
                Próxima
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <Button disabled size="sm" variant="outline">
                Próxima
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </article>
  );
}

function TableHead({
  icon: Icon,
  label,
}: {
  icon?: typeof ArrowDownAZ;
  label: string;
}) {
  return (
    <th className="px-4 py-3 text-xs font-bold text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
    </th>
  );
}
