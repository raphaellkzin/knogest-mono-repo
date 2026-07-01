import {
  createClientAction,
  getInitialRegistryActionState,
} from "@/features/commercial-registry/commercial-registry.actions";
import {
  getRegistryList,
  parseRegistrySearchParams,
} from "@/features/commercial-registry/commercial-registry.server";
import { RegistryPage } from "@/features/commercial-registry/components/registry-page";

export async function ClientsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = parseRegistrySearchParams(searchParams);
  const page = await getRegistryList("clients", query);
  return (
    <RegistryPage
      action={createClientAction}
      copy={{
        basePath: "/home/clientes",
        createLabel: "Novo cliente",
        detailPath: (id) => `/home/clientes/${id}`,
        documentLabel: "CPF ou CNPJ",
        emptyDescription: "Clientes cadastrados aparecem aqui por empresa.",
        emptyTitle: "Nenhum cliente encontrado",
        newTitle: "Cadastrar cliente",
        searchPlaceholder: "Buscar por nome, contato ou telefone",
      }}
      initialState={getInitialRegistryActionState()}
      pageInfo={page.pageInfo}
      query={query}
      rows={page.data}
    />
  );
}
