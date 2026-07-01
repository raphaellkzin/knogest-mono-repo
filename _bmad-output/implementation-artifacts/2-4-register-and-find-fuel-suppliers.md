---
baseline_commit: 33f66fcf2083a2ea7fb506c5cb8fdcc578a37932
---

# Story 2.4: Register and Find Fuel Suppliers

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to register and find Fuel Suppliers in the selected Company,
so that eligible suppliers can later be associated with Project-specific fuel terms.

## Acceptance Criteria

1. **Given** an authenticated Session with a selected Company
   **When** the administrator submits a valid individual or legal-entity Fuel Supplier
   **Then** the Supplier is created inside the trusted Corporation and Company scope
   **And** the registry type is fixed to fuel supply in the MVP.

2. **Given** a Fuel Supplier is an individual
   **When** it is created
   **Then** a valid CPF and full name are required
   **And** allowed optional contact and address fields follow the documented contract.

3. **Given** a Fuel Supplier is a legal entity
   **When** it is created
   **Then** a valid CNPJ and legal name are required
   **And** allowed optional contact and address fields follow the documented contract.

4. **Given** an active Fuel Supplier already has the same normalized document digest in the selected Company
   **When** another active Fuel Supplier is submitted
   **Then** creation is rejected with a stable scoped uniqueness conflict.
   **And** no duplicate active Supplier is persisted.

5. **Given** a Client in the selected Company has the same normalized CPF or CNPJ
   **When** a Fuel Supplier is registered
   **Then** creation is permitted because Client and Fuel Supplier are separate aggregates
   **And** neither registry shares mutable base records.

6. **Given** a same-document Fuel Supplier exists in another Company or Corporation
   **When** the selected Company registers its own Supplier
   **Then** creation is permitted within its independent scope
   **And** foreign data remains inaccessible.

7. **Given** Fuel Suppliers exist
   **When** the administrator uses the registry
   **Then** the dashboard supports persisted cursor pagination, search, allowlisted filtering, deterministic sorting, masked documents, and authorized detail
   **And** cursor semantics match the canonical pagination contract.

8. **Given** a Fuel Supplier is inactive or removed
   **When** an operational selector is requested
   **Then** the Supplier is excluded
   **And** historical access does not restore selection eligibility.

9. **Given** the fixed Fuel Type catalog is initialized
   **When** reference seeds run
   **Then** Diesel S10 and Diesel S500 exist deterministically
   **And** development fixture resets do not duplicate or mutate those identities.

10. **Given** the Fuel Supplier feature is rendered
    **When** loading, empty, validation, conflict, unauthorized, success, or error conditions occur
    **Then** the interface provides understandable state and recovery
    **And** no generic supplier categories or mock-derived fields are exposed.

11. **Given** Fuel Supplier behavior is tested
    **When** contract, PostgreSQL integration, and Playwright suites run
    **Then** they cover entity variants, separate Client/Supplier identity, scoped uniqueness, cross-scope isolation, active selectors, canonical pagination, fixed Fuel Types, masking, detail authorization, and frontend states.
    **And** no generic supplier category is introduced.

## Tasks / Subtasks

- [x] Confirm prerequisites and commercial registry boundaries (AC: 1-11)
  - [x] Require Story 2.1 approval gate and Story 2.2 sensitive-document service before accepting real CPF/CNPJ in pilot workflows.
  - [x] Reuse Story 2.3 Commercial module patterns for Client create/list/detail, OpenAPI/Kubb, dashboard adapter, and cursor pagination.
  - [x] Keep Fuel Supplier as a separate aggregate from Client. Do not introduce a shared mutable party/contact base record.
  - [x] Keep supplier category fixed to fuel supply in the MVP; do not add generic vendor categories, purchasing modules, or Project Fuel Agreement behavior.

