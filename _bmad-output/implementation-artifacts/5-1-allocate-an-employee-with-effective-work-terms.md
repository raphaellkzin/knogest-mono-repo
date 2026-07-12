---
baseline_commit: c57fba3c2ea9951d1a6f5b189cde7d5838ae01c6
---

# Story 5.1: Allocate an Employee With Effective Work Terms

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to allocate an eligible Employee to a `PLANNED` or `ACTIVE` Project with effective work terms,
so that the Project reserves the worker and future operational evidence uses the correct conditions.

## Acceptance Criteria

1. **Given** an active Employment in the selected Company and an eligible `PLANNED` or `ACTIVE` Project
   **When** the administrator submits an allocation
   **Then** the command requires a free-text job role, expected daily workload from 1 through 1,440 integer minutes, compensation mode, non-negative BRL compensation value, and non-negative BRL overtime rate
   **And** Corporation, selected Company, actor, Session, and role come only from trusted authentication context.

2. **Given** compensation terms are submitted
   **When** validation runs
   **Then** compensation mode is limited to `daily`, `hourly`, `weekly`, `fortnightly`, or `monthly`
   **And** compensation value and overtime rate are normalized decimal strings persisted as `numeric(18,2)`.

3. **Given** compensation value or overtime rate is exactly `"0.00"`
   **When** validation runs
   **Then** the value is accepted
   **And** negative values, exponent notation, non-normalized values, and scale beyond two decimal places are rejected without rounding.

4. **Given** the Project is `PLANNED`
   **When** allocation succeeds
   **Then** the Employee is reserved immediately at the server transaction instant
   **And** planned dates do not delay or automatically release the allocation.

5. **Given** the Project is `ACTIVE`
   **When** allocation succeeds
   **Then** the Employee is operationally assigned from the same server transaction instant
   **And** no client-supplied, scheduled, or backdated effective time is accepted.

6. **Given** the same Person has another open operational Employee Allocation in any Company of the authenticated Corporation
   **When** a new allocation is attempted
   **Then** the command returns a stable availability conflict
   **And** a sibling Company or foreign Project is not disclosed beyond authorized recovery detail.

7. **Given** the Person has an Employment or Project allocation in another Corporation
   **When** allocation occurs in the authenticated Corporation
   **Then** that independent Corporation does not block the command
   **And** no cross-Corporation relationship is created.

8. **Given** the Employee is a current Manager or Technical Responsibility
   **When** an operational allocation is submitted
   **Then** accountability relationships do not consume operational exclusivity
   **And** only another open `ProjectEmployeeAllocation` for the Person in the Corporation blocks the command.

9. **Given** the Employee, Employment, or Project becomes inactive, terminal, removed, terminated, or foreign before commit
   **When** transactional eligibility is revalidated
   **Then** no allocation is created
   **And** a stable scoped error identifies a safe recovery action without existence disclosure.

10. **Given** two commands concurrently allocate the same Person to different Projects in the Corporation
    **When** they execute
    **Then** the database invariant and serializable transaction behavior produce one winner
    **And** the losing command receives a safe conflict without an overlapping period.

11. **Given** allocation succeeds
    **When** Employee availability and Project detail are refreshed
    **Then** the Employee is unavailable for another operational allocation in the Corporation
    **And** the open period exposes its snapshotted effective terms without mutating Person, Employment, or Company job-role identity.

12. **Given** Employee allocation is tested
    **When** unit, real-PostgreSQL integration, concurrency, frontend, and Playwright suites run
    **Then** they cover both eligible Project states, every term, decimal precision, planned reservation, Corporation-wide exclusivity, cross-Corporation independence, responsibility exceptions, races, and tenant isolation
    **And** every Person has at most one open operational allocation per Corporation.

## Tasks / Subtasks

- [ ] Establish the auditable allocation-period persistence contract (AC: 1-5, 10-11)
  - [ ] Extend `ProjectEmployeeAllocation` through a reviewed migration rather than `prisma db push`; preserve existing ids, periods, terms, and the partial unique index `project_employee_allocations_person_current_key`.
  - [ ] Add creation actor metadata and nullable closing metadata needed by later lifecycle stories. New rows must record trusted `actorUserId`; an open row has `effectiveTo`, closing actor, and closing reason all null.
  - [ ] Add scoped User relations/foreign keys and database checks that cannot permit an invalid open/closed audit shape. Handle any existing aggregate-created rows with an explicit migration/backfill strategy rather than fabricating an actor.
  - [ ] Update Project finalization so initial wizard allocations also populate the new creation-actor field from `ProjectScope.userId`; do not change the wizard payload.
  - [ ] Keep `employmentJobRolePeriodId` optional provenance only when the chosen free-text role is intentionally sourced from the current Company job role; eligibility and the snapshot must not depend on that catalog relationship.

