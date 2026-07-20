import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";
import { seedReferenceData } from "../../../prisma/seeds/reference-data";
import { resetIntegrationData } from "../reset-integration-data";

import type { FastifyInstance } from "fastify";

describe("commercial Client and Fuel Supplier registries", () => {
  const syntheticCpfFixture = "529.982.247-25";
  const syntheticCpfNormalizedFixture = "52998224725";
  const syntheticCnpjFixture = "11.222.333/0001-81";
  const syntheticCnpjNormalizedFixture = "11222333000181";

  let app: FastifyInstance;
  let organization: OrganizationService;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
    organization = new OrganizationService(app.handlerContext);
  });

  beforeEach(async () => {
    await resetIntegrationData(app.prisma);
  });

  afterAll(() => app.close());

  async function provision(suffix: string) {
    return organization.provision({
      corporationName: `Commercial ${suffix}`,
      domainHost: `commercial-${suffix}.localhost`,
      adminEmail: "master@example.com",
      adminPassword: "correct integration password",
      companyNames: ["One", "Two"],
    });
  }

  async function authFor(input: {
    corporationId: string;
    userId: string;
    companyId: string;
  }) {
    const now = new Date();
    const session = await app.prisma.session.create({
      data: {
        corporationId: input.corporationId,
        userId: input.userId,
        companyId: input.companyId,
        refreshTokenHash: "integration-refresh-token-hash",
        idleExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
    return `Bearer ${app.jwt.sign({
      userId: input.userId,
      corporationId: input.corporationId,
      sessionId: session.id,
      role: "MASTER_ADMIN",
      companyId: input.companyId,
    })}`;
  }

  it("creates, lists, details, and rejects duplicate active Clients without plaintext list leaks", async () => {
    const pilot = await provision("clients");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/clients",
      headers: { authorization },
      payload: {
        entityType: "individual",
        document: syntheticCpfFixture,
        fullName: "Synthetic Ana Client",
        tradeName: "Ana Field",
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().data.document).toMatchObject({
      documentType: "CPF",
      plaintextDocument: syntheticCpfNormalizedFixture,
    });

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/clients?limit=1&sortBy=name&sortDirection=asc",
      headers: { authorization },
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data.data).toHaveLength(1);
    expect(JSON.stringify(listed.json())).not.toContain(
      syntheticCpfNormalizedFixture,
    );
    expect(listed.json().data.data[0].document.maskedDocument).toContain("247");

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/clients/${created.json().data.id}`,
      headers: { authorization },
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().data.document.plaintextDocument).toBe(
      syntheticCpfNormalizedFixture,
    );

    const duplicate = await app.inject({
      method: "POST",
      url: "/api/v1/clients",
      headers: { authorization },
      payload: {
        entityType: "individual",
        document: syntheticCpfFixture,
        fullName: "Synthetic Duplicate",
      },
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ code: "DOCUMENT_ALREADY_EXISTS" });
    expect(JSON.stringify(duplicate.json())).not.toContain(
      syntheticCpfNormalizedFixture,
    );

    const badCursor = await app.inject({
      method: "GET",
      url: "/api/v1/clients?cursor=not+base64",
      headers: { authorization },
    });
    expect(badCursor.statusCode).toBe(400);
    expect(badCursor.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("allows same synthetic document across Company, Corporation, and separate Supplier aggregate", async () => {
    const first = await provision("first");
    const second = await provision("second");
    const firstCompanyOne = await authFor({
      corporationId: first.corporation.id,
      userId: first.administrator.id,
      companyId: first.companies[0].id,
    });
    const firstCompanyTwo = await authFor({
      corporationId: first.corporation.id,
      userId: first.administrator.id,
      companyId: first.companies[1].id,
    });
    const secondCompany = await authFor({
      corporationId: second.corporation.id,
      userId: second.administrator.id,
      companyId: second.companies[0].id,
    });

    for (const [authorization, url, name] of [
      [firstCompanyOne, "/api/v1/clients", "Synthetic Client One"],
      [firstCompanyTwo, "/api/v1/clients", "Synthetic Client Two"],
      [secondCompany, "/api/v1/clients", "Synthetic Client Foreign"],
      [firstCompanyOne, "/api/v1/fuel-suppliers", "Synthetic Supplier"],
    ] as const) {
      const response = await app.inject({
        method: "POST",
        url,
        headers: { authorization },
        payload: {
          entityType: "individual",
          document: syntheticCpfFixture,
          fullName: name,
        },
      });
      expect(response.statusCode).toBe(201);
    }

    expect(await app.prisma.client.count()).toBe(3);
    expect(await app.prisma.fuelSupplier.count()).toBe(1);
  });

  it("removes commercial records from operational use and permits active document reuse", async () => {
    const pilot = await provision("removal");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/clients",
      headers: { authorization },
      payload: {
        entityType: "individual",
        document: syntheticCpfFixture,
        fullName: "Synthetic Removable Client",
      },
    });
    expect(created.statusCode).toBe(201);

    const removed = await app.inject({
      method: "DELETE",
      url: `/api/v1/clients/${created.json().data.id}`,
      headers: { authorization },
    });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().data).toMatchObject({
      id: created.json().data.id,
      isActive: false,
    });
    expect(removed.json().data.removedAt).toEqual(expect.any(String));

    const listed = await app.inject({
      method: "GET",
      url: "/api/v1/clients",
      headers: { authorization },
    });
    expect(listed.statusCode).toBe(200);
    expect(listed.json().data.data).toEqual([]);

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/clients/${created.json().data.id}`,
      headers: { authorization },
    });
    expect(detail.statusCode).toBe(404);

    const reused = await app.inject({
      method: "POST",
      url: "/api/v1/clients",
      headers: { authorization },
      payload: {
        entityType: "individual",
        document: syntheticCpfFixture,
        fullName: "Synthetic Reused Client",
      },
    });
    expect(reused.statusCode).toBe(201);
    expect(await app.prisma.client.count()).toBe(2);
  });

  it("handles legal-entity Fuel Suppliers, active selectors, and immutable Fuel Type seeds", async () => {
    const pilot = await provision("suppliers");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });

    await seedReferenceData(app.prisma);
    await seedReferenceData(app.prisma);
    expect(
      await app.prisma.fuelType.findMany({ orderBy: { id: "asc" } }),
    ).toMatchObject([
      { id: "diesel-s10", name: "Diesel S10", isActive: true },
      { id: "diesel-s500", name: "Diesel S500", isActive: true },
    ]);

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/fuel-suppliers",
      headers: { authorization },
      payload: {
        entityType: "legal_entity",
        document: syntheticCnpjFixture,
        legalName: "Synthetic Diesel Supplier Ltda",
        tradeName: "Synthetic Diesel",
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().data.document).toMatchObject({
      documentType: "CNPJ",
      plaintextDocument: syntheticCnpjNormalizedFixture,
    });

    const selector = await app.inject({
      method: "GET",
      url: "/api/v1/fuel-suppliers/selectors/active",
      headers: { authorization },
    });
    expect(selector.statusCode).toBe(200);
    expect(selector.json().data).toHaveLength(1);
    expect(JSON.stringify(selector.json())).not.toContain(
      syntheticCnpjNormalizedFixture,
    );

    await app.prisma.fuelSupplier.update({
      where: { id: created.json().data.id },
      data: { isActive: false, inactivatedAt: new Date() },
    });
    const inactiveSelector = await app.inject({
      method: "GET",
      url: "/api/v1/fuel-suppliers/selectors/active",
      headers: { authorization },
    });
    expect(inactiveSelector.statusCode).toBe(200);
    expect(inactiveSelector.json().data).toEqual([]);
  });

  it("updates Supplier registry information without changing identity", async () => {
    const pilot = await provision("supplier-update");
    const companyOneAuthorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const companyTwoAuthorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[1].id,
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      headers: { authorization: companyOneAuthorization },
      payload: {
        entityType: "legal_entity",
        document: syntheticCnpjFixture,
        legalName: "Synthetic Diesel Supplier Ltda",
        tradeName: "Synthetic Diesel",
        phone: "(85) 3333-0000",
        addressStreet: "Rua Inicial",
        addressNumber: "10",
        addressNeighborhood: "Centro",
        city: "Fortaleza",
        state: "CE",
        postalCode: "60170-000",
      },
    });
    expect(created.statusCode).toBe(201);
    const supplierId = created.json().data.id;

    const invalidIdentityPatch = await app.inject({
      method: "PATCH",
      url: `/api/v1/suppliers/${supplierId}`,
      headers: { authorization: companyOneAuthorization },
      payload: {
        document: syntheticCpfFixture,
        legalName: "Synthetic Identity Edit",
      },
    });
    expect(invalidIdentityPatch.statusCode).toBe(400);
    expect(invalidIdentityPatch.json()).toMatchObject({
      code: "VALIDATION_ERROR",
    });

    const wrongCompanyPatch = await app.inject({
      method: "PATCH",
      url: `/api/v1/suppliers/${supplierId}`,
      headers: { authorization: companyTwoAuthorization },
      payload: {
        legalName: "Synthetic Foreign Edit",
      },
    });
    expect(wrongCompanyPatch.statusCode).toBe(404);

    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/suppliers/${supplierId}`,
      headers: { authorization: companyOneAuthorization },
      payload: {
        legalName: "Synthetic Diesel Supplier Nordeste Ltda",
        tradeName: null,
        phone: "(85) 4000-0000",
        email: "supplier@example.test",
        addressStreet: "Avenida Atualizada",
        addressNumber: "200",
        addressComplement: "",
        addressNeighborhood: "Meireles",
        city: "Fortaleza",
        state: "CE",
        postalCode: "60175-001",
      },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().data).toMatchObject({
      id: supplierId,
      name: "Synthetic Diesel Supplier Nordeste Ltda",
      legalName: "Synthetic Diesel Supplier Nordeste Ltda",
      tradeName: null,
      phone: "(85) 4000-0000",
      email: "supplier@example.test",
      addressLine: "Avenida Atualizada, 200",
      addressStreet: "Avenida Atualizada",
      addressNumber: "200",
      addressComplement: null,
      addressNeighborhood: "Meireles",
      city: "Fortaleza",
      state: "CE",
      postalCode: "60175-001",
    });
    expect(updated.json().data.document.plaintextDocument).toBe(
      syntheticCnpjNormalizedFixture,
    );

    const persisted = await app.prisma.fuelSupplier.findUniqueOrThrow({
      where: { id: supplierId },
    });
    expect(persisted).toMatchObject({
      displayName: "Synthetic Diesel Supplier Nordeste Ltda",
      legalName: "Synthetic Diesel Supplier Nordeste Ltda",
      tradeName: null,
      addressLine: "Avenida Atualizada, 200",
      addressStreet: "Avenida Atualizada",
      addressNumber: "200",
      addressComplement: null,
    });

    await app.prisma.fuelSupplier.update({
      where: { id: supplierId },
      data: { isActive: false, inactivatedAt: new Date() },
    });
    const inactivePatch = await app.inject({
      method: "PATCH",
      url: `/api/v1/suppliers/${supplierId}`,
      headers: { authorization: companyOneAuthorization },
      payload: {
        legalName: "Synthetic Inactive Edit",
      },
    });
    expect(inactivePatch.statusCode).toBe(404);
  });

  it("creates supplied items with liter units and rejects update-only fields on create", async () => {
    const pilot = await provision("supplied-items");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });

    const created = await app.inject({
      method: "POST",
      url: "/api/v1/supplied-items",
      headers: { authorization },
      payload: {
        name: "Óleo combustível de teste",
        baseUnitId: "00000000-0000-4000-8000-00000000a001",
        valueUnitQuantity: "1.000000",
        basePrice: "7.2500",
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json().data).toMatchObject({
      name: "Óleo combustível de teste",
      baseUnitId: "00000000-0000-4000-8000-00000000a001",
    });

    const extraField = await app.inject({
      method: "POST",
      url: "/api/v1/supplied-items",
      headers: { authorization },
      payload: {
        name: "Aditivo de teste",
        baseUnitId: "00000000-0000-4000-8000-00000000a001",
        valueUnitQuantity: "1.000000",
        basePrice: "7.4000",
        propagateMirrorToExistingOffers: false,
      },
    });
    expect(extraField.statusCode).toBe(400);
    expect(extraField.json()).toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("keeps the fuel root fixed while allowing default fuels to be deactivated and reactivated", async () => {
    const pilot = await provision("fixed-fuel-catalog");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });
    const catalog = await app.inject({
      method: "GET",
      url: "/api/v1/supplied-items/catalog?includeInactive=true",
      headers: { authorization },
    });
    expect(catalog.statusCode).toBe(200);
    const root = catalog
      .json()
      .data.categories.find(
        (category: { systemKey: string | null }) =>
          category.systemKey === "fuel",
      );
    expect(root).toMatchObject({
      name: "Combustíveis",
      parentId: null,
      isActive: true,
      kind: "fuel",
    });
    const defaultFuelNames = catalog
      .json()
      .data.items.filter(
        (item: { categoryId: string | null }) => item.categoryId === root.id,
      )
      .map((item: { name: string }) => item.name);
    expect(defaultFuelNames).toEqual(
      expect.arrayContaining([
        "Diesel S10",
        "Diesel S500",
        "Gasolina comum",
        "Etanol",
        "ARLA 32",
      ]),
    );

    const renamedRoot = await app.inject({
      method: "PATCH",
      url: `/api/v1/supplied-item-categories/${root.id}`,
      headers: { authorization },
      payload: { name: "Outra categoria" },
    });
    expect(renamedRoot.statusCode).toBe(409);
    const disabledRoot = await app.inject({
      method: "PATCH",
      url: `/api/v1/supplied-item-categories/${root.id}/status`,
      headers: { authorization },
      payload: { isActive: false },
    });
    expect(disabledRoot.statusCode).toBe(409);

    const dieselS10 = catalog
      .json()
      .data.items.find((item: { name: string }) => item.name === "Diesel S10");
    const disabledItem = await app.inject({
      method: "PATCH",
      url: `/api/v1/supplied-items/${dieselS10.id}/status`,
      headers: { authorization },
      payload: { isActive: false },
    });
    expect(disabledItem.statusCode).toBe(200);
    const reactivatedItem = await app.inject({
      method: "PATCH",
      url: `/api/v1/supplied-items/${dieselS10.id}/status`,
      headers: { authorization },
      payload: { isActive: true },
    });
    expect(reactivatedItem.statusCode).toBe(200);
  });

  it("searches supplied item selectors by name, category descendants, and active offers", async () => {
    const pilot = await provision("supplied-item-selectors");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });

    const catalog = await app.inject({
      method: "GET",
      url: "/api/v1/supplied-items/catalog",
      headers: { authorization },
    });
    expect(catalog.statusCode).toBe(200);
    const category = catalog
      .json()
      .data.categories.find(
        (entry: { systemKey: string | null }) => entry.systemKey === "fuel",
      );
    expect(category).toBeTruthy();
    const subcategory = await app.inject({
      method: "POST",
      url: "/api/v1/supplied-item-categories",
      headers: { authorization },
      payload: { name: "Diesel especial", parentId: category.id },
    });
    expect(subcategory.statusCode).toBe(201);

    const diesel = await app.inject({
      method: "POST",
      url: "/api/v1/supplied-items",
      headers: { authorization },
      payload: {
        name: "Diesel marítimo de teste",
        baseUnitId: "00000000-0000-4000-8000-00000000a001",
        categoryId: subcategory.json().data.id,
      },
    });
    expect(diesel.statusCode).toBe(201);
    const grease = await app.inject({
      method: "POST",
      url: "/api/v1/supplied-items",
      headers: { authorization },
      payload: {
        name: "Graxa",
        baseUnitId: "00000000-0000-4000-8000-00000000a001",
      },
    });
    expect(grease.statusCode).toBe(201);

    const supplier = await app.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      headers: { authorization },
      payload: {
        entityType: "individual",
        document: syntheticCpfFixture,
        fullName: "Posto Serra Azul",
      },
    });
    expect(supplier.statusCode).toBe(201);
    const offer = await app.inject({
      method: "POST",
      url: `/api/v1/suppliers/${supplier.json().data.id}/offers`,
      headers: { authorization },
      payload: {
        itemId: diesel.json().data.id,
        baseUnitId: "00000000-0000-4000-8000-00000000a001",
        purchaseUnitId: "00000000-0000-4000-8000-00000000a001",
        conversionToBase: "1.000000",
        price: "6.5000",
      },
    });
    expect(offer.statusCode).toBe(201);

    const matched = await app.inject({
      method: "GET",
      url: `/api/v1/supplied-items/selectors/active?search=Diesel&categoryId=${category.id}&onlyWithActiveOffers=true&kind=fuel`,
      headers: { authorization },
    });
    expect(matched.statusCode).toBe(200);
    expect(matched.json().data.data).toEqual([
      expect.objectContaining({
        id: diesel.json().data.id,
        name: "Diesel marítimo de teste",
        activeSupplierCount: 1,
        categoryPath: ["Combustíveis", "Diesel especial"],
      }),
    ]);

    const rootOnly = await app.inject({
      method: "GET",
      url: `/api/v1/supplied-items/selectors/active?categoryId=${category.id}&includeDescendants=false&onlyWithActiveOffers=true&kind=fuel`,
      headers: { authorization },
    });
    expect(rootOnly.statusCode).toBe(200);
    expect(rootOnly.json().data.data).toEqual([]);

    const withoutOffer = await app.inject({
      method: "GET",
      url: "/api/v1/supplied-items/selectors/active?search=Graxa&onlyWithActiveOffers=true",
      headers: { authorization },
    });
    expect(withoutOffer.statusCode).toBe(200);
    expect(withoutOffer.json().data.data).toEqual([]);
  });

  it("filters item offers and eligible suppliers by active supplier", async () => {
    const pilot = await provision("item-offer-suppliers");
    const authorization = await authFor({
      corporationId: pilot.corporation.id,
      userId: pilot.administrator.id,
      companyId: pilot.companies[0].id,
    });

    const item = await app.inject({
      method: "POST",
      url: "/api/v1/supplied-items",
      headers: { authorization },
      payload: {
        name: "Óleo diesel de homologação",
        baseUnitId: "00000000-0000-4000-8000-00000000a001",
      },
    });
    expect(item.statusCode).toBe(201);

    const activeSupplier = await app.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      headers: { authorization },
      payload: {
        entityType: "individual",
        document: syntheticCpfFixture,
        fullName: "Posto Ativo",
      },
    });
    expect(activeSupplier.statusCode).toBe(201);
    const inactiveSupplier = await app.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      headers: { authorization },
      payload: {
        entityType: "legal_entity",
        document: syntheticCnpjFixture,
        legalName: "Posto Inativo Ltda",
      },
    });
    expect(inactiveSupplier.statusCode).toBe(201);

    for (const supplierId of [
      activeSupplier.json().data.id,
      inactiveSupplier.json().data.id,
    ]) {
      const offer = await app.inject({
        method: "POST",
        url: `/api/v1/suppliers/${supplierId}/offers`,
        headers: { authorization },
        payload: {
          itemId: item.json().data.id,
          baseUnitId: "00000000-0000-4000-8000-00000000a001",
          purchaseUnitId: "00000000-0000-4000-8000-00000000a001",
          conversionToBase: "1.000000",
          price:
            supplierId === activeSupplier.json().data.id ? "6.3000" : "6.9000",
        },
      });
      expect(offer.statusCode).toBe(201);
    }

    await app.prisma.fuelSupplier.update({
      where: { id: inactiveSupplier.json().data.id },
      data: { isActive: false, inactivatedAt: new Date() },
    });

    const suppliersResponse = await app.inject({
      method: "GET",
      url: `/api/v1/supplied-items/${item.json().data.id}/offer-suppliers?search=Posto`,
      headers: { authorization },
    });
    expect(suppliersResponse.statusCode).toBe(200);
    expect(suppliersResponse.json().data).toEqual([
      expect.objectContaining({
        id: activeSupplier.json().data.id,
        name: "Posto Ativo",
      }),
    ]);

    const activeOffers = await app.inject({
      method: "GET",
      url: `/api/v1/supplied-items/${item.json().data.id}/offers?supplierId=${activeSupplier.json().data.id}`,
      headers: { authorization },
    });
    expect(activeOffers.statusCode).toBe(200);
    expect(activeOffers.json().data.data).toHaveLength(1);
    expect(activeOffers.json().data.data[0]).toMatchObject({
      supplier: { id: activeSupplier.json().data.id },
      baseUnit: {
        id: "00000000-0000-4000-8000-00000000a001",
        code: "L",
      },
      purchaseUnit: {
        id: "00000000-0000-4000-8000-00000000a001",
        code: "L",
      },
      currentPrice: { price: "6.3000" },
    });

    const inactiveOffers = await app.inject({
      method: "GET",
      url: `/api/v1/supplied-items/${item.json().data.id}/offers?supplierId=${inactiveSupplier.json().data.id}`,
      headers: { authorization },
    });
    expect(inactiveOffers.statusCode).toBe(200);
    expect(inactiveOffers.json().data.data).toEqual([]);
  });
});
