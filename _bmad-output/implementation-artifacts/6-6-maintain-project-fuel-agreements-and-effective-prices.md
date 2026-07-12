# Story 6.6: Maintain Project Fuel Agreements and Effective Prices

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to maintain Project Fuel Agreements and effective Fuel prices after Project creation,
so that current supply terms can change without overwriting the prices and agreements that applied before.

## Acceptance Criteria

1. **Given** a `PLANNED`, `ACTIVE`, or `PAUSED` Project, **when** an agreement is added, **then** one active non-removed same-Company Fuel Supplier, one or more fixed Fuel Types, and one positive four-decimal initial BRL-per-liter price per type are required and persist atomically.
2. **Given** the Supplier is inactive, removed, foreign, or missing, **when** any agreement command runs, **then** existence is not disclosed and no agreement/type/price partially persists.
3. **Given** a current agreement already exists for the Project/Supplier pair, **when** another is added, **then** a stable conflict directs maintenance of the current agreement and at most one current pair remains.
4. **Given** Diesel S10 or Diesel S500 is absent from a current agreement, **when** it is added with an initial price, **then** its current relationship and effective price open at one server transaction instant without changing other types/history.
5. **Given** a Supplier or Fuel Type is duplicated in one command, **when** validation runs, **then** a stable field error is returned and duplicates are not silently normalized.
6. **Given** a current price receives a different positive value and trimmed non-blank reason, **when** update commits, **then** the current period closes and a successor opens at one server instant with trusted actor/reason and queryable old/new values.
7. **Given** price is zero, negative, malformed, or has other than exactly four decimal places, **when** validation runs, **then** it is rejected without rounding and current price remains unchanged.
8. **Given** submitted price equals current price, **when** update is attempted, **then** a stable no-op response is returned and no duplicate period opens.
9. **Given** a current agreement is ended with trimmed non-blank reason, **when** it commits, **then** agreement and all current Fuel Type/price periods close atomically at one server instant and history remains immutable.
10. **Given** an agreement has ended, **when** Supplier operational-removal blockers are evaluated, **then** the closed agreement no longer blocks removal while historical linkage remains valid.
11. **Given** a terminal Project, **when** any agreement/type/price mutation is attempted, **then** a stable terminal conflict is returned and history remains unchanged.
12. **Given** price updates or agreement ending race, **when** commands execute, **then** one lifecycle result commits and losers receive safe stale-state conflicts without overlapping periods.
13. **Given** Supplier selection searches or paginates, **when** results load, **then** only active non-removed selected-Company Suppliers appear through canonical cursor pagination with masked documents.
14. **Given** a recoverable conflict reaches the dashboard, **when** rendered, **then** valid inputs and unrelated Project state remain and stable codes map to reselection, correction, or refresh without parsing messages.
15. **Given** tests run, **then** contract, PostgreSQL, concurrency, frontend, and Playwright suites cover creation, fixed types, price history/no-op/precision, agreement end/removal behavior, terminal/scope conflicts, races, pagination, masking, and tenant isolation.

## Tasks / Subtasks

- [ ] Complete agreement/type/price persistence and contracts (AC: 1-11)
  - [ ] Extend `ProjectFuelAgreement` and `ProjectFuelPrice` with trusted actor/reason audit through a forward migration and explicitly model the effective Agreement/Fuel Type relationship needed to add/end a type independently; do not infer type membership solely from historical price rows.
  - [ ] Preserve current Project/Supplier uniqueness, current Agreement/Fuel Type uniqueness, one current price per type, scoped FKs, non-overlap, and positive `numeric(18,4)` checks.
  - [ ] Document strict commands: `POST /api/v1/projects/:projectId/fuel-agreements`, `POST .../:agreementId/fuel-types`, `PUT .../:agreementId/fuel-types/:fuelTypeId/price`, and `POST .../:agreementId/end`, with reason required for price replacement and ending.
  - [ ] Define stable validation, duplicate/current-agreement, no-op, unavailable, terminal, stale-state, and workspace conflict categories.
