# Story 5.2: Release an Employee From a Project

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to release an operationally allocated Employee with immediate effect,
so that the Employee becomes available while prior participation remains true.

## Acceptance Criteria

1. **Given** an Employee has one open operational allocation in the selected Company
   **When** the administrator releases the Employee with a non-blank reason
   **Then** the current allocation period closes at the server transaction instant
   **And** trusted actor and normalized reason are recorded on the closure.

2. **Given** the source Project is `PLANNED`, `ACTIVE`, or `PAUSED`
   **When** release is confirmed
   **Then** the open allocation may close without changing Project lifecycle state
   **And** paused operation does not prevent an explicit release.

3. **Given** release succeeds
   **When** current availability is queried
   **Then** the Person becomes available for another eligible Project in the Corporation
   **And** the closed allocation and all snapshotted terms remain immutable and historically inspectable.

4. **Given** the allocation is already closed, belongs outside selected scope, the source Project is terminal, or the Employment/Person is no longer active
   **When** release is attempted
   **Then** the command returns a stable non-disclosing current-state conflict or not-found response
   **And** no period or audit field is changed.

5. **Given** release races with reallocation, Employment termination, term replacement, or another allocation command
   **When** the commands execute
   **Then** one valid lifecycle outcome commits at one transaction boundary
   **And** no successful release leaves an overlapping open period or overwrites another command's closure metadata.

6. **Given** the same release request is submitted twice
   **When** the second command observes the already-closed period
   **Then** it returns the documented current-state conflict
   **And** the original `effectiveTo`, closing actor, and reason remain unchanged.

7. **Given** Employee release is shown in the dashboard
   **When** validation or a recoverable current-state conflict occurs
   **Then** the entered reason remains available for correction/retry
   **And** behavior maps stable codes rather than parsing response messages.

8. **Given** Employee release is tested
   **When** real-PostgreSQL transaction/concurrency, frontend, and Playwright suites run
   **Then** they cover successful release, every eligible Project state, already-closed state, termination/reallocation races, availability, actor/reason, selected-scope isolation, and historical preservation
   **And** the Corporation retains at most one open allocation for the Person.

## Tasks / Subtasks

- [ ] Extend the generated Workforce contract with an immediate release command (AC: 1-7)
  - [ ] Add `POST /api/v1/employee-allocations/:allocationId/release` with strict body `{ reason }`; `allocationId` is a UUID command target, while Corporation, Company, Person, actor, and effective time remain trusted server state.
  - [ ] Normalize the reason with trim/NFC, require 1-500 characters, reject control characters and unknown properties, and expose matching Zod plus Fastify JSON Schema.
  - [ ] Return `200` with the closed allocation summary and canonical errors for `400/401/403/404/409`. Define stable codes including `EMPLOYEE_ALLOCATION_CURRENT_STATE_CONFLICT` and the ordinary non-disclosing `NOT_FOUND` behavior.
  - [ ] Regenerate OpenAPI and Kubb models/Zod/server clients. Do not widen shared `ApiClientError`, handwrite transport DTOs, or edit generated output.

- [ ] Close the allocation atomically and preserve immutable history (AC: 1-6)
  - [ ] Reuse the Workforce-owned allocation service and handler introduced by Story 5.1; do not implement release in a Project controller or as a direct Prisma call from a service.
  - [ ] Execute in `Serializable` with bounded `P2034` retry. Reread the trusted Session/User/selected Company, source allocation with `effectiveTo: null`, active Employment/Person, and non-terminal source Project inside the transaction.
  - [ ] Use one database transaction timestamp for `effectiveTo`; write `endedByUserId` and the normalized reason in the same guarded update.
  - [ ] Update with an open-row predicate or equivalent compare-and-set and require exactly one changed row so a concurrent closer cannot be overwritten.
  - [ ] Translate missing/foreign scope without disclosure and already-closed/ineligible current state into stable outcomes. Never reopen, delete, or edit the allocation's effective terms.

- [ ] Refresh current views without turning history into a selector (AC: 3-7)
  - [ ] Add a server-only release action under the Employees feature using the generated client; validate `allocationId` and reason again at the Server Action boundary.
  - [ ] Add a proportional confirmation flow from the Employee's current allocation view, showing Project identity and explaining immediate availability. Reuse the approved operational modal components and Portuguese copy.
  - [ ] Preserve reason and accessible focus on validation/conflict, disable duplicate submission while pending, and close/reset only after confirmed success.
  - [ ] Revalidate Employee detail/list and source Project detail after success. Current availability must include only open rows; closed rows may appear only in bounded current-detail context until Story 6.8 adds full history.
  - [ ] Do not silently release allocations when a Project is paused or a date passes; this explicit command is the only release behavior in scope.

