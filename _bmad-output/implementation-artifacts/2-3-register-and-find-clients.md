---
baseline_commit: 33f66fcf2083a2ea7fb506c5cb8fdcc578a37932
---

# Story 2.3: Register and Find Clients

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to register and find Clients in the selected Company,
so that reusable contracting parties are available for Project creation.

## Acceptance Criteria

1. **Given** an authenticated Session with a selected Company  
   **When** the administrator submits a valid individual or legal-entity Client  
   **Then** the Client is created inside the trusted Corporation and Company scope  
   **And** the operational payload cannot override either scope identifier.

2. **Given** a Client is created  
   **When** the entity type is individual  
   **Then** a valid CPF and full name are required  
   **And** trade name, phone, email, and address remain optional.

3. **Given** a Client is created  
   **When** the entity type is legal entity  
   **Then** a valid CNPJ and legal name are required  
   **And** trade name, phone, email, and address remain optional.

4. **Given** an active Client already has the same normalized document digest in the selected Company  
   **When** another active Client is submitted  
   **Then** creation is rejected with a stable scoped uniqueness conflict  
   **And** no plaintext document is included in the error.

5. **Given** the same normalized document belongs to a Client in another Company or Corporation  
   **When** a new Client is created in the selected Company  
   **Then** the independent record is permitted  
   **And** neither record becomes visible across scope.

6. **Given** Clients exist in the selected Company  
   **When** the administrator opens the Client registry  
   **Then** the dashboard displays a cursor-paginated table backed by persisted data  
   **And** documents are masked in the table.

7. **Given** the Client registry supports search, filters, and sorting  
   **When** the query changes  
   **Then** cursor traversal resets  
   **And** the normalized query and trusted scope are bound to every returned cursor.

8. **Given** a malformed, stale-query, or foreign-scope cursor  
   **When** a Client page is requested  
   **Then** the API returns the canonical stable cursor-validation error  
   **And** no records from another scope are exposed.

9. **Given** a valid Client detail is requested  
   **When** it belongs to the selected Company  
   **Then** authorized detail may disclose the full document  
   **And** a foreign-scope or absent identifier returns the same non-disclosing not-found response.

10. **Given** Client create, list, or detail is loading, empty, invalid, unauthorized, conflicted, successful, or failed  
    **When** the dashboard renders the state  
    **Then** it uses the existing visual system with understandable recovery behavior  
    **And** no mock Client record or unvalidated metric remains in production.

11. **Given** the Client feature contract is complete  
    **When** OpenAPI and Kubb generation run  
    **Then** the dashboard consumes the generated client through a server-only adapter and view model  
    **And** unexpected generated drift fails CI.

12. **Given** Client behavior is tested  
    **When** unit, PostgreSQL integration, and Playwright suites run  
    **Then** they cover creation variants, optional fields, scoped uniqueness, cross-scope isolation, masking, authorized detail, cursor traversal, invalid cursors, empty state, validation, and conflict recovery.  
    **And** the generated OpenAPI contract is used end to end.

## Tasks / Subtasks

- [x] Confirm prerequisites and shared foundations (AC: 1-12)
  - [x] Require Story 2.1 approval gate and Story 2.2 sensitive-document service before accepting real CPF/CNPJ in pilot workflows.
  - [x] Reuse Story 1.4 trusted selected Company context; every Client route requires authenticated Session plus `companyId`.
  - [x] Align the shared cursor-pagination implementation with `main-api/docs/PAGINATION.md` before shipping the first Client list endpoint.
  - [x] Do not implement Fuel Suppliers, Persons, Employments, Projects, or registry removal in this story.

- [x] Add the Commercial Client persistence model and constraints (AC: 1-5, 9)
  - [x] Create a `Client` Prisma model/table under the Commercial domain with UUID id, `corporationId`, `companyId`, entity type, document protection fields from Story 2.2, full/legal name fields, optional trade name, optional phone, optional email, optional address fields, active lifecycle flag/timestamps, and standard created/updated timestamps.
  - [x] Use composite ownership relations so Clients cannot reference a Company outside the Corporation.
  - [x] Enforce active scoped uniqueness on normalized document digest for `{ corporationId, companyId }`; use reviewed manual SQL partial indexes if Prisma cannot express active-only uniqueness.
  - [x] Preserve historical truth by modeling inactive/removal eligibility for Story 2.5 rather than hard-deleting Clients.

