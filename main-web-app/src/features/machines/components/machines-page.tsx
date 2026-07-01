"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import {
  ChevronRight,
  Eye,
  FileSearch,
  Gauge,
  Plus,
  Search,
  Tag,
  Truck,
  type LucideIcon,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MachineActionState } from "../machines-action-state";
import type { MachineListItem, MachinesListQuery } from "../machines.server";

type MachineAction = (
  state: MachineActionState,
  formData: FormData,
) => Promise<MachineActionState>;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="size-4" />
      {pending ? "Salvando" : "Cadastrar máquina"}
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

export function MachinesPageView({
  action,
  initialState,
  pageInfo,
  query,
  rows,
}: {
  action: MachineAction;
  initialState: MachineActionState;
  pageInfo: { hasNextPage: boolean; nextCursor: string | null };
  query: MachinesListQuery;
  rows: MachineListItem[];
}) {
  const [state, formAction] = useActionState(action, initialState);
  const hasFilters = Boolean(query.search || query.availability || query.type);
  const nextParams = new URLSearchParams();
  if (query.search) nextParams.set("search", query.search);
  if (query.type) nextParams.set("type", query.type);
  if (query.availability) nextParams.set("availability", query.availability);
  if (query.sortBy) nextParams.set("sortBy", query.sortBy);
  if (query.sortDirection) nextParams.set("sortDirection", query.sortDirection);
  if (pageInfo.nextCursor) nextParams.set("cursor", pageInfo.nextCursor);

  return (
    <div className="space-y-4">
      <section className="grid gap-3 md:grid-cols-3" aria-label="Resumo">
        <Summary label="Máquinas nesta página" value={String(rows.length)} />
        <Summary
          label="Disponíveis"
          value={String(
            rows.filter((row) => row.availability.state === "available").length,
          )}
        />
        <Summary
          label="Com leitura confirmada"
          value={String(rows.filter((row) => row.latestMeterReading).length)}
        />
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-secondary/60 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <form
              action="/home/maquinas"
              className="grid gap-2 md:grid-cols-[minmax(220px,360px)_150px_150px_auto]"
            >
              <label className="relative block">
                <span className="sr-only">Buscar máquina</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="search"
                  defaultValue={query.search}
                  placeholder="Buscar por nome, placa ou patrimônio"
                  className="h-10 bg-background pl-9"
                />
              </label>
              <select
                name="type"
                defaultValue={query.type ?? ""}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
              >
                <option value="">Todos</option>
                <option value="YELLOW_LINE">Linha amarela</option>
                <option value="WHITE_LINE">Linha branca</option>
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
                Nova máquina
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Cadastrar máquina</DialogTitle>
                </DialogHeader>
                <form action={formAction} className="grid gap-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <Field label="Nome" name="name" required />
                    <label className="grid gap-1.5 text-sm font-semibold">
                      <span>Tipo</span>
                      <select
                        name="type"
                        required
                        className="h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
                      >
                        <option value="YELLOW_LINE">Linha amarela</option>
                        <option value="WHITE_LINE">Linha branca</option>
                      </select>
                    </label>
                    <Field label="Fabricante" name="manufacturer" required />
                    <Field label="Modelo" name="model" required />
                    <Field label="Placa" name="plate" />
                    <Field label="Patrimônio" name="companyTag" />
                    <Field
                      label="Leitura inicial"
                      name="initialMeterReading"
                      required
                    />
                    <Field label="Descrição" name="description" />
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
                    <SubmitButton />
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                <TableHead icon={Truck} label="Máquina" />
                <TableHead icon={Tag} label="Identificadores" />
                <TableHead label="Tipo" />
                <TableHead label="Fabricante / modelo" />
                <TableHead icon={Gauge} label="Leitura atual" />
                <TableHead label="Disponibilidade" />
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
                      <span className="block max-w-[24ch] truncate">
                        {row.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {identifierLabel(row)}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {typeLabel(row.type)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.manufacturer} / {row.model}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {row.latestMeterReading?.value ?? "Sem leitura"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {row.availability.state === "available"
                        ? "Disponível"
                        : "Indisponível"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/home/maquinas/${row.id}`}
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
                  <td colSpan={7} className="px-4 py-14 text-center">
                    <p className="text-base font-bold">
                      Nenhuma máquina encontrada
                    </p>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                      Máquinas cadastradas aparecem aqui com identificadores,
                      leitura atual e disponibilidade derivada do backend.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 bg-secondary/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-muted-foreground">
            {rows.length} máquinas nesta página
            {hasFilters ? " · filtros ativos" : ""}
          </p>
          {pageInfo.nextCursor ? (
            <Link
              className={buttonVariants({ size: "sm", variant: "outline" })}
              href={`/home/maquinas?${nextParams.toString()}`}
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
      </section>
    </div>
  );
}

function identifierLabel(row: MachineListItem) {
  const plate = row.identifiers.plate?.value;
  const tag = row.identifiers.companyTag?.value;
  if (plate && tag) return `${plate} · ${tag}`;
  return plate ?? tag ?? "Sem identificador";
}

function typeLabel(type: MachineListItem["type"]) {
  return type === "YELLOW_LINE" ? "Linha amarela" : "Linha branca";
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
  icon?: LucideIcon;
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
