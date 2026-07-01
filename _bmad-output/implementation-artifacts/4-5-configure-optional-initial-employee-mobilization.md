---
baseline_commit: 9e243e12f17379cc0db8ccc69aa4dacb715d16e6
---

# Story 4.5: Configure Optional Initial Employee Mobilization

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to optionally select Employees and their initial work terms during Project creation,
so that the Project can reserve eligible workers without making Employee mobilization mandatory.

## Acceptance Criteria

1. **Given** the administrator reaches Employee mobilization
   **When** no Employee is selected
   **Then** the wizard remains valid
   **And** Project creation is not blocked.

2. **Given** Employee candidates are requested
   **When** the selector loads
   **Then** it returns active Employments from the selected Company that are eligible for a new open operational allocation
   **And** it excludes a Person already operationally allocated anywhere in the Corporation.

3. **Given** an Employee is selected for initial allocation
   **When** allocation terms are entered
   **Then** free-text job role, expected daily workload from 1 through 1,440 integer minutes, compensation mode, non-negative BRL compensation value, and non-negative BRL overtime rate are required
   **And** compensation mode is limited to daily, hourly, weekly, fortnightly, or monthly.

4. **Given** compensation or overtime values are submitted
   **When** validation runs
   **Then** `"0.00"` is accepted and scale beyond two decimal places is rejected
   **And** values are never silently rounded.

5. **Given** a selected Employee becomes unavailable, terminated, inactive, or foreign before final submission
   **When** final backend validation runs
   **Then** the conflict identifies the affected Employee and Employee mobilization subsection
   **And** unrelated valid wizard values remain available.

6. **Given** the Employee selector uses search or pagination
   **When** more results are requested
   **Then** it follows canonical cursor semantics and trusted scope
   **And** Company changes invalidate every loaded Employee and selection.

7. **Given** Employee mobilization is tested
   **When** frontend, contract, and PostgreSQL integration tests run
   **Then** they cover an empty selection, required terms, compensation modes, Corporation-wide Person exclusivity, pagination, stale eligibility, and conflict mapping
   **And** Employee mobilization remains optional.

## Tasks / Subtasks

- [ ] Add optional Employee mobilization to the existing local Project command (AC: 1, 3-5, 7)
  - [ ] Extend the Project wizard and normalized aggregate model established by Stories 4.1-4.4; do not create a parallel form or put allocation behavior in generic modal components.
  - [ ] Represent the section as `initialEmployeeAllocations`, an ordered collection of zero through 200 entries. Two hundred is valid; 201 is rejected before submission.
  - [ ] Use `{ employmentId, jobRole, expectedDailyWorkloadMinutes, compensationMode, compensationValue, overtimeRate }` for each entry.
  - [ ] Require unique `employmentId` values inside the collection. Use the Employment id, not the Person id, while preserving Person-level exclusivity as a backend invariant.
  - [ ] Keep selector labels and masked display metadata outside the command. Do not submit Person names, CPF, registration labels, availability text, Corporation, or Company scope as authority.
  - [ ] Keep the collection browser-local and editable. This story creates no Project, Employee Allocation, allocation period, idempotency completion, or backend draft.

- [ ] Validate effective work terms precisely (AC: 3-4, 7)
  - [ ] Trim `jobRole` and reject a blank result. Do not infer the role from the Employment, Manager relationship, Technical Responsibility, or prior allocation.
  - [ ] Require `expectedDailyWorkloadMinutes` to be an integer from 1 through 1,440 inclusive; reject zero, negatives, fractions, exponent notation, `NaN`, and `Infinity` rather than coercing or rounding silently.
  - [ ] Limit `compensationMode` to the JSON literals `daily`, `hourly`, `weekly`, `fortnightly`, and `monthly`; do not add a free-text or Project-wide compensation mode.
  - [ ] Keep `compensationValue` and `overtimeRate` as canonical non-negative decimal strings with exactly two fractional digits. Accept `"0.00"`; reject signs, exponent notation, grouping separators, more than 16 integral digits, and scale beyond two.
  - [ ] Never parse monetary values through JavaScript binary arithmetic. Future persistence maps accepted values to `numeric(18,2)` without rounding.
  - [ ] Keep workload and compensation terms allocation-specific. Do not mutate permanent Person or Employment identity and do not calculate overtime, payroll, or cost in this story.

