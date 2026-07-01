---
baseline_commit: 9e243e12f17379cc0db8ccc69aa4dacb715d16e6
---

# Story 4.3: Select the Client and Project Responsibilities

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to assign the current Client, Manager, and Technical Responsibilities,
so that the Project starts with valid commercial and accountable ownership.

## Acceptance Criteria

1. **Given** the administrator opens the accountability step
   **When** selectable Clients are requested
   **Then** only active Clients from the selected Company are returned
   **And** removed, inactive, historical, sibling-Company, and foreign-Corporation Clients are excluded.

2. **Given** selectable Managers and Technical Responsibilities are requested
   **When** the Employee selectors load
   **Then** only active Employments from the selected Company are returned
   **And** operational Project allocation availability does not restrict Manager or Technical Responsibility eligibility.

3. **Given** the administrator configures accountability
   **When** the step is validated
   **Then** exactly one active Client, exactly one current Manager, and at least one current Technical Responsibility are required
   **And** duplicate Technical Responsibility selections are rejected.

4. **Given** an Employee is already a Manager or Technical Responsibility on other Projects
   **When** the Employee is selected
   **Then** selection remains permitted
   **And** no operational allocation exclusivity is consumed.

5. **Given** the same Employee is selected as Manager and Technical Responsibility
   **When** the accountability step is validated
   **Then** the relationships remain distinct and valid
   **And** each role is represented explicitly in the aggregate command.

6. **Given** a selected Client or Employee becomes inactive, removed, terminated, or foreign to the selected Company before final submission
   **When** final backend validation runs
   **Then** Project creation is rejected without partial persistence
   **And** the structured conflict identifies the affected in-scope resource and accountability step.

7. **Given** a selector is searched or paginated
   **When** additional results are requested
   **Then** it follows the canonical cursor contract
   **And** documents remain masked.

8. **Given** a foreign or stale selector cursor is submitted
   **When** the backend validates it
   **Then** a stable validation error is returned
   **And** foreign entity existence is not disclosed.

9. **Given** the administrator reviews accountability
   **When** selected entities are displayed
   **Then** the view uses safe names and masked identifiers where needed
   **And** provides an edit action that returns to the accountability step.

10. **Given** accountability behavior is tested
    **When** frontend, contract, and PostgreSQL integration tests run
    **Then** they cover required cardinality, multi-Project responsibilities, role independence from allocations, duplicate prevention, eligibility changes before submission, scoped selectors, masked documents, and safe conflicts.
    **And** every accepted accountability set has one Manager and at least one Technical Responsibility.

## Tasks / Subtasks

- [ ] Add the accountability step to the existing Project wizard command model (AC: 3-6, 9-10)
  - [ ] Extend the Project-owned local form and normalized aggregate fragment from Stories 4.1 and 4.2; do not add Project behavior to `CompanyResourcePage` or generic modal primitives.
  - [ ] Represent accountability as `clientId`, `managerEmploymentId`, and `technicalResponsibilityEmploymentIds` in the normalized command fragment.
  - [ ] Require one UUID for Client, one Employment UUID for Manager, and 1-20 unique Employment UUIDs for Technical Responsibilities. Twenty is valid; twenty-one is rejected before submission.
  - [ ] Reject duplicates only inside `technicalResponsibilityEmploymentIds`. Explicitly permit `managerEmploymentId` to also appear in that collection because the relationships are distinct.
  - [ ] Keep safe display metadata in selector view models, separate from the identifier-only command fragment; never submit names, documents, Company scope, or availability labels as authority.
  - [ ] Keep all selections browser-local and editable. This story creates no Project, Client period, Manager tenure, Technical Responsibility period, idempotency record, or backend draft.

- [ ] Reuse the existing canonical Client selector source (AC: 1, 7-8)
  - [ ] Query the existing generated `GET /api/v1/clients` client through a Project-owned server query/action and adapter, using name sorting, selected-Company scope, search, limit, and cursor.
  - [ ] Do not add a parallel Client selector route: the existing registry list already excludes removed records, scopes queries, returns masked documents, and implements bound cursors.
  - [ ] Adapt each result to a serializable selector view model containing only the Client id, safe display name, entity type if useful for presentation, and masked document.
  - [ ] Support loading, empty, search, additional-page, and safe-error states without copying the complete registry into wizard state.
  - [ ] Reset search pages and selection when Company context changes as required by Story 4.1.

