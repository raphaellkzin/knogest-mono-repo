---
baseline_commit: 9e243e12f17379cc0db8ccc69aa4dacb715d16e6
---

# Story 4.9: Submit the Wizard and Recover Finalization Conflicts

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want the dashboard to submit the complete wizard and preserve my work when a recoverable conflict occurs,
so that I can correct only the affected step without creating duplicate Projects.

## Acceptance Criteria

1. **Given** every wizard step is locally valid
   **When** the administrator submits the final review
   **Then** the dashboard sends one aggregate command through a Server Action
   **And** includes the wizard-session `Idempotency-Key`.

2. **Given** one or more selected Employees, Machines, Clients, or Fuel Suppliers changed eligibility
   **When** the API returns a structured finalization conflict
   **Then** the frontend adapter maps the stable code and authorized `details.resources`
   **And** identifies the affected wizard step or subsection.

3. **Given** a recoverable conflict reaches the dashboard
   **When** it is rendered
   **Then** valid local values remain intact and the wizard navigates to the affected step
   **And** behavior does not depend on parsing the error message.

4. **Given** a request fails before a committed result is known
   **When** the administrator retries the same unchanged wizard session
   **Then** the same idempotency key and canonical payload are reused
   **And** duplicate submission cannot create another Project.

5. **Given** finalization succeeds
   **When** the dashboard receives the result
   **Then** it clears local wizard state, navigates to the authorized Project view, and revalidates the Project registry
   **And** the completed wizard key is not reused for a new Project.

6. **Given** the Project appears in the registry
   **When** it is listed or searched
   **Then** it uses canonical cursor pagination and selected Company scope
   **And** the optional non-unique contract number is searchable.

7. **Given** dashboard submission and recovery are tested
   **When** frontend unit and Playwright suites run
   **Then** they cover initial submission, affected-step mapping, preserved values, unchanged retry, successful cleanup, registry appearance, and Company-scope changes
   **And** generated clients remain server-only.

## Tasks / Subtasks

- [ ] Connect the complete local wizard to the generated finalization contract (AC: 1, 4-5, 7)
  - [ ] Add a command-oriented Server Action under `main-web-app/src/features/projects/**` that accepts the fully validated command and the current wizard-session UUID v4 key, invokes the generated `POST /api/v1/projects` client, and passes `Idempotency-Key` through the generated client's request configuration.
  - [ ] Compose the payload from the exact command fragments established by Stories 4.2-4.7. Do not rename fields, add trusted scope, or convert exact decimal/civil-date strings into JavaScript numbers or instants.
  - [ ] Revalidate the action input for transport shape with the generated Zod contract while leaving ownership, eligibility, concurrency, and transactional decisions to the API.
  - [ ] Prevent concurrent clicks while submission is pending and ensure one review action produces one Server Action invocation.
  - [ ] Keep the generated client, API transport, credentials, and authenticated scope server-only; Client Components receive only serializable action state and safe display models.

- [ ] Define typed submission and recovery states (AC: 2-4, 7)
  - [ ] Model explicit `idle`, `pending`, `recoverable-conflict`, `unknown-outcome`, `terminal-failure`, and `success` outcomes without copying the aggregate into a durable client store.
  - [ ] Parse the canonical API error envelope safely and preserve `code`, authorized `details.fields`, authorized `details.resources`, and `requestId`; never branch on localized `message` content.
  - [ ] Map field paths to their owning wizard step and map each resource entry using its API-provided section/subsection hint. A Workforce resource used for accountability must not be confused with the same Employment used for operational mobilization.
  - [ ] Route Client/accountability conflicts to accountability, Employee allocation conflicts to Employee mobilization, Machine conflicts to Machine mobilization, and Supplier/Fuel Type conflicts to Fuel Agreements. Identity, schedule, and collection validation map from `details.fields` to their exact step.
  - [ ] Preserve every local value, including the stale selection, so the affected control can identify and replace/remove it; mark only authorized affected resources and expose a readable recovery action.
  - [ ] Treat missing/invalid authentication, changed Company, forbidden scope, and `IDEMPOTENCY_PAYLOAD_CONFLICT` as terminal for the current submission path. Never regenerate a key or silently start another Project to escape an idempotency conflict.

