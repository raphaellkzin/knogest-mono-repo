# Errors

Canonical API errors use a stable code and correlation identifier:

```json
{
  "success": false,
  "code": "AUTHENTICATION_FAILED",
  "message": "Invalid credentials",
  "details": null,
  "requestId": "00000000-0000-4000-8000-000000000000"
}
```

## HTTP status

- `400`: invalid input or validation failure.
- `401`: unauthenticated, invalid credentials, or invalid Session.
- `403`: authenticated without the required trusted scope.
- `404`: resource not found.
- `409`: conflict or uniqueness violation.
- `415`: unsupported request media type.
- `422`: invalid business transition.
- `429`: bounded rate limit exceeded.
- `500`: sanitized unexpected failure.

## Rules

- Never return stack traces, queries, request bodies, raw Prisma errors, credentials, tokens, hashes, or cookies.
- Authentication enumeration paths share one code, status, public message, and response shape.
- Handlers map persistence failures, services raise `AppError`, and the global Fastify error handler owns HTTP formatting.
- Fastify request-format errors with an original 4xx status remain 4xx and use the canonical envelope; they must never degrade to a generic 500.
- Unsupported media types return `415` with code `BAD_REQUEST`. Empty, malformed, or length-inconsistent JSON returns `400` with code `BAD_REQUEST`.
- Logs identify operation, request ID, safe host fingerprint, source metadata, outcome, and timing without credential material.
- Error logs may include only safe diagnostics: `requestId`, `errorType`, stable `errorCode`, `statusCode`, and stack frames without the exception message. Never log request bodies, authorization headers, cookies, tokens, raw SQL, Prisma metadata, or credential material.
- Unexpected failures remain a sanitized `500 INTERNAL_ERROR`; internal diagnostics are recorded only in the safe log context.

## Project daily reports

RDO usa `409` para conflitos esperados e mantém códigos públicos estáveis:

- `DAILY_REPORT_ALREADY_EXISTS`: a obra já possui RDO na data e turno;
- `DAILY_REPORT_IMMUTABLE`: tentativa de alterar ou finalizar novamente um RDO
  finalizado;
- `DAILY_REPORT_PROJECT_UNAVAILABLE`: obra ou período indisponível;
- `DAILY_REPORT_RESOURCE_UNAVAILABLE`: pessoa, alocação ou máquina não é mais
  elegível;
- `DAILY_REPORT_METER_READING_CONFLICT`: a cadeia oficial de uma máquina mudou
  ou impede finalização retroativa.

Detalhes podem expor somente identificadores, nomes e categorias seguras do
recurso. Não inclua leitura interna não solicitada, body, SQL ou metadados
Prisma. A finalização sem body documenta também `415 BAD_REQUEST` para media
type indevido.
