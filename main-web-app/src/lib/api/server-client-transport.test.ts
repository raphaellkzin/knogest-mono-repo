import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  getApiAccessToken: vi.fn(),
  refreshSessionSingleFlight: vi.fn(),
  headers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/auth/auth-cookies.server", () => ({
  getApiAccessToken: mocks.getApiAccessToken,
}));
vi.mock("@/lib/auth/session-refresh.server", () => ({
  refreshSessionSingleFlight: mocks.refreshSessionSingleFlight,
}));

import client from "./server-client";

type ReceivedRequest = {
  body: string;
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

describe("server API transport", () => {
  const received: ReceivedRequest[] = [];
  let server: Server;
  let baseURL: string;

  beforeAll(async () => {
    server = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      received.push({
        body: Buffer.concat(chunks).toString("utf8"),
        headers: request.headers,
        method: request.method,
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end('{"success":true}');
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address() as AddressInfo;
    baseURL = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    received.length = 0;
    vi.clearAllMocks();
    mocks.getApiAccessToken.mockResolvedValue(null);
    mocks.headers.mockResolvedValue(
      new Headers({ host: "piloto.localhost", "x-forwarded-proto": "http" }),
    );
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("sends a bodyless POST without Content-Type or bytes", async () => {
    await client({
      baseURL,
      url: "/capture",
      method: "POST",
      authRefreshPolicy: "disabled",
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({ method: "POST", body: "" });
    expect(received[0].headers["content-type"]).toBeUndefined();
    expect(received[0].headers["content-length"]).toBe("0");
  });

  it("preserves an explicit JSON body and content type", async () => {
    await client({
      baseURL,
      url: "/capture",
      method: "POST",
      data: { value: "kept" },
      headers: { "content-type": "application/json" },
      authRefreshPolicy: "disabled",
    });

    expect(received).toHaveLength(1);
    expect(received[0].headers["content-type"]).toBe("application/json");
    expect(received[0].body).toBe('{"value":"kept"}');
  });

  it("lets Axios provide the multipart boundary for FormData", async () => {
    const data = new FormData();
    data.append("name", "transport-test");

    await client({
      baseURL,
      url: "/capture",
      method: "POST",
      data,
      authRefreshPolicy: "disabled",
    });

    expect(received).toHaveLength(1);
    expect(received[0].headers["content-type"]).toMatch(
      /^multipart\/form-data; boundary=/u,
    );
    expect(received[0].body).toContain('name="name"');
    expect(received[0].body).toContain("transport-test");
  });
});
