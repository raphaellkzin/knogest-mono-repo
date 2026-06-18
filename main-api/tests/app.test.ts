import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";

describe("app", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("builds and closes without opening a real port", () => {
    expect(app.server.listening).toBe(false);
  });

  it("returns 401 when auth-check has no token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/auth-check",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({
      success: false,
      message: "Token invalido ou ausente.",
    });
  });

  it("returns 400 when login body is invalid", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      message: "Validation error",
    });
  });

  it("registers the login route in Swagger", () => {
    const spec = app.swagger();

    expect(spec.paths).toHaveProperty("/api/v1/auth/login");
  });
});
