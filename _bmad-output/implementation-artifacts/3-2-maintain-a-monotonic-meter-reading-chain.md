---
baseline_commit: 90c73e276e509f583785b4841867ee1c8c681033
---

# Story 3.2: Maintain a Monotonic Meter Reading Chain

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want confirmed Machine Meter Readings to remain trustworthy and correctable only in safe cases,
so that future allocation, fueling, maintenance, and RDO evidence can rely on one non-decreasing history.

## Acceptance Criteria

1. **Given** a Machine has a latest confirmed Meter Reading
   **When** a new reading is recorded by an eligible operation
   **Then** the new value must be greater than or equal to the latest confirmed value
   **And** PostgreSQL-backed concurrency protection enforces the monotonic result.

2. **Given** a lower reading than the latest confirmed value
   **When** an ordinary reading command is attempted
   **Then** the command is rejected with a stable semantic error
   **And** the existing reading chain remains unchanged.

3. **Given** two concurrent commands attempt to append readings to the same Machine
   **When** they execute
   **Then** transaction isolation and constraints produce one valid ordered chain
   **And** no decreasing or ambiguously ordered committed sequence is possible.

4. **Given** an initial or ownership-transfer Meter Reading has never been referenced by an allocation, shift, fueling, maintenance, or other evidence record
   **When** an authorized correction supplies a valid new value and reason
   **Then** the correction is permitted if the resulting reading chain remains non-decreasing
   **And** actor, transaction instant, old value, new value, and reason are preserved.

5. **Given** an initial or transfer Meter Reading is already referenced
   **When** correction is attempted
   **Then** the command is rejected as immutable
   **And** the original reading and references remain unchanged.

6. **Given** a corrected reading would exceed a later confirmed value or fall below a prior confirmed value
   **When** validation runs
   **Then** the correction is rejected
   **And** no audit or reading state is partially committed.

7. **Given** an ordinary confirmed reading
   **When** update or deletion is attempted
   **Then** the operation is unavailable in the MVP
   **And** changes must occur only through an explicitly permitted correction command.

8. **Given** Meter Reading values cross the API boundary
   **When** they are serialized or submitted
   **Then** they use normalized decimal strings
   **And** persistence uses non-negative `numeric(14,2)`.

9. **Given** the current Machine state is requested
   **When** the owning handler responds
   **Then** the latest confirmed reading is explicit
   **And** historical readings are returned only through the dedicated historical detail path.

10. **Given** a Meter Reading command targets a Machine outside the selected Company or authenticated Corporation
    **When** it executes
    **Then** the operation fails without revealing foreign existence
    **And** no reading is appended or corrected.

11. **Given** reading and correction behavior is tested
    **When** real-PostgreSQL integration and concurrency suites run
    **Then** they cover increasing and equal readings, decreasing rejection, concurrent append, correctable unreferenced readings, referenced immutability, neighbor-bound validation, decimal precision, auditing, and tenant isolation.
    **And** every committed reading chain remains non-decreasing.

## Tasks / Subtasks

- [ ] Confirm Fleet prerequisites and story boundaries (AC: 1-11)
  - [ ] Build on Story 3.1's `Machine`, `MachineOwnershipPeriod`, identifiers, and initial confirmed `MachineMeterReading`; do not create a second reading model.
  - [ ] Reuse trusted selected Company context and trusted actor user id; no request body, query, cursor, form field, Client Component, or Zustand state may supply scope or audit identity.
  - [ ] Implement ordinary append behavior only for eligible MVP operations. If no post-registration producer exists yet, expose the service/handler contract and tests without adding fake dashboard workflows.
  - [ ] Permit corrections only for initial or ownership-transfer readings that are unreferenced and still satisfy neighbor bounds.
  - [ ] Do not implement Project allocation, ownership transfer, retirement, maintenance, fueling, shift evidence, RDO, or full Machine history UI in this story.

