import { createPrismaClient } from "../../db/prisma.db";
import fp from "fastify-plugin";
import { PrismaClient } from "../../db/generated/prisma/client";
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
  app.decorate("handlerContext", { prisma });

  app.addHook("onClose", async (app) => {
    await app.prisma.$disconnect();
    await pool.end();
  });
});
