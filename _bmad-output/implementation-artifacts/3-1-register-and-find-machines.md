---
baseline_commit: 90c73e276e509f583785b4841867ee1c8c681033
---

# Story 3.1: Register and Find Machines

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to register and find Machines owned by the selected Company,
so that the Company has trustworthy equipment available for future Project allocation.

## Acceptance Criteria

1. **Given** an authenticated Session with a selected Company
   **When** the administrator submits a Machine with name, description, fixed type, manufacturer, model, identifiers, immutable meter type, and initial Meter Reading
   **Then** the Machine, first Machine Ownership Period, identifiers, and initial confirmed Meter Reading are created atomically
   **And** Corporation and Company ownership come only from trusted Session context.

2. **Given** a Machine is registered
   **When** its type is supplied
   **Then** only `YELLOW_LINE` or `WHITE_LINE` is accepted
   **And** the free-text model describes the specific equipment form without creating another type catalog.

3. **Given** Machine identifiers are supplied
   **When** validation runs
   **Then** at least one of plate or Company tag is required
   **And** both may be stored when present.

4. **Given** an active Machine in the selected Company already uses the submitted normalized plate or Company tag
   **When** registration is attempted
   **Then** the command is rejected with a stable scoped identifier conflict
   **And** no partial Machine, ownership period, identifier, or Meter Reading remains.

5. **Given** the same plate or tag exists under active ownership in another Company or Corporation
   **When** a Machine is registered in the selected Company
   **Then** uniqueness follows the approved Company ownership scope
   **And** no foreign Machine information is disclosed.

6. **Given** an initial Meter Reading is submitted
   **When** it is validated
   **Then** it must be a non-negative decimal represented without binary floating-point persistence
   **And** its immutable Machine meter type is either hour-meter or odometer and applies to the whole reading chain
   **And** it is recorded as the first confirmed reading with trusted actor and server transaction instant.

7. **Given** Machines exist in the selected Company
   **When** the administrator opens the Machine registry
   **Then** the dashboard displays a persisted cursor-paginated table with search, allowlisted filters, deterministic sorting, current identifiers, type, manufacturer, model, latest confirmed Meter Reading, and availability
   **And** it excludes mock fields and operational metrics not required by the product.

8. **Given** search, filters, or sorting change
   **When** another Machine page is requested
   **Then** cursor traversal resets
   **And** the new opaque cursor is bound to normalized query and trusted scope.

9. **Given** a malformed, stale-query, or foreign-scope cursor
   **When** the list endpoint receives it
   **Then** the canonical cursor-validation error is returned
   **And** no foreign records are exposed.

10. **Given** a Machine detail is requested
    **When** it belongs to the selected Company
    **Then** current registration, ownership, identifiers, latest Meter Reading, and availability are returned through a view model
    **And** absent and foreign-scope identifiers share non-disclosing behavior.

11. **Given** Machine registration or listing is loading, empty, invalid, unauthorized, conflicted, successful, or failed
    **When** the dashboard renders
    **Then** it provides an understandable stable-layout state and safe recovery
    **And** uses generated server-only API clients through the frontend adapter boundary.

12. **Given** Machine registration is tested
    **When** unit, real-PostgreSQL integration, OpenAPI generation, frontend, and Playwright suites run
    **Then** they cover both fixed types, plate-only, tag-only, both identifiers, missing identifiers, scoped conflicts, numeric precision, atomic rollback, pagination, isolation, and UI states.
    **And** generated clients remain the dashboard transport authority.

## Tasks / Subtasks

- [ ] Confirm Fleet prerequisites and story boundaries (AC: 1-12)
  - [ ] Reuse trusted selected Company context from Story 1.4; no request body, query, route parameter, cursor, form field, Client Component, or Zustand state may supply Corporation or Company scope.
  - [ ] Build the first Fleet vertical slice; do not add Project allocation, ownership transfer, retirement, maintenance, fueling, RDO, or operational analytics in this story.
  - [ ] Treat Machine availability as "currently owned by the selected Company and not blocked by implemented lifecycle/allocation state"; until Project allocations exist, expose the derivation point without inventing allocation data.
  - [ ] Replace or bypass production mock behavior on `/home/maquinas`; mocks may remain only as explicit tests or fixtures.

- [ ] Add Fleet persistence and invariants (AC: 1-6, 10, 12)
  - [ ] Add `Machine` with UUID id, `corporationId`, core registration fields, fixed type enum, lifecycle timestamps, and current-state fields needed for registry/detail views.
  - [ ] Add `MachineOwnershipPeriod` with scoped Company ownership, half-open `[effectiveFrom, effectiveTo)` semantics, `effectiveTo = null` for current ownership, and immutable closed history.
  - [ ] Add Machine identifier persistence for normalized plate and Company tag, allowing either or both while requiring at least one at create time.
  - [ ] Enforce active/current identifier uniqueness inside `{ corporationId, companyId }`; use reviewed manual SQL partial unique indexes if Prisma cannot express active scoped uniqueness.
  - [ ] Add `MachineMeterReading` with non-negative `numeric(14,2)`, confirmed state, actor user id, server transaction instant, source/purpose for initial reading, and fields needed by Story 3.2 correction audit.
  - [ ] Create Machine, current ownership period, identifiers, and initial confirmed reading inside one transaction so conflict or validation failures leave no partial state.

