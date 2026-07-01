---
baseline_commit: 9e243e12f17379cc0db8ccc69aa4dacb715d16e6
---

# Story 4.7: Configure Optional Project Fuel Agreements

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to optionally configure Project-specific Fuel Suppliers, Fuel Types, and initial prices,
so that fuel terms belong to the Project without creating Company-wide product or price assumptions.

## Acceptance Criteria

1. **Given** the administrator reaches fuel configuration
   **When** no Fuel Agreement is added
   **Then** the wizard remains valid
   **And** Project creation is not blocked.

2. **Given** Fuel Supplier candidates are requested
   **When** the selector loads
   **Then** only active Fuel Suppliers from the selected Company are returned
   **And** suppliers from another Company cannot be associated.

3. **Given** a Fuel Agreement is added
   **When** it is configured
   **Then** one active Fuel Supplier and at least one of Diesel S10 or Diesel S500 are selected
   **And** each selected Fuel Type has a positive BRL-per-liter price represented with four decimal places.

4. **Given** a fuel price is `"0.0000"`, negative, or has scale beyond four decimal places
   **When** validation runs
   **Then** the price is rejected
   **And** no silent rounding or default price is applied.

5. **Given** the same Fuel Supplier is selected
   **When** agreements for different Projects are created
   **Then** Fuel Types and prices remain Project-specific
   **And** no Company-wide product or price assumption is created.

6. **Given** the same Supplier and Fuel Type are duplicated inside the same new Project command
   **When** the step is validated
   **Then** duplication is rejected with a stable field-level validation code
   **And** the dashboard preserves the entries so the administrator can choose the single intended price.

7. **Given** a selected Fuel Supplier becomes inactive, removed, or foreign before final submission
   **When** final backend validation runs
   **Then** the conflict identifies the affected Supplier and fuel subsection
   **And** unrelated valid wizard values are preserved in the browser.

8. **Given** the Fuel Supplier selector uses search or pagination
   **When** more results are requested
   **Then** they follow canonical cursor semantics and trusted scope
   **And** Company changes invalidate every loaded Supplier and agreement.

9. **Given** fuel configuration is tested
   **When** frontend, contract, and PostgreSQL integration tests run
   **Then** they cover no agreements, same-Company Suppliers, fixed Fuel Types, four-decimal prices, duplicate agreements, Project-specific terms, pagination, stale eligibility, and conflict mapping
   **And** Fuel Agreements remain optional.

## Tasks / Subtasks

- [ ] Add optional Fuel Agreements to the existing local Project command (AC: 1, 3-7, 9)
  - [ ] Extend the Project wizard and normalized aggregate established by Stories 4.1-4.6; do not create a parallel form or place fuel behavior in generic modal components.
  - [ ] Represent the section as `projectFuelAgreements`, an ordered collection of zero through ten agreements. Ten is valid; eleven is rejected before submission.
  - [ ] Use `{ fuelSupplierId, fuelTypes: [{ fuelTypeId, pricePerLiter }] }` for each agreement.
  - [ ] Require one unique Supplier per agreement, one or two unique Fuel Types per Supplier, and reject duplicate Supplier/Fuel Type pairs anywhere in the command rather than silently merging them.
  - [ ] Keep safe display metadata separate from the command; Supplier names, masked documents, Fuel Type labels, Company scope, and formatted prices are not transport authority.
  - [ ] Keep every agreement browser-local and editable. This story creates no Project, Fuel Agreement, Fuel Type relationship, effective price period, idempotency completion, or backend draft.

- [ ] Validate the fixed Fuel Type and price contract precisely (AC: 3-6, 9)
  - [ ] Accept only immutable ids `diesel-s10` and `diesel-s500`; do not introduce generic fuels, Supplier-owned products, units other than BRL per liter, or editable catalog labels.
  - [ ] Require at least one selected Fuel Type for each agreement and associate exactly one price with every selected type.
  - [ ] Normalize accepted `pricePerLiter` values to positive decimal strings with exactly four fractional digits, compatible with PostgreSQL `numeric(18,4)`.
  - [ ] Reject `"0.0000"`, negatives, exponent notation, grouping separators, non-digits, more than 14 integral digits, and scale beyond four without rounding or defaulting.
  - [ ] Never parse prices through JavaScript binary arithmetic. Display formatting must not replace the canonical decimal string.
  - [ ] Treat initial prices as Project-specific effective terms. Do not add prices to Fuel Supplier records or infer that the same terms apply to another Project.

