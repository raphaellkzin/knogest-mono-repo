const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must target a database ending in _test");
}

process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET_KEY ??=
  "integration-secret-key-with-at-least-thirty-two-characters";
process.env.NODE_ENV = "test";
process.env.LOGIN_RATE_LIMIT_MAX ??= "20";
