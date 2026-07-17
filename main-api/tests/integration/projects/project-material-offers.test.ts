import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";
import type { ProjectCommand } from "../../../src/modules/projects/projects.dto";
import { ProjectsService } from "../../../src/modules/projects/projects.service";
import { resetIntegrationData } from "../reset-integration-data";

import type { FastifyInstance } from "fastify";

describe("project material offers readiness", () => {
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

  async function setup() {
    const pilot = await organization.provision({
      corporationName: "Project material offers",
      domainHost: "project-material-offers.localhost",
      adminEmail: "master@example.com",
      adminPassword: "correct integration password",
      companyNames: ["One"],
    });
    const companyId = pilot.companies[0].id;
    const now = new Date();
    const session = await app.prisma.session.create({
      data: {
        corporationId: pilot.corporation.id,
        userId: pilot.administrator.id,
        companyId,
        refreshTokenHash: "project-material-refresh-token",
        idleExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      },
      select: { id: true },
    });
    const authorization = `Bearer ${app.jwt.sign({
      userId: pilot.administrator.id,
      corporationId: pilot.corporation.id,
      sessionId: session.id,
      role: "MASTER_ADMIN",
      companyId,
    })}`;
    const role = await app.prisma.jobRole.create({
      data: {
        corporationId: pilot.corporation.id,
        companyId,
        name: "Engenheiro",
        normalizedName: "engenheiro",
      },
    });
    const employeeResponse = await app.inject({
      method: "POST",
      url: "/api/v1/employees",
      headers: { authorization },
      payload: {
        document: "111.444.777-35",
        fullName: "Responsável técnico",
        companyRegistrationNumber: "ENG-001",
        admissionDate: "2026-07-01",
        jobRoleId: role.id,
      },
    });
    expect(employeeResponse.statusCode).toBe(201);
    const employmentId = employeeResponse.json().data.id as string;
    const clientResponse = await app.inject({
      method: "POST",
      url: "/api/v1/clients",
      headers: { authorization },
      payload: {
        entityType: "legal_entity",
        document: "12.345.678/0001-95",
        legalName: "Cliente da obra Ltda",
      },
    });
    expect(clientResponse.statusCode).toBe(201);
    const clientId = clientResponse.json().data.id as string;
    const projectCommand: ProjectCommand = {
      name: "Synthetic material project",
      address: {
        postalCode: "60170000",
        street: "Rua A",
        number: "10",
        complement: null,
        neighborhood: "Meireles",
        city: "Fortaleza",
        state: "CE",
      },
      latitude: null,
      longitude: null,
      contractNumber: null,
      approvedBudget: "100.00",
      plannedStartDate: "2026-07-01",
      plannedEndDate: "2026-12-31",
      clientId,
      managerEmploymentId: employmentId,
      technicalResponsibilityEmploymentIds: [employmentId],
      weeklySchedule: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
        dayOfWeek,
        isWorking: dayOfWeek < 6,
        startTime: dayOfWeek < 6 ? "08:00" : null,
        endTime: dayOfWeek < 6 ? "17:00" : null,
      })),
      breakTemplates: [],
      initialEmployeeAllocations: [],
      initialMachineAllocations: [],
      projectSupplierOffers: [],
    };
    const projectScope = {
      corporationId: pilot.corporation.id,
      companyId,
      sessionId: session.id,
      userId: pilot.administrator.id,
      role: "MASTER_ADMIN" as const,
    };
    const project = await new ProjectsService(app.handlerContext).finalize(
      projectScope,
      companyId,
      "00000000-0000-4000-8000-000000000901",
      projectCommand,
    );
    return {
      authorization,
      companyId,
      corporationId: pilot.corporation.id,
      projectId: project.projectId,
    };
  }

  async function createSupplier(
    authorization: string,
    input: { document: string; name: string; legal?: boolean },
  ) {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      headers: { authorization },
      payload: input.legal
        ? {
            entityType: "legal_entity",
            document: input.document,
            legalName: input.name,
          }
        : {
            entityType: "individual",
            document: input.document,
            fullName: input.name,
          },
    });
    expect(response.statusCode).toBe(201);
    return response.json().data.id as string;
  }

  async function createItem(authorization: string, name: string) {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/supplied-items",
      headers: { authorization },
      payload: {
        name,
        baseUnitId: "00000000-0000-4000-8000-00000000a003",
      },
    });
    expect(response.statusCode).toBe(201);
    return response.json().data.id as string;
  }

  it("creates, preserves, edits and removes catalog and project-only offers", async () => {
    const scope = await setup();
    const catalogSupplierId = await createSupplier(scope.authorization, {
      document: "529.982.247-25",
      name: "Pedreira Catálogo",
    });
    const exclusiveSupplierId = await createSupplier(scope.authorization, {
      document: "11.222.333/0001-81",
      name: "Pedreira Exclusiva Ltda",
      legal: true,
    });
    const catalogItemId = await createItem(scope.authorization, "Brita 1");
    const exclusiveItemId = await createItem(
      scope.authorization,
      "Areia lavada",
    );

    const sourceOffer = await app.inject({
      method: "POST",
      url: `/api/v1/suppliers/${catalogSupplierId}/offers`,
      headers: { authorization: scope.authorization },
      payload: {
        itemId: catalogItemId,
        baseUnitId: "00000000-0000-4000-8000-00000000a003",
        purchaseUnitId: "00000000-0000-4000-8000-00000000a003",
        conversionToBase: "1.000000",
        price: "65.0000",
      },
    });
    expect(sourceOffer.statusCode).toBe(201);
    const sourceOfferId = sourceOffer.json().data.id as string;

    const existingCommand = {
      mode: "existing",
      sourceOfferId,
      price: "64.5000",
    } as const;
    const exclusiveCommand = {
      mode: "projectOnly",
      supplierId: exclusiveSupplierId,
      itemId: exclusiveItemId,
      purchaseUnitId: "00000000-0000-4000-8000-00000000a003",
      conversionToBase: "2.000000",
      price: "48.0000",
    } as const;

    const existingOnly = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${scope.projectId}/readiness`,
      headers: { authorization: scope.authorization },
      payload: { materialOffers: [existingCommand] },
    });
    expect(existingOnly.statusCode, existingOnly.body).toBe(200);
    expect(existingOnly.json().data.supplierOffers).toHaveLength(1);

    const catalogCountBeforeExclusive = await app.prisma.supplierOffer.count();
    const withExclusive = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${scope.projectId}/readiness`,
      headers: { authorization: scope.authorization },
      payload: { materialOffers: [existingCommand, exclusiveCommand] },
    });
    expect(withExclusive.statusCode).toBe(200);
    expect(withExclusive.json().data.supplierOffers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceOfferId }),
        expect.objectContaining({
          sourceOfferId: null,
          price: "48.0000",
        }),
      ]),
    );
    expect(await app.prisma.supplierOffer.count()).toBe(
      catalogCountBeforeExclusive,
    );

    const editedExclusive = {
      ...exclusiveCommand,
      conversionToBase: "3.000000",
      price: "46.5000",
    };
    const editedAndRemoved = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${scope.projectId}/readiness`,
      headers: { authorization: scope.authorization },
      payload: { materialOffers: [editedExclusive] },
    });
    expect(editedAndRemoved.statusCode).toBe(200);
    expect(editedAndRemoved.json().data.supplierOffers).toEqual([
      expect.objectContaining({
        sourceOfferId: null,
        conversionToBase: "3.000000",
        price: "46.5000",
      }),
    ]);

    const duplicate = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${scope.projectId}/readiness`,
      headers: { authorization: scope.authorization },
      payload: { materialOffers: [editedExclusive, editedExclusive] },
    });
    expect(duplicate.statusCode).toBe(400);

    await app.prisma.fuelSupplier.update({
      where: { id: exclusiveSupplierId },
      data: { isActive: false, inactivatedAt: new Date() },
    });
    const inactiveSupplier = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${scope.projectId}/readiness`,
      headers: { authorization: scope.authorization },
      payload: { materialOffers: [editedExclusive] },
    });
    expect(inactiveSupplier.statusCode).toBe(409);
  });
});
