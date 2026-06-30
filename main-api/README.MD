# Fastify TypeScript Backend

Template backend com Fastify, TypeScript, Prisma, PostgreSQL, JWT, Zod, Swagger e testes com Vitest.

Antes de criar modulos ou alterar fluxo de dados, leia:

- `AGENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/MODULE_PATTERN.md`
- `docs/VALIDATION.md`
- `docs/TENANCY.md`
- `docs/PAGINATION.md`
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
pnpm db:seed      # popula dados locais do Épico 1 fora de produção
```

Usuário local criado pelo seed de desenvolvimento:

- host: `piloto.localhost`
- email: `master@piloto.localhost`
- password: `1234`

Use apenas em desenvolvimento.

## Rotas

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/session`
- `GET /api/v1/auth/companies`
- `PUT /api/v1/auth/session/company`
- Swagger UI: `/docs`

## Arquitetura

O fluxo padrao e:

```text
controller -> validation -> service -> handler -> Prisma -> response
```

Somente handlers acessam banco de dados. Controllers registram rotas e respostas HTTP. Services contem regra de negocio e chamam handlers. DTOs contem schemas Zod e tipos inferidos.

# Knogest API

## Isolated integration database

Integration tests never use `prisma db push`. Start the PostgreSQL 16 test service and run the suite; the command terminates active test connections, drops and recreates only a database whose name ends in `_test`, then applies the committed migrations with `prisma migrate deploy`.

```bash
docker compose -f docker-compose.dev.yml up -d --wait postgres_test
pnpm test:integration
```

Override `TEST_DATABASE_URL` when a different isolated PostgreSQL 16 instance is required.

## Administrative provisioning

Passwords are accepted only through stdin so they do not enter shell history or process arguments.

```bash
printf '%s\n' "$ADMIN_PASSWORD" | pnpm admin -- provision \
  --corporation-name "Pilot Corporation" \
  --domain piloto.localhost \
  --admin-email master@example.com \
  --company "Company One" \
  --password-stdin

pnpm admin -- company:add --corporation-id <uuid> --name "Company Two"
```

## Epic 1 local fixture

`pnpm db:seed` and `pnpm db:fixtures` both prepare a deterministic local
environment for the browser-authentication epic when `NODE_ENV` is not
`production`:

- active Corporation domain: `piloto.localhost`
- Master Administrator email: `master@piloto.localhost`
- local password: `1234`
- three active Companies for selection
- one inactive Company for rejection checks
- sibling Corporation with the same email for scoped reset/isolation checks

Open the dashboard at `http://piloto.localhost:3000` so host-based Corporation
resolution matches the seeded domain.

## Administrative password reset

Use the Auth application service through the administrative CLI; do not edit
database rows directly. The replacement password is read through a hidden TTY
prompt by default, or through protected stdin for automation.

```bash
pnpm admin -- password:reset --corporation <uuid> --user <uuid>

printf '%s\n' "$REPLACEMENT_PASSWORD" | pnpm admin -- password:reset \
  --corporation <uuid> \
  --email master@example.com \
  --password-stdin
```

The command emits only safe identifiers, reset timestamp, and revoked Session
count. Plaintext passwords, hashes, tokens, cookies, CPF/CNPJ values, and full
input streams must not be logged or committed in examples.
