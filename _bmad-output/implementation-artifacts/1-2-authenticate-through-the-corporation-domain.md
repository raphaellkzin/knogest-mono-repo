---
baseline_commit: 96102b62dea8d9f9ea02e901411f2c5f5ffbcb09
---

# Story 1.2: Authenticate Through the Corporation Domain

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want to sign in through my Corporation's domain,
so that my identity and tenant scope are established before I access operational data.

## Acceptance Criteria

1. **Given** an active Domain associated with one active Corporation  
   **When** the login page is requested through that normalized host  
   **Then** the Next.js BFF preserves the trusted host for the API  
   **And** Corporation scope is never accepted from a route parameter, query, form field, or browser store.

2. **Given** an unknown, malformed, or inactive Domain  
   **When** login is attempted  
   **Then** authentication is rejected  
   **And** the response does not reveal Corporation or User existence.

3. **Given** an active Master Administrator in the resolved Corporation  
   **When** the administrator submits the correct normalized email and password  
   **Then** the API verifies the Argon2id password hash  
   **And** creates a persisted Corporation-scoped Session without a selected Company.

4. **Given** a Corporation-scoped Session without a selected Company  
   **When** an access credential is issued  
   **Then** it contains trusted `userId`, `corporationId`, `sessionId`, role, and no `companyId`  
   **And** its lifetime is 15 minutes.

5. **Given** a valid Corporation-scoped Session  
   **When** it calls an API operation  
   **Then** only Company listing, Company selection, refresh, logout, and authenticated-session inspection are permitted  
   **And** Company-owned operational routes reject the request.

6. **Given** an incorrect password, unknown email, or User from another Corporation  
   **When** login is attempted  
   **Then** the same generic authentication error and status are returned  
   **And** no account-discovery detail is exposed in logs or responses.

7. **Given** repeated login attempts from a host and source IP  
   **When** the configured rate limit is exceeded  
   **Then** the API returns the canonical `429` error envelope  
   **And** no permanent account lockout is created.

8. **Given** the login succeeds in a browser  
   **When** credentials are returned through the BFF  
   **Then** access and refresh material are stored only in host-only, `HttpOnly` cookies using environment-appropriate transport flags  
   **And** Client Components, browser storage, URLs, and rendered page data never receive token material.

9. **Given** the dashboard authentication authority is reconciled  
   **When** the new login flow is active  
   **Then** NextAuth no longer creates or validates an independent Session  
   **And** Fastify remains the sole Session authority.

10. **Given** login is tested  
    **When** unit, PostgreSQL integration, and Playwright suites run  
    **Then** they cover valid login, unknown host, inactive Domain, invalid credentials, cross-Corporation email reuse, rate limiting, restricted pre-selection access, and absence of credential exposure  
    **And** every suite uses the canonical API and Session boundaries.

## Tasks / Subtasks

- [x] Confirm and consume the Story 1.1 Organization/Auth foundation (AC: 1-6, 10)
  - [x] Require the migrated Corporation, Domain, User, Session, and Company schema plus shared normalization/password services from Story 1.1; do not recreate parallel models or helpers.
  - [x] Use the existing domain public boundaries and `controller -> service -> handler -> Prisma` dependency direction; only handlers query Domain, User, or Session.
  - [x] Treat the Story 1.1 file as planning context only until its implementation is complete; do not claim prior implementation learnings or bypass missing prerequisites.

- [x] Establish trusted host resolution at the BFF/API boundary (AC: 1, 2, 6)
  - [x] Read the incoming host only in server infrastructure, normalize it with the Story 1.1 canonical normalizer, and forward one trusted normalized host from Next.js to Fastify.
  - [x] Configure Fastify's proxy/host trust explicitly for the deployed BFF hop and local development; do not accept Corporation/Domain identifiers from login JSON, route parameters, query strings, Client Components, Zustand, or callback URLs.
  - [x] Resolve exactly one active Domain and active Corporation before querying credentials. Unknown, malformed, inactive, or ambiguous hosts must follow the same generic authentication failure path.
  - [x] Add the deterministic `piloto.localhost` path to local/E2E setup so tests exercise host resolution rather than injecting Corporation IDs.

