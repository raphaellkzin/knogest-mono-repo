---
baseline_commit: 96102b62dea8d9f9ea02e901411f2c5f5ffbcb09
---

# Story 1.4: Select and Change the Active Company Workspace

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to select or change the active Company,
so that every operational action occurs inside one clearly identified and trusted workspace.

## Acceptance Criteria

1. **Given** an authenticated Corporation-scoped Session  
   **When** the administrator requests available Companies  
   **Then** the API returns only active Companies belonging to the authenticated Corporation  
   **And** the request does not require or accept Company scope from the URL or browser payload.

2. **Given** the Corporation currently has no Companies  
   **When** the administrator reaches Company selection  
   **Then** the dashboard presents an understandable empty state  
   **And** refresh and logout remain available without treating the Session as invalid.

3. **Given** the administrator selects an eligible Company  
   **When** the selection command succeeds  
   **Then** the persisted Session is updated with that `companyId`  
   **And** a replacement access credential is issued with the selected Company context.

4. **Given** a Company belongs to another Corporation, is inactive, or does not exist  
   **When** selection is attempted  
   **Then** the command fails without revealing foreign record existence  
   **And** the prior Session context remains unchanged.

5. **Given** the Session already has a selected Company  
   **When** the administrator changes to another eligible Company  
   **Then** the new Company replaces the persisted operational context  
   **And** subsequent API calls derive scope exclusively from the updated Session.

6. **Given** a Company change succeeds  
   **When** the dashboard transitions to the new workspace  
   **Then** prior Company pagination, selections, forms, wizard state, view models, and Project navigation are cleared  
   **And** no stale request from the previous workspace may populate the new one.

7. **Given** a Company is selected  
   **When** the application shell is rendered  
   **Then** the selected Company is visibly identifiable  
   **And** authorized deep links that do not belong to the selected Company fail safely with a route back to a valid workspace.

8. **Given** an operational route is called with a Company-scoped Session  
   **When** a resource from a sibling Company is requested or mutated  
   **Then** trusted scope and ownership constraints prevent access  
   **And** the response is indistinguishable from an absent resource.

9. **Given** Company selection is performed from the dashboard  
   **When** the browser invokes the operation  
   **Then** a Server Action or server query uses the generated client through the application adapter  
   **And** no Client Component imports the generated API client or stores authenticated scope in Zustand.

10. **Given** Company selection and switching are tested  
    **When** integration and Playwright suites run  
    **Then** they cover zero Companies, successful selection, successful change, foreign and inactive Company rejection, stale-state clearing, visible workspace identity, deep-link safety, and cross-Company isolation  
    **And** Company scope is never supplied by the browser.

## Tasks / Subtasks

- [ ] Confirm the complete Organization/Auth/Session prerequisite chain (AC: 1-10)
  - [ ] Require Stories 1.1-1.3: active Corporation-owned Company records, Corporation-scoped login, persisted Session, trusted request context, refresh rotation, BFF cookies, revocation, and generated clients.
  - [ ] Reuse Organization's public Company lookup boundary and Auth's Session transition service; Auth must not import private Organization handlers or query Company from controllers.
  - [ ] Treat prior story files as planning context until implemented. Do not preserve the current mock selector as a functional fallback.

- [ ] Add scoped Company discovery (AC: 1, 2, 8)
  - [ ] Add a bounded `GET /api/v1/auth/companies` route available to a Corporation-scoped or Company-scoped Session; derive Corporation and User only from verified request context.
  - [ ] Return only active Companies owned by the authenticated Corporation, deterministically ordered and mapped to a minimal selector DTO. Do not accept `corporationId`, current `companyId`, tenant scope, search scope, or ownership filters from the request.
  - [ ] Keep the empty result as a successful `[]`, not an authentication error. Refresh, logout, session inspection, and later Company addition remain valid.
  - [ ] Use the architecture's documented bounded-catalog exception only if the API enforces the pilot maximum; otherwise use the canonical cursor contract rather than inventing offset pagination.

