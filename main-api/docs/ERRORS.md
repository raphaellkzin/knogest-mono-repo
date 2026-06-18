# Errors

Todas as respostas de erro devem usar o formato:

```json
{
  "success": false,
  "message": "Mensagem segura",
  "data": null
}
```

## Status HTTP

- `400`: entrada invalida ou erro de validacao.
- `401`: usuario nao autenticado ou token invalido.
- `403`: usuario autenticado sem permissao ou tenant incorreto.
- `404`: recurso nao encontrado.
- `409`: conflito, duplicidade ou unique constraint.
- `422`: regra de negocio invalida.
- `500`: erro inesperado.

## Regras

- Nao envie stack trace, query, payload interno ou erro Prisma bruto para o cliente.
- Handlers convertem erros Prisma com `failedHandlerResponse`.
- Services lancam `AppError` quando uma regra de negocio falhar.
- Controllers chamam `jsonResponse.fromError`.
