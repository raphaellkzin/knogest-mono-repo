import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const expectedNode = "22.22.3";
const expectedPnpm = "pnpm@10.33.0";
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), "utf8"));

for (const path of ["main-api/package.json", "main-web-app/package.json"]) {
  const manifest = readJson(path);
  if (manifest.engines?.node !== expectedNode || manifest.packageManager !== expectedPnpm) {
    throw new Error(`${path} must pin Node ${expectedNode} and ${expectedPnpm}`);
  }
}

if (readFileSync(resolve(root, ".nvmrc"), "utf8").trim() !== expectedNode) {
  throw new Error(`.nvmrc must pin Node ${expectedNode}`);
}

const compose = readFileSync(resolve(root, "main-api/docker-compose.dev.yml"), "utf8");
if (!compose.includes("image: postgres:16") || !compose.includes('"5432:5432"')) {
  throw new Error("Development PostgreSQL must remain PostgreSQL 16 on port 5432");
}

console.log("Foundation contract verified.");
