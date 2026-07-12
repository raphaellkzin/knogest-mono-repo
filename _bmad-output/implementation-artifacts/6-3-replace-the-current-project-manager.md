# Story 6.3: Replace the Current Project Manager

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to replace the current Project Manager with dated history,
so that management can change while exactly one current Manager remains.

## Acceptance Criteria

1. **Given** a `PLANNED`, `ACTIVE`, or `PAUSED` Project in the selected Company, **when** a different eligible Employment is selected, **then** the current `ProjectManagerTenure` closes and a successor opens at one server transaction instant and exactly one current Manager remains.
2. **Given** an `ACTIVE` or `PAUSED` Project, **when** Manager replacement is submitted, **then** a trimmed non-blank reason is required and trusted actor, reason, and instant are recorded; `PLANNED` replacement may omit reason but still closes/opens dated tenures.
3. **Given** the selected Employee manages other Projects, **when** eligibility is evaluated, **then** replacement remains permitted because Manager tenure does not consume operational allocation exclusivity.
4. **Given** the selected Employee is operationally allocated to any Project, **when** selected as Manager, **then** Manager tenure may still be created and all operational allocations remain unchanged.
5. **Given** the Employment is terminated, inactive, lacks an open Employment period, is foreign to the selected Company/Corporation, or is missing, **when** replacement is attempted, **then** the response does not reveal foreign existence and the current Manager remains.
6. **Given** the selected Employment is already the current Manager, **when** replacement is submitted, **then** a stable semantic no-op response is returned and no tenure is duplicated.
7. **Given** a `COMPLETED` or `CANCELLED` Project, **when** Manager replacement is attempted, **then** it is rejected unconditionally in the MVP and history remains immutable.
8. **Given** Manager replacements race each other or Employment termination, **when** commands execute, **then** authoritative validation plus database constraints preserve exactly one eligible current Manager and losing commands receive safe conflicts with full rollback.
9. **Given** replacement succeeds, **when** current detail and dedicated history are queried, **then** detail shows the open Manager and history shows every tenure in deterministic `effectiveFrom` plus `id` order.
10. **Given** the Manager selector searches or paginates, **when** results are returned, **then** it includes active selected-Company Employments regardless of operational availability or other Manager tenures, uses canonical cursor pagination, and masks personal documents.
11. **Given** a foreign or missing Project is targeted, **when** replacement is attempted, **then** existence is not disclosed and no tenure changes.
12. **Given** the feature is tested, **when** unit, real-PostgreSQL, barrier-coordinated concurrency, frontend, and Playwright suites run, **then** they cover replacement, reason/no-op, multi-Project eligibility, allocation independence, invalid Employment, terminal state, termination races, current/history, selector masking/pagination, tenant isolation, and exactly one current Manager.

## Tasks / Subtasks

- [ ] Define Manager-tenure audit and command contracts (AC: 1-2, 5-7, 11)
  - [ ] Extend `ProjectManagerTenure` through a forward migration with trusted actor and nullable reason; preserve scoped FKs, half-open periods, existing one-open-manager partial index, and deferred non-terminal cardinality enforcement.
  - [ ] Add a strict command containing `managerEmploymentId` and optional `reason`; lifecycle-derived service validation requires reason after activation.
  - [ ] Define stable no-op, ineligible, terminal, stale/concurrent, and workspace conflict categories without exposing foreign/missing identifiers or database errors.
- [ ] Replace the Manager atomically (AC: 1-8, 11)
  - [ ] Add `POST /api/v1/projects/:projectId/manager-replacements` under authenticated Company scope with canonical Fastify/OpenAPI/Kubb contracts.
  - [ ] In one serializable transaction, reread Session/Company/role, scoped non-terminal Project/current tenure, and the candidate Employment's active state plus open Employment period; capture one server instant.
  - [ ] Conditionally close the expected current tenure and create its successor at the same instant. Do this for `PLANNED` too; unlike baseline/Client setup correction, Manager always retains dated tenure history.
  - [ ] Coordinate the invariant with Workforce termination through a public application/domain boundary or consistent database locking/constraints; never call/import a controller handler or private implementation.
  - [ ] Do not query operational availability and do not mutate `ProjectEmployeeAllocation`; translate `P2034`/constraint/conditional losers to safe stable conflicts with full rollback.