- [ ] Define the Workforce allocation command and generated contract (AC: 1-9)
  - [ ] Add a Workforce-owned `POST /api/v1/employee-allocations` command with body `{ employmentId, projectId, jobRole, expectedDailyWorkloadMinutes, compensationMode, compensationValue, overtimeRate }`; do not accept Corporation, Company, Person, actor, status, or effective timestamps.
  - [ ] Validate the command with strict Zod and matching Fastify JSON Schema. Reuse the existing normalized two-decimal string rules; reject unknown properties and silent numeric coercion at the application boundary.
  - [ ] Return `201` with a current allocation view containing allocation id, Employment/Person-safe identity, Project-safe identity, terms, and ISO effective time. Document `400/401/403/404/409` canonical envelopes and stable codes including `EMPLOYEE_ALLOCATION_UNAVAILABLE` and `EMPLOYEE_ALLOCATION_STATE_CONFLICT`.
  - [ ] Regenerate the canonical OpenAPI artifact and Kubb TypeScript/Zod/server-only clients. Never hand-edit generated output or introduce a parallel frontend request type.

- [ ] Implement the transaction through the Workforce service/handler boundary (AC: 4-10)
  - [ ] Keep ownership in `workforce`: controller validates transport, service owns authorization/transaction/outcome, handler owns Prisma. Reuse the repository transaction context and bounded `P2034` retry pattern.
  - [ ] Inside one `Serializable` transaction, reread the persisted Session/User/selected Company, active Employment, active Person, and destination Project scoped to the selected Company with status `PLANNED` or `ACTIVE`.
  - [ ] Derive `personId`, Company, actor, and transaction instant server-side. Do not trust a selector result or preflight availability response at commit time.
  - [ ] Insert one allocation using the existing Corporation-wide partial unique index as the final exclusivity guard; translate uniqueness/serialization outcomes into the stable non-disclosing conflict.
  - [ ] Do not count Manager or Technical Responsibility rows as operational allocations and do not change those relationships.

- [ ] Expose allocation through the existing dashboard boundaries (AC: 1-11)
  - [ ] Add a server-only Employees feature query for eligible `PLANNED`/`ACTIVE` Projects in the selected Company and a typed Server Action that invokes the generated allocation client.
  - [ ] Extend the authorized Employee detail flow with an allocation operation using the established operational modal/form primitives. Preserve Portuguese copy, visible focus, pending protection, field errors, conflict recovery, and selected Company reset behavior.
  - [ ] Keep exact decimal strings in form state and transport; never convert compensation to JavaScript numbers. Preserve valid inputs after validation or availability conflicts.
  - [ ] Refresh Employee detail/list and affected Project detail only after confirmed success. Current selectors must exclude the newly allocated Person across the Corporation without leaking the blocking Project when unauthorized.
  - [ ] Extend current Employee and Project detail response/view models only with the bounded open-allocation summary needed for this workflow; historical timelines remain Story 6.7/6.8.

- [ ] Prove the complete allocation invariant (AC: 1-12)
  - [ ] Unit-test strict command validation, compensation modes, inclusive workload limits, zero money, excessive scale, normalized decimals, and error translation.
  - [ ] Add real-PostgreSQL tests for `PLANNED` and `ACTIVE`, inactive/terminal/foreign resources, free-text role independence from the Company job-role catalog, accountability exceptions, same-Corporation cross-Company exclusivity, cross-Corporation independence, and rollback.
  - [ ] Coordinate concurrent transactions with barriers/latches, not sleeps, and assert exactly one open row and one stable loser response.
  - [ ] Component-test form preservation, pending guard, accessible errors, and successful view refresh; Playwright-test allocation from an authorized Employee flow and resulting selector exclusion.
  - [ ] Run API/frontend lint, architecture checks, typecheck, unit/integration suites, migrations, OpenAPI/Kubb generation and drift checks, production builds, and the focused Playwright journey.

## Dev Notes

### Developer Context

