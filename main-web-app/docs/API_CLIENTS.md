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

## Transporte server-only

`src/lib/api/server-client.ts` e o adaptador compartilhado usado por clientes
gerados e chamadas server-only mantem as credenciais fora do navegador. Todas
as chamadas devem preservar estas regras:

- Sem body (`data === undefined`): nao envie `Content-Type`. O cliente define o
  header como `null` internamente para impedir que o Axios gere
  `application/x-www-form-urlencoded`.
- JSON: envie um body real e `content-type: application/json`.
- `FormData`: nao configure `Content-Type` manualmente; o Axios deve criar o
  boundary de `multipart/form-data`.
- Nao envie `{}` apenas para fazer um comando sem body atravessar o transporte.
  O contrato da rota decide se existe body.

Essa normalizacao tambem se aplica quando uma chamada e repetida depois da
renovacao da sessao.

## Server Actions

O status `200` de um `POST` para uma pagina Next.js confirma apenas que o
protocolo da Server Action respondeu. A chamada Fastify interna pode ter
retornado erro e sido convertida em um resultado serializavel pela action.
Componentes devem avaliar o resultado de dominio antes de atualizar a interface.

O fluxo de RDO usa queries server-only para a pagina inicial e Server Actions
para opções temporais, detalhe, paginação, criação, edição e finalização. A
action de finalização chama
`POST /projects/:projectId/daily-reports/:reportId/finalize` sem `data` e sem
`Content-Type`. O componente só aplica o snapshot `finalized` quando o resultado
de domínio é `success`; um `200` do protocolo da Server Action não basta.

## Testes e manutencao

- Testes que mockam uma Server Action cobrem o componente, mas nao validam o
  formato HTTP enviado pelo Axios.
- Alteracoes no cliente compartilhado exigem teste de transporte com Axios real,
  incluindo body, `Content-Type` e comportamento de retry.
- Alteracoes em endpoints ou envelopes exigem regenerar e validar OpenAPI e
  clientes gerados.
- Mantenha este documento sincronizado com toda mudanca de transporte ou Server
  Action, conforme a definicao de pronto do `AGENTS.md` da raiz.
