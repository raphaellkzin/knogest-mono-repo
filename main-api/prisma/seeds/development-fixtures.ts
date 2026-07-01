import { createPrismaClient } from "../../src/db/prisma.db";
import { seedEpicOneDevelopmentData } from "./epic-one-development-data";
import { seedSensitiveDocumentDevelopmentData } from "./sensitive-document-development-data";

// Development fixtures are disposable. Any CPF/CNPJ values introduced here must
// be synthetic test documents and must never be copied from pilot runtime data.
if (process.env.NODE_ENV === "production") {
  throw new Error("Development fixtures are disabled in production");
}

const { prisma, pool } = createPrismaClient();

async function main() {
  const result = await seedEpicOneDevelopmentData(prisma);
  const sensitiveDocuments = await seedSensitiveDocumentDevelopmentData(prisma);
  process.stdout.write(
    `${JSON.stringify(
      { success: true, data: { ...result, sensitiveDocuments } },
      null,
      2,
    )}\n`,
  );
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
