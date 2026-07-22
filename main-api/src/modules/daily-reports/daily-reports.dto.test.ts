import { describe, expect, it } from "vitest";

import { dailyReportCommandSchema } from "./daily-reports.dto";

const id = (suffix: string) =>
  `00000000-0000-4000-8000-${suffix.padStart(12, "0")}`;

function validCommand() {
  return {
    reportDate: "2026-07-20",
    shift: "day",
    schedulePeriods: [
      {
        startTime: "07:00",
        endTime: "12:00",
        startDayOffset: 0,
        endDayOffset: 0,
      },
      {
        startTime: "13:00",
        endTime: "18:00",
        startDayOffset: 0,
        endDayOffset: 0,
      },
    ],
    activityStartTime: "07:00",
    activityEndTime: "18:00",
    activityEndDayOffset: 0,
    activityTypes: ["earthworks"],
    climateConditions: ["dry"],
    dailyRainfallMm: "0",
    monthlyRainfallMm: "0.00",
    supervisorEmploymentId: id("1"),
    technicalResponsibilityEmploymentIds: [id("2")],
    employees: [
      {
        employmentId: id("1"),
        completedFullShift: true,
        regularWorkedMinutes: 600,
        overtimeMinutes: 60,
      },
    ],
    machines: [{ machineId: id("3"), endMeterReadingValue: "2174.60" }],
    executedActivities: "Transporte e compactação de material.",
    interferences: null,
  } as const;
}

describe("dailyReportCommandSchema", () => {
  it("accepts an ordered day shift split into schedule periods", () => {
    expect(dailyReportCommandSchema.safeParse(validCommand()).success).toBe(
      true,
    );
  });

  it("accepts a night shift whose end belongs to the next day", () => {
    const result = dailyReportCommandSchema.safeParse({
      ...validCommand(),
      shift: "night",
      schedulePeriods: [
        {
          startTime: "18:00",
          endTime: "06:00",
          startDayOffset: 0,
          endDayOffset: 1,
        },
      ],
      activityStartTime: "18:00",
      activityEndTime: "06:00",
      activityEndDayOffset: 1,
    });
    expect(result.success).toBe(true);
  });

  it("infers the next day when a night shift closes before its start", () => {
    const result = dailyReportCommandSchema.safeParse({
      ...validCommand(),
      shift: "night",
      schedulePeriods: [
        {
          startTime: "18:00",
          endTime: "06:00",
          startDayOffset: 0,
          endDayOffset: 1,
        },
      ],
      activityStartTime: "18:00",
      activityEndTime: "06:00",
      activityEndDayOffset: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.activityEndDayOffset).toBe(1);
  });

  it("rejects standard or actual windows longer than 24 hours", () => {
    const result = dailyReportCommandSchema.safeParse({
      ...validCommand(),
      shift: "night",
      schedulePeriods: [
        {
          startTime: "01:00",
          endTime: "02:00",
          startDayOffset: 0,
          endDayOffset: 1,
        },
      ],
      activityStartTime: "01:00",
      activityEndTime: "02:00",
      activityEndDayOffset: 1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects overlapping or unordered standard schedule periods", () => {
    const result = dailyReportCommandSchema.safeParse({
      ...validCommand(),
      schedulePeriods: [
        {
          startTime: "13:00",
          endTime: "18:00",
          startDayOffset: 0,
          endDayOffset: 0,
        },
        {
          startTime: "07:00",
          endTime: "14:00",
          startDayOffset: 0,
          endDayOffset: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate resources and empty participant time", () => {
    const result = dailyReportCommandSchema.safeParse({
      ...validCommand(),
      employees: [
        {
          employmentId: id("1"),
          completedFullShift: false,
          regularWorkedMinutes: 0,
          overtimeMinutes: 0,
        },
        {
          employmentId: id("1"),
          completedFullShift: true,
          regularWorkedMinutes: 480,
          overtimeMinutes: 0,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a day shift that ends on the next civil day", () => {
    const result = dailyReportCommandSchema.safeParse({
      ...validCommand(),
      activityEndDayOffset: 1,
    });
    expect(result.success).toBe(false);
  });
});