- [ ] Make unknown outcomes safely retryable and confirmed conflicts editable (AC: 3-4, 7)
  - [ ] When no committed result is known because transport or the Server Action boundary failed, retain an immutable snapshot of the submitted command plus its key in the still-open in-memory session and present an explicit retry action.
  - [ ] Retry that snapshot byte-for-byte at the command-model level with the same key; do not rebuild it from controls that may have changed, automatically retry without feedback, or generate a replacement key.
  - [ ] While outcome is unknown, prevent editing/submitting a divergent payload until the unchanged retry resolves success or a canonical API error.
  - [ ] After a recoverable API conflict confirms rollback, release the snapshot lock, navigate to the mapped step, permit corrections, and retain the same wizard-session key. Story 4.8 rolls back failed key reservations, so the corrected payload remains valid for that uncommitted session.
  - [ ] Keep error recovery inside the open workflow only. Refresh, route abandonment, explicit cancellation, or Company change still discards the entire non-resumable session as defined by Story 4.1.

- [ ] Complete success cleanup and authorized navigation deterministically (AC: 5, 7)
  - [ ] Make the Server Action return a typed `{ projectId, status: "planned" }` success result after `revalidatePath("/home/obras")`; do not call `redirect()` inside its caught mutation path.
  - [ ] On the client, clear form values, recovery state, submitted snapshot, wizard-session key, and dialog state before navigating with `router.replace(`/home/obras/${projectId}`)` and refreshing the server-owned view when needed.
  - [ ] Ensure a subsequent Project wizard open initializes a fresh key and defaults. A successful key must never remain reachable through stale closures, action state, URL state, or a shared store.
  - [ ] If Company scope changes during or immediately after submission, trust the server result and current workspace boundary: discard subordinate local state and never navigate to a Project detail under a mismatched Company.

- [ ] Add the minimum current Project registry and detail read contracts required by this story (AC: 5-7)
  - [ ] Extend the Projects module created by Story 4.8 with `GET /api/v1/projects` using trusted selected-Company scope and the shared canonical cursor implementation. This is the only unbounded Project registry contract.
  - [ ] Support `limit`, opaque `cursor`, trimmed `search`, allowlisted `sortBy`, and `sortDirection`; reset traversal when search or sorting changes. Search normalized Project name and optional normalized contract number without imposing uniqueness.
  - [ ] Use deterministic ordering with `id` as the final tie-breaker, return canonical `{ data, pageInfo }`, bind cursors to normalized query and trusted scope, and reject stale/foreign/tampered cursors without existence disclosure.
  - [ ] Return a safe registry view model containing only the fields needed for identification and navigation, including Project id, name, nullable contract number, lifecycle status, and planned dates. Do not add history, calculated progress, production, cost, or RDO metrics.
  - [ ] Add `GET /api/v1/projects/:projectId` for the current authorized Project view in the selected Company. Return current aggregate presentation data only; Story 6.7 owns historical timelines and their pagination.
  - [ ] Add an ordinary non-unique search index for normalized contract number if Story 4.8's migration does not already provide it. Never convert it into a unique constraint.
  - [ ] Register both routes, document success/error schemas, regenerate OpenAPI and Kubb outputs through repository scripts, and keep generated files unedited by hand.

