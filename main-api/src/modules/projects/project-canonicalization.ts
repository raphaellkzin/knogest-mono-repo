import { createHash } from "node:crypto";
import type { ProjectCommand } from "./projects.dto";

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, canonicalize(nested)]),
    );
  return typeof value === "string" ? value.normalize("NFC") : value;
};

export function canonicalProjectCommand(command: ProjectCommand) {
  const semantic = {
    ...command,
    technicalResponsibilityEmploymentIds: [
      ...command.technicalResponsibilityEmploymentIds,
    ].sort(),
    initialEmployeeAllocations: [...command.initialEmployeeAllocations].sort(
      (a, b) => a.employmentId.localeCompare(b.employmentId),
    ),
    initialMachineAllocations: [...command.initialMachineAllocations].sort(
      (a, b) => a.machineId.localeCompare(b.machineId),
    ),
    projectSupplierOffers: [...command.projectSupplierOffers].sort((a, b) =>
      [
        a.supplierId ?? a.supplier?.document ?? "",
        a.itemId ?? a.item?.name ?? "",
        a.purchaseUnitId,
      ]
        .join(":")
        .localeCompare(
          [
            b.supplierId ?? b.supplier?.document ?? "",
            b.itemId ?? b.item?.name ?? "",
            b.purchaseUnitId,
          ].join(":"),
        ),
    ),
  };
  return `project-finalization:v1\n${JSON.stringify(canonicalize(semantic))}`;
}

export function hashProjectCommand(command: ProjectCommand) {
  return createHash("sha256")
    .update(canonicalProjectCommand(command), "utf8")
    .digest("hex");
}
