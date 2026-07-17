// @vitest-environment jsdom

import * as React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../projects.actions", () => ({
  activateProjectAction: vi.fn(),
  saveProjectReadinessAction: vi.fn(),
}));

import type {
  ProjectOfferSnapshot,
  ProjectReadinessOptions,
  SupplierOfferOption,
} from "../projects.types";
import {
  createBlankFuelDraft,
  draftToFuelCommand,
  FuelAddEditor,
  FuelEditEditor,
  OfferRows,
  type FuelDraft,
  type OfferDraft,
} from "./project-detail";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const measurementUnits: ProjectReadinessOptions["measurementUnits"] = [
  { id: "unit-h", code: "H", name: "Hora" },
  { id: "unit-l", code: "L", name: "Litro" },
];

const suppliers: ProjectReadinessOptions["suppliers"] = [
  {
    id: "supplier-1",
    name: "Posto Serra Azul",
    tradeName: null,
    document: { documentType: "cnpj", maskedDocument: "00.000.000/0001-00" },
    isActive: true,
  },
];

const suppliedItems: ProjectReadinessOptions["suppliedItems"] = [
  { id: "item-1", name: "Diesel S10", baseUnitId: "unit-l" },
];

const suppliedItemCategories: ProjectReadinessOptions["suppliedItemCategories"] =
  [{ id: "category-1", name: "Combustíveis", parentId: null }];

const fuelOptions: SupplierOfferOption[] = [
  {
    id: "offer-1",
    supplier: suppliers[0],
    item: { id: "item-1", name: "Diesel S10", baseUnitId: "unit-l" },
    purchaseUnit: { id: "unit-l", code: "L", name: "Litro" },
    conversionToBase: "1.000000",
    currentPrice: {
      price: "6.5000",
      effectiveFrom: "2026-07-16T00:00:00.000Z",
    },
    isFuelCandidate: true,
  },
];

const fuelOfferSnapshot: ProjectOfferSnapshot = {
  id: "project-offer-1",
  usageKind: "fuel",
  sourceOfferId: null,
  sourceOfferIsActive: true,
  supplier: suppliers[0],
  item: { id: "item-1", name: "Diesel S10", isActive: true },
  purchaseUnit: { id: "unit-l", code: "L", name: "Litro", isActive: true },
  conversionToBase: "1.250000",
  price: "6.7000",
  effectiveFrom: "2026-07-16T00:00:00.000Z",
};

const lookupSuppliedItemsAction: React.ComponentProps<
  typeof FuelAddEditor
>["lookupSuppliedItemsAction"] = async () => ({
  data: [
    {
      id: "item-1",
      name: "Diesel S10",
      baseUnitId: "unit-l",
      categoryId: "category-1",
      categoryPath: ["Combustíveis"],
      activeSupplierCount: 1,
    },
  ],
  pageInfo: { hasNextPage: false, nextCursor: null },
});

const lookupSuppliedItemOfferSuppliersAction: React.ComponentProps<
  typeof FuelAddEditor
>["lookupSuppliedItemOfferSuppliersAction"] = async () => suppliers;

const lookupSuppliedItemOffersAction: React.ComponentProps<
  typeof FuelAddEditor
>["lookupSuppliedItemOffersAction"] = async () => ({
  data: [
    {
      id: "offer-1",
      supplier: suppliers[0],
      baseUnit: { id: "unit-l", code: "L", name: "Litro" },
      purchaseUnit: { id: "unit-l", code: "L", name: "Litro" },
      conversionToBase: "1.000000",
      currentPrice: {
        id: "price-1",
        price: "6.5000",
        effectiveFrom: "2026-07-16T00:00:00.000Z",
      },
    },
  ],
  pageInfo: { hasNextPage: false, nextCursor: null },
});

function FuelAddHarness({
  lookupItems = lookupSuppliedItemsAction,
  step = "source",
}: {
  lookupItems?: React.ComponentProps<
    typeof FuelAddEditor
  >["lookupSuppliedItemsAction"];
  step?: React.ComponentProps<typeof FuelAddEditor>["step"];
}) {
  const [draft, setDraft] = React.useState<FuelDraft | null>({
    ...createBlankFuelDraft(fuelOptions, measurementUnits),
    mode: "new",
    supplierId: "supplier-1",
    itemId: "item-1",
    purchaseUnitId: "unit-l",
  });

  if (!draft) return null;

  return (
    <FuelAddEditor
      categories={suppliedItemCategories}
      draft={draft}
      fuelOptions={fuelOptions}
      lookupSuppliedItemOfferSuppliersAction={
        lookupSuppliedItemOfferSuppliersAction
      }
      lookupSuppliedItemOffersAction={lookupSuppliedItemOffersAction}
      lookupSuppliedItemsAction={lookupItems}
      measurementUnits={measurementUnits}
      suppliers={suppliers}
      suppliedItems={suppliedItems}
      step={step}
      setDraft={setDraft}
    />
  );
}

