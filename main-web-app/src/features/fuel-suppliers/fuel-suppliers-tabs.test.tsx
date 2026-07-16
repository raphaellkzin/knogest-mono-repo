// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";

import type {
  RegistryListItem,
  SupplierSelectorOption,
  SuppliedItemOfferDetail,
} from "@/features/commercial-registry/commercial-registry.server";
import { FuelSuppliersTabs } from "./fuel-suppliers-tabs";

const replaceMock = vi.hoisted(() => vi.fn());
const pushMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const initialState = { ok: false, message: "" };
const query = { sortBy: "createdAt" as const, sortDirection: "desc" as const };

const catalog = {
  units: [{ id: "unit-1", code: "L", name: "Litro" }],
  items: [
    {
      id: "item-1",
      name: "Diesel S10",
      baseUnitId: "unit-1",
      categoryId: "category-1",
      valueUnitQuantity: "1.234560",
      basePrice: "7.5000",
    },
  ],
  categories: [
    {
      id: "category-1",
      name: "Combustíveis",
      parentId: null,
      createdAt: "2026-07-14T12:00:00.000Z",
      updatedAt: "2026-07-14T12:00:00.000Z",
    },
  ],
  catalogItems: [
    {
      id: "item-1",
      name: "Diesel S10",
      categoryId: "category-1",
      baseUnitId: "unit-1",
      baseUnit: { id: "unit-1", code: "L", name: "Litro" },
      valueUnitQuantity: "1.234560",
      basePrice: "7.5000",
      activeSupplierCount: 1,
      spentQuantity: null,
      lastSpentAt: null,
      updatedAt: "2026-07-14T12:00:00.000Z",
    },
  ],
};

const supplierOption: SupplierSelectorOption = {
  id: "00000000-0000-4000-8000-000000000701",
  name: "Synthetic Diesel Supplier Ltda",
  tradeName: "Synthetic Diesel",
  document: { documentType: "CNPJ", maskedDocument: "**.***.***/0001-81" },
};

const availableSupplierOption: SupplierSelectorOption = {
  id: "00000000-0000-4000-8000-000000000702",
  name: "Available Fuel Supplier Ltda",
  tradeName: "Available Fuel",
  document: { documentType: "CNPJ", maskedDocument: "**.***.***/0001-82" },
};

const supplierRows = [
  {
    id: supplierOption.id,
    entityType: "legal_entity",
    name: supplierOption.name,
    fullName: null,
    legalName: supplierOption.name,
    tradeName: supplierOption.tradeName,
    phone: null,
    email: null,
    addressLine: null,
    addressStreet: null,
    addressNumber: null,
    addressComplement: null,
    addressNeighborhood: null,
    city: null,
    state: null,
    postalCode: null,
    document: supplierOption.document,
    isActive: true,
    createdAt: "2026-07-14T12:00:00.000Z",
    updatedAt: "2026-07-14T12:00:00.000Z",
  },
] as unknown as RegistryListItem[];

const itemOffer: SuppliedItemOfferDetail = {
  id: "offer-1",
  supplier: supplierOption,
  baseUnit: { id: "unit-1", code: "L", name: "Litro" },
  conversionToBase: "1.234560",
  currentPrice: {
    id: "price-1",
    price: "7.5000",
    effectiveFrom: "2026-07-14T12:00:00.000Z",
  },
  priceHistory: [],
  createdAt: "2026-07-14T12:00:00.000Z",
  updatedAt: "2026-07-14T12:00:00.000Z",
};

