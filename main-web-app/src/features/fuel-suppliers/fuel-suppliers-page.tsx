import {
  createFuelSupplierAction,
  getInitialRegistryActionState,
} from "@/features/commercial-registry/commercial-registry.actions";
import {
  getRegistryList,
  parseRegistrySearchParams,
} from "@/features/commercial-registry/commercial-registry.server";
import { RegistryPage } from "@/features/commercial-registry/components/registry-page";

export async function FuelSuppliersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const query = parseRegistrySearchParams(searchParams);
  const page = await getRegistryList("fuel-suppliers", query);
  return (
    <RegistryPage
      action={createFuelSupplierAction}
      copy={{
        basePath: "/home/fornecedores",
        createLabel: "Novo fornecedor",
        detailPath: (id) => `/home/fornecedores/${id}`,
        documentLabel: "CPF ou CNPJ",
        emptyDescription:
          "Fornecedores de combustível ativos aparecem aqui por empresa.",
        emptyTitle: "Nenhum fornecedor encontrado",
        newTitle: "Cadastrar fornecedor de combustível",
        searchPlaceholder: "Buscar por razão social, nome ou contato",
      }}
      initialState={getInitialRegistryActionState()}
      pageInfo={page.pageInfo}
      query={query}
      rows={page.data}
    />
  );
}