- [x] Add Fuel Supplier persistence and fixed Fuel Type reference data (AC: 1-9)
  - [x] Extend the Commercial domain with a Fuel Supplier model/table carrying UUID id, `corporationId`, `companyId`, entity type, sensitive-document fields, required name fields, optional contact/address fields, lifecycle state, and created/updated timestamps.
  - [x] Enforce active scoped uniqueness by normalized document digest for `{ corporationId, companyId }` within Fuel Suppliers only.
  - [x] Permit the same document digest to exist independently in Clients, another Company, or another Corporation.
  - [x] Add deterministic Fuel Type reference records for Diesel S10 and Diesel S500 through immutable reference seeds, not disposable development fixtures.
  - [x] Model inactive/removal eligibility for Story 2.5 with current-state predicates; do not hard-delete Fuel Suppliers.

- [x] Implement backend Fuel Supplier API under `/api/v1/fuel-suppliers` (AC: 1-8, 10-11)
  - [x] Add `POST /api/v1/fuel-suppliers` requiring trusted Company scope; payload contains entity type, document value, required name for that entity type, and allowed optional contact/address fields.
  - [x] Add `GET /api/v1/fuel-suppliers` using canonical cursor pagination, masked documents, allowlisted search/filter/sort, trusted scope binding, and empty `data`/`pageInfo` response.
  - [x] Add `GET /api/v1/fuel-suppliers/:fuelSupplierId` with authorized detail and protected document disclosure; absent and foreign-scope IDs return the same non-disclosing 404.
  - [x] Add an operational selector/query that returns only active Fuel Suppliers eligible for future Project fuel terms.
  - [x] Reject payload attempts to set scope, digest, ciphertext, key version, lifecycle/audit fields, or supplier category.
  - [x] Map duplicate active Fuel Supplier document to a stable conflict code and invalid cursor to the canonical cursor-validation error.

- [x] Align OpenAPI/Kubb and dashboard Fuel Supplier feature (AC: 7, 10-11)
  - [x] Define Fastify route schemas as the OpenAPI authority and regenerate OpenAPI/Kubb artifacts through existing scripts.
  - [x] Add `features/fuel-suppliers` with server query, Server Action, adapter/view model, schemas, components, and tests.
  - [x] Render a persisted cursor-paginated table with masked documents, fixed fuel-supply wording, and existing visual primitives.
  - [x] Add create/detail flows for individual and legal-entity suppliers with validation recovery, duplicate conflict recovery, success state, and protected disclosure only when needed.
  - [x] Remove or bypass production mock supplier rows, generic supplier categories, and unvalidated supplier metrics. Mocks may remain only as explicit test fixtures.

- [ ] Prove supplier identity, selector, catalog, and contract behavior (AC: 1-11)
  - [x] Unit-test DTO validation, entity-specific required fields, conflict mapping, selector filtering, cursor validation, fixed Fuel Type seed expectations, and view-model mapping.
  - [x] PostgreSQL-test same-document Fuel Supplier conflict in one Company, same document allowed as Client, same document allowed in another Company/Corporation, foreign-scope non-disclosure, inactive selector exclusion, and transaction rollback.
  - [x] Playwright-test login/select Company, empty supplier registry, individual creation, legal-entity creation, duplicate conflict recovery, pagination traversal, detail disclosure, selector exclusion, and workspace-switch isolation.
  - [ ] Run typecheck, lint/architecture checks, unit tests, integration tests, OpenAPI generation/drift check, Kubb generation/drift check, build, and relevant Playwright tests.

## Dev Notes

### Developer Context

- Fuel Suppliers are Company-scoped Commercial records used later by Project-specific fuel terms. This story prepares the registry and selectors only.
- Story 2.3 owns Client behavior and establishes the Commercial module pattern. Extend that module, but do not collapse Client and Fuel Supplier into one base entity.
- The current repository has no committed `commercial` module yet in the inspected source. If Story 2.3 is not implemented first, implement or preserve its shared foundations before adding Fuel Supplier behavior.
- Current frontend contains generic resource/mock areas under `components/pages/company`; production Fuel Supplier behavior belongs in `features/fuel-suppliers`, not in generic mock state.