- [ ] Harden Meter Reading persistence and invariants (AC: 1-8, 11)
  - [ ] Ensure readings persist as non-negative `numeric(14,2)` and cross the API boundary as normalized decimal strings.
  - [ ] Store reading sequence metadata that supports deterministic ordering, latest-reading lookup, source/purpose, actor user id, server transaction instant, and correction eligibility.
  - [ ] Add correction audit persistence that preserves original reading id, actor user id, transaction instant, old value, new value, and required reason.
  - [ ] Add reference-detection seams for future allocation, shift, fueling, maintenance, and RDO evidence so referenced initial/transfer readings cannot later be corrected accidentally.
  - [ ] Enforce monotonic append and neighbor-bound correction through PostgreSQL-backed transaction behavior, not only application-side checks.
  - [ ] Preserve current Machine registry/detail behavior from Story 3.1 while making latest confirmed reading explicit.

- [ ] Implement backend Meter Reading commands under the Fleet API (AC: 1-10)
  - [ ] Extend the `fleet` backend module following `controller -> service -> handler -> Prisma`.
  - [ ] Add an append command under `/api/v1/machines/:machineId/meter-readings` or the existing route style chosen by Story 3.1, requiring Company scope and trusted actor user id.
  - [ ] Add a correction command for explicitly permitted initial/transfer readings with required reason and structured old/new value audit.
  - [ ] Resolve the target Machine through trusted `{ corporationId, companyId }`; absent and foreign-scope Machines return the same non-disclosing not-found behavior.
  - [ ] Use short transactions with row locks or `Serializable` isolation plus bounded retry for concurrent append/correction races.
  - [ ] Reject lower ordinary readings, invalid decimal strings, negative values, updates/deletions, referenced reading corrections, ordinary reading corrections, and neighbor-bound violations with stable machine-readable codes.
  - [ ] Keep current-state queries separate from future historical reading queries; current Machine detail returns latest confirmed reading, not the full chain.

- [ ] Update dashboard/server boundaries only where product-visible (AC: 8-10)
  - [ ] Ensure Machine list/detail view models display latest confirmed reading from the API as a decimal string.
  - [ ] If a correction UI is added for initial readings, implement it through `features/machines` Server Actions with pending, validation, immutable, conflict, success, unauthorized, and failure recovery states.
  - [ ] If no correction UI is accepted for this slice, keep correction coverage at API/service/integration level and do not invent a dashboard action.
  - [ ] Keep generated Kubb clients and credentials server-only; Client Components receive view models and local form state only.
  - [ ] Do not expose historical reading chains in the current registry/detail UI; reserve that for the dedicated historical detail path.

- [ ] Generate contracts and prove monotonic integrity (AC: 1-11)
  - [ ] Define Fastify route schemas as the OpenAPI authority for reading append/correction commands and current Machine responses.
  - [ ] Regenerate OpenAPI and Kubb artifacts through existing scripts; do not manually edit generated files.
  - [ ] Unit-test decimal normalization, command DTO validation, current/latest reading predicates, correction eligibility predicates, stable error mapping, and view-model mapping.
  - [ ] PostgreSQL-test increasing and equal append, decreasing rejection, concurrent append, transaction rollback, correctable unreferenced initial/transfer readings, referenced immutability, ordinary reading immutability, neighbor-bound rejection, precision, audit persistence, and cross-scope non-disclosure.
  - [ ] Contract-test success/error envelopes and generated Kubb usage for reading commands.
  - [ ] Frontend-test any updated Machine latest-reading presentation and any accepted correction UI states.
  - [ ] Run typecheck, lint/architecture checks, unit tests, integration tests, OpenAPI generation/drift check, Kubb generation/drift check, build, and relevant Playwright tests.

### Review Findings

