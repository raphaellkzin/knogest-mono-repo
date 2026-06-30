import { describe, expect, it } from "vitest";

import { parseAdminCommand, redactSecrets } from "./admin-command";

describe("administrative command parsing", () => {
  it("parses provision with zero to three companies and stdin password", () => {
    expect(
      parseAdminCommand(
        [
          "provision",
          "--corporation-name",
          "Pilot",
          "--domain",
          "PILOTO.localhost:3000",
          "--admin-email",
          "MASTER@EXAMPLE.COM",
          "--company",
          "North",
          "--company",
          "South",
          "--password-stdin",
        ],
        "strong development password\n",
      ),
    ).toEqual({
      type: "provision",
      corporationName: "Pilot",
      domainHost: "piloto.localhost",
      adminEmail: "master@example.com",
      adminPassword: "strong development password",
      companyNames: ["North", "South"],
    });
  });

  it("rejects secrets in argv and more than three companies", () => {
    expect(() =>
      parseAdminCommand(["provision", "--password", "secret"], ""),
    ).toThrow();
    expect(() =>
      parseAdminCommand(
        [
          "provision",
          "--corporation-name",
          "Pilot",
          "--domain",
          "pilot.localhost",
          "--admin-email",
          "master@example.com",
          "--company",
          "One",
          "--company",
          "Two",
          "--company",
          "Three",
          "--company",
          "Four",
          "--password-stdin",
        ],
        "strong development password",
      ),
    ).toThrow();
  });

  it("redacts secret material from nested errors", () => {
    expect(redactSecrets("password=secret token=abc hash=$argon2id$bad")).toBe(
      "password=[REDACTED] token=[REDACTED] hash=[REDACTED]",
    );
  });
});
