import { AppError } from "../../lib/utils/appError";
import {
  buildCursorPage,
  parseBoundCursor,
} from "../../lib/utils/cursor-pagination";
import type { HandlerContext } from "../../lib/utils/handler.dto";
import {
  protectSensitiveDocument,
  toMaskedDocumentDto,
  toProtectedDocumentDto,
} from "../../lib/security/sensitive-document";
import type {
  CreateCommercialRegistryInput,
  ListCommercialRegistryQuery,
  SelectorQuery,
} from "./commercial.dto";
import {
  createCommercialRegistryHandler,
  findCommercialRegistryForRemovalHandler,
  findCommercialRegistryDetailHandler,
  findCommercialRemovalBlockersHandler,
  listActiveFuelSupplierSelectorHandler,
  listCommercialRegistryHandler,
  removeCommercialRegistryHandler,
  type CommercialRegistryRecord,
} from "./handlers/commercial-registry.handler";

type RegistryKind = "client" | "fuelSupplier";
type PublicRegistryKind = "clients" | "fuel-suppliers";

interface AuthenticatedCompanyScope {
  corporationId: string;
  companyId: string;
}

interface AuthenticatedCommercialActorScope extends AuthenticatedCompanyScope {
  actorUserId: string;
}

function mapEntityType(entityType: CreateCommercialRegistryInput["entityType"]) {
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

function protectedDocument(record: CommercialRegistryRecord) {
  return {
    authTag: record.authTag,
    ciphertext: record.ciphertext,
    documentType: record.documentType,
    encryptionKeyVersion: record.encryptionKeyVersion,
    iv: record.iv,
  };
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

function registryType(kind: PublicRegistryKind) {
  return kind === "clients" ? "CLIENT" : "FUEL_SUPPLIER";
}

function modelKind(kind: PublicRegistryKind): RegistryKind {
  return kind === "clients" ? "client" : "fuelSupplier";
}

export class CommercialService {
  constructor(private readonly context: HandlerContext) {}

  async create(
    kind: PublicRegistryKind,
    scope: AuthenticatedCompanyScope,
    input: CreateCommercialRegistryInput,
  ) {
    return this.context.transaction(async (transactionContext) => {
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

      const created = await createCommercialRegistryHandler(
        transactionContext,
        modelKind(kind),
        {
          ...scope,
          ...protectedDocumentResult,
          displayName,
          entityType: mapEntityType(input.entityType),
          fullName: input.fullName,
          legalName: input.legalName,
          tradeName: input.tradeName,
          phone: input.phone,
          email: input.email,
          addressLine: input.addressLine,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
        },
      );
      return toDetailDto(created);
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
    return toDetailDto(record);
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
}
