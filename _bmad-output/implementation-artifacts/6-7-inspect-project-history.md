# Story 6.7: Inspect Project History

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to inspect preserved history from a Project detail view,
so that I can understand prior commercial, accountability, schedule, and allocation context.

## Acceptance Criteria

1. **Given** an authorized Project in the selected Company, **when** history opens, **then** separate sections expose Client periods, Manager tenures, Technical Responsibilities, Project Baselines, Weekly Schedule revisions with Break Templates, Employee Allocations, Machine Allocations, and Fuel Agreements/types/effective prices.
2. **Given** a historical collection is returned, **when** rows share or differ in effective instants, **then** ordering is deterministic by effective boundary descending and `id` descending, with current/closed state explicit where applicable.
3. **Given** a collection may grow without a fixed bound, **when** another page is requested, **then** it uses canonical cursor pagination bound to resource, normalized filters, ordering, Corporation, selected Company, Project, and authorized history scope.
4. **Given** a malformed, tampered, cross-resource, cross-query, or foreign-scope cursor, **when** parsed, **then** a safe validation failure is returned without records or existence disclosure.
5. **Given** a related Client, Employee, Supplier, Project association, or temporal row is closed, removed, inactive, or terminal, **when** displayed, **then** it is clearly historical and no action or selector treats it as current.
6. **Given** historical audit fields exist, **when** authorized details render, **then** safe actor identity, reason, and effective instant are shown; missing legacy/optional audit remains explicitly unavailable rather than fabricated.
7. **Given** history responses are built, **when** contracts cross the API/frontend boundary, **then** dedicated history handlers, DTOs, server queries, adapters, and view models are used and never reused by operational selectors or mutation forms.
8. **Given** monetary values or civil dates appear, **when** rendered, **then** decimal strings retain database precision, civil dates remain timezone independent, and instants use explicit ISO date-time values.
9. **Given** Project history is loading, empty, paginating, unavailable, unauthorized, or failed, **when** the dashboard renders, **then** each section keeps stable layout, communicates state independently, and preserves already loaded pages/back navigation in the current interaction.
10. **Given** the Company workspace changes, **when** navigation/state updates, **then** loaded history pages, cursors, Project identity, and subordinate UI state are cleared before the new workspace loads.
11. **Given** a foreign or missing Project is requested, **when** any history endpoint runs, **then** existence is not disclosed and no partial collection is returned.
12. **Given** Project history is delivered, **when** scope is evaluated, **then** it remains detail-only and introduces no consolidated cross-Project report, export, event store, or generic audit module.
13. **Given** tests run, **then** contract, real-PostgreSQL, frontend, and Playwright suites cover every required collection, ordering/tie-breaks, pagination, actor/reason visibility, decimals/dates, cursor tampering, workspace reset, tenant isolation, and current-versus-history separation.

## Tasks / Subtasks

- [ ] Define Project history collection contracts (AC: 1-8, 11-12)
  - [ ] Add dedicated read-only endpoints under `/api/v1/projects/:projectId/history/{baselines,clients,managers,technical-responsibilities,schedules,employee-allocations,machine-allocations,fuel-agreements}` rather than one heterogeneous or unbounded response.
  - [ ] Standardize query input to bounded `limit` plus optional opaque `cursor`; use a closed collection name, fixed default ordering, canonical success/error envelopes, and collection-specific DTOs.
  - [ ] Include safe display snapshots/labels needed to understand historical rows without making inactive related records operationally selectable; expose actor/reason only where the owning temporal model records them.
- [ ] Implement scoped paginated historical reads (AC: 2-7, 10-12)
  - [ ] Add Projects-owned handlers that first authorize the scoped Project, then query only the requested collection with explicit Corporation/Company/Project predicates.
  - [ ] Reuse `parseBoundCursor` and `buildCursorPage`; include Project ID, selected collection, scope, filters, and sort in cursor binding and use effective boundary plus `id` keyset predicates.
  - [ ] Compose nested bounded snapshot data for schedules/breaks and agreements/types/prices without creating N+1 queries or returning all history indirectly.
  - [ ] Keep current Project detail unchanged in purpose; history endpoints must never provide inputs to mutation/selectors.
- [ ] Add Project history dashboard (AC: 1, 5-10)
  - [ ] Add a history area to Project detail with independently paginated sections, historical/current badges, safe actor/reason rendering, and precision/time formatting.
  - [ ] Use server-only Kubb clients through feature adapters/view models; preserve loaded pages and layout during pagination, but clear everything on Company change.
  - [ ] Provide section-level loading, empty, unavailable, unauthorized, failure, and retry states without adding report/export controls.
- [ ] Prove read isolation and contract safety (AC: 1-13)
  - [ ] Add OpenAPI/Kubb contract tests and real-PostgreSQL fixtures spanning the temporal records created by Stories 5.1–6.6.
  - [ ] Test deterministic ties, page boundaries, tampered/cross-collection cursors, inactive related entities, foreign Projects, and absence of historical rows in operational selectors.
  - [ ] Add frontend component/adapter tests and Playwright coverage; regenerate/check OpenAPI, Kubb, types, tests, and builds.

## Dev Notes

### Developer Context

- This story consumes preserved domain history; it does not create another source of truth. Query Projects-owned temporal tables directly through dedicated handlers.
- “History” is multiple typed collections, not a synthetic universal event timeline. Each collection owns its fields, paging, empty state, and audit availability.
- Historical labels may need denormalized/display projections, but they must never grant eligibility or allow a closed relationship to re-enter a selector.

### Architecture Compliance

- Derive Corporation, Company, Session, User, and role from authenticated context. Every query must authorize the parent Project before returning rows and must not disclose foreign existence.
- Reuse the canonical cursor implementation and bind cursors to collection-specific resource plus `{ corporationId, companyId, projectId }`. Keep cursor payload opaque and free of sensitive data.
- Preserve decimal strings, civil dates, ISO instants, canonical envelopes, OpenAPI ownership, server-only generated Kubb clients, and separate current/history models.
- Do not add cache, event sourcing, reporting/export infrastructure, or dependency upgrades.

### Current Files to Reconcile and Preserve

- `ProjectsService.detail()` and `ProjectDetail` currently expose only current identity/status information. Add separate history query paths and UI state rather than expanding detail into an unbounded aggregate.
- `main-api/src/lib/utils/cursor-pagination.ts` already validates resource, scope, query, sort, and keyset boundary. Reuse it without creating a second cursor format.
- Temporal data already resides across the Project models populated by Stories 4–6. Query their scoped current/closed rows without rewriting history.
- The current detail route converts errors broadly to `notFound()`; history composition must preserve safe 404 behavior without hiding authorization/transient failures as missing data.

### Previous Story Intelligence

- Stories 6.1–6.6 define the temporal rows, audit fields, exact precision, and current/history separation this story exposes. Do not invent generic audit events in their place.
- Story 6.6 introduces nested agreement/type/price history; keep that collection internally structured and independently paginated at the agreement boundary.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-67-Inspect-Project-History]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-35-Inspect-Entity-History]
- [Source: _bmad-output/planning-artifacts/architecture.md#Current-and-Historical-Queries]
- [Source: _bmad-output/implementation-artifacts/6-6-maintain-project-fuel-agreements-and-effective-prices.md]
- [Source: main-api/src/lib/utils/cursor-pagination.ts]
- [Source: main-api/src/modules/projects/projects.service.ts]
- [Source: main-web-app/src/features/projects/components/project-detail.tsx]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

