# Story 6.8: Inspect Employee History

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to inspect preserved Employment and Employee Allocation history,
so that I can understand where and under which terms a Person worked without restoring prior eligibility.

## Acceptance Criteria

1. **Given** an authorized Employment detail in the selected Company, **when** history opens, **then** separate collections expose Employment Periods and Employee Allocations with effective Project, role snapshot, workload, compensation mode/value, overtime rate, dates, actor, and reason where recorded.
2. **Given** Employment history is shown, **when** current and closed periods coexist, **then** each is clearly labeled, ordered deterministically by effective boundary and `id`, and closed/terminated records remain immutable.
3. **Given** historical allocations exist, **when** displayed, **then** stored effective terms and Project context are shown exactly as they applied and later role, compensation, Project, or Employment changes do not rewrite them.
4. **Given** CPF context is rendered, **when** history loads, **then** the document remains masked by default and plaintext is available only through the existing explicit authorized detail boundary, never history list DTOs/cursors/logs.
5. **Given** a history collection may grow without bound, **when** paginated, **then** canonical cursors bind resource, normalized filters, ordering, Corporation, selected Company, Employment/Person identity, and authorized history scope.
6. **Given** a malformed, tampered, cross-Employment, cross-Company, or foreign cursor, **when** parsed, **then** a safe validation failure returns no records and discloses no foreign existence.
7. **Given** current Employee detail and history coexist, **when** frontend data is requested, **then** dedicated history handlers, response models, adapters, and view models are used; closed rows never enter active Employment/allocation selectors.
8. **Given** the Person has Employments in another Company or Corporation, **when** the selected workspace requests history, **then** only the authorized Employment/Company history is returned and no partial foreign timeline appears.
9. **Given** history is loading, empty, paginating, unavailable, unauthorized, or failed, **when** rendered, **then** each section communicates state independently, preserves stable layout and loaded pages, and does not disrupt rehire or current job-role actions.
10. **Given** Company workspace changes, **when** state resets, **then** Employment identity, cursors, loaded history pages, and subordinate form/view state are cleared before new data loads.
11. **Given** monetary terms cross boundaries, **when** returned/displayed, **then** compensation and overtime remain normalized two-decimal strings and dates retain their defined civil-date or instant semantics.
12. **Given** a foreign or missing Employment is requested, **when** any history endpoint runs, **then** existence is not disclosed and no partial history is returned.
13. **Given** tests run, **then** contract, PostgreSQL, frontend, and Playwright suites cover periods, allocation term snapshots, deterministic ordering, pagination, masking, actor/reason availability, workspace reset, cursor tampering, tenant isolation, and current/history separation.

## Tasks / Subtasks

- [ ] Define Employee history contracts (AC: 1-8, 11-12)
  - [ ] Add `GET /api/v1/employees/:employmentId/history/employment-periods` and `GET /api/v1/employees/:employmentId/history/allocations`, each accepting bounded `limit` and optional opaque `cursor`.
  - [ ] Create history-only DTOs with explicit current/closed state and safe Project/person labels; allocation DTOs return stored role/workload/compensation snapshots rather than joining to current operational terms.
  - [ ] Keep CPF masked in every history contract and expose actor/reason only if persisted by the owning lifecycle command; never synthesize missing audit evidence.
- [ ] Implement scoped Workforce history handlers (AC: 2-8, 10-12)
  - [ ] Authorize the Employment under trusted Corporation/selected Company before querying periods or allocations; bind cursors to Company, Employment, Person, collection, filters, and ordering.
  - [ ] Reuse canonical cursor parsing/building and effective-boundary-plus-`id` keyset predicates; return safe invalid-cursor/not-found behavior without partial foreign data.
  - [ ] Keep current `findEmployeeDetailHandler` and operational availability/selectors distinct; migrate unbounded period rendering out of current detail without breaking rehire/job-role actions.
- [ ] Add Employee history UI (AC: 1-4, 7, 9-11)
  - [ ] Add independent Employment Period and Allocation history sections with paginated loading, historical badges, Project/term snapshots, masked CPF context, and safe actor/reason display.
  - [ ] Route generated clients through server-only feature adapters; preserve pages during interaction and reset on Company change.
  - [ ] Keep existing current Employment, rehire, availability, and job-role forms operational while history errors remain section-local.
- [ ] Prove privacy and eligibility separation (AC: 1-13)
  - [ ] Add contract and real-PostgreSQL tests with rehire, termination, role changes, allocation/reallocation/release, and compensation revisions.
  - [ ] Test deterministic ties/page boundaries, malformed/cross-scope cursors, multiple Company Employments, CPF exclusion, foreign non-enumeration, and selector isolation.
  - [ ] Add frontend/adapter and Playwright coverage; regenerate/check OpenAPI, Kubb, types, tests, and builds.

## Dev Notes

### Developer Context

- The current Employee detail already embeds all Employment/job-role periods. This story separates unbounded history into paginated contracts; do not leave an unbounded duplicate in the current detail response.
- Allocation history must use the terms stored on `ProjectEmployeeAllocation`, including its role snapshot. Joining to the Employee's current job role would rewrite the meaning of old work.
- The requested route key is `employmentId`, so authorization and cursor scope must include both Employment and Person identity to prevent cross-employment substitution.

### Architecture Compliance

- Workforce owns Employment and employee-allocation history. Scope every row by Corporation/Company and authorize the parent Employment before reading children.
- Reuse canonical cursor pagination and canonical envelopes. Keep historical DTOs out of operational selectors and generated Kubb imports out of Client Components.
- Preserve masked personal documents, decimal strings, temporal semantics, OpenAPI ownership, and pinned dependencies; do not add generic audit/reporting infrastructure.

### Current Files to Reconcile and Preserve

- `WorkforceService.detail()` delegates to `findEmployeeDetailHandler`, whose current projection eagerly includes all periods and job-role periods. Split history without breaking current state calculation.
- `EmployeeDetailPage` currently renders period/job-role history beside current actions. Refactor into paginated history sections while preserving rehire and change-role forms and their server actions.
- `ProjectEmployeeAllocation` already stores effective role, workload, compensation, and overtime snapshots. Read them as historical facts and never infer them from current Employment.
- Reuse `main-api/src/lib/utils/cursor-pagination.ts`; do not introduce offset pagination or another cursor encoding.

### Previous Story Intelligence

- Story 6.7 establishes separate typed history collections, cursor binding, section-local UI states, and the prohibition on feeding historical DTOs into selectors.
- Stories 5.1–5.5 define allocation/Employment audit and immutable period behavior; history must expose only evidence actually persisted by those commands.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-68-Inspect-Employee-History]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-35-Inspect-Entity-History]
- [Source: _bmad-output/planning-artifacts/architecture.md#Current-and-Historical-Queries]
- [Source: _bmad-output/implementation-artifacts/6-7-inspect-project-history.md]
- [Source: _bmad-output/implementation-artifacts/5-4-change-effective-employee-terms-on-the-same-project.md]
- [Source: main-api/src/modules/workforce/workforce.service.ts]
- [Source: main-api/src/modules/workforce/handlers/workforce.handler.ts]
- [Source: main-web-app/src/features/employees/components/employee-detail-page.tsx]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