- [ ] Reuse the existing canonical Employee selector source without allocation filtering (AC: 2, 4-5, 7-8)
  - [ ] Query the generated `GET /api/v1/employees` client with `state=active`, name sorting, search, limit, and cursor through Project-owned server boundaries.
  - [ ] Do not send `availability=available`: Manager and Technical Responsibility eligibility is independent from operational allocation availability.
  - [ ] Use the Employment id, not Person id, in both responsibility fields because responsibilities attach to the active Company Employment.
  - [ ] Adapt only safe display name, Company registration number when useful, masked document, and Employment id; never expose plaintext CPF or credentials to Client Components.
  - [ ] Use the same Employee result source for both roles while maintaining independent Manager and Technical Responsibility controls.

- [ ] Add an API-ready accountability schema fragment without premature persistence (AC: 3-6, 10)
  - [ ] Extend `main-api/src/modules/projects/**` with a strict Zod fragment for the three identifier fields and the inclusive 1-20 Technical Responsibility limit.
  - [ ] Keep `corporationId`, `companyId`, actor, Session, Project status, effective timestamps, and audit data outside the payload; they come from trusted context or later transaction output.
  - [ ] Keep relationship ids explicit rather than encoding a generic role array that could blur Manager and Technical Responsibility cardinality.
  - [ ] Add colocated DTO tests proving required fields, UUID shape, duplicate rejection, upper bounds, and Manager/Technical overlap acceptance.
  - [ ] Defer eligibility revalidation, resource conflict construction, temporal rows, database constraints, and atomic persistence to Story 4.8. Do not register a Projects finalization route or migration here.

- [ ] Render selection and review accessibly (AC: 3, 7, 9)
  - [ ] Provide searchable, keyboard-operable controls with programmatic labels, visible focus, readable pending/empty/error states, and field-level cardinality errors.
  - [ ] Prevent one Employee from being added twice as a Technical Responsibility and allow removal without clearing the Manager selection.
  - [ ] Derive review rows from the current normalized ids joined to safe local selector view models; never read labels from the DOM or retain transport DTOs as the command.
  - [ ] Display masked identifiers only, and provide an edit action that returns to the accountability step with values and wizard-session idempotency key preserved.
  - [ ] Preserve responsive modal layout and avoid unbounded option rendering; cursor pages are requested through the server boundary.

- [ ] Prove selector and accountability behavior (AC: 1-10)
  - [ ] Frontend schema tests cover missing Client/Manager/Technical Responsibilities, duplicate Technical ids, 1 and 20 accepted ids, 21 rejected ids, and same Employee in both roles.
  - [ ] Adapter tests prove Client and Employee transport DTOs become safe selector view models and plaintext documents never enter component props.
  - [ ] Component tests cover loading, empty, search, cursor append, selection, duplicate prevention, removal, validation focus, review formatting, editing, and Company-change reset.
  - [ ] Extend real-PostgreSQL Commercial and Workforce tests only where needed to prove active/current selection, sibling-Company and foreign-Corporation exclusion, masked documents, query-bound cursors, and non-disclosing invalid cursors.
  - [ ] Prove Employee responsibility queries omit the allocation-availability filter and remain eligible when an Employee has other Project responsibilities.
  - [ ] Add Project wizard Playwright coverage for selecting one Client, one Manager, multiple Technical Responsibilities, review/edit navigation, responsive behavior, and absence of Project persistence.
  - [ ] Run focused API/frontend tests, API and frontend typecheck/lint, production builds, contract-drift checks when applicable, and the relevant Playwright journey.

## Dev Notes

### Developer Context

- Story 4.3 adds the first server-backed selectable relationships to the local wizard. It builds on the shell/session behavior in Story 4.1 and the normalized Project command fragment in Story 4.2.
- Existing Client and Employee registry endpoints already provide canonical cursor pagination, trusted Company scope, search, active/current filtering, and masked list documents. Wrap and adapt them inside Projects instead of introducing duplicate endpoints or handwritten transport contracts.
- Responsibilities are accountability relationships, not operational allocations. Never use allocation availability to disqualify a Manager or Technical Responsibility and never mutate Employee allocation state in this story.
- Final submission remains Story 4.8/4.9 work. Story 4.3 defines local capture, safe reads, contract fragments, and proof of selector guarantees only.

