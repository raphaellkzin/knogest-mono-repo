# Architecture

O projeto usa camadas simples e previsiveis:

```text
controller -> validation -> service -> handler -> Prisma -> response
```

## Controller

Responsavel por rotas Fastify, schemas Swagger, preHandlers de validacao, chamada do service e resposta HTTP.

Pode:

- importar DTOs, services, validators e helpers de response;
- ler `request.body`, `request.params`, `request.query` e `request.user`;
- montar o contexto de operacao para o service.

Nao pode:

- importar Prisma Client, `@db` ou client gerado;
- chamar `app.prisma`, `prisma.user`, `prisma.$transaction` ou qualquer query;
- conter regra de negocio complexa.

## Service

Responsavel por regra de negocio e orquestracao de handlers.

Pode:

- receber um `HandlerContext`;
- chamar handlers;
- validar regras de negocio que dependem de mais de um dado;
- decidir qual erro de aplicacao devolver.

Nao pode:

- importar Prisma Client diretamente;
- chamar `context.prisma.user`, `prisma.user` ou qualquer model;
- montar resposta HTTP.

## Handler

Responsavel por persistencia. Esta e a unica camada de modulo que toca o banco.

Pode:

- receber `HandlerContext`;
- usar `context.prisma`;
- aplicar `where`, `select`, `include`, `data` e filtros de tenant;
- converter erros Prisma para `AppError`.

## DTO

Responsavel por schemas Zod e tipos inferidos.

Nao coloque regra de negocio ou acesso a banco em DTO.