- [ ] Implement backend Machine registry API under `/api/v1/machines` (AC: 1-10, 12)
  - [ ] Add a `fleet` backend module following `controller -> service -> handler -> Prisma`, and register it from `main-api/src/routes/v1-routes.ts`.
  - [ ] Add `POST /api/v1/machines` requiring Company scope and trusted actor user id; payload includes name, description, type, manufacturer, model, optional plate, optional company tag, and initial meter reading as a decimal string.
  - [ ] Add `GET /api/v1/machines` with canonical cursor pagination, allowlisted search/filter/sort parameters, current identifiers, fixed type, manufacturer, model, latest confirmed reading, and availability.
  - [ ] Add `GET /api/v1/machines/:machineId` returning current registration, current ownership, identifiers, latest reading, and availability; absent and foreign-scope IDs return the same non-disclosing 404.
  - [ ] Reject attempts to provide or override scope, Machine id, ownership ids, lifecycle/audit fields, latest reading metadata, allocation status, transfer state, or retirement state from the operational payload.
  - [ ] Map duplicate plate/tag, invalid type, missing identifiers, invalid decimal, invalid cursor, and cross-scope access to stable machine-readable codes.

- [ ] Build the dashboard Machine registry feature (AC: 7-12)
  - [ ] Add `main-web-app/src/features/machines/**` with server query, Server Action, adapter/view model, form schema, components, and focused tests.
  - [ ] Replace `/home/maquinas` with a persisted cursor-paginated table that uses the existing application shell and visual primitives.
  - [ ] Render search, allowlisted filters, deterministic sorting, current identifiers, type, manufacturer, model, latest confirmed Meter Reading, and availability without adding mock metrics or unapproved operational columns.
  - [ ] Add create flow for both fixed types, plate-only, tag-only, and both identifiers, with pending, validation, conflict, success, empty, unauthorized, and failure recovery states.
  - [ ] Keep generated Kubb clients and credentials server-only; Client Components consume view models and local interaction state only.

- [ ] Generate contracts and prove behavior (AC: 1-12)
  - [ ] Define Fastify route schemas as the OpenAPI authority for Machine create/list/detail.
  - [ ] Regenerate OpenAPI and Kubb artifacts through existing scripts; do not manually edit generated files.
  - [ ] Unit-test DTO validation, decimal string normalization, fixed type validation, identifier normalization, conflict mapping, cursor validation, and view-model mapping.
  - [ ] PostgreSQL-test atomic create, initial reading persistence, active scoped plate/tag uniqueness, same identifier in another Company/Corporation, missing identifiers, rollback, masked/non-disclosing scope behavior, and pagination boundaries.
  - [ ] Frontend-test form states, adapter mappings, cursor reset on query change, stable error recovery, and no generated client imports from Client Components.
  - [ ] Playwright-test login/select Company, empty Machine registry, successful Machine creation, duplicate identifier conflict, pagination traversal, detail view, and workspace-switch isolation.
  - [ ] Run typecheck, lint/architecture checks, unit tests, integration tests, OpenAPI generation/drift check, Kubb generation/drift check, build, and relevant Playwright tests.

### Review Findings

