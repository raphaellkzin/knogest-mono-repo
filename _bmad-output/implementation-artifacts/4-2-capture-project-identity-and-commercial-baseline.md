---
baseline_commit: e86526f75f3267666f2b0a941fae5a560d7aacd4
---

# Story 4.2: Capture Project Identity and Commercial Baseline

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to enter the Project's identity, location, contract reference, budget, and planned dates,
so that the Project has the minimum cadastral and commercial baseline required for planning.

## Acceptance Criteria

1. **Given** the administrator is on the Project identity step
   **When** valid data is entered
   **Then** the step captures Project name, required address, optional coordinates, optional contract number, approved budget, planned start date, and planned end date.
   **And** every value remains editable before final submission.

2. **Given** the Project name or address is blank
   **When** the administrator attempts to advance
   **Then** the step remains active
   **And** the missing fields receive readable validation.

3. **Given** coordinates are omitted
   **When** the step is validated
   **Then** omission is accepted
   **And** no placeholder latitude or longitude is generated.

4. **Given** coordinates are provided
   **When** validation runs
   **Then** latitude and longitude must be valid geographic decimal values
   **And** their API representation does not introduce binary floating-point persistence errors.

5. **Given** a contract number is omitted
   **When** validation runs
   **Then** omission is accepted.
   **And** no placeholder contract number is generated.

6. **Given** a contract number matches another Project in the Company
   **When** the wizard is finalized later
   **Then** duplication is permitted
   **And** the normalized contract number remains available for Project search.

7. **Given** an approved budget is submitted
   **When** it crosses the API boundary
   **Then** it uses a normalized decimal string with BRL two-decimal precision
   **And** it remains cadastral reference without triggering cost calculations.

8. **Given** the approved budget is exactly `"0.00"`
   **When** the step is validated
   **Then** the value is accepted as a non-negative cadastral reference
   **And** a negative value or scale beyond two decimal places is rejected rather than silently rounded.

9. **Given** the planned end date precedes the planned start date
   **When** the step is validated
   **Then** advancement is blocked
   **And** the date relationship receives a clear validation message.

10. **Given** planned dates are submitted
    **When** they are represented in the contract and persistence
    **Then** they use civil `YYYY-MM-DD` dates
    **And** server-local time cannot shift either date.

11. **Given** the administrator reviews the wizard
    **When** identity and baseline values are displayed
    **Then** the formatted view is derived from the current local command model
    **And** the administrator can navigate directly back to this step to edit it.

12. **Given** identity and baseline behavior is tested
    **When** frontend and API schema tests run
    **Then** they cover required fields, optional coordinates, coordinate validation, optional non-unique contract number, decimal budget precision, date ordering, civil-date serialization, and review editing.
    **And** no test treats budget as calculated cost.

## Tasks / Subtasks

- [ ] Extend the Story 4.1 wizard with the canonical identity/baseline step (AC: 1-12)
  - [ ] Build on the Project-owned feature and local session from Story 4.1; do not put Project fields back into the generic `CompanyResourcePage` or generic modal components.
  - [ ] Replace the prototype `location` concept with the accepted `address` field and remove prototype manager, phase, progress, and status fields from this step and review.
  - [ ] Define one local form model and one normalized command fragment covering `name`, `address`, optional `latitude`, optional `longitude`, optional `contractNumber`, `approvedBudget`, `plannedStartDate`, and `plannedEndDate`.
  - [ ] Keep all values editable until Story 4.9 submits the aggregate. This story creates no Project, Project Baseline, API route, idempotency completion, or database row.

- [ ] Implement precise identity and location validation (AC: 1-6)
  - [ ] Trim Project name and address and reject values that are empty after trimming. Do not invent structured address fields or geocoding in the MVP.
  - [ ] Treat coordinates as one optional pair: both latitude and longitude are absent, or both are present. A partial pair is invalid and must identify the missing companion field.
  - [ ] Accept signed, finite, ordinary decimal strings only: no exponent notation, `NaN`, `Infinity`, locale grouping, or placeholder values.
  - [ ] Validate latitude inclusively within `[-90, 90]` and longitude inclusively within `[-180, 180]`; retain the exact normalized strings in the command model and never convert them to JavaScript numbers for transport or persistence.
  - [ ] Permit numeric conversion only for a non-persisted finite/range check if the exact original string remains authoritative; do not round, truncate, or rewrite coordinate precision.
  - [ ] Trim an entered contract number and map a blank value to explicit `null` in the command fragment. Do not add uniqueness validation, availability calls, or placeholder contract numbers; duplicate values are valid by design.

