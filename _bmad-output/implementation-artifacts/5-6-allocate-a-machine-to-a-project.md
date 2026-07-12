# Story 5.6: Allocate a Machine to a Project

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to allocate an eligible Machine to a `PLANNED` or `ACTIVE` Project,
so that the asset is reserved with a trustworthy starting Meter Reading.

## Acceptance Criteria

1. **Given** an active Machine currently owned by the selected Company and an eligible `PLANNED` or `ACTIVE` Project, **when** allocation is submitted, **then** a Machine Allocation opens at one server transaction instant and references the latest confirmed Meter Reading as starting evidence.
2. **Given** the Project is `PLANNED`, **when** allocation succeeds, **then** the Machine is reserved immediately and no planned date releases it automatically.
3. **Given** the Project is `ACTIVE`, **when** allocation succeeds, **then** it becomes currently assigned without changing registration, identifiers, ownership, or readings.
4. **Given** the Machine already has an open Project allocation, **when** another allocation is attempted, **then** a stable availability conflict is returned and no overlap is created.
5. **Given** the Machine is transferred, retired, foreign-owned, blocked by an open shift, or has a pending final reading, **when** allocation is attempted, **then** it fails without exposing foreign data or changing state.
6. **Given** the latest confirmed reading changes before commit, **when** transactional validation runs, **then** allocation uses the committed latest reading or returns a safe conflict; it never records a stale/decreasing boundary.
7. **Given** two Projects concurrently allocate the same Machine, **when** commands execute, **then** the database selects one winner and the loser receives a stable conflict.
8. **Given** allocation succeeds, **when** Project and Machine views refresh, **then** both display the relationship and start reading and the Machine disappears from other allocation selectors.
9. **Given** the feature is tested, **when** unit, real-PostgreSQL integration, concurrency, frontend, and Playwright suites run, **then** they cover both Project states, ownership, lifecycle blockers, reading races, double allocation, selector exclusion, and unchanged registration.

## Tasks / Subtasks

- [ ] Define the Fleet allocation contract and operational-status boundary (AC: 1-6)
  - [ ] Add `POST /api/v1/machines/:machineId/allocations` with `{ projectId: uuid }`, authenticated Company scope, canonical envelopes, and refreshed Machine detail.
  - [ ] Introduce `MachineOperationalStatusPort` returning explicit `hasOpenShift` and `hasPendingFinalReading`; supply an injectable MVP implementation returning both false.
  - [ ] Keep Projects as owner of Project lifecycle while Fleet owns Machine availability, ownership, metering continuity, and operational allocation.
- [ ] Open the allocation under serializable validation (AC: 1-7)
  - [ ] Lock/reread Machine, current ownership, latest confirmed reading, operational status, current allocation, and destination Project inside one transaction.
  - [ ] Accept only current ownership in the selected Company, an active/non-retired Machine, and destination state `PLANNED` or `ACTIVE`.
  - [ ] Reuse `ProjectMachineAllocation.startMeterReadingId` and the existing partial unique index on open Corporation/Machine allocation.
  - [ ] Use bounded `P2034` retry and stable scoped conflicts for stale reading, unavailable Machine, invalid destination, and race loss.
- [ ] Render allocation through existing Machine detail boundaries (AC: 2-8)
  - [ ] Populate eligible Project choices through an authorized selector and consume the generated Kubb command via server action/adapter.
  - [ ] Show the committed start reading, preserve selection on recoverable conflicts, and refresh both current views only after success.
- [ ] Prove availability and reading continuity (AC: 1-9)
  - [ ] Add DTO/service tests and real-PostgreSQL tests for eligibility, ownership, partial uniqueness, operational blockers, and rollback.
  - [ ] Add barrier-based concurrency tests for allocation/allocation, allocation/reading, allocation/transfer, and allocation/retirement races.
  - [ ] Add component/action and Playwright coverage, then regenerate and drift-check OpenAPI/Kubb artifacts.

## Dev Notes

### Developer Context

- Fleet already owns Machine registration, current ownership, identifiers, monotonic readings, and Machine detail. Extend it rather than placing operational allocation commands in Projects.
- Project creation already writes initial `ProjectMachineAllocation` rows. This story must reuse that table and exclusivity invariant while making Fleet the owner of later operational changes.
- Every registered Machine has an initial confirmed reading. Allocation must select the latest confirmed row inside the same transaction, never trust a client-provided reading ID.

### Architecture Compliance

- Treat `machineId` and `projectId` as untrusted command targets; trusted Corporation/Company/User come from Session.
- Use half-open effective periods, one server timestamp, serializable transactions, bounded retry, and database-enforced open-allocation uniqueness.
- The operational-status port is a real boundary for future RDO integration, not a UI flag or hard-coded condition scattered across commands.
- Do not mutate Machine registration or manufacture a Meter Reading during allocation.

### Current Files to Reconcile and Preserve

- Extend `main-api/src/modules/fleet` controller, DTO, service, and handler patterns.
- Reuse `ProjectMachineAllocation`, `MachineOwnershipPeriod`, and `MachineMeterReading` in `main-api/prisma/schema.prisma`.
- Extend `main-web-app/src/features/machines`; consume generated contracts without editing `src/generated`.

### Previous Story Intelligence

- Story 5.5 confirms all critical lifecycle commands capture trusted actor and serialize against competing allocation changes.
- Follow the current `runSerializableWithRetry` and `lockMachine` patterns in Fleet instead of adding another transaction helper.

### Latest Technical Notes

- Keep repository-pinned framework and generation versions. Decimal readings remain normalized strings over HTTP and `Decimal(14,2)` in PostgreSQL.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-56-Allocate-a-Machine-to-a-Project]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture]
- [Source: _bmad-output/implementation-artifacts/4-6-configure-optional-initial-machine-mobilization.md]
- [Source: _bmad-output/implementation-artifacts/5-5-terminate-an-employment-safely.md]
- [Source: main-api/prisma/schema.prisma#ProjectMachineAllocation]
- [Source: main-api/src/modules/fleet/fleet.service.ts]
- [PostgreSQL partial indexes: https://www.postgresql.org/docs/current/indexes-partial.html]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Story context created and validated for development readiness.

### File List

