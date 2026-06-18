# Clients OpenAPI

O Kubb gera clients a partir de `api_docs/openapi.json`.

## Comandos

```bash
pnpm validate:api
pnpm generate:api
```

## Regra server-only

Todos os clients gerados importam `@/lib/api/server-client`. Esse módulo usa `server-only`, então uma tentativa de importar clients gerados em componentes client-side deve falhar no lint ou no build.

Uso correto:

```ts
"use server";

import { authCheck } from "@/generated/clients/authCheck";

export async function action() {
  return authCheck();
}
```

Uso proibido:

```tsx
"use client";

import { authCheck } from "@/generated/clients/authCheck";
```

## Atualização de contratos

1. Atualize `api_docs/openapi.json`.
2. Rode `pnpm validate:api`.
3. Rode `pnpm generate:api`.
4. Ajuste Server Actions e tipos consumidos pela UI.
5. Rode `pnpm lint`, `pnpm typecheck` e `pnpm build`.

## Contratos atuais

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/auth-check`

`auth-check` é consumido por wrapper server-side para manter a UI isolada de detalhes do contrato.
