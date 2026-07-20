import { describe, expect, it } from "vitest";

import {
  buildCatalogCategoryStates,
  itemCatalogState,
} from "./catalog-classification";

describe("catalog classification", () => {
  const states = buildCatalogCategoryStates([
    {
      id: "fuel",
      parentId: null,
      systemKey: "fuel",
      isActive: true,
    },
    {
      id: "fuel-child",
      parentId: "fuel",
      systemKey: null,
      isActive: true,
    },
    {
      id: "fuel-disabled",
      parentId: "fuel-child",
      systemKey: null,
      isActive: false,
    },
    {
      id: "materials",
      parentId: null,
      systemKey: null,
      isActive: true,
    },
  ]);

  it("classifies every descendant of the fixed root as fuel", () => {
    expect(states.get("fuel-child")).toEqual({
      effectiveActive: true,
      kind: "fuel",
    });
    expect(
      itemCatalogState(states, {
        categoryId: "fuel-child",
        isActive: true,
      }),
    ).toEqual({ effectiveActive: true, kind: "fuel" });
  });

  it("keeps inactive descendants classified while excluding them from use", () => {
    expect(states.get("fuel-disabled")).toEqual({
      effectiveActive: false,
      kind: "fuel",
    });
  });

  it("classifies uncategorized and regular items as material", () => {
    expect(
      itemCatalogState(states, { categoryId: null, isActive: true }),
    ).toEqual({ effectiveActive: true, kind: "material" });
    expect(
      itemCatalogState(states, {
        categoryId: "materials",
        isActive: true,
      }),
    ).toEqual({ effectiveActive: true, kind: "material" });
  });
});
