# Story 6.4: Maintain Technical Responsibilities

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to add or end Technical Responsibilities with dated history,
so that accountability can evolve while every non-terminal Project retains at least one responsible Employee.

## Acceptance Criteria

1. **Given** a non-terminal Project and a different active same-Company Employment, **when** Technical Responsibility is added, **then** one open `ProjectTechnicalResponsibility` starts at the server transaction instant and the Employee may retain responsibilities on other Projects.
2. **Given** the Employee is operationally allocated to another Project, **when** responsibility eligibility is checked, **then** addition remains permitted and no operational allocation changes.
3. **Given** a current responsibility is ended while another remains, **when** the command commits, **then** only the selected period closes at the server transaction instant and its history remains immutable.
4. **Given** ending a responsibility would leave a non-terminal Project with none, **when** the command runs, **then** a stable invariant conflict is returned and no period closes.
5. **Given** the candidate Employment is terminated, inactive, lacks an open Employment period, is foreign, or is missing, **when** addition is attempted, **then** existence is not disclosed and current responsibilities remain unchanged.
6. **Given** the Employment already has an open responsibility on the Project, **when** addition is attempted, **then** a stable no-op/duplicate response is returned and no second period opens.
7. **Given** a responsibility changes on an `ACTIVE` or `PAUSED` Project, **when** the command is submitted, **then** a trimmed non-blank reason is required and trusted actor, reason, and one server instant are recorded; `PLANNED` changes may omit reason.
8. **Given** a `COMPLETED` or `CANCELLED` Project, **when** any current responsibility mutation is attempted, **then** it is rejected and existing history remains immutable.
9. **Given** responsibility additions/endings race each other or Employment termination, **when** they execute, **then** transactional validation and deferred database enforcement preserve at least one eligible current responsibility and losing commands roll back with safe conflicts.
10. **Given** current detail and dedicated history are queried, **when** closed periods exist, **then** detail exposes only open responsibilities and history returns every period in deterministic `effectiveFrom` plus `id` order.
11. **Given** the selector searches or paginates, **when** results load, **then** active selected-Company Employments are returned regardless of operational availability, through canonical cursor pagination with masked documents.
12. **Given** a foreign or missing Project is targeted, **when** a mutation runs, **then** Project existence is not disclosed and nothing changes.
13. **Given** the feature is tested, **when** real-PostgreSQL, concurrency, frontend, and Playwright suites run, **then** they cover add, end, duplicate, last-responsibility blocking, reason, multi-Project eligibility, allocation independence, invalid Employment, termination races, terminal state, current/history, masking, pagination, and tenant isolation.

## Tasks / Subtasks

- [ ] Define responsibility audit and command contracts (AC: 1-8, 12)
  - [ ] Extend `ProjectTechnicalResponsibility` through a forward migration with trusted actor and nullable reason; preserve half-open periods, scoped foreign keys, one-open Employment/Project relationship, and the deferred minimum-one-current-responsibility invariant.
  - [ ] Add strict add and end commands: `POST /api/v1/projects/:projectId/technical-responsibilities` with `{ employmentId, reason? }`, and `POST /api/v1/projects/:projectId/technical-responsibilities/:responsibilityId/end` with `{ reason? }`.
  - [ ] Define stable duplicate/no-op, last-responsibility, ineligible, terminal, stale/concurrent, and workspace conflict categories without leaking foreign identifiers or database details.
- [ ] Commit responsibility lifecycle atomically (AC: 1-9, 12)
  - [ ] Reuse the Projects serializable transaction and authenticated Session/Company/role reread; validate scoped Project, current periods, and Employment state on every bounded `P2034` attempt.
  - [ ] Use one server timestamp for actor audit and open/close boundary; never edit a closed period or mutate operational allocations.
  - [ ] Coordinate with Workforce termination through a public boundary and compatible locking/constraints; translate conditional/deferred-constraint losers into stable conflicts with full rollback.
- [ ] Add responsibility selector, detail, history, and forms (AC: 10-11)
  - [ ] Reuse the purpose-specific Employee selector pattern from Story 6.3: active Employment, Company scoped, availability independent, masked, and cursor paginated.
  - [ ] Add open responsibilities to current Project detail and closed/open periods to the dedicated Project history contract.
  - [ ] Add detail-page add/end actions with conditional reason, last-item protection, preserved form state, and refresh only after confirmed success.
- [ ] Prove accountability invariants (AC: 1-13)
  - [ ] Add DTO/service and real-PostgreSQL tests for lifecycle, audit, scope, immutable closed periods, minimum cardinality, and allocation independence.
  - [ ] Use barriers/latches—not sleeps—for add/end/termination races and assert full loser rollback.
  - [ ] Add frontend/action/selector tests and Playwright coverage; regenerate/check Prisma, OpenAPI, Kubb, types, tests, and builds.

## Dev Notes

### Developer Context

- Technical Responsibility is accountability, not workforce allocation. Do not consult or consume employee allocation exclusivity.
- A non-terminal Project must never commit with zero current Technical Responsibilities. Application validation improves errors; the deferred database invariant is the final guarantee.
- Reason is lifecycle-dependent: optional in `PLANNED`, mandatory after activation, with actor always derived from authenticated context.

### Architecture Compliance

- Projects owns responsibility periods; Workforce owns Employment lifecycle. Share invariants through public application/domain boundaries, not controller calls or duplicated private logic.
- Preserve `[effectiveFrom,effectiveTo)`, immutable closed rows, one transaction instant, serializable execution, bounded retry, stable canonical envelopes, and separate current/history DTOs.
- OpenAPI is authoritative; generated Kubb clients remain server-only. Never manually edit generated Prisma/Kubb artifacts or update pinned dependencies.

### Current Files to Reconcile and Preserve

- `main-api/prisma/schema.prisma`: `ProjectTechnicalResponsibility` has temporal fields but lacks actor/reason; extend with a new migration rather than rewriting the Projects aggregate migration.
- The existing SQL migration includes scoped FKs and deferred Project completeness checks. Preserve them and add any open-pair index required for duplicate prevention.
- Extend the Projects DTO/service/controller slice and current detail/history projections without changing wizard finalization.
- The current web wizard filters allocation availability for some Employee use cases; Project responsibility maintenance requires a dedicated availability-independent selector and must leave wizard behavior intact.

### Previous Story Intelligence

- Story 6.3 establishes the active-Employment selector, cross-domain termination race, current/history separation, and accountability-not-allocation rule. Reuse those patterns.
- Story 5.5 requires termination to reject loss of the last Technical Responsibility; both sides must enforce the same invariant transactionally.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-64-Maintain-Technical-Responsibilities]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-33-Replace-Manager-and-Technical-Responsibilities]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Database-Enforcement]
- [Source: _bmad-output/implementation-artifacts/6-3-replace-the-current-project-manager.md]
- [Source: _bmad-output/implementation-artifacts/5-5-terminate-an-employment-safely.md]
- [Source: main-api/prisma/schema.prisma#ProjectTechnicalResponsibility]
- [Source: main-api/src/modules/projects/projects.service.ts]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

