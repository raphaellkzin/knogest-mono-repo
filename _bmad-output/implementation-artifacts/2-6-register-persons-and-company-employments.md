---
baseline_commit: 33f66fcf2083a2ea7fb506c5cb8fdcc578a37932
---

# Story 2.6: Register Persons and Company Employments

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to register a Person and establish their Employment in the selected Company,
so that the Company has an accurate workforce registry for future responsibilities and allocations.

## Acceptance Criteria

1. **Given** an authenticated Session with a selected Company
   **When** the administrator submits a valid CPF, Person name, Company registration number, and admission data
   **Then** the system creates or reuses the Corporation-scoped Person
   **And** creates the Company-owned Employment and its first open Employment Period atomically.

2. **Given** no Person with the normalized CPF exists in the authenticated Corporation
   **When** registration succeeds
   **Then** one Person identity is created with encrypted CPF and equality digest
   **And** that identity is not visible to another Corporation.

3. **Given** the Person already exists in the authenticated Corporation
   **When** a different Company in the same Corporation creates an Employment
   **Then** the same Person identity is reused
   **And** an independent Company Employment is created.

4. **Given** the same CPF exists in another Corporation
   **When** the selected Corporation registers the Person
   **Then** an independent Person identity is permitted
   **And** no cross-Corporation reference is created.

5. **Given** an active Employment already exists for the same Person and selected Company
   **When** duplicate Employment creation is attempted
   **Then** the operation is rejected with a stable conflict
   **And** no duplicate open Employment Period is created.

6. **Given** a Company registration number is supplied
   **When** it is persisted
   **Then** its active uniqueness is enforced inside the selected Company according to the contract
   **And** terminated historical Employments retain their original value.

7. **Given** an Employee has no Project allocation
   **When** the Employment remains active
   **Then** the Employee appears as available for future Project selection
   **And** no synthetic allocation or role is inferred.

8. **Given** Employees exist in the selected Company
   **When** the administrator opens the workforce registry
   **Then** the dashboard presents a persisted cursor-paginated table with search, allowlisted filters, deterministic sorting, masked CPF, current Employment state, and current availability
   **And** no mock role, current Project, or status is invented.

9. **Given** a Person or Employment detail is requested
   **When** it belongs to the trusted scope
   **Then** the response separates Person identity, current Employment state, and Employment Period data
   **And** foreign-scope and absent records share non-disclosing behavior.

10. **Given** Person and Employment registration is tested
    **When** contract, PostgreSQL integration, and Playwright suites run
    **Then** they cover new Person creation, same-Corporation reuse, cross-Corporation independence, duplicate active Employment, atomic rollback, masked lists, authorized detail, availability without allocation, pagination, and tenant isolation.
    **And** Person and Employment identities remain distinct.

## Tasks / Subtasks

- [x] Confirm workforce prerequisites and identity boundaries (AC: 1-10)
  - [x] Require Story 2.1 personal-data gate and Story 2.2 sensitive-document service before accepting real CPF in pilot workflows.
  - [x] Reuse trusted selected Company context from Story 1.4; Person is Corporation-scoped and Employment is Company-owned.
  - [x] Keep Person identity, Employment, Employment Periods, and future Project Allocation separate. Do not infer allocation, role, current Project, compensation, or technical responsibility in this story.
  - [x] Align shared cursor pagination with `main-api/docs/PAGINATION.md` before shipping the workforce registry list.

- [x] Add Workforce persistence model and invariants (AC: 1-7, 9-10)
  - [x] Create `Person` with UUID id, `corporationId`, protected CPF fields from Story 2.2, display/legal name fields, lifecycle timestamps, and Corporation ownership.
  - [x] Create `Employment` with UUID id, `corporationId`, `companyId`, `personId`, Company registration number, active/current lifecycle state, and created/updated timestamps.
  - [x] Create `EmploymentPeriod` with UUID id, scoped Employment relation, admission/start data, `effectiveFrom`, nullable `effectiveTo`, server-created timestamps, and optional termination fields reserved for Story 2.7.
  - [x] Enforce one Person per normalized CPF digest inside a Corporation and allow the same CPF in another Corporation.
  - [x] Enforce no duplicate active Employment for the same Person in the same Company and no duplicate open Employment Period for an Employment.
  - [x] Enforce active Company registration number uniqueness inside the selected Company while preserving historical values after termination.
  - [x] Use PostgreSQL partial unique indexes or exclusion constraints where Prisma cannot express active/open-period invariants.

- [x] Implement backend Employee registry API under `/api/v1/employees` (AC: 1-10)
  - [x] Add a `workforce` backend module following `controller -> service -> handler -> Prisma`.
  - [x] Add `POST /api/v1/employees` requiring Company scope; payload contains CPF, Person name, Company registration number, and admission data.
  - [x] In one transaction, create or reuse the Corporation-scoped Person, create the Company-owned Employment, and create the first open Employment Period.
  - [x] Add `GET /api/v1/employees` with canonical cursor pagination, search/filter/sort allowlists, masked CPF, current Employment state, and availability derived from absence of open Project allocation.
  - [x] Add `GET /api/v1/employees/:employmentId` returning detail that separates Person identity, current Employment state, and Employment Period data; absent and foreign-scope IDs return identical non-disclosing behavior.
  - [x] Reject payload attempts to set scope, Person id, digest, ciphertext, key version, lifecycle/audit fields, allocation, role, current Project, or availability.
  - [x] Map duplicate active Employment, duplicate registration number, invalid cursor, and cross-scope access to stable machine-readable codes.

