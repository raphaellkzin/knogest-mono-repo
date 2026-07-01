import { createPrismaClient } from "../../db/prisma.db";
import fp from "fastify-plugin";
import { Prisma, PrismaClient } from "../../db/generated/prisma/client";
import { HandlerContext } from "../utils/handler.dto";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    handlerContext: HandlerContext;
  }
}

export const prismaPlugin = fp(async (app) => {
  const { prisma, pool } = createPrismaClient();

  app.decorate("prisma", prisma);
  const handlerContext: HandlerContext = {
    prisma,
    transaction: (work, options) =>
      prisma.$transaction(
        (transaction) => {
          const transactionContext: HandlerContext = {
            prisma: transaction,
            transaction: (nestedWork) => nestedWork(transactionContext),
          };
          return work(transactionContext);
        },
        {
          isolationLevel:
            options?.isolationLevel === "Serializable"
              ? Prisma.TransactionIsolationLevel.Serializable
              : Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      ),
  };
  app.decorate("handlerContext", handlerContext);

  app.addHook("onClose", async (app) => {
    await app.prisma.$disconnect();
    await pool.end();
  });
});
