import { FUEL_CATEGORY_SYSTEM_KEY } from "./catalog-bootstrap";

export type CatalogKind = "fuel" | "material";

export type CatalogCategoryNode = {
  id: string;
  parentId: string | null;
  systemKey: string | null;
  isActive: boolean;
};

export type CatalogCategoryState = {
  effectiveActive: boolean;
  kind: CatalogKind;
};

export function buildCatalogCategoryStates(categories: CatalogCategoryNode[]) {
  const byId = new Map(categories.map((category) => [category.id, category]));
  const states = new Map<string, CatalogCategoryState>();

  const resolve = (categoryId: string): CatalogCategoryState => {
    const cached = states.get(categoryId);
    if (cached) return cached;
    const seen = new Set<string>();
    let current = byId.get(categoryId);
    let effectiveActive = true;
    let kind: CatalogKind = "material";
    while (current) {
      if (seen.has(current.id)) {
        effectiveActive = false;
        break;
      }
      seen.add(current.id);
      effectiveActive = effectiveActive && current.isActive;
      if (current.systemKey === FUEL_CATEGORY_SYSTEM_KEY) kind = "fuel";
      current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    const state = { effectiveActive, kind };
    states.set(categoryId, state);
    return state;
  };

  for (const category of categories) resolve(category.id);
  return states;
}

export function itemCatalogState(
  states: Map<string, CatalogCategoryState>,
  item: { categoryId: string | null; isActive: boolean },
) {
  const categoryState = item.categoryId
    ? states.get(item.categoryId)
    : undefined;
  return {
    kind: categoryState?.kind ?? ("material" as const),
    effectiveActive: item.isActive && (categoryState?.effectiveActive ?? true),
  };
}