### Technical Requirements

- Fuel Supplier entity types are individual and legal entity. Individual requires valid CPF and full name. Legal entity requires valid CNPJ and legal name.
- Creation always uses trusted authenticated `corporationId` and selected `companyId`; operational payloads never provide scope.
- Sensitive documents use Story 2.2 normalization, validation, AES-256-GCM encryption, HMAC digest, key version, masking, redaction, and protected disclosure.
- Active uniqueness is scoped to Fuel Suppliers in the selected Company. A same-document Client in the same Company is permitted and must not share mutable base data.
- Operational selectors return active/current Fuel Suppliers only. Historical paths remain explicit and cannot make a removed Supplier selectable.
- Diesel S10 and Diesel S500 are immutable system reference records seeded idempotently; development fixture resets must not duplicate or mutate them.

### Architecture Compliance

- Backend dependencies follow `controller -> service -> handler -> Prisma`; handlers alone access persistence.
- Frontend dependencies follow `page -> feature -> server action/query -> adapter/view model -> generated Kubb client -> API`.
- Paginated lists must follow `main-api/docs/PAGINATION.md`; do not ship this list while the shared cursor helper remains unbound Base64 JSON.
- Fastify route schemas generate OpenAPI. Dashboard Kubb artifacts are generated and never manually edited.
- CPF/CNPJ plaintext never appears in URLs, cursors, logs, tokens, telemetry, request correlation, unrestricted error details, or durable browser state.
- Foreign-scope and absent Supplier identifiers return identical non-disclosing behavior.

### Current Files to Reconcile and Preserve

- Expected backend surfaces include `main-api/src/modules/commercial/**`, `main-api/src/routes/v1-routes.ts`, `main-api/prisma/schema.prisma`, forward migrations, `main-api/prisma/seeds/reference-data.ts`, `main-api/src/lib/security/**`, pagination helpers, Swagger schemas, and integration tests.
- Expected frontend surfaces include `main-web-app/src/features/fuel-suppliers/**`, route/page wiring, server-only API adapter code, generated Kubb artifacts, and E2E tests.
- Preserve Story 2.3 Client files and behavior. Fuel Supplier changes should reuse shared Commercial utilities only when they are truly registry-neutral.
- Do not edit generated Prisma or Kubb output manually.

### Testing Requirements

- PostgreSQL integration is mandatory for scoped uniqueness, separate Client/Supplier identity, selector exclusion, fixed Fuel Type seeding, ownership constraints, foreign-scope non-disclosure, and rollback.
- Playwright coverage is mandatory for visible create/list/detail behavior and recovery states.
- Contract tests must consume generated OpenAPI/Kubb artifacts end to end.
- Sanitization tests must assert no plaintext CPF/CNPJ appears in logs, errors, cursors, URLs, snapshots, or generated table view models.

### Previous Story Intelligence

- Story 2.3 establishes the Client registry and warns not to overbuild Fuel Suppliers or removals there. This story should extend the Commercial pattern without rewriting Client behavior.
- Story 2.2 provides document crypto, masking, digest, and disclosure. Reuse it directly; do not implement Supplier-local crypto.
- Story 2.1 blocks real CPF/CNPJ entry until approval evidence exists and requires synthetic test data.
- Story 1.4 established selected Company context and stale workspace cleanup. Supplier lists/details must revalidate trusted Company on every server request and clear stale view state after Company changes.

### Git Intelligence Summary

- Recent commits include Epic 1 implementation and canonical pagination documentation. No committed Fuel Supplier registry code was found during story creation.
- Existing untracked Stories 2.1-2.3 and modified `sprint-status.yaml` are user/workflow state and must be preserved.

### Latest Technical Information