- [x] Build dashboard workforce registry feature (AC: 8-10)
  - [x] Add `features/employees` with server query, Server Action, adapter/view model, form schemas, components, and tests.
  - [x] Render a persisted cursor-paginated table with masked CPF, current Employment state, current availability, and existing visual primitives.
  - [x] Add create flow for Person/Employment registration with CPF validation recovery, duplicate Employment conflict recovery, registration-number conflict recovery, pending state, and success state.
  - [x] Add detail flow that requests protected CPF disclosure only when needed and never stores plaintext CPF in Zustand, URL, local/session storage, or durable client state.
  - [x] Remove or bypass production mock employee roles, current Project values, statuses, and metrics that are not backed by accepted contracts.

- [ ] Prove identity reuse, employment invariants, pagination, and UI states (AC: 1-10)
  - [ ] Unit-test DTO validation, CPF/person/employment command mapping, conflict mapping, current-state predicates, cursor validation, and view-model mapping. Backend DTO tests were authored; broader unit coverage remains for manual follow-up.
  - [x] PostgreSQL-test new Person creation, same-Corporation Person reuse across Companies, cross-Corporation independence, duplicate active Employment, duplicate registration number, single open Employment Period, atomic rollback, masked list/protected detail behavior, and tenant isolation.
  - [x] Test availability without Project allocation as a derived current-state result, without inventing role/current Project fields.
  - [x] Playwright-test login/select Company, empty workforce registry, successful registration, same-Person second-Company employment if supported by fixtures, duplicate conflict recovery, pagination traversal, protected detail, and workspace-switch isolation.
  - [ ] Run typecheck, lint/architecture checks, unit tests, integration tests, OpenAPI generation/drift check, Kubb generation/drift check, build, and relevant Playwright tests. Not executed per user instruction.

## Dev Notes

### Developer Context

- Workforce identity is intentionally split: Person belongs to the Corporation; Employment belongs to one Company; Employment Period records active/historical admission and termination windows.
- This story creates the first Employment Period only. Story 2.7 owns termination, rehire, and maintaining multiple admission/rehire periods.
- Current backend source contains Organization/Auth/User foundation but no committed `workforce` module in the inspected tree. Add the module deliberately and register routes under `/api/v1`.
- Current frontend has generic employee mock rows under company pages. Production workforce behavior belongs in `features/employees` and must be backed by persisted data.

### Technical Requirements

- Person CPF is protected by Story 2.2: normalize, validate, encrypt, HMAC digest, record key version, mask in lists, disclose plaintext only through authorized detail.
- Person uniqueness is Corporation-scoped by normalized CPF digest. The same CPF in another Corporation creates an independent Person.
- Employment uniqueness is Company-scoped and active/current. One Person cannot have duplicate active Employment in the same Company.
- Employment Periods use half-open interval semantics `[effectiveFrom, effectiveTo)`, with `effectiveTo = null` for the single open current period.
- Admission/registration creates no Project allocation, no role, no current Project, no responsibility, no compensation, and no synthetic status beyond current Employment state and derived availability.
- Current availability means active Employment with no open Project allocation. If Project Allocation does not exist yet, expose the derivation point without inventing allocation data.

### Architecture Compliance

- Backend dependencies follow `controller -> service -> handler -> Prisma`; handlers alone access persistence.
- Cross-domain access uses public services or ports, not another module's private handlers. Future Project allocation checks should be explicit.
- Frontend dependencies follow `page -> feature -> server action/query -> adapter/view model -> generated Kubb client`.
- Paginated workforce lists must follow `main-api/docs/PAGINATION.md` and bind cursor scope to trusted Corporation/Company context.
- Fastify route schemas generate OpenAPI; dashboard Kubb artifacts are generated and never manually edited.
- CPF plaintext never appears in URLs, cursors, logs, tokens, telemetry, request correlation, unrestricted error details, or durable browser state.

### Current Files to Reconcile and Preserve

- Expected backend surfaces include `main-api/src/modules/workforce/**`, `main-api/src/routes/v1-routes.ts`, `main-api/prisma/schema.prisma`, forward migrations, sensitive-document utilities, pagination helpers, Swagger schemas, and integration tests.
- Expected frontend surfaces include `main-web-app/src/features/employees/**`, route/page wiring, server-only API adapter code, generated Kubb artifacts, and E2E tests.
- Preserve Commercial Client/Fuel Supplier behavior from Stories 2.3-2.5; Workforce should not depend on Commercial internals.
- Do not edit generated Prisma or Kubb output manually.

### Testing Requirements