- [ ] Implement the trusted Company-context transition (AC: 3-5, 8)
  - [ ] Add `PUT /api/v1/auth/session/company` with `{ companyId: uuid }` as an untrusted command target. It is not authenticated scope and becomes trusted only after server-side Corporation ownership and active-state validation.
  - [ ] Resolve the target through Organization's public service inside the authenticated Corporation. Foreign, inactive, and absent Companies return the same non-disclosing `404`/stable code.
  - [ ] In one transaction, verify the Session is active, update only that Session's selected `companyId`, and preserve User/Corporation ownership, refresh chain, idle/absolute expiry, and revocation state.
  - [ ] If validation or persistence fails, leave the prior selected Company unchanged. Concurrent changes may have one committed order, but every returned credential must match the committed Session state.
  - [ ] Issue a replacement 15-minute access JWT from persisted context. Do not rotate refresh solely because Company changed; subsequent Story 1.3 refreshes must carry the latest persisted Company.
  - [ ] Ensure operational guards compare JWT Company context with persisted Session context or otherwise reject stale pre-switch access credentials immediately.

- [ ] Integrate Company selection through the Next.js application boundary (AC: 1-7, 9)
  - [ ] Create the `features/company-selection` vertical slice with server query, Server Action, adapter/view model, interactive selector/empty state, and generated clients; keep transport DTOs server-only.
  - [ ] After Corporation-scoped login, route to Company selection. A zero-Company Session remains on an accessible empty state with logout; a Session with a valid selected Company may enter `/home`.
  - [ ] Replace hard-coded `companies` and local `activeCompanyName` in `AppShell` with a server-derived safe view model and a mutation action. Preserve keyboard access, visible focus, responsive desktop/mobile selector, and stable pending/error feedback.
  - [ ] On successful selection/change, write only the replacement access cookie through the server boundary, refresh/re-render server data, and navigate to a valid root route. Never return the token to the component.
  - [ ] Keep the selected Company's safe identifier/name visibly present in the shell; remove mock region, project, machine, production, weather, and other unvalidated selector metrics.

- [ ] Prevent stale cross-Company frontend state (AC: 5-7, 9)
  - [ ] Establish one Company-context epoch/version in server-derived view models so responses started under the previous Company cannot commit into the new workspace.
  - [ ] Abort or ignore in-flight client requests and clear subordinate cursor histories, row selections, forms, modal state, wizard state, feature view models, and Project navigation after a successful switch.
  - [ ] Do not store `companyId`, authenticated Company, API entities, responses, or Session state in Zustand, local/session storage, URL parameters, or cookies separate from the Fastify-owned credential context.
  - [ ] Preserve Zustand only for ephemeral UI preferences; clear feature-local state through remount keys, navigation, action settlement, and explicit feature reset contracts.
  - [ ] Revalidate deep links and server queries against trusted selected Company. Foreign/stale resource IDs produce the same safe absent-resource behavior plus a route back to the selected workspace.

- [ ] Enforce Company ownership on operational boundaries (AC: 7, 8)
  - [ ] Require Company-scoped trusted context before every Company-owned service and pass `{ corporationId, companyId }` explicitly to handlers.
  - [ ] Keep composite ownership constraints and scoped queries as defense in depth; never query a resource globally and compare ownership afterward in a controller.
  - [ ] Add negative cross-Company tests at the first representative persisted operational endpoint available in the foundation proof; do not claim isolation based only on the Company selector.

- [ ] Regenerate the contract and remove selector mocks (AC: 1-10)
  - [ ] Generate Fastify-owned schemas/OpenAPI and Kubb TypeScript/Zod/server clients for Company list and selection; do not handwrite duplicate request/response types.
  - [ ] Adapt stable error codes into empty, unauthorized, stale-session, non-disclosing not-found, and retryable presentation states without parsing messages.
  - [ ] Remove production mock Company lists and selected-Company local state as the real slice lands. Keep mock values only as explicit test fixtures.

- [ ] Test selection, switching, and isolation end to end (AC: 1-10)
  - [ ] Unit-test selector adapters, empty/error states, target UUID validation, shell visibility, context-epoch behavior, and feature reset contracts.
  - [ ] Add real-PostgreSQL integration tests for zero Companies, active list scoping/order, initial selection, switch, unchanged prior context on failure, foreign/inactive/absent target equivalence, stale JWT rejection, and concurrent changes.
  - [ ] Add negative tests proving list request scope cannot be overridden and selection's `companyId` is validated only as a target inside the trusted Corporation.
  - [ ] Add Playwright coverage for post-login selection, empty state/logout, desktop/mobile switching, visible identity, cleared forms/pagination/wizard state, stale response suppression, deep-link recovery, and sibling-Company isolation.
  - [ ] Run architecture checks, formatting, lint, typecheck, unit/integration tests, generation drift, Playwright, and production builds in both repositories.

