// @vitest-environment jsdom

import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import type {
  ProjectOfferSnapshot,
  ProjectReadinessOptions,
  SupplierOfferOption,
} from "../projects.server";
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

const fuelOptions: SupplierOfferOption[] = [
  {
    id: "offer-1",
    supplier: suppliers[0],
    item: { id: "item-1", name: "Diesel S10", baseUnitId: "unit-l" },
    purchaseUnit: { id: "unit-l", code: "L", name: "Litro" },
    conversionToBase: "1.000000",
    currentPrice: { price: "6.5000", effectiveFrom: "2026-07-16T00:00:00.000Z" },
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

function FuelAddHarness() {
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
      draft={draft}
      fuelOptions={fuelOptions}
      suppliers={suppliers}
      suppliedItems={suppliedItems}
      measurementUnits={measurementUnits}
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
  it("hides the catalog toggle when adding a new fuel offer", () => {
    render(<FuelAddHarness />);

    expect(
      screen.queryByText("Salvar também no catálogo da empresa"),
    ).toBeNull();
    expect(screen.getByLabelText("Fornecedor")).toBeTruthy();
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
