---
baseline_commit: e86526f75f3267666f2b0a941fae5a560d7aacd4
---

# Story 4.1: Run a Non-Resumable Local Project Wizard

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to complete Project setup through one guided browser workflow,
so that I can review a complete Project before any backend record is created.

## Acceptance Criteria

1. **Given** the administrator starts Project creation in a selected Company
   **When** the wizard opens
   **Then** it reuses the existing accessible visual shell and approved interaction components
   **And** initializes a new browser-local wizard session and idempotency key.

2. **Given** the wizard is open
   **When** the administrator enters valid values and moves between steps
   **Then** values remain available for the current open workflow
   **And** no Project draft or partial relationship is persisted by the backend.

3. **Given** the administrator attempts to advance
   **When** the current step contains invalid required values
   **Then** only that step is blocked
   **And** readable field-level validation is displayed without invoking backend business rules as frontend authority.

4. **Given** the current step is valid
   **When** the administrator advances or returns to a prior step
   **Then** navigation preserves entered values
   **And** visible focus and keyboard behavior move predictably.

5. **Given** the administrator closes or explicitly cancels the wizard before final submission
   **When** the confirmation completes
   **Then** all local wizard state and the wizard-session idempotency key are discarded
   **And** reopening Project creation starts from the beginning.

6. **Given** the browser page is refreshed, navigated away, or the workflow is otherwise abandoned
   **When** the wizard is opened again
   **Then** no prior draft is restored
   **And** no backend Project or relationship exists from the abandoned session.

7. **Given** the selected Company changes while the wizard is open
   **When** the new workspace becomes active
   **Then** the wizard is cancelled and all subordinate state is cleared
   **And** values from the prior Company cannot be submitted under the new scope.

8. **Given** the wizard displays selectable entities
   **When** Clients, Employees, Machines, or Fuel Suppliers are loaded
   **Then** data comes through server queries, frontend adapters, and generated server-only clients
   **And** Client Components never receive credentials or infer Company scope.

9. **Given** the wizard is displayed on supported desktop and mobile layouts
   **When** the administrator navigates, validates, reviews, or cancels
   **Then** text, controls, dialogs, and step content remain usable without overlap
   **And** existing visual styling is preserved without retaining mock-only fields.

10. **Given** wizard-shell behavior is tested
    **When** frontend unit and Playwright suites run
    **Then** they cover step navigation, current-step validation, value preservation, keyboard operation, cancellation, refresh abandonment, Company change, no backend draft, and responsive layouts.
    **And** abandoned workflows leave no persisted Project data.

## Tasks / Subtasks

- [ ] Establish the Project wizard boundary without implementing aggregate finalization (AC: 1-10)
  - [ ] Build on the existing `BaseFormModal` wizard engine and `OperationsModal` shell; do not introduce another dialog, stepper, or form framework.
  - [ ] Move Project-specific form configuration and rendering out of the generic `CompanyResourcePage` into `main-web-app/src/features/projects/**` while leaving unrelated generic resource modals unchanged.
  - [ ] Replace the production local-row insertion behavior for Works with a Project wizard entry point that creates no Project until the later aggregate finalization stories are implemented.
  - [ ] Remove mock-only Project phase, progress, calculated status, production, RDO, cost, and field-metric behavior from the wizard path.
  - [ ] Keep Story 4.1 limited to the shell, local session lifecycle, navigation, validation orchestration, review/edit navigation, cancellation, and integration seams; Stories 4.2-4.7 own the domain steps, Story 4.8 owns the backend command, and Story 4.9 owns submission/recovery.