const secondItemOffer: SuppliedItemOfferDetail = {
  ...itemOffer,
  id: "offer-2",
  supplier: availableSupplierOption,
  currentPrice: {
    id: "price-2",
    price: "8.0000",
    effectiveFrom: "2026-07-14T13:00:00.000Z",
  },
  updatedAt: "2026-07-14T13:00:00.000Z",
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderTabs({
  addSupplierToSuppliedItemAction = async () => initialState,
  initialTab = "items",
  lookupFuelSupplierOptionsAction = async () => [
    supplierOption,
    availableSupplierOption,
  ],
  lookupSuppliedItemOfferSupplierIdsAction = async () => [supplierOption.id],
  lookupSuppliedItemOffersAction = async () => ({
    data: [itemOffer],
    pageInfo: { hasNextPage: false, nextCursor: null },
  }),
  saveSupplierOfferAction = async () => initialState,
  saveSuppliedItemAction = async () => initialState,
}: {
  addSupplierToSuppliedItemAction?: ComponentProps<
    typeof FuelSuppliersTabs
  >["addSupplierToSuppliedItemAction"];
  initialTab?: ComponentProps<typeof FuelSuppliersTabs>["initialTab"];
  lookupFuelSupplierOptionsAction?: ComponentProps<
    typeof FuelSuppliersTabs
  >["lookupFuelSupplierOptionsAction"];
  lookupSuppliedItemOfferSupplierIdsAction?: ComponentProps<
    typeof FuelSuppliersTabs
  >["lookupSuppliedItemOfferSupplierIdsAction"];
  lookupSuppliedItemOffersAction?: ComponentProps<
    typeof FuelSuppliersTabs
  >["lookupSuppliedItemOffersAction"];
  saveSupplierOfferAction?: ComponentProps<
    typeof FuelSuppliersTabs
  >["saveSupplierOfferAction"];
  saveSuppliedItemAction?: ComponentProps<
    typeof FuelSuppliersTabs
  >["saveSuppliedItemAction"];
} = {}) {
  return render(
    <FuelSuppliersTabs
      addSupplierToSuppliedItemAction={addSupplierToSuppliedItemAction}
      createSupplierAction={async () => initialState}
      initialState={initialState}
      initialTab={initialTab}
      lookupFuelSupplierOptionsAction={lookupFuelSupplierOptionsAction}
      lookupSuppliedItemOfferSupplierIdsAction={
        lookupSuppliedItemOfferSupplierIdsAction
      }
      lookupSuppliedItemOffersAction={lookupSuppliedItemOffersAction}
      pageInfo={{ hasNextPage: false, nextCursor: null }}
      query={query}
      removeSuppliedItemAction={async () => initialState}
      removeSuppliedItemCategoryAction={async () => initialState}
      removeSupplierAction={async () => initialState}
      rows={supplierRows}
      saveSupplierOfferAction={saveSupplierOfferAction}
      saveSuppliedItemAction={saveSuppliedItemAction}
      saveSuppliedItemCategoryAction={async () => initialState}
      supplierCatalog={catalog}
    />,
  );
}

describe("FuelSuppliersTabs", () => {
  it("opens on supplied items and keeps the supplier list in the second tab", async () => {
    const user = userEvent.setup();
    renderTabs();

    expect(
      screen
        .getByRole("tab", { name: "Itens fornecidos" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByText("Ações da raiz")).toBeTruthy();
    expect(screen.getByText("Combustíveis")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Fornecedores" }));

    expect(replaceMock).toHaveBeenCalledWith(
      "/home/fornecedores?tab=suppliers&sortBy=createdAt&sortDirection=desc",
    );
    expect(
      screen.getByRole("button", { name: "Novo fornecedor" }),
    ).toBeTruthy();
    expect(screen.getByText("Synthetic Diesel Supplier Ltda")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ver/ }).getAttribute("href")).toBe(
      `/home/fornecedores/${supplierOption.id}?tab=suppliers`,
    );
  });

  it("can open directly on the supplier tab", () => {
    renderTabs({ initialTab: "suppliers" });

    expect(
      screen
        .getByRole("tab", { name: "Fornecedores" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Novo fornecedor" }),
    ).toBeTruthy();
  });

  it("creates root records from root actions and nested records from the open category card", async () => {
    const user = userEvent.setup();
    renderTabs();

    await user.click(screen.getByRole("button", { name: "Criar item" }));
    let dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText("Nome")).toBeTruthy();
    expect(
      new FormData(
        document.getElementById("supplied-item-form") as HTMLFormElement,
      ).get("categoryId"),
    ).toBe("");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(screen.getByRole("button", { name: "Combustíveis" }));
    await user.click(screen.getByRole("button", { name: "Adicionar item" }));

    dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByLabelText("Nome")).toBeTruthy();
    expect(
      new FormData(
        document.getElementById("supplied-item-form") as HTMLFormElement,
      ).get("categoryId"),
    ).toBe("category-1");

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    await user.click(
      screen.getByRole("button", { name: "Criar subcategoria" }),
    );

    expect(
      new FormData(
        document.getElementById(
          "supplied-item-category-form",
        ) as HTMLFormElement,
      ).get("parentId"),
    ).toBe("category-1");
  });

  it("opens the add supplier flow with item defaults and saves the offer directly", async () => {
    const user = userEvent.setup();
    let submitted: FormData | null = null;
    const addSupplierToSuppliedItemAction: ComponentProps<
      typeof FuelSuppliersTabs
    >["addSupplierToSuppliedItemAction"] = vi.fn(async (_state, formData) => {
      submitted = formData;
      return { ok: true, message: "Fornecedor vinculado ao item." };
    });
    const lookupFuelSupplierOptionsAction = vi.fn(async () => [
      supplierOption,
      availableSupplierOption,
    ]);
    const lookupSuppliedItemOfferSupplierIdsAction = vi.fn(async () => [
      supplierOption.id,
    ]);
    renderTabs({
      addSupplierToSuppliedItemAction,
      lookupFuelSupplierOptionsAction,
      lookupSuppliedItemOfferSupplierIdsAction,
    });

    await user.click(screen.getByRole("button", { name: "Combustíveis" }));
    await user.click(
      screen.getByRole("button", { name: "Ações de Diesel S10" }),
    );
    expect(
      screen.getByRole("menu", { name: "Ações de Diesel S10" }),
    ).toBeTruthy();
    await user.click(
      screen.getByRole("menuitem", { name: "Adicionar fornecedor" }),
    );

    expect(lookupSuppliedItemOfferSupplierIdsAction).toHaveBeenCalledWith(
      "item-1",
    );
    await waitFor(() =>
      expect(lookupFuelSupplierOptionsAction).toHaveBeenCalledWith(""),
    );
    const addSupplierDialog = within(screen.getByRole("dialog"));
    await waitFor(() =>
      expect(
        addSupplierDialog.queryByRole("button", {
          name: /Synthetic Diesel Supplier Ltda/,
        }),
      ).toBeNull(),
    );
    await user.click(
      await addSupplierDialog.findByRole("button", {
        name: /Available Fuel Supplier Ltda/,
      }),
    );

    expect(
      (screen.getByLabelText("Preço vigente") as HTMLInputElement).value,
    ).toBe("7,5000");
    expect(screen.queryByLabelText("Conversão")).toBeNull();
    expect(
      screen.queryByLabelText(
        "Propagar preço e conversão para ofertas ativas existentes deste item",
      ),
    ).toBeNull();
    await user.click(screen.getByLabelText("Informar conversão"));
    expect((screen.getByLabelText("Conversão") as HTMLInputElement).value).toBe(
      "1,23456",
    );

    await user.click(screen.getByRole("button", { name: "Confirmar oferta" }));

    await waitFor(() =>
      expect(addSupplierToSuppliedItemAction).toHaveBeenCalled(),
    );
    expect(submitted).not.toBeNull();
    const submittedData = submitted as unknown as FormData;
    expect(submittedData.get("itemId")).toBe("item-1");
    expect(submittedData.get("supplierId")).toBe(availableSupplierOption.id);
    expect(submittedData.get("price")).toBe("7,5000");
    expect(submittedData.get("conversionToBase")).toBe("1,23456");
    expect(submittedData.get("propagateToExistingOffers")).toBeNull();
    expect(screen.queryByText("Propagar alterações?")).toBeNull();
    expect(screen.queryByText("Propagar valores do item?")).toBeNull();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Fornecedor vinculado ao item.",
      ),
    );
    expect(screen.queryByText("Fornecedor vinculado ao item.")).toBeNull();
  });

  it("asks to propagate only when editing item mirror values", async () => {
    const user = userEvent.setup();
    let submitted: FormData | null = null;
    const saveSuppliedItemAction: ComponentProps<
      typeof FuelSuppliersTabs
    >["saveSuppliedItemAction"] = vi.fn(async (_state, formData) => {
      submitted = formData;
      return { ok: true, message: "Item atualizado." };
    });
    renderTabs({ saveSuppliedItemAction });

    await user.click(screen.getByRole("button", { name: "Combustíveis" }));
    await user.click(
      screen.getByRole("button", { name: "Ações de Diesel S10" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Editar" }));

    const dialog = within(screen.getByRole("dialog"));
    await user.clear(dialog.getByLabelText("Preço base"));
    await user.type(dialog.getByLabelText("Preço base"), "8,0000");
    await user.click(dialog.getByRole("button", { name: "Salvar item" }));

    expect(screen.getByText("Propagar valores do item?")).toBeTruthy();
    expect(screen.queryByText("Salvar só esta oferta")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Propagar para ofertas" }),
    );

    await waitFor(() => expect(saveSuppliedItemAction).toHaveBeenCalled());
    expect(submitted).not.toBeNull();
    const submittedData = submitted as unknown as FormData;
    expect(submittedData.get("itemId")).toBe("item-1");
    expect(submittedData.get("basePrice")).toBe("8,0000");
    expect(submittedData.get("propagateMirrorToExistingOffers")).toBe("on");
  });

  it("keeps the selected unit when item creation fails", async () => {
    const user = userEvent.setup();
    const saveSuppliedItemAction: ComponentProps<
      typeof FuelSuppliersTabs
    >["saveSuppliedItemAction"] = vi.fn(async () => ({
      ok: false,
      message: "Revise os dados informados e tente novamente. Campos: baseUnitId.",
    }));
    renderTabs({ saveSuppliedItemAction });

    await user.click(screen.getByRole("button", { name: "Criar item" }));
    const dialog = within(screen.getByRole("dialog"));
    await user.type(dialog.getByLabelText("Nome"), "Diesel S500");
    await user.selectOptions(dialog.getByLabelText("Unidade de medida"), "unit-1");
    await user.click(dialog.getByRole("button", { name: "Salvar item" }));

    await waitFor(() => expect(saveSuppliedItemAction).toHaveBeenCalled());
    expect(
      (dialog.getByLabelText("Unidade de medida") as HTMLSelectElement).value,
    ).toBe("unit-1");
    expect(dialog.getByText(/Campos: baseUnitId/u)).toBeTruthy();
  });

  it("shows item action failures through toast", async () => {
    const user = userEvent.setup();
    const addSupplierToSuppliedItemAction: ComponentProps<
      typeof FuelSuppliersTabs
    >["addSupplierToSuppliedItemAction"] = vi.fn(async () => ({
      ok: false,
      message: "Este fornecedor já tem uma oferta ativa para este item.",
    }));
    renderTabs({ addSupplierToSuppliedItemAction });

    await user.click(screen.getByRole("button", { name: "Combustíveis" }));
    await user.click(
      screen.getByRole("button", { name: "Ações de Diesel S10" }),
    );
    await user.click(
      screen.getByRole("menuitem", { name: "Adicionar fornecedor" }),
    );
    await user.click(
      await within(screen.getByRole("dialog")).findByRole("button", {
        name: /Available Fuel Supplier Ltda/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Confirmar oferta" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Este fornecedor já tem uma oferta ativa para este item.",
      ),
    );
  });

  it("paginates item offers and shows only the editing offer while editing", async () => {
    const user = userEvent.setup();
    let submitted: FormData | null = null;
    const lookupSuppliedItemOffersAction = vi.fn(
      async ({ cursor }: { cursor?: string | null; itemId: string }) =>
        cursor
          ? {
              data: [secondItemOffer],
              pageInfo: { hasNextPage: false, nextCursor: null },
            }
          : {
              data: [itemOffer],
              pageInfo: { hasNextPage: true, nextCursor: "cursor-2" },
            },
    );
    const saveSupplierOfferAction: ComponentProps<
      typeof FuelSuppliersTabs
    >["saveSupplierOfferAction"] = vi.fn(async (_state, formData) => {
      submitted = formData;
      return { ok: true, message: "Oferta atualizada." };
    });
    renderTabs({ lookupSuppliedItemOffersAction, saveSupplierOfferAction });

    await user.click(screen.getByRole("button", { name: "Combustíveis" }));
    await user.click(
      screen.getByRole("button", { name: "Ações de Diesel S10" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "Ver ofertas" }));

    expect(lookupSuppliedItemOffersAction).toHaveBeenCalledWith({
      cursor: undefined,
      itemId: "item-1",
    });
    const dialog = within(screen.getByRole("dialog"));
    expect(
      await dialog.findByText("Synthetic Diesel Supplier Ltda"),
    ).toBeTruthy();
    expect(dialog.getByText("R$ 7,50")).toBeTruthy();
    expect(dialog.queryByText("Available Fuel Supplier Ltda")).toBeNull();

    await user.click(
      dialog.getByRole("button", { name: "Carregar mais ofertas" }),
    );
    await waitFor(() =>
      expect(lookupSuppliedItemOffersAction).toHaveBeenCalledWith({
        cursor: "cursor-2",
        itemId: "item-1",
      }),
    );
    expect(await dialog.findByText("Available Fuel Supplier Ltda")).toBeTruthy();

    await user.click(dialog.getAllByRole("button", { name: "Editar" })[0]!);
    expect(dialog.queryByRole("button", { name: "Editar" })).toBeNull();
    expect(dialog.queryByText("Available Fuel Supplier Ltda")).toBeNull();
    expect(
      dialog.queryByRole("button", { name: "Carregar mais ofertas" }),
    ).toBeNull();
    await user.click(dialog.getByRole("button", { name: "Cancelar" }));
    expect(dialog.getByText("Available Fuel Supplier Ltda")).toBeTruthy();

    await user.click(dialog.getAllByRole("button", { name: "Editar" })[0]!);
    await user.clear(dialog.getByLabelText("Preço vigente"));
    await user.type(dialog.getByLabelText("Preço vigente"), "8,2500");
    await user.clear(dialog.getByLabelText("Conversão"));
    await user.type(dialog.getByLabelText("Conversão"), "1,50000");
    await user.click(dialog.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(saveSupplierOfferAction).toHaveBeenCalled());
    expect(submitted).not.toBeNull();
    const submittedData = submitted as unknown as FormData;
    expect(submittedData.get("supplierId")).toBe(supplierOption.id);
    expect(submittedData.get("offerId")).toBe("offer-1");
    expect(submittedData.get("price")).toBe("8,2500");
    expect(submittedData.get("conversionToBase")).toBe("1,50000");
    expect(submittedData.get("propagateToExistingOffers")).toBeNull();
    expect(screen.queryByText("Propagar valores do item?")).toBeNull();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Oferta atualizada."),
    );
    await waitFor(() =>
      expect(lookupSuppliedItemOffersAction).toHaveBeenLastCalledWith({
        cursor: undefined,
        itemId: "item-1",
      }),
    );
  });
});