- [ ] Implement decimal-safe budget and civil-date validation (AC: 7-10)
  - [ ] Keep budget input/form state as a string and normalize accepted input to a canonical non-negative decimal string with exactly two fractional digits for the command model.
  - [ ] Accept zero as `"0.00"`; reject negative signs, exponent notation, non-digits, and more than two fractional digits. Never silently round a submitted value.
  - [ ] Do not parse budget through `number`, `parseFloat`, or binary arithmetic. Any display formatting must be derived from the canonical string and must not replace the command value.
  - [ ] Validate planned dates as real civil `YYYY-MM-DD` strings, with no timezone, time, or offset component.
  - [ ] Compare two already validated fixed-width civil-date strings directly (or through a date-only helper that never constructs a local/UTC instant) and attach an end-date field error when `plannedEndDate < plannedStartDate`.
  - [ ] Keep approved budget strictly cadastral. Do not calculate spent cost, remaining budget, progress, production, forecasts, or other derived metrics.

- [ ] Add an API-ready schema fragment without exposing a premature endpoint (AC: 4, 7-10, 12)
  - [ ] Add the Projects domain DTO/schema boundary under `main-api/src/modules/projects/**` for the normalized identity/baseline command fragment and colocated schema tests.
  - [ ] Keep the schema free of `corporationId`, `companyId`, `userId`, `sessionId`, Project ids, status, actual start, audit metadata, or relationship ids; those values are trusted context or later aggregate output.
  - [ ] Define decimal and civil-date wire fields as strings and optional absence as explicit `null` where the future aggregate contract permits absence.
  - [ ] Do not add a controller, public HTTP route, OpenAPI operation, persistence handler, migration, generated Kubb client, or handwritten frontend transport DTO in Story 4.2. Story 4.8 will compose this tested fragment into the canonical aggregate route and generated contract.
  - [ ] Keep frontend and backend schemas behaviorally aligned through shared acceptance fixtures, not a runtime package shared between the independent applications.

- [ ] Render and edit the review from the local command model (AC: 1, 3, 5, 7, 10, 11)
  - [ ] Derive review values from the normalized local command fragment rather than reading DOM elements, mock rows, transport DTOs, or a second state object.
  - [ ] Display optional absence as `Não informado` only in the presentation layer; keep `null` in the command model and never submit the display label.
  - [ ] Format budget for Brazilian reading without changing the canonical decimal string and display dates without timezone conversion.
  - [ ] Provide a keyboard-accessible edit action that returns to the identity step with every value preserved and the first logical field focused.
  - [ ] Preserve Story 4.1's wizard session/idempotency key while editing; a step edit is not a new wizard session.

- [ ] Prove schema parity and user behavior (AC: 1-12)
  - [ ] Frontend-test blank/whitespace name and address, omitted coordinates, partial coordinate pairs, inclusive coordinate boundaries, out-of-range values, signs, exponent rejection, and precision preservation.
  - [ ] Test omitted and duplicate contract numbers without any uniqueness request or error; assert blank optional fields normalize to `null` rather than placeholders.
  - [ ] Test `"0.00"`, ordinary positive budgets, canonical two-decimal normalization, negatives, non-numeric values, exponent notation, and scale beyond two without rounding.
  - [ ] Test valid leap dates, malformed/impossible dates, equal start/end dates, ordered ranges, reversed ranges, and serialization independent of local/server timezone.
  - [ ] Backend DTO tests must run the same acceptance fixture matrix for coordinates, budget, optional values, and dates.
  - [ ] Component/Playwright tests must cover active-step error focus, value preservation, review formatting, edit return, responsive behavior, and no backend draft/finalization request.
  - [ ] Run API DTO tests plus frontend typecheck, lint, focused Vitest tests, production build, and the relevant Project wizard Playwright cases.

## Dev Notes

### Developer Context

- Story 4.2 is the first domain data slice inside the non-resumable shell created by Story 4.1. It defines accepted identity and commercial-baseline data before later stories add accountability, schedules, optional resources, fuel terms, and final submission.
- Project creation remains atomic in Story 4.8. Story 4.2 may define and test an API-ready validation fragment, but it must not create an endpoint or persist a partial Project/Baseline.
- The existing wizard's `name` and `location` fields are only a prototype. Preserve the proven interaction pattern while replacing the data model with the accepted Project fields.
- Contract number is searchable but intentionally non-unique. Any frontend or backend duplicate check would violate FR22.