- [ ] Replace the production Works mock with the real Projects feature (AC: 5-7)
  - [ ] Make `/home/obras` server-load the first Project cursor page through a Projects server query and adapter, while retaining the selected-Company `AppShell` boundary and approved visual language.
  - [ ] Move Project registry, current detail, action, adapters, schemas, and view models under `main-web-app/src/features/projects/**`; keep only reusable business-free primitives under `components/ui` or existing generic modal locations.
  - [ ] Remove Works mock rows, local row insertion, progress/status/phase production fields, and mock summary metrics from the production Projects route without refactoring unrelated Employee, Machine, Client, or Supplier screens.
  - [ ] Add `/home/obras/[projectId]` as a reloadable authorized current-detail route with a safe route back to the registry. Foreign, absent, and no-longer-authorized ids fail without scope disclosure.
  - [ ] Let the URL own registry search and sorting, keep cursor traversal history only in the current interaction, and clear loaded pages, selections, recovery state, and Project navigation when Company changes.
  - [ ] Provide stable loading, empty, validation, conflict, unauthorized, success, and unavailable states in Portuguese without exposing backend terminology or raw error details.

- [ ] Prove submission, recovery, registry, and scope behavior (AC: 1-7)
  - [ ] Unit-test exact aggregate composition, decimal/date preservation, generated-client header configuration, error-envelope parsing, field/resource-to-step mapping, and refusal to parse messages.
  - [ ] Component-test pending guards, conflict highlighting/focus, preservation of unrelated values, unknown-outcome snapshot locking, same-key/same-payload retry, confirmed-conflict editing, terminal idempotency behavior, cleanup order, and fresh-key reopen.
  - [ ] API contract and real-PostgreSQL test Project list/detail scope, empty results, deterministic cursors, search by duplicate contract number, normalized name search, invalid/query-mismatched/foreign cursors, authorized detail, and non-disclosing cross-scope access.
  - [ ] Playwright-test complete submission, each affected subsection, unknown-outcome retry without duplication, successful cleanup/navigation, registry appearance/search, refresh abandonment, and Company change before, during, and after submission.
  - [ ] Assert no Client Component imports `src/generated` or low-level transport, no complete payload/key enters logs or URLs, and no test accepts local mock insertion as Project creation.
  - [ ] Run focused frontend/API tests, typecheck, lint/architecture checks, OpenAPI/Kubb generation and drift checks, production builds, and the Project wizard Playwright journey when implemented.

## Dev Notes

### Developer Context

- Story 4.9 closes Epic 4's browser-to-database path. Stories 4.1-4.7 own the local command and interaction; Story 4.8 owns authoritative atomic/idempotent creation; this story owns Server Action submission, recovery UX, current registry/detail reads, and post-success navigation.
- The baseline contains only the mock `/home/obras` route. Story 4.1 plans extraction to `features/projects`, while Story 4.8 plans only `POST /api/v1/projects`; therefore this story must add the minimum real list/detail contracts needed by AC 5-6 rather than pretending they already exist.
- Recovery has two materially different states. A canonical resource conflict proves rollback and permits correction; a transport failure leaves the commit result unknown and must retry the unchanged snapshot before any divergent payload is allowed.
- A corrected payload may reuse the session key only after a confirmed rolled-back conflict. If a prior request actually committed, Story 4.8 returns the original result for the unchanged payload or `IDEMPOTENCY_PAYLOAD_CONFLICT` for a divergent one.

### Submission and Recovery Contract

- Action input contains only `{ idempotencyKey, command }`; Corporation, Company, User, Session, role, status, audit fields, and timestamps remain trusted server/API concerns.
- Action success is a serializable discriminated result carrying `projectId` and `planned`. Recoverable failure carries stable code, safe field/resource details, request id, and a target step/subsection. Unknown outcome carries no invented business result.
- Resource recovery needs subsection metadata from the API because an Employment may be Manager, Technical Responsibility, or initial allocation. If Story 4.8's generated contract lacks that safe discriminator, complete the API response schema during implementation rather than guessing from ids.
- Do not expose the idempotency key in returned UI state, logs, telemetry, URLs, error messages, or Project detail. It remains in the in-memory wizard session and is passed serverward only.

### Project Read Contract

