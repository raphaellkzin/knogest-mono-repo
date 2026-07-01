---
baseline_commit: 9e243e12f17379cc0db8ccc69aa4dacb715d16e6
---

# Story 4.6: Configure Optional Initial Machine Mobilization

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to optionally select Machines during Project creation,
so that the Project can reserve eligible equipment from a confirmed Meter Reading without making Machine mobilization mandatory.

## Acceptance Criteria

1. **Given** the administrator reaches Machine mobilization
   **When** no Machine is selected
   **Then** the wizard remains valid
   **And** Project creation is not blocked.

2. **Given** Machine candidates are requested
   **When** the selector loads
   **Then** it returns active Machines currently owned by the selected Company with no open Project allocation and no blocking lifecycle condition
   **And** each candidate exposes its latest confirmed Meter Reading safely.

3. **Given** a Machine is selected
   **When** the initial allocation command is prepared
   **Then** its allocation start reading references the latest confirmed Meter Reading
   **And** no registration or ownership change is implied.

4. **Given** a selected Machine becomes allocated, transferred, retired, blocked, or foreign before final submission
   **When** final backend validation runs
   **Then** the conflict identifies the affected Machine and Machine mobilization subsection
   **And** unrelated valid wizard values remain available.

5. **Given** the Machine selector uses search or pagination
   **When** more results are requested
   **Then** it follows canonical cursor semantics and trusted scope
   **And** Company changes invalidate every loaded Machine and selection.

6. **Given** Machine mobilization is tested
   **When** frontend, contract, and PostgreSQL integration tests run
   **Then** they cover an empty selection, current ownership, allocation eligibility, latest-reading continuity, pagination, stale eligibility, and conflict mapping
   **And** Machine mobilization remains optional.

## Tasks / Subtasks

- [ ] Add optional Machine mobilization to the existing local Project command (AC: 1, 3-4, 6)
  - [ ] Extend the Project wizard and normalized aggregate model established by Stories 4.1-4.5; do not create another wizard or put Machine behavior in generic modal components.
  - [ ] Represent the section as `initialMachineAllocations`, an ordered collection of zero through 100 entries. One hundred is valid; 101 is rejected before submission.
  - [ ] Use `{ machineId, startMeterReadingId }` for each entry and reject duplicate `machineId` values deterministically.
  - [ ] Capture `startMeterReadingId` from the candidate's current latest confirmed reading at selection or explicit refresh time. Do not submit the reading value, registration, identifiers, ownership, or availability label as authority.
  - [ ] Keep selector display metadata separate from the identifier-only command fragment and preserve selection order for stable review.
  - [ ] Keep the collection browser-local and editable. This story creates no Project, Machine Allocation, Meter Reading reference, idempotency completion, or backend draft.

- [ ] Reuse the canonical Machine list as the selector source (AC: 2, 5-6)
  - [ ] Query the generated `GET /api/v1/machines` client through a Project-owned server query/action and adapter with `availability=available`, name sorting, search, optional approved type filtering, limit, and cursor.
  - [ ] Do not add a Project-specific Machine selector endpoint or hand-written transport contract. Fleet remains the owner of current Machine, ownership, Meter Reading, and availability reads.
  - [ ] Adapt each result to a serializable view model containing Machine id, safe name, type, manufacturer/model when useful, current identifiers, latest confirmed reading id/value/recorded time, and availability state.
  - [ ] Exclude or disable any result without a latest confirmed reading; registration requires an initial reading, so absence signals an invalid or stale candidate rather than permission to invent a zero reading.
  - [ ] Support loading, empty, search, cursor append, and safe-error states. Changing query filters restarts pagination instead of replaying a bound cursor.
  - [ ] Reset every loaded page and selection when the trusted selected-Company epoch changes, preserving Story 4.1's complete invalidation behavior.

- [ ] Preserve Meter Reading continuity without mutating Fleet data (AC: 2-4, 6)
  - [ ] Treat `startMeterReadingId` as an optimistic evidence snapshot. Its decimal value is display-only and must never be accepted from the browser as the authoritative start reading.
  - [ ] Require Story 4.8 to re-read current ownership, active state, open allocation state, lifecycle blockers, and latest confirmed Meter Reading inside the aggregate transaction.
  - [ ] If the submitted reading id is no longer the latest confirmed reading, reject with a safe stale-reading conflict so the administrator can refresh the Machine subsection; do not silently preserve a stale boundary.
  - [ ] If the Machine was allocated, transferred, retired, blocked, or moved outside the selected Company, reject the complete aggregate without disclosing foreign Company or Project details.
  - [ ] Never create, correct, lower, duplicate, or overwrite a Meter Reading and never change Machine registration, identifiers, type, ownership, or lifecycle state as a side effect of selection.
  - [ ] Defer allocation periods, reading-reference rows, lifecycle joins, transaction locks, database uniqueness, and concurrent-winner behavior to Story 4.8. Story 4.9 owns conflict navigation and retry UX.