- [ ] Reuse the canonical Employee list as the selector source (AC: 2, 6-7)
  - [ ] Query the generated `GET /api/v1/employees` client through a Project-owned server query/action and adapter with `state=active`, `availability=available`, name sorting, search, limit, and cursor.
  - [ ] Do not add a Project-specific Employee selector endpoint or hand-written transport contract. Workforce remains the owner of Employment current state and operational availability reads.
  - [ ] Adapt results to a serializable safe view model containing the Employment id, safe display name, Company registration number when useful, masked document, and availability state.
  - [ ] Support loading, empty, search, additional-page, and safe-error states. Changing search or filters restarts pagination rather than reusing a query-bound cursor.
  - [ ] Remove an Employee from candidate choices once selected while still allowing its row to be edited or removed from the mobilization section.
  - [ ] Reset loaded pages, candidate state, selections, and terms when the trusted selected-Company epoch changes, preserving Story 4.1's complete wizard invalidation rule.

- [ ] Preserve the distinction between current selector capability and final authority (AC: 2, 5, 7)
  - [ ] Treat the existing `availability=available` query as the canonical forward-compatible port. Before allocation persistence exists, it can prove active same-Company Employment selection but must not be described as already enforcing a nonexistent allocation table.
  - [ ] Require Story 4.8 to re-read Employment, Person, current Employment Period, Company ownership, and Corporation-wide open allocation state inside the aggregate transaction.
  - [ ] Enforce at most one open operational allocation for the same Person across every Company in the authenticated Corporation; an allocation in another Corporation is independent.
  - [ ] Do not let Manager or Technical Responsibility relationships consume operational exclusivity or disqualify a candidate.
  - [ ] Reserve stable conflict mapping for finalization: an authorized stale Employee is identified through `details.resources` and mapped to the Employee mobilization subsection without exposing a sibling Company's Project.
  - [ ] Defer allocation tables, partial unique indexes, transaction locks, conflict persistence, and real concurrency guarantees to Story 4.8. Story 4.9 owns dashboard submission and recovery navigation.

- [ ] Add an API-ready Employee allocation fragment without a public route (AC: 1, 3-5, 7)
  - [ ] Extend `main-api/src/modules/projects/**` with strict Zod schemas for the entry and inclusive zero-to-200 collection.
  - [ ] Reject duplicate Employment ids with a deterministic field path that can focus the affected wizard row.
  - [ ] Keep `corporationId`, `companyId`, `personId`, Project id/status, actor, Session, timestamps, effective period ids, and audit metadata outside the payload; they come from trusted context or later transaction output.
  - [ ] Keep frontend and backend validation behavior aligned through equivalent fixtures without importing source between the independent applications.
  - [ ] Do not register a controller, route, OpenAPI operation, generated client, Prisma model, migration, or persistence handler. Story 4.8 composes this fragment into the aggregate finalization contract.

- [ ] Render accessible term editing and review (AC: 1, 3-6)
  - [ ] Provide searchable, keyboard-operable candidate selection with programmatic labels, visible focus, and readable loading, empty, pagination, and error states.
  - [ ] Render each selected Employee as a stable field-array row with explicit term controls and a removal action; UI-only row keys must not enter the command.
  - [ ] Associate validation with the affected row and field, focus the first invalid term, and preserve unrelated valid rows when one entry changes.
  - [ ] Derive review rows from the normalized command joined to safe selector view models. Display masked documents and formatted money without replacing authoritative ids or decimal strings.
  - [ ] Show an explicit optional empty-state summary when the collection is empty and provide an edit action that returns to Employee mobilization with the wizard session key preserved.
  - [ ] Keep the responsive wizard usable for a bounded but large selection through progressive cursor loading and compact row presentation; do not preload or render the entire Workforce registry.