- `GET /api/v1/projects` follows `main-api/docs/PAGINATION.md`: `limit` 1-100/default 25, cursor maximum 2048, search maximum 120, query/scope binding, `limit + 1`, and canonical `pageInfo`.
- Allowlist registry sorting to non-null deterministic fields already persisted by Story 4.8, with `createdAt desc` as default and `id` as tie-breaker. If `name` or planned start is exposed as a sort, test duplicate values and mutable traversal behavior.
- Search is Company-scoped and matches normalized Project name or normalized optional contract number. Multiple Projects with the same contract number must all remain discoverable.
- Current detail is separate from future history. It may present the current baseline, current Client/accountability, current schedule summary, and current optional mobilization summaries, but must not add historical timelines or unbounded nested collections.

### Architecture Compliance

- Preserve frontend flow `page -> feature -> server action/query -> adapter/view model -> generated Kubb client -> API`. Client Components cannot import generated clients, transport, credentials, or trusted scope.
- Preserve backend flow `controller -> service -> handler -> Prisma`, canonical envelopes, trusted request context, non-disclosing scope, and shared cursor helpers. Do not add handwritten dashboard transport DTOs parallel to generated contracts.
- React Hook Form owns editable wizard values; local component/session state owns the idempotency key and temporary submission snapshot. Zustand, browser storage, cookies, URL state, and backend drafts remain prohibited for wizard data.
- Revalidation happens only after confirmed mutation success. The client clears its local session before `router.replace`; do not use a caught Server Action `redirect()` as a substitute for deterministic cleanup.
- Do not introduce React Query, another form framework, a second wizard/modal system, queues, events, caches, or background retry.

### Library and Framework Requirements

- Use repository-pinned Node `22.22.3`, Next.js `16.2.9`, React `19.2.4`, React Hook Form `^7.79.0`, Zod `^4.4.3`, Kubb `4.38.1`, Vitest `4.1.9`, and Playwright `1.61.1`.
- Generated Kubb mutation functions accept request configuration as their second argument; pass the standard `Idempotency-Key` there rather than modifying the generated client or low-level transport.
- Next.js Server Actions are remotely invokable mutation boundaries and must validate their input. `revalidatePath` is server-only; client navigation uses `useRouter` after local cleanup.
- Installed versions are authoritative. No dependency upgrade or new client-side server-state library is required.

### Current Files to Reconcile and Preserve

- `main-web-app/src/app/home/obras/page.tsx` currently renders the generic mock resource page after resolving Company workspace. Replace only its Projects composition while preserving `AppShell` and server-owned Company context.
- `main-web-app/src/components/pages/company/company-resource-page.tsx` still contains mock Works configuration and local insertion. Remove/extract only the `works` production path; preserve unrelated generic resources until their owning stories move them.
- `main-web-app/src/lib/api/server-client.ts` already forwards request config headers, refreshes invalid sessions once, and throws `ApiClientError` with raw canonical response data. Parse that data in a Projects adapter without weakening the shared server-only boundary.
- `main-web-app/src/components/modals/BaseFormModal.tsx`, `operations-modal.tsx`, and the Story 4.1 Projects shell remain the approved wizard infrastructure. Extend submission hooks without moving Project business rules into generic components.
- The Projects backend module, persistence, generated POST contract, and stable conflict codes are outputs of Story 4.8. Reconcile with the implementation actually present; do not duplicate its create route, hashing, or transaction logic.

### Testing Requirements

- Mocked action tests prove UI mapping but cannot prove idempotency or cursor scope. Keep Story 4.8's PostgreSQL concurrency suite authoritative for aggregate creation and add real-database list/detail coverage here.
- Simulate an unknown outcome by allowing the API commit response to be lost, then retry with the same key/payload and assert navigation to the single committed Project.
- For recoverable conflicts, assert the form retains unrelated dirty/touched values and that focus reaches the affected section/control without relying on English or Portuguese error copy.
- Test duplicate contract numbers explicitly: both rows must be searchable and cursor traversal must remain deterministic.
- Playwright must verify generated clients remain behind the Next.js boundary and that Company switching cannot carry the open command or a created Project route into another Company.

