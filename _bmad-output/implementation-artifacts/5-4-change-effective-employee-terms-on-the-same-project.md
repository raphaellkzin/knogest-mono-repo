# Story 5.4: Change Effective Employee Terms on the Same Project

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to change an allocated Employee's effective role, workload, or compensation terms,
so that future operational evidence uses new terms while prior terms remain historically accurate.

## Acceptance Criteria

1. **Given** an Employee has one open allocation on a `PLANNED`, `ACTIVE`, or `PAUSED` Project
   **When** the administrator submits complete replacement terms with a non-blank reason
   **Then** the current period closes and a replacement period opens on the same Project at one server transaction instant
   **And** the prior period remains immutable.

2. **Given** replacement terms are submitted
   **When** validation runs
   **Then** free-text role, workload, compensation mode, compensation value, and overtime rate follow the same complete rules as initial allocation
   **And** decimal values retain normalized BRL two-decimal precision without JavaScript-number conversion.

3. **Given** workload is outside 1 through 1,440 integer minutes, a monetary value is negative or has excessive scale, role is blank, or compensation mode is unsupported
   **When** validation runs
   **Then** the command is rejected with field-addressable details
   **And** the current allocation remains open and unchanged.

4. **Given** submitted normalized terms are identical to the current period
   **When** the change is attempted
   **Then** the API rejects the no-op with stable semantic code `EMPLOYEE_ALLOCATION_TERMS_UNCHANGED`
   **And** no period or audit metadata is created or changed.

5. **Given** one or more normalized terms differ
   **When** the replacement commits
   **Then** all required terms are snapshotted on the new row, including values that did not change
   **And** no field is inherited dynamically from the closed row or current Employment.

6. **Given** the allocation is closed, the Employment/Person is inactive, or the Project is terminal
   **When** a term change is attempted
   **Then** the command returns a stable non-disclosing current-state conflict
   **And** current and historical periods remain unchanged.

7. **Given** a Company job role changes or is deactivated
   **When** allocation terms are replaced
   **Then** the submitted free-text operational role remains the effective snapshot authority
   **And** an optional job-role-period reference may be recorded only as provenance, not as mutable term ownership.

8. **Given** term change races with release, reallocation, termination, or another term change
   **When** the commands execute
   **Then** one valid lifecycle result commits
   **And** no overlapping replacement period, duplicate no-op period, or overwritten closure is produced.

9. **Given** a recoverable validation/current-state conflict reaches the dashboard
   **When** it is rendered
   **Then** all entered replacement terms and reason remain available for correction
   **And** controls map stable field/code details rather than parsing localized messages.

10. **Given** effective-term changes are tested
    **When** real-PostgreSQL integration/concurrency, frontend, and Playwright suites run
    **Then** they cover each mutable term, multiple terms, no-op rejection, precision, invalid current state, races, current detail, and historical preservation
    **And** exactly one allocation period remains open when the Employee stays assigned.

## Tasks / Subtasks

- [ ] Add a complete replacement-terms command to the Workforce contract (AC: 1-9)
  - [ ] Add `POST /api/v1/employee-allocations/:allocationId/terms` with strict body `{ jobRole, expectedDailyWorkloadMinutes, compensationMode, compensationValue, overtimeRate, reason }`.
  - [ ] Reuse Story 5.1's term schemas and Story 5.2's normalized reason schema. Require the complete replacement snapshot; do not implement partial PATCH semantics or accept effective timestamps/scope fields.
  - [ ] Compare normalized values and return `422 EMPLOYEE_ALLOCATION_TERMS_UNCHANGED` for a no-op; document canonical `400/401/403/404/409/422` envelopes with field details safe for the dashboard.
  - [ ] Return `200` with `{ previous, current }` bounded allocation summaries and regenerate OpenAPI/Kubb artifacts without handwritten duplicates.

- [ ] Replace the open period atomically on the same Project (AC: 1-8)
  - [ ] Extend the shared Workforce allocation lifecycle service/handler introduced in Stories 5.1-5.3; do not call the public release/reallocate routes and do not update effective terms in place.
  - [ ] Run one `Serializable` transaction with bounded `P2034` retry and one transaction timestamp. Reread trusted Session/User/selected Company, open allocation, active Person/Employment, and the same non-terminal Project.
  - [ ] Normalize the complete requested snapshot before comparing it to current terms. Compare decimal values by canonical string/decimal value, not JavaScript floating point, and compare role after the same trim/NFC normalization used at creation.
  - [ ] Reject the no-op before any write. Otherwise guard-close the current row with actor/reason and create a new row with a new id, identical Corporation/Company/Project/Employment/Person identity, replacement terms, creator actor, and `effectiveFrom` equal to the source `effectiveTo`.
  - [ ] Preserve all closed-row values/provenance and let the partial unique index plus transaction guarantee exactly one open row. Any conflict must roll back both writes.

