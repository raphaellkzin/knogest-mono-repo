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
} from "@/features/commercial-registry/commercial-registry.server";
import { FuelSuppliersTabs } from "./fuel-suppliers-tabs";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderTabs({
  addSupplierToSuppliedItemAction = async () => initialState,
  lookupFuelSupplierOptionsAction = async () => [supplierOption],
}: {
  addSupplierToSuppliedItemAction?: ComponentProps<
    typeof FuelSuppliersTabs
  >["addSupplierToSuppliedItemAction"];
  lookupFuelSupplierOptionsAction?: ComponentProps<
    typeof FuelSuppliersTabs
  >["lookupFuelSupplierOptionsAction"];
} = {}) {
  return render(
    <FuelSuppliersTabs
      addSupplierToSuppliedItemAction={addSupplierToSuppliedItemAction}
      createSupplierAction={async () => initialState}
      initialState={initialState}
      initialTab="items"
      lookupFuelSupplierOptionsAction={lookupFuelSupplierOptionsAction}
      pageInfo={{ hasNextPage: false, nextCursor: null }}
      query={query}
      removeSuppliedItemAction={async () => initialState}
      removeSuppliedItemCategoryAction={async () => initialState}
      removeSupplierAction={async () => initialState}
      rows={supplierRows}
      saveSuppliedItemAction={async () => initialState}
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

    expect(
      screen.getByRole("button", { name: "Novo fornecedor" }),
    ).toBeTruthy();
    expect(screen.getByText("Synthetic Diesel Supplier Ltda")).toBeTruthy();
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

  it("opens the add supplier flow with item defaults and propagation opt-in", async () => {
    const user = userEvent.setup();
    let submitted: FormData | null = null;
    const addSupplierToSuppliedItemAction: ComponentProps<
      typeof FuelSuppliersTabs
    >["addSupplierToSuppliedItemAction"] = vi.fn(async (_state, formData) => {
      submitted = formData;
      return { ok: true, message: "Fornecedor vinculado ao item." };
    });
    const lookupFuelSupplierOptionsAction = vi.fn(async () => [supplierOption]);
    renderTabs({
      addSupplierToSuppliedItemAction,
      lookupFuelSupplierOptionsAction,
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

    expect(lookupFuelSupplierOptionsAction).toHaveBeenCalledWith("");
    await user.click(
      await within(screen.getByRole("dialog")).findByRole("button", {
        name: /Synthetic Diesel Supplier Ltda/,
      }),
    );

    expect(
      (screen.getByLabelText("Preço vigente") as HTMLInputElement).value,
    ).toBe("7,5000");
    expect((screen.getByLabelText("Conversão") as HTMLInputElement).value).toBe(
      "1,23456",
    );

    await user.click(
      screen.getByLabelText(
        "Propagar preço e conversão para ofertas ativas existentes deste item",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Confirmar oferta" }));

    await waitFor(() =>
      expect(addSupplierToSuppliedItemAction).toHaveBeenCalled(),
    );
    expect(submitted).not.toBeNull();
    const submittedData = submitted as unknown as FormData;
    expect(submittedData.get("itemId")).toBe("item-1");
    expect(submittedData.get("supplierId")).toBe(supplierOption.id);
    expect(submittedData.get("price")).toBe("7,5000");
    expect(submittedData.get("conversionToBase")).toBe("1,23456");
    expect(submittedData.get("propagateToExistingOffers")).toBe("on");
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Fornecedor vinculado ao item.",
      ),
    );
    expect(screen.queryByText("Fornecedor vinculado ao item.")).toBeNull();
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
        name: /Synthetic Diesel Supplier Ltda/,
      }),
    );
    await user.click(screen.getByRole("button", { name: "Confirmar oferta" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Este fornecedor já tem uma oferta ativa para este item.",
      ),
    );
  });
});
