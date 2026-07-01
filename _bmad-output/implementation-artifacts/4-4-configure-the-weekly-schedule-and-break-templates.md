---
baseline_commit: 9e243e12f17379cc0db8ccc69aa4dacb715d16e6
---

# Story 4.4: Configure the Weekly Schedule and Break Templates

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to configure the Project's default weekly working windows and suggested breaks,
so that future field shifts have a clear operational baseline without forcing actual RDO behavior.

## Acceptance Criteria

1. **Given** the administrator opens the schedule step
   **When** the default week is configured
   **Then** all seven days are available for independent working or non-working configuration
   **And** the system does not infer a mandatory rest day.

2. **Given** a day is marked as working
   **When** its operating window is entered
   **Then** exactly one start time and one end time are required
   **And** both times must form a valid same-day window.

3. **Given** an end time is equal to or earlier than the start time
   **When** the default working-day window is validated
   **Then** the day is invalid
   **And** a cross-midnight default window is rejected in the MVP.

4. **Given** all seven days are marked non-working
   **When** the administrator attempts to advance
   **Then** validation fails
   **And** at least one working day is required.

5. **Given** any subset from one through seven working days has valid windows
   **When** the step is validated
   **Then** the Weekly Schedule is accepted
   **And** no automatic overtime or rest-day rule is calculated.

6. **Given** the administrator adds a Break Template
   **When** valid data is entered
   **Then** a non-blank name and positive duration in integer minutes are required
   **And** the template is treated only as a future shift-closure suggestion.

7. **Given** zero Break Templates are configured
   **When** the step is validated
   **Then** the schedule remains valid.
   **And** no default Break Template is generated.

8. **Given** a Break Template duration or label is edited or removed before submission
   **When** the wizard state updates
   **Then** only the local aggregate command changes
   **And** no backend schedule revision or break record exists yet.

9. **Given** Break Templates are configured
   **When** schedule validation runs
   **Then** they are not required to fit at predetermined clock times within the default window
   **And** they do not divide, shorten, or otherwise alter the operating window.

10. **Given** future RDO compatibility is considered
    **When** the schedule command model is produced
    **Then** it can later support actual shifts crossing midnight and edited actual breaks without changing the default same-day schedule semantics
    **And** no RDO workflow is implemented in this story.

11. **Given** schedule and break behavior is tested
    **When** frontend and contract tests run
    **Then** they cover one through seven working days, all-non-working rejection, valid windows, equal/end-before-start rejection, optional breaks, positive integer duration, edit/remove behavior, and no inferred overtime or RDO logic.
    **And** every accepted default window remains within one civil day.

## Tasks / Subtasks

- [ ] Add the Weekly Schedule step to the existing local Project command (AC: 1-5, 10-11)
  - [ ] Extend the Project feature and normalized aggregate model established by Stories 4.1-4.3; do not create a parallel wizard or put schedule behavior in generic modal components.
  - [ ] Represent the week as exactly seven ordered entries using ISO weekday integers `1` (Monday) through `7` (Sunday), each appearing exactly once.
  - [ ] Use `{ dayOfWeek, isWorking, startTime, endTime }` per day. Working days require `HH:mm` strings; non-working days normalize both time fields to explicit `null`.
  - [ ] Require at least one working day and allow all seven. Do not infer weekends, holidays, weekly rest, overtime, or labor-policy constraints.
  - [ ] Keep schedule state browser-local and editable until aggregate finalization; this story persists no Project schedule or revision.

- [ ] Validate same-day operating windows without creating instants (AC: 2-5, 10-11)
  - [ ] Accept only zero-padded 24-hour minute-precision strings matching real times from `00:00` through `23:59`; reject seconds, offsets, dates, locale text, and malformed values.
  - [ ] Compare already validated `HH:mm` strings or integer minutes since midnight; require `startTime < endTime` and reject equality or reverse order.
  - [ ] Never use `Date`, timezone conversion, or `America/Sao_Paulo` offsets to validate a default civil-day window. Timezone applies when future actual instants are interpreted, not to this wall-clock template.
  - [ ] When a working day is turned off, clear its times from the normalized command so hidden stale values cannot be submitted or shown in review.
  - [ ] When a day is turned back on, require fresh valid values unless the UI deliberately retained draft-only inputs that remain excluded until valid.