- [ ] Prove optional Employee mobilization behavior (AC: 1-7)
  - [ ] Schema-test zero, one, 200, and 201 allocations; duplicate Employment ids; missing ids; blank roles; every workload boundary and invalid numeric form; every compensation mode; and decimal precision/range without rounding.
  - [ ] Adapter-test that list DTOs become safe view models and plaintext CPF, credentials, and trusted scope never enter Client Component props or wizard state.
  - [ ] Component-test search, cursor append, selection, duplicate prevention, term editing, removal, first-error focus, empty review, populated review, and Company-change reset.
  - [ ] Extend real-PostgreSQL Workforce tests only for currently implemented active/current, selected-Company, masking, and cursor guarantees. Do not falsely claim Corporation-wide allocation exclusion before Story 4.8 adds the allocation model.
  - [ ] Carry the PostgreSQL exclusivity, stale eligibility, rollback, and concurrent-winner scenarios forward as mandatory Story 4.8 aggregate tests; keep their expected codes and subsection mapping explicit here.
  - [ ] Add Project wizard Playwright coverage for skipping mobilization, selecting multiple Employees, editing terms, review/edit navigation, responsive behavior, and absence of Project or allocation persistence.
  - [ ] Run focused frontend/API schema tests, typecheck, lint, production builds, contract-drift checks when applicable, and the relevant Playwright journey.

## Dev Notes

### Developer Context

- Story 4.5 adds the first optional operational-resource collection to the browser-local Project aggregate. A valid Project command may contain no Employee allocations.
- The selector works with active Company Employments, but exclusivity follows the Corporation-scoped Person: separate Employments for the same Person cannot hold simultaneous open operational allocations within one Corporation.
- Current Workforce DTOs expose an `availability` port and `hasOpenAllocation`, but no allocation persistence model exists at the baseline commit. Use the port honestly and leave the authoritative join, constraint, and race handling to Story 4.8.
- Effective terms belong to the allocation period, never to Person, Employment, Project schedule, Manager tenure, or Technical Responsibility.

### Technical Requirements

- Canonical command fragment: `initialEmployeeAllocations: Array<{ employmentId, jobRole, expectedDailyWorkloadMinutes, compensationMode, compensationValue, overtimeRate }>` with 0-200 unique Employment ids.
- Workload is an integer minute count in the inclusive range 1-1,440. It does not have to equal the Project's default schedule duration.
- Monetary strings are canonical `numeric(18,2)` candidates: non-negative, exactly two fractional digits, no silent rounding, and `"0.00"` is valid.
- Manager and Technical Responsibility are separate non-exclusive accountability relationships. The same Employment may hold those roles while also being operationally allocated, provided no other open operational allocation blocks its Person.
- Candidate labels are presentation data. Final authorization and eligibility use ids plus trusted request context and current database state.

### Architecture Compliance

- Use `page -> projects feature -> server query/action -> adapter/view model -> generated client`; generated clients and credentials remain server-only.
- Reuse `/api/v1/employees` with canonical bound cursors. Do not create a parallel selector resource, import a generated client into a Client Component, or trust Company scope from form data.
- Keep interactive rows in React Hook Form/Zod and browser memory only. Do not place wizard payloads, loaded pages, entities, or scope in Zustand or persistent browser storage.
- Backend Projects schemas define command shape; Workforce owns registry reads; Story 4.8 owns the cross-domain aggregate transaction and database guarantees.
- Recoverable errors preserve every unrelated local value and use stable codes and `details.resources`, never parsed message text.

### Library and Framework Requirements

