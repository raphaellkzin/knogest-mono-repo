# Story 5.12: Complete or Cancel a Project Safely

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to complete or cancel an eligible Project permanently,
so that terminal work is closed without leaving active operational relationships.

## Acceptance Criteria

1. **Given** a `PLANNED` Project, **when** cancellation is requested with a non-blank reason, **then** it may transition to `CANCELLED`; direct completion from `PLANNED` is rejected.
2. **Given** an `ACTIVE` or `PAUSED` Project, **when** completion or cancellation is requested, **then** terminal eligibility is revalidated inside the transaction.
3. **Given** any open Employee or Machine allocation exists, **when** a terminal transition is attempted, **then** it is blocked and every resource must be explicitly released or reallocated through its owning domain.
4. **Given** the operational-status port reports an open shift, pending final Machine reading, or unresolved operational work, **when** a terminal command runs, **then** a stable blocker is returned and no lifecycle/allocation state changes.
5. **Given** the MVP has no RDO module, **when** operational eligibility is queried, **then** the default `ProjectOperationalStatusPort` reports no future-RDO blockers and remains replaceable without changing command semantics.
6. **Given** no blocker remains and the source state permits completion, **when** a reason is confirmed, **then** status becomes `COMPLETED` at one server instant and an immutable lifecycle event records trusted actor and reason.
7. **Given** no blocker remains and the source state permits cancellation, **when** a reason is confirmed, **then** status becomes `CANCELLED` at one server instant and an immutable lifecycle event records trusted actor and reason.
8. **Given** a Project is terminal, **when** another lifecycle, allocation, or disallowed responsibility mutation is attempted, **then** a stable terminal-state conflict is returned and original terminal audit evidence remains immutable.
9. **Given** a terminal transition succeeds, **when** registries/selectors run, **then** authorized detail/history remains available while operational selectors exclude the Project and all prior baselines, schedules, responsibilities, allocations, and fuel terms remain intact.
10. **Given** terminal/lifecycle commands race, **when** they execute, **then** one consistent state commits and the Project cannot be both terminal outcomes or return to a non-terminal state.
11. **Given** a foreign Project is targeted, **when** a terminal command runs, **then** existence is not disclosed and nothing changes.
12. **Given** terminal actions are presented, **when** the administrator initiates one, **then** the dashboard uses irreversible confirmation, requires reason, displays blockers with safe next actions, and refreshes only after backend confirmation.
13. **Given** the feature is tested, **when** PostgreSQL, concurrency, frontend, and Playwright suites run, **then** they cover blockers, source-state matrix, both outcomes, irreversibility, selectors, history, races, reasons, and tenant isolation.

## Tasks / Subtasks

- [ ] Define terminal contracts and operational port (AC: 1-7)
  - [ ] Add `POST /api/v1/projects/:projectId/complete` and `POST /api/v1/projects/:projectId/cancel`, each accepting only `{ reason: string }` with trimmed non-empty bounded validation.
  - [ ] Reuse the Story 5.10 lifecycle event model; terminal events require immutable actor, reason, timestamp, and exact from/to states.
  - [ ] Define `ProjectOperationalStatusPort` returning explicit open-shift, pending-final-reading, and unresolved-work blocker state; ship an injectable MVP adapter returning false for each.
  - [ ] Define stable codes/details for invalid transition, open allocations, operational blockers, already-terminal state, scope change, and concurrency.
- [ ] Commit terminal transitions atomically (AC: 1-11)
  - [ ] Inside one serializable transaction, reread Session scope, Project status, open Employee/Machine allocations, and operational status before updating.
  - [ ] Permit completion only from `ACTIVE`/`PAUSED`; permit cancellation from `PLANNED`/`ACTIVE`/`PAUSED`; reject all terminal sources.
  - [ ] Update status and append one event using one server timestamp; never close allocations, responsibilities, schedules, agreements, or other temporal rows implicitly.
  - [ ] Centralize terminal gates so activation, pause/reactivation, new allocations, and later responsibility mutations cannot reopen or violate a terminal Project.
  - [ ] Use bounded `P2034` retry and translate races without changing the winning terminal event.
- [ ] Add irreversible terminal UX and selector behavior (AC: 8-12)
  - [ ] Offer actions only in eligible states, distinguish completion from cancellation, require a reason, and use explicit irreversible confirmation.
  - [ ] Render structured blockers with safe links to release/reallocate resources; preserve entered reason after recoverable conflicts.
  - [ ] Keep terminal detail/history accessible with status, actor/time/reason while excluding terminal Projects only from selectors that require operational eligibility.
- [ ] Prove terminal safety (AC: 1-13)
  - [ ] Add unit/source-state tests and real-PostgreSQL tests for every blocker, audit immutability, history preservation, selector behavior, and foreign non-enumeration.
  - [ ] Add barrier-based completion/cancellation races against activation, pause, reactivation, allocation, and release commands.
  - [ ] Test the default and blocking operational-port adapters without implementing RDO workflows.
  - [ ] Add frontend/Playwright coverage and regenerate/check Prisma, OpenAPI, Kubb, types, tests, and builds.

## Dev Notes

### Developer Context

- Completion and cancellation are irreversible lifecycle outcomes, not deletion or generic deactivation.
- Open allocations are blockers, not cleanup instructions. Silent closure would corrupt Workforce/Fleet audit history and reading continuity.
- Current selectors and historical projections have different eligibility rules; do not hide terminal Projects from authorized detail/history.

### Architecture Compliance

- Projects owns terminal Project state/history. Workforce and Fleet own their allocation periods and must be invoked explicitly before terminal eligibility succeeds.
- The Projects operational-status port is an anti-corruption boundary for future RDO state. Keep its default adapter explicit and replaceable; do not query future tables directly.
- Actor/Company scope is Session-derived and reread within the serializable transaction. Request reason is data, never authority.
- Preserve closed temporal records and canonical Fastify/OpenAPI/Kubb boundaries; never manually edit generated artifacts.

### Current Files to Reconcile and Preserve

- Extend the lifecycle DTO/controller/service and transition matrix established by Stories 5.10–5.11.
- Reuse `Project`, lifecycle events, `ProjectEmployeeAllocation`, and `ProjectMachineAllocation`; add indexes needed for scoped open-allocation checks through a forward migration.
- Extend Project detail/registry/selectors/actions so operational eligibility is explicit rather than inferred from display status.

### Previous Story Intelligence

- Story 5.11 proves pause retains allocations and permits explicit movement. Terminal commands must therefore query current open rows, not assume paused Projects are resource-free.
- Stories 5.2/5.3 and 5.7 provide the safe next actions for blockers; terminal execution must never duplicate those domain commands.

### Latest Technical Notes

- Preserve pinned dependencies. Use PostgreSQL constraints/indexes and the repository transaction helper; regenerate Prisma/OpenAPI/Kubb through supported commands only.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-512-Complete-or-Cancel-a-Project-Safely]
- [Source: _bmad-output/planning-artifacts/architecture.md#Lifecycle-and-Historical-Integrity]
- [Source: _bmad-output/implementation-artifacts/5-11-pause-and-reactivate-a-project.md]
- [Source: main-api/prisma/schema.prisma#Project]
- [Source: main-api/prisma/schema.prisma#ProjectEmployeeAllocation]
- [Source: main-api/prisma/schema.prisma#ProjectMachineAllocation]
- [Source: main-api/src/modules/projects/projects.service.ts]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

