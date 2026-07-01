---
baseline_commit: 33f66fcf2083a2ea7fb506c5cb8fdcc578a37932
---

# Story 2.5: Remove Clients and Fuel Suppliers From Operational Use

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to remove Clients and Fuel Suppliers that should no longer be used,
so that current operations remain clean without corrupting historical relationships.

## Acceptance Criteria

1. **Given** an active Client or Fuel Supplier in the selected Company with no blocking current Project relationship
   **When** the administrator requests removal and confirms the irreversible action
   **Then** the record becomes unavailable for normal registries and operational selectors
   **And** the removal captures trusted `actorUserId` and the server transaction instant.

2. **Given** the record has existing historical relationships
   **When** it is removed
   **Then** those relationships continue to reference the same preserved record
   **And** no historical Project, agreement, or detail is rewritten.

3. **Given** a record has no history and is otherwise eligible for removal
   **When** removal succeeds
   **Then** it is still treated as an irreversible lifecycle action in the MVP
   **And** no restore command or dashboard action is offered.

4. **Given** a removed Client or Fuel Supplier document is no longer reserved by another active record of the same registry and Company
   **When** a new active record is created with that document
   **Then** reuse is permitted
   **And** prior historical references remain attached to the removed record.

5. **Given** a removed record is requested through an operational selector or current registry
   **When** the query executes
   **Then** it is excluded by the explicit current-state handler
   **And** historical handlers remain separate.

6. **Given** a removed record identifier is requested directly
   **When** the request is for operational use
   **Then** it fails safely as unavailable
   **And** historical detail is exposed only through an explicit authorized historical path.

7. **Given** a Client is the current contracting Client of any `PLANNED`, `ACTIVE`, or `PAUSED` Project
   **When** removal is attempted
   **Then** the command is rejected until every affected Project selects another eligible Client
   **And** the API returns a stable conflict containing only authorized affected Project identifiers and the replacement action.

8. **Given** a Fuel Supplier has a current Fuel Agreement on any `PLANNED`, `ACTIVE`, or `PAUSED` Project
   **When** removal is attempted
   **Then** the command is rejected until every affected agreement is ended through its owning Project workflow
   **And** no Supplier, agreement, Fuel Type, or effective price history changes.

9. **Given** a Client or Fuel Supplier is referenced only by terminal or otherwise closed historical relationships
   **When** removal is attempted
   **Then** those historical references do not block removal
   **And** the record disappears from operational use while remaining available through authorized history.

10. **Given** two requests attempt removal or identifier reuse concurrently
    **When** they execute
    **Then** database constraints and transaction behavior produce a consistent committed result
    **And** conflicts never create two active records with the same scoped identifier.

11. **Given** the dashboard performs removal
    **When** the command succeeds or conflicts
    **Then** it revalidates the affected registry, preserves unrelated table state, and shows a proportional confirmation or recovery message
    **And** it does not simulate deletion locally before backend confirmation.

12. **Given** operational removal is tested
    **When** integration and Playwright suites run
    **Then** they cover records with history, records without history, irreversible behavior, selector exclusion, historical preservation, identifier reuse, concurrency, cross-scope protection, and recovery states.
    **And** removed records never return to operational selectors.

## Tasks / Subtasks

- [x] Confirm removal prerequisites and scope (AC: 1-12)
  - [x] Require Story 2.3 Client registry and Story 2.4 Fuel Supplier registry before implementing operational removal.
  - [x] Reuse trusted selected Company context and current-state predicates; removal commands must never accept Corporation or Company scope from payload.
  - [x] Keep removal irreversible in the MVP. Do not add restore, undelete, purge, archival export, or generic audit-log platform.
  - [x] Treat removal as a lifecycle state transition, not hard deletion, even when the record has no history.

- [x] Add shared Commercial removal lifecycle fields and commands (AC: 1-6, 9-10)
  - [x] Ensure Client and Fuel Supplier records can store removed/current state, `removedAt`, `removedByUserId`, and any required stable removal reason fields if the implemented contract requires one.
  - [x] Add Commercial services and handlers for removing Clients and Fuel Suppliers with one server transaction instant and trusted `actorUserId`.
  - [x] Update current registry, selector, and detail handlers to use explicit current-state predicates and to reject removed records for operational use.
  - [x] Add explicit historical detail handlers only if the application exposes history in this story; otherwise document the preserved data shape and keep historical access for later authorized paths.
  - [x] Preserve document digest and protected document fields on removed records for historical detail, while active uniqueness permits reuse when no active record reserves the same digest.

