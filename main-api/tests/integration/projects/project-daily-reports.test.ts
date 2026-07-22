import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../../../src/app";
import { OrganizationService } from "../../../src/modules/organization/organization.service";
import type { ProjectCommand } from "../../../src/modules/projects/projects.dto";
import { ProjectsService } from "../../../src/modules/projects/projects.service";
import { resetIntegrationData } from "../reset-integration-data";

import type { FastifyInstance } from "fastify";

describe("project daily reports", () => {
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
      corporationName: "Daily reports",
      domainHost: "daily-reports.localhost",
      adminEmail: "master@example.com",
      adminPassword: "correct integration password",
      companyNames: ["One", "Two"],
    });
    const companyId = pilot.companies[0].id;
    const otherCompanyId = pilot.companies[1].id;
    const now = new Date();
    const session = await app.prisma.session.create({
      data: {
        corporationId: pilot.corporation.id,
        userId: pilot.administrator.id,
        companyId,
        refreshTokenHash: "daily-report-refresh-token",
        idleExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      },
    });
    const otherSession = await app.prisma.session.create({
      data: {
        corporationId: pilot.corporation.id,
        userId: pilot.administrator.id,
        companyId: otherCompanyId,
        refreshTokenHash: "daily-report-other-refresh-token",
        idleExpiresAt: new Date(now.getTime() + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      },
    });
    const authorization = bearer({
      userId: pilot.administrator.id,
      corporationId: pilot.corporation.id,
      sessionId: session.id,
      companyId,
    });
    const otherAuthorization = bearer({
      userId: pilot.administrator.id,
      corporationId: pilot.corporation.id,
      sessionId: otherSession.id,
      companyId: otherCompanyId,
    });
    const role = await app.prisma.jobRole.create({
      data: {
        corporationId: pilot.corporation.id,
        companyId,
        name: "Supervisor de Terraplanagem",
        normalizedName: "supervisor de terraplanagem",
      },
    });
    const employeeResponse = await app.inject({
      method: "POST",
      url: "/api/v1/employees",
      headers: { authorization },
      payload: {
        document: syntheticEmployeeCpfFixture,
        fullName: "Rafael Brito",
        companyRegistrationNumber: "SUP-001",
        admissionDate: "2026-01-01",
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
        legalName: "Jardins das Oliveiras I",
      },
    });
    expect(clientResponse.statusCode, clientResponse.body).toBe(201);
    const reportDate = dateInSaoPauloDaysAgo(1);
    const projectCommand: ProjectCommand = {
      name: "Jardim das Oliveiras",
      address: {
        postalCode: "65900000",
        street: "Rua das Oliveiras",
        number: "100",
        complement: null,
        neighborhood: "Centro",
        city: "Imperatriz",
        state: "MA",
      },
      latitude: null,
      longitude: null,
      contractNumber: "Loteamento Jardins das Oliveiras I",
      approvedBudget: "100000.00",
      plannedStartDate: reportDate,
      plannedEndDate: null,
      clientId: clientResponse.json().data.id as string,
      managerEmploymentId: employmentId,
      technicalResponsibilityEmploymentIds: [employmentId],
      weeklySchedule: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
        dayOfWeek,
        isWorking: dayOfWeek <= 6,
        startTime: dayOfWeek <= 6 ? "07:00" : null,
        endTime: dayOfWeek <= 6 ? "18:00" : null,
      })),
      breakTemplates: [],
      initialEmployeeAllocations: [],
      initialMachineAllocations: [],
      projectSupplierOffers: [],
    };
    const project = await new ProjectsService(app.handlerContext).finalize(
      {
        corporationId: pilot.corporation.id,
        companyId,
        sessionId: session.id,
        userId: pilot.administrator.id,
        role: "MASTER_ADMIN",
      },
      companyId,
      "00000000-0000-4000-8000-000000002901",
      projectCommand,
    );
    const machine = await app.prisma.machine.create({
      data: {
        corporationId: pilot.corporation.id,
        name: "EH-01 Hyundai",
        type: "YELLOW_LINE",
        manufacturer: "Hyundai",
        model: "R220",
        meterType: "HOUR_METER",
      },
    });
    await app.prisma.machineOwnershipPeriod.create({
      data: {
        corporationId: pilot.corporation.id,
        companyId,
        machineId: machine.id,
        effectiveFrom: new Date(`${reportDate}T00:00:00-03:00`),
      },
    });
    const initialReading = await app.prisma.machineMeterReading.create({
      data: {
        corporationId: pilot.corporation.id,
        companyId,
        machineId: machine.id,
        readingSequence: 1,
        value: "2168.10",
        purpose: "INITIAL",
        actorUserId: pilot.administrator.id,
        recordedAt: new Date(
          new Date(`${reportDate}T00:00:00-03:00`).getTime() - 60_000,
        ),
      },
    });
    const employees = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${project.projectId}/mobilization/employees`,
      headers: { authorization },
      payload: {
        allocations: [
          {
            employmentId,
            confirmedJobRoleId: role.id,
            expectedDailyWorkloadMinutes: 600,
            compensationMode: "monthly",
            compensationValue: "5000.00",
            overtimeRate: "30.00",
          },
        ],
      },
    });
    expect(employees.statusCode, employees.body).toBe(200);
    const machines = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${project.projectId}/mobilization/machines`,
      headers: { authorization },
      payload: {
        allocations: [
          {
            machineId: machine.id,
            startMeterReadingId: initialReading.id,
            operatorEmploymentId: employmentId,
          },
        ],
      },
    });
    expect(machines.statusCode, machines.body).toBe(200);
    const temporalStart = new Date(`${reportDate}T00:00:00-03:00`);
    await Promise.all([
      app.prisma.projectManagerTenure.updateMany({
        where: { projectId: project.projectId },
        data: { effectiveFrom: temporalStart },
      }),
      app.prisma.projectTechnicalResponsibility.updateMany({
        where: { projectId: project.projectId },
        data: { effectiveFrom: temporalStart },
      }),
      app.prisma.projectScheduleRevision.updateMany({
        where: { projectId: project.projectId },
        data: { effectiveFrom: temporalStart },
      }),
      app.prisma.projectEmployeeAllocation.updateMany({
        where: { projectId: project.projectId },
        data: { effectiveFrom: temporalStart },
      }),
      app.prisma.projectMachineAllocation.updateMany({
        where: { projectId: project.projectId },
        data: { effectiveFrom: temporalStart },
      }),
      app.prisma.project.update({
        where: { id: project.projectId },
        data: { status: "ACTIVE", actualStartedAt: temporalStart },
      }),
    ]);
    return {
      authorization,
      otherAuthorization,
      projectId: project.projectId,
      employmentId,
      machineId: machine.id,
      initialReadingId: initialReading.id,
      reportDate,
    };
  }

  function bearer(input: {
    userId: string;
    corporationId: string;
    sessionId: string;
    companyId: string;
  }) {
    return `Bearer ${app.jwt.sign({ ...input, role: "MASTER_ADMIN" })}`;
  }

  function command(scope: Awaited<ReturnType<typeof setup>>, shift = "day") {
    const night = shift === "night";
    return {
      reportDate: scope.reportDate,
      shift,
      schedulePeriods: [
        {
          startTime: night ? "18:00" : "07:00",
          endTime: night ? "23:00" : "12:00",
          startDayOffset: 0,
          endDayOffset: 0,
        },
        ...(night
          ? []
          : [
              {
                startTime: "13:00",
                endTime: "18:00",
                startDayOffset: 0,
                endDayOffset: 0,
              },
            ]),
      ],
      activityStartTime: night ? "18:00" : "07:00",
      activityEndTime: night ? "23:00" : "18:00",
      activityEndDayOffset: 0,
      activityTypes: ["earthworks"],
      climateConditions: ["dry"],
      dailyRainfallMm: "0",
      monthlyRainfallMm: "0",
      supervisorEmploymentId: scope.employmentId,
      technicalResponsibilityEmploymentIds: [scope.employmentId],
      employees: [
        {
          employmentId: scope.employmentId,
          completedFullShift: true,
          regularWorkedMinutes: 1,
          overtimeMinutes: 60,
        },
      ],
      machines: night
        ? []
        : [{ machineId: scope.machineId, endMeterReadingValue: "2174.60" }],
      executedActivities: "Transporte de material para a área do açude.",
      interferences: "Parada para manutenção do ar-condicionado.",
    };
  }

  it("creates one draft per shift and isolates reports by company", async () => {
    const scope = await setup();
    await app.prisma.project.update({
      where: { id: scope.projectId },
      data: { status: "PAUSED" },
    });
    const unavailable = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${scope.projectId}/daily-reports/options?reportDate=${scope.reportDate}&shift=day`,
      headers: { authorization: scope.authorization },
    });
    expect(unavailable.statusCode, unavailable.body).toBe(409);
    expect(unavailable.json().code).toBe("DAILY_REPORT_PROJECT_UNAVAILABLE");
    await app.prisma.project.update({
      where: { id: scope.projectId },
      data: { status: "ACTIVE" },
    });
    const options = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${scope.projectId}/daily-reports/options?reportDate=${scope.reportDate}&shift=day`,
      headers: { authorization: scope.authorization },
    });
    expect(options.statusCode, options.body).toBe(200);
    expect(options.json().data.defaults.scheduleScale).toBe("Seg. a Sáb.");
    expect(options.json().data.machineOptions[0].startMeterReading.value).toBe(
      "2168.10",
    );

    const created = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${scope.projectId}/daily-reports`,
      headers: { authorization: scope.authorization },
      payload: command(scope),
    });
    expect(created.statusCode, created.body).toBe(201);
    expect(created.json().data.employees[0]).toMatchObject({
      name: "Rafael Brito",
      completedFullShift: true,
      regularWorkedMinutes: 600,
      overtimeMinutes: 60,
    });
    const reportId = created.json().data.id as string;
    const updated = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${scope.projectId}/daily-reports/${reportId}`,
      headers: { authorization: scope.authorization },
      payload: {
        ...command(scope),
        executedActivities: "Atividade atualizada no rascunho.",
      },
    });
    expect(updated.statusCode, updated.body).toBe(200);
    expect(updated.json().data.executedActivities).toBe(
      "Atividade atualizada no rascunho.",
    );
    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${scope.projectId}/daily-reports/${reportId}`,
      headers: { authorization: scope.authorization },
    });
    expect(detail.statusCode, detail.body).toBe(200);
    expect(detail.json().data.project).toMatchObject({
      name: "Jardim das Oliveiras",
      municipality: "Imperatriz",
      state: "MA",
    });

    const duplicate = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${scope.projectId}/daily-reports`,
      headers: { authorization: scope.authorization },
      payload: command(scope),
    });
    expect(duplicate.statusCode, duplicate.body).toBe(409);
    expect(duplicate.json().code).toBe("DAILY_REPORT_ALREADY_EXISTS");

    const night = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${scope.projectId}/daily-reports`,
      headers: { authorization: scope.authorization },
      payload: command(scope, "night"),
    });
    expect(night.statusCode, night.body).toBe(201);

    const firstPage = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${scope.projectId}/daily-reports?limit=1`,
      headers: { authorization: scope.authorization },
    });
    expect(firstPage.statusCode, firstPage.body).toBe(200);
    expect(firstPage.json().data.data).toHaveLength(1);
    expect(firstPage.json().data.data[0].shift).toBe("night");
    expect(firstPage.json().data.pageInfo.hasNextPage).toBe(true);
    const secondPage = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${scope.projectId}/daily-reports?limit=1&cursor=${encodeURIComponent(firstPage.json().data.pageInfo.nextCursor)}`,
      headers: { authorization: scope.authorization },
    });
    expect(secondPage.statusCode, secondPage.body).toBe(200);
    expect(secondPage.json().data.data[0].shift).toBe("day");

    const isolated = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${scope.projectId}/daily-reports`,
      headers: { authorization: scope.otherAuthorization },
    });
    expect(isolated.statusCode, isolated.body).toBe(200);
    expect(isolated.json().data.data).toEqual([]);
  });

  it("finalizes atomically, creates meter references and becomes immutable", async () => {
    const scope = await setup();
    const created = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${scope.projectId}/daily-reports`,
      headers: { authorization: scope.authorization },
      payload: command(scope),
    });
    expect(created.statusCode, created.body).toBe(201);
    const reportId = created.json().data.id as string;

    const finalized = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${scope.projectId}/daily-reports/${reportId}/finalize`,
      headers: { authorization: scope.authorization },
    });
    expect(finalized.statusCode, finalized.body).toBe(200);
    expect(finalized.json().data.status).toBe("finalized");
    expect(finalized.json().data.machines[0].endMeterReading.id).toEqual(
      expect.any(String),
    );
    const readings = await app.prisma.machineMeterReading.findMany({
      where: { machineId: scope.machineId },
      orderBy: { readingSequence: "asc" },
      include: { references: true },
    });
    expect(readings).toHaveLength(2);
    expect(readings[1]).toMatchObject({
      readingSequence: 2,
      purpose: "ORDINARY",
    });
    expect(
      readings.flatMap((reading) =>
        reading.references.map((reference) => reference.sourceType),
      ),
    ).toEqual(
      expect.arrayContaining([
        "PROJECT_DAILY_REPORT_START",
        "PROJECT_DAILY_REPORT_END",
      ]),
    );

    const nightCommand = command(scope, "night");
    nightCommand.machines = [
      { machineId: scope.machineId, endMeterReadingValue: "2176.00" },
    ];
    const night = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${scope.projectId}/daily-reports`,
      headers: { authorization: scope.authorization },
      payload: nightCommand,
    });
    expect(night.statusCode, night.body).toBe(201);
    expect(night.json().data.machines[0].startMeterReading.value).toBe(
      "2174.60",
    );
    const finalizedNight = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${scope.projectId}/daily-reports/${night.json().data.id}/finalize`,
      headers: { authorization: scope.authorization },
    });
    expect(finalizedNight.statusCode, finalizedNight.body).toBe(200);
    const chainedReadings = await app.prisma.machineMeterReading.findMany({
      where: { machineId: scope.machineId },
      orderBy: { readingSequence: "asc" },
    });
    expect(chainedReadings).toHaveLength(3);
    expect(chainedReadings[2]).toMatchObject({ readingSequence: 3 });
    expect(chainedReadings[2]!.value.toFixed(2)).toBe("2176.00");

    const update = await app.inject({
      method: "PUT",
      url: `/api/v1/projects/${scope.projectId}/daily-reports/${reportId}`,
      headers: { authorization: scope.authorization },
      payload: command(scope),
    });
    expect(update.statusCode, update.body).toBe(409);
    expect(update.json().code).toBe("DAILY_REPORT_IMMUTABLE");
  });

  it("rolls back finalization when the initial machine reading is stale", async () => {
    const scope = await setup();
    const created = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${scope.projectId}/daily-reports`,
      headers: { authorization: scope.authorization },
      payload: command(scope),
    });
    expect(created.statusCode, created.body).toBe(201);
    const reportId = created.json().data.id as string;
    await app.prisma.machineMeterReading.create({
      data: {
        corporationId: (
          await app.prisma.project.findUniqueOrThrow({
            where: { id: scope.projectId },
          })
        ).corporationId,
        companyId: (
          await app.prisma.project.findUniqueOrThrow({
            where: { id: scope.projectId },
          })
        ).companyId,
        machineId: scope.machineId,
        readingSequence: 2,
        value: "2170.00",
        purpose: "ORDINARY",
        actorUserId: (
          await app.prisma.projectDailyReport.findUniqueOrThrow({
            where: { id: reportId },
          })
        ).createdByUserId,
        recordedAt: new Date(),
      },
    });
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${scope.projectId}/daily-reports/${reportId}/finalize`,
      headers: { authorization: scope.authorization },
    });
    expect(response.statusCode, response.body).toBe(409);
    expect(response.json().code).toBe("DAILY_REPORT_METER_READING_CONFLICT");
    const report = await app.prisma.projectDailyReport.findUniqueOrThrow({
      where: { id: reportId },
      include: { machineEntries: true },
    });
    expect(report.status).toBe("DRAFT");
    expect(report.machineEntries[0]?.endMeterReadingId).toBeNull();
  });
});

function dateInSaoPauloDaysAgo(days: number) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const current = new Date(
    Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)),
  );
  current.setUTCDate(current.getUTCDate() - days);
  return current.toISOString().slice(0, 10);
}
