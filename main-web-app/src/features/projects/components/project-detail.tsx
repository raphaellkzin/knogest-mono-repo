import Link from "next/link";

export function ProjectDetail({
  project,
}: {
  project: {
    id: string;
    name: string;
    address: string;
    contractNumber: string | null;
    status: "planned";
    createdAt: string;
  };
}) {
  return (
    <article className="space-y-5">
      <Link className="text-sm text-primary hover:underline" href="/home/obras">
        ← Voltar para obras
      </Link>
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Obra planejada
        </p>
        <h1 className="text-3xl font-bold">{project.name}</h1>
      </header>
      <dl className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-muted-foreground">Endereço</dt>
          <dd className="font-medium">{project.address}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Contrato</dt>
          <dd className="font-medium">
            {project.contractNumber ?? "Não informado"}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Situação</dt>
          <dd className="font-medium">Planejada</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Cadastro</dt>
          <dd className="font-medium">
            {new Intl.DateTimeFormat("pt-BR").format(
              new Date(project.createdAt),
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}
