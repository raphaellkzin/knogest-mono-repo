export type MeterType = "HOUR_METER" | "ODOMETER";

export function meterTypeLabel(meterType: MeterType) {
  return meterType === "HOUR_METER" ? "Horímetro" : "Quilometragem";
}

export function meterUnit(meterType: MeterType) {
  return meterType === "HOUR_METER" ? "h" : "km";
}

/** Formats API decimal strings without converting precision-sensitive values to JS numbers. */
export function formatMeterReading(value: string, meterType: MeterType) {
  const [whole = "0", decimal = ""] = value.split(".");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fraction = decimal.padEnd(2, "0").slice(0, 2);
  return `${groupedWhole},${fraction} ${meterUnit(meterType)}`;
}