- [x] Implement blocking relationship checks (AC: 7-9)
  - [x] Reject Client removal when the Client is the current contracting Client of any selected-scope Project in `PLANNED`, `ACTIVE`, or `PAUSED`.
  - [x] Reject Fuel Supplier removal when the Supplier has a current Fuel Agreement on any selected-scope Project in `PLANNED`, `ACTIVE`, or `PAUSED`.
  - [x] Return stable `409 Conflict` codes with authorized affected Project identifiers and required replacement/end-agreement action only.
  - [x] Treat terminal or closed historical relationships as non-blocking, preserving their references without making the record operationally selectable.
  - [x] If Projects/Fuel Agreements are not implemented yet, create a persistence shape and test seam that prevents later implementation from bypassing these blockers.

- [x] Add API and dashboard removal interactions (AC: 1, 5-8, 11-12)
  - [x] Add command endpoints for Client and Fuel Supplier removal under the existing Commercial API surface, using Fastify schemas, generated OpenAPI, and stable error envelopes.
  - [x] Add dashboard actions in `features/clients` and `features/fuel-suppliers` with proportional irreversible confirmation, pending state, success revalidation, and conflict recovery.
  - [x] Do not remove rows locally before backend confirmation. After success, revalidate the affected registry and preserve unrelated search/sort/page state where valid.
  - [x] Keep removed records out of operational selectors and current lists immediately after committed removal.

- [ ] Prove irreversible removal, history preservation, and concurrency (AC: 1-12)
  - [ ] Unit-test DTO validation, current-state predicates, conflict mapping, view-model recovery states, and no-restore UI affordance. Not fully authored in this pass.
  - [x] PostgreSQL-test removal with and without history, active selector exclusion, current detail unavailability, historical reference preservation, active identifier reuse, cross-scope non-disclosure, and blocking Project/Fuel Agreement conflicts.
  - [x] Add concurrency tests for two removals of the same record, removal versus new active identifier reuse, and active uniqueness after removal.
  - [x] Playwright-test irreversible confirmation, success revalidation, duplicate/reuse workflow after removal, conflict recovery, selector exclusion, and workspace-switch isolation.
  - [ ] Run typecheck, lint/architecture checks, unit tests, integration tests, OpenAPI/Kubb generation and drift checks, build, and relevant Playwright tests. Not executed per user instruction.

## Dev Notes

### Developer Context

- This story cleans operational registries without rewriting history. Removed records must remain stable targets for historical Project and agreement references.
- Story 2.3 and Story 2.4 establish Client and Fuel Supplier current registries. This story adds lifecycle behavior across both Commercial aggregates.
- Removal is not a UI-only filter. The backend must enforce current-state predicates for every list, selector, detail, and future association boundary.
- Current Project/Fuel Agreement modules may not exist when this story is implemented. The dev agent must still encode the conflict contract so future Project work cannot accidentally allow blocked removal.

### Technical Requirements

- Removal uses trusted `actorUserId` and a server transaction instant. The browser does not provide audit identity or timestamps.
- Removed records are excluded from normal registries, operational selectors, and operational detail routes.
- Historical references continue pointing to the preserved record; no Project, agreement, Fuel Type, effective price, or historical detail is rewritten during removal.
- Active document reuse is allowed only because active uniqueness excludes removed records. Reuse must never reattach old history to the new record.
- Blocking relationships are current `PLANNED`, `ACTIVE`, or `PAUSED` Project Client references and current Fuel Agreements for active operational Projects.
- Concurrency must produce one consistent committed result through database constraints, transactions, and stable conflict translation.

### Architecture Compliance

- Commercial services coordinate removal; handlers own scoped persistence and relationship checks.
- Backend dependencies follow `controller -> service -> handler -> Prisma`; controllers/services do not import Prisma clients directly.
- Frontend dependencies follow `page -> feature -> server action/query -> adapter/view model -> generated Kubb client`.
- Current-state and historical-state queries are explicit and separate. Historical access never restores operational eligibility.
- Stable API errors drive dashboard recovery; UI logic branches on error `code`, not localized message text.
- CPF/CNPJ plaintext remains protected and is never emitted in removal errors, logs, URLs, cursors, telemetry, or snapshots.

### Current Files to Reconcile and Preserve

- Expected backend surfaces include `main-api/src/modules/commercial/**`, route registration, Prisma schema/migrations, current registry handlers, selector handlers, removal handlers, error codes, and integration tests.
- Expected frontend surfaces include `main-web-app/src/features/clients/**`, `main-web-app/src/features/fuel-suppliers/**`, generated Kubb artifacts, and Playwright tests.
- Preserve Client and Fuel Supplier create/list/detail contracts from Stories 2.3 and 2.4.
- Do not edit generated Prisma or Kubb output manually.

### Testing Requirements