### Previous Story Intelligence

- Story 4.8 returns `201` with `{ projectId, status: "planned" }`, requires UUID v4 `Idempotency-Key`, uses stable codes plus `details.fields`/`details.resources`, and retains successful idempotency records for 30 days.
- Story 4.8 intentionally assigns dashboard submission/recovery and navigation to this story. It does not define Project list/detail endpoints, so their minimum current-state read slice belongs here.
- Story 4.1 requires memory-only state, one key per open session, deterministic discard, Company-change cancellation, accessible navigation, and no draft persistence. Submission must preserve those lifecycle guarantees.
- Stories 4.2-4.7 establish exact field names, normalized decimals, civil dates, step ownership, safe selector models, and conflict subsections. Reuse them without parallel schemas or data transformations.

### Git Intelligence Summary

- Baseline `9e243e1` contains the established Commercial, Workforce, and Fleet vertical-slice patterns, canonical server-only Kubb usage, cursor helpers, scoped detail routes, Server Actions, and PostgreSQL integration tests.
- Current registry mutations call generated clients from `"use server"` files and revalidate affected paths, but their `{ ok, message }` action state is too lossy for Project conflict recovery. Introduce a Projects-specific discriminated state rather than weakening every existing registry action.
- Stories 4.1-4.8 and existing sprint-status edits are intentional local artifacts. Preserve them byte-for-byte.

### Latest Technical Information

- Next.js 16 Server Actions are server mutation boundaries callable from the client and must perform their own input validation; use them for finalization, not for initial read pagination. [Source: main-web-app/node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md]
- `revalidatePath` can run in a Server Function and invalidates the specified route; client-side cleanup/navigation remains a separate concern. [Source: main-web-app/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md]
- `redirect()` throws and should live outside caught mutation blocks. Returning success to the Client Component is the safer fit when local memory must be cleared first. [Source: main-web-app/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/redirect.md]
- Repository-pinned versions and generated contracts remain authority; no package upgrade is part of this story. [Source: main-web-app/package.json]

### Project Structure Notes

- Keep Projects pages thin and place domain-specific components, action state, Server Actions, server queries, adapters, schemas, view models, and focused tests under `main-web-app/src/features/projects/**`.
- Add backend list/detail behavior inside `main-api/src/modules/projects/**`; extend shared pagination only when genuinely reusable and never create a module-local cursor format.
- Place full-stack wizard recovery coverage in `main-web-app/tests/e2e/project-wizard.spec.ts` and Projects list/detail integration coverage under `main-api/tests/integration/projects/**`.
- Generated OpenAPI/Kubb files are script outputs. Do not edit `main-api/artifacts/openapi.json` or `main-web-app/src/generated/**` manually.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-49-Submit-the-Wizard-and-Recover-Finalization-Conflicts]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic-4-Create-a-Complete-and-Consistent-Project]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-26-Finalize-Project-Atomically-and-Idempotently]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/addendum.md#Project-Transaction-Boundary]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/reconcile-wizard.md]
- [Source: _bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project-Wizard]
- [Source: main-api/docs/PAGINATION.md]
- [Source: main-web-app/src/app/home/obras/page.tsx]
- [Source: main-web-app/src/components/pages/company/company-resource-page.tsx]
- [Source: main-web-app/src/lib/api/server-client.ts]
- [Source: _bmad-output/implementation-artifacts/4-1-run-a-non-resumable-local-project-wizard.md]
- [Source: _bmad-output/implementation-artifacts/4-2-capture-project-identity-and-commercial-baseline.md]
- [Source: _bmad-output/implementation-artifacts/4-3-select-the-client-and-project-responsibilities.md]
- [Source: _bmad-output/implementation-artifacts/4-4-configure-the-weekly-schedule-and-break-templates.md]
- [Source: _bmad-output/implementation-artifacts/4-5-configure-optional-initial-employee-mobilization.md]
- [Source: _bmad-output/implementation-artifacts/4-6-configure-optional-initial-machine-mobilization.md]
- [Source: _bmad-output/implementation-artifacts/4-7-configure-optional-project-fuel-agreements.md]
- [Source: _bmad-output/implementation-artifacts/4-8-finalize-the-project-aggregate-atomically-and-idempotently.md]

