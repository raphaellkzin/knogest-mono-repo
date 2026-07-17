// @vitest-environment jsdom

import * as React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  FuelSupplierOption,
  ProjectOfferSnapshot,
  ProjectReadinessOptions,
  ProjectSuppliedItemOffersPage,
  SuppliedItemSelectorPage,
} from "../projects.types";
import {
  buildMaterialAddCommands,
  buildMaterialEditCommands,
  buildMaterialRemoveCommands,
  createBlankMaterialDraft,
  draftToMaterialCommand,
  MaterialAddEditor,
  type MaterialAddStep,
  type MaterialDraft,
} from "./project-material-offers";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const units: ProjectReadinessOptions["measurementUnits"] = [
  { id: "unit-un", code: "UN", name: "Unidade" },
  { id: "unit-kg", code: "KG", name: "Quilograma" },
];

const categories: ProjectReadinessOptions["suppliedItemCategories"] = [
  { id: "category-root", name: "Agregados", parentId: null },
  {
    id: "category-child",
    name: "Britas",
    parentId: "category-root",
  },
];

const supplier: FuelSupplierOption = {
  id: "supplier-1",
  name: "Pedreira Serra Azul",
  tradeName: "Serra Azul",
  document: { documentType: "CNPJ", maskedDocument: "00.000.000/0001-00" },
  isActive: true,
};

const itemPage: SuppliedItemSelectorPage = {
  data: [
    {
      id: "item-1",
      name: "Brita 1",
      baseUnitId: "unit-kg",
      categoryId: "category-child",
      categoryPath: ["Agregados", "Britas"],
      activeSupplierCount: 1,
    },
  ],
  pageInfo: { hasNextPage: false, nextCursor: null },
};

const offerPage: ProjectSuppliedItemOffersPage = {
  data: [
    {
      id: "source-offer-1",
      supplier,
      baseUnit: { id: "unit-kg", code: "KG", name: "Quilograma" },
      purchaseUnit: { id: "unit-kg", code: "KG", name: "Quilograma" },
      conversionToBase: "1.000000",
      currentPrice: {
        id: "price-1",
        price: "6.5000",
        effectiveFrom: "2026-07-17T00:00:00.000Z",
      },
    },
  ],
  pageInfo: { hasNextPage: false, nextCursor: null },
};

const existingProjectOffer: ProjectOfferSnapshot = {
  id: "project-offer-1",
  usageKind: "material",
  sourceOfferId: "source-offer-1",
  sourceOfferIsActive: true,
  supplier,
  item: { id: "item-1", name: "Brita 1", isActive: true },
  purchaseUnit: {
    id: "unit-kg",
    code: "KG",
    name: "Quilograma",
    isActive: true,
  },
  conversionToBase: "1.000000",
  price: "6.5000",
  effectiveFrom: "2026-07-17T00:00:00.000Z",
};

function MaterialHarness({
  draft: initialDraft,
  lookupItems = vi.fn(async () => itemPage),
  lookupOfferSuppliers = vi.fn(async () => [supplier]),
  lookupOffers = vi.fn(async () => offerPage),
  lookupSuppliers = vi.fn(async () => [supplier]),
  step,
}: {
  draft?: MaterialDraft;
  lookupItems?: (input: {
    categoryId?: string | null;
    cursor?: string | null;
    onlyWithActiveOffers?: boolean;
    search?: string;
  }) => Promise<SuppliedItemSelectorPage>;
  lookupOfferSuppliers?: (input: {
    itemId: string;
    search?: string;
  }) => Promise<FuelSupplierOption[]>;
  lookupOffers?: (input: {
    cursor?: string | null;
    itemId: string;
    supplierId?: string | null;
  }) => Promise<ProjectSuppliedItemOffersPage>;
  lookupSuppliers?: (input: {
    search?: string;
  }) => Promise<FuelSupplierOption[]>;
  step: MaterialAddStep;
}) {
  const [draft, setDraft] = React.useState<MaterialDraft | null>(
    initialDraft ?? createBlankMaterialDraft(),
  );
  if (!draft) return null;
  return (
    <MaterialAddEditor
      categories={categories}
      draft={draft}
      lookupItemsAction={lookupItems}
      lookupOfferSuppliersAction={lookupOfferSuppliers}
      lookupOffersAction={lookupOffers}
      lookupSuppliersAction={lookupSuppliers}
      measurementUnits={units}
      saveIssues={[]}
      setDraft={setDraft}
      step={step}
    />
  );
}