- [ ] Prove closure, audit, and race behavior (AC: 1-8)
  - [ ] Unit-test strict reason validation, UUID params, stable error mapping, and refusal to parse localized messages.
  - [ ] Add real-PostgreSQL tests for release from `PLANNED`, `ACTIVE`, and `PAUSED`; already-closed, terminal, inactive, sibling-Company, and foreign-Corporation states; actor/reason persistence; and unchanged historical terms.
  - [ ] Use deterministic barriers/latches for release-vs-release, release-vs-reallocation, release-vs-termination, and release-vs-new-allocation races. Assert one valid winner and no audit overwrite.
  - [ ] Component-test confirmation, pending state, reason preservation, error focus, and post-success availability; Playwright-test an explicit release and subsequent allocation eligibility.
  - [ ] Run focused/full API and frontend checks, migration checks, OpenAPI/Kubb generation and drift checks, production builds, and the relevant Playwright journey.

## Dev Notes

### Developer Context

- Story 5.1 establishes the shared allocation command, audit-capable period shape, Workforce ownership, current view models, and serializable retry pattern. Extend those exact symbols instead of adding a release-specific persistence abstraction.
- Release closes a half-open period; it does not delete a relationship, change Employment state, change Project status, or create a replacement allocation.
- Story 5.3 owns atomic source-to-destination movement. Do not implement reallocation as client-side `release` followed by `allocate`, because that would create a gap and partial-success path.
- Story 5.5 will close an allocation as part of Employment termination. Keep closure helpers transaction-context compatible, but do not implement termination here.

### Architecture Compliance

- The service owns transaction and lifecycle decisions; handlers own guarded persistence. Controller schemas describe transport only.
- Preserve `[effectiveFrom, effectiveTo)` semantics and immutable closed periods. The server transaction instant is authoritative and no scheduling/backdating field exists.
- Use the partial unique index and transactional current-state predicates together. An availability precheck alone is never a concurrency guarantee.
- Actor comes from trusted auth context; the reason comes from validated command input. Neither may be inferred from UI copy or logs.
- Current queries filter `effectiveTo: null`; historical reads must be separately named and must never feed operational selectors.

### Current Files to Reconcile and Preserve

- Story 5.1's Workforce allocation DTO/controller/service/handler additions and migration are the primary extension points.
- `main-api/src/modules/workforce/workforce.service.ts` already contains bounded serializable retry behavior; consolidate reuse rather than copying another loop.
- `main-web-app/src/features/employees/components/employee-detail-page.tsx` is the authorized current Employee surface; preserve existing Employment and job-role actions.
- `main-web-app/src/features/projects/components/project-detail.tsx` remains a current Project view. Add only the source allocation refresh/summary needed by this workflow.

### Previous Story Intelligence

- Story 5.1 requires free-text effective role and exact compensation strings, snapshots all terms, and derives `personId`, scope, actor, and time server-side.
- The Corporation-wide partial unique index remains the final open-allocation guard. Closing the source row makes the Person available; no separate availability column should be added.
- Story 5.1 reserves `endedByUserId` and closing reason metadata for lifecycle commands. This story makes those fields authoritative and immutable once set.

### Latest Technical Notes

- Keep the transaction short and retry only Prisma `P2034` serializable conflicts; business conflicts are stable outcomes, not retry triggers. [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- The existing PostgreSQL partial unique index stops applying when `effective_to` becomes non-null, making availability a direct consequence of closing the period. [PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- Fastify request validation must remain schema-based and database eligibility must execute after validation in the application transaction. [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- Installed versions remain authoritative; no dependency upgrade is part of this story.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-52-Release-an-Employee-From-a-Project]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Current-and-Historical-Queries]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#47-Project-Mobilization-and-Lifecycle]
- [Source: _bmad-output/implementation-artifacts/5-1-allocate-an-employee-with-effective-work-terms.md]
- [Source: main-api/prisma/schema.prisma#ProjectEmployeeAllocation]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List
