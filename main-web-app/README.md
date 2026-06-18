# Frontend Template Next.js

Template frontend com Next.js App Router, TypeScript, Tailwind, Base UI/shadcn, NextAuth v4, Zustand e clients OpenAPI gerados com Kubb.

> Importante: a estilização deste starter template não é a identidade visual oficial da aplicação. Ela é um modelo de referência para orientar IAs/agentes sobre componentização, criação de páginas e manutenção de estilos. Quando uma aplicação derivada tiver identidade visual própria e aprovada, preencha o registro oficial em `docs/STYLING.md`.

## Começo rápido

```bash
pnpm install
cp .env.example .env
pnpm validate:api
pnpm generate:api
pnpm dev
```

Variáveis principais:

```env
API_BASE_URL="http://localhost:3333"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-at-least-32-random-characters"
```

## Scripts

```bash
pnpm dev           # inicia o Next.js
pnpm build         # gera build de produção
pnpm start         # executa o build
pnpm lint          # valida ESLint
pnpm typecheck     # valida TypeScript
pnpm validate:api  # valida o snapshot OpenAPI
pnpm generate:api  # gera clients, types e schemas Zod com Kubb
```

## Estrutura

- `api_docs/openapi.json`: snapshot local dos contratos OpenAPI.
- `src/generated`: código gerado pelo Kubb.
- `src/actions`: Server Actions e helpers de resposta.
- `src/lib/api/server-client.ts`: único client HTTP para a API externa.
- `src/lib/auth`: configuração e helpers server-only de autenticação.
- `src/components`: componentes reutilizáveis.
- `src/components/pages/<rota>`: componentes específicos de página.
- `src/hooks`: hooks client-side para paginação por Server Action.
- `src/stores`: Zustand para estado não sensível.
- `docs`: documentação detalhada do template.

## Regras centrais

- Componentes client-side não chamam API externa diretamente.
- Clients Kubb só podem ser usados em Server Actions ou módulos server-only.
- Tokens não entram em Zustand, props de componente ou `session` pública.
- `/api/auth/*` é a exceção técnica usada pelo NextAuth v4.

Leia também:

- `docs/ARCHITECTURE.md`
- `docs/API_CLIENTS.md`
- `docs/AUTH.md`
- `docs/SECURITY.md`
- `docs/COMPONENTS.md`
- `docs/STYLING.md`
- `docs/HOOKS.md`