- [ ] Implement one browser-local wizard session lifecycle (AC: 1, 2, 5-7)
  - [ ] Create a fresh UUID v4 idempotency key with browser `crypto.randomUUID()` each time a new wizard session opens; preserve it for the full open session and never regenerate it during step navigation or editing.
  - [ ] Keep the key and form values in component/form memory only. Do not place wizard state, keys, authenticated scope, entities, or API responses in Zustand, local storage, session storage, URL state, cookies, IndexedDB, or a backend draft.
  - [ ] Route footer Cancel, dialog close button, Escape, and backdrop dismissal through one semantic discard-confirmation flow. Confirmed discard resets form state, current step, pending state, and key; declining returns focus to the wizard.
  - [ ] Treat refresh, route navigation, component unmount, and browser abandonment as unconditional loss of the local session; do not add `beforeunload` draft restoration.
  - [ ] Make the Projects feature remount when the trusted selected-Company server epoch changes, and guard any later submission against the session epoch. The operational payload must never carry or choose Corporation or Company scope.
  - [ ] Keep the current Company selector and authentication flow authoritative; do not modify Session or Company-selection contracts for this story.

- [ ] Harden reusable wizard navigation and accessibility (AC: 2-5, 9)
  - [ ] Extend the existing modal contract only as needed for controlled close intent, confirmed discard, session initialization/reset, and deterministic step navigation; preserve all non-wizard consumers.
  - [ ] Validate only `WizardStep.fields` for the active data step before advancing, focus the first invalid control, and prevent duplicate advance/submit actions while validation is pending.
  - [ ] Preserve field values and dirty/touched state when moving backward or using review edit actions; reset them only when the complete local session ends.
  - [ ] Move focus to the active step heading after navigation, retain visible focus rings, semantic dialog/alert-dialog behavior, logical tab order, readable `aria-describedby` errors, and minimum usable touch targets.
  - [ ] Preserve labeled desktop/tablet progress and compact mobile progress, anchored actions, scrollable content, reduced-motion behavior, and the current mineral/teal visual system.
  - [ ] Keep the step engine driven by a typed step definition so later stories can insert identity, accountability, schedule, mobilization, fuel, and review sections without rewriting the shell.

- [ ] Preserve the approved server-only integration boundary (AC: 3, 7, 8)
  - [ ] Leave future initial selector reads on server queries and later interactive pages on Server Actions through feature adapters/view models and generated Kubb clients.
  - [ ] Do not import generated clients, low-level API transport, credentials, or trusted scope into Client Components.
  - [ ] Keep frontend Zod validation limited to interaction and format feedback. Ownership, eligibility, cardinality, concurrency, transactions, and final conflict decisions remain backend responsibilities.
  - [ ] Do not add selector calls in Story 4.1 merely to populate an empty shell; Stories 4.3 and 4.5-4.7 add each selector with its owning requirements.

- [ ] Add focused automated verification (AC: 1-10)
  - [ ] Add missing frontend test-only support required by the architecture (React Testing Library, user-event, and jsdom if still absent) without adding a production dependency; keep existing Node-environment server tests unaffected.
  - [ ] Unit/component-test open initialization, one key per session, stable key across navigation, current-step-only validation, first-error focus, value preservation, review edit navigation, every close intent, declined/confirmed discard, deterministic reopen, and no persistent-storage writes.
  - [ ] Prove that non-wizard `BaseFormModal` consumers retain their current close, validation, pending, and submit behavior.
  - [ ] Playwright-test keyboard-only navigation, mobile and desktop progress/layout, refresh abandonment, route abandonment, workspace switch/remount, clean reopen, and the absence of a Project create/draft request before final submission.
  - [ ] Run frontend typecheck, lint, focused Vitest tests, production build, and the Project wizard Playwright suite.

## Dev Notes

### Developer Context

- Epic 4 builds one complete Project aggregate progressively. This story establishes the browser workflow boundary that all later Epic 4 stories extend; it does not create a partial Project feature or a temporary backend draft.
- The current production route `/home/obras` renders the generic `CompanyResourcePage`, whose `works` configuration contains mock rows, mock summary metrics, a three-step local wizard, and local list insertion. Those behaviors are visual prototypes, not accepted Project contracts.
- The existing wizard already provides valuable behavior: typed steps, `react-hook-form`, Zod resolution, active-field validation, responsive progress, focus on step change, preserved values, an anchored footer, and deterministic reset. Extend these seams rather than replacing them.
- A minimal production shell may temporarily contain only accepted data steps plus review as Epic 4 progresses. Never retain mock phase/progress/status fields merely to make the shell appear complete.

### Technical Requirements

