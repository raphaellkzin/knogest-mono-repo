import { v1AuthController } from "../modules/auth/auth.controller";
import { v1CommercialController } from "../modules/commercial/commercial.controller";
import { v1FleetController } from "../modules/fleet/fleet.controller";
import { v1WorkforceController } from "../modules/workforce/workforce.controller";
import { FastifyInstance } from "fastify";

export const v1Routes = (app: FastifyInstance) => {
  app.register(v1AuthController, { prefix: "/auth" });
  app.register(v1CommercialController);
  app.register(v1FleetController);
  app.register(v1WorkforceController);
};