- PostgreSQL integration is mandatory for preservation, current-state filtering, active uniqueness reuse, relationship blockers, transaction rollback, and concurrency.
- Playwright is mandatory because this story adds irreversible dashboard actions and recovery states.
- Contract tests must verify generated OpenAPI/Kubb clients expose removal commands and stable conflict envelopes.
- Cross-scope tests must verify removing a record from one Company never affects same-document records in another Company or Corporation.

### Previous Story Intelligence

- Story 2.4 establishes Fuel Supplier selectors and fixed Fuel Types; removal must exclude removed Suppliers without mutating Fuel Types or future Project price history.
- Story 2.3 establishes Client registry current lists and protected detail. Removal must update those current handlers rather than adding a parallel Client list.
- Story 2.2 establishes active uniqueness by digest and protected document handling. Removal changes active eligibility, not document protection.
- Story 1.4 established selected Company context and stale workspace cleanup. Removal actions must revalidate Company scope on every server request.

### Git Intelligence Summary

- Recent commits include Epic 1 implementation and canonical pagination documentation. No committed Commercial removal code was found during story creation.
- Existing untracked Stories 2.1-2.3 and modified `sprint-status.yaml` are user/workflow state and must be preserved.

### Latest Technical Information

- Prisma transactions should protect lifecycle transitions, blocker checks, active uniqueness, and rollback behavior. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Fastify v5 route schemas should own request/response contracts and OpenAPI generation for removal commands and conflict responses. [Source: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]
- Next.js Server Actions provide the server-only mutation path for removal commands; generated API clients and credentials stay outside Client Components. [Source: https://nextjs.org/docs/app/api-reference/directives/use-server]
- Next.js `cookies` is a server API; removal actions that need authenticated calls must keep credential access inside server boundaries. [Source: https://nextjs.org/docs/app/api-reference/functions/cookies]

### Project Structure Notes

- Keep removal behavior in the owning Commercial module and the existing `clients` / `fuel-suppliers` frontend features.
- Do not create a generic deletion framework unless it demonstrably reduces duplication without hiding the distinct Client and Fuel Supplier blockers.
- Current registry handlers should receive explicit current-state filters; historical handlers, if added, must have separate names and response models.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-25-Remove-Clients-and-Fuel-Suppliers-From-Operational-Use]
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation-Issues-Addressed]
- [Source: _bmad-output/planning-artifacts/architecture.md#Current-and-Historical-Queries]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-8-Remove-Records-from-Operational-Use]
- [Source: main-api/docs/PAGINATION.md]
- [Source: main-api/AGENTS.md]
- [Source: _bmad-output/implementation-artifacts/2-4-register-and-find-fuel-suppliers.md]
- [Source: _bmad-output/implementation-artifacts/2-3-register-and-find-clients.md]
- [Source: _bmad-output/implementation-artifacts/2-2-protect-cpf-and-cnpj-technically.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01: Added Commercial removal lifecycle metadata, migration, command endpoints, stable conflict codes, dashboard removal actions, OpenAPI/Kubb generation, and removal test artifacts.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Irreversible Commercial removal, historical preservation, active selector exclusion, active document reuse, Project/Fuel Agreement blockers, concurrency, stable conflicts, dashboard confirmation, and recovery states were reconciled.
- Implemented irreversible operational removal for Client and Fuel Supplier using trusted selected Company scope, trusted actor user id, and server transaction timestamp.
- Preserved historical record shape by keeping rows and protected document fields; current list, selector, and detail paths remain scoped to active records.
- Added typed Project/Fuel Agreement blocker seam because Project and FuelAgreement persistence do not exist yet.
- Generated OpenAPI and Kubb clients. Test suites were not executed per user instruction.

### File List

- main-api/prisma/schema.prisma
- main-api/prisma/migrations/20260701160000_commercial_removal_and_workforce/migration.sql
- main-api/artifacts/openapi.json
- main-api/src/lib/utils/appError.ts
- main-api/src/modules/commercial/commercial.controller.ts
- main-api/src/modules/commercial/commercial.service.ts
- main-api/src/modules/commercial/handlers/commercial-registry.handler.ts
- main-api/tests/integration/commercial/commercial-registries.test.ts
- main-web-app/src/generated/**
- main-web-app/src/features/commercial-registry/commercial-registry.actions.ts
- main-web-app/src/features/commercial-registry/components/registry-page.tsx
- main-web-app/src/features/clients/clients-page.tsx
- main-web-app/src/features/fuel-suppliers/fuel-suppliers-page.tsx
- main-web-app/tests/e2e/commercial-removal.spec.ts

### Change Log

- 2026-07-01: Implemented Commercial operational removal lifecycle, API endpoints, dashboard actions, contract generation, and validation artifacts.