function FuelEditHarness() {
  const [draft, setDraft] = React.useState<FuelDraft | null>({
    key: fuelOfferSnapshot.id,
    mode: "new",
    sourceOfferId: "",
    supplierId: suppliers[0].id,
    itemId: "item-1",
    purchaseUnitId: "unit-l",
    conversionToBase: "1,250000",
    defaultConversionToBase: "1,250000",
    price: "6,7000",
    customQuantityEnabled: false,
  });

  if (!draft) return null;

  return (
    <FuelEditEditor
      draft={draft}
      offer={fuelOfferSnapshot}
      setDraft={setDraft}
    />
  );
}

function MaterialRowsHarness() {
  const [drafts, setDrafts] = React.useState<OfferDraft[]>([
    {
      key: "material-1",
      mode: "new",
      sourceOfferId: "",
      supplierId: "supplier-1",
      itemId: "item-1",
      purchaseUnitId: "unit-l",
      conversionToBase: "1,000000",
      price: "6,5000",
      saveToCatalog: false,
    },
  ]);

  return (
    <OfferRows
      drafts={drafts}
      emptyText="Nenhum item"
      kind="material"
      options={fuelOptions}
      suppliers={suppliers}
      suppliedItems={suppliedItems}
      measurementUnits={measurementUnits}
      setDrafts={setDrafts}
    />
  );
}

describe("Project detail fuel editors", () => {
  it("starts the fuel add wizard at the source choice", () => {
    render(<FuelAddHarness step="source" />);

    expect(screen.getByText("Oferta existente do catálogo")).toBeTruthy();
    expect(screen.getByText("Oferta exclusiva da obra")).toBeTruthy();
  });

  it("hides the catalog toggle when adding a project-only fuel offer", () => {
    render(<FuelAddHarness step="offer" />);

    expect(
      screen.queryByText("Salvar também no catálogo da empresa"),
    ).toBeNull();
    expect(screen.getByLabelText("Buscar fornecedor")).toBeTruthy();
  });

  it("debounces item search before consulting the API", async () => {
    const lookupItems = vi.fn(lookupSuppliedItemsAction);
    render(<FuelAddHarness lookupItems={lookupItems} step="item" />);

    await waitFor(() => expect(lookupItems).toHaveBeenCalledTimes(1));
    lookupItems.mockClear();

    fireEvent.change(screen.getByPlaceholderText("Diesel, gasolina..."), {
      target: { value: "Diesel" },
    });

    expect(lookupItems).not.toHaveBeenCalled();

    await waitFor(() =>
      expect(lookupItems).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Diesel" }),
      ),
    );
  });

  it("always saves a new fuel offer as projectOnly", () => {
    const command = draftToFuelCommand({
      key: "fuel-1",
      mode: "new",
      sourceOfferId: "",
      supplierId: "supplier-1",
      itemId: "item-1",
      purchaseUnitId: "unit-l",
      conversionToBase: "1,000000",
      defaultConversionToBase: "1,000000",
      price: "6,5000",
      customQuantityEnabled: false,
    });

    expect(command).toEqual({
      mode: "projectOnly",
      supplierId: "supplier-1",
      itemId: "item-1",
      purchaseUnitId: "unit-l",
      conversionToBase: "1.000000",
      price: "6.5000",
    });
  });

  it("keeps the catalog toggle available for material offers", () => {
    render(<MaterialRowsHarness />);

    expect(
      screen.getByLabelText("Salvar também no catálogo da empresa"),
    ).toBeTruthy();
  });

  it("keeps supplier, item and unit locked in fuel editing and only reveals quantity on demand", async () => {
    const user = userEvent.setup();
    render(<FuelEditHarness />);

    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByLabelText("Preço")).toBeTruthy();
    expect(screen.queryByLabelText("Quantidade")).toBeNull();

    await user.click(screen.getByLabelText("Alterar quantidade nesta obra"));

    expect(screen.getByLabelText("Quantidade")).toBeTruthy();
  });
});
