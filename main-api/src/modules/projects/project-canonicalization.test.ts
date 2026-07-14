import { describe, expect, it } from "vitest";
import { canonicalProjectCommand } from "./project-canonicalization";

describe("canonicalProjectCommand", () => {
  it("uses a version prefix and canonical object keys", () => {
    const value = canonicalProjectCommand({
      name: "A",
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
      plannedStartDate: "2026-01-01",
      plannedEndDate: null,
      clientId: "00000000-0000-4000-8000-000000000001",
      managerEmploymentId: "00000000-0000-4000-8000-000000000002",
      technicalResponsibilityEmploymentIds: [
        "00000000-0000-4000-8000-000000000002",
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
    });
    expect(value.startsWith("project-finalization:v1\n")).toBe(true);
  });
});
