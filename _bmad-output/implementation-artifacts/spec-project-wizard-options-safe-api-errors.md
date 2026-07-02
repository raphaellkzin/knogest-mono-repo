---
title: 'Fix project wizard options and sanitize API client errors'
type: 'bugfix'
created: '2026-07-01'
status: 'in-review'
baseline_commit: 'd77150400de651cde4c3806b728faf0355d66d53'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/4-3-select-the-client-and-project-responsibilities.md'
  - '{project-root}/_bmad-output/implementation-artifacts/4-7-configure-optional-project-fuel-agreements.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Opening `/home/obras` fails because the Project wizard sends an unsupported `state` query parameter to the Client and Fuel Supplier registry endpoints. The same adapter also reads `displayName`, although both generated response contracts expose the safe display field as `name`; uncaught API failures additionally leak the Axios request configuration and bearer token through `Error.cause`.

**Approach:** Align the wizard query and option mapping with the generated contracts, while retaining the API's existing active-only registry behavior. Make `ApiClientError` incapable of retaining the raw `AxiosError`, preserving only the canonical fields consumed by application actions.

## Boundaries & Constraints

**Always:** Preserve server-only generated-client access, selected-Company scoping, masked documents, deterministic name sorting, and the existing `ApiClientError` fields `message`, `status`, `code`, and `data`. Preserve current imports of `ApiClientError` from `server-client`.

**Ask First:** Any change to API routes, OpenAPI schemas, generated Kubb clients, pagination behavior, or the canonical API error envelope.

**Never:** Add `state` to Commercial list contracts, edit generated files manually, expose request headers/configuration in errors, remove safe structured API details required for action error mapping, or refactor unrelated Project wizard behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Wizard options | Active Clients and Fuel Suppliers exist | Requests use only supported list parameters and options contain `id`, `name`-based label, and masked-document detail | API errors continue to propagate as `ApiClientError` |
| Empty registries | No eligible commercial records | Client and Supplier option arrays are empty | No fabricated options or fallback labels |
| API validation/failure | Axios rejects with a canonical API envelope and request headers | `ApiClientError` exposes safe message/status/code/data only | Raw Axios request, response, config, and bearer token are not retained as `cause` |

</frozen-after-approval>

## Code Map

- `main-web-app/src/features/projects/projects.server.ts` -- server-only Project registry and wizard option adapter using generated clients.
- `main-web-app/src/lib/api/server-client.ts` -- shared Axios transport and `ApiClientError` construction.
- `main-web-app/src/lib/api/api-client-error.ts` -- new dependency-free error type that can be tested without loading Next server infrastructure.
- `main-web-app/src/lib/api/api-client-error.test.ts` -- regression coverage for safe error metadata and absence of an unsafe cause.

## Tasks & Acceptance

**Execution:**
- [x] `main-web-app/src/features/projects/projects.server.ts` -- remove unsupported Commercial `state` parameters and map Client/Supplier labels from `name`.
- [x] `main-web-app/src/lib/api/api-client-error.ts` and `server-client.ts` -- extract and re-export `ApiClientError`, remove arbitrary `cause` from its constructor, and throw it with safe canonical fields only.
- [x] `main-web-app/src/lib/api/api-client-error.test.ts` -- prove safe field preservation, canonical code extraction, and absence of raw transport state.

**Acceptance Criteria:**
- Given the Works page loads wizard data, when Client and Fuel Supplier requests execute, then neither request includes `state` and both option labels use the generated `name` field.
- Given Commercial registry rows are inactive or removed, when the canonical list executes, then existing backend `isActive: true` filtering continues to exclude them without a frontend query parameter.
- Given Axios rejects after an authenticated request, when the transport wraps the failure, then application consumers retain message/status/code/data while the resulting error has no raw Axios cause or authorization header.
- Given existing action handlers inspect `ApiClientError`, when typechecking runs, then their imports and field access remain compatible.

## Spec Change Log

## Design Notes

Keep `ApiClientError` in a pure module and re-export it from `server-client.ts`. This preserves the existing server-only import surface for production consumers while allowing a focused unit test without mocking `next/headers`, authentication cookies, session refresh, environment configuration, and Axios.

## Verification

**Commands:**
- `pnpm exec vitest run src/lib/api/api-client-error.test.ts` from `main-web-app` -- expected: safe-error regression tests pass.
- `pnpm typecheck` from `main-web-app` -- expected: no unsupported `state` or missing `displayName` errors and no regressions.
- `pnpm eslint src/features/projects/projects.server.ts src/lib/api/server-client.ts src/lib/api/api-client-error.ts src/lib/api/api-client-error.test.ts` from `main-web-app` -- expected: focused lint passes.

**Manual checks (if the local application stack is already running):**
- Open `/home/obras`; confirm Client and Supplier options render names and masked documents without `VALIDATION_ERROR`, and verify server output contains no bearer token.
