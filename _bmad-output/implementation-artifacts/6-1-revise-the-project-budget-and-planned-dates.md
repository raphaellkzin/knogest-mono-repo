# Story 6.1: Revise the Project Budget and Planned Dates

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to revise the Project's approved budget or planned dates without overwriting prior values,
so that current planning remains accurate while earlier baselines stay historically true.

## Acceptance Criteria

1. **Given** a `PLANNED` Project in the selected Company, **when** approved budget or planned dates are corrected, **then** the single initial open `ProjectBaseline` is updated without creating a post-activation revision and `actualStartedAt` and lifecycle history remain unchanged.
2. **Given** an `ACTIVE` or `PAUSED` Project, **when** at least one baseline field changes, **then** a trimmed non-blank reason is required and the current baseline closes while a complete new baseline opens at one server transaction instant.
3. **Given** a post-activation revision, **when** it commits, **then** the closed baseline is immutable and the new revision records trusted `actorUserId`, reason, effective instant, changed values, and carried-forward unchanged values.
4. **Given** no baseline field meaningfully changes, **when** the command is submitted, **then** it is rejected with a stable semantic no-op response and no row is changed or created.
5. **Given** planned end precedes planned start, **when** validation runs against the complete resulting baseline, **then** a stable field error identifies `plannedEndDate` and no mutation occurs.
6. **Given** approved budget crosses an API boundary, **when** it is validated and persisted, **then** it is a normalized non-negative decimal string with exactly two decimal places, `"0.00"` is accepted, excess scale/negative values are rejected without rounding, and PostgreSQL stores `numeric(18,2)`.
7. **Given** planned dates are transported or displayed, **when** they cross layers, **then** they remain `YYYY-MM-DD` civil dates without server-local-time conversion and never change `actualStartedAt`.
8. **Given** a baseline revision, **when** it succeeds, **then** no cost, progress, earned-value, or forecast calculation is triggered.
9. **Given** a `COMPLETED` or `CANCELLED` Project, **when** revision is attempted, **then** a stable terminal-state conflict is returned and baseline history remains unchanged.
10. **Given** two commands target the same open baseline, **when** they race, **then** exactly one valid result becomes current and the loser receives a safe stale-state conflict without overwriting history.
11. **Given** current detail and Project history are queried, **when** revisions exist, **then** current detail returns only the latest baseline while the dedicated historical contract returns every revision in deterministic `effectiveFrom` plus `id` order.
12. **Given** a foreign or missing Project is targeted, **when** revision is attempted, **then** existence is not disclosed and nothing changes.
13. **Given** the feature is tested, **when** unit, real-PostgreSQL integration, barrier-coordinated concurrency, frontend, and Playwright suites run, **then** they cover planned correction, post-activation revision, partial changes, reason/no-op/date/decimal validation, terminal/scope rejection, races, current detail, history, and exactly one open baseline.

## Tasks / Subtasks

- [ ] Define baseline revision persistence and contracts (AC: 1-7, 9-12)
  - [ ] Add audit ownership to `ProjectBaseline` through a forward Prisma migration: trusted actor and nullable reason sufficient for the initial/planned row while post-activation revisions require reason at the application boundary.
  - [ ] Preserve the existing partial unique current-baseline index, scoped foreign keys, non-negative budget/date checks, and half-open `[effectiveFrom, effectiveTo)` semantics; do not edit generated Prisma output.
  - [ ] Add a strict PATCH-style command with optional `approvedBudget`, `plannedStartDate`, and `plannedEndDate`, at least one supplied field, and optional `reason`; compute and validate the complete resulting baseline server-side.
  - [ ] Define stable field, no-op, terminal, unavailable, stale-state, and workspace-conflict codes using the canonical error envelope; do not claim literal code names are pre-existing.
- [ ] Implement lifecycle-aware baseline mutation (AC: 1-10, 12)
  - [ ] Add `PATCH /api/v1/projects/:projectId/baseline` under authenticated Company scope and document it in Fastify OpenAPI for Kubb generation.
  - [ ] Reuse/extract the existing Projects serializable transaction and Session/Company/role reread; capture one server timestamp and repeat all authoritative reads on bounded `P2034` retry.
  - [ ] For `PLANNED`, conditionally update only the initial open row; for `ACTIVE`/`PAUSED`, conditionally close the expected open row and create a complete successor at the same instant.
  - [ ] Translate conditional-update/constraint losers into stale conflict, never database details; never mutate a closed row.