- [ ] Add an effective-terms workflow to current Employee detail (AC: 1-9)
  - [ ] Add a server-only terms action using the generated client and validate the complete snapshot plus reason at the Server Action boundary.
  - [ ] Open the form from the current allocation summary, prefill a display copy of current terms, and submit all fields. Reuse Story 5.1 controls and Story 5.2 reason/pending/error patterns.
  - [ ] Keep exact decimal strings in React Hook Form state, preserve all inputs on validation/no-op/current-state errors, focus the first affected control, and expose a readable no-change response.
  - [ ] Close/reset only after confirmed success; revalidate Employee detail/list and the unchanged Project detail. Do not navigate, change Project membership, or alter Employment job role.
  - [ ] Show the new current terms immediately while keeping prior terms out of operational selectors. Full allocation history remains Story 6.8.

- [ ] Prove term history and no-op safety (AC: 1-10)
  - [ ] Unit-test every term rule, full-snapshot requirement, normalization-aware equality, zero money, excessive scale, role normalization, stable code mapping, and no float conversion.
  - [ ] Add real-PostgreSQL tests changing each term separately and together on `PLANNED`, `ACTIVE`, and `PAUSED` Projects; verify same identity, exact boundary instant, actor/reason, immutable prior values, and exactly one open row.
  - [ ] Test blank/invalid input, no-op after normalization, closed allocation, inactive Employment/Person, terminal/foreign Project, and rollback after destination-row failure.
  - [ ] Coordinate term-change-vs-term-change/release/reallocation/termination races with barriers/latches and assert one valid lifecycle outcome with no overwritten closure.
  - [ ] Component-test prefilling, exact decimal preservation, no-op UX, pending guard, field focus, conflict preservation, and success refresh; Playwright-test a successful multi-term replacement and visible current terms.
  - [ ] Run migrations plus full/focused API and frontend checks, OpenAPI/Kubb generation/drift, architecture/lint/typecheck/build checks, and the focused E2E journey.

## Dev Notes

### Developer Context

- Effective terms belong to dated `ProjectEmployeeAllocation` rows. Never mutate `jobRole`, workload, compensation mode/value, or overtime rate on an existing row.
- This command does not move or release the Employee. Corporation, Company, Project, Employment, and Person identities are copied from the authoritative open source row.
- All replacement terms are required even when only one changes. A complete new snapshot prevents future reads from joining mutable Employment fields or inheriting values from a closed row.
- Project `PAUSED` retains allocations and may receive corrected future-effective terms; terminal Projects reject the command.

### Architecture Compliance

- Preserve half-open periods and one transaction instant: old `effectiveTo === new effectiveFrom`. Closed periods and their audit metadata are immutable.
- Use exact decimal strings at API/frontend boundaries and Prisma/PostgreSQL decimal values in persistence. Never use binary floating point for equality or transport normalization.
- The partial unique index remains the final one-open-row guarantee. Serializable retry repeats the entire close/create operation only on retryable database conflicts.
- Actor and current scope come from trusted auth state; reason is validated command input. The API never accepts scheduled/backdated timestamps.
- Keep current and historical handlers/DTOs separate and do not expand this story into Epic 6 history pagination.

### Current Files to Reconcile and Preserve

- Story 5.1's shared term schemas and allocation creator are authoritative; Story 5.2's guarded close/audit helper and Story 5.3's atomic replacement structure should be reused.
- `ProjectEmployeeAllocation` already snapshots all five operational terms and carries optional job-role provenance. No separate terms table or mutable Employment compensation fields are needed.
- `main-web-app/src/features/employees/**` owns the action/form/current view; preserve existing rehire and Company job-role management behavior.
- Project finalization and its initial allocations remain unchanged except for the audit compatibility established in Story 5.1.

### Previous Story Intelligence

- Story 5.3 creates a new destination row from a complete independent term snapshot and uses one instant for source close/destination open. Term replacement uses the same atomic pattern but preserves all allocation identities.
- Story 5.2 makes closing actor/reason immutable and requires compare-and-set closure. A losing term change must never overwrite another lifecycle command.
- Story 5.1 defines free-text operational role and exact monetary validation; Company job-role records are optional provenance, not the effective term authority.

### Latest Technical Notes

- Prisma's interactive `Serializable` transaction and whole-unit `P2034` retry pattern applies to close/create replacement; keep comparison and writes inside a short transaction. [Prisma transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)
- PostgreSQL partial uniqueness permits historical closed rows while enforcing only one `effective_to IS NULL` row for the Person/Corporation. [PostgreSQL partial indexes](https://www.postgresql.org/docs/current/indexes-partial.html)
- Fastify JSON Schema and Zod must agree on strict complete replacement input; business no-op detection belongs in the application transaction, not schema validation. [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- Server Actions must validate input independently and return serializable stable outcomes for field/no-op recovery. [Next.js updating data](https://nextjs.org/docs/app/getting-started/updating-data)
- Installed versions remain authoritative; no dependency upgrade is required.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-54-Change-Effective-Employee-Terms-on-the-Same-Project]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Identifiers-and-Numeric-Types]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#43-Workforce-Registry-and-Employment-Lifecycle]
- [Source: _bmad-output/implementation-artifacts/5-1-allocate-an-employee-with-effective-work-terms.md]
- [Source: _bmad-output/implementation-artifacts/5-2-release-an-employee-from-a-project.md]
- [Source: _bmad-output/implementation-artifacts/5-3-reallocate-an-employee-between-projects.md]
- [Source: main-api/prisma/schema.prisma#ProjectEmployeeAllocation]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List