- Use repository-pinned Next.js `16.2.9`, React `19.2.4`, React Hook Form `^7.79.0`, Zod `^4.4.3`, Vitest `4.1.9`, and Playwright `1.61.1`; do not upgrade dependencies for this story.
- Use React Hook Form field arrays with generated UI keys distinct from Employment ids and Zod refinements with explicit paths for duplicate/cross-row errors.
- Use strict string validation for BRL decimals; do not introduce a money library or use `z.coerce.number()` for precision-sensitive values.
- Keep server-only imports guarded and pass only serializable safe selector view models across the Server/Client boundary.

### Current Files to Reconcile and Preserve

- Extend the Projects feature, normalized command, review model, and API DTO fragments described by Stories 4.1-4.4; those runtime files may not exist until predecessor stories are implemented.
- `main-web-app/src/features/employees/employees.server.ts` already wraps the generated Employee list and exposes `state`, `availability`, search, sorting, and cursor inputs. Follow its server-only boundary without coupling Projects to the Employee registry page UI.
- `main-api/src/modules/workforce/workforce.dto.ts`, `workforce.service.ts`, and `handlers/workforce.handler.ts` own active/current Employment queries and cursor scope. Preserve them unless a selector AC requires a minimal, backward-compatible availability correction.
- The baseline Prisma schema contains Person, Employment, and Employment Period but no Project or Employee Allocation model. Do not introduce partial persistence in this story.
- Preserve Commercial, Fleet, authentication, Company selection, pagination, generated-client, and existing registry behavior.

### Testing Requirements

- Frontend and backend schema tests use equivalent table-driven fixtures for allocation entries, counts, modes, workload, and monetary strings.
- Use masked synthetic documents only. No real CPF may appear in fixtures, snapshots, URLs, cursors, logs, or errors.
- Existing PostgreSQL tests can prove selector scope/current state; Story 4.8 must prove Corporation-wide Person exclusivity, atomic rollback, and allocation races after the required models exist.
- Playwright proves optionality and local editing while asserting that no Project or Employee Allocation is written before aggregate finalization.

### Previous Story Intelligence

- Story 4.4 establishes one normalized local command, field-array patterns, frontend/backend schema parity, and no premature persistence. Employee rows extend that aggregate without coupling to schedule rows.
- Story 4.3 establishes the Employee server selector boundary for responsibilities but deliberately omits `availability=available`. Story 4.5 must use the availability filter because operational allocation eligibility is different from accountability eligibility.
- Story 4.2 establishes exact decimal-string handling and review/edit derivation from normalized command state. Reuse those rules for compensation and overtime values.
- Story 4.1 owns the wizard session, idempotency key, Company-change reset, cancellation, focus, and review navigation. Mobilization must preserve all of those lifecycle guarantees.

### Git Intelligence Summary

- Baseline `9e243e1` contains the current Workforce registry, bound cursor patterns, safe document DTOs, and Fleet review hardening used as reference for this story.
- Recent vertical slices keep generated clients behind frontend server modules, colocate Zod DTO tests, and place relational scope/concurrency tests under `main-api/tests/integration`.
- Stories 4.1-4.4 and their sprint-status changes are intentional uncommitted implementation artifacts. Preserve them without reformatting or rewriting.

### Latest Technical Information