- [ ] Preserve the distinction between current availability and future final authority (AC: 2, 4, 6)
  - [ ] Reuse the existing `availability=available` contract as the forward-compatible selector port. At the baseline commit, Fleet can prove active current ownership and a latest reading but has no Project allocation, open-shift, retirement, or pending-final-reading persistence to query.
  - [ ] Do not claim that placeholder `hasOpenAllocation: false` already proves operational exclusivity. Update the canonical Fleet availability calculation only when Story 4.8 introduces the required persisted relationships.
  - [ ] Keep current ownership scoped by both Corporation and selected Company and reject foreign resources without existence disclosure.
  - [ ] Preserve the invariant of at most one open allocation per Machine while allowing independent historical allocation periods to remain inspectable later.
  - [ ] Map authorized stale-resource details to the Machine mobilization subsection through stable conflict codes and `details.resources`, never through localized message parsing.

- [ ] Add an API-ready Machine allocation fragment without a public route (AC: 1, 3-4, 6)
  - [ ] Extend `main-api/src/modules/projects/**` with a strict Zod entry schema containing two UUIDs and an inclusive zero-to-100 collection.
  - [ ] Reject duplicate Machine ids with a field path that identifies the later duplicate row; do not require reading values or Fleet metadata in the command.
  - [ ] Keep `corporationId`, `companyId`, Project id/status, actor, Session, effective timestamps, ownership ids, reading values, and audit metadata outside the payload.
  - [ ] Keep frontend and backend schema behavior aligned through equivalent fixtures without sharing runtime source across applications.
  - [ ] Do not register a controller, route, OpenAPI operation, generated client, Prisma model, migration, or persistence handler. Story 4.8 composes and persists this fragment atomically.

- [ ] Render accessible Machine selection and review (AC: 1-5)
  - [ ] Provide a keyboard-operable searchable selector with programmatic labels, visible focus, and readable loading, empty, pagination, stale, and error states.
  - [ ] Remove a selected Machine from candidate choices while keeping its selected row removable and its reading snapshot visible.
  - [ ] Present the latest confirmed reading as a decimal string with its recorded time and enough Machine identity to distinguish candidates; do not convert the value through binary arithmetic.
  - [ ] Derive review rows from normalized ids joined to safe selector view models. The review may format Machine details and reading values but must retain `machineId` and `startMeterReadingId` as the command source.
  - [ ] Show an explicit optional empty-state summary when no Machine is selected and provide an edit action that preserves the wizard session key.
  - [ ] Keep mobile layout compact and avoid unbounded rendering; additional candidates load through cursor pages rather than copying the complete Fleet registry into client state.

- [ ] Prove optional Machine mobilization behavior (AC: 1-6)
  - [ ] Schema-test zero, one, 100, and 101 entries; duplicate Machine ids; invalid UUIDs; missing reading ids; and deterministic duplicate error paths.
  - [ ] Adapter-test that latest reading id/value and safe registration data reach the selector while trusted scope and server credentials do not cross into Client Components.
  - [ ] Component-test search, cursor append, selection, duplicate prevention, missing-reading exclusion, removal, reading snapshot review, empty review, edit return, and Company-change reset.
  - [ ] Extend real-PostgreSQL Fleet tests for currently implemented active/current ownership, same-Company scope, latest-confirmed-reading selection, monotonic reading behavior, and cursor binding.
  - [ ] Carry open-allocation, lifecycle-blocker, stale-reading race, rollback, and concurrent-winner scenarios forward as mandatory Story 4.8 tests; do not falsely claim them before the relevant models exist.
  - [ ] Add Project wizard Playwright coverage for skipping Machine mobilization, selecting multiple Machines, reviewing their reading snapshots, editing/removing selections, responsive behavior, and absence of Project/allocation persistence.
  - [ ] Run focused frontend/API schema tests, typecheck, lint, production builds, contract-drift checks when applicable, and the relevant Project wizard Playwright journey.

## Dev Notes

### Developer Context

- Story 4.6 adds the second optional resource collection to the local aggregate. A Project remains valid with no Machine allocations.
- The existing Machine list already scopes active Machines by current ownership and exposes the latest confirmed Meter Reading. Reuse it instead of creating a duplicate selector read model.
- The baseline Fleet availability DTO has no persisted allocation or blocking lifecycle records behind it. This story must describe that limitation explicitly and reserve authoritative validation for Story 4.8.
- Selection reserves no Machine yet. Only successful aggregate finalization creates the open allocation and Meter Reading reference atomically.

### Technical Requirements

