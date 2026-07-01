---
baseline_commit: cf110ba7a492ad3b5a2ea525e8c59905e7a7d1e8
---

# Story 2.7: Maintain Admission and Rehire Periods

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to maintain distinct Employment admission and rehire periods,
so that workforce availability changes without rewriting prior employment history.

## Acceptance Criteria

1. **Given** an active Employment with one open Employment Period
   **When** its current state is requested
   **Then** exactly one open period determines active Employment
   **And** every closed period remains immutable.

2. **Given** a previously terminated Employment in the selected Company
   **When** the administrator submits valid rehire data
   **Then** the existing Person and Employment identities are reused
   **And** a new open Employment Period begins at the server transaction instant.

3. **Given** a prior Employment Period is closed
   **When** rehire occurs
   **Then** the prior period is not reopened or edited
   **And** the new period is independently attributable and queryable.

4. **Given** an Employment already has an open period
   **When** rehire is attempted
   **Then** the command is rejected with a stable current-state conflict
   **And** no additional period is created.

5. **Given** two concurrent rehire commands target the same terminated Employment
   **When** they execute
   **Then** database constraints permit at most one new open period
   **And** the losing command receives a safe conflict.

6. **Given** an Employment belongs to another Company or Corporation
   **When** rehire is attempted from the selected workspace
   **Then** the operation fails without revealing foreign existence
   **And** no period changes.

7. **Given** rehire succeeds
   **When** operational selectors and the workforce registry are refreshed
   **Then** the Employee becomes active and available unless another valid condition restricts selection
   **And** historical periods remain visible only through explicit detail history.

8. **Given** admission and rehire are displayed
   **When** the administrator views Employment detail
   **Then** each period shows its admission instant or date, termination data when present, and current or closed state
   **And** closed history is not offered as an editable current record.

9. **Given** period behavior is tested
   **When** PostgreSQL integration and frontend tests run
   **Then** they cover first admission, rehire, duplicate open-period prevention, concurrent rehire, immutable closed periods, current selector behavior, historical detail, and cross-scope protection.
   **And** closed periods are never reopened by test setup.

## Tasks / Subtasks

- [ ] Confirm workforce prerequisites and story boundaries (AC: 1-9)
  - [ ] Build on Story 2.6's `Person`, `Employment`, and first `EmploymentPeriod` foundation; do not create a parallel workforce model.
  - [ ] Keep `Person` Corporation-scoped, `Employment` Company-owned, and `EmploymentPeriod` as the temporal history record for admissions, terminations, and rehires.
  - [ ] Reuse trusted selected Company context from Story 1.4 and Story 2.6; no request body, route parameter, cursor, or browser state may supply scope.
  - [ ] Do not implement Epic 5.5 safe termination workflows here, except to display termination data already present on closed periods.
  - [ ] Do not infer Project allocation, role, current Project, compensation, or technical responsibility from a rehire.

- [ ] Harden Employment Period persistence invariants (AC: 1-6, 9)
  - [ ] Ensure `EmploymentPeriod` uses half-open `[effectiveFrom, effectiveTo)` semantics and `effectiveTo = null` for the single current period.
  - [ ] Preserve closed period immutability through service rules and database-backed protections where practical.
  - [ ] Enforce at most one open Employment Period per scoped Employment using PostgreSQL constraints or partial unique indexes when Prisma cannot express the invariant.
  - [ ] Preserve prior period admission, termination, actor, reason, and timestamps exactly as recorded.
  - [ ] Translate open-period, stale-state, uniqueness, and concurrency constraint failures into stable machine-readable conflict codes.

- [ ] Implement backend rehire and current-state behavior under `/api/v1/employees` (AC: 1-7)
  - [ ] Add a rehire command on the `workforce` module following `controller -> service -> handler -> Prisma`.
  - [ ] Require authenticated Company scope and resolve the target Employment with trusted `{ corporationId, companyId }`.
  - [ ] In one short transaction, verify there is no open period, create a new open Employment Period at the server transaction instant, and return the updated current Employment state.
  - [ ] Use `Serializable` isolation plus bounded retry where needed for concurrent rehire conflicts.
  - [ ] Reject rehire for an Employment that already has an open period with a stable current-state conflict and no persistence changes.
  - [ ] Return the same non-disclosing not-found behavior for absent, foreign-Company, and foreign-Corporation Employments.
  - [ ] Keep current-state queries separate from explicit historical detail queries.