- Fastify v5 route schemas remain the validation, serialization, and OpenAPI source for this API surface. [Source: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]
- Prisma transactions should wrap create operations that combine document protection, persistence, conflict translation, and reference/selector guarantees. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Node.js v22 crypto provides the AES-GCM and HMAC primitives consumed through Story 2.2; this story should call that shared service rather than use crypto directly inside the Commercial module. [Source: https://nodejs.org/docs/latest-v22.x/api/crypto.html]
- Next.js Server Actions provide the server-only mutation boundary; generated clients and credentials remain outside Client Components. [Source: https://nextjs.org/docs/app/api-reference/directives/use-server]
- Next.js `cookies` is a server API; credential access stays in server boundaries and must not be exposed to UI components. [Source: https://nextjs.org/docs/app/api-reference/functions/cookies]

### Project Structure Notes

- Backend module name should remain `commercial`; frontend feature name should be `fuel-suppliers`.
- Keep Fuel Supplier feature code in its owning feature. Shared UI stays in `components/ui` only when business-neutral.
- Fixed Fuel Types belong in reference-data seeding and read contracts, not as editable dashboard supplier categories.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-24-Register-and-Find-Fuel-Suppliers]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/planning-artifacts/architecture.md#Sensitive-Documents]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pagination]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-15-Register-Fuel-Supplier]
- [Source: main-api/docs/PAGINATION.md]
- [Source: main-api/AGENTS.md]
- [Source: main-api/prisma/schema.prisma]
- [Source: _bmad-output/implementation-artifacts/2-3-register-and-find-clients.md]
- [Source: _bmad-output/implementation-artifacts/2-2-protect-cpf-and-cnpj-technically.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Extended the Commercial module with Fuel Supplier persistence/API, active selector, fixed Fuel Type seed data, and dashboard route replacement.
- User requested not to run integration or test suites; created the test artifacts and provided execution commands for later.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Fuel Supplier scope, separate Client/Supplier identity, sensitive-document reuse, fixed Fuel Type catalog, selector eligibility, cursor pagination, OpenAPI/Kubb generation, frontend server-only adapters, UI states, and cross-scope tests were reconciled.
- Added `FuelSupplier` persistence with active scoped uniqueness independent from Clients, Story 2.2 document protection, canonical cursor list/detail endpoints, and active-only selector endpoint.
- Added immutable `FuelType` reference seed records for Diesel S10 and Diesel S500.
- Replaced the `/home/fornecedores` production route with Fuel Supplier registry behavior and added `/home/fornecedores/[fuelSupplierId]` detail disclosure.
- Tests were created but not run per user instruction.

### File List

- main-api/artifacts/openapi.json
- main-api/prisma/migrations/20260701143000_commercial_registries/migration.sql
- main-api/prisma/schema.prisma
- main-api/prisma/seeds/reference-data.ts
- main-api/src/lib/utils/cursor-pagination.ts
- main-api/src/lib/utils/cursor-pagination.test.ts
- main-api/src/modules/commercial/commercial.controller.ts
- main-api/src/modules/commercial/commercial.dto.ts
- main-api/src/modules/commercial/commercial.service.ts
- main-api/src/modules/commercial/handlers/commercial-registry.handler.ts
- main-api/src/routes/v1-routes.ts
- main-api/tests/integration/commercial/commercial-registries.test.ts
- main-web-app/src/app/home/fornecedores/page.tsx
- main-web-app/src/app/home/fornecedores/[fuelSupplierId]/page.tsx
- main-web-app/src/components/layout/app-shell.tsx
- main-web-app/src/components/pages/company/company-overview.tsx
- main-web-app/src/features/fuel-suppliers/fuel-suppliers-page.tsx
- main-web-app/src/features/commercial-registry/commercial-registry.actions.ts
- main-web-app/src/features/commercial-registry/commercial-registry.server.ts
- main-web-app/src/features/commercial-registry/components/registry-detail-page.tsx
- main-web-app/src/features/commercial-registry/components/registry-page.tsx
- main-web-app/src/generated/**

### Change Log

- 2026-07-01: Implemented Fuel Supplier registry persistence, API, selector, fixed Fuel Type seeds, generated contracts, dashboard list/create/detail flow, and focused test artifacts.
