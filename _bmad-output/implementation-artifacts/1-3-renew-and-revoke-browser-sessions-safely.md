---
baseline_commit: 96102b62dea8d9f9ea02e901411f2c5f5ffbcb09
---

# Story 1.3: Renew and Revoke Browser Sessions Safely

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want my authenticated Session to renew securely and terminate predictably,
so that I can remain signed in without allowing stolen or superseded credentials to remain usable.

## Acceptance Criteria

1. **Given** a valid current refresh credential  
   **When** the access credential requires renewal  
   **Then** the API atomically consumes the current refresh credential and issues a replacement  
   **And** only a cryptographic hash of the replacement is persisted.

2. **Given** a refresh rotation completes successfully  
   **When** the response reaches the browser  
   **Then** the prior refresh credential is no longer valid  
   **And** the replacement retains the Session's trusted Corporation and optional selected Company context.

3. **Given** a refresh credential has been consumed by a prior successful rotation  
   **When** that superseded credential is presented again  
   **Then** the complete Session is revoked as potentially compromised  
   **And** access and refresh cookies are cleared without issuing new credentials.

4. **Given** two concurrent requests present the same current refresh credential  
   **When** rotation is processed  
   **Then** refresh reuse handling revokes the complete Session  
   **And** no valid parallel refresh chain survives the race.

5. **Given** a Session has been idle for seven days or has reached its 30-day absolute lifetime  
   **When** refresh is attempted  
   **Then** renewal is rejected  
   **And** the Session is treated as expired regardless of JWT validity.

6. **Given** a Session has been revoked  
   **When** a security-sensitive authenticated route receives an otherwise valid access JWT for that Session  
   **Then** persisted Session state causes the request to fail  
   **And** no operational data is returned.

7. **Given** the Master Administrator chooses to log out  
   **When** logout is submitted  
   **Then** the current persisted Session is revoked  
   **And** both browser credential cookies are cleared.

8. **Given** a cookie-authenticated mutation such as refresh or logout  
   **When** the request origin is not trusted  
   **Then** the operation is rejected  
   **And** `SameSite` behavior is not treated as the only origin defense.

9. **Given** an access credential expires during a server-side dashboard request  
   **When** renewal is still valid  
   **Then** one controlled BFF refresh path renews the Session and retries the intended operation safely  
   **And** Client Components do not create competing refresh loops.

10. **Given** multiple BFF requests discover the same expired access credential  
    **When** renewal is required  
    **Then** the BFF coordinates refresh as a single-flight operation for that Session  
    **And** concurrent application requests reuse the one renewal result instead of presenting the same refresh credential twice.

11. **Given** a refresh, reuse, logout, expiration, or revocation event occurs  
    **When** it is logged  
    **Then** the event includes `requestId`, stable operation name, safe scope identifiers, and outcome  
    **And** it excludes credentials, cookie values, token material, and complete request bodies.

12. **Given** Session behavior is tested  
    **When** the integration and E2E suites run  
    **Then** they cover rotation, concurrent rotation, reuse detection, idle expiry, absolute expiry, logout, persisted revocation, origin rejection, cookie clearing, and safe server-side renewal  
    **And** no test bypasses persisted Session state.

## Tasks / Subtasks

- [ ] Confirm the Story 1.1/1.2 Session and browser-auth foundation (AC: 1-12)
  - [ ] Require the migrated Session model, versioned refresh hash, idle/absolute expiry, revocation state, trusted request context, login-issued cookies, and generated-contract pipeline; do not create a second Session representation.
  - [ ] Treat Stories 1.1 and 1.2 as prerequisites, not proof of implemented code. Stop if their required schema or browser boundary is absent rather than hiding the gap inside this story.
  - [ ] Preserve Fastify as the sole Session authority and the frontend as a server-only credential adapter.

- [ ] Implement atomic refresh rotation and reuse detection (AC: 1-5)
  - [ ] Add `POST /api/v1/auth/refresh` through Fastify route schema, controller, Auth service, Session handlers, canonical envelopes, and generated Kubb artifacts.
  - [ ] Hash the presented opaque credential with the established one-way refresh-token digest and compare against persisted current/consumed rotation state without storing plaintext.
  - [ ] Rotate in one short database transaction: lock or conditionally update the current Session/credential version, validate active/idle/absolute state, persist only the replacement hash, advance rotation state, and update last-use/idle expiry without extending the absolute expiry.
  - [ ] Use a conditional write, appropriate row lock, or `SERIALIZABLE` transaction plus bounded retry so exactly one concurrent consumer can rotate. If a second consumer presents the superseded credential, revoke the entire Session and leave no valid descendant chain.
  - [ ] Preserve trusted `userId`, `corporationId`, `sessionId`, role, and optional persisted `companyId`; never accept any of these values from the refresh request.
  - [ ] Return a new 15-minute access JWT and opaque refresh value only across the confidential API-to-BFF boundary. The public browser action result must contain neither value.

