import { decimalInputToCanonicalFixed } from "@/lib/brazilian-input-mask";

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function suppliedItemPayload(formData: FormData) {
  const valueUnitQuantity =
    optionalString(formData, "useValueUnit") &&
    optionalString(formData, "valueUnitQuantity")
      ? decimalInputToCanonicalFixed(
          optionalString(formData, "valueUnitQuantity") ?? "",
          6,
          6,
        )
      : "1.000000";
  const basePrice = optionalString(formData, "basePrice")
    ? decimalInputToCanonicalFixed(
        optionalString(formData, "basePrice") ?? "",
        4,
        4,
      )
    : "0.0000";
  return {
    name: optionalString(formData, "name") ?? "",
    baseUnitId: optionalString(formData, "baseUnitId") ?? "",
    categoryId: optionalString(formData, "categoryId") ?? null,
    valueUnitQuantity,
    basePrice,
  };
}
