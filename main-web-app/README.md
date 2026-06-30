# Knogest Dashboard

Next.js 16 App Router dashboard with React 19, TypeScript, Tailwind CSS, Server Actions, a server-only API adapter, and OpenAPI-generated Kubb clients.

## Local configuration

```env
API_BASE_URL="http://localhost:3333"
APP_HOST="piloto.localhost:3000"
AUTH_COOKIE_MODE="local"
```

Run `pnpm dev` and open `http://piloto.localhost:3000`. Fastify is the sole Session authority; Next.js stores server-confidential credential material only in host-only `HttpOnly` cookies.

## Checks

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm validate:api
pnpm check:api
pnpm build
pnpm test:e2e
```

The canonical OpenAPI document belongs to `main-api/artifacts/openapi.json`. `pnpm generate:api` regenerates `src/generated`; generated files are never edited manually.