- Zod 4 supports strict strings, trimming, enums, safe integers, array bounds, and refinements needed by this fragment; precision-sensitive money must remain a string even though number coercion exists. [Source: https://zod.dev/api]
- Current Next.js App Router guidance keeps interactive state in Client Components and server access in Server Components/Functions; props crossing the boundary must remain serializable. [Source: https://nextjs.org/docs/app/getting-started/server-and-client-components]
- Repository-pinned versions remain implementation authority. No framework, form, data-fetching, or money dependency upgrade is authorized here. [Source: main-web-app/package.json; main-api/package.json]

### Project Structure Notes

- Employee mobilization schemas, normalization, selector adapters, components, safe view models, and tests remain under `main-web-app/src/features/projects/**`.
- The matching strict backend fragment and DTO tests remain under `main-api/src/modules/projects/**` until Story 4.8 creates the public aggregate route and persistence layers.
- Workforce remains the owner of Employee list eligibility reads. Do not move registry code into Projects or create a generic selector abstraction before repeated implemented contracts justify it.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-45-Configure-Optional-Initial-Employee-Mobilization]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-51-Allocate-an-Employee-With-Effective-Work-Terms]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-48-Finalize-the-Project-Aggregate-Atomically-and-Idempotently]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-49-Submit-the-Wizard-and-Recover-Finalization-Conflicts]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-12-Allocate-Employee-with-Effective-Terms]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-25-Capture-Optional-Mobilization]
- [Source: _bmad-output/planning-artifacts/architecture.md#Identifiers-and-Numeric-Types]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pagination]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Wizard]
- [Source: _bmad-output/brainstorming/brainstorming-session-2026-06-18-010627.md#Labor-Boundary-56-Corporation-Wide-Physical-Work-Exclusivity]
- [Source: main-api/docs/PAGINATION.md]
- [Source: main-api/src/modules/workforce/workforce.dto.ts]
- [Source: main-api/src/modules/workforce/workforce.service.ts]
- [Source: main-api/src/modules/workforce/handlers/workforce.handler.ts]
- [Source: main-web-app/src/features/employees/employees.server.ts]
- [Source: _bmad-output/implementation-artifacts/4-1-run-a-non-resumable-local-project-wizard.md]
- [Source: _bmad-output/implementation-artifacts/4-2-capture-project-identity-and-commercial-baseline.md]
- [Source: _bmad-output/implementation-artifacts/4-3-select-the-client-and-project-responsibilities.md]
- [Source: _bmad-output/implementation-artifacts/4-4-configure-the-weekly-schedule-and-break-templates.md]

## Security and Completeness Hardening Amendment

The following criteria are mandatory extensions of the story acceptance criteria:

- **H1 — Role bound:** `jobRole` is trimmed, NFC-normalized, non-empty, and at most 120 Unicode code points; disallowed control characters are rejected. Compensation and overtime decimals must also respect the `numeric(18,2)` capacity of at most 16 integral digits.
- **H2 — Selection across pages:** The UI exposes a selected-count and a dedicated selected-items view. Selections survive cursor page, search, and sort changes in the open wizard; only explicit removal or wizard discard clears them. No global “select all” across unseen results is offered.
- **H3 — Person exclusivity:** Finalization resolves every Employment to its Corporation Person and enforces at most one open Project Employee allocation for that Person across the Corporation. This rule is independent from Manager and Technical Responsibility roles.
- **H4 — Non-disclosure:** Ineligible, foreign, and absent Employment ids receive the same safe conflict shape; authorized details identify only resources already visible in the selected Company.
- **H5 — Deterministic concurrency:** Real-PostgreSQL barrier/latch tests submit two Projects for different Employments of the same Person and prove exactly one allocation commits, the loser receives the stable Employee-allocation conflict, and neither Project is partially persisted.

Tasks must include selected-item reconciliation after refreshed pages and tests at 0/200/201 allocations, workload 1/1440/1441, all compensation modes, decimal capacity, role boundaries, and the H5 race.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01: Authored optional Employee selection, normalized work terms, Corporation Person exclusivity persistence, and availability integration. Validation remains pending by user request.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Optionality, allocation-specific work terms, canonical Employee selector reuse, Corporation-wide Person exclusivity, current availability limitations, and later atomic-finalization boundaries were reconciled.

### File List

- `main-web-app/src/features/projects/components/project-wizard.tsx`
- `main-api/src/modules/projects/projects.service.ts`
- `main-api/src/modules/workforce/workforce.service.ts`
- `main-api/prisma/schema.prisma`

### Change Log

- 2026-07-01: Created Story 4.5 implementation context for optional initial Employee mobilization.
- 2026-07-01: Added role bounds, paginated selection behavior, safe conflicts, and deterministic Person-exclusivity tests.
- 2026-07-01: Authored initial Employee mobilization and availability integration; validation gates remain pending.
