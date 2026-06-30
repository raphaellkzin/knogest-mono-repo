import { execFileSync } from "node:child_process";
import { URL } from "node:url";
import pg from "pg";

const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) throw new Error("TEST_DATABASE_URL is required");
const parsed = new URL(testUrl);
const databaseName = parsed.pathname.slice(1);
if (!/^[a-z0-9_]+_test$/.test(databaseName)) {
  throw new Error(
    "Refusing to reset a database whose name does not end in _test",
  );
}

parsed.pathname = "/postgres";
const pool = new pg.Pool({ connectionString: parsed.toString() });
try {
  await pool.query(
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1",
    [databaseName],
  );
  await pool.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
  await pool.query(`CREATE DATABASE "${databaseName}"`);
} finally {
  await pool.end();
}

execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
  env: { ...process.env, DATABASE_URL: testUrl },
  stdio: "inherit",
});
