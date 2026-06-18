import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = path.join(rootDir, "src", "modules");

const forbiddenImportPattern =
  /from\s+["'].*(?:@db|db\/generated\/prisma|db\/prisma\.db|generated\/prisma)["']/;
const forbiddenPrismaTypePattern = /\bPrismaClient\b|\bPrisma\./;
const forbiddenDirectAccessPattern =
  /\b(?:prisma|this\.prisma|app\.prisma)\s*\.[a-zA-Z_$]/;

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (/\.(controller|service)\.ts$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

const files = await collectFiles(modulesDir);
const violations = [];

for (const file of files) {
  const source = await readFile(file, "utf8");
  const relativePath = path.relative(rootDir, file);

  if (forbiddenImportPattern.test(source)) {
    violations.push(`${relativePath}: controllers/services must not import DB modules`);
  }

  if (forbiddenPrismaTypePattern.test(source)) {
    violations.push(`${relativePath}: controllers/services must not use Prisma types directly`);
  }

  if (forbiddenDirectAccessPattern.test(source)) {
    violations.push(`${relativePath}: controllers/services must not access Prisma directly`);
  }
}

if (violations.length > 0) {
  console.error("Architecture check failed:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log("Architecture check passed.");