- [ ] Reuse the canonical paginated Fuel Supplier list (AC: 2, 7-9)
  - [ ] Query generated `GET /api/v1/fuel-suppliers` through a Project-owned server query/action and adapter with name sorting, search, limit, and cursor.
  - [ ] Do not use `/api/v1/fuel-suppliers/selectors/active` for this step: it is active and scoped but lacks the cursor contract required by this story.
  - [ ] Reuse the canonical list's active-only predicate, selected-Company scope, query-bound cursor, masked document, and deterministic ordering; do not add another Supplier selector route.
  - [ ] Adapt results to a serializable safe view model containing Supplier id, display/trade name, entity type when useful, and masked document.
  - [ ] Support loading, empty, search, cursor append, and safe-error states. Changing search restarts from the first page instead of replaying a stale cursor.
  - [ ] Reset loaded pages, selections, Fuel Types, and prices when the trusted selected-Company epoch changes.

- [ ] Expose the immutable Fuel Type catalog through a bounded read contract (AC: 3, 9)
  - [ ] Add `GET /api/v1/fuel-types` under the Commercial module, returning active Diesel S10 and Diesel S500 entries in deterministic id order.
  - [ ] Use the architecture's fixed immutable catalog exception: return a bounded array without cursor pagination and document the hard maximum below 100 records.
  - [ ] Keep `FuelType` seeds in `main-api/prisma/seeds/reference-data.ts` authoritative and idempotent; do not create, rename, deactivate, or duplicate catalog rows from the wizard.
  - [ ] Define the Fastify response schema, regenerate OpenAPI/Kubb, and consume the generated server-only client. Do not handwrite a permanent cross-application catalog DTO.
  - [ ] Keep this endpoint read-only and Company-independent while still requiring authenticated operational access; it exposes no tenant data.

- [ ] Add an API-ready Fuel Agreement fragment without premature persistence (AC: 1, 3-7, 9)
  - [ ] Extend `main-api/src/modules/projects/**` with strict Zod schemas for agreements, nested Fuel Types, decimal prices, duplicate detection, and inclusive zero-to-ten bounds.
  - [ ] Emit deterministic field paths for duplicate Supplier, duplicate Fuel Type, missing Fuel Type, invalid catalog id, and invalid price so Story 4.9 can focus the affected row.
  - [ ] Keep Corporation, Company, Project id/status, actor, Session, effective timestamps, history ids, and reason outside the payload; they come from trusted context or Story 4.8 output.
  - [ ] Keep frontend and backend schema behavior aligned through equivalent fixtures without importing runtime source between applications.
  - [ ] Do not add a Project mutation route, Fuel Agreement migration, or persistence handler here. Story 4.8 composes and persists this fragment atomically.

- [ ] Render accessible agreement editing and review (AC: 1-8)
  - [ ] Provide keyboard-operable Supplier search and cursor loading with programmatic labels, visible focus, and readable empty/error states.
  - [ ] Render stable field-array rows for agreements and nested Fuel Types; UI-only keys must not enter the normalized command.
  - [ ] Prevent selecting one Supplier twice, prevent selecting one Fuel Type twice for that Supplier, and preserve every entered price when another row is corrected.
  - [ ] Derive review rows from the normalized command joined to safe Supplier and catalog view models; show masked documents and formatted BRL/L without replacing ids or canonical strings.
  - [ ] Show an explicit optional empty summary and provide an edit action that returns to fuel configuration with the wizard-session key preserved.
  - [ ] Keep responsive layouts compact and load Suppliers progressively instead of copying the complete registry into client state.

- [ ] Prove optional Project Fuel Agreement behavior (AC: 1-9)
  - [ ] Schema-test zero, one, ten, and eleven agreements; zero, one, and two Fuel Types; duplicate Suppliers/pairs/types; fixed ids; and all price boundaries/invalid forms.
  - [ ] Contract-test the bounded Fuel Type endpoint, deterministic seeds, generated client, and active-only paginated Supplier list.
  - [ ] Adapter/component-test masking, search, cursor append, selection, nested edits, duplicate recovery, removal, empty/populated review, edit return, and Company reset.
  - [ ] Extend PostgreSQL Commercial tests for active/current Supplier scope, removed exclusion, cursor binding, deterministic Fuel Type seeds, and foreign non-disclosure.
  - [ ] Carry stale Supplier, Project-specific persistence, duplicate database constraints, rollback, and price-period scenarios forward as mandatory Story 4.8 tests.
  - [ ] Add Project wizard Playwright coverage for skipping fuel configuration, configuring S10/S500 prices, validation recovery, review/edit, responsive behavior, and absence of Project/agreement persistence.
  - [ ] Run focused API/frontend tests, typecheck, lint, OpenAPI/Kubb generation and drift checks, builds, and relevant Playwright cases when this story is implemented.

