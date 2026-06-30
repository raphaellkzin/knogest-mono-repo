import { domainToASCII } from "node:url";

const HOST_LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

export function normalizeHost(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || trimmed.includes("://") || /[/\\?#@*\s]/.test(trimmed)) {
    throw new Error("Invalid host");
  }
  const withoutPort = trimmed.replace(/:\d{1,5}$/, "");
  if (withoutPort.includes(":")) throw new Error("Invalid host");
  const ascii = domainToASCII(withoutPort).replace(/\.$/, "");
  const labels = ascii.split(".");
  if (
    !ascii ||
    ascii.length > 253 ||
    labels.some((label) => !HOST_LABEL.test(label))
  ) {
    throw new Error("Invalid host");
  }
  return ascii;
}
