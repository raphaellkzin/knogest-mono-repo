import { describe, expect, it } from "vitest";
import {
  formatProjectAddress,
  projectCommandSchema,
  projectIdempotencyKeySchema,
  projectReadinessCommandSchema,
  type ProjectCommand,
} from "./projects.dto";

const supplierOffer = (): ProjectCommand["projectSupplierOffers"][number] => ({
  supplierId: "00000000-0000-4000-8000-000000000701",
  itemId: "00000000-0000-4000-8000-000000000702",
  sourceOfferId: null,
  purchaseUnitId: "00000000-0000-4000-8000-00000000a001",
  conversionToBase: "1.000000",
  price: "1.0000",
});

const command: ProjectCommand = {
  name: "Project",
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
  approvedBudget: "0.00",
  plannedStartDate: "2026-07-01",
  plannedEndDate: null,
  clientId: "00000000-0000-4000-8000-000000000201",
  managerEmploymentId: "00000000-0000-4000-8000-000000000301",
  technicalResponsibilityEmploymentIds: [
    "00000000-0000-4000-8000-000000000301",
  ],
  weeklySchedule: Array.from({ length: 7 }, (_, index) => ({
    dayOfWeek: index + 1,
    isWorking: index === 0,
    startTime: index === 0 ? "08:00" : null,
    endTime: index === 0 ? "17:00" : null,
  })),
  breakTemplates: [],
  initialEmployeeAllocations: [],
  initialMachineAllocations: [],
  projectSupplierOffers: [],
};

describe("Projects DTO", () => {
  it("accepts the minimal aggregate", () =>
    expect(projectCommandSchema.safeParse(command).success).toBe(true));

  it("keeps supplier offers optional while validating populated entries", () => {
    expect(
      projectCommandSchema.safeParse({
        ...command,
        projectSupplierOffers: [supplierOffer()],
      }).success,
    ).toBe(true);
    expect(
      projectCommandSchema.safeParse({
        ...command,
        projectSupplierOffers: [
          {
            ...supplierOffer(),
            supplierId: undefined,
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("accepts readiness offers from existing, project-only and company catalog sources", () => {
    expect(
      projectReadinessCommandSchema.safeParse({
        fuelOffers: [
          {
            mode: "existing",
            sourceOfferId: "00000000-0000-4000-8000-000000000701",
            price: "7.5000",
          },
          {
            mode: "projectOnly",
            supplierId: "00000000-0000-4000-8000-000000000702",
            itemId: "00000000-0000-4000-8000-000000000703",
            purchaseUnitId: "00000000-0000-4000-8000-000000000704",
            conversionToBase: "1.000000",
            price: "7.7000",
          },
          {
            mode: "companyCatalog",
            supplierId: "00000000-0000-4000-8000-000000000705",
            itemId: "00000000-0000-4000-8000-000000000706",
            purchaseUnitId: "00000000-0000-4000-8000-000000000707",
            conversionToBase: "1.000000",
            price: "7.9000",
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts addresses without numbers", () => {
    expect(
      projectCommandSchema.safeParse({
        ...command,
        address: { ...command.address, number: "" },
      }).success,
    ).toBe(true);
    expect(
      projectCommandSchema.safeParse({
        ...command,
        address: { ...command.address, number: null },
      }).success,
    ).toBe(true);
    expect(
      projectCommandSchema.safeParse({
        ...command,
        address: {
          postalCode: command.address.postalCode,
          street: command.address.street,
          complement: command.address.complement,
          neighborhood: command.address.neighborhood,
          city: command.address.city,
          state: command.address.state,
        },
      }).success,
    ).toBe(true);
  });

  it("formats addresses without a dangling number separator", () => {
    expect(
      formatProjectAddress({ ...command.address, number: null }),
    ).toContain("Rua A - Meireles");
    expect(
      formatProjectAddress({ ...command.address, number: null }),
    ).not.toContain("Rua A,");
  });

  it("rejects incomplete addresses and reversed optional end dates", () => {
    expect(
      projectCommandSchema.safeParse({
        ...command,
        address: { ...command.address, postalCode: "60170-000" },
      }).success,
    ).toBe(false);
    expect(
      projectCommandSchema.safeParse({
        ...command,
        plannedEndDate: "2026-06-30",
      }).success,
    ).toBe(false);
  });
  it("rejects unknown properties and over-limit collections", () => {
    expect(
      projectCommandSchema.safeParse({
        ...command,
        companyId: crypto.randomUUID(),
      }).success,
    ).toBe(false);
    expect(
      projectCommandSchema.safeParse({
        ...command,
        breakTemplates: Array.from({ length: 11 }, (_, index) => ({
          name: `B${index}`,
          durationMinutes: 1,
        })),
      }).success,
    ).toBe(false);
  });
  it("requires a UUID v4 idempotency key", () => {
    expect(
      projectIdempotencyKeySchema.safeParse(
        "00000000-0000-4000-8000-000000000001",
      ).success,
    ).toBe(true);
    expect(
      projectIdempotencyKeySchema.safeParse(
        "00000000-0000-3000-8000-000000000001",
      ).success,
    ).toBe(false);
  });
  it("requires each initial Machine operator to be part of the initial team", () => {
    const operator = "00000000-0000-4000-8000-000000000302";
    expect(
      projectCommandSchema.safeParse({
        ...command,
        initialEmployeeAllocations: [
          {
            employmentId: operator,
            confirmedJobRolePeriodId: "00000000-0000-4000-8000-000000000402",
            expectedDailyWorkloadMinutes: 480,
            compensationMode: "monthly",
            compensationValue: "0.00",
            overtimeRate: "0.00",
          },
        ],
        initialMachineAllocations: [
          {
            machineId: "00000000-0000-4000-8000-000000000501",
            startMeterReadingId: "00000000-0000-4000-8000-000000000601",
            operatorEmploymentId: operator,
          },
        ],
      }).success,
    ).toBe(true);
    expect(
      projectCommandSchema.safeParse({
        ...command,
        initialEmployeeAllocations: [
          {
            employmentId: operator,
            confirmedJobRolePeriodId: "00000000-0000-4000-8000-000000000402",
            expectedDailyWorkloadMinutes: 480,
            compensationMode: "monthly",
            compensationValue: "0.00",
            overtimeRate: "0.00",
          },
        ],
        initialMachineAllocations: [
          {
            machineId: "00000000-0000-4000-8000-000000000501",
            startMeterReadingId: "00000000-0000-4000-8000-000000000601",
            operatorEmploymentId: operator,
          },
          {
            machineId: "00000000-0000-4000-8000-000000000502",
            startMeterReadingId: "00000000-0000-4000-8000-000000000602",
            operatorEmploymentId: operator,
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      projectCommandSchema.safeParse({
        ...command,
        initialMachineAllocations: [
          {
            machineId: "00000000-0000-4000-8000-000000000501",
            startMeterReadingId: "00000000-0000-4000-8000-000000000601",
            operatorEmploymentId: operator,
          },
        ],
      }).success,
    ).toBe(false);
  });
});
