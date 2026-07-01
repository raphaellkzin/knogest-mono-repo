import { describe, expect, it } from "vitest";
import {
  projectCommandSchema,
  projectIdempotencyKeySchema,
} from "./projects.dto";

const command = {
  name: "Project",
  address: "Address",
  latitude: null,
  longitude: null,
  contractNumber: null,
  approvedBudget: "0.00",
  plannedStartDate: "2026-07-01",
  plannedEndDate: "2026-07-01",
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
  projectFuelAgreements: [],
};

describe("Projects DTO", () => {
  it("accepts the minimal aggregate", () =>
    expect(projectCommandSchema.safeParse(command).success).toBe(true));
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
});
