import { createPrismaClient } from "../../src/db/prisma.db";
import { seedEpicOneDevelopmentData } from "./epic-one-development-data";

if (process.env.NODE_ENV === "production") {
  throw new Error("Development fixtures are disabled in production");
}

const { prisma, pool } = createPrismaClient();

async function main() {
  const result = await seedEpicOneDevelopmentData(prisma);
  process.stdout.write(
    `${JSON.stringify({ success: true, data: result }, null, 2)}\n`,
  );
}

main().finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});
