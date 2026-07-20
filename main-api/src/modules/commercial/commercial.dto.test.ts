import { describe, expect, it } from "vitest";

import {
  addSupplierToSuppliedItemSchema,
  createSuppliedItemCategorySchema,
  createSuppliedItemSchema,
  listSuppliedItemOffersQuerySchema,
  updateSuppliedItemSchema,
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

  it("accepts supplied item mirror propagation only on item updates", () => {
    expect(
      updateSuppliedItemSchema.parse({
        name: "Diesel S10",
        baseUnitId: "00000000-0000-4000-8000-00000000a001",
        valueUnitQuantity: "1.234560",
        basePrice: "7.5000",
        propagateMirrorToExistingOffers: true,
      }),
    ).toEqual({
      name: "Diesel S10",
      baseUnitId: "00000000-0000-4000-8000-00000000a001",
      valueUnitQuantity: "1.234560",
      basePrice: "7.5000",
      propagateMirrorToExistingOffers: true,
    });
  });

  it("accepts adding a supplier to an item without propagation", () => {
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
    });
  });

  it("rejects supplier item propagation from offer creation", () => {
    expect(
      addSupplierToSuppliedItemSchema.safeParse({
        supplierId: "00000000-0000-4000-8000-000000000701",
        price: "7.5000",
        conversionToBase: "1.234560",
        propagateToExistingOffers: true,
      }).success,
    ).toBe(false);
  });

  it("defaults supplied item offers pagination to 30", () => {
    expect(listSuppliedItemOffersQuerySchema.parse({})).toEqual({
      limit: 30,
      kind: "all",
    });
    expect(
      listSuppliedItemOffersQuerySchema.parse({
        cursor: "abc",
        limit: "30",
      }),
    ).toEqual({ cursor: "abc", kind: "all", limit: 30 });
  });
});
