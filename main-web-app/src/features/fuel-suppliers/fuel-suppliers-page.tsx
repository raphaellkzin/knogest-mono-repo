import {
  createFuelSupplierAction,
  lookupRegistryAddressByCepAction,
  removeFuelSupplierAction,
} from "@/features/commercial-registry/commercial-registry.actions";
import { getInitialRegistryActionState } from "@/features/commercial-registry/commercial-registry-action-state";
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
  const page = await getRegistryList("suppliers", query);
  return (
    <RegistryPage
      action={createFuelSupplierAction}
      copy={{
        basePath: "/home/fornecedores",
        createLabel: "Novo fornecedor",
        detailBasePath: "/home/fornecedores",
        emptyDescription: "Fornecedores ativos aparecem aqui por empresa.",
        emptyTitle: "Nenhum fornecedor encontrado",
        newTitle: "Cadastrar fornecedor",
        removeLabel: "Remover",
        searchPlaceholder: "Buscar por razão social, nome ou contato",
      }}
      initialState={getInitialRegistryActionState()}
      lookupAddressByCep={lookupRegistryAddressByCepAction}
      pageInfo={page.pageInfo}
      query={query}
      removeAction={removeFuelSupplierAction}
      rows={page.data}
    />
  );
}
