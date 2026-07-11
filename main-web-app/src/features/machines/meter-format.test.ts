import { describe, expect, it } from "vitest";

import { formatMeterReading, meterTypeLabel } from "./meter-format";

describe("machine meter format", () => {
  it("formats an hour-meter reading without losing decimal-string precision", () => {
    expect(formatMeterReading("1250.5", "HOUR_METER")).toBe("1.250,50 h");
  });

  it("formats an odometer reading and its label", () => {
    expect(formatMeterReading("82430.00", "ODOMETER")).toBe("82.430,00 km");
    expect(meterTypeLabel("ODOMETER")).toBe("Quilometragem");
  });
});