### Technical Requirements

- The normalized fragment is identifier-only: `clientId`, `managerEmploymentId`, `technicalResponsibilityEmploymentIds`.
- Technical Responsibility ids are a unique ordered collection of 1-20 Employment UUIDs. Preserve user order for stable review; persistence may apply deterministic database ordering later.
- Manager and Technical Responsibility are separate domain roles. The same Employment may occupy both roles and may hold either role on multiple Projects.
- List documents stay masked. Full CPF/CNPJ values must not enter wizard props, local state, URLs, cursors, logs, or errors.
- A stale or foreign cursor must fail through the existing stable cursor-validation path; never fall back to an unscoped first page.

### Architecture Compliance

- Use `page -> projects feature -> server query/action -> adapter/view model -> generated client`; generated clients and credentials remain server-only.
- Reuse `/api/v1/clients` and `/api/v1/employees`; do not handwrite request/response types or edit generated Kubb files.
- Frontend validation is immediate feedback only. Story 4.8 must re-read all ids under trusted Corporation/Company scope inside the aggregate transaction.
- Keep frontend business state in the open React Hook Form wizard, not Zustand, URL state, localStorage, sessionStorage, or a backend draft.
- Preserve non-disclosing `404`/validation behavior and stable structured errors. Future finalization conflicts belong under authorized `details.resources` and map to the accountability step.

### Library and Framework Requirements

- Use repository-pinned Next.js `16.2.9`, React `19.2.4`, React Hook Form `^7.79.0`, Zod `^4.4.3`, Vitest `4.1.9`, and Playwright `1.61.1`; do not upgrade dependencies for this story.
- Use React Hook Form controlled fields or field arrays for Technical Responsibilities, with stable UI keys that are not confused with Employment ids.
- Use Zod array bounds plus an explicit uniqueness refinement with a field path that the active wizard step can focus and announce.

### Current Files to Reconcile and Preserve

- Extend the Projects frontend feature created by Story 4.1 and the Projects DTO fragment created by Story 4.2; keep schemas, adapters, selector boundaries, components, and tests in their owning features.
- `main-web-app/src/features/commercial-registry/commercial-registry.server.ts` and `main-web-app/src/features/employees/employees.server.ts` demonstrate the generated-client list boundary. Reuse their conventions without importing server-only modules into Client Components.
- `main-api/src/modules/commercial/**` and `main-api/src/modules/workforce/**` own registry reads. Preserve controller-service-handler boundaries and change them only if a missing AC cannot be proven through their existing contracts.
- Preserve Fleet, Commercial, Workforce, authentication, Company-selection, generated-client, and pagination behavior. Do not touch unrelated local story artifacts.

### Testing Requirements

- Use component-level fixtures with masked synthetic identifiers; never place real CPF/CNPJ values in tests.
- PostgreSQL tests are required for selector scope and current-state behavior. Pure mocks cannot prove Company isolation, operational removal, or cursor binding.
- Backend Projects DTO tests prove command shape only; they must not claim that final eligibility or persistence exists before Story 4.8.
- Playwright must verify no Project row or relationship is created while navigating, editing, or abandoning this step.

### Previous Story Intelligence

- Story 4.2 establishes one normalized local aggregate model, review derived from that model, exact string/civil-date handling, and an API-ready Projects DTO fragment without a public route. Extend that model and schema rather than creating a second form or endpoint.
- Story 4.1 owns wizard lifecycle, confirmed discard, focus, step validation, Company-change invalidation, and one session idempotency key. Accountability editing must preserve those invariants.
- Existing registry implementations already isolate transport DTOs behind server-only generated clients and adapters; this story applies that pattern inside the Project wizard.

### Git Intelligence Summary

- Baseline `9e243e1` contains hardened Fleet patterns plus the current Commercial and Workforce cursor-paginated registries used by this story.
- Recent registry commits place Zod DTO tests beside DTOs, PostgreSQL scope/concurrency tests under `main-api/tests/integration`, and generated-client consumption behind frontend server modules.
- Stories 4.1 and 4.2 are current uncommitted implementation artifacts and are intentional predecessors; preserve them and the existing sprint-status changes.

