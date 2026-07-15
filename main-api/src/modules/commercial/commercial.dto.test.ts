import { describe, expect, it } from "vitest";

import {
  addSupplierToSuppliedItemSchema,
  createSuppliedItemCategorySchema,
  createSuppliedItemSchema,
  updateSupplierSchema,
} from "./commercial.dto";

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

  it("accepts supplied item catalog fields with defaults handled by the service", () => {
    expect(
      createSuppliedItemSchema.parse({
        name: "Diesel S10",
        baseUnitId: "00000000-0000-4000-8000-00000000a001",
        categoryId: null,
        valueUnitQuantity: "1.000000",
        basePrice: "7.5000",
      }),
    ).toEqual({
      name: "Diesel S10",
      baseUnitId: "00000000-0000-4000-8000-00000000a001",
      categoryId: null,
      valueUnitQuantity: "1.000000",
      basePrice: "7.5000",
    });
  });

  it("accepts supplied item categories with optional parent", () => {
    expect(
      createSuppliedItemCategorySchema.parse({
        name: "Combustíveis",
        parentId: null,
      }),
    ).toEqual({
      name: "Combustíveis",
      parentId: null,
    });
  });

  it("accepts adding a supplier to an item with explicit propagation", () => {
    expect(
      addSupplierToSuppliedItemSchema.parse({
        supplierId: "00000000-0000-4000-8000-000000000701",
        price: "7.5000",
        conversionToBase: "1.234560",
        propagateToExistingOffers: true,
      }),
    ).toEqual({
      supplierId: "00000000-0000-4000-8000-000000000701",
      price: "7.5000",
      conversionToBase: "1.234560",
      propagateToExistingOffers: true,
    });
  });

  it("defaults supplier item propagation to false", () => {
    expect(
      addSupplierToSuppliedItemSchema.parse({
        supplierId: "00000000-0000-4000-8000-000000000701",
        price: "7.5000",
        conversionToBase: "1.234560",
      }),
    ).toEqual({
      supplierId: "00000000-0000-4000-8000-000000000701",
      price: "7.5000",
      conversionToBase: "1.234560",
      propagateToExistingOffers: false,
    });
  });
});
