import { describe, expect, it } from "vitest";
import { emptyProjectCommand, projectCommandSchema } from "./projects-schema";

const valid = () => ({
  ...structuredClone(emptyProjectCommand),
  name: "Obra Norte",
  address: "Rua A, 10",
  approvedBudget: "100.00",
  plannedStartDate: "2026-07-01",
  plannedEndDate: "2026-07-31",
  clientId: "00000000-0000-4000-8000-000000000201",
  managerEmploymentId: "00000000-0000-4000-8000-000000000301",
  technicalResponsibilityEmploymentIds: [
    "00000000-0000-4000-8000-000000000301",
  ],
});

describe("projectCommandSchema", () => {
  it("normalizes the exact command without binary decimals", () => {
    const parsed = projectCommandSchema.parse(valid());
    expect(parsed.approvedBudget).toBe("100.00");
    expect(parsed.weeklySchedule).toHaveLength(7);
  });

  it("rejects reversed dates, partial coordinates and duplicate responsibilities", () => {
    const command = valid();
    command.plannedEndDate = "2026-06-30";
    command.latitude = "-3.700000";
    command.technicalResponsibilityEmploymentIds.push(
      command.managerEmploymentId,
    );
    expect(projectCommandSchema.safeParse(command).success).toBe(false);
  });

  it("accepts inclusive optional collection limits", () => {
    const command = valid();
    command.breakTemplates = Array.from({ length: 10 }, (_, index) => ({
      name: `Pausa ${index}`,
      durationMinutes: 1,
    }));
    expect(projectCommandSchema.safeParse(command).success).toBe(true);
    command.breakTemplates.push({
      name: "Pausa excedente",
      durationMinutes: 1,
    });
    expect(projectCommandSchema.safeParse(command).success).toBe(false);
  });
});
