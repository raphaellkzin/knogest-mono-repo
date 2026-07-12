# Story 5.7: Reallocate or Release a Machine

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to move or release an allocated Machine with the correct final-reading behavior,
so that availability changes without breaking Meter Reading continuity or prior Project history.

## Acceptance Criteria

1. **Given** an allocated Machine whose relevant shift is already closed with a confirmed final Meter Reading, **when** it is released, **then** the allocation closes using the established continuity and no duplicate reading is required.
2. **Given** release or reallocation occurs during an open shift, **when** the command is submitted, **then** a final reading string is required and must be greater than or equal to the latest confirmed reading.
3. **Given** the operational-status port reports a pending final reading, **when** movement is attempted, **then** it is blocked until confirmation and no destination allocation opens.
4. **Given** the source is eligible, **when** release is confirmed with a non-blank reason, **then** it closes at one server transaction instant and the Machine becomes available without changing ownership.
5. **Given** an eligible destination Project in the owning Company, **when** reallocation is confirmed with a reason, **then** source closure and destination opening commit atomically and share the correct confirmed reading boundary.
6. **Given** the destination belongs to another Company or is not `PLANNED`/`ACTIVE`, **when** reallocation is attempted, **then** it is rejected without changing the source or exposing foreign data.
7. **Given** the Machine returns to a previously served Project, **when** reallocation succeeds, **then** a new period opens and every previous allocation remains closed and immutable.
8. **Given** a final reading is supplied, **when** the transaction commits, **then** it is appended exactly once to the monotonic chain, referenced as the source boundary, and used as destination start evidence.
9. **Given** a closed source, retired/transferred Machine, lower reading, or stale/foreign target, **when** the command executes, **then** the transaction rolls back completely with a stable scoped error.
10. **Given** concurrent movement, retirement, transfer, allocation, or reading commands target the Machine, **when** they execute, **then** one valid lifecycle result commits without overlapping allocation or broken reading continuity.
11. **Given** the dashboard evaluates current operational status, **when** a final reading is conditionally required, **then** the form requests it only in that condition and preserves valid destination and reason values after recoverable conflicts.
12. **Given** the feature is tested, **when** PostgreSQL, concurrency, frontend, and Playwright suites run, **then** they cover closed-shift reuse, mid-shift reading, pending blocker, release, same-Company movement, invalid destination, return, rollback, and races.

## Tasks / Subtasks

- [ ] Define separate release and reallocation commands in Fleet (AC: 1-9)
  - [ ] Add `POST /api/v1/machines/:machineId/release` with `{ reason, finalMeterReading? }`.
  - [ ] Add `POST /api/v1/machines/:machineId/reallocate` with `{ destinationProjectId, reason, finalMeterReading? }`.
  - [ ] Represent readings as normalized decimal strings and expose operational-status requirements in the current Machine detail/view model.
  - [ ] Return canonical Machine detail and stable conflict codes; never parse backend message text in the dashboard.
- [ ] Close or replace the allocation atomically (AC: 1-10)
  - [ ] Reread authorization, current ownership, Machine terminal state, open source allocation, destination Project, operational status, and latest confirmed reading inside a serializable transaction.
  - [ ] Capture one transaction instant; close the source and, for reallocation, open the destination at that same instant.
  - [ ] If required, append one confirmed reading with trusted actor, correct purpose/sequence, and a `MachineMeterReadingReference` to the source boundary; use it as destination `startMeterReadingId`.
  - [ ] Reuse the current partial unique allocation index and bounded Fleet `P2034` retry; rollback reading, closure, and destination together.
- [ ] Add conditional movement UX to Machine detail (AC: 1-11)
  - [ ] Query the backend-derived operational condition; do not infer shift status from stale client data.
  - [ ] Require reason for both commands, destination only for reallocation, and final reading only when the port requires it.
  - [ ] Confirm the operation, preserve recoverable fields, refresh after success, and show availability/history without mutating old periods.
- [ ] Prove continuous metering and race safety (AC: 1-12)
  - [ ] Add unit/DTO tests for conditional validation and stable code mapping.
  - [ ] Add real-PostgreSQL rollback, monotonic sequence, reading-reference, return-to-project, scope, and history tests.
  - [ ] Add barrier-based race tests for every competing lifecycle command and assert a single open allocation maximum.
  - [ ] Add frontend/Playwright tests and regenerate/check OpenAPI and Kubb output.

## Dev Notes

### Developer Context

- Story 5.6 creates the Fleet-owned allocation operation and operational-status port. Extend both; do not invent an RDO or shift table in this story.
- The MVP port returns no open shift and no pending reading, but tests must inject each state so future RDO behavior is already enforced.
- A client final-reading value is evidence to validate, not authority over sequence, timestamp, status, actor, purpose, or references.

### Architecture Compliance

- Preserve one monotonic reading chain per Corporation/Machine and one open allocation enforced by PostgreSQL.
- Reallocation is one command and one transaction, not a frontend-composed release followed by allocate.
- The destination must be in the current owning Company. Cross-Company movement requires Story 5.8 ownership transfer after release.
- Closed allocations and readings are append-only historical evidence; never rewrite them to represent the new Project.

### Current Files to Reconcile and Preserve

- Extend the Fleet command/service/handler and serializable retry patterns in `main-api/src/modules/fleet`.
- Reuse `ProjectMachineAllocation`, `MachineMeterReading`, and `MachineMeterReadingReference` persistence.
- Extend the existing Machine detail and actions under `main-web-app/src/features/machines`.

### Previous Story Intelligence

- Reuse `MachineOperationalStatusPort` and the latest-reading lock order specified in Story 5.6 to avoid deadlocks and inconsistent evidence.
- The source allocation is selected from trusted ownership scope; a destination ID never changes Session Company context.

### Latest Technical Notes

- Keep the pinned stack. Use Prisma `Decimal` for comparison/persistence and normalized strings at transport/presentation boundaries.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-57-Reallocate-or-Release-a-Machine]
- [Source: _bmad-output/planning-artifacts/architecture.md#Concurrency-Control]
- [Source: _bmad-output/implementation-artifacts/5-6-allocate-a-machine-to-a-project.md]
- [Source: main-api/prisma/schema.prisma#MachineMeterReading]
- [Source: main-api/prisma/schema.prisma#ProjectMachineAllocation]
- [Source: main-api/src/modules/fleet/handlers/fleet.handler.ts]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Story context created and validated for development readiness.

### File List