- [x] [Review][Patch] Add deterministic Meter Reading sequence metadata instead of ordering by millisecond timestamp plus UUID [main-api/prisma/migrations/20260701193000_fleet_review_hardening/migration.sql:7]
- [x] [Review][Patch] Scope latest Meter Reading selection by selected Company [main-api/src/modules/fleet/handlers/fleet.handler.ts:86]
- [x] [Review][Patch] Add missing Story 3.2 acceptance coverage for increasing append, concurrency, permitted corrections, referenced immutability, ordinary-reading immutability, audit persistence, tenant isolation, and full non-decreasing chain proof [main-api/tests/integration/fleet/fleet-machines.test.ts:175]
- [x] [Review][Patch] Evaluate correction neighbors across the Machine's full Corporation-scoped sequence so ownership-transfer corrections cannot break the global chain [main-api/src/modules/fleet/handlers/fleet.handler.ts:484]
- [x] [Review][Patch] Assert rejected neighbor-bound corrections leave both the reading value and correction audit table unchanged [main-api/tests/integration/fleet/fleet-machines.test.ts:421]
- [x] [Review][Patch] Add exact numeric(14,2) boundary persistence coverage for appended and corrected Meter Readings [main-api/tests/integration/fleet/fleet-machines.test.ts:440]
- [x] [Review][Patch] Correct completed review evidence that points to the original migration although the sequence fix lives in the hardening migration [_bmad-output/implementation-artifacts/3-2-maintain-a-monotonic-meter-reading-chain.md:118]

## Dev Notes

### Developer Context

- Story 3.2 protects the evidence chain created by Story 3.1. It is an integrity story, not a broad Fleet UI expansion.
- Future allocation, fueling, maintenance, shift, and RDO workflows will rely on the same confirmed non-decreasing reading history. The implementation must leave durable seams for those references without inventing those modules now.
- Current-state Machine views need only the latest confirmed reading. Full reading history belongs to a dedicated historical detail path in a later story.
- If Story 3.1 has not yet implemented the Fleet module when this story is picked up, implement Story 3.1 first or create only the shared foundations needed by both stories without duplicating models.

### Technical Requirements

- Ordinary reading append accepts only values greater than or equal to the latest confirmed value for the Machine.
- Equal readings are valid; decreasing readings are semantic business errors and must not change state.
- Corrections are explicit commands, not updates/deletes. Only unreferenced initial or ownership-transfer readings are correctable in the MVP.
- Correction must verify neighbor bounds: the corrected value cannot be lower than the previous confirmed reading or higher than the next confirmed reading.
- Corrections preserve audit evidence: actor, transaction instant, reason, old value, new value, and target reading.
- Decimal values must never be parsed through JavaScript binary floating-point for persistence decisions. Use string/decimal-safe validation and persist as `numeric(14,2)`.
- Concurrency protection must be proven against real PostgreSQL. Application-only "latest value" checks are insufficient.

### Architecture Compliance

- Backend dependencies follow `controller -> service -> handler -> Prisma`; handlers alone access persistence.
- Critical state changes run in transactions; concurrent commands use isolation/locking appropriate to the invariant and translate database conflicts into stable application errors.
- Foreign-scope and absent Machines or readings share non-disclosing not-found behavior.
- Current-state and historical-state access use separate named handlers/queries. Historical readings are not operational selectors.
- Fastify route schemas remain the OpenAPI authority; generated Kubb artifacts are regenerated by scripts and never manually edited.
- Frontend dependencies follow `page -> feature -> server action/query -> adapter/view model -> generated Kubb client`.
- Generated clients and credentials stay server-only; Client Components receive view models and local interaction state only.

### Current Files to Reconcile and Preserve

- Expected backend surfaces include `main-api/src/modules/fleet/**`, `main-api/src/routes/v1-routes.ts`, `main-api/prisma/schema.prisma`, forward migrations, OpenAPI schemas, and real PostgreSQL integration tests.
- Expected frontend surfaces, if product-visible UI changes are needed, include `main-web-app/src/features/machines/**`, route/page wiring, generated Kubb artifacts, and focused component/E2E tests.
- Preserve Story 3.1 Machine create/list/detail contracts while extending latest-reading and reading command behavior.
- Do not edit generated Prisma or Kubb output manually.

