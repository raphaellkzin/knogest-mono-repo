import { createPrismaClient } from "../src/db/prisma.db";
import { createSaltHash } from "../src/lib/utils/utils";

const { prisma, pool } = createPrismaClient();

export default async function main() {
  await prisma.user.upsert({
    where: {
      username: "admin@adm.com",
    },
    update: {},
    create: {
      username: "admin@adm.com",
      password: await createSaltHash("1234"),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();

    process.stdout.write("Seed done!\n");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
