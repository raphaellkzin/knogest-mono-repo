import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const digestCommand =
  "find src/generated -type f -print0 | sort -z | xargs -0 shasum";
const digest = () =>
  execFileSync("sh", ["-c", digestCommand], {
    cwd: projectRoot,
    encoding: "utf8",
  });
const before = digest();
const temporaryHome = mkdtempSync(join(tmpdir(), "knogest-kubb-"));

try {
  execFileSync("pnpm", ["generate:api"], {
    cwd: projectRoot,
    env: { ...process.env, HOME: temporaryHome },
    stdio: "inherit",
  });
  if (before !== digest()) {
    throw new Error(
      "Generated API client is stale. Commit the regenerated src/generated output.",
    );
  }
} finally {
  rmSync(temporaryHome, { recursive: true, force: true });
}