### Testing Requirements

- PostgreSQL integration is mandatory for monotonic append, concurrent append/correction, immutable referenced readings, correction neighbor bounds, audit persistence, rollback, and tenant isolation.
- Unit tests must keep decimal validation and stable error-code mapping independent from persistence details.
- Contract tests must verify generated OpenAPI/Kubb clients expose reading commands and stable success/error envelopes.
- If the dashboard exposes correction behavior, Playwright or component tests must prove conflict recovery and that no stale latest reading remains visible after success.

### Previous Story Intelligence

- Story 3.1 creates the first confirmed reading and current Machine registry/detail surfaces. Reuse those models and handlers; do not create a parallel meter subsystem.
- Story 2.7 reinforces temporal/current-state separation. Meter history must remain distinct from current Machine state.
- Story 2.6 and Story 2.3 established generated-contract and frontend adapter patterns. Reading commands should follow the same server-only boundary.
- Story 2.5 established preserved history for lifecycle changes. Meter Reading correction must preserve audit and avoid destructive shortcuts.
- Story 1.4 established selected Company context; every Machine reading command must revalidate trusted scope.

### Git Intelligence Summary

- Recent commits show Epic 2 implementation patterns for Commercial and Workforce modules, including transactions, stable conflicts, generated contracts, and real PostgreSQL integration coverage.
- Current source has no Fleet module yet; Story 3.2 should extend the Fleet slice introduced by Story 3.1.
- Existing user/workflow changes in Epic 2 artifacts and frontend Workforce files must be preserved.

### Latest Technical Information

- Prisma transactions should keep reading append/correction changes short; PostgreSQL `Serializable` plus bounded retry is appropriate for concurrent write conflicts where used. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Fastify route schemas remain the source for validation, serialization, and generated OpenAPI contracts. [Source: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]
- Next.js Server Actions provide the server-only mutation path for any accepted reading correction UI; generated API clients and credentials stay outside Client Components. [Source: https://nextjs.org/docs/app/api-reference/directives/use-server]
- Kubb packages are pinned in `main-web-app/package.json`; regenerate clients through configured scripts and do not manually edit generated artifacts. [Source: main-web-app/package.json]

### Project Structure Notes

- Backend module name remains `fleet`; frontend feature name remains `machines`.
- Keep reading command code under the Fleet module and Machine feature. Do not create a cross-cutting "meter" module unless the architecture is updated.
- Public API should remain Machine-centered because readings belong to a Machine and require Machine ownership scope.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-32-Maintain-a-Monotonic-Meter-Reading-Chain]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-31-Register-and-Find-Machines]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-18-Preserve-Monotonic-Meter-History]
- [Source: _bmad-output/planning-artifacts/architecture.md#Identifiers-and-Numeric-Types]
- [Source: _bmad-output/planning-artifacts/architecture.md#Consistency-and-Transactions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Current-and-Historical-Queries]
- [Source: main-api/AGENTS.md]
- [Source: main-api/prisma/schema.prisma]
- [Source: _bmad-output/implementation-artifacts/3-1-register-and-find-machines.md]
- [Source: _bmad-output/implementation-artifacts/2-7-maintain-admission-and-rehire-periods.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01T13:45:22-03:00: Implemented monotonic Meter Reading append/correction draft; tests intentionally not executed per user instruction.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Meter Reading monotonicity, decimal precision, append/correction commands, concurrency protection, correction audit, referenced-reading immutability, latest-reading current views, generated contracts, and real-PostgreSQL integrity tests were reconciled.
- Implementation draft added for decimal-string readings, PostgreSQL-backed Serializable command flow, machine row locking, monotonic append rejection, eligible correction with audit, reference-blocked correction seam, latest-reading view model, and API contract generation.
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

- 2026-07-01: Created Story 3.2 implementation context for monotonic Machine Meter Reading behavior.
- 2026-07-01: Added in-progress Meter Reading integrity implementation draft; tests pending per user instruction.