- This is the first post-creation operational Employee Allocation command. Initial allocations already exist in `projects.service.ts`; extend the same `ProjectEmployeeAllocation` model and invariant instead of creating another table or availability flag.
- Workforce owns Person, Employment, availability, and operational Employee Allocation lifecycle. Projects continues to own only aggregate creation and its initial allocation orchestration.
- Current availability already queries open allocations by `corporationId/personId`. Preserve that behavior and make it authoritative through the existing partial unique index.
- The current Project detail is minimal and Employee detail has no allocation history. Add only the current summaries needed here; full history is owned by Epic 6.

### Architecture Compliance

- Preserve backend flow `controller -> service -> handler -> Prisma` and frontend flow `page -> feature -> server action/query -> adapter/view model -> generated client -> API`.
- Use half-open `[effectiveFrom, effectiveTo)` periods, `timestamptz`, integer workload minutes, and `numeric(18,2)` transported as strings.
- Keep transactions short and free of network/UI work. PostgreSQL defaults to `ReadCommitted`; this command must explicitly use `Serializable` with bounded retry for Prisma `P2034` conflicts.
- Fastify schemas are application-owned code and must describe every request/response field. Database lookups belong in the service/handler transaction, not async schema validation.
- Preserve stable canonical envelopes, trusted scope, non-disclosing 404/409 behavior, request correlation, and sanitized logs without complete bodies or compensation data.

### Current Files to Reconcile and Preserve

- `main-api/prisma/schema.prisma` and `main-api/prisma/migrations/20260701210000_projects_aggregate/migration.sql` define the existing period and Corporation-wide open-row index; create a new forward migration and never rewrite the old migration.
- `main-api/src/modules/projects/projects.service.ts` creates initial allocation rows and must only be adapted for creation actor/provenance compatibility.
- `main-api/src/modules/workforce/{workforce.controller.ts,workforce.dto.ts,workforce.service.ts,handlers/workforce.handler.ts}` contains the owning vertical-slice patterns and existing serializable retry helper.
- `main-web-app/src/features/employees/**` owns Employee UI/actions; `main-web-app/src/features/projects/**` owns Project query/detail adaptation. Generated clients remain server-only.

### Latest Technical Notes

- Prisma supports `Serializable` interactive transactions and documents retrying `P2034` write-conflict/deadlock failures; keep the repository's bounded retry wrapper and short transaction discipline. [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- PostgreSQL partial unique indexes enforce uniqueness only for rows matching a predicate, which is exactly the existing `effective_to IS NULL` invariant. Do not replace it with application-only availability checks. [PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- Fastify v5 validates and serializes from JSON Schema; keep database work outside schema validation and mirror Zod/OpenAPI constraints. [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- Server Actions are mutation boundaries and must revalidate input and authorization even when invoked from controlled UI. [Next.js updating data](https://nextjs.org/docs/app/getting-started/updating-data)
- Installed project versions remain authoritative; this story requires no dependency upgrade.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-51-Allocate-an-Employee-With-Effective-Work-Terms]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#43-Workforce-Registry-and-Employment-Lifecycle]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#47-Project-Mobilization-and-Lifecycle]
- [Source: main-api/prisma/schema.prisma#ProjectEmployeeAllocation]
- [Source: main-api/src/modules/projects/projects.service.ts]
- [Source: main-api/src/modules/workforce/workforce.service.ts]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-11: Generated Prisma Client with Node v22.22.3; API typecheck passed.
- 2026-07-11: Reset and migrated the ephemeral PostgreSQL test database successfully, including `20260711232000_project_employee_allocation_audit`.
- 2026-07-11: Regenerated OpenAPI and Kubb output; API and frontend typechecks passed.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- In progress: established allocation audit persistence and the strict Workforce allocation transport contract.

### File List

- main-api/prisma/schema.prisma
- main-api/prisma/migrations/20260711232000_project_employee_allocation_audit/migration.sql
- main-api/src/lib/utils/appError.ts
- main-api/src/modules/projects/projects.service.ts
- main-api/src/modules/workforce/handlers/workforce.handler.ts
- main-api/src/modules/workforce/workforce.controller.ts
- main-api/src/modules/workforce/workforce.dto.ts
- main-api/src/modules/workforce/workforce.dto.test.ts
- main-api/src/modules/workforce/workforce.service.ts
- main-api/artifacts/openapi.json
- main-web-app/src/generated/
