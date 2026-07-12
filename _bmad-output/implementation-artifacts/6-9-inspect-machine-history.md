# Story 6.9: Inspect Machine History

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to inspect preserved Machine ownership, allocation, Meter Reading, correction, and retirement history,
so that I can trace the asset without treating former ownership or participation as current.

## Acceptance Criteria

1. **Given** an authorized Machine detail, **when** history opens, **then** separate collections expose ownership periods, Project allocations, confirmed Meter Readings, permitted reading corrections, and retirement state/events in deterministic order.
2. **Given** a Machine was transferred, released, reallocated, retired, or a reading was corrected, **when** history renders, **then** prior Companies, Projects, values, actors, reasons, and effective instants remain visible only where authorized and recorded.
3. **Given** a reading correction exists, **when** displayed, **then** the immutable original confirmed reading remains visible, correction metadata is linked to it, and history does not present a destructive replacement or editable chain.
4. **Given** a former owning Company requests history after transfer, **when** authorized through its selected workspace, **then** it sees only ownership, allocation, reading, correction, and retirement evidence belonging to or safely attributable to its historical participation window.
5. **Given** the destination Company has private current registration or operations, **when** a former Company reads history, **then** destination-only identifiers, current ownership details, allocations, readings, and operational state are not disclosed.
6. **Given** former Companies/Projects or closed allocations are displayed, **when** history is rendered, **then** they are explicitly historical and never become current association, ownership, allocation, or selector options.
7. **Given** a collection may grow without bound, **when** paginated, **then** canonical cursors bind resource, normalized filters, ordering, Corporation, selected Company, Machine, collection, and authorized participation scope.
8. **Given** a malformed, tampered, cross-Machine, cross-Company, or foreign cursor, **when** parsed, **then** a safe validation failure returns no records and discloses no foreign existence.
9. **Given** current Machine detail and history coexist, **when** frontend data loads, **then** dedicated history handlers, DTOs, adapters, and view models are used and no historical ownership/allocation DTO is reused operationally.
10. **Given** Meter Reading values cross boundaries, **when** returned/displayed, **then** exact two-decimal strings, reading sequence, meter type/unit, actor, recorded instant, and correction reason are preserved without JavaScript-number rounding.
11. **Given** history is loading, empty, paginating, unavailable, unauthorized, or failed, **when** rendered, **then** each section preserves stable layout and loaded pages and remains distinct from current availability/ownership.
12. **Given** Company workspace changes, **when** state resets, **then** Machine identity, participation authorization, cursors, and loaded history pages are cleared before new data loads.
13. **Given** a foreign or never-participating Machine is requested, **when** history endpoints run, **then** existence is not disclosed and no partial timeline is returned.
14. **Given** tests run, **then** contract, PostgreSQL, frontend, and Playwright suites cover ownership, allocations, readings, corrections, retirement, former-owner filtering, precision, deterministic paging, cursor tampering, workspace reset, tenant isolation, and selector separation.

## Tasks / Subtasks

- [ ] Define Machine history and participation contracts (AC: 1-10, 13)
  - [ ] Add dedicated endpoints under `/api/v1/machines/:machineId/history/{ownership-periods,project-allocations,meter-readings,retirement}` with bounded `limit` and optional opaque `cursor`; embed bounded correction metadata with its reading rather than creating an ambiguous replacement timeline.
  - [ ] Define Fleet-owned history DTOs with explicit current/closed/historical state, safe Company/Project labels, exact decimal strings, reading sequence/type, and only persisted actor/reason fields.
  - [ ] Define the historical-participation authorization projection used after transfer; it must grant read scope only for evidence attributable to the selected Company's ownership/participation and never grant current operational access.