## Dev Notes

### Developer Context

- Story 1.2 creates a Corporation-scoped Session with no Company; Story 1.3 makes that Session renewable/revocable. This story is the only transition into Company-scoped operational access.
- Current frontend Company behavior is entirely local mock state: `AppShell` owns a hard-coded array and changes only `activeCompanyName`; operational pages render production-like mock metrics. Replace this behavior rather than adapting it into authenticated state.
- Current `/home/company` redirects back to `/home`, and `/home` trusts the NextAuth User session. The target flow must distinguish valid Corporation-scoped authentication from a valid selected Company.
- Later registry/project stories depend on the trusted `{ corporationId, companyId }` handler scope and stale-state reset contract established here.

### Technical Requirements

- Corporation scope always comes from persisted verified Session context. The list endpoint accepts no Company/Corporation scope input.
- Selection necessarily carries a target `companyId`; this is untrusted command data, analogous to a destination identifier, and must never be confused with the trusted current Company context.
- A Company is selectable only when active and owned by the authenticated Corporation. The MVP `MASTER_ADMIN` has access to every eligible Company in that Corporation; keep boundaries compatible with future grants.
- Successful selection updates persisted Session context before signing the replacement access JWT. Tokens must never claim a Company that the Session does not currently hold.
- Old access tokens from before a switch must not continue authorizing sensitive operations. Persisted Session validation/context-version comparison must make the switch immediately effective.
- URLs, Zustand, Web Storage, component props from the browser, request bodies for operational resources, and query parameters never become the trusted Company scope.
- Do not add React Query, client-side API clients, a second Company cookie, browser persistence, or frontend business-authorization logic.

### API and Interface Contracts

- `GET /api/v1/auth/companies` returns a bounded safe selector representation for active Companies in trusted Corporation context. Empty is a successful collection.
- `PUT /api/v1/auth/session/company` accepts only `{ companyId: string }` as a target; success returns replacement server-confidential access material and safe selected-Company metadata for the BFF.
- Foreign, inactive, and absent targets are externally indistinguishable and leave Session state unchanged. Stable codes/statuses follow the canonical envelope and non-disclosure rules.
- Authenticated-session inspection must return enough safe state for the BFF to distinguish Corporation-scoped from Company-scoped and render the selected Company's safe identity without exposing tokens.

### Architecture Compliance

- Company records are owned by Organization; Session context transitions and access credential issuance are owned by Auth. Cross-domain coordination uses public services and a shared transaction context where atomicity requires it.
- Backend remains `controller -> service -> handler -> Prisma`; frontend remains `page -> feature -> server action/query -> adapter/view model -> generated client`.
- Components never import Kubb clients, credentials, or transport DTOs. Authenticated scope does not enter Zustand.
- Use canonical response/error envelopes, request correlation, global error formatting, and non-disclosing `404` semantics for foreign resources.

### Current Files to Reconcile and Preserve

- Backend surfaces include Auth routes/controller/service/handlers, Organization Company public boundary, Session request-context/auth plugin, Prisma schema/migrations, OpenAPI generation, and integration fixtures.
- Frontend surfaces include `src/components/layout/app-shell.tsx`, `src/app/home/page.tsx`, `src/app/home/company/page.tsx`, `src/stores/app.store.ts`, Auth/session adapters, generated clients, and E2E authentication/company tests.
- Preserve the shell's accessible desktop/mobile navigation, visual tokens, CSP/security headers, safe logout, and independent application build while removing mock Company authority and out-of-scope operational metrics.
- Do not bulk-rewrite every mock operational page in this story; remove or gate content that would display under an untrusted/absent Company and establish the real shell/context path later vertical slices consume.

### Testing Requirements

