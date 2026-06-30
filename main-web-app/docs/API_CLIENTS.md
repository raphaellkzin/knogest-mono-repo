# Generated API Clients

Fastify route schemas generate the canonical `main-api/artifacts/openapi.json`. Kubb consumes that artifact and writes TypeScript models, Zod schemas, and server-only clients under `src/generated`.

```bash
pnpm --dir ../main-api generate:openapi
pnpm generate:api
pnpm validate:api
pnpm check:api
```

Never edit generated files or maintain duplicate request/response types. Presentation code adapts generated DTOs inside feature-level Server Actions or queries.

Current authentication operations are:

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