- [ ] Add eligible selector and Manager history UX (AC: 3-4, 9-10)
  - [ ] Provide/reuse an Employee selector query that filters active same-Company Employments but deliberately does not require operational `availability.state === available`; keep documents masked and use canonical cursor pagination.
  - [ ] Extend current Project detail with the open Manager and add tenures to the dedicated Project history contract, with actor/reason visibility permitted by the contract.
  - [ ] Add a Project detail replacement form, conditional reason UX, recoverable conflict/reselection behavior, and refresh only after backend confirmation.
- [ ] Prove cardinality and race safety (AC: 1-12)
  - [ ] Add DTO/service and real-PostgreSQL tests for lifecycle/reason/no-op, actor audit, closed-row immutability, scope/non-enumeration, allocation independence, and multiple-Project management.
  - [ ] Use barriers/latches for replacement-vs-replacement and replacement-vs-termination races; assert exactly one eligible current Manager and complete loser rollback.
  - [ ] Add selector/frontend action tests and Playwright coverage; regenerate/check Prisma, OpenAPI, Kubb, types, tests, and builds.

## Dev Notes

### Developer Context

- Manager tenure is accountability, not operational allocation. An Employee can manage multiple Projects and can manage while allocated elsewhere.
- Unlike baseline and Client setup corrections, every Manager replacement—including `PLANNED`—closes and opens dated tenures. Reason becomes mandatory only after activation.
- The termination race is cross-domain invariant work: both commands must validate the same authoritative Employment/current-manager state under compatible transactional protection.

### Architecture Compliance

- Projects owns Manager tenure; Workforce owns Employment lifecycle. Integrate through public boundaries and database invariants, not controller-to-controller calls or duplicated Employment rules.
- Preserve Session-derived scope, one transaction instant, half-open immutable history, one open tenure, deferred non-terminal accountability, serializable execution, and bounded `P2034` retry.
- Use distinct current/history DTOs and canonical cursor pagination. Use stable envelopes and generic foreign/missing behavior.
- Generate Prisma/OpenAPI/Kubb artifacts through supported commands; generated clients remain server-only. Preserve pinned dependency versions.

### Current Files to Reconcile and Preserve

- `main-api/prisma/schema.prisma`: `ProjectManagerTenure` lacks actor/reason and explicit Prisma relation fields although the SQL migration supplies scoped FKs. Extend forward and regenerate; do not rewrite generated or historical migration artifacts.
- `main-api/prisma/migrations/20260701210000_projects_aggregate/migration.sql`: already has the open-manager index and deferred Project completeness trigger. Preserve both while adding forward audit changes.
- `main-api/src/modules/projects/{projects.dto.ts,projects.service.ts,projects.controller.ts}`: add an explicit replacement slice and reuse transaction/scope behavior without changing finalization.
- Workforce termination implementation from Story 5.5 must check current Manager responsibility and participate safely in the same invariant; avoid circular module imports.
- `main-web-app/src/features/projects/projects.server.ts`: current wizard Employee mapping filters operational availability, which is incorrect for this Manager selector. Add a purpose-specific cursor-backed adapter and leave wizard allocation behavior intact.
- `main-web-app/src/features/projects/{projects-schema.ts,projects.actions.ts}` and `components/project-detail.tsx`: add purpose-specific form/action/view models and preserve unrelated Project/wizard behavior.

### Previous Story Intelligence

- Story 6.2 establishes temporal replacement, reason/no-op/error recovery, selector masking, and current/history projection patterns. Reuse them, but retain the deliberate differences for `PLANNED` tenure history and Employee eligibility.
- Story 5.5 defines Employment termination safety; replacement and termination must share authoritative invariants rather than trust stale selector state.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-63-Replace-the-Current-Project-Manager]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-33-Replace-Manager-and-Technical-Responsibilities]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database-Enforcement]
- [Source: _bmad-output/implementation-artifacts/6-2-correct-or-replace-the-current-project-client.md]
- [Source: _bmad-output/implementation-artifacts/5-5-terminate-an-employment-safely.md]
- [Source: main-api/prisma/schema.prisma#ProjectManagerTenure]
- [Source: main-api/src/modules/projects/projects.service.ts]
- [Source: main-web-app/src/features/projects/projects.server.ts]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