- [ ] Expose current and historical baseline UX (AC: 7-8, 11)
  - [ ] Expand Project detail/registry lifecycle types beyond the current hard-coded `planned` contract and include the current baseline in the detail view model.
  - [ ] Add a dedicated cursor-paginated Project history query/DTO for baseline revisions; keep historical rows out of operational selectors.
  - [ ] Add a detail-page baseline editor that changes only supplied fields, requires reason after activation, retains form state on recoverable conflict, renders civil dates/BRL strings safely, and refreshes registry/detail/history only after success.
- [ ] Prove temporal and precision safety (AC: 1-13)
  - [ ] Add DTO/service tests plus real PostgreSQL tests for constraints, audit fields, immutable closed rows, tenant isolation, and lifecycle matrix.
  - [ ] Coordinate competing revisions with barriers/latches rather than sleeps and assert winner/loser plus one open baseline.
  - [ ] Add frontend schema/action tests and Playwright coverage; regenerate and check Prisma, OpenAPI, Kubb, types, tests, and builds.

## Dev Notes

### Developer Context

- This is a planning-baseline command, not an accounting engine. Do not add derived financial calculations.
- The `PLANNED` update is a narrow setup correction exception. Once activated, history is append-only: close current and open successor.
- Partial input never creates partial history. Carry current values forward so every revision is a complete effective snapshot.

### Architecture Compliance

- Projects owns `ProjectBaseline`. Derive Corporation, Company, Session, User, and role from authenticated server state and reread them inside the transaction.
- Preserve civil dates as PostgreSQL `date`, budget as `numeric(18,2)`, decimals as strings, server-generated instants as `timestamptz`, and periods as `[from,to)`.
- Current-state and historical queries require distinct handlers/DTOs. Use canonical envelopes, stable details, OpenAPI as source, and server-only generated Kubb clients.
- Preserve pinned Next 16.2.9, React 19.2.4, Fastify 5.8.5, Prisma 7.8, Zod 4, Vitest, and Playwright versions; no dependency update or external research is required.

### Current Files to Reconcile and Preserve

- `main-api/prisma/schema.prisma`: `ProjectBaseline` already has budget, civil dates, and effective bounds but lacks actor/reason relations. Existing SQL migration already enforces one open row and baseline checks; extend forward, never rewrite the old migration.
- `main-api/src/modules/projects/projects.dto.ts`: wizard command already contains correct decimal/date validation. Extract/reuse primitives without widening the finalize payload.
- `main-api/src/modules/projects/projects.service.ts`: preserve `runSerializable`, `assertWorkspace`, `finalize`, list, and detail behavior while adding explicit revision logic.
- `main-api/src/modules/projects/projects.controller.ts`: status responses currently constrain Projects to `planned`; expand lifecycle response enums while preserving existing create/list/detail contracts.
- `main-web-app/src/features/projects/{projects-schema.ts,projects.actions.ts,projects.server.ts}` and `components/{project-detail.tsx,projects-registry.tsx}`: add dedicated editor/action/query adapters; do not import generated clients into Client Components or disturb the wizard.
- `main-web-app/src/app/home/obras/[projectId]/page.tsx`: compose new data without converting every authorization/transient error into `notFound()`.

### Previous Story Intelligence

- Story 5.12 establishes terminal irreversibility and separate authorized history access. Baseline revision must reuse that lifecycle truth and never reopen terminal Projects.
- Story 5.10 owns `actualStartedAt`; baseline changes must not recalculate or overwrite it.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-61-Revise-the-Project-Budget-and-Planned-Dates]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-31-Revise-Project-Baseline]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Epic-4-Finalization-Security-Contract]
- [Source: _bmad-output/implementation-artifacts/5-12-complete-or-cancel-a-project-safely.md]
- [Source: main-api/prisma/schema.prisma#ProjectBaseline]
- [Source: main-api/src/modules/projects/projects.service.ts]
- [Source: main-web-app/src/features/projects/components/project-detail.tsx]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

