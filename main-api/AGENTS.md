# Agent Instructions

Leia este arquivo antes de alterar o projeto.

## Regras obrigatorias

- Nao use `bmad-quick-dev` a menos que o usuario chame explicitamente esse skill/workflow. Se ele nao chamar, trabalhe com o modelo puro Codex.
- Preserve o fluxo `controller -> service -> handler`.
- Somente arquivos em `handlers/`, `src/db/` e plugins de infraestrutura podem acessar Prisma.
- Controllers nao importam Prisma, nao usam `app.prisma` e nao fazem query.
- Services nao importam Prisma Client e nao chamam `prisma.model`.
- DTOs contem schemas Zod e tipos inferidos; nao contem regra de negocio.
- Validacao de formato fica nos DTOs e preHandlers.
- Regra de negocio fica nos services.
- Persistencia e filtros de banco ficam nos handlers.
- Em dados tenant-aware, `tenantId` vem do contexto autenticado, nunca do body livre.
- Todas as listagens potencialmente ilimitadas usam paginacao por cursor conforme `docs/PAGINATION.md`.
- Nao vaze detalhes internos de erro em respostas HTTP.

## Antes de criar codigo novo

1. Leia `docs/ARCHITECTURE.md`.
2. Siga `docs/MODULE_PATTERN.md` para novos modulos.
3. Use `docs/VALIDATION.md` para DTOs e preHandlers.
4. Use `docs/TENANCY.md` se o dado pertencer a um tenant.
5. Use `docs/PAGINATION.md` para toda listagem paginada.
6. Use `docs/ERRORS.md` para status HTTP e mensagens.

## Verificacao

Rode antes de finalizar:

```bash
pnpm typecheck
pnpm lint
pnpm test
```
