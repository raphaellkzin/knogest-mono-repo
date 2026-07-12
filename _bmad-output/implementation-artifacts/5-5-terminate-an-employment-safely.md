# Story 5.5: Terminate an Employment Safely

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to terminate an Employment when operational responsibilities permit it,
so that unavailable workers leave current operations while their complete history remains trustworthy.

## Acceptance Criteria

1. **Given** an active Employment with no protected Project responsibility, **when** the administrator confirms immediate termination with a non-blank reason, **then** the open Employment Period closes at one server transaction instant and trusted `actorUserId` and the reason are recorded.
2. **Given** the Employee has one open operational Project Allocation, **when** termination is otherwise valid, **then** that allocation closes atomically at the same instant and all effective terms and historical references remain attached to the closed period.
3. **Given** the Employee is current Manager of a non-terminal Project, **when** termination is attempted, **then** the command returns a stable scoped conflict identifying the relationship and corrective action, without changing any period.
4. **Given** the Employment holds a current Technical Responsibility whose closure would leave a non-terminal Project without one, **when** termination is attempted, **then** the command is rejected and nothing is closed.
5. **Given** every affected non-terminal Project retains another current Technical Responsibility, **when** termination succeeds, **then** all responsibilities held through the Employment close atomically with the Employment and allocation.
6. **Given** the Employment is already terminated, **when** termination is requested again, **then** a stable current-state conflict is returned and the original actor, reason, and closed periods remain immutable.
7. **Given** concurrent termination, allocation, reallocation, or responsibility commands target the Employee, **when** they execute, **then** exactly one valid lifecycle result commits and no open allocation survives a successful termination.
8. **Given** termination succeeds, **when** current registries and selectors refresh, **then** the Employee is unavailable for new responsibilities and allocations while authorized Person, Employment, period, responsibility, and allocation history stays inspectable.
9. **Given** validation or responsibility conflicts occur in the dashboard, **when** the response is rendered, **then** valid reason input is preserved and behavior branches only on stable codes and structured details.
10. **Given** the feature is tested, **when** unit, real-PostgreSQL integration, concurrency, frontend, and Playwright suites run, **then** they cover unallocated termination, allocation closure, Manager blocking, last-responsibility blocking, already-terminated state, rollback, selector exclusion, history, and tenant isolation.

## Tasks / Subtasks

- [ ] Define the auditable termination contract and persistence migration (AC: 1-6)
  - [ ] Add `POST /api/v1/employees/:employmentId/terminate` with `{ reason: string }`, authenticated Company scope, canonical success/error envelopes, and current Employee detail response.
  - [ ] Persist trusted closing actor and reason for Employment, allocation, and responsibility closures where the current models cannot represent them; backfill nullable audit fields only and never invent historical actors.
  - [ ] Keep closed periods immutable and use `[effectiveFrom, effectiveTo)` semantics with one transaction timestamp.
- [ ] Implement one Workforce-owned serializable lifecycle command (AC: 1-7)
  - [ ] Reread Session/Company/User authorization, active Employment, open Employment Period, open allocation, Manager tenures, and Technical Responsibilities inside the transaction.
  - [ ] Reject current Manager relationships and preflight the last-current-responsibility invariant for every affected non-terminal Project.
  - [ ] Close eligible responsibility, allocation, job-role, and Employment periods and set terminal Employment state atomically, using bounded retry for Prisma `P2034` conflicts.
  - [ ] Translate missing/foreign resources and constraint races into stable, non-enumerating application codes with structured in-scope blockers.
- [ ] Add the termination workflow to Employee detail (AC: 8-9)
  - [ ] Use the generated Kubb client through the existing server action/adapter boundary; do not duplicate transport types.
  - [ ] Require proportional confirmation and a non-blank reason, preserve recoverable form state, show corrective actions, and refresh current data only after backend success.
- [ ] Prove lifecycle, history, and isolation invariants (AC: 1-10)
  - [ ] Add DTO/service tests and real-PostgreSQL transaction tests for every blocker and successful closure shape.
  - [ ] Coordinate concurrency tests with barriers/latches rather than sleeps and assert complete rollback and no surviving open allocation.
  - [ ] Add frontend component/action and Playwright coverage for confirmation, stable-code errors, successful selector removal, and historical detail.
  - [ ] Regenerate OpenAPI and Kubb artifacts through repository scripts and verify generation drift, type checks, tests, and builds.

## Dev Notes

### Developer Context

- Workforce owns Employment termination and operational Employee allocation lifecycle. Projects remains the owner of Project Manager and Technical Responsibility records, so the Workforce command may coordinate their closure but must not duplicate Project rules.
- Story 5.1–5.4 establish `ProjectEmployeeAllocation` as an immutable effective-term period and the Corporation/Person partial unique index as the final exclusivity guarantee.
- The current `EmploymentPeriod.terminationReason` can retain the reason, but trusted actor metadata and closure audit for related periods require a forward migration.

### Architecture Compliance

- Derive Corporation, source Company, and actor from authenticated server state; `employmentId` is an untrusted target only.
- Use a serializable transaction with one captured server instant and bounded serialization retry. Database constraints remain the final guard against races.
- Never expose foreign Project names or IDs. Structured blocker details may include only relationships authorized in the selected workspace.
- Preserve canonical Fastify/OpenAPI ownership, generated Kubb clients, decimal strings, stable codes, and `Component -> Server Action -> adapter -> generated client -> API` flow.

### Current Files to Reconcile and Preserve

- Extend `main-api/src/modules/workforce/{workforce.controller.ts,workforce.dto.ts,workforce.service.ts}` and its handler patterns rather than creating a second Workforce module.
- Reuse current Project temporal models and `ProjectEmployeeAllocation` in `main-api/prisma/schema.prisma`.
- Extend `main-web-app/src/features/employees` detail, action, and server adapter boundaries; never edit `src/generated` manually.

### Previous Story Intelligence

- Reuse the audit columns and closure semantics specified by Stories 5.1–5.4 rather than creating termination-specific alternatives.
- A successful termination must serialize against all four earlier allocation commands; stale preflight checks outside the transaction are insufficient.

### Latest Technical Notes

- Use repository-pinned Fastify `^5.8.5`, Prisma `^7.8.0`, Zod `^4.4.3`, Next.js `16.2.9`, Kubb `4.38.1`, Vitest, and Playwright versions. Do not upgrade dependencies in this story.
- Follow Prisma interactive transaction guidance for `Serializable` isolation and PostgreSQL partial indexes for open-period uniqueness.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-55-Terminate-an-Employment-Safely]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Tenant-and-Ownership-Isolation]
- [Source: _bmad-output/implementation-artifacts/5-4-change-effective-employee-terms-on-the-same-project.md]
- [Source: main-api/prisma/schema.prisma#EmploymentPeriod]
- [Source: main-api/prisma/schema.prisma#ProjectTechnicalResponsibility]
- [Source: main-api/src/modules/workforce/workforce.service.ts]
- [Prisma transactions: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Story context created and validated for development readiness.

### File List

