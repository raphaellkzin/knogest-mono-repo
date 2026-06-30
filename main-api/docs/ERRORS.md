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
- `422`: invalid business transition.
- `429`: bounded rate limit exceeded.
- `500`: sanitized unexpected failure.

## Rules

- Never return stack traces, queries, request bodies, raw Prisma errors, credentials, tokens, hashes, or cookies.
- Authentication enumeration paths share one code, status, public message, and response shape.
- Handlers map persistence failures, services raise `AppError`, and the global Fastify error handler owns HTTP formatting.
- Logs identify operation, request ID, safe host fingerprint, source metadata, outcome, and timing without credential material.
