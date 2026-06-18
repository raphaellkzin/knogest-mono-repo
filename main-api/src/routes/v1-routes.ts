import { v1AuthController } from "../modules/auth/auth.controller";
import { FastifyInstance } from "fastify";

export const v1Routes = (app: FastifyInstance) => {
  app.register(v1AuthController, { prefix: "/auth" });
};
