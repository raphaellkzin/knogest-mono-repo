import { createPrismaClient } from "../src/db/prisma.db";
import { seedEpicOneDevelopmentData } from "./seeds/epic-one-development-data";
import { seedReferenceData } from "./seeds/reference-data";
import { seedSensitiveDocumentDevelopmentData } from "./seeds/sensitive-document-development-data";

const { prisma, pool } = createPrismaClient();

seedReferenceData(prisma)
  .then(async () => {
    if (process.env.NODE_ENV !== "production") {
      const result = await seedEpicOneDevelopmentData(prisma);
      const sensitiveDocuments =
        await seedSensitiveDocumentDevelopmentData(prisma);
      process.stdout.write(
        `${JSON.stringify(
          {
            success: true,
            seed: "development",
            data: { ...result, sensitiveDocuments },
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    process.stdout.write("Reference data seed complete.\n");
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