- A wizard session begins on open and owns exactly one UUID v4 idempotency key. The same key will later protect unchanged finalization retries; it is not a Project identifier and is never persisted as a draft.
- Session state must be memory-only and non-resumable. Reloading or reopening creates a new form state and key.
- All explicit in-app close paths require a discard confirmation before state is destroyed. Refresh/navigation abandonment discards state naturally and must not restore it.
- Company change must invalidate the complete Project feature tree. Use trusted server-rendered workspace identity only as an invalidation/remount epoch, never as client-supplied authorization scope.
- No Story 4.1 action may call a Project create/update/draft endpoint. The backend remains unchanged unless a test harness needs to assert that no request occurs.

### Architecture Compliance

- Preserve Next.js 16 App Router and React 19; interactive wizard code is a Client Component nested below the server-owned route and selected-Company boundary.
- Frontend flow remains `page -> feature -> server action/query -> adapter/view model -> generated Kubb client`; this story must not preempt later generated Project contracts with a hand-written transport client.
- Zustand remains limited to ephemeral preferences. Wizard form state, idempotency keys, business entities, API responses, and scope are prohibited there.
- React Hook Form and Zod remain the approved interaction/form tools. Do not add React Query, another form library, or another modal system.
- Preserve `OperationsModal`, Base UI dialog primitives, shadcn/UI controls, Tailwind tokens, Lucide icons, and existing responsive styling.

### Current Files to Reconcile and Preserve

- `main-web-app/src/components/modals/BaseFormModal.tsx` currently owns typed step navigation, active-step triggering, focus movement, pending guards, progress, reset, and submit behavior. Preserve non-wizard behavior and make close/session hooks generic rather than Project-aware.
- `main-web-app/src/components/ui/operations-modal.tsx` is the canonical responsive visual shell. Preserve its header, scroll boundary, sizing API, and Base UI semantics.
- `main-web-app/src/components/pages/company/company-resource-page.tsx` currently mixes all resource mocks with the work wizard. Extract only Project behavior; do not refactor employee, machine, or supplier modal behavior as collateral work.
- `main-web-app/src/components/modals/ConfirmActionModal.tsx` is the existing semantic confirmation component. Reuse or minimally generalize it; do not duplicate alert-dialog behavior.
- `main-web-app/src/app/home/obras/page.tsx` already resolves the selected workspace server-side. Use route/feature keying or equivalent remount semantics to invalidate an open wizard after Company change.
- `main-web-app/src/stores/app.store.ts` must remain free of wizard state and authenticated scope.

### Testing Requirements

- Current `main-web-app/vitest.config.ts` uses the Node environment and the repository lacks React Testing Library/jsdom dependencies. Add isolated component-test support without converting existing server-oriented tests into browser tests unintentionally.
- Unit tests must mock `crypto.randomUUID()` deterministically and assert lifecycle semantics, not the random algorithm.
- Playwright is mandatory for semantic dialogs, focus return, Escape/backdrop behavior, refresh/navigation abandonment, responsive layout, and workspace transitions.
- No test may count local insertion of a mock Work row as success. Story 4.1 succeeds when the shell behaves correctly and abandonment persists nothing.

### Git Intelligence Summary

- Baseline `e86526f` completed the Epic 3 story context and Fleet vertical-slice work while preserving the existing frontend styling and route conventions.
- Recent Epic 2/3 work organizes real frontend capabilities under `src/features/**`, keeps generated clients server-only, and uses route-level server data with focused Playwright journeys. Projects should follow that established direction.
- Existing local Fleet edits are unrelated to this story and must not be changed, formatted, staged, or incorporated.

### Latest Technical Information

- The repository-pinned Next.js 16 documentation requires interactive state and browser APIs to live behind a `'use client'` boundary; props crossing from Server to Client Components must remain serializable. [Source: main-web-app/node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md]
- `crypto.randomUUID()` produces a cryptographically strong UUID v4 in supported secure browser contexts and is suitable for the browser-local wizard key. [Source: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID]
- React Hook Form remains the repository-approved local form owner and already supports targeted `trigger(..., { shouldFocus: true })` and deterministic `reset`; extend the installed API rather than introducing parallel state.
- Package versions are repository authority: Next.js `16.2.9`, React `19.2.4`, React Hook Form `^7.79.0`, Zod `^4.4.3`, Zustand `5.0.14`, Vitest `4.1.9`, and Playwright `1.61.1`. [Source: main-web-app/package.json]

