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

## Erros

Entrada invalida deve retornar `400` com:

```json
{
  "success": false,
  "message": "Validation error",
  "data": {}
}
```