- PostgreSQL integration is mandatory for Person reuse, cross-Corporation independence, active Employment uniqueness, open-period uniqueness, registration-number uniqueness, transaction rollback, and tenant isolation.
- Playwright coverage is mandatory because this story includes visible create/list/detail behavior and recovery states.
- Contract tests must use generated OpenAPI/Kubb artifacts end to end; do not handwrite duplicate transport types.
- Sanitization tests must assert no plaintext CPF appears in logs, errors, cursors, URLs, snapshots, or generated table view models.

### Previous Story Intelligence

- Story 2.5 establishes current-state versus historical-state separation. Employment detail should preserve period history without making inactive states operationally available.
- Story 2.4 reinforces selector eligibility: active/current predicates must be explicit, not inferred by the UI.
- Story 2.3 establishes persisted registry, cursor pagination, OpenAPI/Kubb, and frontend adapter patterns.
- Story 2.2 provides CPF/CNPJ document protection. Reuse it directly; do not implement Workforce-local crypto.
- Story 2.1 blocks real CPF/CNPJ entry until approval evidence exists and requires synthetic test data.

### Git Intelligence Summary

- Recent commits include Epic 1 implementation and canonical pagination documentation. No committed Workforce registry code was found during story creation.
- Existing untracked Stories 2.1-2.3 and modified `sprint-status.yaml` are user/workflow state and must be preserved.

### Latest Technical Information

- Prisma transactions should wrap the Person reuse, Employment creation, Employment Period creation, conflict translation, and rollback boundary. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Fastify v5 route schemas should remain the validation, serialization, and OpenAPI source for Employee create/list/detail contracts. [Source: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]
- Node.js v22 crypto primitives are consumed through Story 2.2 for protected CPF handling; this story should call the shared service rather than use crypto directly inside Workforce. [Source: https://nodejs.org/docs/latest-v22.x/api/crypto.html]
- Next.js Server Actions provide the server-only mutation path for employee registration; generated API clients and credentials stay outside Client Components. [Source: https://nextjs.org/docs/app/api-reference/directives/use-server]
- Next.js `cookies` is a server API; authenticated server calls keep credential access inside server boundaries. [Source: https://nextjs.org/docs/app/api-reference/functions/cookies]

### Project Structure Notes

- Backend module name should be `workforce`; frontend feature name should be `employees`.
- The public API may use `/api/v1/employees` for the operational registry while preserving internal Person/Employment separation.
- Keep Person/Employment components, actions, queries, adapters, and schemas inside `features/employees` unless a helper is demonstrably reusable.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-26-Register-Persons-and-Company-Employments]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Sensitive-Documents]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-9-Register-Corporation-Person-and-Company-Employment]
- [Source: main-api/docs/PAGINATION.md]
- [Source: main-api/AGENTS.md]
- [Source: main-api/prisma/schema.prisma]
- [Source: _bmad-output/implementation-artifacts/2-5-remove-clients-and-fuel-suppliers-from-operational-use.md]
- [Source: _bmad-output/implementation-artifacts/2-2-protect-cpf-and-cnpj-technically.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01: Added Workforce persistence, migration, Employee API, dashboard feature, OpenAPI/Kubb generation, and workforce test artifacts.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Corporation-scoped Person identity, Company-owned Employment, first open Employment Period, CPF protection, active uniqueness, registration-number uniqueness, availability without allocation, workforce registry pagination, OpenAPI/Kubb generation, frontend adapters, UI states, and tenant-isolation tests were reconciled.
- Implemented Corporation-scoped Person reuse and Company-owned Employment creation with first open Employment Period in one transaction.
- Added active uniqueness constraints for Person CPF digest, Employment per Company/Person, Company registration number, and open Employment Period.
- Replaced the `/home/funcionarios` mock resource with a persisted workforce registry and protected detail route.
- Generated OpenAPI and Kubb clients. Test suites were not executed per user instruction.

### File List

- main-api/prisma/schema.prisma
- main-api/prisma/migrations/20260701160000_commercial_removal_and_workforce/migration.sql
- main-api/artifacts/openapi.json
- main-api/src/lib/utils/appError.ts
- main-api/src/modules/workforce/workforce.dto.ts
- main-api/src/modules/workforce/workforce.dto.test.ts
- main-api/src/modules/workforce/workforce.service.ts
- main-api/src/modules/workforce/workforce.controller.ts
- main-api/src/modules/workforce/handlers/workforce.handler.ts
- main-api/src/routes/v1-routes.ts
- main-api/tests/integration/workforce/workforce-registry.test.ts
- main-web-app/src/generated/**
- main-web-app/src/app/home/funcionarios/page.tsx
- main-web-app/src/app/home/funcionarios/[employmentId]/page.tsx
- main-web-app/src/features/employees/**
- main-web-app/src/components/layout/app-shell.tsx
- main-web-app/src/components/pages/company/company-overview.tsx
- main-web-app/tests/e2e/workforce-registry.spec.ts

### Change Log

- 2026-07-01: Implemented Workforce persistence, API, dashboard feature, contract generation, and validation artifacts.