- [ ] Implement atomic lifecycle commands (AC: 1-12)
  - [ ] Reread Session/Company/role, scoped non-terminal Project/current agreement, Supplier state, fixed Fuel Type catalog, and current prices inside each serializable attempt.
  - [ ] Capture one server instant per command; create agreement/types/prices together, close/open price atomically, and close agreement plus all current type/price periods together.
  - [ ] Reconcile Supplier removal through Commercial's public blocker boundary so only open agreements block removal; never call controllers across modules.
  - [ ] Translate bounded `P2034`, conditional-update, and constraint losers to stable conflicts with complete rollback.
- [ ] Add current/history contracts and maintenance UX (AC: 10, 13-14)
  - [ ] Reuse the canonical Commercial Fuel Supplier selector with active/non-removed Company scope, masked documents, and cursor pagination; use the fixed Fuel Type catalog.
  - [ ] Add current agreements/types/prices to Project detail and complete agreement/price periods to dedicated Project history in deterministic order.
  - [ ] Add Project-detail creation, type-addition, price-change, and irreversible agreement-end flows; preserve inputs after recoverable conflicts and refresh only after backend success.
- [ ] Prove financial precision and temporal integrity (AC: 1-15)
  - [ ] Add DTO/contract/service and real-PostgreSQL tests for catalog restrictions, decimal strings, audit, removal blockers, scope, immutability, and all uniqueness/open-period invariants.
  - [ ] Use barriers/latches for price-vs-price and price-vs-end races and assert non-overlap/full rollback.
  - [ ] Add frontend/action/selector and Playwright coverage; regenerate/check Prisma, OpenAPI, Kubb, types, tests, and builds.

## Dev Notes

### Developer Context

- Projects owns agreements, selected types, and effective prices; Commercial owns Supplier eligibility/removal. Keep the integration boundary explicit.
- Diesel S10 and Diesel S500 are fixed system references. Do not add free-form fuel types or silently deduplicate payloads.
- Prices cross boundaries as exact strings and persist as `numeric(18,4)`; never convert through JavaScript `number` or silently round.
- The current schema has agreements and price periods but no explicit temporal Agreement/Fuel Type membership. Add that missing concept so a type can be current/ended independently and history is unambiguous.

### Architecture Compliance

- Use authenticated tenant scope, one transaction instant, `[from,to)`, immutable closed records, serializable execution, bounded retry, database constraints, and stable canonical errors.
- Current operational detail and historical collections require separate contracts; unbounded lists use opaque canonical cursors.
- OpenAPI owns HTTP contracts, Kubb clients are generated/server-only, and Prisma/Kubb generated artifacts are never edited manually. Preserve pinned dependencies.

### Current Files to Reconcile and Preserve

- `ProjectFuelAgreement` and `ProjectFuelPrice` exist and initial finalization creates them, but audit fields and explicit type-membership periods are absent. Add forward schema/migration changes without rewriting historical migrations.
- `projects.dto.ts` already validates fixed types, duplicate IDs, four-decimal positive prices, and collection limits for the wizard. Reuse primitives in dedicated commands without widening finalization.
- `projects.service.ts` already validates Suppliers/catalog and creates initial agreement prices. Extract shared domain validation while preserving finalization idempotency and rollback semantics.
- The web wizard already renders Suppliers/fixed types/initial prices; build purpose-specific detail forms and cursor-backed selectors without sharing wizard state.

### Previous Story Intelligence

- Story 6.5 establishes complete effective snapshots, current/history separation, and safe stale-state handling. Fuel price changes use the same temporal discipline but price periods are per agreement/type.
- Story 2.5 defines operational removal semantics for Suppliers; only current agreements block removal, never closed historical links.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-66-Maintain-Project-Fuel-Agreements-and-Effective-Prices]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-16-Configure-Project-Fuel-Agreement]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/implementation-artifacts/6-5-revise-the-weekly-schedule-and-break-templates.md]
- [Source: _bmad-output/implementation-artifacts/2-5-remove-clients-and-fuel-suppliers-from-operational-use.md]
- [Source: main-api/prisma/schema.prisma#ProjectFuelAgreement]
- [Source: main-api/prisma/schema.prisma#ProjectFuelPrice]
- [Source: main-api/src/modules/projects/projects.service.ts]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