### Technical Requirements

- Local form fields may remain strings for ergonomic editing; normalize them into one command fragment before review and eventual submission.
- Coordinate absence is `latitude: null` and `longitude: null`; provided coordinates are an all-or-nothing pair of bounded decimal strings. No placeholder `0`, empty string, or guessed location may reach the command fragment.
- `approvedBudget` is a non-negative normalized decimal string with exactly two places. `"0.00"` is valid; scale beyond two is invalid, not rounded.
- `plannedStartDate` and `plannedEndDate` are civil dates, never instants. Do not use `new Date("YYYY-MM-DD")`, UTC conversion, server-local midnight, or locale parsing for validation or transport.
- Equal planned start/end dates are valid; only an end date earlier than the start date is rejected.
- Project name, address, contract reference, coordinates, budget, and dates remain editable in the browser until aggregate finalization.

### Architecture Compliance

- Frontend form/format validation uses the installed React Hook Form and Zod versions. Backend authority will revalidate the complete aggregate when Story 4.8 exposes finalization.
- Decimal values cross future API boundaries as strings; civil dates cross as `YYYY-MM-DD`; JSON fields use `camelCase`.
- The frontend must not import backend source, create a shared runtime package, or handwrite a permanent transport model that competes with future Kubb output.
- The Projects backend module owns Project DTO fragments. When Story 4.8 adds persistence, it must follow `controller -> service -> handler -> Prisma` and trusted scope, but those layers are out of scope here.
- No screen element may expose production, progress, calculated costs, RDO, field alerts, or mock status metrics.

### Library and Framework Requirements

- Use repository-pinned Next.js `16.2.9`, React `19.2.4`, React Hook Form `^7.79.0`, and Zod `^4.4.3`; do not upgrade application frameworks for this story.
- Zod 4 supports `.trim()`, `.regex()`, object refinements, and `z.iso.date()` for real `YYYY-MM-DD` validation. Use installed APIs and explicit field paths for cross-field errors.
- Do not add a decimal/money library solely for this form. Validate and normalize the bounded two-decimal budget as a string. If implementation discovers requirements beyond exact string handling, update architecture before adding a cross-cutting numeric dependency.

### Current Files to Reconcile and Preserve

- The Project feature created by Story 4.1 is the primary frontend update location. Keep domain schemas, fields, review view models, and components together there.
- `main-web-app/src/components/pages/company/company-resource-page.tsx` currently defines `workFormSchema`, defaults, prototype steps, fields, review, and local creation. Remove Project ownership from this generic file without changing unrelated resource behavior.
- `main-web-app/src/components/modals/BaseFormModal.tsx` should remain field-agnostic. Story 4.2 supplies step metadata and components through its existing typed interface rather than adding Project branches.
- Add a Projects DTO/schema file and colocated test under `main-api/src/modules/projects`; do not register a route or touch Prisma in this story.
- Preserve all current Fleet, Workforce, Commercial, authentication, Company-selection, generated-client, and pagination behavior.

### Testing Requirements

- Use table-driven shared acceptance fixtures copied at the test boundary (not imported across repositories) so frontend and backend validate the same canonical examples.
- Tests must prove no numeric rounding and no timezone conversion. Running under a non-Brazilian test timezone must not alter a civil date.
- Component tests require the jsdom/React Testing Library setup introduced by Story 4.1; backend schema tests remain in the existing Node Vitest environment.
- Playwright should verify the user-facing step/review journey; it must not expect a Project row or backend record before Story 4.8/4.9.

### Previous Story Intelligence

- Story 4.1 establishes the typed wizard engine, one local session/idempotency key, confirmed discard, non-resumable state, Company-change reset, review navigation, and the Projects feature boundary. Reuse all of it; do not create a second form or key.
- Story 4.1 removes local mock insertion and prototype phase/progress/status behavior. Story 4.2 must not reintroduce those fields through the review or list.
- Existing registry stories use feature-owned frontend code and server-only generated clients. This story follows that organization while intentionally deferring the generated Project client until a real OpenAPI route exists.

### Git Intelligence Summary