- [ ] Update workforce registry, selectors, and detail history (AC: 1, 7-8)
  - [ ] Refresh/revalidate affected employee registry and operational selector data after a successful rehire.
  - [ ] Make rehired Employees active and available unless another valid condition, such as a future allocation invariant, restricts selection.
  - [ ] Display Employment Periods in deterministic order with admission instant or date, termination data when present, and current or closed state.
  - [ ] Do not expose closed periods as editable current records or operational selector options.
  - [ ] Preserve CPF masking and protected disclosure rules inherited from Story 2.6 and Story 2.2.

- [ ] Prove temporal integrity, concurrency, scope isolation, and UI states (AC: 1-9)
  - [ ] Unit-test command DTO validation, current-state predicates, conflict mapping, period view-model mapping, and closed-period immutability guards.
  - [ ] PostgreSQL-test first admission from Story 2.6, successful rehire, duplicate open-period prevention, concurrent rehire, immutable closed periods, rollback, and scoped non-disclosure.
  - [ ] Contract-test route schemas, stable success/error envelopes, generated OpenAPI, and generated Kubb usage.
  - [ ] Frontend-test detail history rendering, current/closed state labels, form pending state, success recovery, current-state conflict recovery, and stale/foreign target recovery.
  - [ ] Playwright-test login/select Company, register or fixture an Employee, rehire a terminated Employment, verify registry/selector refresh, verify detail history, and verify workspace-switch isolation.
  - [ ] Run typecheck, lint/architecture checks, unit tests, integration tests, OpenAPI generation/drift check, Kubb generation/drift check, build, and relevant Playwright tests.

## Dev Notes

### Developer Context

- Story 2.7 continues the Workforce temporal model started by Story 2.6. Story 2.6 creates the first open Employment Period; this story adds the guardrails and command behavior for later admission/rehire periods.
- The product requirement is history preservation: rehire never creates a new Person or Employment and never edits a closed period.
- Workforce remains separate from Commercial, Fleet, and Projects. Future Project allocation and safe termination stories may consume this current-state model, but they should not be implemented here.
- Current backend source inspected during Story 2.6 creation contained Organization/Auth/User foundations and no committed `workforce` module. If Story 2.6 has since implemented it, extend that module instead of creating another one.

### Technical Requirements

- `Person` is Corporation-scoped by protected CPF identity; `Employment` is Company-owned; `EmploymentPeriod` carries admission, termination, current/closed state, actor/reason fields where required, and temporal boundaries.
- Rehire targets an existing terminated Employment in the selected Company and creates one new open Employment Period using the server transaction instant.
- An Employment is active when exactly one Employment Period is open. Closed periods remain immutable and queryable only through explicit history/detail flows.
- Periods use half-open interval semantics `[effectiveFrom, effectiveTo)`, with `effectiveTo = null` for the single open current period.
- Database constraints are the final guarantee for single-open-period and concurrent rehire behavior; service validation exists to produce clear domain errors before constraints fire.
- Rehire accepts only domain input required by the contract. It must reject or ignore scope, Person id, Employment Period id, lifecycle/audit fields, CPF protection fields, allocation data, role, current Project, or availability supplied by the caller.
- Successful rehire affects operational availability only through current Employment state. Do not invent allocation, responsibility, compensation, or Project state.

### Architecture Compliance

- Backend dependencies follow `controller -> service -> handler -> Prisma`; handlers alone access persistence.
- Critical state changes run in transactions; concurrent commands use isolation/locking appropriate to the invariant and translate database conflicts into stable application errors.
- Foreign-scope and absent Employment identifiers share the same non-disclosing not-found response.
- Current-state and historical-state access use separate named handlers/queries. Closed periods never become operational selectors.
- Fastify route schemas remain the OpenAPI authority; generated Kubb artifacts are regenerated by scripts and never manually edited.
- Frontend dependencies follow `page -> feature -> server action/query -> adapter/view model -> generated Kubb client`.
- Generated clients and credentials stay server-only; Client Components receive view models and local interaction state only.
- CPF plaintext never appears in URLs, cursors, logs, tokens, telemetry, request correlation, unrestricted error details, durable browser state, or snapshots.

### Current Files to Reconcile and Preserve

