import { AppError } from "../../lib/utils/appError";
import {
  buildCursorPage,
  parseBoundCursor,
  type CursorBoundary,
} from "../../lib/utils/cursor-pagination";
import type { HandlerContext } from "../../lib/utils/handler.dto";
import {
  protectSensitiveDocument,
  toMaskedDocumentDto,
  toProtectedDocumentDto,
} from "../../lib/security/sensitive-document";
import type {
  AddSupplierToSuppliedItemInput,
  CreateMeasurementUnitInput,
  CreateCommercialRegistryInput,
  CreateSuppliedItemCategoryInput,
  CreateSupplierOfferInput,
  CreateSuppliedItemInput,
  CreateSupplierInput,
  ListCommercialRegistryQuery,
  ListSuppliedItemSelectorsQuery,
  ListSuppliedItemOffersQuery,
  SelectorQuery,
  UpdateSuppliedItemCategoryInput,
  UpdateSuppliedItemInput,
  UpdateSupplierOfferInput,
  UpdateSupplierInput,
} from "./commercial.dto";
import {
  createCommercialRegistryHandler,
  findCommercialRegistryForRemovalHandler,
  findCommercialRegistryDetailHandler,
  findCommercialRemovalBlockersHandler,
  listActiveFuelSupplierSelectorHandler,
  listCommercialRegistryHandler,
  removeCommercialRegistryHandler,
  updateCommercialRegistryHandler,
  commercialRegistryStore,
  type CommercialRegistryCreateData,
  type CommercialRegistryRecord,
  type CommercialRegistryUpdateData,
} from "./handlers/commercial-registry.handler";

type RegistryKind = "client" | "fuelSupplier";
type PublicRegistryKind = "clients" | "fuel-suppliers" | "suppliers";

interface AuthenticatedCompanyScope {
  corporationId: string;
  companyId: string;
}

interface AuthenticatedCommercialActorScope extends AuthenticatedCompanyScope {
  actorUserId: string;
}

type ProtectedDocumentSource = Pick<
  CommercialRegistryRecord,
  "authTag" | "ciphertext" | "documentType" | "encryptionKeyVersion" | "iv"
>;

const maxItemCategoryDepth = 3;

function mapEntityType(
  entityType: CreateCommercialRegistryInput["entityType"],
): CommercialRegistryCreateData["entityType"] {
  return entityType === "individual" ? "INDIVIDUAL" : "LEGAL_ENTITY";
}

function publicEntityType(entityType: CommercialRegistryRecord["entityType"]) {
  return entityType === "INDIVIDUAL" ? "individual" : "legal_entity";
}

function assertDocumentMatchesEntity(
  entityType: CreateCommercialRegistryInput["entityType"],
  documentType: "CPF" | "CNPJ",
) {
  if (
    (entityType === "individual" && documentType !== "CPF") ||
    (entityType === "legal_entity" && documentType !== "CNPJ")
  ) {
    throw new AppError({
      code: "VALIDATION_ERROR",
      message: "Document type does not match entity type",
      statusCode: 400,
    });
  }
}

function protectedDocument(record: ProtectedDocumentSource) {
  return {
    authTag: record.authTag,
    ciphertext: record.ciphertext,
    documentType: record.documentType,
    encryptionKeyVersion: record.encryptionKeyVersion,
    iv: record.iv,
  };
}

function structuredAddressLine(input: CreateCommercialRegistryInput) {
  if (input.addressLine) return input.addressLine;
  const firstLine = [input.addressStreet, input.addressNumber]
    .filter(Boolean)
    .join(", ");
  return firstLine || undefined;
}

function hasOwnDefined<T extends object, K extends keyof T>(
  input: T,
  key: K,
): input is T & Required<Pick<T, K>> {
  return (
    Object.prototype.hasOwnProperty.call(input, key) && input[key] !== undefined
  );
}

