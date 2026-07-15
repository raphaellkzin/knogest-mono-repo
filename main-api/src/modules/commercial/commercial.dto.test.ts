import { describe, expect, it } from "vitest";

import { updateSupplierSchema } from "./commercial.dto";

describe("Commercial DTOs", () => {
  it("accepts editable Supplier registry fields and normalizes empty optional values", () => {
    expect(
      updateSupplierSchema.parse({
        legalName: " Synthetic Supplier Ltda ",
        tradeName: "",
        phone: null,
        addressStreet: "Rua Teste",
        addressNumber: "100",
        postalCode: "60170-000",
      }),
    ).toEqual({
      legalName: "Synthetic Supplier Ltda",
      tradeName: null,
      phone: null,
      addressStreet: "Rua Teste",
      addressNumber: "100",
      postalCode: "60170-000",
    });
  });

  it("rejects identity fields and unknown Supplier update properties", () => {
    expect(
      updateSupplierSchema.safeParse({
        entityType: "individual",
        fullName: "Synthetic Supplier",
      }).success,
    ).toBe(false);
    expect(
      updateSupplierSchema.safeParse({
        document: "529.982.247-25",
        fullName: "Synthetic Supplier",
      }).success,
    ).toBe(false);
    expect(
      updateSupplierSchema.safeParse({
        fullName: "Synthetic Supplier",
        corporationId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
  });
});
