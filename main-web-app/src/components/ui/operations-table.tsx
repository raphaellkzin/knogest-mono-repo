"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Tabela operacional do KnoGest.
 *
 * Padroniza listagens administrativas com TanStack Table, paginação local,
 * toolbar de filtros/ações e leitura robusta em telas largas ou celulares.
 */
export function OperationsTable<TData extends { id: string }>({
  actions,
  columns,
  data,
  emptyDescription = "Ajuste os filtros ou cadastre um novo item.",
  emptyTitle = "Nenhum registro encontrado",
  filters,
  getRowLabel,
  pageSize = 6,
  searchPlaceholder = "Buscar registros",
  searchValue,
  title,
  onSearchChange,
}: {
  actions?: React.ReactNode;
  columns: ColumnDef<TData>[];
  data: TData[];
  emptyDescription?: string;
  emptyTitle?: string;
  filters?: React.ReactNode;
  getRowLabel?: (row: TData) => string;
  pageSize?: number;
  searchPlaceholder?: string;
  searchValue: string;
  title: string;
  onSearchChange: (value: string) => void;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  // TanStack Table exposes mutable helpers that the React Compiler must not memoize.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
  });

  const rows = table.getRowModel().rows;
  const pagination = table.getState().pagination;
  const pageCount = table.getPageCount();
  const firstRow = data.length === 0 ? 0 : pagination.pageIndex * pageSize + 1;
  const lastRow = Math.min((pagination.pageIndex + 1) * pageSize, data.length);

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card"
      aria-label={title}
    >
      <div className="border-b border-border bg-secondary/60 px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,360px)_auto]">
            <label className="relative block">
              <span className="sr-only">{searchPlaceholder}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 bg-background pl-9"
              />
            </label>
            {filters && (
              <div className="flex flex-wrap items-center gap-2">{filters}</div>
            )}
          </div>

          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="bg-card">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const canSort = header.column.getCanSort();

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      className="border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          disabled={!canSort}
                          className={cn(
                            "inline-flex min-h-8 items-center gap-1.5 rounded-sm text-left transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                            canSort && "hover:text-foreground",
                          )}
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {sorted === "asc" && <ArrowUp className="size-3" />}
                          {sorted === "desc" && (
                            <ArrowDown className="size-3" />
                          )}
                        </button>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="group transition-colors hover:bg-accent/55"
                >
                  {row.getVisibleCells().map((cell, cellIndex) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "border-b border-border px-4 py-3.5 align-middle font-medium",
                        cellIndex === 0 && "font-bold text-foreground",
                      )}
                    >
                      <span className="block max-w-[32ch] truncate">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </span>
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="border-b border-border px-4 py-14 text-center"
                >
                  <p className="text-base font-bold">{emptyTitle}</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    {emptyDescription}
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 bg-secondary/40 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="font-medium text-muted-foreground">
          {data.length > 0
            ? `${firstRow}-${lastRow} de ${data.length} registros`
            : "0 registros"}
          {rows[0]?.original && getRowLabel
            ? ` · ${getRowLabel(rows[0].original)} no topo`
            : ""}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Primeira página"
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-24 px-2 text-center text-xs font-bold text-muted-foreground">
            Página {pagination.pageIndex + 1} de {Math.max(pageCount, 1)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Última página"
          >
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