describe("Project material offer wizard", () => {
  it("starts with an explicit source choice and no preselected mode", () => {
    render(<MaterialHarness step="source" />);

    expect(screen.getByText("Oferta existente do catálogo")).toBeTruthy();
    expect(screen.getByText("Oferta exclusiva da obra")).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: /Oferta existente do catálogo/u })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("debounces item search and sends category and active-offer filters", async () => {
    const lookupItems = vi.fn(async () => itemPage);
    render(
      <MaterialHarness
        draft={{ ...createBlankMaterialDraft(), mode: "existing" }}
        lookupItems={lookupItems}
        step="item"
      />,
    );

    await waitFor(() => expect(lookupItems).toHaveBeenCalledTimes(1));
    lookupItems.mockClear();

    fireEvent.change(screen.getByPlaceholderText("Areia, brita, cimento..."), {
      target: { value: "Brita" },
    });
    fireEvent.change(screen.getByLabelText("Categoria e subcategoria"), {
      target: { value: "category-root" },
    });

    expect(lookupItems).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(lookupItems).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: "category-root",
          onlyWithActiveOffers: true,
          search: "Brita",
        }),
      ),
    );
  });

  it("filters catalog offers by the selected supplier and auto-selects a unique offer", async () => {
    const lookupOfferSuppliers = vi.fn(async () => [supplier]);
    const lookupOffers = vi.fn(async () => offerPage);
    render(
      <MaterialHarness
        draft={{
          ...createBlankMaterialDraft(),
          mode: "existing",
          itemId: "item-1",
          supplierId: supplier.id,
          purchaseUnitId: "unit-kg",
        }}
        lookupOfferSuppliers={lookupOfferSuppliers}
        lookupOffers={lookupOffers}
        step="supplier"
      />,
    );

    await waitFor(() =>
      expect(lookupOfferSuppliers).toHaveBeenCalledWith({
        itemId: "item-1",
        search: "",
      }),
    );
    await waitFor(() =>
      expect(lookupOffers).toHaveBeenCalledWith({
        cursor: null,
        itemId: "item-1",
        supplierId: supplier.id,
      }),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: /KG - Quilograma/u })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );
  });

  it("searches active suppliers by name for project-only offers", async () => {
    const lookupSuppliers = vi.fn(async () => [supplier]);
    render(
      <MaterialHarness
        draft={{
          ...createBlankMaterialDraft(),
          mode: "new",
          itemId: "item-1",
        }}
        lookupSuppliers={lookupSuppliers}
        step="supplier"
      />,
    );

    await waitFor(() => expect(lookupSuppliers).toHaveBeenCalledTimes(1));
    lookupSuppliers.mockClear();
    fireEvent.change(screen.getByLabelText("Buscar fornecedor"), {
      target: { value: "Serra" },
    });
    expect(lookupSuppliers).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(lookupSuppliers).toHaveBeenCalledWith({ search: "Serra" }),
    );
  });

  it("always converts a new material offer to projectOnly", () => {
    expect(
      draftToMaterialCommand({
        ...createBlankMaterialDraft(),
        mode: "new",
        supplierId: supplier.id,
        itemId: "item-1",
        purchaseUnitId: "unit-kg",
        conversionToBase: "2,000000",
        price: "7,2500",
      }),
    ).toEqual({
      mode: "projectOnly",
      supplierId: supplier.id,
      itemId: "item-1",
      purchaseUnitId: "unit-kg",
      conversionToBase: "2.000000",
      price: "7.2500",
    });
  });

  it("preserves current offers while adding, editing and removing", () => {
    const exclusiveDraft: MaterialDraft = {
      ...createBlankMaterialDraft(),
      mode: "new",
      supplierId: "supplier-2",
      itemId: "item-2",
      purchaseUnitId: "unit-un",
      conversionToBase: "3,000000",
      price: "10,0000",
    };
    const added = buildMaterialAddCommands(
      [existingProjectOffer],
      exclusiveDraft,
    );
    expect(added).toHaveLength(2);
    expect(added?.[1]).toMatchObject({ mode: "projectOnly" });

    const edited = buildMaterialEditCommands(
      [existingProjectOffer],
      existingProjectOffer.id,
      {
        ...exclusiveDraft,
        key: existingProjectOffer.id,
        mode: "existing",
        sourceOfferId: "source-offer-1",
        supplierId: supplier.id,
        itemId: "item-1",
        purchaseUnitId: "unit-kg",
        price: "8,0000",
      },
    );
    expect(edited?.[0]).toMatchObject({
      mode: "existing",
      sourceOfferId: "source-offer-1",
      price: "8.0000",
    });
    expect(
      buildMaterialRemoveCommands(
        [existingProjectOffer],
        existingProjectOffer.id,
      ),
    ).toEqual([]);
  });

  it("shows an inline recovery message when an item lookup fails", async () => {
    render(
      <MaterialHarness
        draft={{ ...createBlankMaterialDraft(), mode: "new" }}
        lookupItems={vi.fn(async () => {
          throw new Error("offline");
        })}
        step="item"
      />,
    );

    expect(
      await screen.findByText("Não foi possível carregar os itens."),
    ).toBeTruthy();
  });
});