- [ ] Add optional Break Template editing (AC: 6-9, 11)
  - [ ] Represent templates as an ordered collection of `{ name, durationMinutes }`, with zero through ten entries; ten is valid and eleven is rejected.
  - [ ] Trim names and reject blank values. Require `durationMinutes` to be a positive safe integer; reject zero, negatives, fractions, exponent notation, `NaN`, and `Infinity` rather than rounding or coercing them silently.
  - [ ] Do not invent default templates, default durations, clock positions, uniqueness rules, or a requirement that total break duration fit within any working window.
  - [ ] Use React Hook Form field-array behavior for add, edit, and remove interactions with stable UI keys. UI-only keys must not enter the normalized aggregate command.
  - [ ] Treat templates solely as future suggestions. Do not create break instances, deduct duration, calculate net work, or implement an RDO screen.

- [ ] Extend the API-ready Projects schema fragment without a route or persistence (AC: 1-11)
  - [ ] Add strict Zod schemas under `main-api/src/modules/projects/**` for the seven-day schedule and zero-to-ten Break Templates.
  - [ ] Enforce exact weekday coverage, uniqueness, ordering/canonicalization, working/non-working time rules, at-least-one-working-day, same-day windows, trimmed names, and positive integer minutes.
  - [ ] Keep schedule revision ids, effective periods, actor, reason, Project id, Company scope, and RDO data out of this initial command fragment.
  - [ ] Keep frontend and backend schema behavior aligned through equivalent acceptance fixtures without importing source across the independent applications.
  - [ ] Do not add a controller, route, OpenAPI operation, generated client, Prisma model, migration, or persisted revision. Story 4.8 will compose and persist the initial schedule atomically.

- [ ] Render a clear responsive editor and review (AC: 1-9)
  - [ ] Show all seven days in a stable Monday-to-Sunday order with an accessible working-day control and conditionally enabled start/end inputs.
  - [ ] Associate cross-field window errors with the affected day/end-time control and expose the all-non-working error at the schedule group level with readable focus behavior.
  - [ ] Give Break Template rows programmatic names, visible add/remove controls, keyboard access, and clear validation without relying on color alone.
  - [ ] Derive review content only from the normalized command model: show working days and windows, mark non-working days clearly, and show `Nenhum intervalo sugerido` only as presentation when the template collection is empty.
  - [ ] Provide an edit action returning to the schedule step with values and wizard-session idempotency key preserved.
  - [ ] Keep the existing modal usable on mobile without overlapping controls or horizontal page overflow.

- [ ] Prove schedule and Break Template behavior (AC: 1-11)
  - [ ] Table-test all valid `HH:mm` boundaries, malformed times, equality, reverse order, valid same-day windows, and rejection of cross-midnight defaults.
  - [ ] Test exact seven-day coverage, duplicate/missing/out-of-range weekdays, one working day, each subset size through seven, and the all-non-working error.
  - [ ] Test non-working normalization to `null`, toggling days, hidden stale-value exclusion, deterministic Monday-to-Sunday review order, and no timezone conversion.
  - [ ] Test zero and ten Break Templates, eleven rejected templates, blank/trimmed names, positive integer durations, invalid numeric forms, editing, removal, and stable field-array keys.
  - [ ] Assert that Break Templates neither require clock positions nor alter schedule windows and that no overtime, net-time, actual-shift, or RDO fields are produced.
  - [ ] Run the same acceptance matrix against frontend and API schema fragments; add RTL coverage for focus, keyboard, responsive controls, review/edit, and local-only behavior.
  - [ ] Add Playwright coverage for configuring one and seven working days, optional breaks, validation recovery, review/edit, cancellation/refresh abandonment, and absence of backend schedule records.
  - [ ] Run focused API/frontend tests, typecheck, lint, production builds, and the relevant Project wizard Playwright cases.

## Dev Notes

### Developer Context

