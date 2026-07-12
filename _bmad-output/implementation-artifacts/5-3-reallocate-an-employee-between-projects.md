# Story 5.3: Reallocate an Employee Between Projects

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to move an operationally allocated Employee to another eligible Project,
so that source and destination participation change atomically without an overlap.

## Acceptance Criteria

1. **Given** an Employee has one open operational allocation and an eligible destination Project in the same Company
   **When** the administrator confirms reallocation with destination role, workload, compensation terms, and a non-blank reason
   **Then** the source period closes and a destination period opens atomically at one server transaction instant
   **And** no committed gap or overlap exists.

2. **Given** an eligible destination Project belongs to another Company in the same Corporation where the Person has an active Employment
   **When** the command explicitly supplies `destinationCompanyId` and `destinationProjectId`
   **Then** Corporation-wide Person exclusivity remains enforced
   **And** both identifiers are command targets validated against the authenticated Corporation, never trusted request scope.

3. **Given** `destinationCompanyId` belongs to another Corporation, is inactive, or does not own `destinationProjectId`
   **When** reallocation is attempted
   **Then** the command is rejected without revealing foreign existence
   **And** the source allocation remains open and unchanged.

4. **Given** the destination Company has no active Employment for the source Person
   **When** reallocation is attempted
   **Then** the command returns a stable destination-eligibility conflict
   **And** the source allocation remains open.

5. **Given** the Employee previously worked on the destination Project
   **When** the Employee returns
   **Then** a new allocation period with a new id is created
   **And** prior closed periods are not reopened, edited, or reused.

6. **Given** destination terms differ from the source
   **When** reallocation commits
   **Then** the destination row snapshots its own free-text role, workload, compensation mode, compensation value, and overtime rate
   **And** all source terms remain attached to the closed source period.

7. **Given** destination terms are validated
   **When** workload or compensation is submitted
   **Then** the same inclusive workload, compensation-mode, normalized two-decimal, zero-value, and no-silent-rounding rules from initial allocation apply
   **And** no source field is used as an implicit default at the API boundary.

8. **Given** the source allocation is closed, destination Project is terminal, source Person/Employment is inactive, or destination Employment changes before commit
   **When** reallocation is attempted
   **Then** a stable current-state conflict is returned
   **And** neither source nor destination period is partially changed.

9. **Given** concurrent release, reallocation, termination, term replacement, or competing allocation commands target the same Person
   **When** they execute
   **Then** one valid lifecycle outcome commits
   **And** the Corporation never has two open operational allocations for that Person.

10. **Given** a recoverable reallocation conflict reaches the dashboard
    **When** it is rendered
    **Then** valid destination Company/Project, terms, and reason remain available for correction
    **And** UI behavior maps stable codes and authorized details rather than message text.

11. **Given** Employee reallocation is tested
    **When** real-PostgreSQL transaction/concurrency, frontend, and Playwright suites run
    **Then** they cover same-Company move, eligible cross-Company move, missing destination Employment, return to a prior Project, independent destination terms, rollback, races, and historical preservation
    **And** no successful movement creates an overlap or reopens a closed period.

## Tasks / Subtasks

- [ ] Define one atomic reallocation command in the Workforce contract (AC: 1-10)
  - [ ] Add `POST /api/v1/employee-allocations/:allocationId/reallocate` with strict body `{ destinationCompanyId, destinationProjectId, jobRole, expectedDailyWorkloadMinutes, compensationMode, compensationValue, overtimeRate, reason }`.
  - [ ] Require UUID destination ids, normalized non-blank role/reason, workload 1-1,440, allowlisted compensation mode, and exact non-negative two-decimal strings. Reject unknown properties, timestamps, Person/Employment ids, and trusted scope fields.
  - [ ] Return `200` with `{ source, destination }` closed/current allocation summaries. Document canonical `400/401/403/404/409` envelopes and stable codes including `EMPLOYEE_REALLOCATION_CURRENT_STATE_CONFLICT`, `EMPLOYEE_REALLOCATION_DESTINATION_UNAVAILABLE`, and `EMPLOYEE_REALLOCATION_DESTINATION_EMPLOYMENT_REQUIRED`.
  - [ ] Regenerate OpenAPI/Kubb artifacts and consume only the generated server client from the dashboard.

- [ ] Resolve destination identity and move the allocation in one transaction (AC: 1-9)
  - [ ] Extend the Story 5.1 Workforce allocation service/handler; do not compose the public release and allocate HTTP endpoints and do not split the move across Server Actions.
  - [ ] Run one `Serializable` transaction with bounded `P2034` retry and one transaction timestamp. Reread trusted Session/User/source selected Company, the open source allocation, active source Person/Employment, destination Company, destination Project, and active destination Employment for the same Person.
  - [ ] Require destination Company to be active in the authenticated Corporation and destination Project to belong to it with status `PLANNED` or `ACTIVE`. Treat target ids as untrusted command data and collapse foreign/absent cases to non-disclosing outcomes.
  - [ ] For same-Company movement, reuse the active source Employment only if still eligible. For cross-Company movement, resolve exactly one active destination Employment by `corporationId + destinationCompanyId + personId`; never carry the source `employmentId` across Companies.
  - [ ] Guard-close the source row with the shared transaction instant, actor, and reason, then create the destination row with a new id, destination Company/Project/Employment, same Person, actor, and independently validated terms before commit.
  - [ ] Let the existing partial unique index validate the final open-row state. Translate all eligibility, unique, and serialization failures while guaranteeing rollback leaves the source open.