### Project Structure Notes

- Place Project-owned components, schemas, session types, and tests under `main-web-app/src/features/projects/**`.
- Keep generic dialog/form infrastructure under the existing component locations; no Project business field belongs in `BaseFormModal` or `OperationsModal`.
- Reserve `main-web-app/tests/e2e/project-wizard.spec.ts` for the complete cross-browser journey and colocate focused component tests with the Projects feature or generic component under test.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Create-a-Complete-and-Consistent-Project]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-41-Run-a-Non-Resumable-Local-Project-Wizard]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-26-Finalize-Project-Atomically-and-Idempotently]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/addendum.md#Project-Transaction-Boundary]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/reconcile-wizard.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Wizard]
- [Source: _bmad-output/planning-artifacts/architecture.md#Accessibility-and-Responsive-Behavior]
- [Source: _bmad-output/implementation-artifacts/spec-work-creation-wizard.md]
- [Source: main-web-app/AGENTS.md]
- [Source: main-web-app/src/components/modals/BaseFormModal.tsx]
- [Source: main-web-app/src/components/ui/operations-modal.tsx]
- [Source: main-web-app/src/components/pages/company/company-resource-page.tsx]

## Security and Completeness Hardening Amendment

The following criteria are mandatory extensions of AC 1-10:

- **H1 — Explicit loss model:** Before the first edit, the wizard states that work exists only in the open browser workflow and is not saved as a draft. Explicit close, Cancel, Escape, backdrop dismissal, route navigation initiated by the application, and Company change request confirmation only when the form is dirty. Refresh, tab close, crash, and browser abandonment remain non-resumable and must never claim that recovery is available.
- **H2 — Workspace precondition:** The session captures the trusted selected Company id as an immutable expected-workspace precondition. It is not authorization input. A trusted workspace epoch change invalidates the whole wizard, and Story 4.9 must submit this precondition through the dedicated header defined by Story 4.8.
- **H3 — Unknown-outcome exit guard:** While Story 4.9 holds an unknown-outcome snapshot, every in-app exit path warns that the creation result is unknown and directs the administrator to resolve the retry or consult the Project registry before starting another Project. No persistent or post-refresh automatic recovery is introduced.
- **H4 — Measurable accessibility:** Automated and manual checks cover keyboard-only completion, deterministic focus after every transition/error/dialog action, programmatic names and descriptions announced by a screen reader, visible focus, reduced motion, 200% browser zoom, and a 320 CSS-pixel viewport without two-dimensional scrolling or obscured actions.
- **H5 — Cross-tab safety:** A deterministic test opens the wizard in Company A, changes the persisted Session to Company B in another tab, and proves that the A command is neither retried nor created under B.

Implementation tasks must add the loss-model disclosure, dirty-only close policy, expected-workspace capture, unknown-outcome close variant, and the H4/H5 test matrix. These requirements do not authorize local/session storage, backend drafts, or `beforeunload` restoration.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01: Implemented the Project-owned wizard boundary, memory-only session key, dirty discard confirmation, loss disclosure, and test dependencies. Automated validation remains pending by user request.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Existing wizard, modal, workspace, local-state, testing, and feature-boundary behavior was inspected before defining implementation guidance.

### File List

- `main-web-app/src/components/modals/BaseFormModal.tsx`
- `main-web-app/src/features/projects/components/project-wizard.tsx`
- `main-web-app/package.json`
- `main-web-app/pnpm-lock.yaml`

### Change Log

- 2026-07-01: Created Story 4.1 implementation context for the non-resumable browser-local Project wizard shell.
- 2026-07-01: Hardened loss disclosure, workspace preconditions, unknown-outcome exits, accessibility, and cross-tab safety.
- 2026-07-01: Authored the Project wizard shell and session lifecycle; validation gates remain pending.
