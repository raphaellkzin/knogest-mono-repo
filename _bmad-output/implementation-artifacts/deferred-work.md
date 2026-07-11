# Deferred Work

## Shared Cursor Pagination Implementation

- Align `cursor-pagination.ts`, `handler.dto.ts`, and `swaggerSchemas.ts` with `main-api/docs/PAGINATION.md` before implementing the first paginated module controller.
- Add strict Base64URL cursor schema validation, canonical query/scope hashing, deterministic ASC/DESC boundaries, and mutation/duplicate-value contract tests.
- Align `validateQuery` with the standard `jsonResponse.error` envelope and expose the canonical `400` Swagger response.
- Implement and document trusted corporation/company request context before tenant-aware list modules rely on those scopes.

## Existing API Architecture-Lint Violations

- Move direct Prisma access and Prisma types out of `commercial.controller.ts`, `fleet.service.ts`, `projects.service.ts`, and `workforce.service.ts` into the established handler layer so `main-api/scripts/check-architecture.mjs` can pass. This feature did not introduce the listed violations; the check already reported them across legacy modules.
- Replace the `console` call in `scripts/validate-personal-data-gate.ts` or explicitly permit it so the API lint report is warning-free.
