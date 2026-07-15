// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { RegistryDetail } from "../commercial-registry.server";
import { RegistryDetailPage } from "./registry-detail-page";

const initialState = { ok: false, message: "" };

const supplier = {
  id: "00000000-0000-4000-8000-000000000701",
  entityType: "legal_entity",
  name: "Synthetic Diesel Supplier Ltda",
  fullName: null,
  legalName: "Synthetic Diesel Supplier Ltda",
  tradeName: "Synthetic Diesel",
  phone: "(85) 3333-0000",
  email: "supplier@example.test",
  addressLine: "Rua Inicial, 10",
  addressStreet: "Rua Inicial",
  addressNumber: "10",
  addressComplement: null,
  addressNeighborhood: "Centro",
  city: "Fortaleza",
  state: "CE",
  postalCode: "60170-000",
  document: {
    documentType: "CNPJ",
    maskedDocument: "**.***.***/0001-81",
    plaintextDocument: "11222333000181",
  },
  isActive: true,
  createdAt: "2026-07-14T12:00:00.000Z",
  updatedAt: "2026-07-14T12:00:00.000Z",
  offers: [],
} satisfies RegistryDetail;

const catalog = {
  units: [{ id: "unit-1", code: "L", name: "Litro" }],
  items: [{ id: "item-1", name: "Diesel S10", baseUnitId: "unit-1" }],
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
      valueUnitQuantity: "1.000000",
      basePrice: "7.5000",
      activeSupplierCount: 1,
      spentQuantity: null,
      lastSpentAt: null,
      updatedAt: "2026-07-14T12:00:00.000Z",
    },
  ],
};

const supplierWithOffer = {
  ...supplier,
  offers: [
    {
      id: "offer-1",
      item: { id: "item-1", name: "Diesel S10", baseUnitId: "unit-1" },
      baseUnit: { id: "unit-1", code: "L", name: "Litro" },
      purchaseUnit: { id: "unit-1", code: "L", name: "Litro" },
      conversionToBase: "1.000000",
      currentPrice: {
        id: "price-1",
        price: "7.5000",
        effectiveFrom: "2026-07-14T12:00:00.000Z",
      },
      priceHistory: [],
      createdAt: "2026-07-14T12:00:00.000Z",
      updatedAt: "2026-07-14T12:00:00.000Z",
    },
  ],
} satisfies RegistryDetail;

describe("RegistryDetailPage supplier editing", () => {
  it("opens the Supplier edit modal filled without editable document fields", async () => {
    const user = userEvent.setup();
    render(
      <RegistryDetailPage
        backHref="/home/fornecedores"
        initialOfferState={initialState}
        record={supplier}
        title="Detalhe do fornecedor"
        updateSupplierAction={async () => ({
          ok: true,
          message: "Fornecedor atualizado.",
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Editar fornecedor" }));

    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(
      (screen.getByLabelText("Razão social") as HTMLInputElement).value,
    ).toBe("Synthetic Diesel Supplier Ltda");
    expect(
      (screen.getByLabelText("Nome fantasia") as HTMLInputElement).value,
    ).toBe("Synthetic Diesel");
    expect((screen.getByLabelText("CEP") as HTMLInputElement).value).toBe(
      "60170-000",
    );
    expect(screen.queryByLabelText("CNPJ")).toBeNull();
  });

  it("shows measurement unit and reveals editable conversion in the Supplier offer modal", async () => {
    const user = userEvent.setup();
    render(
      <RegistryDetailPage
        backHref="/home/fornecedores"
        catalog={catalog}
        initialOfferState={initialState}
        record={supplierWithOffer}
        removeOfferAction={async () => initialState}
        saveOfferAction={async () => initialState}
        title="Detalhe do fornecedor"
      />,
    );

    expect(screen.queryByRole("tab", { name: "Itens fornecidos" })).toBeNull();
    expect(screen.getByText("Unidade de medida")).toBeTruthy();
    expect(screen.getByText("Conversão")).toBeTruthy();
    expect(screen.getByText("1,00000")).toBeTruthy();
    expect(screen.queryByText("Unidade-base")).toBeNull();
    expect(screen.queryByText("Compra")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Nova oferta" }));

    expect(screen.getByLabelText("Unidade de medida")).toBeTruthy();
    expect(screen.queryByLabelText("Conversão")).toBeNull();
    await user.click(screen.getByLabelText("Informar conversão"));
    expect((screen.getByLabelText("Conversão") as HTMLInputElement).value).toBe(
      "1,00000",
    );
    expect(screen.queryByText("Unidade de compra")).toBeNull();
    expect(screen.queryByText("Conversão para unidade-base")).toBeNull();
  });
});