- Story 4.4 adds the mandatory operational-time baseline to the browser-local Project aggregate after identity and accountability. It does not create the initial schedule revision in PostgreSQL; Story 4.8 owns that atomic write.
- The schedule is a default weekly template, not evidence of actual work. One simple same-day window per working day supersedes earlier brainstorming ideas about multiple daily intervals.
- Break Templates are optional named duration suggestions. They neither split the default window nor constrain future actual break timing.
- Future RDO shifts may cross midnight and contain edited actual breaks, but no RDO data shape, calculation, screen, or persistence belongs in this story.

### Technical Requirements

- Canonical wire shape: seven ISO weekday entries ordered `1..7`; working entries carry exact `HH:mm` start/end strings, and non-working entries carry `null` for both.
- The accepted template count is inclusive `0..10`. Each accepted duration is a positive integer number of minutes; no maximum duration is invented by this story beyond transport-safe integer validation.
- `00:00-23:59` is valid; `23:59-00:00`, equal endpoints, and every reverse pair are invalid because default windows cannot cross midnight.
- Duplicate Break Template names are not prohibited by current requirements. Do not add silent uniqueness or case-folding rules.
- Review labels are presentation-only and must never replace `null`, numeric weekday values, or integer durations in the command model.

### Architecture Compliance

- Keep interactive form state in React Hook Form/Zod inside `main-web-app/src/features/projects/**`; do not use Zustand or browser persistence.
- Keep the strict backend command fragment in `main-api/src/modules/projects/**`, but expose no route until aggregate finalization exists.
- Use civil weekday/time values without `Date` or real-instant conversion. `America/Sao_Paulo` remains the future business interpretation for actual timestamps.
- Generic UI primitives remain domain-agnostic. Project schedule composition, labels, validation, normalization, and review belong to the Projects feature.
- Do not add calculations, production metrics, RDO assumptions, or mock schedule persistence.

### Library and Framework Requirements

- Use repository-pinned Next.js `16.2.9`, React `19.2.4`, React Hook Form `^7.79.0`, Zod `^4.4.3`, Vitest `4.1.9`, and Playwright `1.61.1`; do not upgrade or add a date/time library.
- Use React Hook Form field arrays for Break Templates and Zod object/array refinements for schedule-wide and row-level invariants.
- Native `input[type="time"]` may provide the minute-entry UI, but the schema remains authoritative and must normalize/validate exact `HH:mm` strings consistently across browsers and tests.

### Current Files to Reconcile and Preserve

- Extend the Projects feature, local aggregate schema, review view model, and API DTO fragments created by Stories 4.1-4.3.
- Keep `main-web-app/src/components/modals/BaseFormModal.tsx` field-agnostic. If nested step validation needs an engine-level hook established by Story 4.1, reuse it rather than adding Project-specific branching.
- Remove any remaining prototype phase, progress, status, or manager free-text fields from the Project review instead of treating them as schedule data.
- Preserve all existing registry, selector, pagination, authentication, Company-selection, Fleet, Commercial, and Workforce behavior.

### Testing Requirements

- Frontend and backend schema tests use equivalent table-driven fixtures for weekdays, time windows, and Break Templates.
- Tests must prove the schedule is stable under different process/browser timezones because validation never constructs an instant.
- Component tests cover nested field error focus and field-array edits; backend DTO tests must not claim persistence exists.
- Playwright verifies the complete local interaction while asserting no Project, schedule revision, or Break Template is written before Story 4.8/4.9.

### Previous Story Intelligence

- Story 4.3 extends the same normalized Project command with identifier-only accountability and real server-backed selectors. Schedule data remains independent of selector loading and must not reset when selector pages change.
- Story 4.2 establishes normalized command fragments, review/edit navigation, exact civil values, and frontend/backend schema parity without premature routes.
- Story 4.1 owns local wizard lifecycle, current-step validation, focus, cancellation, refresh abandonment, Company-change reset, and idempotency-key continuity. Reuse those behaviors unchanged.

### Git Intelligence Summary

- Baseline `9e243e1` contains the current wizard prototype and repository testing conventions. Project feature implementation is intentionally described by the ready-for-dev predecessor stories rather than yet existing runtime files.
- Recent commits use colocated Zod DTO tests, PostgreSQL integration tests only for persisted invariants, feature-owned frontend components, and Playwright for critical browser journeys.
- Existing uncommitted Stories 4.1-4.3 and sprint-status edits are intentional context and must remain untouched except for the planned 4.4 status transition.