- [ ] Enforce expiry and persisted revocation consistently (AC: 5, 6)
  - [ ] Treat `revokedAt`, seven-day idle expiry, and 30-day absolute expiry as authoritative even when JWT signature/`exp` remain valid.
  - [ ] Extend the authentication/request-context plugin so security-sensitive routes load and validate persisted Session state before service execution; share this guard instead of adding route-local checks.
  - [ ] Use one trusted database/transaction clock for expiry and revocation comparisons; do not derive security state from browser time or local timezone.
  - [ ] Map invalid, expired, reused, and revoked credentials to stable non-disclosing authentication codes and clear both cookies through the BFF.

- [ ] Implement revoking logout and origin validation (AC: 7, 8, 11)
  - [ ] Add `POST /api/v1/auth/logout`; identify the current Session only from verified authentication context, make repeated logout safe, and revoke before returning success.
  - [ ] Add one shared trusted-origin validator for refresh and logout using the configured application origin/normalized host plus forwarded-proxy trust rules. Reject missing or mismatched `Origin`/Fetch Metadata according to the documented same-origin policy.
  - [ ] Do not add a browser-supplied Session ID, Corporation ID, Company ID, access token, or refresh token to mutation payloads.
  - [ ] Clear access and refresh cookies with the same name, path, host-only scope, and environment-specific security attributes used when setting them.
  - [ ] Emit structured security events with `requestId`, operation, safe Session/User/Corporation identifiers where authenticated, outcome, and timing; redact all credential material and bodies.

- [ ] Add one controlled BFF renewal path (AC: 2, 3, 7-10)
  - [ ] Centralize access/refresh cookie reads, writes, and clearing in `main-web-app/src/lib/auth`; use async `cookies()` only from Server Actions/Functions or Route Handlers when mutating cookies.
  - [ ] Reconcile the server-only API client so one request receiving an access-authentication expiry may invoke refresh once and retry the original request once. Never retry authorization, validation, conflict, or arbitrary network failures as authentication refreshes.
  - [ ] Coordinate concurrent refresh attempts with a server-only single-flight registry keyed by a non-secret Session-safe key. Do not key logs or maps by raw tokens and do not expose the registry to Client Components or Zustand.
  - [ ] Ensure all waiters receive the same successful credential update or the same terminal failure; a failed/reused/revoked refresh clears cookies and routes the user to login without a loop.
  - [ ] Replace the current NextAuth `signOut` behavior with a Server Action that invokes API logout, clears cookies even on already-invalid credentials, and redirects safely to `/auth/login`.

- [ ] Regenerate and consume the canonical Auth contract (AC: 1-12)
  - [ ] Define refresh/logout success and every expected error in Fastify schemas; keep token-bearing API-to-BFF responses server-confidential and return only safe action/view-model states to components.
  - [ ] Regenerate API OpenAPI and dashboard Kubb TypeScript/Zod/server clients with the exact reconciled version set; do not hand-edit generated code or duplicate DTOs.
  - [ ] Keep `requestId` propagation across the retried operation and refresh call while giving each API request an independently traceable request identifier where the correlation model requires it.

- [ ] Prove the complete Session lifecycle (AC: 1-12)
  - [ ] Unit-test credential generation/hash behavior, expiry boundaries, origin validation, stable error mapping, cookie options/clearing, retry classification, and single-flight settlement.
  - [ ] Add real-PostgreSQL integration tests for successful rotation, old-hash invalidation, hash-only storage, optional Company preservation, idle and absolute boundaries, explicit logout, immediate persisted revocation, and idempotent repeated logout.
  - [ ] Use controlled concurrent database requests to prove one winner followed by complete Session revocation and no surviving refresh chain; assert database state, not only HTTP responses.
  - [ ] Add negative tests for foreign/malformed credentials, browser-supplied scope, untrusted origin, valid JWT backed by revoked Session, and secrets absent from logs/errors.
  - [ ] Add Playwright coverage through the real BFF for automatic server-side renewal, concurrent server requests, logout, terminal refresh failure, cookie deletion, no Client Component loop, and no token in DOM/URL/Web Storage/action payloads.
  - [ ] Run architecture checks, formatting, lint, typecheck, unit/integration tests, generation-drift checks, Playwright, and production builds in both repositories.

