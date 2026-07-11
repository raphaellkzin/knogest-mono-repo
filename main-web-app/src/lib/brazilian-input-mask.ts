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