## Dev Notes

### Developer Context

- Story 4.7 completes the browser-local aggregate before finalization. Fuel Agreements are optional, but every included agreement must be complete and Project-specific.
- The canonical `/fuel-suppliers` list already excludes removed records and provides cursor pagination. The older active selector is not suitable because it cannot satisfy cursor traversal.
- Diesel S10 and Diesel S500 already exist as deterministic reference seeds. The missing capability is a bounded generated read contract for the wizard.
- Story 4.8 owns the first persisted agreement, Fuel Type relationship, and effective price period; Story 6.6 owns later lifecycle changes.

### Technical Requirements

- Canonical fragment: `projectFuelAgreements: Array<{ fuelSupplierId, fuelTypes: Array<{ fuelTypeId, pricePerLiter }> }>` with 0-10 unique Suppliers.
- Each agreement has one or two unique fixed Fuel Types. Every price is positive, exactly four-decimal, and compatible with `numeric(18,4)`.
- At most one current agreement may exist per Project/Supplier. Different Projects may use the same Supplier with independent Fuel Types and prices.
- Duplicate input is invalid, not normalized. Safe field errors must preserve the original rows for correction.
- Final authority comes from ids plus trusted scope and current database state, never labels or browser-provided ownership.

### Architecture Compliance

- Use `page -> projects feature -> server query/action -> adapter/view model -> generated client`; generated clients and credentials remain server-only.
- Commercial owns Supplier/current catalog reads; Projects owns local aggregate composition and later Project-specific agreement persistence.
- Keep interactive state in React Hook Form/Zod and browser memory. Do not use Zustand, URL persistence, local storage, or backend drafts.
- Precision-sensitive prices cross boundaries as strings. CPF/CNPJ remains masked and absent from URLs, logs, errors, and command payloads.
- Story 4.8 must revalidate every Supplier and fixed Fuel Type in one transaction and return authorized resource details on conflict.

### Library and Framework Requirements

- Use repository-pinned Fastify `^5.8.5`, Prisma `^7.8.0`, Next.js `16.2.9`, React `19.2.4`, React Hook Form `^7.79.0`, Zod `^4.4.3`, Vitest `4.1.9`, and Playwright `1.61.1`.
- Use field arrays with UI keys distinct from domain ids and strict Zod refinements with explicit nested paths.
- Do not add a decimal library, server-state cache, editable catalog dependency, or new form framework.

### Current Files to Reconcile and Preserve

- Extend the Projects feature and API DTO fragments described by Stories 4.1-4.6; these runtime files depend on predecessor implementation order.
- Reuse `main-web-app/src/features/commercial-registry/commercial-registry.server.ts` conventions for `/fuel-suppliers`, but keep Project-specific adapters under Projects.
- Extend `main-api/src/modules/commercial/**` only for the bounded Fuel Type read. Preserve existing registry create/list/detail/removal and legacy selector contracts.
- Preserve `main-api/prisma/schema.prisma` FuelType identities and `prisma/seeds/reference-data.ts`; add no Project/Fuel Agreement tables before Story 4.8.

### Testing Requirements

- Frontend/backend schema fixtures must agree on catalog ids, nested uniqueness, bounds, and four-decimal prices.
- Real PostgreSQL proves Supplier scope, removal exclusion, catalog identity, and cursor behavior; Story 4.8 proves agreement persistence and transaction races.
- Use synthetic masked documents only and assert plaintext CPF/CNPJ never reaches wizard props or snapshots.
- Playwright proves local optional configuration and no persistence before final submission.

### Previous Story Intelligence

- Story 4.6 establishes optional bounded collections, server-only selectors, exact decimal strings, and honest deferral of persistence. Apply the same pattern here.
- Story 4.5 establishes nested term validation and preservation of unrelated rows during recovery.
- Stories 4.1-4.4 own local session lifecycle, normalized aggregate state, review/edit navigation, and schema parity.
- Story 2.4 created Supplier registries and Fuel Type seeds; Story 2.5 removes Suppliers from operational use. Reuse those current-state predicates rather than duplicating them.

### Git Intelligence Summary

- Baseline `9e243e1` contains the implemented Commercial registry, deterministic Fuel Type seeds, canonical cursor lists, removal lifecycle, generated clients, and integration tests used by this story.
- Recent vertical slices preserve controller-service-handler layering, generated-contract ownership, and real-PostgreSQL scope tests.
- Stories 4.1-4.6 and sprint-status edits are intentional local artifacts and must remain untouched except for adding this successor.