## Dev Notes

### Developer Context

- Stories 1.1 and 1.2 are hard prerequisites. Story 1.2 creates the initial persisted Session, opaque refresh credential, 15-minute JWT, trusted context, and BFF cookies; this story owns every transition after login.
- The current checked-in code is still the template path: JWT-only authentication, four-hour tokens, NextAuth-owned browser Session, and no Session persistence. Do not bolt rotation onto that path. Implement prerequisite stories first and replace the old authority end to end.
- Story 1.4 will update the same persisted Session with selected Company context. Rotation must carry the current persisted `companyId` forward but must not implement Company selection.
- Story 1.5 will revoke all Sessions after a password reset. Keep the Session revocation service reusable for both current-Session logout and all-User-Session invalidation.

### Technical Requirements

- Access JWT lifetime remains exactly 15 minutes. Refresh idle expiration is seven days from allowed activity; absolute expiration remains fixed at 30 days from Session creation.
- Refresh values are cryptographically random, opaque, single-use credentials. Only a cryptographic digest and required rotation metadata are persisted.
- Reuse detection is not a normal `401` alone: it atomically revokes the whole Session, prevents any descendant refresh chain from surviving, clears browser cookies, and records a safe security event.
- A refresh transaction must be concurrency-correct under PostgreSQL, bounded in duration, and retry only recognized serialization/write-conflict failures. Do not use an in-memory backend mutex as the correctness boundary.
- The BFF single-flight mechanism prevents its own duplicate refreshes but does not replace database concurrency/reuse protection; correctness must hold across processes and direct API concurrency.
- Production cookies remain host-only `__Host-*`, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, with no `Domain`. Local HTTP may vary only through typed configuration established by Story 1.2.
- Cookie-authenticated mutations validate trusted origin. `SameSite`, proxy cookie presence, and CORS configuration are defense layers, not authorization.
- Do not add Redis, distributed locks, browser token timers, React Query, token data in Zustand, client-side refresh interceptors, or a second Session authority.

### API and Interface Contracts

- `POST /api/v1/auth/refresh` has no browser-controlled scope. The server-confidential request carries only the current refresh credential through the established BFF transport; success yields replacement access/refresh material plus safe Session metadata for the BFF.
- `POST /api/v1/auth/logout` has no Session identifier payload. Verified access/refresh context identifies the Session; repeated calls settle in a logged-out browser state.
- Refresh/logout errors use the canonical `{ success: false, code, message, details, requestId }` envelope. The BFF branches on stable codes, never message strings.
- Cookie writes and deletes occur only in a Server Action/Function or Route Handler. Components receive safe states such as authenticated, signed-out, or retryable/terminal error—not credentials or transport DTOs.

### Architecture Compliance

- Backend remains `controller -> service -> handler -> Prisma`. Controllers validate transport/origin and delegate; services own rotation/revocation rules; handlers alone perform scoped conditional writes/transactions.
- Centralize Session revocation, credential digest/generation, origin validation, request context, errors, and logging. Do not duplicate them in refresh, logout, password reset, or frontend adapters.
- Frontend remains `server action/query -> adapter -> generated client`; generated clients and credentials stay server-only.
- Global Fastify error handling owns canonical formatting. Controllers must not reintroduce broad local `try/catch` response conversion.

### Current Files to Reconcile and Preserve

- Backend foundation surfaces include `src/app.ts`, `src/routes/v1-routes.ts`, `src/lib/plugins/auth.plugin.ts`, typed environment/security helpers, Auth controller/service/handlers, Prisma Session schema/migrations, and integration-test helpers.
- Frontend surfaces include `src/lib/api/server-client.ts`, `src/lib/auth/*`, the sign-out component/action, `proxy.ts`, generated Auth clients, and authentication E2E tests.
- Preserve the Fastify app factory/injection pattern, `/api/v1` prefix, Prisma adapter/transaction context, CSP/security headers, server-only generated client boundary, accessible pending feedback, and safe redirects.
- Remove or replace NextAuth-specific logout/token helpers only after Story 1.2's Fastify-owned cookie path exists. Generated Prisma/Kubb artifacts are regenerated, never manually edited.

### Testing Requirements

