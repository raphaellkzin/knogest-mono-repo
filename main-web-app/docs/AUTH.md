# Autenticação

O template usa NextAuth v4 com Credentials Provider.

## Fluxo

```text
/auth/login -> /api/auth/callback/credentials -> authorize -> login gerado pelo Kubb -> sessão JWT HttpOnly
```

`/api/auth/*` é a exceção técnica permitida porque o NextAuth v4 depende dessas rotas internas.

## Sessão

- Estratégia: JWT.
- Duração padrão: 4 horas.
- O token da API externa fica apenas no JWT HttpOnly do NextAuth.
- A sessão exposta ao client contém no máximo `session.user.id`.

## Arquivos principais

- `src/lib/auth/options.ts`: configuração do NextAuth.
- `src/app/api/auth/[...nextauth]/route.ts`: handlers GET/POST do NextAuth.
- `src/lib/auth/api-token.ts`: leitura server-only do JWT.
- `src/lib/auth/session.ts`: helpers para sessão atual e proteção de páginas.

## Login e logout

- Login usa `signIn("credentials")` no formulário client-side, chamando somente `/api/auth/*`.
- Logout usa `signOut`, também restrito ao fluxo interno do NextAuth.
- Mensagens de erro são genéricas para evitar enumeração de credenciais.

## Variáveis

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="replace-with-at-least-32-random-characters"
API_BASE_URL="http://localhost:3333"
```