- [x] Replace the placeholder backend login with a persisted Corporation-scoped Session (AC: 2-7)
  - [x] Change the login request contract from `{ username, password }` to `{ email, password }`; normalize email and look up an active `MASTER_ADMIN` only inside the resolved Corporation.
  - [x] Verify Argon2id using the shared versioned password service and opportunistically rehash after successful verification when parameters are outdated.
  - [x] Return one generic stable authentication error/status for unknown host, inactive Domain/Corporation/User, unknown email, wrong password, and cross-Corporation mismatch; preserve comparable work where practical to reduce enumeration signals.
  - [x] Create the persisted Session and initial refresh credential atomically. Store only the refresh hash plus idle/absolute expiry metadata; never store or log plaintext access/refresh material.
  - [x] Sign a 15-minute access JWT containing only trusted `userId`, `corporationId`, `sessionId`, `role`, and no `companyId`; validate claim shape and persisted Session state in the authentication plugin.
  - [x] Define a request context that derives User, Corporation, Session, role, and optional Company exclusively from verified claims and persisted state.

- [x] Enforce the pre-Company authorization state (AC: 4, 5)
  - [x] Add a reusable guard that permits Corporation-scoped Sessions only on authenticated-session inspection, Company listing/selection, refresh, and logout routes.
  - [x] Require a trusted selected `companyId` for every Company-owned operational route; reject missing Company context before service execution without accepting a browser-supplied substitute.
  - [x] Keep Company listing/selection behavior itself for Story 1.4 and refresh/logout rotation behavior for Story 1.3; this story establishes route/guard compatibility and the login/session state they consume.

- [x] Add canonical errors, correlation, logging, and rate limiting (AC: 2, 6, 7)
  - [x] Reconcile the API response layer to canonical error `{ success: false, code, message, details, requestId }` and success `{ success, message, data }` envelopes for the login surface.
  - [x] Generate/propagate a UUID `requestId` and log stable operation, normalized safe host fingerprint/scope identifier, source metadata, outcome, and timing without email, password, hashes, cookies, tokens, or full bodies.
  - [x] Rate-limit login by normalized host and trusted source IP with bounded configurable values, canonical `429`, and no permanent User lockout; ensure malformed/unknown hosts cannot create unbounded limiter keys.
  - [x] Keep foreign-Corporation and absent records non-disclosing and ensure unexpected failures pass through the global sanitized error handler rather than controller-local generic `try/catch` formatting.

- [x] Replace NextAuth with the Fastify-owned BFF login flow (AC: 1, 8, 9)
  - [x] Replace `signIn("credentials")` and `getServerSession()` with an Auth feature Server Action/query and server-only Session adapter that call the generated Kubb client.
  - [x] Remove the NextAuth route, provider/options, JWT/token decoding, module augmentation, and dependency once no imports remain; do not keep two Session authorities during transition.
  - [x] Keep the existing login page's visual system, accessibility, responsive behavior, pending state, and readable generic error, but remove the mock Company chooser because Company selection occurs after Corporation-scoped login in Story 1.4.
  - [x] Write access and refresh values only from a Server Action or Route Handler using host-only `HttpOnly`, `SameSite=Lax`, `Path=/` cookies; use production `__Host-`/`Secure` names and explicit development-only names/transport relaxation for local HTTP.
  - [x] Ensure generated clients and cookie operations remain server-only. Client Components receive only safe action results and never token strings, cookie values, transport DTOs, Corporation IDs, or authenticated scope.
  - [x] Update `proxy.ts` to use cookie presence only for navigation convenience. Pages, actions, and API calls must revalidate the Session through the server boundary; proxy/middleware is never authorization.

- [x] Regenerate and consume the canonical contract (AC: 8-10)
  - [x] Define the Fastify login route schema as the OpenAPI authority, including `{ email, password }`, stable response/error codes, and no browser-visible token fields.
  - [x] Generate the API-owned OpenAPI artifact and regenerate Kubb TypeScript/Zod/server clients using the exact version set established by Story 1.1; never manually edit generated code.
  - [x] Adapt generated DTOs into a small frontend Auth view model/action result; UI logic branches on stable error codes, not message text.

- [x] Test the complete domain-scoped login journey (AC: 1-10)
  - [x] Unit-test host/email normalization integration, password verification/rehash, JWT claim shape/expiry, cookie options, route guard decisions, rate-limit keying, and error mapping.
  - [x] Add real-PostgreSQL integration tests for valid login, persisted Session, refresh-hash-only storage, unknown/inactive/malformed Domain, inactive User, invalid password, same email in two Corporations, generic failures, rate limiting, and pre-selection route restrictions.
  - [x] Add negative tests proving payload/query/route/browser Corporation or Company values cannot override trusted host/Session scope and foreign existence is not disclosed.
  - [x] Add Playwright coverage through `piloto.localhost` for successful login, generic failure, cookies inaccessible to browser JavaScript, no tokens in DOM/URL/storage/action payloads, and removal of NextAuth behavior.
  - [x] Run architecture checks, formatting, lint, typecheck, unit/integration tests, OpenAPI/Kubb drift checks, Playwright, and production builds for both repositories.