function toListDto(record: CommercialRegistryRecord) {
  return {
    id: record.id,
    entityType: publicEntityType(record.entityType),
    name: record.displayName,
    fullName: record.fullName,
    legalName: record.legalName,
    tradeName: record.tradeName,
    phone: record.phone,
    email: record.email,
    addressLine: record.addressLine,
    addressStreet: record.addressStreet ?? null,
    addressNumber: record.addressNumber ?? null,
    addressComplement: record.addressComplement ?? null,
    addressNeighborhood: record.addressNeighborhood ?? null,
    city: record.city,
    state: record.state,
    postalCode: record.postalCode,
    document: toMaskedDocumentDto(protectedDocument(record)),
    isActive: record.isActive,
    removedAt: record.removedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function toDetailDto(record: CommercialRegistryRecord) {
  return {
    ...toListDto(record),
    document: toProtectedDocumentDto(protectedDocument(record)),
  };
}

async function categoryDepth(
  context: HandlerContext,
  scope: AuthenticatedCompanyScope,
  categoryId: string | null | undefined,
) {
  if (!categoryId) return -1;
  const store = commercialRegistryStore(context);
  let depth = 0;
  let currentId: string | null = categoryId;
  const seen = new Set<string>();

  while (currentId) {
    if (seen.has(currentId)) {
      throw new AppError({
        code: "SUPPLIED_ITEM_CATEGORY_INVALID_TREE",
        message: "Supplied item category tree is invalid",
        statusCode: 409,
      });
    }
    seen.add(currentId);
    const category: { id: string; parentId: string | null } | null =
      await store.suppliedItemCategory.findFirst({
        where: {
          id: currentId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
        },
        select: { id: true, parentId: true },
      });
    if (!category) {
      throw new AppError({
        code: "SUPPLIED_ITEM_CATEGORY_NOT_FOUND",
        message: "Supplied item category not found",
        statusCode: 404,
      });
    }
    currentId = category.parentId;
    if (currentId) depth += 1;
  }

  return depth;
}

type ItemCategorySummary = {
  id: string;
  name: string;
  parentId: string | null;
};

function categoryDescendantIds(
  categories: ItemCategorySummary[],
  categoryId: string,
) {
  const ids = new Set<string>([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (
        category.parentId &&
        ids.has(category.parentId) &&
        !ids.has(category.id)
      ) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return ids;
}

function categoryPath(
  categoryById: Map<string, ItemCategorySummary>,
  categoryId: string | null,
) {
  const path: string[] = [];
  const seen = new Set<string>();
  let currentId = categoryId;
  while (currentId) {
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const category = categoryById.get(currentId);
    if (!category) break;
    path.unshift(category.name);
    currentId = category.parentId;
  }
  return path;
}

async function supplierOffersDto(
  context: HandlerContext,
  scope: AuthenticatedCompanyScope,
  supplierId: string,
) {
  const store = commercialRegistryStore(context);
  const offers = await store.supplierOffer.findMany({
    where: {
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      supplierId,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      conversionToBase: true,
      itemId: true,
      purchaseUnitId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const [items, units, prices] = await Promise.all([
    store.suppliedItem.findMany({
      where: { id: { in: offers.map((offer) => offer.itemId) } },
      select: { id: true, name: true, baseUnitId: true },
    }),
    store.measurementUnit.findMany({
      where: {
        id: { in: offers.map((offer) => offer.purchaseUnitId) },
      },
      select: { id: true, code: true, name: true },
    }),
    store.supplierOfferPrice.findMany({
      where: {
        offerId: { in: offers.map((offer) => offer.id) },
        effectiveTo: null,
      },
      orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
      select: {
        id: true,
        offerId: true,
        price: true,
        effectiveFrom: true,
        effectiveTo: true,
      },
    }),
  ]);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const baseUnitIds = items.map((item) => item.baseUnitId);
  const baseUnits = await store.measurementUnit.findMany({
    where: { id: { in: baseUnitIds } },
    select: { id: true, code: true, name: true },
  });
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  for (const unit of baseUnits) unitById.set(unit.id, unit);
  const pricesByOfferId = new Map<string, typeof prices>();
  for (const price of prices) {
    const current = pricesByOfferId.get(price.offerId) ?? [];
    current.push(price);
    pricesByOfferId.set(price.offerId, current);
  }
  return offers.map((offer) => {
    const item = itemById.get(offer.itemId);
    const purchaseUnit = unitById.get(offer.purchaseUnitId);
    const baseUnit = item ? unitById.get(item.baseUnitId) : undefined;
    const priceHistory = pricesByOfferId.get(offer.id) ?? [];
    const currentPrice = priceHistory.find((price) => !price.effectiveTo);
    return {
      id: offer.id,
      item: item
        ? { id: item.id, name: item.name, baseUnitId: item.baseUnitId }
        : null,
      baseUnit: baseUnit
        ? { id: baseUnit.id, code: baseUnit.code, name: baseUnit.name }
        : null,
      purchaseUnit: purchaseUnit
        ? {
            id: purchaseUnit.id,
            code: purchaseUnit.code,
            name: purchaseUnit.name,
          }
        : null,
      conversionToBase: offer.conversionToBase.toFixed(6),
      currentPrice: currentPrice
        ? {
            id: currentPrice.id,
            price: currentPrice.price.toFixed(4),
            effectiveFrom: currentPrice.effectiveFrom.toISOString(),
          }
        : null,
      priceHistory: priceHistory.map((price) => ({
        id: price.id,
        price: price.price.toFixed(4),
        effectiveFrom: price.effectiveFrom.toISOString(),
        effectiveTo: price.effectiveTo?.toISOString() ?? null,
      })),
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt.toISOString(),
    };
  });
}

async function suppliedItemOffersDto(
  context: HandlerContext,
  scope: AuthenticatedCompanyScope,
  itemId: string,
  query: ListSuppliedItemOffersQuery,
) {
  const store = commercialRegistryStore(context);
  const item = await store.suppliedItem.findFirst({
    where: {
      id: itemId,
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      isGlobal: true,
      isActive: true,
    },
    select: { id: true, baseUnitId: true },
  });
  if (!item) {
    throw new AppError({
      code: "SUPPLIED_ITEM_NOT_FOUND",
      message: "Supplied item not found",
      statusCode: 404,
    });
  }

  const normalizedQuery = suppliedItemOffersQueryForCursor(
    itemId,
    query.supplierId,
  );
  const boundary = parseBoundCursor({
    cursor: query.cursor,
    query: normalizedQuery,
    resource: "supplied-item-offers",
    scope: scopeForCursor(scope),
    sortBy: "updatedAt",
    sortDirection: "desc",
  });
  const offers = await store.supplierOffer.findMany({
    where: {
      corporationId: scope.corporationId,
      companyId: scope.companyId,
      itemId,
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      isActive: true,
      ...suppliedItemOffersBoundaryWhere(boundary),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    take: query.limit + 1,
    select: {
      id: true,
      conversionToBase: true,
      supplierId: true,
      purchaseUnitId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const page = buildCursorPage({
    items: offers,
    limit: query.limit,
    query: normalizedQuery,
    resource: "supplied-item-offers",
    scope: scopeForCursor(scope),
    sortBy: "updatedAt",
    sortDirection: "desc",
    getLast: (offer) => ({
      id: offer.id,
      value: offer.updatedAt.toISOString(),
    }),
  });
  const pageOffers = page.data;
  const [suppliers, units, prices] = await Promise.all([
    store.fuelSupplier.findMany({
      where: {
        id: { in: pageOffers.map((offer) => offer.supplierId) },
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
        removedAt: null,
        isGlobal: true,
      },
      select: {
        id: true,
        displayName: true,
        tradeName: true,
        entityType: true,
        documentType: true,
        ciphertext: true,
        iv: true,
        authTag: true,
        encryptionKeyVersion: true,
      },
    }),
    store.measurementUnit.findMany({
      where: {
        id: {
          in: [
            item.baseUnitId,
            ...pageOffers.map((offer) => offer.purchaseUnitId),
          ],
        },
      },
      select: { id: true, code: true, name: true },
    }),
    store.supplierOfferPrice.findMany({
      where: {
        offerId: { in: pageOffers.map((offer) => offer.id) },
        effectiveTo: null,
      },
      orderBy: [{ effectiveFrom: "desc" }, { id: "desc" }],
      select: {
        id: true,
        offerId: true,
        price: true,
        effectiveFrom: true,
        effectiveTo: true,
      },
    }),
  ]);
  const supplierById = new Map(
    suppliers.map((supplier) => [supplier.id, supplier]),
  );
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const pricesByOfferId = new Map<string, typeof prices>();
  for (const price of prices) {
    const current = pricesByOfferId.get(price.offerId) ?? [];
    current.push(price);
    pricesByOfferId.set(price.offerId, current);
  }

  const data = pageOffers
    .map((offer) => {
      const supplier = supplierById.get(offer.supplierId);
      if (!supplier) return null;
      const baseUnit = unitById.get(item.baseUnitId);
      const purchaseUnit = unitById.get(offer.purchaseUnitId);
      const priceHistory = pricesByOfferId.get(offer.id) ?? [];
      const currentPrice = priceHistory.find((price) => !price.effectiveTo);
      return {
        id: offer.id,
        supplier: {
          id: supplier.id,
          name: supplier.displayName,
          tradeName: supplier.tradeName,
          document: toMaskedDocumentDto(protectedDocument(supplier)),
        },
        baseUnit: baseUnit
          ? {
              id: baseUnit.id,
              code: baseUnit.code,
              name: baseUnit.name,
            }
          : null,
        purchaseUnit: purchaseUnit
          ? {
              id: purchaseUnit.id,
              code: purchaseUnit.code,
              name: purchaseUnit.name,
            }
          : null,
        conversionToBase: offer.conversionToBase.toFixed(6),
        currentPrice: currentPrice
          ? {
              id: currentPrice.id,
              price: currentPrice.price.toFixed(4),
              effectiveFrom: currentPrice.effectiveFrom.toISOString(),
            }
          : null,
        priceHistory: priceHistory.map((price) => ({
          id: price.id,
          price: price.price.toFixed(4),
          effectiveFrom: price.effectiveFrom.toISOString(),
          effectiveTo: price.effectiveTo?.toISOString() ?? null,
        })),
        createdAt: offer.createdAt.toISOString(),
        updatedAt: offer.updatedAt.toISOString(),
      };
    })
    .filter((offer): offer is NonNullable<typeof offer> => Boolean(offer));
  return { data, pageInfo: page.pageInfo };
}

function normalizedQueryForCursor(query: ListCommercialRegistryQuery) {
  return {
    entityType: query.entityType ?? null,
    search: query.search?.toLocaleLowerCase("pt-BR") ?? null,
    sortBy: query.sortBy,
    sortDirection: query.sortDirection,
  };
}

function scopeForCursor(scope: AuthenticatedCompanyScope) {
  return {
    corporationId: scope.corporationId,
    companyId: scope.companyId,
  };
}

function suppliedItemSelectorsQueryForCursor(
  query: ListSuppliedItemSelectorsQuery,
) {
  return {
    categoryId: query.categoryId ?? null,
    includeDescendants: query.includeDescendants,
    onlyWithActiveOffers: query.onlyWithActiveOffers,
    search: query.search?.toLocaleLowerCase("pt-BR") ?? null,
  };
}

function suppliedItemOffersQueryForCursor(itemId: string, supplierId?: string) {
  return { itemId, supplierId: supplierId ?? null };
}

type SuppliedItemSelectorBoundaryWhere = {
  OR: Array<{ name: { gt: string } } | { name: string; id: { gt: string } }>;
};

function suppliedItemSelectorBoundaryWhere(
  boundary: CursorBoundary | null,
): SuppliedItemSelectorBoundaryWhere | undefined {
  if (!boundary) return undefined;
  const name = String(boundary.value);
  return {
    OR: [{ name: { gt: name } }, { name, id: { gt: boundary.id } }],
  };
}

type SuppliedItemOfferBoundaryWhere = {
  OR: Array<
    { updatedAt: { lt: Date } } | { updatedAt: Date; id: { gt: string } }
  >;
};

function suppliedItemOffersBoundaryWhere(
  boundary: CursorBoundary | null,
): SuppliedItemOfferBoundaryWhere | undefined {
  if (!boundary) return undefined;
  const updatedAt = new Date(String(boundary.value));
  return {
    OR: [
      { updatedAt: { lt: updatedAt } },
      { updatedAt, id: { gt: boundary.id } },
    ],
  };
}

function registryType(kind: PublicRegistryKind) {
  return kind === "clients" ? "CLIENT" : "FUEL_SUPPLIER";
}

function modelKind(kind: PublicRegistryKind): RegistryKind {
  return kind === "clients" ? "client" : "fuelSupplier";
}

export class CommercialService {
  constructor(private readonly context: HandlerContext) {}

  private async createRegistryRecord(
    context: HandlerContext,
    kind: PublicRegistryKind,
    scope: AuthenticatedCompanyScope,
    input: CreateCommercialRegistryInput,
  ) {
    const protectedDocumentResult = protectSensitiveDocument({
      document: input.document,
      registryType: registryType(kind),
    });
    assertDocumentMatchesEntity(
      input.entityType,
      protectedDocumentResult.documentType,
    );
    const displayName =
      input.entityType === "individual" ? input.fullName : input.legalName;
    if (!displayName) {
      throw new AppError({
        code: "VALIDATION_ERROR",
        message: "Name is required",
        statusCode: 400,
      });
    }

    const baseData: CommercialRegistryCreateData = {
      ...scope,
      ...protectedDocumentResult,
      displayName,
      entityType: mapEntityType(input.entityType),
      fullName: input.fullName,
      legalName: input.legalName,
      tradeName: input.tradeName,
      phone: input.phone,
      email: input.email,
      addressLine: structuredAddressLine(input),
      city: input.city,
      state: input.state,
      postalCode: input.postalCode,
    };
    const created = await createCommercialRegistryHandler(
      context,
      modelKind(kind),
      kind === "clients"
        ? baseData
        : {
            ...baseData,
            addressStreet: input.addressStreet,
            addressNumber: input.addressNumber,
            addressComplement: input.addressComplement,
            addressNeighborhood: input.addressNeighborhood,
          },
    );
    return toDetailDto(created);
  }

  async create(
    kind: PublicRegistryKind,
    scope: AuthenticatedCompanyScope,
    input: CreateCommercialRegistryInput,
  ) {
    return this.context.transaction((transactionContext) =>
      this.createRegistryRecord(transactionContext, kind, scope, input),
    );
  }

  async createSupplier(
    scope: AuthenticatedCompanyScope,
    input: CreateSupplierInput,
  ) {
    return this.context.transaction(async (transactionContext) => {
      const supplier = await this.createRegistryRecord(
        transactionContext,
        "suppliers",
        scope,
        input,
      );
      return {
        ...supplier,
        offers: [],
      };
    });
  }

  async updateSupplier(
    scope: AuthenticatedCompanyScope,
    supplierId: string,
    input: UpdateSupplierInput,
  ) {
    return this.context.transaction(async (transactionContext) => {
      const current = await findCommercialRegistryDetailHandler(
        transactionContext,
        "fuelSupplier",
        { ...scope, id: supplierId },
      );

      const data: CommercialRegistryUpdateData = {};
      const assign = <K extends keyof CommercialRegistryUpdateData>(
        key: K,
        value: CommercialRegistryUpdateData[K] | undefined,
      ) => {
        if (value !== undefined) data[key] = value;
      };

      assign("fullName", input.fullName);
      assign("legalName", input.legalName);
      assign("tradeName", input.tradeName);
      assign("phone", input.phone);
      assign("email", input.email);
      assign("addressStreet", input.addressStreet);
      assign("addressNumber", input.addressNumber);
      assign("addressComplement", input.addressComplement);
      assign("addressNeighborhood", input.addressNeighborhood);
      assign("city", input.city);
      assign("state", input.state);
      assign("postalCode", input.postalCode);

      if (current.entityType === "INDIVIDUAL" && input.fullName !== undefined) {
        if (!input.fullName) {
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "Full name is required for individual records",
            statusCode: 400,
          });
        }
        data.displayName = input.fullName;
      }
      if (
        current.entityType === "LEGAL_ENTITY" &&
        input.legalName !== undefined
      ) {
        if (!input.legalName) {
          throw new AppError({
            code: "VALIDATION_ERROR",
            message: "Legal name is required for legal entity records",
            statusCode: 400,
          });
        }
        data.displayName = input.legalName;
      }

      const addressBase = {
        addressStreet: hasOwnDefined(input, "addressStreet")
          ? input.addressStreet
          : current.addressStreet,
        addressNumber: hasOwnDefined(input, "addressNumber")
          ? input.addressNumber
          : current.addressNumber,
      };
      if (
        input.addressLine !== undefined ||
        input.addressStreet !== undefined ||
        input.addressNumber !== undefined
      ) {
        data.addressLine =
          input.addressLine !== undefined
            ? input.addressLine
            : [addressBase.addressStreet, addressBase.addressNumber]
                .filter(Boolean)
                .join(", ") || null;
      }

      if (Object.keys(data).length === 0) {
        return {
          ...toDetailDto(current),
          offers: await supplierOffersDto(
            transactionContext,
            scope,
            supplierId,
          ),
        };
      }

      const updated = await updateCommercialRegistryHandler(
        transactionContext,
        "fuelSupplier",
        { ...scope, id: supplierId, data },
      );
      return {
        ...toDetailDto(updated),
        offers: await supplierOffersDto(transactionContext, scope, supplierId),
      };
    });
  }

  private async resolveOfferItem(
    context: HandlerContext,
    scope: AuthenticatedCompanyScope,
    input: Pick<CreateSupplierOfferInput, "itemId" | "itemName" | "baseUnitId">,
  ) {
    const store = commercialRegistryStore(context);
    if (input.itemId) {
      const item = await store.suppliedItem.findFirst({
        where: {
          id: input.itemId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isGlobal: true,
          isActive: true,
        },
        select: { id: true },
      });
      if (!item) {
        throw new AppError({
          code: "SUPPLIED_ITEM_NOT_FOUND",
          message: "Supplied item not found",
          statusCode: 404,
        });
      }
      return item.id;
    }
    return (
      await store.suppliedItem.create({
        data: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          name: input.itemName!,
          baseUnitId: input.baseUnitId,
          isGlobal: true,
        },
        select: { id: true },
      })
    ).id;
  }

  private async assertOfferReferences(
    context: HandlerContext,
    scope: AuthenticatedCompanyScope,
    supplierId: string,
    input: { baseUnitId?: string; purchaseUnitId?: string },
  ) {
    const store = commercialRegistryStore(context);
    const unitIds = [input.baseUnitId, input.purchaseUnitId].filter(
      (id): id is string => Boolean(id),
    );
    const [supplier, units] = await Promise.all([
      store.fuelSupplier.findFirst({
        where: {
          id: supplierId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isGlobal: true,
          isActive: true,
        },
        select: { id: true },
      }),
      store.measurementUnit.findMany({
        where: {
          id: { in: unitIds },
          isActive: true,
          OR: [
            { corporationId: null, companyId: null },
            { corporationId: scope.corporationId, companyId: scope.companyId },
          ],
        },
        select: { id: true },
      }),
    ]);
    if (!supplier) {
      throw new AppError({
        code: "SUPPLIER_NOT_FOUND",
        message: "Supplier not found",
        statusCode: 404,
      });
    }
    if (units.length !== new Set(unitIds).size) {
      throw new AppError({
        code: "MEASUREMENT_UNIT_NOT_FOUND",
        message: "Measurement unit not found",
        statusCode: 404,
      });
    }
  }

  async createSupplierOffer(
    scope: AuthenticatedCompanyScope,
    supplierId: string,
    input: CreateSupplierOfferInput,
  ) {
    return this.context.transaction(async (transactionContext) => {
      const store = commercialRegistryStore(transactionContext);
      await this.assertOfferReferences(
        transactionContext,
        scope,
        supplierId,
        input,
      );
      const itemId = await this.resolveOfferItem(
        transactionContext,
        scope,
        input,
      );
      const created = await store.supplierOffer.create({
        data: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          supplierId,
          itemId,
          purchaseUnitId: input.purchaseUnitId,
          conversionToBase: input.conversionToBase,
        },
        select: { id: true },
      });
      if (input.price) {
        await store.supplierOfferPrice.create({
          data: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            offerId: created.id,
            price: input.price,
            effectiveFrom: new Date(),
          },
        });
      }
      const dto = (
        await supplierOffersDto(transactionContext, scope, supplierId)
      ).find((offer) => offer.id === created.id);
      if (!dto)
        throw new AppError({
          code: "SUPPLIER_OFFER_NOT_FOUND",
          message: "Supplier offer not found",
          statusCode: 404,
        });
      return dto;
    });
  }

  async updateSupplierOffer(
    scope: AuthenticatedCompanyScope,
    supplierId: string,
    offerId: string,
    input: UpdateSupplierOfferInput,
  ) {
    const now = new Date();
    return this.context.transaction(async (transactionContext) => {
      const store = commercialRegistryStore(transactionContext);
      const existing = await store.supplierOffer.findFirst({
        where: {
          id: offerId,
          supplierId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
        },
        select: {
          id: true,
          itemId: true,
          purchaseUnitId: true,
          conversionToBase: true,
        },
      });
      if (!existing) {
        throw new AppError({
          code: "SUPPLIER_OFFER_NOT_FOUND",
          message: "Supplier offer not found",
          statusCode: 404,
        });
      }

      const baseUnitId = input.baseUnitId;
      if (baseUnitId || input.purchaseUnitId) {
        await this.assertOfferReferences(
          transactionContext,
          scope,
          supplierId,
          {
            baseUnitId,
            purchaseUnitId: input.purchaseUnitId ?? existing.purchaseUnitId,
          },
        );
      }

      const itemId =
        input.itemId || input.itemName
          ? await this.resolveOfferItem(transactionContext, scope, {
              itemId: input.itemId,
              itemName: input.itemName,
              baseUnitId: input.baseUnitId!,
            })
          : undefined;
      await store.supplierOffer.update({
        where: { id: offerId },
        data: {
          itemId,
          purchaseUnitId: input.purchaseUnitId,
          conversionToBase: input.conversionToBase,
        },
        select: { id: true },
      });

      if (input.price) {
        await store.supplierOfferPrice.updateMany({
          where: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            offerId,
            effectiveTo: null,
          },
          data: { effectiveTo: now },
        });
        await store.supplierOfferPrice.create({
          data: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            offerId,
            price: input.price,
            effectiveFrom: now,
          },
        });
      }
      const dto = (
        await supplierOffersDto(transactionContext, scope, supplierId)
      ).find((offer) => offer.id === offerId);
      if (!dto)
        throw new AppError({
          code: "SUPPLIER_OFFER_NOT_FOUND",
          message: "Supplier offer not found",
          statusCode: 404,
        });
      return dto;
    });
  }

  async removeSupplierOffer(
    scope: AuthenticatedCompanyScope,
    supplierId: string,
    offerId: string,
  ) {
    return this.context.transaction(async (transactionContext) => {
      const store = commercialRegistryStore(transactionContext);
      const updated = await store.supplierOffer.updateMany({
        where: {
          id: offerId,
          supplierId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
        },
        data: { isActive: false },
      });
      if (updated.count === 0) {
        throw new AppError({
          code: "SUPPLIER_OFFER_NOT_FOUND",
          message: "Supplier offer not found",
          statusCode: 404,
        });
      }
      return { id: offerId, isActive: false };
    });
  }

  async list(
    kind: PublicRegistryKind,
    scope: AuthenticatedCompanyScope,
    query: ListCommercialRegistryQuery,
  ) {
    const normalizedQuery = normalizedQueryForCursor(query);
    const boundary = parseBoundCursor({
      cursor: query.cursor,
      query: normalizedQuery,
      resource: kind,
      scope: scopeForCursor(scope),
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
    });
    const records = await listCommercialRegistryHandler(
      this.context,
      modelKind(kind),
      {
        ...scope,
        entityType: query.entityType
          ? mapEntityType(query.entityType)
          : undefined,
        search: query.search,
        limit: query.limit,
        boundary,
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
      },
    );
    const page = buildCursorPage({
      items: records,
      limit: query.limit,
      query: normalizedQuery,
      resource: kind,
      scope: scopeForCursor(scope),
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
      getLast: (item) => ({
        id: item.id,
        value:
          query.sortBy === "createdAt"
            ? item.createdAt.toISOString()
            : item.displayName,
      }),
    });
    return {
      data: page.data.map(toListDto),
      pageInfo: page.pageInfo,
    };
  }

  async detail(
    kind: PublicRegistryKind,
    scope: AuthenticatedCompanyScope,
    id: string,
  ) {
    const record = await findCommercialRegistryDetailHandler(
      this.context,
      modelKind(kind),
      { ...scope, id },
    );
    const detail = toDetailDto(record);
    if (kind === "suppliers" || kind === "fuel-suppliers") {
      return {
        ...detail,
        offers: await supplierOffersDto(this.context, scope, id),
      };
    }
    return detail;
  }

  async remove(
    kind: PublicRegistryKind,
    scope: AuthenticatedCommercialActorScope,
    id: string,
  ) {
    return this.context.transaction(async (transactionContext) => {
      await findCommercialRegistryForRemovalHandler(
        transactionContext,
        modelKind(kind),
        { corporationId: scope.corporationId, companyId: scope.companyId, id },
      );
      const blockers = await findCommercialRemovalBlockersHandler(
        transactionContext,
        modelKind(kind),
        { corporationId: scope.corporationId, companyId: scope.companyId, id },
      );
      if (blockers && blockers.projectIds.length > 0) {
        throw new AppError({
          code:
            kind === "clients"
              ? "CLIENT_REMOVAL_BLOCKED_BY_PROJECTS"
              : "FUEL_SUPPLIER_REMOVAL_BLOCKED_BY_AGREEMENTS",
          message:
            kind === "clients"
              ? "Client is used by current Projects"
              : "Fuel Supplier is used by current Fuel Agreements",
          statusCode: 409,
          data: blockers,
        });
      }

      const removedAt = new Date();
      const removed = await removeCommercialRegistryHandler(
        transactionContext,
        modelKind(kind),
        {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          id,
          actorUserId: scope.actorUserId,
          removedAt,
        },
      );
      return {
        id: removed.id,
        isActive: removed.isActive,
        removedAt: removed.removedAt?.toISOString() ?? removedAt.toISOString(),
      };
    });
  }

  async listFuelSupplierSelector(
    scope: AuthenticatedCompanyScope,
    query: SelectorQuery,
  ) {
    const records = await listActiveFuelSupplierSelectorHandler(this.context, {
      ...scope,
      search: query.search,
      limit: query.limit,
    });
    return records.map((record) => ({
      id: record.id,
      name: record.displayName,
      tradeName: record.tradeName,
      document: toMaskedDocumentDto(protectedDocument(record)),
    }));
  }

  async listMeasurementUnits(scope: AuthenticatedCompanyScope) {
    const store = commercialRegistryStore(this.context);
    return store.measurementUnit.findMany({
      where: {
        isActive: true,
        OR: [
          { corporationId: null, companyId: null },
          { corporationId: scope.corporationId, companyId: scope.companyId },
        ],
      },
      orderBy: [{ code: "asc" }, { id: "asc" }],
      select: { id: true, code: true, name: true },
    });
  }

  async createMeasurementUnit(
    scope: AuthenticatedCompanyScope,
    input: CreateMeasurementUnitInput,
  ) {
    const store = commercialRegistryStore(this.context);
    return store.measurementUnit.create({
      data: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        code: input.code.toUpperCase(),
        name: input.name,
      },
      select: { id: true, code: true, name: true },
    });
  }

  async listSuppliedItemSelectors(
    scope: AuthenticatedCompanyScope,
    query: ListSuppliedItemSelectorsQuery,
  ) {
    const store = commercialRegistryStore(this.context);
    const categories = await store.suppliedItemCategory.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, parentId: true },
    });

    let categoryIds: Set<string> | null = null;
    if (query.categoryId) {
      await categoryDepth(this.context, scope, query.categoryId);
      categoryIds = query.includeDescendants
        ? categoryDescendantIds(categories, query.categoryId)
        : new Set([query.categoryId]);
    }

    const activeSuppliers = await store.fuelSupplier.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
        removedAt: null,
        isGlobal: true,
      },
      select: { id: true },
    });
    const activeSupplierIds = activeSuppliers.map((supplier) => supplier.id);

    let itemIdsWithActiveOffers: Set<string> | null = null;
    if (query.onlyWithActiveOffers) {
      if (activeSupplierIds.length === 0) {
        return { data: [], pageInfo: { hasNextPage: false, nextCursor: null } };
      }
      const activeOffers = await store.supplierOffer.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          supplierId: { in: activeSupplierIds },
          isActive: true,
        },
        select: { itemId: true },
      });
      itemIdsWithActiveOffers = new Set(
        activeOffers.map((offer) => offer.itemId),
      );
      if (itemIdsWithActiveOffers.size === 0) {
        return { data: [], pageInfo: { hasNextPage: false, nextCursor: null } };
      }
    }

    const normalizedQuery = suppliedItemSelectorsQueryForCursor(query);
    const boundary = parseBoundCursor({
      cursor: query.cursor,
      query: normalizedQuery,
      resource: "supplied-item-selectors",
      scope: scopeForCursor(scope),
      sortBy: "name",
      sortDirection: "asc",
    });
    const items = await store.suppliedItem.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isGlobal: true,
        isActive: true,
        ...(query.search
          ? { name: { contains: query.search, mode: "insensitive" as const } }
          : {}),
        ...(categoryIds ? { categoryId: { in: [...categoryIds] } } : {}),
        ...(itemIdsWithActiveOffers
          ? { id: { in: [...itemIdsWithActiveOffers] } }
          : {}),
        ...suppliedItemSelectorBoundaryWhere(boundary),
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: query.limit + 1,
      select: { id: true, name: true, baseUnitId: true, categoryId: true },
    });
    const page = buildCursorPage({
      items,
      limit: query.limit,
      query: normalizedQuery,
      resource: "supplied-item-selectors",
      scope: scopeForCursor(scope),
      sortBy: "name",
      sortDirection: "asc",
      getLast: (item) => ({ id: item.id, value: item.name }),
    });
    const pageItems = page.data;
    const pageOffers =
      pageItems.length && activeSupplierIds.length
        ? await store.supplierOffer.findMany({
            where: {
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              itemId: { in: pageItems.map((item) => item.id) },
              supplierId: { in: activeSupplierIds },
              isActive: true,
            },
            select: { itemId: true, supplierId: true },
          })
        : [];
    const suppliersByItemId = new Map<string, Set<string>>();
    for (const offer of pageOffers) {
      const suppliers = suppliersByItemId.get(offer.itemId) ?? new Set();
      suppliers.add(offer.supplierId);
      suppliersByItemId.set(offer.itemId, suppliers);
    }
    const categoryById = new Map(
      categories.map((category) => [category.id, category]),
    );

    return {
      data: pageItems.map((item) => ({
        id: item.id,
        name: item.name,
        baseUnitId: item.baseUnitId,
        categoryId: item.categoryId,
        categoryPath: categoryPath(categoryById, item.categoryId),
        activeSupplierCount: suppliersByItemId.get(item.id)?.size ?? 0,
      })),
      pageInfo: page.pageInfo,
    };
  }

  async listSuppliedItems(scope: AuthenticatedCompanyScope) {
    const store = commercialRegistryStore(this.context);
    const items = await store.suppliedItem.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isGlobal: true,
        isActive: true,
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        baseUnitId: true,
        categoryId: true,
        valueUnitQuantity: true,
        basePrice: true,
      },
    });
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      baseUnitId: item.baseUnitId,
      categoryId: item.categoryId,
      valueUnitQuantity: item.valueUnitQuantity.toFixed(6),
      basePrice: item.basePrice.toFixed(4),
    }));
  }

  async listSuppliedItemCatalog(scope: AuthenticatedCompanyScope) {
    const store = commercialRegistryStore(this.context);
    const [categories, items] = await Promise.all([
      store.suppliedItemCategory.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          parentId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      store.suppliedItem.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isGlobal: true,
          isActive: true,
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          baseUnitId: true,
          categoryId: true,
          valueUnitQuantity: true,
          basePrice: true,
          updatedAt: true,
        },
      }),
    ]);
    const [units, offers] = await Promise.all([
      store.measurementUnit.findMany({
        where: { id: { in: items.map((item) => item.baseUnitId) } },
        select: { id: true, code: true, name: true },
      }),
      store.supplierOffer.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          itemId: { in: items.map((item) => item.id) },
          isActive: true,
        },
        select: { itemId: true, supplierId: true },
      }),
    ]);
    const unitById = new Map(units.map((unit) => [unit.id, unit]));
    const suppliersByItemId = new Map<string, Set<string>>();
    for (const offer of offers) {
      const suppliers = suppliersByItemId.get(offer.itemId) ?? new Set();
      suppliers.add(offer.supplierId);
      suppliersByItemId.set(offer.itemId, suppliers);
    }

    return {
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        parentId: category.parentId,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      })),
      items: items.map((item) => {
        const unit = unitById.get(item.baseUnitId);
        return {
          id: item.id,
          name: item.name,
          categoryId: item.categoryId,
          baseUnitId: item.baseUnitId,
          baseUnit: unit
            ? { id: unit.id, code: unit.code, name: unit.name }
            : null,
          valueUnitQuantity: item.valueUnitQuantity.toFixed(6),
          basePrice: item.basePrice.toFixed(4),
          activeSupplierCount: suppliersByItemId.get(item.id)?.size ?? 0,
          spentQuantity: null,
          lastSpentAt: null,
          updatedAt: item.updatedAt.toISOString(),
        };
      }),
    };
  }

  async listSuppliedItemOffers(
    scope: AuthenticatedCompanyScope,
    itemId: string,
    query: ListSuppliedItemOffersQuery,
  ) {
    return suppliedItemOffersDto(this.context, scope, itemId, query);
  }

  async listSuppliedItemOfferSuppliers(
    scope: AuthenticatedCompanyScope,
    itemId: string,
    query: SelectorQuery,
  ) {
    const store = commercialRegistryStore(this.context);
    const item = await store.suppliedItem.findFirst({
      where: {
        id: itemId,
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isGlobal: true,
        isActive: true,
      },
      select: { id: true },
    });
    if (!item) {
      throw new AppError({
        code: "SUPPLIED_ITEM_NOT_FOUND",
        message: "Supplied item not found",
        statusCode: 404,
      });
    }

    const offers = await store.supplierOffer.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        itemId,
        isActive: true,
      },
      select: { supplierId: true },
    });
    const supplierIds = [...new Set(offers.map((offer) => offer.supplierId))];
    if (supplierIds.length === 0) return [];

    const suppliers = await store.fuelSupplier.findMany({
      where: {
        id: { in: supplierIds },
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
        removedAt: null,
        isGlobal: true,
        ...(query.search
          ? {
              OR: [
                {
                  displayName: {
                    contains: query.search,
                    mode: "insensitive" as const,
                  },
                },
                {
                  tradeName: {
                    contains: query.search,
                    mode: "insensitive" as const,
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
      take: query.limit,
      select: {
        id: true,
        displayName: true,
        tradeName: true,
        documentType: true,
        ciphertext: true,
        iv: true,
        authTag: true,
        encryptionKeyVersion: true,
      },
    });

    return suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.displayName,
      tradeName: supplier.tradeName,
      document: toMaskedDocumentDto(protectedDocument(supplier)),
    }));
  }

  async listSuppliedItemOfferSupplierIds(
    scope: AuthenticatedCompanyScope,
    itemId: string,
  ) {
    const store = commercialRegistryStore(this.context);
    const item = await store.suppliedItem.findFirst({
      where: {
        id: itemId,
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isGlobal: true,
        isActive: true,
      },
      select: { id: true },
    });
    if (!item) {
      throw new AppError({
        code: "SUPPLIED_ITEM_NOT_FOUND",
        message: "Supplied item not found",
        statusCode: 404,
      });
    }
    const offers = await store.supplierOffer.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        itemId,
        isActive: true,
      },
      select: { supplierId: true },
    });
    return [...new Set(offers.map((offer) => offer.supplierId))];
  }

  private async assertSuppliedItemReferences(
    scope: AuthenticatedCompanyScope,
    input: { baseUnitId?: string; categoryId?: string | null },
  ) {
    const store = commercialRegistryStore(this.context);
    if (input.baseUnitId) {
      const unit = await store.measurementUnit.findFirst({
        where: {
          id: input.baseUnitId,
          isActive: true,
          OR: [
            { corporationId: null, companyId: null },
            { corporationId: scope.corporationId, companyId: scope.companyId },
          ],
        },
        select: { id: true },
      });
      if (!unit) {
        throw new AppError({
          code: "MEASUREMENT_UNIT_NOT_FOUND",
          message: "Measurement unit not found",
          statusCode: 404,
        });
      }
    }

    if (input.categoryId) {
      await categoryDepth(this.context, scope, input.categoryId);
    }
  }

  async createSuppliedItem(
    scope: AuthenticatedCompanyScope,
    input: CreateSuppliedItemInput,
  ) {
    await this.assertSuppliedItemReferences(scope, input);
    const store = commercialRegistryStore(this.context);
    const created = await store.suppliedItem.create({
      data: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        name: input.name,
        baseUnitId: input.baseUnitId,
        categoryId: input.categoryId ?? null,
        valueUnitQuantity: input.valueUnitQuantity ?? "1.000000",
        basePrice: input.basePrice ?? "0.0000",
        isGlobal: true,
      },
      select: {
        id: true,
        name: true,
        baseUnitId: true,
        categoryId: true,
        valueUnitQuantity: true,
        basePrice: true,
      },
    });
    return {
      id: created.id,
      name: created.name,
      baseUnitId: created.baseUnitId,
      categoryId: created.categoryId,
      valueUnitQuantity: created.valueUnitQuantity.toFixed(6),
      basePrice: created.basePrice.toFixed(4),
    };
  }

  async updateSuppliedItem(
    scope: AuthenticatedCompanyScope,
    itemId: string,
    input: UpdateSuppliedItemInput,
  ) {
    await this.assertSuppliedItemReferences(scope, input);
    const now = new Date();
    return this.context.transaction(async (transactionContext) => {
      const store = commercialRegistryStore(transactionContext);
      const updated = await store.suppliedItem.updateMany({
        where: {
          id: itemId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isGlobal: true,
          isActive: true,
        },
        data: {
          name: input.name,
          baseUnitId: input.baseUnitId,
          categoryId: input.categoryId,
          valueUnitQuantity: input.valueUnitQuantity,
          basePrice: input.basePrice,
        },
      });
      if (updated.count === 0) {
        throw new AppError({
          code: "SUPPLIED_ITEM_NOT_FOUND",
          message: "Supplied item not found",
          statusCode: 404,
        });
      }
      const item = await store.suppliedItem.findFirstOrThrow({
        where: {
          id: itemId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
        },
        select: {
          id: true,
          name: true,
          baseUnitId: true,
          categoryId: true,
          valueUnitQuantity: true,
          basePrice: true,
        },
      });

      if (input.propagateMirrorToExistingOffers) {
        const activeOffers = await store.supplierOffer.findMany({
          where: {
            corporationId: scope.corporationId,
            companyId: scope.companyId,
            itemId,
            isActive: true,
          },
          select: { id: true },
        });
        const activeOfferIds = activeOffers.map((offer) => offer.id);
        if (activeOfferIds.length > 0) {
          await store.supplierOffer.updateMany({
            where: {
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              id: { in: activeOfferIds },
            },
            data: { conversionToBase: item.valueUnitQuantity },
          });
          await store.supplierOfferPrice.updateMany({
            where: {
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              offerId: { in: activeOfferIds },
              effectiveTo: null,
            },
            data: { effectiveTo: now },
          });
          await store.supplierOfferPrice.createMany({
            data: activeOfferIds.map((offerId) => ({
              corporationId: scope.corporationId,
              companyId: scope.companyId,
              offerId,
              price: item.basePrice,
              effectiveFrom: now,
            })),
          });
        }
      }

      return {
        id: item.id,
        name: item.name,
        baseUnitId: item.baseUnitId,
        categoryId: item.categoryId,
        valueUnitQuantity: item.valueUnitQuantity.toFixed(6),
        basePrice: item.basePrice.toFixed(4),
      };
    });
  }

  async addSupplierToSuppliedItem(
    scope: AuthenticatedCompanyScope,
    itemId: string,
    input: AddSupplierToSuppliedItemInput,
  ) {
    const now = new Date();
    return this.context.transaction(async (transactionContext) => {
      const store = commercialRegistryStore(transactionContext);
      const item = await store.suppliedItem.findFirst({
        where: {
          id: itemId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isGlobal: true,
          isActive: true,
        },
        select: { id: true, baseUnitId: true },
      });
      if (!item) {
        throw new AppError({
          code: "SUPPLIED_ITEM_NOT_FOUND",
          message: "Supplied item not found",
          statusCode: 404,
        });
      }

      const supplier = await store.fuelSupplier.findFirst({
        where: {
          id: input.supplierId,
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isGlobal: true,
          isActive: true,
        },
        select: { id: true },
      });
      if (!supplier) {
        throw new AppError({
          code: "SUPPLIER_NOT_FOUND",
          message: "Supplier not found",
          statusCode: 404,
        });
      }

      const duplicate = await store.supplierOffer.findFirst({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          supplierId: input.supplierId,
          itemId,
          purchaseUnitId: item.baseUnitId,
          isActive: true,
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new AppError({
          code: "SUPPLIER_OFFER_ALREADY_EXISTS",
          message: "Supplier already has an active offer for this item",
          statusCode: 409,
        });
      }

      const created = await store.supplierOffer.create({
        data: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          supplierId: input.supplierId,
          itemId,
          purchaseUnitId: item.baseUnitId,
          conversionToBase: input.conversionToBase,
        },
        select: { id: true },
      });
      await store.supplierOfferPrice.create({
        data: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          offerId: created.id,
          price: input.price,
          effectiveFrom: now,
        },
      });

      const dto = (
        await supplierOffersDto(transactionContext, scope, input.supplierId)
      ).find((offer) => offer.id === created.id);
      if (!dto) {
        throw new AppError({
          code: "SUPPLIER_OFFER_NOT_FOUND",
          message: "Supplier offer not found",
          statusCode: 404,
        });
      }
      return dto;
    });
  }

  async removeSuppliedItem(scope: AuthenticatedCompanyScope, itemId: string) {
    const store = commercialRegistryStore(this.context);
    const updated = await store.suppliedItem.updateMany({
      where: {
        id: itemId,
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isGlobal: true,
        isActive: true,
      },
      data: { isActive: false },
    });
    if (updated.count === 0) {
      throw new AppError({
        code: "SUPPLIED_ITEM_NOT_FOUND",
        message: "Supplied item not found",
        statusCode: 404,
      });
    }
    return { id: itemId, isActive: false };
  }

  async createSuppliedItemCategory(
    scope: AuthenticatedCompanyScope,
    input: CreateSuppliedItemCategoryInput,
  ) {
    const parentDepth = await categoryDepth(
      this.context,
      scope,
      input.parentId,
    );
    if (parentDepth + 1 > maxItemCategoryDepth) {
      throw new AppError({
        code: "SUPPLIED_ITEM_CATEGORY_DEPTH_EXCEEDED",
        message: "Supplied item category depth exceeded",
        statusCode: 400,
      });
    }
    const store = commercialRegistryStore(this.context);
    return store.suppliedItemCategory.create({
      data: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        name: input.name,
        parentId: input.parentId ?? null,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateSuppliedItemCategory(
    scope: AuthenticatedCompanyScope,
    categoryId: string,
    input: UpdateSuppliedItemCategoryInput,
  ) {
    if (input.parentId === categoryId) {
      throw new AppError({
        code: "SUPPLIED_ITEM_CATEGORY_INVALID_TREE",
        message: "Supplied item category cannot be its own parent",
        statusCode: 400,
      });
    }
    if (input.parentId !== undefined) {
      const parentDepth = await categoryDepth(
        this.context,
        scope,
        input.parentId,
      );
      const store = commercialRegistryStore(this.context);
      const categories = await store.suppliedItemCategory.findMany({
        where: {
          corporationId: scope.corporationId,
          companyId: scope.companyId,
          isActive: true,
        },
        select: { id: true, parentId: true },
      });
      const descendants = new Set<string>();
      let changed = true;
      while (changed) {
        changed = false;
        for (const category of categories) {
          if (
            category.parentId &&
            (category.parentId === categoryId ||
              descendants.has(category.parentId)) &&
            !descendants.has(category.id)
          ) {
            descendants.add(category.id);
            changed = true;
          }
        }
      }
      if (input.parentId && descendants.has(input.parentId)) {
        throw new AppError({
          code: "SUPPLIED_ITEM_CATEGORY_INVALID_TREE",
          message: "Supplied item category cannot move under a descendant",
          statusCode: 400,
        });
      }
      const deepestDescendant = [...descendants].reduce((maxDepth, id) => {
        let depth = 1;
        let current = categories.find((category) => category.id === id);
        while (current?.parentId && current.parentId !== categoryId) {
          depth += 1;
          current = categories.find(
            (category) => category.id === current?.parentId,
          );
        }
        return Math.max(maxDepth, depth);
      }, 0);
      if (parentDepth + 1 + deepestDescendant > maxItemCategoryDepth) {
        throw new AppError({
          code: "SUPPLIED_ITEM_CATEGORY_DEPTH_EXCEEDED",
          message: "Supplied item category depth exceeded",
          statusCode: 400,
        });
      }
    }
    const store = commercialRegistryStore(this.context);
    const updated = await store.suppliedItemCategory.updateMany({
      where: {
        id: categoryId,
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
      },
      data: {
        name: input.name,
        parentId: input.parentId,
      },
    });
    if (updated.count === 0) {
      throw new AppError({
        code: "SUPPLIED_ITEM_CATEGORY_NOT_FOUND",
        message: "Supplied item category not found",
        statusCode: 404,
      });
    }
    return store.suppliedItemCategory.findFirstOrThrow({
      where: {
        id: categoryId,
        corporationId: scope.corporationId,
        companyId: scope.companyId,
      },
      select: {
        id: true,
        name: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async removeSuppliedItemCategory(
    scope: AuthenticatedCompanyScope,
    categoryId: string,
  ) {
    const store = commercialRegistryStore(this.context);
    const categories = await store.suppliedItemCategory.findMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
      },
      select: { id: true, parentId: true },
    });
    const descendants = new Set<string>([categoryId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const category of categories) {
        if (
          category.parentId &&
          descendants.has(category.parentId) &&
          !descendants.has(category.id)
        ) {
          descendants.add(category.id);
          changed = true;
        }
      }
    }
    const ids = [...descendants];
    const updated = await store.suppliedItemCategory.updateMany({
      where: {
        id: { in: ids },
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isActive: true,
      },
      data: { isActive: false },
    });
    if (updated.count === 0) {
      throw new AppError({
        code: "SUPPLIED_ITEM_CATEGORY_NOT_FOUND",
        message: "Supplied item category not found",
        statusCode: 404,
      });
    }
    await store.suppliedItem.updateMany({
      where: {
        corporationId: scope.corporationId,
        companyId: scope.companyId,
        isGlobal: true,
        isActive: true,
        categoryId: { in: ids },
      },
      data: { isActive: false },
    });
    return { id: categoryId, isActive: false };
  }
}
