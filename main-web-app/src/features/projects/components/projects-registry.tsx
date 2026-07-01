import Link from "next/link";
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
    <div className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Planejamento
          </p>
          <h1 className="text-2xl font-bold">Obras</h1>
          <p className="text-muted-foreground">
            Projetos cadastrados na empresa selecionada.
          </p>
        </div>
        <ProjectWizard expectedCompanyId={companyId} options={options} />
      </header>
      <form className="flex gap-2" action="/home/obras">
        <input
          className="min-h-11 flex-1 rounded-md border border-input bg-background px-3"
          name="search"
          defaultValue={search}
          placeholder="Buscar por nome ou contrato"
        />
        <button
          className="min-h-11 rounded-md bg-primary px-5 font-semibold text-primary-foreground"
          type="submit"
        >
          Buscar
        </button>
      </form>
      {page.data.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Nenhuma obra encontrada.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3">Obra</th>
                <th className="p-3">Contrato</th>
                <th className="p-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {page.data.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3 font-medium">
                    <Link
                      className="text-primary underline-offset-4 hover:underline"
                      href={`/home/obras/${row.id}`}
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="p-3">
                    {row.contractNumber ?? "Não informado"}
                  </td>
                  <td className="p-3">Planejada</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