- [x] [Review][Patch] Scope returned Machine nested data by selected Company [main-api/src/modules/fleet/handlers/fleet.handler.ts:49]
- [x] [Review][Patch] Enforce a single open ownership period per Machine [main-api/prisma/migrations/20260701193000_fleet_review_hardening/migration.sql:1]
- [x] [Review][Patch] Reject identifiers whose normalized value is empty [main-api/src/modules/fleet/fleet.service.ts:27]
- [x] [Review][Patch] Omit identifier search predicate when normalized search is empty [main-api/src/modules/fleet/handlers/fleet.handler.ts:196]
- [x] [Review][Patch] Reject invalid createdAt cursor boundaries with canonical validation error [main-api/src/modules/fleet/handlers/fleet.handler.ts:162]
- [x] [Review][Patch] Align OpenAPI decimal pattern with DTO validation [main-api/src/modules/fleet/fleet.controller.ts:176]
- [x] [Review][Patch] Return an application auth/scope error instead of generic 500 when scope is missing [main-api/src/modules/fleet/fleet.controller.ts:228]
- [x] [Review][Patch] Add missing Story 3.1 acceptance coverage for plate-only, both identifiers, atomic rollback, cursor errors, pagination traversal, and cross-scope detail/list isolation [main-api/tests/integration/fleet/fleet-machines.test.ts:86]
- [x] [Review][Patch] Validate cursor boundary IDs as UUIDs and require canonical ISO timestamps so malformed boundaries always return the canonical validation error [main-api/src/modules/fleet/handlers/fleet.handler.ts:162]
- [x] [Review][Patch] Express the plate-or-company-tag requirement in the Fastify/OpenAPI request schema, not only in the downstream DTO validator [main-api/src/modules/fleet/fleet.controller.ts:162]
- [x] [Review][Patch] Strengthen cursor pagination coverage to prove pages do not repeat records and traversal terminates [main-api/tests/integration/fleet/fleet-machines.test.ts:298]
- [x] [Review][Patch] Add exact numeric(14,2) boundary persistence coverage for the initial Meter Reading [main-api/tests/integration/fleet/fleet-machines.test.ts:440]
- [x] [Review][Patch] Correct completed review evidence that points to the original migration although the ownership-index fix lives in the hardening migration [_bmad-output/implementation-artifacts/3-1-register-and-find-machines.md:122]

## Dev Notes

### Developer Context

- Epic 3 creates the Fleet foundation used later by Project optional machine mobilization, allocation/reallocation, ownership transfer, retirement, and Machine history inspection.
- This story owns Machine registration/current registry behavior and the initial confirmed Meter Reading only. Story 3.2 hardens later reading append/correction rules.
- The current inspected backend has `commercial` and `workforce` modules but no `fleet` module. Add the Fleet module deliberately rather than extending Commercial or Workforce.
- The current `/home/maquinas` route renders `CompanyResourcePage resource="machines"`, which is mock/generic production behavior. Replace it with a real `features/machines` route surface.

### Technical Requirements

- Fixed Machine types are exactly `YELLOW_LINE` and `WHITE_LINE`; do not create an editable type catalog. Every Machine also has an immutable meter type: `HOUR_METER` or `ODOMETER`.
- Machine identifiers are normalized before persistence and conflict checks. At least one of plate or Company tag is required; both are allowed.
- Active identifier uniqueness is scoped to current selected Company ownership. The same normalized identifier in another Company or Corporation must not leak or block unless the approved ownership scope says it should.
- Meter Reading values cross API boundaries as normalized decimal strings and persist as non-negative `numeric(14,2)` to avoid binary floating-point rounding.
- The initial reading is a confirmed reading and must store trusted actor user id plus server transaction instant.
- Availability must be a backend-derived view-model field, not a UI invention. Until Projects exist, do not expose current Project, field status, production metrics, cost, RDO, alerts, or "Machines in the field" metrics.

### Architecture Compliance

- Backend dependencies follow `controller -> service -> handler -> Prisma`; handlers alone access persistence.
- Every tenant-owned row carries `corporationId`; every Company-owned row carries both `corporationId` and `companyId`.
- Repositories and handlers receive trusted scope explicitly and never accept it from operational payloads.
- Successful responses use `{ success, message, data }`; errors use stable `code`, structured `details`, and `requestId`.
- Paginated Machine lists must follow `main-api/docs/PAGINATION.md`, including unpadded Base64URL cursors bound to normalized query and trusted scope.
- Fastify route schemas generate OpenAPI; dashboard Kubb artifacts are generated and never manually edited.
- Frontend dependencies follow `page -> feature -> server action/query -> adapter/view model -> generated Kubb client`.
- Client Components never import generated clients, credentials, or low-level API transport code.

### Current Files to Reconcile and Preserve

- Expected backend surfaces include `main-api/src/modules/fleet/**`, `main-api/src/routes/v1-routes.ts`, `main-api/prisma/schema.prisma`, forward migrations, `main-api/src/lib/utils/cursor-pagination.ts`, OpenAPI schemas, and integration tests.
- Expected frontend surfaces include `main-web-app/src/app/home/maquinas/page.tsx`, `main-web-app/src/features/machines/**`, generated Kubb artifacts, and Playwright tests.
- Preserve Commercial and Workforce registry behavior from Epic 2. Fleet must not import private handlers from those modules.
- Keep generated Prisma and Kubb output replaceable; regenerate through configured scripts only.

### Testing Requirements

- PostgreSQL integration is mandatory for active scoped uniqueness, ownership relations, initial reading precision, transaction rollback, and tenant isolation.
- Playwright coverage is mandatory because this story replaces a visible registry route and adds create/list/detail recovery states.
- Contract tests must verify generated OpenAPI/Kubb clients expose the Machine API and that the dashboard uses generated clients only through server-only boundaries.
- Sanitization tests must assert Machine identifiers and scope details do not leak through foreign-scope errors, cursors, logs, or unauthorized UI states.

