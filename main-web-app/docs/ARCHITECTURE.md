# Arquitetura

Este template usa Next.js App Router com Server Components por padrão. Componentes interativos usam `"use client"` apenas quando precisam de estado, eventos ou APIs do navegador.

A arquitetura descrita aqui é a base oficial do starter template. A estética inicial, porém, é demonstrativa e não deve ser tratada como identidade visual oficial da aplicação. Quando uma aplicação derivada tiver visual aprovado, registre essa decisão em `docs/STYLING.md`.

## Fluxo de dados

```text
UI -> Server Action ou NextAuth -> client Kubb server-only -> API externa
```

- A UI nunca importa `axios`, `fetch`, `src/generated/clients` ou `src/lib/api/server-client.ts`.
- Server Actions validam entrada, verificam sessão e chamam os clients gerados.
- O client server-only lê o token da sessão NextAuth no servidor e injeta `Authorization`.
- Dados sensíveis são reduzidos antes de chegar a componentes client-side.

## Rotas

- `/`: redireciona para `/home` quando autenticado ou `/auth/login` quando anônimo.
- `/auth/login`: formulário de autenticação.
- `/home`: mini dashboard protegido com dados mockados.
- `/api/auth/*`: rotas internas do NextAuth v4.

## Arquitetura e Visual

- A organização App Router, Server Actions, autenticação, Kubb e componentização é a referência oficial do starter.
- A estilização que acompanha o starter é um exemplo para orientar IAs/agentes na criação de telas e componentes.
- A identidade visual só passa a ser oficial quando `docs/STYLING.md` estiver preenchido com status `Oficial`, fonte de verdade e critérios de aceite.

## Contratos

Os contratos ficam em `api_docs/openapi.json`. O comando `pnpm generate:api` gera:

- `src/generated/clients`: funções de chamada.
- `src/generated/models`: tipos TypeScript.
- `src/generated/zod`: validações de entrada e resposta.

`src/generated` é código gerado e não deve ser editado manualmente.
