export type SensitiveDocumentType = "CPF" | "CNPJ";

const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;

export function normalizeDocument(input: string): string {
  const normalized = input.replace(/\D/g, "");
  if (normalized.length !== CPF_LENGTH && normalized.length !== CNPJ_LENGTH) {
    throw new Error("Invalid document");
  }
  return normalized;
}

export function normalizeCpf(input: string): string {
  const normalized = normalizeDocument(input);
  if (normalized.length !== CPF_LENGTH) {
    throw new Error("Invalid CPF");
  }
  return normalized;
}

export function normalizeCnpj(input: string): string {
  const normalized = normalizeDocument(input);
  if (normalized.length !== CNPJ_LENGTH) {
    throw new Error("Invalid CNPJ");
  }
  return normalized;
}

function hasRepeatedDigits(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

function calculateCpfDigit(value: string, factor: number): number {
  let total = 0;
  for (const digit of value) {
    total += Number(digit) * factor;
    factor -= 1;
  }
  const remainder = (total * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function calculateCnpjDigit(value: string, factors: number[]): number {
  const total = value
    .split("")
    .reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
  const remainder = total % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function validateCpfChecksum(input: string): boolean {
  const cpf = normalizeCpf(input);
  if (hasRepeatedDigits(cpf)) return false;

  const firstDigit = calculateCpfDigit(cpf.slice(0, 9), 10);
  const secondDigit = calculateCpfDigit(cpf.slice(0, 10), 11);
  return cpf.endsWith(`${firstDigit}${secondDigit}`);
}

export function validateCnpjChecksum(input: string): boolean {
  const cnpj = normalizeCnpj(input);
  if (hasRepeatedDigits(cnpj)) return false;

  const firstDigit = calculateCnpjDigit(cnpj.slice(0, 12), [
    5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);
  const secondDigit = calculateCnpjDigit(cnpj.slice(0, 13), [
    6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);
  return cnpj.endsWith(`${firstDigit}${secondDigit}`);
}

export function detectDocumentType(input: string): SensitiveDocumentType {
  const normalized = normalizeDocument(input);
  if (normalized.length === CPF_LENGTH) return "CPF";
  return "CNPJ";
}

export function validateDocument(input: string): {
  normalized: string;
  type: SensitiveDocumentType;
} {
  const normalized = normalizeDocument(input);
  const type = detectDocumentType(normalized);
  const isValid =
    type === "CPF"
      ? validateCpfChecksum(normalized)
      : validateCnpjChecksum(normalized);
  if (!isValid) {
    throw new Error(`Invalid ${type}`);
  }
  return { normalized, type };
}

export function maskCpf(input: string): string {
  const cpf = normalizeCpf(input);
  return `***.***.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}

export function maskCnpj(input: string): string {
  const cnpj = normalizeCnpj(input);
  return `**.***.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

export function maskDocument(input: string): string {
  const normalized = normalizeDocument(input);
  return normalized.length === CPF_LENGTH
    ? maskCpf(normalized)
    : maskCnpj(normalized);
}
