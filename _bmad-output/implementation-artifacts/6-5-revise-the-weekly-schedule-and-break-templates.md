# Story 6.5: Revise the Weekly Schedule and Break Templates

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to revise the Project's Weekly Schedule and suggested breaks,
so that future shifts use current defaults while prior operational contexts keep the defaults that applied to them.

## Acceptance Criteria

1. **Given** a `PLANNED` Project, **when** its Weekly Schedule or Break Templates change, **then** the initial open `ProjectScheduleRevision` and children are corrected without creating another effective revision or implying production history.
2. **Given** an `ACTIVE` or `PAUSED` Project, **when** valid configuration changes, **then** a complete successor revision opens and the current revision closes at one server transaction instant.
3. **Given** a post-activation revision, **when** submitted, **then** a trimmed non-blank reason is required and trusted actor, reason, and instant are recorded; the revision applies only to future shifts.
4. **Given** a complete week is validated, **when** submitted, **then** it contains exactly days 1–7 once each, between one and seven working days, and every working day has exactly one same-day start/end window.
5. **Given** a working-day end is equal to or earlier than its start, or a non-working day contains times, **when** validation runs, **then** stable field errors are returned and no schedule data persists.
6. **Given** zero to ten Break Templates are supplied, **when** validated, **then** each has a normalized non-blank name and positive integer-minute duration; ordering is preserved and templates remain suggestions rather than divisions of the work window.
7. **Given** the resulting schedule and Break Templates are semantically unchanged, **when** revision is attempted, **then** a stable no-op response is returned and no revision opens.
8. **Given** prior or future operational/RDO context references an earlier revision, **when** a new revision commits, **then** its original reference remains unchanged and the closed revision is immutable.
9. **Given** a terminal Project, **when** revision is attempted, **then** a stable terminal conflict is returned and all revisions remain unchanged.
10. **Given** concurrent commands target the same current revision, **when** they race, **then** exactly one result becomes current and losers receive a safe stale-state conflict without partial child rows.
11. **Given** current Project configuration and dedicated history are queried, **when** revisions exist, **then** current detail returns the latest complete week/breaks and history returns prior immutable snapshots in deterministic order without offering them as editable state.
12. **Given** a foreign or missing Project is targeted, **when** revision is attempted, **then** existence is not disclosed and nothing changes.
13. **Given** tests run, **then** unit, PostgreSQL, concurrency, frontend, and Playwright coverage includes planned correction, active/paused revision, day counts, windows, optional/ordered breaks, no-op, future-only application, prior-reference preservation, terminal/scope rejection, races, and exactly one current revision.

## Tasks / Subtasks

- [ ] Define schedule revision audit and contracts (AC: 1-7, 9, 12)
  - [ ] Extend `ProjectScheduleRevision` through a forward migration with trusted actor and nullable reason while preserving current-revision uniqueness and child scope/cardinality constraints.
  - [ ] Add `PUT /api/v1/projects/:projectId/schedule` with strict `{ weeklySchedule, breakTemplates, reason? }`; reuse existing schedule/break primitives, limits, normalization, and full-week validation without widening the wizard command.
  - [ ] Define stable field, no-op, terminal, stale-state, and workspace conflict categories in canonical error details.
- [ ] Persist complete revisions transactionally (AC: 1-10, 12)
  - [ ] Reread authenticated scope, Project lifecycle, and current revision inside a serializable transaction on every bounded retry; derive one server timestamp.
  - [ ] For `PLANNED`, replace child configuration on the initial current revision atomically; for `ACTIVE`/`PAUSED`, close the expected revision and create a complete successor with seven day rows and ordered breaks.
  - [ ] Never rewrite a closed revision or rebind an existing operational context. Roll back the entire parent/children mutation on any failure.
- [ ] Add current schedule, history, and editor UX (AC: 6-8, 11)
  - [ ] Extend Project detail with current week/breaks and the dedicated Project history contract with complete historical snapshots.
  - [ ] Reuse the wizard schedule controls/validation concepts in a purpose-specific detail editor without coupling its form state to the non-resumable wizard.
  - [ ] Require reason after activation, preserve valid input on recoverable conflicts, show stable field mappings, and refresh only after success.
- [ ] Prove snapshot and future-only behavior (AC: 1-13)
  - [ ] Add DTO/service and PostgreSQL tests for all schedule/break validation, audit, immutability, scope, and lifecycle paths.
  - [ ] Add barrier-based races and an adapter/reference fixture proving earlier operational contexts stay bound to the earlier revision without implementing RDO.
  - [ ] Add frontend/schema/action and Playwright tests; regenerate/check Prisma, OpenAPI, Kubb, types, tests, and builds.

## Dev Notes

### Developer Context

- A revision is a complete snapshot: seven day rows plus ordered Break Templates. Never store a partial patch as historical state.
- Break Templates are optional suggestions. They do not subtract time, split the default window, or create shifts.
- “Future shifts” means consumers resolve the current revision when creating future operational context; this command must not rewrite existing context or implement the future RDO module.

### Architecture Compliance

- Projects owns schedule revisions. Use `[from,to)`, immutable closed rows, one current revision, one server instant, Session-derived scope, serializable execution, and bounded `P2034` retry.
- Preserve integer minutes, `HH:mm` same-day windows, Break Template order, stable envelopes, OpenAPI/Kubb generation, and separate current/history contracts.
- Do not manually edit generated artifacts or update pinned framework/library versions.

### Current Files to Reconcile and Preserve

- `ProjectScheduleRevision`, `ProjectScheduleDay`, and `ProjectBreakTemplate` already model parent snapshots and ordered children but lack revision actor/reason.
- `projects.dto.ts` and the web `projects-schema.ts` already enforce seven days, valid windows, maximum ten breaks, names, and positive durations. Extract/reuse rules for the new command while preserving finalization.
- `projects.service.ts` already creates the initial complete schedule. Extend through an explicit mutation path and never repurpose idempotent Project finalization.
- Reuse visual patterns from `project-wizard.tsx` in the detail editor, not the wizard component/state itself.

### Previous Story Intelligence

- Story 6.4 reinforces actor/reason persistence, terminal gates, current/history separation, and transactional races. Reuse the shared Projects mutation infrastructure.
- Story 6.1 defines the deliberate `PLANNED` correction versus post-activation revision split; schedule behavior follows the same split with child replacement atomicity.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-65-Revise-the-Weekly-Schedule-and-Break-Templates]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-34-Revise-Operational-Baseline]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/implementation-artifacts/6-4-maintain-technical-responsibilities.md]
- [Source: _bmad-output/implementation-artifacts/6-1-revise-the-project-budget-and-planned-dates.md]
- [Source: main-api/prisma/schema.prisma#ProjectScheduleRevision]
- [Source: main-api/src/modules/projects/projects.dto.ts]
- [Source: main-web-app/src/features/projects/components/project-wizard.tsx]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

