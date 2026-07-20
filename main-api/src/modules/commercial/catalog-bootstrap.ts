import type { DatabaseClient } from "../../lib/utils/handler.dto";

export const FUEL_CATEGORY_SYSTEM_KEY = "fuel";
export const LITER_MEASUREMENT_UNIT_ID = "00000000-0000-4000-8000-00000000a001";

export const DEFAULT_FUEL_ITEMS = [
  "Diesel S10",
  "Diesel S500",
  "Gasolina comum",
  "Etanol",
  "ARLA 32",
] as const;

export async function ensureCompanyCatalogBootstrap(
  prisma: DatabaseClient,
  scope: { corporationId: string; companyId: string },
) {
  const existingSystemCategory = await prisma.suppliedItemCategory.findFirst({
    where: {
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      systemKey: FUEL_CATEGORY_SYSTEM_KEY,
    },
    select: { id: true },
  });
  if (existingSystemCategory) return existingSystemCategory;

  const namedRoot = await prisma.suppliedItemCategory.findFirst({
    where: {
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      parentId: null,
      name: { equals: "Combustíveis", mode: "insensitive" },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const category = namedRoot
    ? await prisma.suppliedItemCategory.update({
        where: { id: namedRoot.id },
        data: {
          name: "Combustíveis",
          parentId: null,
          systemKey: FUEL_CATEGORY_SYSTEM_KEY,
          isActive: true,
        },
        select: { id: true },
      })
    : await prisma.suppliedItemCategory.create({
        data: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          name: "Combustíveis",
          systemKey: FUEL_CATEGORY_SYSTEM_KEY,
        },
        select: { id: true },
      });

  for (const name of DEFAULT_FUEL_ITEMS) {
    const existing = await prisma.suppliedItem.findFirst({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isGlobal: true,
        name: { equals: name, mode: "insensitive" },
      },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (existing) {
      await prisma.suppliedItem.update({
        where: { id: existing.id },
        data: { categoryId: category.id },
      });
      continue;
    }
    await prisma.suppliedItem.create({
      data: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        categoryId: category.id,
        name,
        baseUnitId: LITER_MEASUREMENT_UNIT_ID,
        isGlobal: true,
      },
    });
  }

  return category;
}
