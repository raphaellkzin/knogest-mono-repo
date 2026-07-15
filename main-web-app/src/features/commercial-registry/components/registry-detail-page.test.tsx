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
});