- Integration tests must use migrated PostgreSQL and at least two Corporations with sibling Companies, inactive Companies, and same-shaped resource fixtures to prove non-disclosure.
- Assert Session database state and replacement JWT claims together after selection and switching; assert unchanged state after every rejection.
- Test old-token behavior after a switch so immediate context replacement is proven rather than assumed.
- E2E must begin with real domain login and use browser -> BFF -> API boundaries. It must not inject Company scope into storage, URL, or client state.
- Stale-state tests must delay a prior-Company response, switch Company, release the response, and prove it cannot render in the new workspace.

### Previous Story Intelligence

- Story 1.3 centralizes cookie mutation, persisted revocation, session inspection, access retry, and BFF single-flight. Reuse those server-only boundaries when replacing the access credential after Company selection.
- Story 1.3 requires refresh to carry the persisted optional Company context. Selection must update that same Session record without inventing a parallel browser Company state.
- Story 1.2 already defines a pre-Company guard allowing only session inspection, Company listing/selection, refresh, and logout. This story fills the list/selection routes and must leave that guard strict.

### Git Intelligence Summary

- The repository's visual shell is established, but its Company data is mock-only. Preserve presentation primitives and accessibility, not hard-coded business content or local scope authority.
- Existing uncommitted changes in `start-dev.sh`, `app.md`, and `main-web-app/pnpm-workspace.yaml` are outside this story and must remain untouched.

### Latest Technical Information

- Next.js 16 cookie reads are async, and replacement access cookies can be written only by a Server Function/Action or Route Handler. [Source: https://nextjs.org/docs/app/api-reference/functions/cookies]
- Server Actions can refresh the router after mutation, while cache invalidation should use the narrowest `revalidatePath`/tag boundary needed; Company switching must not rely on a client cache as the security boundary. [Source: https://nextjs.org/docs/app/api-reference/directives/use-server]
- Prisma interactive transactions support explicit isolation and bounded retry for PostgreSQL write conflicts; keep the Session transition transaction short. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]

### Project Structure Notes

- Create the architecture's intended `features/company-selection` slice when integrating this vertical behavior; do not hide it inside shared UI primitives or the Zustand store.
- No standalone UX specification exists. The existing shell is the visual reference; epics/PRD/architecture govern empty-state, scope, switching, and mock removal behavior.
- The pilot supports up to three Companies, making a bounded selector reasonable, but the API must enforce/document that bound before bypassing canonical pagination.

### References

- [Source: _bmad-output/implementation-artifacts/1-3-renew-and-revoke-browser-sessions-safely.md]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-14-Select-and-Change-the-Active-Company-Workspace]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-4-Select-and-Change-Company]
- [Source: _bmad-output/planning-artifacts/architecture.md#Two-Stage-Company-Context]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Tenant-and-Ownership-Isolation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements-to-Structure-Mapping]
- [Source: main-api/docs/TENANCY.md]
- [Source: main-web-app/docs/ARCHITECTURE.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Trusted target-versus-scope semantics, stale-state invalidation, current mock behavior, and cross-Company isolation were reconciled.
- Implemented scoped Company listing and Session Company selection endpoints with persisted `companyId` transition and replacement access credential.
- Replaced the AppShell's mock Company authority with server-derived Company options and a Server Action selection path.
- Added post-login Company selection and zero-Company empty state while preserving logout access.
- Removed the workspace-selection mock Company list from the authenticated shell path.
- Validation not completed in this run because the user explicitly requested to run tests themselves.

### File List

- main-api/src/modules/auth/auth.controller.ts
- main-api/src/modules/auth/auth.dto.ts
- main-api/src/modules/auth/auth.service.ts
- main-api/src/modules/auth/handlers/login.handler.ts
- main-api/artifacts/openapi.json
- main-web-app/src/generated/**
- main-web-app/src/features/company-selection/**
- main-web-app/src/components/layout/app-shell.tsx
- main-web-app/src/app/home/page.tsx
- main-web-app/src/app/home/company/page.tsx
- main-web-app/src/app/home/configuracoes/page.tsx
- main-web-app/src/app/home/fornecedores/page.tsx
- main-web-app/src/app/home/funcionarios/page.tsx
- main-web-app/src/app/home/maquinas/page.tsx
- main-web-app/src/app/home/obras/page.tsx
- main-web-app/src/app/home/workspaces/page.tsx
- main-web-app/src/components/pages/workspaces/workspace-selection.tsx
