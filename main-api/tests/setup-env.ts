process.env.DATABASE_URL ??= "postgres://dev:devpass@localhost:5432/app";
process.env.JWT_SECRET_KEY ??=
  "test-secret-key-with-at-least-thirty-two-characters";
process.env.PORT ??= "3333";
process.env.HOST ??= "0.0.0.0";
process.env.NODE_ENV ??= "test";
process.env.SENSITIVE_DOCUMENT_ACTIVE_KEY_VERSION ??= "v1";
process.env.SENSITIVE_DOCUMENT_ENCRYPTION_KEYS ??=
  '{"v1":"MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY","v2":"MTIzNDU2Nzg5YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZjA"}';
process.env.SENSITIVE_DOCUMENT_HMAC_KEYS ??=
  '{"v1":"ZmVkY2JhOTg3NjU0MzIxMGZlZGNiYTk4NzY1NDMyMTA","v2":"YWJjZGVmMDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODk"}';