## Security and Completeness Hardening Amendment

The following criteria are mandatory extensions of AC 1-7:

- **H1 — No scope-changing replay:** The finalization Server Action sends `X-Expected-Company-Id` from the immutable wizard session and invokes the generated POST with authentication auto-refresh disabled (`skipAuthRefresh: true`). A `SESSION_INVALID`, workspace mismatch, or revoked role is terminal for that attempt; the action must never refresh into another Company and replay the mutation.
- **H2 — Closed action result:** The Server Action returns a serializable discriminated union for `success`, `recoverable-conflict`, `unknown-outcome`, and `terminal-failure`. Branching uses only stable `code`, ordered `{ path, code }` fields, and ordered `{ kind, id, section, reason }` resources from Story 4.8; raw messages and unrecognized discriminators map to a safe terminal failure.
- **H3 — Multiple conflicts:** When multiple authorized conflicts are returned, the wizard marks every affected subsection, preserves every unrelated and stale local value, announces a summary, navigates/focuses the first affected subsection in canonical wizard order, and lets the administrator visit the remaining marked sections. Resolution is not reduced to one arbitrary resource.
- **H4 — Revoked-data presentation:** Stale selected resources remain identifiable only from the already-held safe view model. The UI never performs a foreign-id lookup or reveals newly unauthorized attributes; removal/replacement remains possible with a generic unavailable label.
- **H5 — Unknown outcome:** Command and key are frozen in memory and retry is manual, byte-equivalent at the command-model boundary, and single-flight. Editing is blocked until a canonical response resolves the outcome. If the page is lost, no automatic recovery is promised; the next session directs the administrator to inspect the registry before attempting a replacement Project, documenting the residual ambiguity.
- **H6 — Company/cache isolation:** Company change clears wizard, action result, cursor history, loaded registry pages, detail navigation and any request cache keyed below Company. A late response from the prior epoch is ignored and cannot navigate or repopulate the new workspace.
- **H7 — Deterministic tests:** Component/Playwright tests cover the A-to-B cross-tab Session switch, disabled auth refresh, late-response suppression, multiple simultaneous conflicts, revoked safe display data, unknown-outcome exit warning, identical manual retry, duplicate-click single flight, and cleanup-before-navigation.

The action input may carry `{ idempotencyKey, expectedCompanyId, command }`; `expectedCompanyId` is emitted only as the precondition header and must not be placed in the JSON body or treated as tenant authority.

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-07-01: Authored scope-safe Server Action, recovery states, registry/detail APIs, real Works pages, cleanup/navigation, and generated clients. Browser/test validation remains pending by user request.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Server Action submission, unknown-outcome retry, structured affected-step recovery, deterministic cleanup/navigation, and the missing current Project registry/detail contracts were reconciled.

### File List

- `main-web-app/src/features/projects/projects.actions.ts`
- `main-web-app/src/features/projects/projects.server.ts`
- `main-web-app/src/features/projects/components/projects-registry.tsx`
- `main-web-app/src/features/projects/components/project-detail.tsx`
- `main-web-app/src/app/home/obras/page.tsx`
- `main-web-app/src/app/home/obras/[projectId]/page.tsx`

### Change Log

- 2026-07-01: Created Story 4.9 implementation context for wizard submission and finalization-conflict recovery.
- 2026-07-01: Added scope-safe submission, closed action states, multi-conflict recovery, revoked-data safety, and Company isolation.
- 2026-07-01: Authored submission/recovery and the real Project registry/detail flow; validation gates remain pending.
