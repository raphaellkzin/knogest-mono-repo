import {
  decimalInputToCanonical,
  decimalInputToCanonicalFixed,
} from "@/lib/brazilian-input-mask";

function optionalString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function supplierOfferPayload(formData: FormData) {
  const itemId = optionalString(formData, "itemId");
  const itemName = optionalString(formData, "itemName");
  const baseUnitId = optionalString(formData, "baseUnitId");
  const conversionToBase =
    optionalString(formData, "conversionToBase") ?? "1,00000";
  const price = optionalString(formData, "price");
  return {
    itemId,
    itemName,
    baseUnitId,
    purchaseUnitId: baseUnitId,
    conversionToBase: decimalInputToCanonicalFixed(conversionToBase, 5, 6),
    price: price ? decimalInputToCanonical(price, 4) : undefined,
  };
}
