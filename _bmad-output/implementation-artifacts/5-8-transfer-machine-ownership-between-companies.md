# Story 5.8: Transfer Machine Ownership Between Companies

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to transfer a Machine permanently to another Company in the same Corporation,
so that ownership changes while prior Company and Project history remains true.

## Acceptance Criteria

1. **Given** a Machine currently owned by the selected source Company, **when** an active `destinationCompanyId` is submitted, **then** it is treated as an untrusted command target while Corporation, source Company, and actor remain Session-derived.
2. **Given** the destination is foreign, inactive, or the current owner, **when** transfer is attempted, **then** a safe validation/semantic response is returned without disclosing foreign existence.
3. **Given** the Machine has an open Project allocation, open shift, or pending final reading, **when** transfer is attempted, **then** a stable blocker conflict is returned and ownership, identifiers, registration, and readings remain unchanged.
4. **Given** the Machine is eligible and a non-blank reason is confirmed, **when** transfer commits, **then** the current Ownership Period closes and a destination period opens at one server instant with trusted actor and reason.
5. **Given** current registration is retained, **when** transfer succeeds, **then** name, description, type, manufacturer, model, and Machine identity remain unchanged and no duplicate Machine is created.
6. **Given** permitted current details are supplied, **when** valid, **then** the current Machine registration adopts them without rewriting prior ownership, Project allocation, or Meter Reading history.
7. **Given** destination identifiers are retained or supplied, **when** validation runs, **then** at least a plate or Company tag remains and active values are unique within the destination Company.
8. **Given** an active destination identifier conflicts, **when** transfer executes, **then** the complete transaction rolls back and source ownership remains current.
9. **Given** an optional transfer reading is valid, **when** transfer commits, **then** one confirmed monotonic reading is appended; if omitted and no operational condition requires it, no synthetic reading is created.
10. **Given** transfer succeeds, **when** registries refresh, **then** the Machine leaves the source current registry and becomes available in the destination current registry while source history remains authorized and inspectable.
11. **Given** the former Company requests history, **when** authorized, **then** it sees only historically scoped ownership/allocation/reading participation and not destination-only current private operations.
12. **Given** stale source or concurrent transfer, allocation, retirement, or reading commands execute, **then** scoped serializable checks produce one current owner and never overwrite the winner.
13. **Given** the dashboard submits transfer, **when** it succeeds or conflicts, **then** it confirms the destination and irreversible effect, preserves recoverable input, and clears stale source workspace state only after backend confirmation.
14. **Given** the feature is tested, **when** PostgreSQL, concurrency, frontend, and Playwright suites run, **then** they cover scope, blockers, identifier changes/conflicts, optional reading, registry movement, stale requests, rollback, and history.

## Tasks / Subtasks

- [ ] Define the ownership transfer contract and audit migration (AC: 1-9)
  - [ ] Add `POST /api/v1/machines/:machineId/transfer` with required `destinationCompanyId` and `reason`, optional permitted registration fields, destination identifiers, and optional `meterReading` string.
  - [ ] Add actor/reason closure metadata to ownership periods or a dedicated immutable ownership event while preserving existing rows with nullable historical audit fields.
  - [ ] Define explicit keep/update semantics in the command schema; omission retains current registration and identifier choices must still satisfy destination invariants.
- [ ] Transfer one Machine identity in a serializable transaction (AC: 1-12)
  - [ ] Reread actor authorization, source ownership, same-Corporation active destination, no open allocation, operational status, identifiers, terminal state, and latest reading.
  - [ ] Close/open `MachineOwnershipPeriod` at one timestamp; release source active identifiers and create/retain destination-scoped identifiers without mutating historical rows.
  - [ ] Apply permitted Machine registration updates only after validation and append an optional confirmed transfer reading with trusted actor and monotonic sequence.
  - [ ] Enforce active identifier uniqueness and one open ownership period in PostgreSQL; use bounded retry and stable scoped conflicts for races.
- [ ] Build an irreversible transfer workflow (AC: 5-13)
  - [ ] Load destination Companies only from the authenticated Corporation and make current-vs-updated registration explicit.
  - [ ] Present identifier and optional-reading validation, require reason/confirmation, and preserve recoverable input.
  - [ ] After success, reconcile the selected source workspace and navigate to a safe registry state without retaining destination-private detail in source cache.
- [ ] Prove ownership and historical isolation (AC: 1-14)
  - [ ] Test same-Corporation eligibility, foreign non-enumeration, blockers, identifier reuse/conflict, optional updates/readings, and rollback in PostgreSQL.
  - [ ] Add barrier-based transfer races with allocation, retirement, reading, and stale source mutation.
  - [ ] Test current registry movement and former-owner historical projections separately from destination current detail.
  - [ ] Add frontend/Playwright coverage and regenerate/check canonical OpenAPI and Kubb artifacts.

## Dev Notes

### Developer Context

- A Machine is Corporation-owned identity with temporal Company ownership; transfer must never create a replacement Machine record.
- Current identifiers carry Company scope and `releasedAt`; release old active identifiers and establish destination-active rows so reuse cannot rewrite history.
- Registration fields are not effective-dated in the MVP. Accepted updates affect current state only; the transfer audit and prior ownership/operation records remain immutable.

### Architecture Compliance

- Fleet owns the entire command. The source Company is trusted Session scope; `destinationCompanyId` cannot switch authorization context.
- Revalidate all blockers and uniqueness in one serializable transaction. A frontend precheck is advisory only.
- Use the Story 5.6 operational-status port and Story 5.7 reading-chain implementation; do not create RDO workflows.
- History endpoints must project only records belonging to the requesting Company's current or historical scope.

### Current Files to Reconcile and Preserve

- Extend existing Fleet DTO/controller/service/handler boundaries and current identifier normalization helpers.
- Reuse `Machine`, `MachineOwnershipPeriod`, `MachineIdentifier`, and `MachineMeterReading` models.
- Extend Machine detail/actions and authenticated Company reconciliation patterns in the dashboard.

### Previous Story Intelligence

- Story 5.7 requires release before a cross-Company move. Transfer must reject, not silently close, an open allocation.
- Use the same lock order and operational-status port as allocation/movement to make concurrent winner/loser outcomes deterministic.

### Latest Technical Notes

- Preserve pinned dependencies and canonical generation. Do not add a second identifier-normalization library or handwritten generated-client types.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-58-Transfer-Machine-Ownership-Between-Companies]
- [Source: _bmad-output/planning-artifacts/architecture.md#Tenant-and-Ownership-Isolation]
- [Source: _bmad-output/implementation-artifacts/5-7-reallocate-or-release-a-machine.md]
- [Source: main-api/prisma/schema.prisma#MachineOwnershipPeriod]
- [Source: main-api/prisma/schema.prisma#MachineIdentifier]
- [Source: main-api/src/modules/fleet/fleet.service.ts]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Story context created and validated for development readiness.

### File List

