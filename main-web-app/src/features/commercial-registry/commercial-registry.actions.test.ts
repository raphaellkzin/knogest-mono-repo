import { describe, expect, it } from "vitest";

import { suppliedItemPayload } from "./commercial-registry-item-payload";
import { supplierOfferPayload } from "./commercial-registry-offer-payload";

describe("supplierOfferPayload", () => {
  it("derives purchase unit from the measurement unit and preserves conversion", () => {
    const formData = new FormData();
    formData.set("itemId", "00000000-0000-4000-8000-000000000702");
    formData.set("baseUnitId", "00000000-0000-4000-8000-00000000a001");
    formData.set("purchaseUnitId", "00000000-0000-4000-8000-00000000a999");
    formData.set("conversionToBase", "9,87654");
    formData.set("price", "1,2500");

    expect(supplierOfferPayload(formData)).toEqual({
      itemId: "00000000-0000-4000-8000-000000000702",
      itemName: undefined,
      baseUnitId: "00000000-0000-4000-8000-00000000a001",
      purchaseUnitId: "00000000-0000-4000-8000-00000000a001",
      conversionToBase: "9.876540",
      price: "1.2500",
    });
  });
});

describe("suppliedItemPayload", () => {
  it("preserves the selected measurement unit when creating a supplied item", () => {
    const formData = new FormData();
    formData.set("name", "Diesel S10");
    formData.set("baseUnitId", "00000000-0000-4000-8000-00000000a010");
    formData.set("basePrice", "7,2500");

    const payload = suppliedItemPayload(formData);
    expect(payload).toEqual({
      name: "Diesel S10",
      baseUnitId: "00000000-0000-4000-8000-00000000a010",
      categoryId: null,
      valueUnitQuantity: "1.000000",
      basePrice: "7.2500",
    });
    expect("propagateMirrorToExistingOffers" in payload).toBe(false);
  });
});