- PostgreSQL integration tests must use real migrations and deterministic clocks or explicit persisted timestamps. Mock-only tests cannot prove atomic consumption or reuse races.
- The concurrency test must start two refresh attempts with the same credential close enough to overlap, wait for both, and prove the Session is revoked and neither returned chain can refresh again.
- Verify both expiry boundaries exactly before, at, and after the cutoff; the absolute lifetime must never slide.
- Capture logs, errors, response bodies, browser storage, URLs, action payloads, and cookies where observable to prove secrets are absent.
- E2E must exercise the browser -> Next.js BFF -> Fastify -> PostgreSQL path and cannot seed an already-authenticated client by bypassing Session persistence.

### Previous Story Intelligence

- Story 1.2 establishes host-derived Corporation scope, generic auth failures, initial refresh-hash-only Session persistence, host-only cookies, pre-Company route restrictions, and removal of NextAuth as an authority. Reuse those exact abstractions.
- Story 1.2 deliberately defers rotation, logout, reuse handling, and single-flight behavior here. Do not leave placeholder refresh/logout endpoints after this story.
- Story 1.1 defines transaction-aware handler context, Session rotation fields, versioned security utilities, real-PostgreSQL tests, and architecture checks that forbid direct Prisma access outside handlers.

### Git Intelligence Summary

- Recent Git history is a template baseline rather than evidence of a production Session design. The current auth code must be reconciled to the approved architecture, not preserved as a public contract.
- Existing uncommitted changes in `start-dev.sh`, `app.md`, and `main-web-app/pnpm-workspace.yaml` belong to the user; do not overwrite, normalize, or reformat unrelated content.

### Latest Technical Information

- Next.js 16 `cookies()` is async, and cookie mutation is supported only in Server Functions/Actions or Route Handlers; deletion must match the cookie's domain/protocol boundary. [Source: https://nextjs.org/docs/app/api-reference/functions/cookies]
- Prisma interactive transactions support explicit `Serializable` isolation; PostgreSQL write conflicts may surface as `P2034` and require bounded application retry. Keep transactions short. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Use Node's `node:crypto` primitives for cryptographically secure random credential generation and digest operations; never use `Math.random` or reversible storage for refresh credentials. [Source: https://nodejs.org/docs/latest-v22.x/api/crypto.html]

### Project Structure Notes

- The target Auth feature/module structure is ahead of the current repositories. Move only the vertical Session slice required here; avoid an unrelated bulk reorganization.
- No standalone UX document exists. Preserve the existing visual system while replacing mock/session behavior with the product contract.
- A single-flight registry is process-local optimization only. Its API should be server-only and settle/evict entries reliably so failures do not leak promises or block later logins.

### References

- [Source: _bmad-output/implementation-artifacts/1-2-authenticate-through-the-corporation-domain.md]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-13-Renew-and-Revoke-Browser-Sessions-Safely]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-3-Maintain-Revocable-Session]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication--Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Development-Authentication-Configuration]
- [Source: main-api/AGENTS.md]
- [Source: main-web-app/AGENTS.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Refresh concurrency, reuse revocation, BFF single-flight behavior, and current repository incompatibilities were reconciled.
- Implemented Fastify refresh/logout endpoints, refresh hash rotation, consumed-hash reuse detection, Session revocation, and trusted-origin validation.
- Added BFF cookie helpers, server-side refresh single-flight, retry-on-session-invalid path, and API-backed logout action that clears cookies terminally.
- Added real PostgreSQL integration coverage draft for rotation, reuse, expiry, logout, persisted revocation, and origin rejection.
- Regenerated OpenAPI and Kubb artifacts for the new Auth endpoints.
- Validation not completed in this run because the user explicitly requested to run tests themselves.

### File List

- main-api/prisma/schema.prisma
- main-api/prisma/migrations/20260630220000_session_refresh_reuse_detection/migration.sql
- main-api/src/modules/auth/auth.controller.ts
- main-api/src/modules/auth/auth.service.ts
- main-api/src/modules/auth/handlers/login.handler.ts
- main-api/src/modules/auth/origin-policy.ts
- main-api/src/modules/auth/origin-policy.test.ts
- main-api/tests/integration/auth/session-lifecycle.test.ts
- main-api/artifacts/openapi.json
- main-web-app/src/lib/auth/auth-cookies.server.ts
- main-web-app/src/lib/auth/session-refresh.server.ts
- main-web-app/src/lib/api/server-client.ts
- main-web-app/src/features/auth/actions/forget-browser-session.action.ts
- main-web-app/src/generated/**
