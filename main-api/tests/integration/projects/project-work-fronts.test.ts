import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";
import type { ProjectCommand } from "../../../src/modules/projects/projects.dto";
import { ProjectsService } from "../../../src/modules/projects/projects.service";
import { resetIntegrationData } from "../reset-integration-data";

import type { FastifyInstance } from "fastify";

describe("project work-front quantities", () => {
  const syntheticEmployeeCpfFixture = "111.444.777-35";
  const syntheticClientCnpjFixture = "12.345.678/0001-95";
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
      corporationName: "Project work fronts",
      domainHost: "project-work-fronts.localhost",
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
        refreshTokenHash: "project-work-front-refresh-token",
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
        document: syntheticEmployeeCpfFixture,
        fullName: "Responsável técnico",
        companyRegistrationNumber: "ENG-001",
        admissionDate: "2026-07-01",
        jobRoleId: role.id,
      },
    });
    expect(employeeResponse.statusCode, employeeResponse.body).toBe(201);
    const employmentId = employeeResponse.json().data.id as string;
    const clientResponse = await app.inject({
      method: "POST",
      url: "/api/v1/clients",
      headers: { authorization },
      payload: {
        entityType: "legal_entity",
        document: syntheticClientCnpjFixture,
        legalName: "Cliente da obra Ltda",
      },
    });
    expect(clientResponse.statusCode, clientResponse.body).toBe(201);
    const clientId = clientResponse.json().data.id as string;
    const projectCommand: ProjectCommand = {
      name: "Obra de teste",
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
    const revision = await app.prisma.projectQuantityBaselineRevision.create({
      data: {
        corporationId: pilot.corporation.id,
        companyId,
        projectId: project.projectId,
        revision: 1,
        createdByUserId: pilot.administrator.id,
      },
      select: { id: true },
    });
    await app.prisma.projectQuantityBaselineItem.create({
      data: {
        revisionId: revision.id,
        serviceCode: "cut",
        unitCode: "M3",
        total: "100.00",
      },
    });
    return { authorization, projectId: project.projectId };
  }

  function createFront(
    authorization: string,
    projectId: string,
    name: string,
    quantity: string,
  ) {
    return app.inject({
      method: "POST",
      url: `/api/v1/projects/${projectId}/fronts`,
      headers: { authorization },
      payload: {
        name,
        services: [{ serviceCode: "cut", unitCode: "M3", quantity }],
      },
    });
  }

  it("accepts quantity, blocks an excess and allows the exact balance", async () => {
    const scope = await setup();
    const first = await createFront(
      scope.authorization,
      scope.projectId,
      "Frente 1",
      "60.00",
    );
    expect(first.statusCode, first.body).toBe(200);

    const excess = await createFront(
      scope.authorization,
      scope.projectId,
      "Frente 2",
      "41.00",
    );
    expect(excess.statusCode, excess.body).toBe(422);
    expect(excess.json()).toEqual(
      expect.objectContaining({
        code: "WORK_FRONT_QUANTITY_EXCEEDS_BALANCE",
        details: expect.objectContaining({
          blockers: [
            expect.objectContaining({
              section: "fronts",
              message: expect.stringContaining("saldo disponível 40.00 M3"),
            }),
          ],
        }),
      }),
    );

    const exactBalance = await createFront(
      scope.authorization,
      scope.projectId,
      "Frente 3",
      "40.00",
    );
    expect(exactBalance.statusCode, exactBalance.body).toBe(200);
  });

  it("excludes the edited front from its own allocated balance", async () => {
    const scope = await setup();
    const created = await createFront(
      scope.authorization,
      scope.projectId,
      "Frente editável",
      "60.00",
    );
    expect(created.statusCode, created.body).toBe(200);
    const frontId = created.json().data.workFronts[0].id as string;

    const updated = await app.inject({
      method: "PATCH",
      url: `/api/v1/projects/${scope.projectId}/fronts/${frontId}`,
      headers: { authorization: scope.authorization },
      payload: {
        name: "Frente editável",
        services: [{ serviceCode: "cut", unitCode: "M3", quantity: "100.00" }],
      },
    });
    expect(updated.statusCode, updated.body).toBe(200);
  });

  it("serializes concurrent allocations so only one can consume the balance", async () => {
    const scope = await setup();
    const responses = await Promise.all([
      createFront(scope.authorization, scope.projectId, "Frente A", "60.00"),
      createFront(scope.authorization, scope.projectId, "Frente B", "60.00"),
    ]);

    expect(
      responses.map((response) => response.statusCode).sort(),
      JSON.stringify(responses.map((response) => response.json())),
    ).toEqual([200, 422]);
  });
});
