# Validation

Validacao de entrada usa Zod.

## Onde colocar

- Formato de `body`, `params` e `query`: DTO.
- Aplicacao da validacao: controller, com `validateBody`, `validateParams` ou `validateQuery`.
- Regra de negocio: service.
- Constraint de banco: Prisma schema e handlers.

## Body

```ts
export const createUserBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
});

export type CreateUserBody = z.infer<typeof createUserBodySchema>;
```

No controller:

```ts
preHandler: [validateBody(createUserBodySchema)];
```

## Params e query

Use `validateParams` para identificadores de rota e `validateQuery` para filtros, paginacao e ordenacao.

All potentially unbounded lists must follow the query and response contract in `PAGINATION.md`. Pagination query schemas must validate at least:

```ts
const paginationQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z
      .string()
      .min(1)
      .max(2048)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional(),
    search: z.string().trim().min(1).max(120).optional(),
    sortBy: z.enum(["createdAt", "name"]).default("createdAt"),
    sortDirection: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();
```

Replace the example `sortBy` values with the module's explicit allowlist. Unknown query keys must be rejected, not silently stripped. Syntax validation in the DTO does not replace strict decoded cursor validation in the shared pagination helper.

A cursor is valid only for the same resource, authenticated scope, path parameters, search, filters, and ordering that created it. Query validation errors must use `jsonResponse.error` so they match the error envelope below.

## Erros

Entrada invalida deve retornar `400` com:

```json
{
  "success": false,
  "message": "Validation error",
  "data": {}
}
```