- [x] Implement backend Client API under `/api/v1/clients` (AC: 1-9, 11)
  - [x] Add a `commercial` backend module following `controller -> service -> handler -> Prisma`.
  - [x] Add `POST /api/v1/clients` requiring `requireCompanyScope`; payload contains entity type, document value, required name for that entity type, and optional trade name, phone, email, address.
  - [x] Add `GET /api/v1/clients` with canonical cursor pagination, allowlisted search/filter/sort parameters, trusted-scope and normalized-query cursor binding, masked documents, and stable empty array/pageInfo response.
  - [x] Add `GET /api/v1/clients/:clientId` returning authorized detail, including full document only through protected disclosure; absent and foreign-scope IDs return the same non-disclosing 404.
  - [x] Reject attempts to provide or override `corporationId`, `companyId`, document digest, ciphertext, key version, lifecycle flags, or audit fields from the operational payload.
  - [x] Map duplicate active document to a stable conflict code, and map invalid cursor to the canonical cursor-validation error.

- [x] Align shared cursor-pagination infrastructure before Client list ships (AC: 6-8, 11)
  - [x] Replace the current Base64 cursor helper with strict unpadded Base64URL, versioned cursor payloads, resource name, scope hash, query hash, sort metadata, and deterministic last-boundary values.
  - [x] Bind cursor scope to trusted `{ corporationId, companyId }`; never read scope from cursor or query parameters.
  - [x] Bind cursor query to defaults-applied normalized search/filter/sort state, excluding only cursor and limit.
  - [x] Fetch `limit + 1`, return `{ data, pageInfo: { hasNextPage, nextCursor } }` inside the standard success envelope, and omit total counts.
  - [x] Add contract tests for malformed cursor, wrong resource, scope mismatch, query mismatch, unsupported sort, duplicate sort values, mutation between pages, and empty result.

- [x] Generate and consume the OpenAPI/Kubb contract (AC: 10, 11)
  - [x] Define Fastify route schemas as the OpenAPI authority for Client create/list/detail.
  - [x] Regenerate OpenAPI and Kubb artifacts through existing scripts; do not manually edit generated files.
  - [x] Ensure dashboard code imports generated clients only from server-only adapters, never Client Components.
  - [x] Add drift checks so unexpected OpenAPI/Kubb changes fail CI.

- [x] Build the dashboard Client registry feature (AC: 6, 9-11)
  - [x] Add a `features/clients` vertical slice with server query, Server Action, adapter/view model, schemas, components, and tests.
  - [x] Add or update the Clients route to render a persisted cursor-paginated table using masked documents and existing visual primitives.
  - [x] Add create flow for individual and legal-entity Clients with entity-specific required fields, optional fields, validation recovery, pending state, success state, and scoped conflict recovery.
  - [x] Add detail flow that requests protected disclosure only when needed and never stores plaintext document in Zustand, URL, local/session storage, or durable client state.
  - [x] Remove production mock Client rows and unvalidated Client metrics from the route. Mock data may remain only as explicit tests/fixtures.

- [ ] Prove backend, frontend, tenant isolation, and contract behavior (AC: 1-12)
  - [x] Unit-test Client DTO validation, entity-specific required fields, optional field normalization, service conflict mapping, cursor validation, and view-model mapping.
  - [x] PostgreSQL-test creation, duplicate active document in same Company, same document in different Company/Corporation, foreign-scope non-disclosure, inactive lifecycle preparation, transaction rollback, and masked/list vs protected-detail disclosure.
  - [x] Playwright-test login/select Company, empty Client registry, successful individual Client creation, legal-entity Client creation, duplicate conflict recovery, pagination traversal, invalid/stale cursor recovery, and cross-Company isolation after workspace switch.
  - [ ] Run typecheck, lint/architecture checks, unit tests, integration tests, OpenAPI generation/drift check, Kubb generation/drift check, build, and relevant Playwright tests.

## Dev Notes

### Developer Context