- Canonical command fragment: `initialMachineAllocations: Array<{ machineId, startMeterReadingId }>` with 0-100 unique Machine ids.
- `startMeterReadingId` references the candidate's latest confirmed reading snapshot. The API never trusts a submitted decimal reading value for allocation evidence.
- Meter Reading values remain normalized non-negative decimal strings compatible with `numeric(14,2)`; do not convert them to JavaScript numbers for review or comparison.
- Current ownership and eligibility come from trusted Corporation/Company context. Neither Company nor ownership is carried in the wizard payload.
- A stale reading, allocation, ownership, retirement, blocking lifecycle, or foreign-scope condition must fail finalization atomically and identify only the authorized Machine resource.

### Architecture Compliance

- Use `page -> projects feature -> server query/action -> adapter/view model -> generated client`; generated Fleet clients and credentials stay server-only.
- Reuse `/api/v1/machines` and canonical bound cursors. Do not create a parallel selector route, duplicate Fleet DTO, or derive scope from the browser.
- Keep interactive selections in React Hook Form/Zod and browser memory only; do not use Zustand, URL state, persistent storage, or a backend draft.
- Fleet owns registry/reading reads, Projects owns aggregate command shape, and Story 4.8 owns the transaction spanning Project, allocation, and reading-reference persistence.
- Preserve stable error codes, non-disclosing scope behavior, and recovery through `details.resources`.

### Library and Framework Requirements

- Use repository-pinned Next.js `16.2.9`, React `19.2.4`, React Hook Form `^7.79.0`, Zod `^4.4.3`, Vitest `4.1.9`, and Playwright `1.61.1`; do not upgrade dependencies.
- Use a React Hook Form field array or equivalent collection controlled by the existing wizard, with UI keys separate from Machine ids.
- Use strict UUID schemas and explicit uniqueness refinements. Keep Meter Reading decimal values as strings; no decimal or query-cache dependency is needed.
- Pass plain serializable selector view models across the Server/Client boundary and retain `server-only` protection around generated clients.

### Current Files to Reconcile and Preserve

- Extend the Projects feature, local command, review model, and API DTO fragments described by Stories 4.1-4.5; those runtime files depend on predecessor implementation order.
- `main-web-app/src/features/machines/machines.server.ts` wraps the generated Machine list and already accepts availability, search, type, sorting, and cursor inputs. Reuse its boundary without importing the Machine registry page.
- `main-api/src/modules/fleet/fleet.dto.ts`, `fleet.service.ts`, and `handlers/fleet.handler.ts` currently own Machine list scope, current ownership, safe registration DTOs, and latest confirmed reading selection.
- The baseline Prisma schema has Machine, ownership, identifiers, Meter Readings, corrections, and references but no Project or Machine Allocation model. Do not create incomplete allocation persistence here.
- Preserve Workforce, Commercial, authentication, Company selection, generated-client, pagination, and monotonic Meter Reading behavior.

### Testing Requirements

- Frontend and backend schema tests use equivalent table-driven fixtures for entry shape, UUIDs, collection bounds, and uniqueness.
- Fleet PostgreSQL tests prove current ownership and reading continuity. Story 4.8 must add allocation/lifecycle concurrency tests after the aggregate models exist.
- Tests must never use a browser-supplied reading value as authority or assert that registration/ownership changes during selection.
- Playwright proves optional local behavior and no persistence before aggregate finalization.

### Previous Story Intelligence

- Story 4.5 establishes the optional-resource collection pattern, safe paginated selectors, local-only review, and honest deferral of allocation guarantees. Reuse that structure for Machines.
- Story 4.4 establishes normalized collection schemas and frontend/backend fixture parity without routes or migrations.
- Story 4.3 establishes server-only generated selector clients and safe local view models; Machine selection follows the same boundary with Fleet-specific evidence.
- Stories 4.1 and 4.2 own session invalidation, review/edit state, exact decimal strings, and no premature Project persistence.

### Git Intelligence Summary

- Baseline `9e243e1` includes Fleet review hardening, current-ownership filtering, latest confirmed reading DTOs, monotonic reading constraints, and real PostgreSQL integration coverage relevant to this story.
- Recent Fleet work keeps decimal values as strings, protects the monotonic chain transactionally, and consumes generated clients through `machines.server.ts`.
- Stories 4.1-4.5 and sprint-status edits are intentional local artifacts. Preserve them and avoid unrelated formatting or generated-file changes.

### Latest Technical Information