- Expected backend surfaces include `main-api/src/modules/workforce/**`, `main-api/src/routes/v1-routes.ts`, `main-api/prisma/schema.prisma`, forward migrations, pagination helpers, sensitive-document utilities, Swagger/OpenAPI schemas, and integration tests.
- Expected frontend surfaces include `main-web-app/src/features/employees/**`, route/page wiring, server-only API adapter code, generated Kubb artifacts, and E2E tests.
- Preserve Story 2.6's public `/api/v1/employees` registry contract while adding rehire/current-state behavior under the same Workforce boundary.
- Do not manually edit generated Prisma or Kubb output; regenerate through configured scripts and keep drift checks meaningful.

### Testing Requirements

- PostgreSQL integration is mandatory for single-open-period enforcement, concurrent rehire, closed-period immutability, scoped non-disclosure, transaction rollback, and tenant isolation.
- Playwright coverage is mandatory because the story changes visible detail/history state and registry/selector refresh behavior.
- Contract tests must use generated OpenAPI/Kubb artifacts end to end; do not handwrite duplicate transport types.
- Test setup must never reopen closed Employment Periods as a shortcut. Use first admission from Story 2.6 plus explicit closed-period fixtures or supported termination data.
- Sanitization tests must keep CPF plaintext out of logs, errors, cursors, URLs, snapshots, and generated table/detail view models.

### Previous Story Intelligence

- Story 2.6 established Corporation-scoped Person identity, Company-owned Employment, the first open Employment Period, CPF protection reuse, active uniqueness, registration-number uniqueness, availability without allocation, workforce registry pagination, OpenAPI/Kubb generation, frontend adapters, UI states, and tenant-isolation tests.
- Story 2.6 explicitly reserved termination, rehire, and multiple admission/rehire period behavior for Story 2.7.
- Story 2.5 established current-state versus historical-state separation. Closed Employment Periods must remain visible through explicit detail/history but unavailable for operational selection.
- Story 2.3 established persisted registry, cursor pagination, OpenAPI/Kubb, and frontend adapter patterns for Company registries.
- Story 2.2 provides CPF/CNPJ document protection. Reuse shared protection services; do not implement Workforce-local crypto.
- Story 2.1 blocks real CPF/CNPJ entry until approval evidence exists and requires synthetic test data.

### Git Intelligence Summary

- Recent commits include Epic 1 implementation and canonical pagination documentation.
- Story 2.6 is now generated and marked `ready-for-dev`; use it as the immediate implementation guide for Workforce foundations.
- Existing sprint/story artifacts are user/workflow state and must be preserved.

### Latest Technical Information

- Prisma transactions should keep rehire changes short; PostgreSQL supports `Serializable`, and Prisma recommends `Serializable` plus retrying `P2034` for write conflicts or deadlocks in concurrent transaction scenarios. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Fastify route schemas remain the source for validation, serialization, and generated OpenAPI contracts. [Source: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]
- Next.js Server Actions provide the server-only mutation path for rehire interactions; generated API clients and credentials stay outside Client Components. [Source: https://nextjs.org/docs/app/api-reference/directives/use-server]
- Next.js `cookies` is a server API; authenticated server calls keep credential access inside server boundaries. [Source: https://nextjs.org/docs/app/api-reference/functions/cookies]

### Project Structure Notes

- Backend module name remains `workforce`; frontend feature name remains `employees`.
- Public API should stay under `/api/v1/employees` for operational Employee registry behavior while preserving internal Person/Employment/Period separation.
- Keep Employee period components, actions, queries, adapters, and schemas inside `features/employees` unless a helper is demonstrably reusable.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-27-Maintain-Admission-and-Rehire-Periods]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-26-Register-Persons-and-Company-Employments]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Consistency-and-Transactions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-10-Maintain-Employment-Periods]
- [Source: _bmad-output/implementation-artifacts/2-6-register-persons-and-company-employments.md]
- [Source: _bmad-output/implementation-artifacts/2-5-remove-clients-and-fuel-suppliers-from-operational-use.md]
- [Source: _bmad-output/implementation-artifacts/2-2-protect-cpf-and-cnpj-technically.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Employment Period current-state semantics, immutable closed periods, rehire identity reuse, open-period database enforcement, concurrency conflicts, scoped non-disclosure, registry/selector refresh, detail history, frontend adapters, generated contracts, and temporal integrity tests were reconciled.

### File List
