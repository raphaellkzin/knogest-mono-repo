import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

describe("authentication proxy recovery routing", () => {
  it("allows a protected request through when only the refresh cookie remains", () => {
    const response = proxy(
      new NextRequest("http://piloto.localhost:3000/home", {
        headers: { cookie: "knogest-refresh=refresh-only" },
      }),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows the dedicated renewal state to render despite a stale access cookie", () => {
    const response = proxy(
      new NextRequest(
        "http://piloto.localhost:3000/auth/login?renew=1&callbackUrl=%2Fhome",
        { headers: { cookie: "knogest-access=stale" } },
      ),
    );

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
