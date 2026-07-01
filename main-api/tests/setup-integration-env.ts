const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith("_test")) {
  throw new Error("TEST_DATABASE_URL must target a database ending in _test");
}

process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET_KEY ??=
  "integration-secret-key-with-at-least-thirty-two-characters";
process.env.NODE_ENV = "test";
process.env.LOGIN_RATE_LIMIT_MAX ??= "20";
process.env.SENSITIVE_DOCUMENT_ACTIVE_KEY_VERSION ??= "v1";
process.env.SENSITIVE_DOCUMENT_ENCRYPTION_KEYS ??=
  '{"v1":"MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY","v2":"MTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZjA"}';
process.env.SENSITIVE_DOCUMENT_HMAC_KEYS ??=
  '{"v1":"ZmVkY2JhOTg3NjU0MzIxMGZlZGNiYTk4NzY1NDMyMTA","v2":"YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODk"}';