- Clients are Company-scoped reusable contracting parties for later Project creation. They are not Corporation-wide in the MVP.
- This story is the first persisted Company registry using CPF/CNPJ. It must set the pattern for commercial registries without overbuilding Fuel Suppliers or removals.
- Current backend routes only register Auth under `/api/v1/auth`; no `commercial` module exists yet. Add it deliberately and register it in `main-api/src/routes/v1-routes.ts`.
- Current frontend has legacy/generic pages and mock-style resource areas under `components/pages/company`. Move production Client behavior into the intended `features/clients` slice and keep shared UI primitives business-free.

### Technical Requirements

- Client entity types are individual and legal entity. Individual requires valid CPF and full name. Legal entity requires valid CNPJ and legal name. Trade name, phone, email, and address are optional.
- Creation always uses trusted `request.authContext.corporationId` and `request.authContext.companyId`; payload-supplied scope fields are rejected or ignored before service execution.
- Documents are protected through Story 2.2: normalize, validate, encrypt, HMAC digest, record key version, mask for lists, and disclose plaintext only through authorized detail.
- Active uniqueness is scoped to selected Company and based on normalized HMAC digest. The same digest in a different Company or Corporation is allowed and invisible.
- Client list uses the canonical cursor contract and must not ship while `cursor-pagination.ts` remains the old unbound Base64 helper.
- Search/filter/sort state lives in URL/server query boundaries; server data remains backend-owned. Do not persist Clients, plaintext documents, selected Company, or API responses in Zustand.

### Architecture Compliance

- Backend dependencies follow `controller -> service -> handler -> Prisma`.
- Frontend dependencies follow `page -> feature -> server action/query -> adapter/view model -> generated Kubb client -> API`.
- Successful responses use `{ success, message, data }`; error responses use stable `code`, structured `details`, and `requestId`.
- Foreign-scope and absent Client identifiers return the same non-disclosing not-found behavior.
- PostgreSQL constraints are the final guarantee for scoped uniqueness and ownership.
- OpenAPI is generated from Fastify schemas; dashboard Kubb artifacts are generated and never manually edited.
- CPF/CNPJ plaintext never appears in URLs, cursors, logs, tokens, telemetry, request correlation, unrestricted error details, or durable browser state.

### Current Files to Reconcile and Preserve

- Expected backend surfaces include `main-api/src/modules/commercial/**`, `main-api/src/routes/v1-routes.ts`, `main-api/prisma/schema.prisma`, forward migrations, `main-api/src/lib/security/**`, `main-api/src/lib/utils/cursor-pagination.ts`, Swagger schemas, and integration tests.
- Expected frontend surfaces include `main-web-app/src/features/clients/**`, Clients route/page wiring, server-only API adapter code, generated Kubb artifacts, and E2E tests.
- Existing `main-api/src/lib/plugins/auth.plugin.ts` already exposes `requireCompanyScope`; use it instead of inventing route-local auth checks.
- Existing `main-api/docs/PAGINATION.md` marks the pagination implementation as not yet aligned. Fix shared helpers before relying on paginated Client lists.

### Testing Requirements

- PostgreSQL integration is mandatory for scoped uniqueness, ownership relations, foreign-scope non-disclosure, partial/active uniqueness, and transaction rollback.
- Playwright is mandatory because this story includes visible create/list/detail behavior and recovery states.
- Contract tests must use generated OpenAPI/Kubb artifacts end to end; do not handwrite duplicate transport types.
- Cross-scope tests must include same document digest in two Companies and two Corporations, and verify neither list/detail leaks sibling records.
- Sanitization tests must assert no plaintext CPF/CNPJ appears in logs, errors, cursors, URLs, snapshots, or generated table view models.

### Previous Story Intelligence

- Story 2.2 provides the document crypto, masking, digest, and disclosure foundation. Reuse it directly; do not implement Client-local crypto.
- Story 2.1 blocks real CPF/CNPJ entry until approval evidence exists and requires synthetic test data.
- Story 1.4 established selected Company context and stale workspace cleanup. Client lists and details must revalidate trusted Company on every server request and clear stale view state on Company changes.
- Story 1.2/1.3 established Fastify as auth authority and persisted Session validation. Do not reintroduce NextAuth or browser token storage.

### Git Intelligence Summary