- [ ] Implement scope-filtered Fleet history handlers (AC: 2-10, 12-13)
  - [ ] Authorize current ownership or historical participation before reading any collection; compute selected-Company visibility boundaries from immutable ownership/allocation/reference evidence.
  - [ ] Apply those boundaries to every query, including readings/corrections, and redact destination-only context rather than returning partial unsafe nested objects.
  - [ ] Reuse canonical cursor parsing/building with participation scope included in the scope hash and effective/recorded boundary plus `id` keyset ordering.
  - [ ] Keep current `findMachineDetailHandler`, availability, registration, reading mutations, and operational selectors separate from history.
- [ ] Add Machine history dashboard (AC: 1-6, 9-12)
  - [ ] Add independent ownership, allocation, reading/correction, and retirement sections to Machine detail with historical badges, exact meter formatting, section-local paging/states, and no historical actions.
  - [ ] Route Kubb clients through server-only Fleet adapters/view models; preserve pages during interaction and clear them on Company change.
  - [ ] Present restricted former-owner history coherently without hinting at hidden destination records or exposing current private state.
- [ ] Prove former-owner confidentiality and evidence integrity (AC: 1-14)
  - [ ] Add contract and real-PostgreSQL fixtures covering transfers, allocations/releases/reallocations, reading references/corrections, and retirement.
  - [ ] Test ownership-window boundaries, events at exact boundaries, former-owner/destination asymmetry, never-participating/foreign Machines, precision, deterministic ties, and tampered cursors.
  - [ ] Assert history DTOs never enter selectors; add frontend/adapter and Playwright coverage and regenerate/check OpenAPI, Kubb, types, tests, and builds.

## Dev Notes

### Developer Context

- Former-owner access is the main security risk. Corporation identity alone is insufficient: every returned row and nested label must be attributable to the selected Company's historical participation.
- Meter Readings and corrections are immutable evidence. Preserve the original reading plus correction records; do not rewrite the chain or compute values through binary floating point.
- A transfer changes current ownership, not historical truth. Historical read authorization must not accidentally recreate current registration or mutation authority.

### Architecture Compliance

- Fleet owns Machine ownership, allocation, reading, correction, and retirement history. Use explicit scoped handlers rather than a generic audit service or cross-module controller calls.
- Reuse canonical cursor pagination and bind participation scope as well as tenant/Machine/collection. Keep historical and operational DTOs strictly separate.
- Preserve decimal strings, ISO instants, immutable records, safe error envelopes, OpenAPI/Kubb generation, server-only clients, and pinned dependencies.

### Current Files to Reconcile and Preserve

- `FleetService.detail()` and `findMachineDetailHandler` currently project current ownership/latest reading only. Add separate history paths rather than loading all periods into current detail.
- `MachineDetailPage` is current-state focused and has no history UI. Add sectioned history without changing availability, identifiers, meter type, or latest-reading semantics.
- `MachineOwnershipPeriod`, `ProjectMachineAllocation`, `MachineMeterReading`, `MachineMeterReadingCorrection`, references, and retirement fields/events are the evidence sources; apply selected-Company participation filters to each.
- Reuse `main-api/src/lib/utils/cursor-pagination.ts`; never use offset pagination or expose authorization facts in cursor payloads.

### Previous Story Intelligence

- Story 6.8 establishes typed history endpoints, section-local UI, cursor binding, and the rule that historical records never restore eligibility.
- Stories 5.7–5.9 define allocation movement, transfer, reading continuity, and retirement evidence. This story must display those facts without weakening their domain ownership or terminal rules.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-69-Inspect-Machine-History]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-35-Inspect-Entity-History]
- [Source: _bmad-output/planning-artifacts/architecture.md#Current-and-Historical-Queries]
- [Source: _bmad-output/implementation-artifacts/6-8-inspect-employee-history.md]
- [Source: _bmad-output/implementation-artifacts/5-8-transfer-machine-ownership-between-companies.md]
- [Source: _bmad-output/implementation-artifacts/5-9-retire-a-machine-permanently.md]
- [Source: main-api/src/modules/fleet/fleet.service.ts]
- [Source: main-api/src/modules/fleet/handlers/fleet.handler.ts]
- [Source: main-web-app/src/features/machines/components/machine-detail-page.tsx]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

