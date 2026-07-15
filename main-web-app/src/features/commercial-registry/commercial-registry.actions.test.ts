import { describe, expect, it } from "vitest";

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