- [ ] Provide a scope-safe reallocation workflow in the dashboard (AC: 2-10)
  - [ ] Add a server-only query that lists only destination Companies accessible inside the authenticated Corporation and eligible Projects for the chosen destination Company; never place destination Company into Session scope as a side effect of selection.
  - [ ] Resolve/display the active destination Employment for the source Person without exposing a foreign Person or sibling-Company data beyond authorized Company targets.
  - [ ] Add an Employee-detail reallocation modal that requires destination, complete new terms, and reason. Reuse Story 5.1 decimal/term controls and Story 5.2 confirmation/error patterns.
  - [ ] Preserve every valid field on recoverable conflicts, focus the affected control, disable concurrent submission, and clear only after confirmed success.
  - [ ] Revalidate Employee detail/list plus source and destination Project details. If destination Company differs from selected Company, remain in the current workspace and show a safe success summary rather than navigating across scope implicitly.

- [ ] Prove atomic movement and cross-Company isolation (AC: 1-11)
  - [ ] Unit-test strict DTO validation, independent destination terms, reason normalization, stable-code mapping, and cross-Company target handling.
  - [ ] Add real-PostgreSQL tests for same-Company movement, eligible cross-Company movement, absent/terminated destination Employment, inactive/foreign/mismatched destination, prior destination history, source/destination term independence, and full rollback.
  - [ ] Coordinate competing reallocation/release/termination/allocation/term-change transactions with barriers/latches. Assert exactly one open row in the Corporation and identical source close/destination start instants on success.
  - [ ] Add negative tenant tests proving another Corporation neither blocks the move nor becomes linkable, and that foreign identifiers do not change response disclosure.
  - [ ] Component-test dependent destination choices, preserved terms/reason, pending protection, conflict focus, and cross-Company success; Playwright-test same-Company and authorized cross-Company journeys.
  - [ ] Run migrations, API/frontend validation, integration/concurrency suites, OpenAPI/Kubb drift, architecture/lint/typecheck/build checks, and focused E2E tests.

## Dev Notes

### Developer Context

- Reallocation is one command and one transaction. Calling Story 5.2 release followed by Story 5.1 allocation is forbidden because the release could commit while destination creation fails.
- The selected Company remains source request scope. `destinationCompanyId` is an explicit target authorized against the same Corporation under AR58; choosing it must not rotate Session Company or grant access.
- A Person may have separate Employments in sibling Companies. Cross-Company movement changes `companyId` and `employmentId` on the new allocation while preserving `corporationId` and `personId`.
- Returning to a Project always creates a new period. Closed rows are immutable evidence and may be referenced by future RDO/cost records.

### Architecture Compliance

- Workforce owns the use case and composes scoped Project/Company reads inside its transaction. Cross-domain access must use an explicit public port when the current module boundary requires it; do not import private Projects handlers.
- Use one database timestamp for the half-open boundary so source `effectiveTo` equals destination `effectiveFrom`.
- The Corporation-wide partial unique index permits the transaction's close-then-open sequence but still rejects any final overlapping open row.
- `destinationCompanyId` and `destinationProjectId` are validated targets, not auth context. Corporation/User/Session/actor remain trusted only.
- Keep current and historical DTOs separate; movement responses may include the two affected rows but must not expose an unbounded allocation history.

### Current Files to Reconcile and Preserve

- Story 5.1's Workforce allocation vertical slice owns creation and term validation; Story 5.2's guarded close helper owns closure semantics. Extract transaction-context helpers that both lifecycle commands can reuse without calling one public service from another.
- `main-api/src/modules/projects/projects.service.ts` remains responsible only for aggregate initial allocations; do not add post-creation movement there.
- `main-web-app/src/features/employees/**` owns the workflow and form state. `main-web-app/src/features/projects/**` supplies safe current Project targets/details through server-only adapters.
- Preserve existing Company-selection invalidation and server-only generated-client boundaries.

### Previous Story Intelligence

- Story 5.2 established compare-and-set closure with immutable `effectiveTo`, closing actor, and reason. Reallocation must use the same close semantics inside a larger transaction.
- Story 5.1 requires full destination terms rather than inheriting mutable Employment fields. Its free-text job role remains independent from the Company job-role catalog.
- Current availability is derived from the open period and partial unique index; no reservation cache or availability column is permitted.

### Latest Technical Notes

- Prisma interactive transactions support `Serializable`; retry the whole source-close/destination-create unit only for `P2034`, never retry a committed sub-operation independently. [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- PostgreSQL partial uniqueness applies to the single destination row whose `effective_to IS NULL`; closed source and historical rows remain unconstrained by the open-row predicate. [PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- Validate JSON shape synchronously at Fastify's schema boundary and perform destination ownership/Employment reads inside the transaction. [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- Installed versions remain authoritative; no package upgrade or new workflow library is required.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-53-Reallocate-an-Employee-Between-Projects]
- [Source: _bmad-output/planning-artifacts/architecture.md#Tenant-and-Ownership-Isolation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#43-Workforce-Registry-and-Employment-Lifecycle]
- [Source: _bmad-output/implementation-artifacts/5-1-allocate-an-employee-with-effective-work-terms.md]
- [Source: _bmad-output/implementation-artifacts/5-2-release-an-employee-from-a-project.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List
