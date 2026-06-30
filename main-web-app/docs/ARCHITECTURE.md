# Dashboard Architecture

```text
page -> feature -> Server Action/query -> view-model adapter -> generated Kubb client -> Fastify
```

- React Server Components are the default; Client Components own only interactive state.
- Generated clients and credential cookies remain server-only.
- Fastify owns identity, persisted Sessions, tenant scope, and authorization.
- The Next.js BFF normalizes the original host and forwards it only server-to-server.
- `proxy.ts` provides optimistic navigation based on cookie presence and is never authorization.
- Components consume safe application view models rather than generated transport DTOs.

The canonical API contract is `../main-api/artifacts/openapi.json`; generated output lives under `src/generated`.
