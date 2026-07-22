import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app";

import type { FastifyBaseLogger, FastifyInstance } from "fastify";

describe("global request error handling", () => {
  const entries: string[] = [];
  const record = (...values: unknown[]) => entries.push(JSON.stringify(values));
  const logger = {
    level: "info",
    fatal: record,
    error: record,
    warn: record,
    info: record,
    debug: record,
    trace: record,
    silent: record,
    child: () => logger,
  } as FastifyBaseLogger;
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ loggerInstance: logger });
    app.get("/__test/unhandled", async () => {
      throw Object.assign(new Error("never-log-this-internal-message"), {
        code: "E_TEST_UNHANDLED",
      });
    });
    await app.ready();
  });

  beforeEach(() => {
    entries.length = 0;
  });

  afterAll(() => app.close());

  it("returns canonical 415 and safe metadata for an unsupported media type", async () => {
    const requestId = "00000000-0000-4000-8000-000000000415";
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/projects/00000000-0000-4000-8000-000000002502/activate",
      headers: {
        authorization: "Bearer never-log-this-credential",
        "content-type": "application/x-www-form-urlencoded",
        "x-request-id": requestId,
      },
    });

    expect(response.statusCode).toBe(415);
    expect(response.json()).toEqual({
      success: false,
      code: "BAD_REQUEST",
      message: "Unsupported media type",
      details: null,
      requestId,
    });
    const output = entries.join("\n");
    expect(output).toContain("Request format rejected");
    expect(output).toContain("FST_ERR_CTP_INVALID_MEDIA_TYPE");
    expect(output).toContain('"statusCode":415');
    expect(output).toContain(requestId);
    expect(output).not.toContain("never-log-this-credential");
  });

  it("returns canonical 400 for an empty JSON request body", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      code: "BAD_REQUEST",
      message: "Invalid request body",
      requestId: expect.any(String),
    });
    expect(entries.join("\n")).toContain("FST_ERR_CTP_EMPTY_JSON_BODY");
  });

  it("returns canonical 400 for malformed JSON", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      headers: { "content-type": "application/json" },
      payload: "{",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({
      success: false,
      code: "BAD_REQUEST",
      message: "Invalid request body",
    });
    expect(entries.join("\n")).toContain("FST_ERR_CTP_INVALID_JSON_BODY");
  });

  it("logs safe diagnostics while keeping an unexpected response sanitized", async () => {
    const requestId = "00000000-0000-4000-8000-000000000500";
    const response = await app.inject({
      method: "GET",
      url: "/__test/unhandled",
      headers: { "x-request-id": requestId },
    });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toEqual({
      success: false,
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      details: null,
      requestId,
    });
    const output = entries.join("\n");
    expect(output).toContain("Unhandled request error");
    expect(output).toContain("E_TEST_UNHANDLED");
    expect(output).toContain("stackFrames");
    expect(output).toContain(requestId);
    expect(output).not.toContain("never-log-this-internal-message");
  });
});
