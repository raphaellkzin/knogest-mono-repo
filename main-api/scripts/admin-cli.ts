import { buildApp } from "../src/app";
import {
  parseAdminCommand,
  redactSecrets,
} from "../src/modules/organization/admin-command";
import { AuthService } from "../src/modules/auth/auth.service";
import { OrganizationService } from "../src/modules/organization/organization.service";

async function main() {
  const rawArgv = process.argv.slice(2);
  const argv = rawArgv[0] === "--" ? rawArgv.slice(1) : rawArgv;
  const stdin = argv.includes("--password-stdin")
    ? await readStdin()
    : argv[0] === "password:reset"
      ? await readHiddenPassword()
      : "";
  const command = parseAdminCommand(argv, stdin);
  const app = await buildApp({ logger: false });

  try {
    const service = new OrganizationService(app.handlerContext);
    if (command.type === "provision") {
      const result = await service.provision(command);
      process.stdout.write(
        `${JSON.stringify({
          success: true,
          data: {
            corporationId: result.corporation.id,
            domainId: result.domain.id,
            administratorId: result.administrator.id,
            companyIds: result.companies.map((company) => company.id),
          },
        })}\n`,
      );
    } else if (command.type === "company:add") {
      const result = await service.addCompany(command);
      process.stdout.write(
        `${JSON.stringify({ success: true, data: { companyId: result.id } })}\n`,
      );
    } else {
      const result = await new AuthService(
        app.handlerContext,
      ).resetMasterAdministratorPassword({
        actor: { type: "admin-cli", id: "local-operator" },
        corporationId: command.corporationId,
        selector: command.selector,
        replacementPassword: command.replacementPassword,
      });
      process.stdout.write(
        `${JSON.stringify({
          success: true,
          data: {
            corporationId: result.corporationId,
            userId: result.userId,
            resetAt: result.resetAt,
            revokedSessionCount: result.revokedSessionCount,
          },
        })}\n`,
      );
    }
  } finally {
    await app.close();
  }
}

async function readHiddenPassword(): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "--password-stdin is required when no interactive TTY is available",
    );
  }

  const first = await promptHidden("Replacement password: ");
  const second = await promptHidden("Confirm replacement password: ");
  if (first !== second) throw new Error("Password confirmation does not match");
  return first;
}

function promptHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(prompt);
    stdin.setRawMode(true);
    stdin.resume();
    let value = "";
    const onData = (buffer: Buffer) => {
      const char = buffer.toString("utf8");
      if (char === "\r" || char === "\n") {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.off("data", onData);
        stdout.write("\n");
        resolve(value);
        return;
      }
      if (char === "\u0003") {
        process.exit(130);
      }
      if (char === "\u007f") {
        value = value.slice(0, -1);
        return;
      }
      value += char;
    };
    stdin.on("data", onData);
  });
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({ success: false, message: redactSecrets(error) })}\n`,
  );
  process.exitCode = 1;
});
