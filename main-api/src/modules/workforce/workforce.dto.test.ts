import { describe, expect, it } from "vitest";

import { createEmployeeSchema, listEmployeesQuerySchema } from "./workforce.dto";

describe("workforce DTOs", () => {
  it("accepts the minimal Employee registration command", () => {
    expect(
      createEmployeeSchema.parse({
        document: "529.982.247-25",
        fullName: "Synthetic Worker",
        companyRegistrationNumber: "EMP-001",
        admissionDate: "2026-07-01",
      }),
    ).toMatchObject({
      fullName: "Synthetic Worker",
      companyRegistrationNumber: "EMP-001",
    });
  });

  it("rejects scope and lifecycle fields from Employee registration payloads", () => {
    expect(() =>
      createEmployeeSchema.parse({
        document: "529.982.247-25",
        fullName: "Synthetic Worker",
        companyRegistrationNumber: "EMP-001",
        admissionDate: "2026-07-01",
        corporationId: "00000000-0000-0000-0000-000000000000",
        isActive: false,
      }),
    ).toThrow();
  });

  it("normalizes list query defaults and allowlists filters", () => {
    expect(listEmployeesQuerySchema.parse({})).toEqual({
      limit: 25,
      sortBy: "createdAt",
      sortDirection: "desc",
    });
    expect(() => listEmployeesQuerySchema.parse({ sortBy: "role" })).toThrow();
  });
});