## Dev Notes

### Developer Context

- Story 1.1 is the hard prerequisite: this story consumes its Organization/Auth schema, normalizers, Argon2id service, transaction patterns, request-context direction, OpenAPI pipeline, and test-database lifecycle.
- There are no completed-development learnings from Story 1.1 yet. Its newly created story document is authoritative planning context, not proof that its code exists. Stop if the required foundation is absent rather than rebuilding it inside Story 1.2.
- Current backend behavior is incompatible with this story: `POST /api/v1/auth/login` accepts `username`, queries a globally unique User, emits a four-hour `{ token, userId }` response, and authenticates by JWT alone. Replace this path; do not wrap it.
- Current frontend behavior is also incompatible: NextAuth Credentials owns a four-hour JWT session, stores the API token in its JWT, exposes a mock Company selector before login, and uses token presence in `proxy.ts`. Preserve the visual shell but remove the independent Session authority and mock-only Company behavior.
- Story 1.2 creates the initial Session and cookie boundary. Story 1.3 owns refresh rotation, single-flight renewal, logout revocation, reuse detection, and expiry behavior; Story 1.4 owns Company listing/selection and replacement credentials.

### Technical Requirements

- Corporation scope comes only from the normalized request host at login. Never add `corporationId`, `domain`, `tenantId`, or `companyId` to the public login request.
- Login request is `{ email: string, password: string }`. Normalize email on the server; keep password opaque and excluded from logs, validation dumps, telemetry, errors, and snapshots.
- Access JWT lifetime is exactly 15 minutes. Claims are `userId`, `corporationId`, `sessionId`, `role`, and optional `companyId`; initial login omits `companyId`.
- Refresh credentials are opaque cryptographically random values. Store only a cryptographic hash, with seven-day idle and 30-day absolute Session expiry metadata created at login; Story 1.3 performs rotation.
- Browser credentials are host-only cookies. Production uses `__Host-` names, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain`; local HTTP may relax only name/`Secure` through typed environment configuration.
- Fastify is the sole authority for identity, Session persistence, revocation state, Company context, and authorization. Next.js is a same-origin BFF/presentation layer.
- Rate limiting is keyed by normalized host and trusted source IP, has no permanent account lockout, and returns the canonical stable `429` envelope.
- Do not implement Company selection, refresh rotation, logout, password reset, broader roles, client-side token refresh, React Query, or authenticated state in Zustand in this story.

### API and Interface Contracts

- Keep the public route `POST /api/v1/auth/login`. Fastify route schemas own OpenAPI; the dashboard consumes only generated Kubb types/Zod/server clients.
- The browser submits credentials to a same-origin Server Action/Route Handler. The BFF invokes the API server-to-server with the normalized original host and converts the returned credential material into response cookies before returning a safe result to the Client Component.
- The API-to-BFF credential result is server-confidential and must never become a Client Component return value, rendered data, URL, browser storage value, or log field.
- Authenticated request context must distinguish `corporation-scoped` from `company-scoped`. Guards should make the allowed transition routes explicit rather than sprinkling optional-Company checks across services.
- Canonical errors carry a stable code, safe generic message, structured details where allowed, and `requestId`. Login enumeration failures use one code/status/message regardless of which credential/tenant fact failed.

### Architecture Compliance

- Backend layers remain `controller -> service -> handler -> Prisma`. Host extraction/transport validation belongs at the controller/plugin boundary; business authentication and authorization decisions belong in services; scoped lookup/Session persistence belongs in handlers.
- Use explicit Organization/Auth public boundaries rather than importing Organization handlers into Auth or querying Domain from the login controller.
- Client flow is `page -> auth feature -> Server Action/query -> adapter/view model -> generated client`. Client Components never import generated clients or server transport infrastructure.
- Keep React Server Components by default. Use Client Components only for the interactive form/pending state and React Hook Form/Zod if the existing form is reconciled to the architecture pattern.
- Global Fastify error handling owns canonical formatting. Controllers should not catch every error and call `jsonResponse.fromError` locally.
- Preserve CSP/security headers. Any proxy changes must follow the installed Next.js 16 documentation and must not turn cookie presence into authorization.

### Current Files to Reconcile and Preserve

- Backend: `src/app.ts`, `src/routes/v1-routes.ts`, `src/lib/plugins/auth.plugin.ts`, `src/lib/config/env.ts`, `src/modules/auth/auth.controller.ts`, `auth.dto.ts`, `auth.service.ts`, the current User handler, response/error utilities, Prisma schema/migrations, and API tests.
- Preserve the Fastify app factory/test injection pattern, `/api/v1` prefix, typed environment parsing, plugin lifecycle, and independent API build while replacing the placeholder auth semantics.
- Frontend: login page/form, `src/app/api/auth/[...nextauth]/route.ts`, auth options/session/token helpers, auth Server Action, generated login client/models/Zod, server client, `proxy.ts`, providers, types, and package manifest.
- Preserve the current responsive visual language, field accessibility, pending feedback, CSP headers, server-only generated-client boundary, and safe redirects. Remove mock Company data, operational mock copy not traceable to the MVP, and NextAuth-specific code.
- Generated Prisma/Kubb artifacts are regenerated, never edited manually.

### Testing Requirements

- Real tenant/Session invariants require a freshly migrated PostgreSQL database. Mocks alone cannot prove scoped email lookup, active Domain resolution, Session persistence, or cross-Corporation isolation.
- All enumeration paths must assert identical status, stable code, public message, and safe response shape. Avoid brittle timing assertions, but ensure unknown-user handling does not skip all password work.
- Assert the persisted Session contains no plaintext refresh value and that logs/errors contain no email/password/token/cookie material.
- Route-guard tests must cover Corporation-scoped allowed routes and rejection of Company-owned operations before handler/database access.
- Playwright must use the real Next.js BFF and Fastify API under deterministic hosts. It must inspect URL, DOM, Web Storage, action payloads, and cookie flags/visibility for credential leakage.

### Previous Story Intelligence

- Story 1.1 defines the exact foundation boundary and expected locations. Reuse its Organization/Auth services, transaction-aware handler context, normalized host/email utilities, Argon2id implementation, CLI-safe errors, environment pinning, and real-PostgreSQL test harness.
- Story 1.1 intentionally leaves browser login untouched. Story 1.2 is responsible for deleting the placeholder global-username/four-hour-JWT/NextAuth path after the replacement works end to end.
- Do not modify the initial migration retroactively or reintroduce the fixture administrator as production seed data.

### Git Intelligence Summary

- Recent history is a small template baseline (`before backend implementation`, pagination documentation, and frontend styling). There is no prior production auth implementation to preserve as a contract.
- Existing uncommitted changes belong to the user, notably `start-dev.sh`, `app.md`, and `main-web-app/pnpm-workspace.yaml`; do not overwrite or reformat unrelated content.

### Latest Technical Information

- Next.js 16 treats `cookies()` as async; cookies can be written only from a Server Function/Server Action or Route Handler. [Source: https://nextjs.org/docs/app/api-reference/functions/cookies]
- Next.js proxy/middleware is appropriate for optimistic navigation checks, not the application's authorization boundary. Follow the installed Next.js 16 docs under `main-web-app/node_modules/next/dist/docs` before modifying it. [Source: main-web-app/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md]
- Prisma 7 direct database access requires its driver adapter; Session transactions must continue through the established `@prisma/adapter-pg` client and handler context. [Source: https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7]

### Project Structure Notes

- The architecture's target `features/auth` structure does not yet exist; migrate the auth slice when implementing it rather than moving unrelated frontend pages/components.
- The current frontend package contains `kubb@3.1.1` alongside Kubb 4 tooling. Consume the exact reconciled version set from Story 1.1 and regenerate the login contract before deleting old generated files.
- The existing API docs describe an older `{ success, message, data }` error shape. This story follows the approved architecture's stable-code/requestId envelope; update local docs when changing the shared response implementation so code and documentation do not diverge.
- No standalone UX document exists. Existing styling is authoritative for presentation; the story/PRD/architecture are authoritative for login behavior and ordering.

### References

- [Source: _bmad-output/implementation-artifacts/1-1-provision-the-pilot-workspace-through-the-cli.md]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-12-Authenticate-Through-the-Corporation-Domain]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-1-Resolve-Corporation-from-Domain]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-2-Authenticate-Master-Administrator]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication--Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#API--Communication-Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- [Source: main-api/AGENTS.md]
- [Source: main-api/docs/ARCHITECTURE.md]
- [Source: main-api/docs/ERRORS.md]
- [Source: main-web-app/AGENTS.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-30: RED confirmed for absent auth policy, refresh credential, BFF host, and cookie modules; GREEN after implementation.
- 2026-06-30: PostgreSQL login suite passed 12 scenarios covering enumeration, Session persistence, rate limiting, scope guards, and secret-safe logs.
- 2026-06-30: Node 22.22.3 CI gates passed with 21 API unit, 12 API integration, 6 dashboard unit, and 3 Playwright tests.

### Implementation Plan

- Resolve active Corporation from one trusted normalized host before credential lookup.
- Persist a Corporation-scoped Session and expose it only through short-lived server-confidential credentials.
- Replace NextAuth with a server-only BFF adapter, host-only cookies, and safe Client Component results.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Story 1.1 planning context, current auth implementation, cross-application boundaries, and regression risks were reconciled.
- Implemented non-enumerating Corporation-domain authentication with persisted Session validation and bounded rate limiting.
- Replaced NextAuth with generated server-only Fastify clients and environment-specific host-only HttpOnly cookies.
- Removed mock Company selection while preserving responsive, accessible login behavior and visual language.
- Proved token absence from Client Components, DOM, URLs, Web Storage, and Server Action payloads through Playwright.

### File List

- main-api/.env.example
- main-api/artifacts/openapi.json
- main-api/docs/ERRORS.md
- main-api/package.json
- main-api/pnpm-lock.yaml
- main-api/src/app.ts
- main-api/src/lib/config/env.ts
- main-api/src/lib/plugins/auth.plugin.ts
- main-api/src/lib/security/password.test.ts
- main-api/src/lib/security/refresh-credential.test.ts
- main-api/src/lib/security/refresh-credential.ts
- main-api/src/lib/utils/appError.ts
- main-api/src/lib/utils/jsonResponse.ts
- main-api/src/lib/utils/zodResolver.ts
- main-api/src/modules/auth/auth-policy.test.ts
- main-api/src/modules/auth/auth-policy.ts
- main-api/src/modules/auth/auth.controller.ts
- main-api/src/modules/auth/auth.dto.ts
- main-api/src/modules/auth/auth.service.ts
- main-api/src/modules/auth/handlers/login.handler.ts
- main-api/src/modules/organization/domain-resolution.service.ts
- main-api/src/modules/organization/handlers/domain.handler.ts
- main-api/tests/app.test.ts
- main-api/tests/integration/auth/logging.test.ts
- main-api/tests/integration/auth/login.test.ts
- main-api/tests/setup-integration-env.ts
- main-web-app/.env.example
- main-web-app/.gitignore
- main-web-app/README.md
- main-web-app/api_docs/openapi.json (deleted)
- main-web-app/docs/API_CLIENTS.md
- main-web-app/docs/ARCHITECTURE.md
- main-web-app/docs/AUTH.md
- main-web-app/package.json
- main-web-app/pnpm-lock.yaml
- main-web-app/playwright.config.ts
- main-web-app/src/actions/auth/session.actions.ts
- main-web-app/src/app/api/auth/[...nextauth]/route.ts (deleted)
- main-web-app/src/components/auth/sign-out-button.tsx
- main-web-app/src/components/pages/auth/login/login-form.tsx
- main-web-app/src/components/pages/auth/login/login-page.tsx
- main-web-app/src/features/auth/actions/forget-browser-session.action.ts
- main-web-app/src/features/auth/actions/login.action.ts
- main-web-app/src/generated/** (regenerated)
- main-web-app/src/lib/api/server-client.ts
- main-web-app/src/lib/auth/api-token.ts (deleted)
- main-web-app/src/lib/auth/auth-cookie.test.ts
- main-web-app/src/lib/auth/auth-cookie.ts
- main-web-app/src/lib/auth/auth-cookies.server.ts
- main-web-app/src/lib/auth/normalize-host.test.ts
- main-web-app/src/lib/auth/normalize-host.ts
- main-web-app/src/lib/auth/options.ts (deleted)
- main-web-app/src/lib/auth/session.ts
- main-web-app/src/lib/config/env.server.ts
- main-web-app/src/proxy.ts
- main-web-app/src/types/next-auth.d.ts (deleted)
- main-web-app/tests/e2e/global-setup.ts
- main-web-app/tests/e2e/login.spec.ts
- main-web-app/vitest.config.ts
- scripts/ci.sh

## Change Log

- 2026-06-30: Implemented and validated Corporation-domain authentication and Fastify-owned browser Session flow; status moved to review.
