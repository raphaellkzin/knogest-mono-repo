import { describe, expect, it } from "vitest";

import {
  canonicalDecimalToBrazilian,
  canonicalDecimalToBrazilianInteger,
  decimalInputToCanonical,
  formatBrazilianDecimalInput,
  formatBrazilianIntegerInput,
  formatBrazilianPhone,
  formatCep,
  formatCnpj,
  formatCpf,
  integerInputToCanonicalDecimal,
} from "./brazilian-input-mask";

describe("Brazilian operational input masks", () => {
  it("formats CPF and CNPJ progressively while capping pasted digits", () => {
    expect(formatCpf("123456789012")).toBe("123.456.789-01");
    expect(formatCnpj("CNPJ 1234567800019912")).toBe("12.345.678/0001-99");
  });

  it("uses fixed Brazilian formats for telephone and CEP", () => {
    expect(formatBrazilianPhone("119876543210")).toBe("(11) 98765-4321");
    expect(formatBrazilianPhone("1134567890")).toBe("(11) 3456-7890");
    expect(formatBrazilianPhone("+55 (11) 98765-4321")).toBe("(11) 98765-4321");
    expect(formatCep("CEP 01310930x")).toBe("01310-930");
  });

  it("keeps partial input editable", () => {
    expect(formatCpf("1234")).toBe("123.4");
    expect(formatCnpj("123")).toBe("12.3");
    expect(formatBrazilianPhone("11")).toBe("11");
    expect(formatCep("01310")).toBe("01310");
  });

  it("formats and normalizes Brazilian decimal money input", () => {
    expect(formatBrazilianDecimalInput("R$ 123456")).toBe("1.234,56");
    expect(formatBrazilianDecimalInput("12000000")).toBe("120.000,00");
    expect(decimalInputToCanonical("1.234,56")).toBe("1234.56");
    expect(canonicalDecimalToBrazilian("1234.5")).toBe("1.234,50");
    expect(formatBrazilianDecimalInput("123456", 4)).toBe("12,3456");
  });

  it("formats and normalizes Brazilian integer metric input", () => {
    expect(formatBrazilianIntegerInput("1234567")).toBe("1.234.567");
    expect(formatBrazilianIntegerInput("R$ 1.234,56")).toBe("1.234");
    expect(formatBrazilianIntegerInput("")).toBe("");
    expect(integerInputToCanonicalDecimal("1.234.567")).toBe("1234567.00");
    expect(integerInputToCanonicalDecimal("")).toBe("");
    expect(integerInputToCanonicalDecimal("0")).toBe("0.00");
    expect(canonicalDecimalToBrazilianInteger("1234.00")).toBe("1.234");
  });
});
