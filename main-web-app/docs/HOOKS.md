# Hooks

Os hooks em `src/hooks` são client-side e recebem Server Actions como dependência. Eles não fazem chamadas diretas para API externa.

## `useInfiniteServerAction`

Use para tabelas paginadas em páginas discretas.

Características:

- mantém páginas já carregadas em memória;
- avança sem refetch quando a próxima página já existe;
- busca nova página via Server Action usando `nextCursor`;
- volta para páginas anteriores sem nova chamada.

Formato esperado:

```ts
{
  data: Item[];
  hasNextPage: boolean;
  nextCursor?: string | null;
}
```

## `useVirtualPagination`

Use para listagens de cards, feeds ou elementos com rolagem infinita controlada.

Características:

- mantém páginas do servidor em cache local;
- expõe apenas uma janela `visibleItems`;
- busca mais dados quando a janela passa do que já foi carregado;
- preserva campos extras da resposta em `avulse`.

## Regras

- Importe tipos de Server Actions com `import type`.
- Passe apenas Server Actions que validam sessão no servidor.
- Não passe tokens ou headers a partir do componente.
- Use `pageSize` fixo para evitar mudança de layout.
