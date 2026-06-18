process.env.DATABASE_URL ??= "postgres://dev:devpass@localhost:5432/app";
process.env.JWT_SECRET_KEY ??=
  "test-secret-key-with-at-least-thirty-two-characters";
process.env.PORT ??= "3333";
process.env.HOST ??= "0.0.0.0";
process.env.NODE_ENV ??= "test";