- Zod 4 provides UUID formats, strict objects, array bounds, and refinements needed for this command fragment. Meter Reading decimals remain strings because numeric coercion would undermine precision rules. [Source: https://zod.dev/api]
- Current Next.js App Router guidance separates interactive browser state from server data access and requires serializable props across the Server/Client boundary. [Source: https://nextjs.org/docs/app/getting-started/server-and-client-components]
- Repository-pinned versions are authoritative; no framework, form, cache, or numeric dependency change is required. [Source: main-web-app/package.json; main-api/package.json]

### Project Structure Notes

- Machine mobilization schemas, normalization, selector adapter/view models, components, and tests remain under `main-web-app/src/features/projects/**`.
- The strict backend fragment and DTO tests remain under `main-api/src/modules/projects/**` until Story 4.8 supplies the public aggregate route and persistence layers.
- Fleet remains the owner of current Machine and reading selection. Keep Projects free of duplicated Machine queries and avoid speculative generic selector infrastructure.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-46-Configure-Optional-Initial-Machine-Mobilization]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-56-Allocate-a-Machine-to-a-Project]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-48-Finalize-the-Project-Aggregate-Atomically-and-Idempotently]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-49-Submit-the-Wizard-and-Recover-Finalization-Conflicts]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-19-Allocate-and-Reallocate-Machine]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-25-Capture-Optional-Mobilization]
- [Source: _bmad-output/planning-artifacts/architecture.md#Identifiers-and-Numeric-Types]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pagination]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Wizard]
- [Source: _bmad-output/brainstorming/brainstorming-session-2026-06-18-010627.md#Equipment-Integrity-20-Shift-Aware-Metered-Allocation]
- [Source: main-api/docs/PAGINATION.md]
- [Source: main-api/src/modules/fleet/fleet.dto.ts]
- [Source: main-api/src/modules/fleet/fleet.service.ts]
- [Source: main-api/src/modules/fleet/handlers/fleet.handler.ts]
- [Source: main-api/prisma/schema.prisma]
- [Source: main-web-app/src/features/machines/machines.server.ts]
- [Source: _bmad-output/implementation-artifacts/3-1-register-and-find-machines.md]
- [Source: _bmad-output/implementation-artifacts/3-2-maintain-a-monotonic-meter-reading-chain.md]
- [Source: _bmad-output/implementation-artifacts/4-1-run-a-non-resumable-local-project-wizard.md]
- [Source: _bmad-output/implementation-artifacts/4-2-capture-project-identity-and-commercial-baseline.md]
- [Source: _bmad-output/implementation-artifacts/4-3-select-the-client-and-project-responsibilities.md]
- [Source: _bmad-output/implementation-artifacts/4-4-configure-the-weekly-schedule-and-break-templates.md]
- [Source: _bmad-output/implementation-artifacts/4-5-configure-optional-initial-employee-mobilization.md]

## Security and Completeness Hardening Amendment

The following criteria are mandatory extensions of the story acceptance criteria:

- **H1 — Authoritative reading identity:** `startMeterReadingId` must still identify the latest confirmed reading for the Machine at the finalization transaction's decision point. The displayed decimal reading is never authority and is not copied into the command.
- **H2 — Current eligibility:** Trusted Company ownership, operational lifecycle, absence of another open allocation, and latest-reading identity are all revalidated in the same finalization transaction. Foreign, absent, and ineligible Machines are non-disclosing.
- **H3 — Selection across pages:** The UI exposes selected-count and selected-items views, preserves selections across cursor/search changes, and reconciles a selected item that becomes unavailable without silently replacing its reading id.
- **H4 — Stale-reading conflict:** A concurrently committed newer confirmed reading yields a stable `machine` resource conflict with reason `latest-reading-changed`; it never silently upgrades the submitted snapshot.
- **H5 — Deterministic concurrency:** Real-PostgreSQL barrier/latch tests cover two Projects allocating one Machine and a new confirmed reading racing finalization. Exactly one valid state commits and all losing aggregates roll back completely.

Tasks must add tests at 0/100/101 allocations and prove that no Machine registration, ownership, identifier, lifecycle, or reading-history row is mutated by this story.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01: Authored Machine selection from authoritative readings, transactional latest-reading checks, reading references, and availability integration. Validation remains pending by user request.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Optionality, canonical Machine selector reuse, current ownership, latest-reading snapshots, Fleet immutability, availability limitations, and atomic-finalization boundaries were reconciled.

### File List

- `main-web-app/src/features/projects/components/project-wizard.tsx`
- `main-api/src/modules/projects/projects.service.ts`
- `main-api/src/modules/fleet/fleet.service.ts`
- `main-api/prisma/schema.prisma`

### Change Log

- 2026-07-01: Created Story 4.6 implementation context for optional initial Machine mobilization.
- 2026-07-01: Added authoritative latest-reading checks, selection reconciliation, stale-reading conflicts, and race proof.
- 2026-07-01: Authored initial Machine mobilization and reading-snapshot persistence; validation gates remain pending.