### Latest Technical Information

- The installed Next.js testing guide assigns synchronous interactive components to Vitest/RTL and async route behavior to E2E tests. Use both layers for this local wizard step. [Source: main-web-app/node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md]
- The repository already pins React Hook Form and Zod versions that support field arrays and cross-field refinements; no new form or time dependency is needed. [Source: main-web-app/package.json]
- Repository-pinned versions remain authoritative even if newer packages exist; dependency migration is outside this story. [Source: main-web-app/package.json; main-api/package.json]

### Project Structure Notes

- Schedule schemas, normalization, components, review models, and tests remain under `main-web-app/src/features/projects/**`.
- The matching backend fragment and DTO tests remain under `main-api/src/modules/projects/**` until Story 4.8 creates the Projects service/handler/persistence boundary.
- Keep time parsing domain-local until another implemented feature proves an identical wall-clock template contract; do not add a speculative shared date/time abstraction.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-44-Configure-the-Weekly-Schedule-and-Break-Templates]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Create-a-Complete-and-Consistent-Project]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-24-Capture-Required-Weekly-Schedule]
- [Source: _bmad-output/planning-artifacts/architecture.md#Identifiers-and-Numeric-Types]
- [Source: _bmad-output/planning-artifacts/architecture.md#Forms-and-Validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Wizard]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Exchange-Formats]
- [Source: _bmad-output/brainstorming/brainstorming-session-2026-06-18-010627.md#Work-Schedule-77-One-Daily-Window-with-Suggested-Breaks]
- [Source: _bmad-output/brainstorming/brainstorming-session-2026-06-18-010627.md#Future-RDO-Time-Model-74-Intraday-Defaults-and-Cross-Midnight-Actual-Shifts]
- [Source: _bmad-output/implementation-artifacts/4-1-run-a-non-resumable-local-project-wizard.md]
- [Source: _bmad-output/implementation-artifacts/4-2-capture-project-identity-and-commercial-baseline.md]
- [Source: _bmad-output/implementation-artifacts/4-3-select-the-client-and-project-responsibilities.md]

## Security and Completeness Hardening Amendment

The following criteria are mandatory extensions of the story acceptance criteria:

- **H1 — Wall-clock semantics:** Work windows are local wall-clock values with no timezone, UTC conversion, offset, or DST arithmetic. Accept `00:00` through `23:59`, reject `24:00`, and interpret every interval as half-open `[start, end)` so adjacent windows do not overlap.
- **H2 — Day rules:** Each of the seven canonical weekdays has either zero windows or valid ordered non-overlapping windows; an interval must have `start < end` and cannot cross midnight. Overnight work requires two explicit day entries and is not inferred.
- **H3 — Break Template bounds:** A Break Template name is trimmed, NFC-normalized, non-empty, and at most 120 Unicode code points. Duration is an integer from 1 through 1440 minutes. The existing inclusive maximum of 10 templates and unique normalized names remains authoritative.
- **H4 — No invented placement:** A Break Template has no clock position in this epic. Do not require it to fit a work window or calculate daily totals from it.
- **H5 — Boundary tests:** Cover midnight edges, adjacent/overlapping windows, invalid `24:00`, equal/reversed times, split overnight representation, Unicode name limits, and duration 1/1440/1441.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01: Authored seven-day wall-clock scheduling, optional Break Template editing, schemas, and persistence models. Validation remains pending by user request.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Weekly schedule semantics, Break Template constraints, future RDO boundaries, schema parity, predecessor stories, and current wizard patterns were reconciled.

### File List

- `main-web-app/src/features/projects/components/project-wizard.tsx`
- `main-web-app/src/features/projects/projects-schema.ts`
- `main-api/src/modules/projects/projects.dto.ts`
- `main-api/prisma/schema.prisma`

### Change Log

- 2026-07-01: Created Story 4.4 implementation context for the Weekly Schedule and Break Templates.
- 2026-07-01: Defined wall-clock interval semantics and exact Break Template text/duration boundaries.
- 2026-07-01: Authored schedule/Break Template editing and contracts; validation gates remain pending.