### Latest Technical Information

- The installed Next.js 16 documentation requires serializable props across the Server/Client boundary and reserves Client Components for interactive browser behavior. Selector view models must therefore be plain serializable data. [Source: main-web-app/node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md]
- The installed Next.js testing guide recommends Vitest/RTL for synchronous Client Components and Playwright for async Server Component flows. [Source: main-web-app/node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md]
- Repository versions are authoritative for implementation. No dependency upgrade is required or authorized by this story. [Source: main-web-app/package.json; main-api/package.json]

### Project Structure Notes

- Project selector queries/actions, adapters, safe view models, accountability components, and tests remain under `main-web-app/src/features/projects/**`.
- The identifier-only backend schema fragment and tests remain under `main-api/src/modules/projects/**` until Story 4.8 adds the public aggregate route and persistence layers.
- Do not create generic selector infrastructure until at least two implemented features demonstrate the same UI contract; reuse existing pagination primitives at their current boundaries.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-43-Select-the-Client-and-Project-Responsibilities]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Create-a-Complete-and-Consistent-Project]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-23-Capture-Required-Project-Accountability]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pagination]
- [Source: _bmad-output/planning-artifacts/architecture.md#Forms-and-Validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Wizard]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: main-api/docs/PAGINATION.md]
- [Source: main-api/src/modules/commercial/commercial.dto.ts]
- [Source: main-api/src/modules/workforce/workforce.dto.ts]
- [Source: main-web-app/src/features/commercial-registry/commercial-registry.server.ts]
- [Source: main-web-app/src/features/employees/employees.server.ts]
- [Source: _bmad-output/implementation-artifacts/4-1-run-a-non-resumable-local-project-wizard.md]
- [Source: _bmad-output/implementation-artifacts/4-2-capture-project-identity-and-commercial-baseline.md]

## Security and Completeness Hardening Amendment

The following criteria are mandatory extensions of the story acceptance criteria:

- **H1 — Responsibility cardinality:** `technicalResponsibilities` contains 1-20 entries, unique by `employmentId`. The Manager remains exactly one separate responsibility; Manager selection neither satisfies nor conflicts with the Technical Responsibility minimum.
- **H2 — Eligibility at commit:** Every Client and Employment is revalidated inside finalization against trusted Corporation/Company scope, active lifecycle and current employment period. A valid Employment may simultaneously be Manager, Technical Responsibility, and/or initial Employee allocation when each role's independent rules are satisfied.
- **H3 — Workspace precondition:** Selector reads and final submission belong to the immutable expected Company captured when the wizard opened. Browser ids do not choose tenant scope, and foreign or absent ids produce the same non-disclosing response.
- **H4 — Conflict precision:** Authorized conflict resources distinguish `client`, `manager`, and `technicalResponsibility`; an Employment id alone is insufficient for routing. Tests prove that only the affected subsection is highlighted while unrelated selections remain intact.
- **H5 — Concurrency:** Real-PostgreSQL barrier/latch tests cover concurrent employment deactivation and scope/period changes between selection and finalization.

Tasks must add the inclusive cardinality limit, discriminator contract, trusted-scope revalidation, and deterministic race tests to the local fragment and Story 4.8 integration fixtures.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01: Authored Client/Employment selector adapters, accountability controls, cardinality validation, and transactional revalidation. Validation remains pending by user request.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Existing Client and Employee cursor contracts, scope/masking behavior, responsibility semantics, predecessor stories, and test boundaries were reconciled.

### File List

- `main-web-app/src/features/projects/projects.server.ts`
- `main-web-app/src/features/projects/components/project-wizard.tsx`
- `main-api/src/modules/projects/projects.service.ts`

### Change Log

- 2026-07-01: Created Story 4.3 implementation context for Project Client and responsibility selection.
- 2026-07-01: Added responsibility cardinality, independent-role semantics, trusted-scope revalidation, and race proof.
- 2026-07-01: Authored accountability selection and backend eligibility checks; validation gates remain pending.