### Latest Technical Information

- Zod 4 supports strict nested objects, array bounds, transforms, and refinements required for this fragment; fuel prices remain strings to avoid binary precision loss. [Source: https://zod.dev/api]
- Current Next.js App Router guidance keeps interactive state in Client Components and generated API access behind server boundaries. [Source: https://nextjs.org/docs/app/getting-started/server-and-client-components]
- Repository versions and generated OpenAPI/Kubb contracts remain authoritative; dependency upgrades are outside this story. [Source: main-api/package.json; main-web-app/package.json]

### Project Structure Notes

- Fuel agreement schemas, normalization, selector adapters, components, review models, and tests remain under `main-web-app/src/features/projects/**`.
- The strict agreement fragment stays under `main-api/src/modules/projects/**`; the bounded catalog read stays in Commercial.
- Do not create a generic procurement, product, or selector framework. The MVP contract is deliberately limited to two fixed diesel types.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-47-Configure-Optional-Project-Fuel-Agreements]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-66-Maintain-Project-Fuel-Agreements-and-Effective-Prices]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-16-Configure-Project-Fuel-Agreement]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pagination]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Wizard]
- [Source: _bmad-output/planning-artifacts/architecture.md#Identifiers-and-Numeric-Types]
- [Source: main-api/docs/PAGINATION.md]
- [Source: main-api/prisma/seeds/reference-data.ts]
- [Source: main-api/src/modules/commercial/commercial.dto.ts]
- [Source: main-api/src/modules/commercial/commercial.service.ts]
- [Source: main-api/src/modules/commercial/handlers/commercial-registry.handler.ts]
- [Source: main-web-app/src/features/commercial-registry/commercial-registry.server.ts]
- [Source: _bmad-output/implementation-artifacts/2-4-register-and-find-fuel-suppliers.md]
- [Source: _bmad-output/implementation-artifacts/2-5-remove-clients-and-fuel-suppliers-from-operational-use.md]
- [Source: _bmad-output/implementation-artifacts/4-1-run-a-non-resumable-local-project-wizard.md]
- [Source: _bmad-output/implementation-artifacts/4-6-configure-optional-initial-machine-mobilization.md]

## Security and Completeness Hardening Amendment

The following criteria are mandatory extensions of the story acceptance criteria:

- **H1 — Versioned fixed catalog:** The finalization contract accepts only `diesel-s10` and `diesel-s500` under catalog version `fuel-types:v1`. The API validates these immutable ids against seeded active catalog rows; a missing/inconsistent seed is a terminal service/configuration failure, not an invitation to create or rename a Fuel Type.
- **H2 — Price capacity:** `pricePerLiter` is a positive canonical decimal string with exactly four fractional digits and at most 14 integral digits, matching `numeric(18,4)`. Zero, negative, exponent, over-scale, over-capacity, and rounded inputs are rejected.
- **H3 — Conflict precision:** Authorized resources distinguish `fuelSupplier` from `fuelType` and include the affected Fuel Agreement subsection. Foreign/absent Supplier ids and unauthorized existence remain indistinguishable.
- **H4 — Independent cadastral terms:** Fuel agreement prices are cadastral terms only. Do not derive budget totals, Machine compatibility, consumption, inventory, or purchasing rules in Epic 4.
- **H5 — Boundary and race tests:** Cover 0/10/11 agreements, one-or-more Fuel Types, duplicate Supplier and Supplier/Fuel Type pairs, both catalog ids, price capacity, supplier deactivation, catalog inconsistency, and concurrent eligibility changes.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01: Authored fixed Fuel Type API, Supplier selection, exact price schemas, agreement persistence, and removal blockers. Validation remains pending by user request.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Optionality, canonical Supplier pagination, immutable Fuel Type catalog access, nested uniqueness, exact four-decimal prices, Project-specific ownership, and Story 4.8 persistence boundaries were reconciled.

### File List

- `main-api/src/modules/commercial/commercial.controller.ts`
- `main-api/src/modules/commercial/handlers/commercial-registry.handler.ts`
- `main-web-app/src/features/projects/components/project-wizard.tsx`
- `main-api/artifacts/openapi.json`

### Change Log

- 2026-07-01: Created Story 4.7 implementation context for optional Project Fuel Agreements.
- 2026-07-01: Versioned the fixed catalog and added price capacity, conflict discrimination, exclusions, and race tests.
- 2026-07-01: Authored Fuel Type read contract and Project Fuel Agreements; validation gates remain pending.
