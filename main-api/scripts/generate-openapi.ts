import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "prettier";

import { buildApp } from "../src/app";

async function main() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const outputPath = resolve(scriptDirectory, "../artifacts/openapi.json");
  const app = await buildApp({ logger: false });

  try {
    await app.ready();
    await mkdir(dirname(outputPath), { recursive: true });
    const document = await format(JSON.stringify(app.swagger()), {
      parser: "json",
    });
    await writeFile(outputPath, document, "utf8");
  } finally {
    await app.close();
  }
}

void main();
