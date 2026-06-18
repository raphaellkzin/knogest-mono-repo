import { buildApp } from "./app";
import { env } from "./lib/config/env";

const start = async () => {
  const app = await buildApp();

  try {
    const address = await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server running at: ${address}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
