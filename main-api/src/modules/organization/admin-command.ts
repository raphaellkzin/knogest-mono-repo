import { z } from "zod";

import {
  normalizeEmail,
  normalizeHost,
} from "../../lib/security/normalization";

const nonEmptyName = z.string().trim().min(1).max(160);

export type AdminCommand =
  | {
      type: "provision";
      corporationName: string;
      domainHost: string;
      adminEmail: string;
      adminPassword: string;
      companyNames: string[];
    }
  | { type: "company:add"; corporationId: string; companyName: string }
  | {
      type: "password:reset";
      corporationId: string;
      selector: { userId: string } | { email: string };
      replacementPassword: string;
    };

function collectOptions(argv: string[]) {
  const options = new Map<string, string[]>();
  for (let index = 1; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (
      !key?.startsWith("--") ||
      value === undefined ||
      value.startsWith("--")
    ) {
      throw new Error(`Invalid option ${key ?? ""}`.trim());
    }
    options.set(key, [...(options.get(key) ?? []), value]);
  }
  return options;
}

export function parseAdminCommand(argv: string[], stdin: string): AdminCommand {
  const command = argv[0];
  if (argv.includes("--password")) {
    throw new Error("Password arguments are forbidden; use --password-stdin");
  }

  if (command === "provision") {
    const passwordMarker = argv.indexOf("--password-stdin");
    if (passwordMarker < 0) throw new Error("--password-stdin is required");
    const withoutMarker = argv.filter((value) => value !== "--password-stdin");
    const options = collectOptions(withoutMarker);
    const companyNames = options.get("--company") ?? [];
    const adminPassword = stdin.replace(/[\r\n]+$/, "");

    return {
      type: "provision",
      corporationName: nonEmptyName.parse(
        options.get("--corporation-name")?.[0],
      ),
      domainHost: normalizeHost(options.get("--domain")?.[0] ?? ""),
      adminEmail: normalizeEmail(options.get("--admin-email")?.[0] ?? ""),
      adminPassword: z.string().min(12).max(1024).parse(adminPassword),
      companyNames: z.array(nonEmptyName).max(3).parse(companyNames),
    };
  }

  if (command === "company:add") {
    const options = collectOptions(argv);
    return {
      type: "company:add",
      corporationId: z
        .string()
        .uuid()
        .parse(options.get("--corporation-id")?.[0]),
      companyName: nonEmptyName.parse(options.get("--name")?.[0]),
    };
  }

  if (command === "password:reset") {
    const passwordMarker = argv.indexOf("--password-stdin");
    const withoutMarker = argv.filter((value) => value !== "--password-stdin");
    const options = collectOptions(withoutMarker);
    const users = options.get("--user") ?? [];
    const emails = options.get("--email") ?? [];
    if (users.length + emails.length !== 1) {
      throw new Error("Exactly one of --user or --email is required");
    }
    if (passwordMarker < 0 && stdin.length === 0) {
      throw new Error("Replacement password is required");
    }
    const replacementPassword = stdin.replace(/[\r\n]+$/, "");

    return {
      type: "password:reset",
      corporationId: z.string().uuid().parse(options.get("--corporation")?.[0]),
      selector:
        users.length === 1
          ? { userId: z.string().uuid().parse(users[0]) }
          : { email: normalizeEmail(emails[0] ?? "") },
      replacementPassword: z
        .string()
        .min(12)
        .max(1024)
        .parse(replacementPassword),
    };
  }

  throw new Error("Unknown administrative command");
}

export function redactSecrets(value: unknown): string {
  const text = value instanceof Error ? value.message : String(value);
  return text
    .replace(/(password\s*[=:]\s*)\S+/gi, "$1[REDACTED]")
    .replace(/(token\s*[=:]\s*)\S+/gi, "$1[REDACTED]")
    .replace(/(hash\s*[=:]\s*)\S+/gi, "$1[REDACTED]")
    .replace(/\$argon2(?:id|i|d)\$\S+/g, "[REDACTED]");
}
