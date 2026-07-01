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
    projectFuelAgreements: [...command.projectFuelAgreements]
      .map((agreement) => ({
        ...agreement,
        fuelTypes: [...agreement.fuelTypes].sort((a, b) =>
          a.fuelTypeId.localeCompare(b.fuelTypeId),
        ),
      }))
      .sort((a, b) => a.fuelSupplierId.localeCompare(b.fuelSupplierId)),
  };
  return `project-finalization:v1\n${JSON.stringify(canonicalize(semantic))}`;
}

export function hashProjectCommand(command: ProjectCommand) {
  return createHash("sha256")
    .update(canonicalProjectCommand(command), "utf8")
    .digest("hex");
}
