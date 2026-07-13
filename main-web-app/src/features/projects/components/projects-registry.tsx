import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectWizard, type ProjectWizardOptions } from "./project-wizard";

type ProjectRow = {
  id: string;
  name: string;
  contractNumber: string | null;
  status: "planned";
  createdAt: string;
};

export function ProjectsRegistry({
  companyId,
  options,
  page,
  search,
}: {
  companyId: string;
  options: ProjectWizardOptions;
  page: {
    data: ProjectRow[];
    pageInfo: { hasNextPage: boolean; nextCursor: string | null };
  };
  search?: string;
}) {
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border bg-secondary/60 px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <form
              className="flex flex-col gap-2 sm:flex-row sm:items-center"
              action="/home/obras"
            >
              <label className="relative block min-w-0 flex-1 sm:min-w-80">
                <span className="sr-only">
                  Buscar obras por nome ou contrato
                </span>
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-10 bg-background pl-9"
                  name="search"
                  defaultValue={search}
                  placeholder="Buscar por nome ou contrato"
                />
              </label>
              <Button className="h-10" type="submit">
                Buscar
              </Button>
            </form>
            <ProjectWizard expectedCompanyId={companyId} options={options} />
          </div>
        </div>

        {page.data.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-base font-bold">Nenhuma obra encontrada</p>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              Ajuste a busca ou cadastre uma nova obra para iniciar o
              acompanhamento.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Obras cadastradas</caption>
              <thead>
                <tr className="bg-card">
                  <th
                    scope="col"
                    className="border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground"
                  >
                    Nome da obra
                  </th>
                  <th
                    scope="col"
                    className="border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground"
                  >
                    Contrato
                  </th>
                  <th
                    scope="col"
                    className="border-b border-border px-4 py-3 text-xs font-bold text-muted-foreground"
                  >
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {page.data.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-accent/55 focus-within:bg-accent/55"
                  >
                    <td className="border-b border-border px-4 py-3.5 font-bold text-foreground">
                      <Link
                        className="rounded-sm text-primary outline-none transition-colors hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
                        href={`/home/obras/${row.id}`}
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="border-b border-border px-4 py-3.5 font-medium text-foreground">
                      {row.contractNumber ?? "Não informado"}
                    </td>
                    <td className="border-b border-border px-4 py-3.5">
                      <span className="inline-flex rounded-md bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground">
                        Planejada
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {page.pageInfo.hasNextPage && page.pageInfo.nextCursor && (
        <Link
          className="inline-flex min-h-11 items-center rounded-md border px-4"
          href={{
            pathname: "/home/obras",
            query: {
              ...(search ? { search } : {}),
              cursor: page.pageInfo.nextCursor,
            },
          }}
        >
          Próxima página
        </Link>
      )}
    </div>
  );
}
