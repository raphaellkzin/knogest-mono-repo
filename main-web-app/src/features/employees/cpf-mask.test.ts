import { describe, expect, it } from "vitest";
import { formatCpf } from "./cpf-mask";

describe("formatCpf", () => {
  it("formats progressively and caps input at eleven digits", () => {
    expect(formatCpf("123")).toBe("123");
    expect(formatCpf("123456")).toBe("123.456");
    expect(formatCpf("12345678901")).toBe("123.456.789-01");
    expect(formatCpf("123.456.789-01234")).toBe("123.456.789-01");
  });

  it("accepts pasted punctuation and removes non-numeric input", () => {
    expect(formatCpf("CPF 123.456.789-01")).toBe("123.456.789-01");
  });
});
