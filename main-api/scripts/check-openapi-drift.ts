import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

import { buildApp } from "../src/app";

async function main() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const outputPath = resolve(scriptDirectory, "../artifacts/openapi.json");
  const committed = await readFile(outputPath, "utf8");
  const app = await buildApp({ logger: false });

  try {
    await app.ready();
    const generated = await format(JSON.stringify(app.swagger()), {
      parser: "json",
    });
    if (generated !== committed) {
      throw new Error("OpenAPI artifact is stale. Run pnpm generate:openapi.");
    }
  } finally {
    await app.close();
  }
}

void main();
