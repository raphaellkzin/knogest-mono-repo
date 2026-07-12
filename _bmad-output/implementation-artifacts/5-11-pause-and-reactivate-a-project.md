# Story 5.11: Pause and Reactivate a Project

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to pause and later reactivate an active Project,
so that temporary operational interruption does not silently release or restore resources.

## Acceptance Criteria

1. **Given** an `ACTIVE` scoped Project, **when** pause is requested, **then** status becomes `PAUSED` at one server transaction instant and an immutable actor-attributed lifecycle event is appended.
2. **Given** Employee or Machine allocations are open, **when** pause commits, **then** they remain open and none of their periods, terms, or readings change.
3. **Given** a Project is `PAUSED`, **when** a resource is explicitly released or reallocated through its owning Workforce or Fleet command, **then** that command remains permitted and pause performs no implicit movement.
4. **Given** a `PAUSED` Project still has an active current Client, exactly one current Manager, at least one current Technical Responsibility, and a valid current Weekly Schedule, **when** reactivation is requested, **then** status returns to `ACTIVE` and a lifecycle event is appended.
5. **Given** a resource was released or moved during pause, **when** reactivation succeeds, **then** it is not restored and a new explicit allocation is required to return it.
6. **Given** accountability or schedule invariants became invalid, **when** reactivation is attempted, **then** structured corrective blockers are returned and status remains `PAUSED`.
7. **Given** source status is invalid for pause or reactivation, **when** the command is requested, **then** a stable lifecycle conflict is returned and no event is appended.
8. **Given** concurrent pause, reactivation, activation, or terminal commands target one Project, **when** they execute, **then** one valid transition commits and contradictory states/events are impossible.
9. **Given** a foreign Project is targeted, **when** either command is attempted, **then** existence is not disclosed and no state changes.
10. **Given** pause or reactivation succeeds, **when** dashboard data refreshes, **then** current status and currently open resources are accurate and released resources are never shown as automatically recoverable.
11. **Given** the feature is tested, **when** PostgreSQL, concurrency, frontend, and Playwright suites run, **then** they cover retained allocations, release during pause, non-restoration, invariant rejection, invalid source states, races, and scoped access.

## Tasks / Subtasks

- [ ] Define pause/reactivation contracts (AC: 1-7)
  - [ ] Add bodyless `POST /api/v1/projects/:projectId/pause` and `POST /api/v1/projects/:projectId/reactivate` routes with canonical envelopes and refreshed Project lifecycle responses.
  - [ ] Reuse the lifecycle event persistence introduced by Story 5.10; both transitions record trusted actor, exact from/to states, and one transaction instant without requiring a business reason.
  - [ ] Define stable codes for invalid source state, reactivation blockers, scope changes, and concurrent winner state.
- [ ] Implement explicit state transitions (AC: 1-9)
  - [ ] Pause only `ACTIVE`; update status and append history inside a serializable transaction without reading or mutating allocations as side effects.
  - [ ] Reactivate only `PAUSED`; inside the transaction rerun the same current Client, Manager, Technical Responsibility, and Weekly Schedule validator used by activation.
  - [ ] Preserve `actualStartedAt` forever after first activation and never create a second actual start on reactivation.
  - [ ] Serialize against other Project lifecycle commands with bounded `P2034` retry and scoped rereads.
- [ ] Add clear pause/reactivation UX (AC: 6-10)
  - [ ] Show pause only for `active` and reactivation only for `paused`; map all lifecycle labels consistently in detail and registry.
  - [ ] Explain that pause retains resources, render current allocations from backend truth, and refresh only after success.
  - [ ] Preserve blocker details and link to corrective responsibility/schedule actions without implying resource restoration.
- [ ] Prove no implicit allocation behavior (AC: 1-11)
  - [ ] Add unit and real-PostgreSQL tests for source-state matrices, audit events, actor/scope, validation rollback, and `actualStartedAt` preservation.
  - [ ] Snapshot open Employee/Machine allocations before and after pause/reactivation and assert no implicit writes or recreation.
  - [ ] Add barrier-based races with terminal and resource-movement commands plus frontend/Playwright and OpenAPI/Kubb drift checks.

## Dev Notes

### Developer Context

- Pause is only a Project lifecycle state. It does not mean release, suspension, or closure of an allocation.
- Reactivation validates current accountability/schedule but deliberately does not validate that previously allocated resources still exist; only currently open allocations remain assigned.
- `actualStartedAt` records the first production start. Lifecycle events record later pause/reactivation instants.

### Architecture Compliance

- Projects writes Project state/history; Workforce and Fleet remain the only owners of resource movement.
- Reuse one central lifecycle transition matrix and the Story 5.10 activation-invariant validator to avoid divergent rules.
- Use authenticated Company/actor scope, serializable transactions, stable errors, canonical OpenAPI, and generated clients.
- Do not create pause-specific allocation flags, copies, snapshots, or restoration queues.

### Current Files to Reconcile and Preserve

- Extend the Projects DTO/controller/service lifecycle surface created by Story 5.10; preserve wizard/list/detail behavior.
- Reuse Project lifecycle status/event persistence and current temporal accountability/schedule queries.
- Extend current Project detail/registry actions and labels without duplicating generated client types.

### Previous Story Intelligence

- Story 5.10 establishes the event model, shared activation invariants, status projections, and `actualStartedAt` semantics; Story 5.11 must extend them rather than migrate them again.
- Stories 5.2, 5.3, and 5.7 own explicit releases/reallocations and remain usable during pause.

### Latest Technical Notes

- Keep pinned dependencies and existing transaction helper conventions. Regenerate Prisma/OpenAPI/Kubb only through repository scripts.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-511-Pause-and-Reactivate-a-Project]
- [Source: _bmad-output/planning-artifacts/architecture.md#Lifecycle-and-Temporal-Commands]
- [Source: _bmad-output/implementation-artifacts/5-10-activate-a-planned-project-explicitly.md]
- [Source: main-api/prisma/schema.prisma#ProjectLifecycleStatus]
- [Source: main-api/src/modules/projects/projects.service.ts]
- [Source: main-web-app/src/features/projects/components/projects-registry.tsx]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

