function digits(value: string, limit: number) {
  return value.replace(/\D/g, "").slice(0, limit);
}

export function formatCpf(value: string) {
  const valueDigits = digits(value, 11);
  if (valueDigits.length <= 3) return valueDigits;
  if (valueDigits.length <= 6)
    return `${valueDigits.slice(0, 3)}.${valueDigits.slice(3)}`;
  if (valueDigits.length <= 9)
    return `${valueDigits.slice(0, 3)}.${valueDigits.slice(3, 6)}.${valueDigits.slice(6)}`;
  return `${valueDigits.slice(0, 3)}.${valueDigits.slice(3, 6)}.${valueDigits.slice(6, 9)}-${valueDigits.slice(9)}`;
}

export function formatCnpj(value: string) {
  const valueDigits = digits(value, 14);
  if (valueDigits.length <= 2) return valueDigits;
  if (valueDigits.length <= 5)
    return `${valueDigits.slice(0, 2)}.${valueDigits.slice(2)}`;
  if (valueDigits.length <= 8)
    return `${valueDigits.slice(0, 2)}.${valueDigits.slice(2, 5)}.${valueDigits.slice(5)}`;
  if (valueDigits.length <= 12)
    return `${valueDigits.slice(0, 2)}.${valueDigits.slice(2, 5)}.${valueDigits.slice(5, 8)}/${valueDigits.slice(8)}`;
  return `${valueDigits.slice(0, 2)}.${valueDigits.slice(2, 5)}.${valueDigits.slice(5, 8)}/${valueDigits.slice(8, 12)}-${valueDigits.slice(12)}`;
}

export function formatBrazilianPhone(value: string) {
  const rawDigits = value.replace(/\D/g, "");
  const valueDigits = digits(
    rawDigits.length > 11 && rawDigits.startsWith("55")
      ? rawDigits.slice(2)
      : rawDigits,
    11,
  );
  if (valueDigits.length <= 2) return valueDigits;
  const local = valueDigits.slice(2);
  if (local.length <= 4) return `(${valueDigits.slice(0, 2)}) ${local}`;
  if (valueDigits.length <= 10)
    return `(${valueDigits.slice(0, 2)}) ${local.slice(0, 4)}-${local.slice(4)}`;
  return `(${valueDigits.slice(0, 2)}) ${local.slice(0, 5)}-${local.slice(5)}`;
}

export function formatCep(value: string) {
  const valueDigits = digits(value, 8);
  if (valueDigits.length <= 5) return valueDigits;
  return `${valueDigits.slice(0, 5)}-${valueDigits.slice(5)}`;
}

export function onlyDigits(value: string, limit?: number) {
  const valueDigits = value.replace(/\D/g, "");
  return typeof limit === "number" ? valueDigits.slice(0, limit) : valueDigits;
}

export function formatBrazilianDecimalInput(value: string, fractionDigits = 2) {
  const valueDigits = onlyDigits(value, 18 + fractionDigits);
  if (!valueDigits) return "";
  const padded = valueDigits.padStart(fractionDigits + 1, "0");
  const whole = padded.slice(0, -fractionDigits).replace(/^0+(?=\d)/u, "");
  const fraction = padded.slice(-fractionDigits);
  return `${formatThousands(whole || "0")},${fraction}`;
}

export function decimalInputToCanonical(value: string, fractionDigits = 2) {
  const valueDigits = onlyDigits(value, 18 + fractionDigits);
  if (!valueDigits) return "";
  const padded = valueDigits.padStart(fractionDigits + 1, "0");
  const whole = padded.slice(0, -fractionDigits).replace(/^0+(?=\d)/u, "");
  const fraction = padded.slice(-fractionDigits);
  return `${whole || "0"}.${fraction}`;
}

export function decimalInputToCanonicalFixed(
  value: string,
  inputFractionDigits = 2,
  outputFractionDigits = inputFractionDigits,
) {
  const canonical = decimalInputToCanonical(value, inputFractionDigits);
  if (!canonical) return "";
  const [whole, fraction = ""] = canonical.split(".");
  return `${whole}.${fraction.padEnd(outputFractionDigits, "0").slice(0, outputFractionDigits)}`;
}

export function canonicalDecimalToBrazilian(value: string, fractionDigits = 2) {
  if (!/^\d+(?:\.\d+)?$/u.test(value)) return value;
  const [whole, fraction = ""] = value.split(".");
  return `${formatThousands(whole.replace(/^0+(?=\d)/u, "") || "0")},${fraction.padEnd(fractionDigits, "0").slice(0, fractionDigits)}`;
}

function formatThousands(value: string) {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}
