# Story 5.9: Retire a Machine Permanently

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to retire a Machine permanently when it leaves service,
so that it cannot return to operational use while every prior record remains valid.

## Acceptance Criteria

1. **Given** a Machine currently owned by the selected Company with no open allocation, **when** eligibility is checked inside the retirement transaction, **then** allocation state does not block retirement.
2. **Given** an open allocation exists, **when** retirement is attempted, **then** a stable scoped conflict is returned and no Machine, ownership, identifier, or historical state changes.
3. **Given** the operational-status port reports an open shift or pending final reading, **when** retirement is attempted, **then** it is blocked and this story does not create a shift-closing workflow.
4. **Given** the Machine is eligible, **when** a non-blank reason is confirmed, **then** retirement takes effect at one server transaction instant and trusted actor, reason, and terminal state are recorded.
5. **Given** retirement succeeds, **when** current registries and allocation/transfer selectors run, **then** the Machine is permanently excluded and no restore, reactivation, allocation, transfer, or ordinary reading command is accepted.
6. **Given** the retired Machine has prior ownership, allocation, reading, maintenance, fueling, or future RDO references, **when** historical detail is requested, **then** every reference remains valid and retirement deletes or rewrites nothing.
7. **Given** active plate/tag uniqueness excludes retired identifiers, **when** another Machine is registered in the relevant Company scope, **then** reuse may be allowed while old records still reference the retired Machine identity.
8. **Given** retirement already occurred, **when** requested again, **then** a stable terminal-state conflict is returned and original actor, instant, and reason remain immutable.
9. **Given** concurrent retirement, transfer, allocation, or reading commands target the Machine, **when** they execute, **then** one consistent lifecycle outcome commits and a retired Machine has no open operational relationship.
10. **Given** a foreign Machine is targeted, **when** retirement is attempted, **then** it fails without revealing existence and no state changes.
11. **Given** the dashboard presents retirement, **when** initiated, **then** it uses proportional irreversible confirmation, displays blockers/safe next actions, and refreshes only after backend confirmation.
12. **Given** the feature is tested, **when** unit, PostgreSQL, concurrency, frontend, and Playwright suites run, **then** they cover blockers, reason, irreversibility, selectors, identifier reuse, history, races, and tenant isolation without ever restoring a Machine.

## Tasks / Subtasks

- [ ] Define the terminal retirement contract and persistence (AC: 1-8)
  - [ ] Add `POST /api/v1/machines/:machineId/retire` with `{ reason: string }`, canonical envelopes, authenticated Company scope, and refreshed historical/current projection.
  - [ ] Add immutable retirement actor, reason, and timestamp fields or a dedicated one-to-one retirement event; preserve existing Machine rows without fabricated retirement data.
  - [ ] Make terminal state authoritative rather than relying only on generic `isActive`; ordinary removal/deactivation must not be confused with permanent retirement.
- [ ] Commit retirement as one Fleet lifecycle command (AC: 1-10)
  - [ ] Reread authorization, current ownership, open allocation, operational status, identifiers, latest reading, and existing terminal state inside a serializable transaction.
  - [ ] Reject blockers; otherwise record retirement and release active Company-scoped identifiers at the same transaction instant without closing/deleting ownership history.
  - [ ] Gate all Fleet allocation, transfer, ordinary reading, correction-eligibility, and selector paths against retirement while preserving historical queries.
  - [ ] Use bounded retry and translate races into stable scoped codes; repeat retirement must never alter original audit evidence.
- [ ] Add irreversible retirement UX (AC: 5-11)
  - [ ] Require a typed/non-blank reason and explicit confirmation communicating permanent operational exclusion.
  - [ ] Render stable blockers with safe actions, preserve recoverable reason input, and refresh/navigate only after success.
  - [ ] Keep historical detail accessible with visible retirement actor/time/reason while removing operational actions.
- [ ] Prove terminal invariants (AC: 1-12)
  - [ ] Add DTO/service tests for reason validation, terminal code mapping, and command gates.
  - [ ] Add real-PostgreSQL tests for blocker rollback, terminal audit immutability, identifier release/reuse, references, selectors, and tenant isolation.
  - [ ] Add barrier-based races against allocate, transfer, release/reallocate, and reading commands and assert no retired Machine owns an open operational allocation.
  - [ ] Add frontend/Playwright tests and regenerate/check OpenAPI/Kubb artifacts, type checks, tests, and builds.

## Dev Notes

### Developer Context

- Retirement is a domain terminal state, not deletion and not a reversible `isActive` toggle. Model it explicitly enough that every future Fleet command can reject it consistently.
- Releasing active identifiers enables policy-approved reuse; retain the identifier rows and Machine ID so every historical foreign key remains valid.
- Keep the current ownership period/history intact unless the architecture explicitly models retirement as ownership closure. Retirement means leaving service, not erasing who owns the asset.

### Architecture Compliance

- Fleet owns retirement and all terminal gates. The current Company and actor come from authenticated Session state.
- Use the shared operational-status port; the default MVP adapter reports no blockers but injectable tests must prove both states.
- Closed periods, readings, corrections, references, ownership, and allocation history are immutable. No cascade deletion or restore endpoint is allowed.
- Current and historical queries must intentionally differ: operational selectors exclude retirement, authorized detail/history retains it.

### Current Files to Reconcile and Preserve

- Extend `main-api/src/modules/fleet` and its existing Machine lock/serializable transaction patterns.
- Reuse Machine identifiers, ownership, reading, and allocation persistence in `main-api/prisma/schema.prisma`.
- Extend Machine detail, registry, action-state, and server adapters under `main-web-app/src/features/machines`.

### Previous Story Intelligence

- Stories 5.6–5.8 define every command that must serialize with or be gated by retirement. Centralize eligibility so a new command cannot accidentally resurrect operational use.
- Transfer releases/recreates identifiers across ownership scopes; retirement releases only current active identifiers and never opens a new ownership period.

### Latest Technical Notes

- Keep repository-pinned dependencies. Use a forward Prisma migration and generated OpenAPI/Kubb outputs; never manually edit generated artifacts.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-59-Retire-a-Machine-Permanently]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/implementation-artifacts/5-8-transfer-machine-ownership-between-companies.md]
- [Source: main-api/prisma/schema.prisma#Machine]
- [Source: main-api/prisma/schema.prisma#MachineIdentifier]
- [Source: main-api/src/modules/fleet/handlers/fleet.handler.ts]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Story context created and validated for development readiness.

### File List