- Recent commits include Epic 1 implementation and canonical pagination documentation. Client registry code has not been implemented yet.
- Current worktree before story creation contained only unrelated `.nvmrc` untracked; preserve unrelated user changes.

### Latest Technical Information

- Fastify v5 route schemas should remain the source for validation, serialization, and generated OpenAPI contracts. [Source: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]
- Prisma transactions should wrap Client create operations that combine document protection, Client persistence, conflict translation, and audit/security evidence. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Next.js Server Actions use the `"use server"` boundary for server-only mutations; keep generated API clients and credentials out of Client Components. [Source: https://nextjs.org/docs/app/api-reference/directives/use-server]
- Next.js `cookies` is an async server API in the current App Router docs; access auth cookies only through server boundaries and do not expose credential material to Client Components. [Source: https://nextjs.org/docs/app/api-reference/functions/cookies]
- Kubb packages are pinned in `main-web-app/package.json`; regenerate clients through configured scripts and do not manually edit generated artifacts. [Source: main-web-app/package.json]

### Project Structure Notes

- Backend module name should be `commercial`; frontend feature name should be `clients`.
- Keep Client-specific components/actions/queries/adapters inside `features/clients`. Shared UI stays in `components/ui` only when business-neutral.
- If current legacy company resource pages contain Client-like mocks, remove or bypass them for production Client registry behavior.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-23-Register-and-Find-Clients]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pagination]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Communication-Boundary]
- [Source: main-api/docs/PAGINATION.md]
- [Source: main-api/src/lib/utils/cursor-pagination.ts]
- [Source: main-api/src/lib/plugins/auth.plugin.ts]
- [Source: _bmad-output/implementation-artifacts/2-2-protect-cpf-and-cnpj-technically.md]
- [Source: _bmad-output/implementation-artifacts/1-4-select-and-change-the-active-company-workspace.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Implemented canonical cursor helper, Commercial Client persistence/API, OpenAPI/Kubb regeneration, and server-only dashboard registry surfaces.
- User requested not to run integration or test suites; created the test artifacts and provided execution commands for later.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Client scope, commercial module ownership, sensitive-document reuse, cursor pagination alignment, OpenAPI/Kubb generation, frontend server-only adapters, UI states, and cross-scope tests were reconciled.
- Added `Client` persistence with composite Company ownership, active scoped document uniqueness, Story 2.2 document protection, masked list responses, protected detail disclosure, and non-disclosing not-found behavior.
- Replaced the shared cursor helper with the canonical Base64URL/scope/query-bound cursor contract and generated OpenAPI/Kubb artifacts.
- Added `/home/clientes` and `/home/clientes/[clientId]` backed by server-only generated API adapters and Server Actions.
- Tests were created but not run per user instruction.

### File List

- main-api/artifacts/openapi.json
- main-api/prisma/migrations/20260701143000_commercial_registries/migration.sql
- main-api/prisma/schema.prisma
- main-api/src/lib/utils/cursor-pagination.ts
- main-api/src/lib/utils/cursor-pagination.test.ts
- main-api/src/modules/commercial/commercial.controller.ts
- main-api/src/modules/commercial/commercial.dto.ts
- main-api/src/modules/commercial/commercial.service.ts
- main-api/src/modules/commercial/handlers/commercial-registry.handler.ts
- main-api/src/routes/v1-routes.ts
- main-api/tests/integration/commercial/commercial-registries.test.ts
- main-web-app/src/app/home/clientes/page.tsx
- main-web-app/src/app/home/clientes/[clientId]/page.tsx
- main-web-app/src/components/layout/app-shell.tsx
- main-web-app/src/components/pages/company/company-overview.tsx
- main-web-app/src/features/clients/clients-page.tsx
- main-web-app/src/features/commercial-registry/commercial-registry.actions.ts
- main-web-app/src/features/commercial-registry/commercial-registry.server.ts
- main-web-app/src/features/commercial-registry/components/registry-detail-page.tsx
- main-web-app/src/features/commercial-registry/components/registry-page.tsx
- main-web-app/src/generated/**

### Change Log

- 2026-07-01: Implemented Client registry persistence, API, cursor pagination, generated contracts, dashboard list/create/detail flow, and focused test artifacts.
