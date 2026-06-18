# Fastify TypeScript Backend

Template backend com Fastify, TypeScript, Prisma, PostgreSQL, JWT, Zod, Swagger e testes com Vitest.

Antes de criar modulos ou alterar fluxo de dados, leia:

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/MODULE_PATTERN.md`
- `docs/VALIDATION.md`
- `docs/TENANCY.md`
- `docs/ERRORS.md`

## Setup

```bash
pnpm install
cp .env.example .env
docker-compose -f docker-compose.dev.yml up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

O CLI `create-glapp-node-back` ja cria um `.env` local com `DATABASE_URL`, `JWT_SECRET_KEY`, `PORT`, `HOST` e `NODE_ENV`.

## Scripts

```bash
pnpm dev          # inicia o servidor em watch mode
pnpm build        # compila src/ para dist/
pnpm start        # executa dist/server.js
pnpm typecheck    # valida TypeScript sem emitir arquivos
pnpm lint         # roda ESLint e check de arquitetura
pnpm test         # roda testes Vitest
pnpm format       # formata com Prettier
pnpm db:generate  # gera Prisma Client
pnpm db:migrate   # cria/aplica migrations em desenvolvimento
pnpm db:deploy    # aplica migrations em producao
pnpm db:seed      # cria usuario local de seed
```

Usuario local criado pelo seed:

- username: `admin@adm.com`
- password: `1234`

Use apenas em desenvolvimento.

## Rotas

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/auth-check`
- Swagger UI: `/docs`

## Arquitetura

O fluxo padrao e:

```text
controller -> validation -> service -> handler -> Prisma -> response
```

Somente handlers acessam banco de dados. Controllers registram rotas e respostas HTTP. Services contem regra de negocio e chamam handlers. DTOs contem schemas Zod e tipos inferidos.