- Baseline `e86526f` contains the current modal/wizard prototype plus recent feature-oriented registry patterns under `src/features`.
- Recent work proves DTO schemas with colocated Vitest tests on the API and keeps transport generation owned by Fastify/OpenAPI. The Story 4.2 schema fragment should follow that testing style without claiming an unfinished route is public.
- Existing local Fleet edits and generated OpenAPI changes are unrelated and must remain untouched.

### Latest Technical Information

- Zod 4 documents string trimming/regex validation and `z.iso.date()`, which validates fixed `YYYY-MM-DD` strings and rejects malformed calendar dates. [Source: https://zod.dev/api#strings]
- The repository-pinned Next.js 16 documentation keeps interactive forms behind Client Component boundaries and requires serialized props across the server/client boundary. [Source: main-web-app/node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md]
- The installed test stack uses Vitest `4.1.9` and Playwright `1.61.1`; use component tests for synchronous Client Components and E2E coverage for complete async route behavior. [Source: main-web-app/package.json; main-web-app/node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md]

### Project Structure Notes

- Frontend Project schemas, components, normalized command model, review model, and tests remain under `main-web-app/src/features/projects/**`.
- Backend validation belongs under `main-api/src/modules/projects/**`; future route, service, handler, migrations, and integration tests are deliberately deferred to Story 4.8.
- Keep generic money/date helpers inside Projects until another implemented feature demonstrates an identical reusable contract; do not create premature shared utilities.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-42-Capture-Project-Identity-and-Commercial-Baseline]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Create-a-Complete-and-Consistent-Project]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-22-Capture-Required-Project-Identity-and-Baseline]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#Atomic-Project-Wizard]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/addendum.md#Project-Transaction-Boundary]
- [Source: _bmad-output/planning-artifacts/architecture.md#Identifiers-and-Numeric-Types]
- [Source: _bmad-output/planning-artifacts/architecture.md#Forms-and-Validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Exchange-Formats]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: _bmad-output/implementation-artifacts/4-1-run-a-non-resumable-local-project-wizard.md]
- [Source: main-web-app/src/components/pages/company/company-resource-page.tsx]
- [Source: main-web-app/package.json]

## Security and Completeness Hardening Amendment

The following criteria are mandatory extensions of AC 1-12:

- **H1 — Text bounds and normalization:** `name` and `contractNumber` are NFC-normalized after trimming and contain at most 160 and 120 Unicode code points respectively; `address` is NFC-normalized after trimming and contains at most 500 code points. Control characters other than ordinary address line breaks are rejected. Validation reports the exact field path and never logs the submitted text.
- **H2 — Decimal capacity:** `approvedBudget` remains a canonical non-negative decimal string with exactly two fractional digits and at most 16 integral digits, matching `numeric(18,2)`. Values outside capacity are rejected before persistence; no rounding, exponent notation, grouping separators, `number`, or `parseFloat` conversion is allowed.
- **H3 — Coordinate capacity:** Latitude and longitude are an all-or-nothing pair of canonical decimal strings, stored as `numeric(9,6)`, with at most six fractional digits and inclusive geographic ranges. Negative zero normalizes to `0.000000`; no binary floating-point value crosses the API or persistence boundary.
- **H4 — Boundary tests:** Shared fixtures cover exact maxima, one code point/digit beyond each maximum, composed/decomposed Unicode, control characters, negative zero, six/seven coordinate decimals, and database-capacity boundaries.

Implementation tasks and schema tests must enforce these limits identically in the browser interaction schema, aggregate DTO, OpenAPI contract, and authoritative backend validation.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01: Authored frontend/backend Project command schemas for identity, location, exact decimals, civil dates, and review presentation. Validation remains pending by user request.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 4.1 shell/session guidance, Project identity requirements, decimal/date integrity, current code, API schema boundary, and testing constraints were reconciled.

### File List

- `main-web-app/src/features/projects/projects-schema.ts`
- `main-web-app/src/features/projects/projects-schema.test.ts`
- `main-api/src/modules/projects/projects.dto.ts`
- `main-api/src/modules/projects/projects.dto.test.ts`

### Change Log

- 2026-07-01: Created Story 4.2 implementation context for Project identity and commercial baseline capture.
- 2026-07-01: Added exact Unicode, decimal-capacity, coordinate-scale, normalization, and boundary-test requirements.
- 2026-07-01: Authored identity/baseline command schemas and wizard controls; validation gates remain pending.
