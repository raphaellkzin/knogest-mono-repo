# Module Pattern

Crie novos modulos dentro de `src/modules/<module-name>`.

Estrutura recomendada:

```text
src/modules/orders/
  orders.controller.ts
  orders.service.ts
  orders.dto.ts
  handlers/
    create-order.handler.ts
    get-order.handler.ts
    list-orders.handler.ts
```

## Controller

- Nome: `<module>.controller.ts`
- Exporta uma funcao que recebe `FastifyInstance`.
- Registra rotas, validacoes, Swagger e respostas.
- Chama o service.

## Service

- Nome: `<module>.service.ts`
- Exporta uma classe ou funcoes de caso de uso.
- Recebe `HandlerContext` no construtor quando precisar de persistencia.
- Chama handlers para ler ou gravar dados.

## DTO

- Nome: `<module>.dto.ts`
- Exporta schemas Zod e tipos `z.infer`.
- Deve ter um schema por entrada publica relevante: body, params e query.

## Handler

- Pasta: `handlers/`
- Nome: `<action>-<entity>.handler.ts`
- Recebe `HandlerContext`.
- E a unica camada que usa `context.prisma`.
- Deve retornar `successHandlerResponse(data)` ou lancar erro normalizado.