### Previous Story Intelligence

- Story 2.7 is currently in progress and extends Workforce temporal behavior; Fleet should follow the same current-state versus historical-state separation.
- Story 2.6 established the persisted registry pattern for Employee list/detail, generated contracts, frontend adapters, and tenant-isolation tests.
- Story 2.5 established operational removal as lifecycle state, not hard deletion. Future Machine retirement should follow the same preservation mindset, but retirement is out of scope here.
- Story 2.3 established canonical cursor pagination, OpenAPI/Kubb generation, and server-only frontend API adapters.
- Story 1.4 established trusted selected Company context and stale workspace cleanup. Machine pages must revalidate Company scope on every server request and clear stale view state on Company changes.

### Git Intelligence Summary

- Recent commits show Epic 2 work: Story 2.5 implemented Commercial removal, Story 2.6 implemented Workforce registry, and Story 2.7 extended Workforce rehire behavior.
- Current source contains `commercial` and `workforce` modules, generated OpenAPI/Kubb artifacts, and a mock/generic Machine page that must be replaced for this story.
- Existing user/workflow changes in Epic 2 artifacts and frontend Workforce files must be preserved.

### Latest Technical Information

- Fastify route schemas remain the validation, serialization, and OpenAPI source for Machine create/list/detail contracts. [Source: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]
- Prisma transactions should wrap Machine creation, ownership period creation, identifier persistence, initial reading persistence, conflict translation, and rollback. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Next.js Server Actions provide the server-only mutation path for Machine registration; generated API clients and credentials stay outside Client Components. [Source: https://nextjs.org/docs/app/api-reference/directives/use-server]
- Kubb packages are pinned in `main-web-app/package.json`; regenerate clients through configured scripts and do not manually edit generated artifacts. [Source: main-web-app/package.json]

### Project Structure Notes

- Backend module name should be `fleet`; frontend feature name should be `machines`.
- Public API should use `/api/v1/machines` for current Machine registry behavior while preserving internal separation between Machine, ownership, identifiers, and Meter Readings.
- Keep Machine-specific components, actions, queries, adapters, and schemas inside `features/machines` unless a helper is demonstrably reusable.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-31-Register-and-Find-Machines]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-3-Register-Machines-and-Preserve-Meter-History]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-17-Register-Machine]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-18-Preserve-Monotonic-Meter-History]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#API-and-Communication-Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: main-api/AGENTS.md]
- [Source: main-api/docs/PAGINATION.md]
- [Source: main-api/prisma/schema.prisma]
- [Source: main-web-app/src/app/home/maquinas/page.tsx]
- [Source: _bmad-output/implementation-artifacts/2-6-register-persons-and-company-employments.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01T13:45:22-03:00: Implemented Fleet persistence/API/frontend draft; tests intentionally not executed per user instruction.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Fleet module boundaries, Machine registration, ownership period creation, active scoped identifiers, initial confirmed Meter Reading, canonical pagination, OpenAPI/Kubb generation, frontend server-only adapters, UI states, and tenant-isolation tests were reconciled.
- Implementation draft added for Machine create/list/detail, active scoped identifiers, initial confirmed Meter Reading, real `/home/maquinas` registry, Machine detail page, OpenAPI generation, Kubb generation, DTO/integration/E2E test files.
- Validation is pending because the user requested no tests be executed in this turn; tasks remain unchecked until validation results are provided.

### File List

- main-api/artifacts/openapi.json
- main-api/prisma/migrations/20260701181319_fleet_machines/migration.sql
- main-api/prisma/schema.prisma
- main-api/src/lib/utils/appError.ts
- main-api/src/modules/fleet/fleet.controller.ts
- main-api/src/modules/fleet/fleet.dto.test.ts
- main-api/src/modules/fleet/fleet.dto.ts
- main-api/src/modules/fleet/fleet.service.ts
- main-api/src/modules/fleet/handlers/fleet.handler.ts
- main-api/src/routes/v1-routes.ts
- main-api/tests/integration/fleet/fleet-machines.test.ts
- main-api/tests/integration/reset-integration-data.ts
- main-web-app/src/app/home/maquinas/[machineId]/page.tsx
- main-web-app/src/app/home/maquinas/page.tsx
- main-web-app/src/features/machines/components/machine-detail-page.tsx
- main-web-app/src/features/machines/components/machines-page.tsx
- main-web-app/src/features/machines/machines-action-state.ts
- main-web-app/src/features/machines/machines.actions.ts
- main-web-app/src/features/machines/machines-page.tsx
- main-web-app/src/features/machines/machines.server.ts
- main-web-app/tests/e2e/machines-registry.spec.ts

### Change Log

- 2026-07-01: Created Story 3.1 implementation context for Machine registration and registry behavior.
- 2026-07-01: Added in-progress Machine registry implementation draft; tests pending per user instruction.
