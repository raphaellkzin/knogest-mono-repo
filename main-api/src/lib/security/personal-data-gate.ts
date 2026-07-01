import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const requiredGateSections = [
  "## Scope",
  "## Purpose",
  "## Legal Basis",
  "## Authorized Access",
  "## Retention",
  "## Disposal",
  "## Incident Responsibility",
  "## Approval Evidence",
  "## Operational Limits",
];

const cpfOrCnpjPattern =
  /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b|\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g;
const syntheticContextPattern =
  /synthetic|sintetico|sintético|fixture|test|example|invalid/i;
const ignoredDirs = new Set([
  ".git",
  "node_modules",
  "dist",
  ".next",
  "coverage",
  "src/db/generated",
]);
const scannedRoots = [
  "docs",
  "main-api/prisma/seeds",
  "main-api/src",
  "main-api/tests",
  "main-web-app/tests",
];
const scannedExtensions = new Set([
  ".md",
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".json",
  ".sql",
]);

export interface PersonalDataGateValidationResult {
  ok: boolean;
  errors: string[];
}

function lineFor(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function validateGateDocuments({
  checklistSource,
  gateSource,
}: {
  checklistSource: string;
  gateSource: string;
}): string[] {
  const errors: string[] = [];

  for (const section of requiredGateSections) {
    if (!gateSource.includes(section)) {
      errors.push(`Missing gate section: ${section}`);
    }
  }

  for (const field of ["Approver", "Approval timestamp", "Approval scope"]) {
    if (!new RegExp(`- ${field}:\\s+\\S+`).test(gateSource)) {
      errors.push(`Missing approval evidence field: ${field}`);
    }
  }

  if (!gateSource.includes("blocked-pending-approval")) {
    errors.push("Gate must stay blocked until real approval is recorded");
  }
  if (!checklistSource.includes("blocked-pending-approval")) {
    errors.push(
      "Checklist must block real CPF/CNPJ entry while approval is pending",
    );
  }
  if (!checklistSource.includes("approved-for-real-document-entry")) {
    errors.push("Checklist must name the explicit approved status");
  }
  if (!/checksum validity is only\s+format\s+validation/i.test(checklistSource)) {
    errors.push("Checklist must state checksum validity is not identity proof");
  }

  return errors;
}

async function collectFiles(repoRoot: string, root: string): Promise<string[]> {
  const absoluteRoot = path.join(repoRoot, root);
  const files: string[] = [];

  async function visit(dir: string) {
    const relativeDir = path.relative(repoRoot, dir);
    if ([...ignoredDirs].some((ignored) => relativeDir.includes(ignored))) {
      return;
    }

    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
        continue;
      }
      if (scannedExtensions.has(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  await visit(absoluteRoot);
  return files;
}

async function validateSyntheticFixturePolicy(
  repoRoot: string,
): Promise<string[]> {
  const errors: string[] = [];
  const files = (
    await Promise.all(scannedRoots.map((root) => collectFiles(repoRoot, root)))
  ).flat();

  for (const filePath of files) {
    const source = await readFile(filePath, "utf8");
    for (const match of source.matchAll(cpfOrCnpjPattern)) {
      const index = match.index ?? 0;
      const context = source.slice(
        Math.max(0, index - 140),
        Math.min(source.length, index + match[0].length + 140),
      );
      if (!syntheticContextPattern.test(context)) {
        errors.push(
          `${path.relative(repoRoot, filePath)}:${lineFor(source, index)} contains CPF/CNPJ-like value without synthetic context`,
        );
      }
    }
  }

  return errors;
}

export async function validatePersonalDataGate(
  repoRoot = path.resolve(process.cwd(), ".."),
): Promise<PersonalDataGateValidationResult> {
  const gateSource = await readFile(
    path.join(repoRoot, "docs", "compliance", "pilot-personal-data-gate.md"),
    "utf8",
  );
  const checklistSource = await readFile(
    path.join(repoRoot, "docs", "compliance", "pilot-readiness-checklist.md"),
    "utf8",
  );
  const errors = [
    ...validateGateDocuments({ gateSource, checklistSource }),
    ...(await validateSyntheticFixturePolicy(repoRoot)),
  ];

  return { ok: errors.length === 0, errors };
}
