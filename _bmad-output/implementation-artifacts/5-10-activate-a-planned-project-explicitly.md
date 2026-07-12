# Story 5.10: Activate a Planned Project Explicitly

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to activate a valid `PLANNED` Project when real production begins,
so that the system records the actual start independently of contractual dates.

## Acceptance Criteria

1. **Given** a `PLANNED` Project in the selected Company, **when** activation is requested, **then** the backend revalidates an active current Client, exactly one current Manager, at least one current Technical Responsibility, and one valid current Weekly Schedule.
2. **Given** optional Employee allocations, Machine allocations, or Fuel Agreements are empty, **when** all required accountability and schedule invariants hold, **then** activation remains eligible.
3. **Given** all invariants are valid, **when** activation commits, **then** status becomes `ACTIVE`, `actualStartedAt` is set once from the server transaction instant, and one immutable lifecycle event records trusted actor and transition.
4. **Given** the planned start is past or future, **when** activation occurs, **then** it takes effect immediately without alignment, backdating, or rejection based on that civil date.
5. **Given** valid Employee or Machine allocations were opened while `PLANNED`, **when** activation succeeds, **then** they remain open with their original IDs, terms, readings, and `effectiveFrom` values.
6. **Given** Client, Manager, Technical Responsibility, or Schedule state became stale, **when** activation is attempted, **then** a structured scoped blocker is returned and the Project remains unchanged.
7. **Given** the Project is already `ACTIVE`, `PAUSED`, `COMPLETED`, or `CANCELLED`, **when** activation is requested, **then** a stable lifecycle conflict is returned and no second start/event is recorded.
8. **Given** concurrent activation or another lifecycle command targets the Project, **when** commands execute, **then** at most one valid transition commits and the loser receives the committed state or a safe conflict.
9. **Given** a foreign Project is targeted, **when** activation is attempted, **then** existence is not disclosed and no state changes.
10. **Given** activation succeeds, **when** registry and detail refresh, **then** they show `active` and the actual start without inventing production, progress, cost, or RDO metrics.
11. **Given** the feature is tested, **when** unit, real-PostgreSQL, concurrency, frontend, and Playwright suites run, **then** they cover invariants, zero optional resources, planned-date independence, retained allocations, stale state, duplicate activation, timestamp uniqueness, and tenant isolation.

## Tasks / Subtasks

- [ ] Define activation and lifecycle-history contracts (AC: 1-7)
  - [ ] Add `POST /api/v1/projects/:projectId/activate` with no business body, Company-scoped authentication, canonical envelopes, and a response containing refreshed lifecycle state.
  - [ ] Add an immutable Project lifecycle event model with Corporation, Company, Project, from/to status, transaction timestamp, trusted `actorUserId`, and nullable reason; do not fabricate events for existing Projects.
  - [ ] Expand Project registry/detail OpenAPI status schemas from the current `planned` constant to all lowercase lifecycle values and expose nullable `actualStartedAt`.
- [ ] Commit activation as one Projects-domain command (AC: 1-9)
  - [ ] Inside a serializable transaction, reread Session/Company/role, scoped Project status, active current Client period, open Manager tenure, open Technical Responsibilities, and current Schedule revision/days.
  - [ ] Validate exactly seven unique schedule days and existing working/non-working time rules using current Project validators; optional operational collections are not activation requirements.
  - [ ] Update `PLANNED` to `ACTIVE`, set `actualStartedAt`, and append the event using one `now`; never recreate allocations or modify temporal history.
  - [ ] Use the shared bounded `P2034` retry and stable scoped codes for invalid source state, changed accountability/schedule, and concurrent winners.
- [ ] Add activation UX and projections (AC: 6-10)
  - [ ] Extend current Project view models and labels for all lifecycle statuses; remove hard-coded “Planejada” assumptions without changing creation behavior.
  - [ ] Present activation only for `planned`, use proportional confirmation, map structured blockers to corrective sections, and refresh after backend success.
  - [ ] Show actual start in `America/Sao_Paulo` business presentation while keeping the API timestamp unambiguous.
- [ ] Prove activation invariants (AC: 1-11)
  - [ ] Add DTO/service tests, real-PostgreSQL rollback and tenant tests, and barrier-based activation/lifecycle races.
  - [ ] Assert allocations and their effective timestamps are byte-for-byte unchanged after activation.
  - [ ] Add frontend/Playwright coverage and regenerate/check canonical OpenAPI/Kubb artifacts, types, tests, and builds.

## Dev Notes

### Developer Context

- `ProjectLifecycleStatus` and `Project.actualStartedAt` already exist, but current controller and dashboard types hard-code `planned`. Reconcile those contracts rather than adding a parallel lifecycle representation.
- Activation validates current temporal rows at commit time. Wizard-time validation is stale evidence and cannot authorize activation.
- Planned dates are civil planning facts; `actualStartedAt` is an immediate audited instant. Do not derive one from the other.

### Architecture Compliance

- Projects owns lifecycle transitions and its event history. Scope and actor come from authenticated Session state, never the request body.
- Persist UTC `timestamptz(3)` and present in `America/Sao_Paulo`; use one server timestamp throughout the transaction.
- Use canonical Fastify schemas and generated Kubb clients. Do not handwrite duplicate transport types or manually edit generated artifacts.
- Closed Client, responsibility, schedule, and allocation periods are immutable. Activation changes only Project state, actual start, and lifecycle history.

### Current Files to Reconcile and Preserve

- Extend the existing DTO/controller/service boundaries under `main-api/src/modules/projects`; preserve atomic wizard finalization, pagination, and detail isolation.
- Reuse `Project`, `ProjectClientPeriod`, `ProjectManagerTenure`, `ProjectTechnicalResponsibility`, and schedule models in `main-api/prisma/schema.prisma`.
- Extend existing registry/detail/action adapters under `main-web-app/src/features/projects`; preserve the current wizard and server-query flow.

### Previous Story Intelligence

- Stories 5.1–5.9 allow operational allocations while a Project is `PLANNED`. Activation must retain those reservations and serialize with their commands.
- Machine and Employee lifecycle commands already require transaction-time scope and conflict checks; use the same conventions instead of introducing frontend-authoritative eligibility.

### Latest Technical Notes

- Preserve repository-pinned Fastify, Prisma, Next.js, Zod, and Kubb versions. Use a forward Prisma migration and generated OpenAPI/Kubb output only.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-510-Activate-a-Planned-Project-Explicitly]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/implementation-artifacts/5-9-retire-a-machine-permanently.md]
- [Source: main-api/prisma/schema.prisma#Project]
- [Source: main-api/src/modules/projects/projects.service.ts]
- [Source: main-web-app/src/features/projects/components/project-detail.tsx]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

