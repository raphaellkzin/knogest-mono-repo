---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md
  - _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/addendum.md
  - _bmad-output/planning-artifacts/architecture.md
workflowType: 'epics-and-stories'
status: 'complete'
completedAt: '2026-06-19'
---

# Knogest - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Knogest, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: The system must resolve exactly one active Corporation from the normalized request host before accepting login credentials; unknown or inactive domains cannot authenticate, and Corporation scope cannot come from request bodies or route parameters.

FR2: The Master Administrator must be able to authenticate with an email unique inside the resolved Corporation and a valid password, without authentication failures revealing whether the User exists.

FR3: The system must maintain renewable and revocable Sessions with logout revocation, all-Session revocation after administrative password reset, refresh rotation and reuse detection, 15-minute access credentials, 7-day refresh idle expiration, and a 30-day absolute lifetime.

FR4: The Master Administrator must be able to list available Companies and select or change the active Company; a Corporation with no Companies remains a valid empty state, and every selection must be validated against the authenticated Corporation.

FR5: An authorized operator must be able to provision Corporations, Domains, Master Administrators, and Companies and reset a Master Administrator password through an internal administrative interface, without browser-based Company or User administration.

FR6: Every table and unbounded collection must use canonical cursor pagination that binds search, filters, sorting, selected Company, and authenticated scope to cursor validity and safely rejects malformed, foreign-scope, or stale-query cursors.

FR7: The system must return and mutate only records owned by the authenticated Corporation and selected Company, preventing sibling Companies from selecting or associating each other's Employees, Clients, Fuel Suppliers, Machines, or Projects.

FR8: The Master Administrator must be able to irreversibly remove eligible registry records from operational use while preserving history, excluding removed records from normal lists and selectors, and permitting eligible active identifiers to be reused without changing historical references.

FR9: The Master Administrator must be able to register a Corporation-scoped Person using CPF and name and create a Company Employment using a Company registration number; one Person may have active Employments in multiple Companies of the same Corporation.

FR10: The system must preserve admission, termination, and rehire as distinct Employment Periods; an active Employee may remain unallocated, rehire reuses Person and Employment identity, and closed periods cannot be reopened or overwritten.

FR11: The Master Administrator must be able to terminate an Employment immediately when Project responsibility invariants remain valid; open Employee Allocations close transactionally, and termination is rejected for a current Manager or when it would leave an active Project without a Technical Responsibility.

FR12: The Master Administrator must be able to allocate an active Employment to a `PLANNED` or `ACTIVE` Project with effective free-text job role, expected daily workload, compensation mode, compensation value, and overtime rate; one Person may have only one open operational allocation across the Corporation.

FR13: The Master Administrator must be able to reallocate an Employee immediately between eligible Projects with a required reason; source closure and destination opening are atomic, returning later creates a new period, and prior costs, events, and future RDO references remain attached to their original periods.

FR14: The Master Administrator must be able to register a Company-owned active Client as an individual or legal entity with normalized CPF/CNPJ and full or legal name, optional contact and address data, and document uniqueness among active Clients of that Company.

FR15: The Master Administrator must be able to register a Company-owned active Fuel Supplier as an individual or legal entity with normalized CPF/CNPJ and full or legal name; document uniqueness applies among active Fuel Suppliers, and the same document may independently identify a Client.

FR16: The Master Administrator must be able to link an active Fuel Supplier to a same-Company Project, select one or more fixed Fuel Types, and maintain an effective BRL-per-liter price history for each selected type without overwriting previous prices.

FR17: The Master Administrator must be able to register a Machine with name, description, fixed type, manufacturer, free-text model, at least plate or Company tag, and an initial Meter Reading; supplied identifiers must be unique among active Machines of the owning Company.

FR18: The system must preserve confirmed Meter Readings as a non-decreasing sequence; ordinary operations cannot reduce or overwrite the latest reading, only an unreferenced initial or transfer reading may be corrected with actor, reason, old value, and new value, and referenced readings are immutable.

FR19: The Master Administrator must be able to allocate an eligible Machine to one `PLANNED` or `ACTIVE` Project at a time and reallocate it immediately; allocation begins from a confirmed Meter Reading, and source closure plus destination opening is atomic.

FR20: The Master Administrator must be able to permanently transfer a Machine to another Company in the same Corporation while preserving ownership and Project history; transfer requires no open allocation, open shift, or pending final Meter Reading and may update destination identifiers, details, and the confirmed meter value.

FR21: The Master Administrator must be able to permanently retire a Machine with reason and immediate effect when no open allocation, open shift, or pending final Meter Reading exists; the Machine becomes unavailable while all prior and future historical references remain valid.

FR22: The Project wizard must capture Project name, required address, optional coordinates, optional non-unique searchable contract number, approved budget, planned start date, and planned end date, with the end date not preceding the start date.

FR23: The Project wizard must select one active same-Company Client, exactly one current Manager, and at least one current Technical Responsibility; responsibility relationships reference active Employees but do not consume operational allocation exclusivity.

FR24: The Project wizard must create a valid Weekly Schedule with at least one working day and may create Break Templates; each configured working day has one same-day default operating window, all seven days may be working days, and breaks are suggestions rather than subdivisions of that window.

FR25: The Project wizard may allocate zero or more Employees, Machines, and Project Fuel Agreements; omitting all optional mobilization must not block creation, and every included relationship must be revalidated at final submission.

FR26: The Master Administrator must be able to finalize the wizard as one atomic and idempotent command that creates one `PLANNED` Project and all selected relationships; abandoned sessions persist nothing, retries return the original result, failures roll back everything, and scoped resource conflicts support browser recovery.

FR27: The Master Administrator must be able to reserve Employees and Machines while a Project is `PLANNED`; reserved resources remain unavailable to other Projects and are not released automatically when a planned date passes.

FR28: The Master Administrator must be able to explicitly activate a valid `PLANNED` Project and record the actual production start; activation is not date-driven, does not require operational resources, and still requires Client, Manager, Technical Responsibility, and valid Weekly Schedule.

FR29: The Master Administrator must be able to pause an `ACTIVE` Project and later reactivate it; pause retains allocations by default, resources may be explicitly released or reallocated, and reactivation does not restore resources that moved.

FR30: The Master Administrator must be able to irreversibly complete or cancel an eligible Project; terminal transition rejects open shifts, pending final Meter Readings, unresolved operational work, or open allocations, and terminal Projects reject new allocations.

FR31: The Master Administrator must be able to revise approved budget or planned dates after activation with a reason, creating a new effective Project Baseline while preserving every prior baseline.

FR32: The Master Administrator must be able to correct the Client during `PLANNED` setup or replace it after activation with a reason; post-activation replacement creates a new effective Project Client period and preserves prior relationships.

FR33: The Master Administrator must be able to replace the current Manager and add or end Technical Responsibilities while preserving dated history; exactly one current Manager and at least one current Technical Responsibility must remain for every non-terminal Project.

FR34: The Master Administrator must be able to revise the Weekly Schedule and Break Templates after activation, creating an effective schedule revision for future shifts while preserving prior operational contexts.

FR35: The Master Administrator must be able to inspect preserved history from Project, Employee, and Machine detail views, including the effective relationships and revisions defined for each aggregate, without requiring consolidated reporting or export.

### NonFunctional Requirements

NFR1: Every authenticated operation must derive Corporation, User, role, Session, and selected Company from trusted authentication context.

NFR2: Cross-Corporation and cross-Company access attempts must fail without disclosing foreign record existence.

NFR3: Passwords and Session credentials must never be stored in plaintext.

NFR4: CPF, CNPJ, credentials, and sensitive authentication data must be excluded from application logs.

NFR5: Critical historical records must identify the acting User and capture a reason whenever the product requirement specifies one.

NFR6: CPF/CNPJ must be masked in lists and selectors and may be displayed in full only in authorized Master Administrator create, edit, and detail workflows.

NFR7: Purpose, legal basis, retention, authorized access, disposal, and incident responsibility for real personal data must be documented and approved before pilot data entry.

NFR8: Multi-record state transitions must be atomic.

NFR9: Concurrent attempts to violate allocation, responsibility, ownership, or active-identifier uniqueness must produce one winner and a safe conflict response.

NFR10: Project finalization retries must not create duplicate Projects or relationships.

NFR11: Current-state and historical-state queries must be explicit, and historical records must never become operationally selectable through historical access.

NFR12: Every application table and unbounded collection must use the canonical cursor-pagination contract.

NFR13: Validation and conflict responses must use stable machine-readable error codes and field or resource details suitable for dashboard recovery.

NFR14: API contracts used by the dashboard must be documented, generated reproducibly, and testable before a module is considered complete.

NFR15: Real instants must be stored independently of server-local time and interpreted using `America/Sao_Paulo` business time in the MVP.

NFR16: Money, fuel prices, workload minutes, and Meter Readings must use representations that cannot introduce binary floating-point rounding into persisted business values.

NFR17: The pilot must support one Corporation, up to three Companies, and multiple Projects without configuration changes or direct database editing.

NFR18: Empty, loading, validation, conflict, unauthorized, success, and terminal states must be understandable to the Master Administrator without backend knowledge wherever applicable.

### Additional Requirements

AR1: Preserve and reconcile the existing Next.js dashboard and Fastify API; do not regenerate either application or introduce a new starter.

AR2: Pin Node.js `22.22.3` across local development and CI, retain pnpm, and keep architecture-sensitive generation packages on exact compatible versions.

AR3: Use PostgreSQL 16 with Prisma ORM 7 through `@prisma/adapter-pg`, one database, and one shared application schema.

AR4: Treat reviewed PostgreSQL migrations as the persistence authority, permit manual SQL for invariants Prisma cannot express, and prohibit `prisma db push` in shared or deployment environments.

AR5: Carry `corporationId` on tenant-owned rows and both `corporationId` and `companyId` on Company-owned rows; use composite ownership relationships and scoped uniqueness where practical.

AR6: Defer PostgreSQL RLS, but preserve schema and request-context compatibility for adding it later; MVP correctness must rely on trusted scope, scoped queries, constraints, and negative isolation tests.

AR7: Model effective periods as half-open `[effectiveFrom, effectiveTo)` intervals, use `null` for the single open period, make closed periods immutable, and reject ordinary backdating or scheduling.

AR8: Use UUID v4 identifiers, `timestamptz` for real instants, `date` for civil dates, integer minutes for durations, `numeric(18,2)` for BRL, `numeric(18,4)` for fuel prices, and non-negative `numeric(14,2)` for Meter Readings.

AR9: Serialize precision-sensitive decimals as normalized decimal strings at API boundaries.

AR10: Enforce ownership, uniqueness, temporal exclusivity, monotonic evidence boundaries, and idempotency in PostgreSQL wherever possible; translate constraint violations into stable application conflicts.

AR11: Use suitable transactions and locking for critical commands and bounded retry for operations requiring `SERIALIZABLE` behavior.

AR12: Separate immutable system reference seeds from disposable development fixtures and seed Diesel S10 and Diesel S500 deterministically.

AR13: Do not introduce distributed or application-level caching for operational data in the MVP.

AR14: Make Fastify the sole authentication, Session, credential-rotation, Company-context, and authorization authority; remove NextAuth as an independent dashboard Session authority.

AR15: Use signed 15-minute access JWTs and opaque random rotating refresh credentials with 7-day idle and 30-day absolute Session expiration; store only refresh hashes and revoke the Session when reuse is detected.

AR16: Carry `userId`, `corporationId`, optional `companyId`, `sessionId`, and role in trusted access claims and validate persisted Session state where immediate revocation is required.

AR17: Use host-only production cookies with `__Host-`, `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain`; validate trusted origin for cookie-authenticated mutations.

AR18: Implement login as Corporation-scoped without selected Company; restrict that state to Company listing and selection, refresh, and logout; issue replacement credentials when Company context changes.

AR19: Keep credentials out of Client Components; Next.js acts as a same-origin BFF using server-only actions, queries, adapters, and generated clients.

AR20: Use Argon2id with versioned parameters and opportunistic rehash; keep authentication errors generic and make CLI password reset revoke all User Sessions.

AR21: Rate-limit login and refresh by normalized host and source IP without permanent account lockout.

AR22: Protect CPF/CNPJ using versioned AES-256-GCM ciphertext plus normalized HMAC-SHA-256 equality digest, key versioning, masked default views, restricted full disclosure, and exclusion from URLs, tokens, cursors, logs, and telemetry.

AR23: Implement only `MASTER_ADMIN` in the MVP while keeping request context and service boundaries compatible with future Company and Project grants.

AR24: Expose REST JSON under `/api/v1`; do not add GraphQL, WebSockets, queues, event buses, or asynchronous integration infrastructure.

AR25: Generate the canonical OpenAPI document from Fastify route schemas, publish it as a build artifact, generate dashboard TypeScript/Zod/server clients with Kubb, and fail CI on unexpected generation drift.

AR26: Use canonical success `{ success, message, data }` and error `{ success: false, code, message, details, requestId }` envelopes; frontend logic branches on stable codes, with field errors under `details.fields` and resource conflicts under `details.resources`.

AR27: Use the documented HTTP semantics for malformed input, authentication, authorization, absent or foreign-scope resources, conflicts, semantic violations, and rate limits without exposing internal or foreign data.

AR28: Require `Idempotency-Key` for retry-sensitive commands, always including Project finalization; scope records to Session, Corporation, Company, operation, and key, bind a canonical payload hash, handle concurrent execution safely, and retain completed records for 30 days.

AR29: Propagate a UUID `requestId` through Next.js, Fastify, logs, errors, and response headers without including sensitive values.

AR30: Implement cursor pagination exactly as `main-api/docs/PAGINATION.md`, using opaque versioned deterministic cursors bound to normalized query and trusted scope; only fixed catalogs capped at 100 records may avoid pagination.

AR31: Limit wizard requests to 1 MiB, 200 Employee allocations, 100 Machine allocations, 20 Technical Responsibilities, 10 Fuel Agreements, and 10 Break Templates.

AR32: Use React Server Components by default, Client Components only for browser interaction, initial reads on the server, and Server Actions for mutations and subsequent cursor pages; do not add React Query.

AR33: Enforce frontend flow `page -> feature -> server action or query -> adapter/view model -> generated Kubb client`; components consume view models rather than transport DTOs.

AR34: Let the URL own search, allowlisted filters, sorting, and stable detail navigation; reset cursor traversal when query state changes and keep loaded page history only for the current interaction.

AR35: Restrict Zustand to ephemeral UI preferences; never store authenticated scope, business entities, API responses, wizard payloads, or server-state caches in it.

AR36: Clear subordinate pagination, selections, forms, and navigation when Company changes, and keep the selected Company visibly identifiable in the application shell.

AR37: Use React Hook Form and Zod for frontend interaction and format feedback, while keeping authorization, business validation, and transaction decisions authoritative in the API.

AR38: Reuse the existing accessible Project wizard shell, hold state only while it remains open, validate each step locally, submit one aggregate command with one idempotency key, persist no backend draft, and preserve valid values during recoverable conflicts.

AR39: Preserve existing visual styling and reusable interaction components, but retain only fields, cards, metrics, actions, and columns traceable to validated requirements; remove production mocks as each capability is integrated.

AR40: Do not expose production, progress, calculated cost, RDO, field alerts, or mock-derived dashboard metrics in the MVP.

AR41: Meet keyboard navigation, visible focus, semantic dialog, readable validation, responsive layout, and stable asynchronous-layout acceptance requirements.

AR42: Use Vitest and React Testing Library for frontend adapters, forms, view models, and interactive components; use Playwright for critical full-stack journeys.

AR43: Use real PostgreSQL integration tests for tenant isolation, transactions, constraints, temporal invariants, idempotency, and allocation concurrency.

AR44: Run dashboard on `localhost:3000`, API on `localhost:3333`, PostgreSQL 16 through Docker Compose, and a deterministic Corporation host such as `piloto.localhost`; the browser must communicate only with Next.js.

AR45: Use a separate test database recreated for each execution boundary and apply real migrations rather than synthesizing a test schema.

AR46: CI must run architecture checks, lint, formatting checks, type checking, unit tests, PostgreSQL integration tests, OpenAPI/Kubb generation and drift checks, application builds, and critical Playwright journeys.

AR47: Preserve backend dependency direction `controller -> service -> handler -> Prisma`; only handlers may access Prisma, and cross-domain operations use explicit public services or ports with shared transaction context when needed.

AR48: Preserve frontend feature organization and keep generated Prisma and Kubb output isolated and never manually edited.

AR49: Use singular `PascalCase` Prisma models mapped to plural `snake_case` PostgreSQL tables, `camelCase` Prisma/TypeScript/JSON fields mapped to `snake_case` columns, plural `kebab-case` REST resources, and `kebab-case` source filenames with explicit backend layer suffixes.

AR50: Use a global Fastify error handler; controllers must not repeat generic response `try/catch`, structural validation occurs at request boundaries, and services or handlers enforce domain, authorization, temporal, and concurrency rules.

AR51: Structure logs with `requestId`, stable operation name, trusted scope, outcome, and safe timing metadata while excluding credentials, documents, token material, plaintext, and complete request bodies.

AR52: Separate current-state and historical-state handlers and response models; closed, inactive, deleted, transferred, retired, or terminated records must not appear in operational selectors.

AR53: Record trusted `actorUserId`, server transaction instant, and required reason on critical historical mutations without introducing a generic audit-log platform.

AR54: The administrative CLI must call the same application services, validation, transactions, audit behavior, and Session revocation as HTTP workflows and must not mutate operational data through direct Prisma access.

AR55: Before real CPF/CNPJ pilot entry, produce and approve a data-protection document covering purpose, legal basis, authorized access, retention, disposal, and incident responsibility; automated tests and development use synthetic documents.

AR56: Keep the existing repositories physically independent, with OpenAPI as their only shared application contract; production hosting and orchestration remain deferred.

AR57: Implement the first delivery as a vertical foundation proof covering reproducible checks, Organization/Auth/Session persistence, trusted host and Company context, one canonical paginated endpoint, generated Kubb consumption, one persisted dashboard screen, and integration plus E2E tests.

AR58: Cross-Company commands may carry explicit target identifiers such as `destinationCompanyId`, but those values are command targets rather than trusted scope; the backend must validate them against the authenticated Corporation and the specific operation.

AR59: Contract maximums are inclusive, workloads range from 1 through 1,440 integer minutes, approved budget and Employee compensation values are non-negative, fuel prices are positive, and excessive decimal scale is rejected rather than silently rounded.

AR60: MVP commands that must remain compatible with future shift, pending-reading, or unresolved-work blockers use explicit operational-status ports with default no-blocker MVP implementations; future RDO modules may replace those ports without changing command semantics.

### UX Design Requirements

No separate UX Design specification was found. Actionable interface requirements are captured in the PRD NFRs and Architecture additional requirements. Existing frontend styling and interaction shells are visual references only; mock fields, records, metrics, and behavior do not define product requirements.

### FR Coverage Map

FR1: Epic 1 - Resolve the active Corporation from the normalized host.

FR2: Epic 1 - Authenticate the Master Administrator within the resolved Corporation.

FR3: Epic 1 - Maintain renewable, rotating, and revocable Sessions.

FR4: Epic 1 - List, select, and change the active Company workspace.

FR5: Epic 1 - Provision pilot administration and reset passwords through the internal CLI.

FR6: Epic 2 - Paginate every registry and unbounded collection with the canonical cursor contract.

FR7: Epic 2 - Isolate Company-owned registries and associations.

FR8: Epic 2 - Remove eligible registry records from operational use while preserving history.

FR9: Epic 2 - Register Corporation Persons and Company Employments.

FR10: Epic 2 - Preserve admission, termination, and rehire through Employment Periods.

FR11: Epic 5 - Terminate Employments safely while protecting Project responsibilities.

FR12: Epic 5 - Allocate Employees with effective role, workload, and compensation terms.

FR13: Epic 5 - Reallocate Employees atomically while preserving prior periods.

FR14: Epic 2 - Register reusable Company Clients.

FR15: Epic 2 - Register reusable Company Fuel Suppliers.

FR16: Epics 4 and 6 - Configure Project-specific Fuel Agreements and maintain effective prices without rewriting history.

FR17: Epic 3 - Register Machines with active identifiers and an initial Meter Reading.

FR18: Epic 3 - Preserve monotonic and auditable Meter Reading history.

FR19: Epic 5 - Allocate and reallocate Machines between eligible Projects.

FR20: Epic 5 - Transfer Machine ownership between Companies in one Corporation.

FR21: Epic 5 - Permanently retire Machines while preserving history.

FR22: Epic 4 - Capture required Project identity and baseline.

FR23: Epic 4 - Capture required Client, Manager, and Technical Responsibilities.

FR24: Epic 4 - Capture the required Weekly Schedule and optional Break Templates.

FR25: Epic 4 - Capture optional initial Employees, Machines, and Fuel Agreements.

FR26: Epic 4 - Finalize the Project atomically and idempotently.

FR27: Epic 5 - Reserve Employees and Machines while a Project is `PLANNED`.

FR28: Epic 5 - Explicitly activate a valid Project and record actual production start.

FR29: Epic 5 - Pause and reactivate a Project without silently restoring moved resources.

FR30: Epic 5 - Complete or cancel a Project safely and irreversibly.

FR31: Epic 6 - Revise the effective Project budget and planned dates.

FR32: Epic 6 - Correct or replace the current Project Client with effective history.

FR33: Epic 6 - Replace the Manager and maintain Technical Responsibilities with dated history.

FR34: Epic 6 - Revise the effective Weekly Schedule and Break Templates.

FR35: Epic 6 - Inspect preserved Project, Employee, and Machine history.

## Epic List

### Epic 1: Access a Secure Corporation Workspace

The Master Administrator can provision the internal pilot, authenticate through the correct Corporation domain, maintain a revocable browser Session, and explicitly enter or change the active Company workspace without mixing tenant data.

**FRs covered:** FR1, FR2, FR3, FR4, FR5

**Natural dependency:** None. This epic establishes the usable entry point and trusted scope required by all later capabilities.

### Epic 2: Prepare the Company's Essential Registries

The Master Administrator can find and maintain Employees, Employment relationships, Clients, and Fuel Suppliers through isolated and cursor-paginated Company registries, while removed commercial records remain historically true but unavailable for normal operations.

**FRs covered:** FR6, FR7, FR8, FR9, FR10, FR14, FR15

**Natural dependency:** Epic 1. It operates entirely inside the authenticated Corporation and selected Company workspace.

### Epic 3: Register Machines and Preserve Meter History

The Master Administrator can register Machines and maintain trustworthy monotonic Meter Readings so equipment is ready for later allocation and lifecycle operations.

**FRs covered:** FR17, FR18

**Natural dependency:** Epic 1. It is independently usable after a Company workspace is selected and establishes the Machine and Meter Reading foundation used by later Project operations.

### Epic 4: Create a Complete and Consistent Project

The Master Administrator can complete the guided Project wizard with identity, commercial baseline, accountability, Weekly Schedule, Break Templates, optional resources, and Project-specific fuel terms, producing exactly one valid `PLANNED` Project or no committed data.

**FRs covered:** FR16, FR22, FR23, FR24, FR25, FR26

**Natural dependency:** Epics 1, 2, and 3 provide the authenticated workspace and selectable registry resources. The Project remains valuable and valid even when optional Employee, Machine, and Fuel Supplier mobilization is omitted.

### Epic 5: Mobilize Resources and Control Project Operation

The Master Administrator can allocate, reallocate, release, terminate, transfer, or retire operational resources, reserve them during planning, explicitly start real production, pause and reactivate operation, and safely move a Project into an irreversible terminal state.

**FRs covered:** FR11, FR12, FR13, FR19, FR20, FR21, FR27, FR28, FR29, FR30

**Natural dependency:** Epics 1 through 4. It operates on complete registry resources and an existing valid Project without depending on future historical-inspection work.

### Epic 6: Evolve Operations Without Rewriting History

The Master Administrator can revise consequential Project baselines, Clients, Managers, Technical Responsibilities, Weekly Schedules, Break Templates, and Project Fuel Agreements through effective history and can inspect preserved Project, Employee, and Machine records.

**FRs covered:** FR16, FR31, FR32, FR33, FR34, FR35

**Natural dependency:** Epics 1 through 5 provide the entities and lifecycle changes whose history this epic preserves and exposes.

## Epic 1: Access a Secure Corporation Workspace

The Master Administrator can provision the internal pilot, authenticate through the correct Corporation domain, maintain a revocable browser Session, and explicitly enter or change the active Company workspace without mixing tenant data.

### Story 1.1: Provision the Pilot Workspace Through the CLI

**Requirements:** FR5; NFR3, NFR4, NFR8, NFR17; AR1, AR2, AR3, AR4, AR6, AR12, AR13, AR20, AR44, AR45, AR46, AR48, AR49, AR54, AR56

As an authorized operator,
I want to provision the pilot Corporation and its administration through a CLI,
So that the Master Administrator can use Knogest without direct database manipulation.

**Acceptance Criteria:**

**Given** the existing dashboard and API repositories are checked out for development
**When** the initial pilot foundation is prepared
**Then** Node.js `22.22.3`, pnpm, dashboard port `3000`, API port `3333`, PostgreSQL 16, and the deterministic Corporation host are configured consistently
**And** both repositories remain physically independent with generated contract artifacts isolated from manually maintained source.

**Given** an empty PostgreSQL 16 development or test database
**When** the Organization and Auth foundation migrations are applied
**Then** the minimum Corporation, Domain, User, Session, Company, and required reference-seed schema is created through reviewed migrations
**And** no shared or test environment depends on `prisma db push` or a synthesized schema.

**Given** the foundation commands and migrations are committed
**When** CI runs
**Then** it verifies version pinning, architecture checks, lint, formatting, type checking, applicable tests, migrations, contract generation drift, and application builds
**And** the test database is recreated and migrated at its documented execution boundary.

**Given** the required foundation migrations have been applied
**When** the operator provides a Corporation, normalized Domain, Master Administrator credentials, and zero to three initial Companies
**Then** the system creates the requested records atomically
**And** returns safe identifiers without displaying password or credential material.

**Given** a Corporation is provisioned without a Company
**When** the command completes
**Then** the Corporation remains valid
**And** Companies may be added later through the administrative CLI.

**Given** a Domain is submitted
**When** it is persisted
**Then** its host is normalized consistently
**And** a Domain already assigned to another Corporation is rejected without partial creation.

**Given** a Master Administrator email
**When** the User is created
**Then** the normalized email is unique inside that Corporation
**And** the same email may independently exist in another Corporation.

**Given** a password is provided
**When** the User is persisted
**Then** it is hashed with Argon2id
**And** neither plaintext nor sensitive values appear in logs or command output.

**Given** any validation, uniqueness, or persistence failure
**When** provisioning is attempted
**Then** the transaction is rolled back completely
**And** the CLI reports a safe actionable error.

**Given** the CLI executes an administrative operation
**When** it changes application state
**Then** it invokes the same application services and validation boundaries used by runtime workflows
**And** it never writes operational data directly through Prisma.

**Given** the provisioning behavior is tested
**When** the integration suite runs
**Then** it uses a real migrated PostgreSQL database
**And** covers successful provisioning, empty Company state, duplicate Domain, scoped email uniqueness, rollback, and secret-safe output.

### Story 1.2: Authenticate Through the Corporation Domain

**Requirements:** FR1, FR2; NFR1, NFR2, NFR3, NFR4, NFR13, NFR14, NFR18; AR14, AR15, AR17, AR19, AR20, AR21, AR23, AR25, AR26, AR27, AR29, AR44, AR48, AR50, AR57

As a Master Administrator,
I want to sign in through my Corporation's domain,
So that my identity and tenant scope are established before I access operational data.

**Acceptance Criteria:**

**Given** an active Domain associated with one active Corporation
**When** the login page is requested through that normalized host
**Then** the Next.js BFF preserves the trusted host for the API
**And** Corporation scope is never accepted from a route parameter, query, form field, or browser store.

**Given** an unknown, malformed, or inactive Domain
**When** login is attempted
**Then** authentication is rejected
**And** the response does not reveal Corporation or User existence.

**Given** an active Master Administrator in the resolved Corporation
**When** the administrator submits the correct normalized email and password
**Then** the API verifies the Argon2id password hash
**And** creates a persisted Corporation-scoped Session without a selected Company.

**Given** a Corporation-scoped Session without a selected Company
**When** an access credential is issued
**Then** it contains trusted `userId`, `corporationId`, `sessionId`, role, and no `companyId`
**And** its lifetime is 15 minutes.

**Given** a valid Corporation-scoped Session
**When** it calls an API operation
**Then** only Company listing, Company selection, refresh, logout, and authenticated-session inspection are permitted
**And** Company-owned operational routes reject the request.

**Given** an incorrect password, unknown email, or User from another Corporation
**When** login is attempted
**Then** the same generic authentication error and status are returned
**And** no account-discovery detail is exposed in logs or responses.

**Given** repeated login attempts from a host and source IP
**When** the configured rate limit is exceeded
**Then** the API returns the canonical `429` error envelope
**And** no permanent account lockout is created.

**Given** the login succeeds in a browser
**When** credentials are returned through the BFF
**Then** access and refresh material are stored only in host-only, `HttpOnly` cookies using environment-appropriate transport flags
**And** Client Components, browser storage, URLs, and rendered page data never receive token material.

**Given** the dashboard authentication authority is reconciled
**When** the new login flow is active
**Then** NextAuth no longer creates or validates an independent Session
**And** Fastify remains the sole Session authority.

**Given** login is tested
**When** unit, PostgreSQL integration, and Playwright suites run
**Then** they cover valid login, unknown host, inactive Domain, invalid credentials, cross-Corporation email reuse, rate limiting, restricted pre-selection access, and absence of credential exposure.
**And** every suite uses the canonical API and Session boundaries.

### Story 1.3: Renew and Revoke Browser Sessions Safely

**Requirements:** FR3; NFR1, NFR2, NFR3, NFR4, NFR8, NFR9, NFR13, NFR14; AR15, AR16, AR17, AR19, AR21, AR26, AR29

As a Master Administrator,
I want my authenticated Session to renew securely and terminate predictably,
So that I can remain signed in without allowing stolen or superseded credentials to remain usable.

**Acceptance Criteria:**

**Given** a valid current refresh credential
**When** the access credential requires renewal
**Then** the API atomically consumes the current refresh credential and issues a replacement
**And** only a cryptographic hash of the replacement is persisted.

**Given** a refresh rotation completes successfully
**When** the response reaches the browser
**Then** the prior refresh credential is no longer valid
**And** the replacement retains the Session's trusted Corporation and optional selected Company context.

**Given** a refresh credential has been consumed by a prior successful rotation
**When** that superseded credential is presented again
**Then** the complete Session is revoked as potentially compromised
**And** access and refresh cookies are cleared without issuing new credentials.

**Given** two concurrent requests present the same current refresh credential
**When** rotation is processed
**Then** refresh reuse handling revokes the complete Session
**And** no valid parallel refresh chain survives the race.

**Given** a Session has been idle for seven days or has reached its 30-day absolute lifetime
**When** refresh is attempted
**Then** renewal is rejected
**And** the Session is treated as expired regardless of JWT validity.

**Given** a Session has been revoked
**When** a security-sensitive authenticated route receives an otherwise valid access JWT for that Session
**Then** persisted Session state causes the request to fail
**And** no operational data is returned.

**Given** the Master Administrator chooses to log out
**When** logout is submitted
**Then** the current persisted Session is revoked
**And** both browser credential cookies are cleared.

**Given** a cookie-authenticated mutation such as refresh or logout
**When** the request origin is not trusted
**Then** the operation is rejected
**And** `SameSite` behavior is not treated as the only origin defense.

**Given** an access credential expires during a server-side dashboard request
**When** renewal is still valid
**Then** one controlled BFF refresh path renews the Session and retries the intended operation safely
**And** Client Components do not create competing refresh loops.

**Given** multiple BFF requests discover the same expired access credential
**When** renewal is required
**Then** the BFF coordinates refresh as a single-flight operation for that Session
**And** concurrent application requests reuse the one renewal result instead of presenting the same refresh credential twice.

**Given** a refresh, reuse, logout, expiration, or revocation event occurs
**When** it is logged
**Then** the event includes `requestId`, stable operation name, safe scope identifiers, and outcome
**And** it excludes credentials, cookie values, token material, and complete request bodies.

**Given** Session behavior is tested
**When** the integration and E2E suites run
**Then** they cover rotation, concurrent rotation, reuse detection, idle expiry, absolute expiry, logout, persisted revocation, origin rejection, cookie clearing, and safe server-side renewal.
**And** no test bypasses persisted Session state.

### Story 1.4: Select and Change the Active Company Workspace

**Requirements:** FR4, FR7; NFR1, NFR2, NFR13, NFR18; AR18, AR19, AR25, AR26, AR33, AR35, AR36, AR57

As a Master Administrator,
I want to select or change the active Company,
So that every operational action occurs inside one clearly identified and trusted workspace.

**Acceptance Criteria:**

**Given** an authenticated Corporation-scoped Session
**When** the administrator requests available Companies
**Then** the API returns only active Companies belonging to the authenticated Corporation
**And** the request does not require or accept Company scope from the URL or browser payload.

**Given** the Corporation currently has no Companies
**When** the administrator reaches Company selection
**Then** the dashboard presents an understandable empty state
**And** refresh and logout remain available without treating the Session as invalid.

**Given** the administrator selects an eligible Company
**When** the selection command succeeds
**Then** the persisted Session is updated with that `companyId`
**And** a replacement access credential is issued with the selected Company context.

**Given** a Company belongs to another Corporation, is inactive, or does not exist
**When** selection is attempted
**Then** the command fails without revealing foreign record existence
**And** the prior Session context remains unchanged.

**Given** the Session already has a selected Company
**When** the administrator changes to another eligible Company
**Then** the new Company replaces the persisted operational context
**And** subsequent API calls derive scope exclusively from the updated Session.

**Given** a Company change succeeds
**When** the dashboard transitions to the new workspace
**Then** prior Company pagination, selections, forms, wizard state, view models, and Project navigation are cleared
**And** no stale request from the previous workspace may populate the new one.

**Given** a Company is selected
**When** the application shell is rendered
**Then** the selected Company is visibly identifiable
**And** authorized deep links that do not belong to the selected Company fail safely with a route back to a valid workspace.

**Given** an operational route is called with a Company-scoped Session
**When** a resource from a sibling Company is requested or mutated
**Then** trusted scope and ownership constraints prevent access
**And** the response is indistinguishable from an absent resource.

**Given** Company selection is performed from the dashboard
**When** the browser invokes the operation
**Then** a Server Action or server query uses the generated client through the application adapter
**And** no Client Component imports the generated API client or stores authenticated scope in Zustand.

**Given** Company selection and switching are tested
**When** integration and Playwright suites run
**Then** they cover zero Companies, successful selection, successful change, foreign and inactive Company rejection, stale-state clearing, visible workspace identity, deep-link safety, and cross-Company isolation.
**And** Company scope is never supplied by the browser.

### Story 1.5: Reset a Master Administrator Password Administratively

**Requirements:** FR3, FR5; NFR3, NFR4, NFR8; AR20, AR29, AR54

As an authorized operator,
I want to reset a Master Administrator password through the CLI,
So that access can be recovered without a public password-recovery workflow or direct database editing.

**Acceptance Criteria:**

**Given** an authorized operator supplies a Corporation identifier, Master Administrator identifier or normalized email, and a valid replacement password
**When** the reset command is executed
**Then** the target User is resolved only inside the specified Corporation
**And** a same-email User in another Corporation cannot be affected.

**Given** a valid replacement password
**When** the reset is committed
**Then** the new value is stored as an Argon2id hash using current versioned parameters
**And** the plaintext password is never logged, persisted, or echoed.

**Given** the target User has one or more active Sessions
**When** the password reset succeeds
**Then** every persisted Session belonging to that User is revoked atomically with the password change
**And** existing access and refresh credentials can no longer renew or access security-sensitive routes.

**Given** the target Corporation or User is absent
**When** reset is attempted
**Then** the CLI returns a safe failure without exposing unrelated Corporation data
**And** no password or Session record changes.

**Given** password validation, hashing, persistence, or Session revocation fails
**When** the command executes
**Then** the transaction rolls back completely
**And** the prior password and Session state remain consistent.

**Given** the CLI performs the reset
**When** application state changes
**Then** it invokes the Auth application service and shared validation, audit, and transaction behavior
**And** it never updates the User or Session tables directly through Prisma.

**Given** a successful administrative reset
**When** the security event is recorded
**Then** it includes the acting administrative context, target User identifier, transaction instant, operation, and outcome
**And** contains no password, hash, credential, CPF, CNPJ, or token material.

**Given** the reset behavior is tested
**When** the PostgreSQL integration suite runs
**Then** it covers scoped User resolution, successful reset, all-Session revocation, rollback, cross-Corporation protection, subsequent old-password rejection, new-password login, and secret-safe output.
**And** the test invokes the same Auth service used by the CLI.

## Epic 2: Prepare the Company's Essential Registries

The Master Administrator can find and maintain Employees, Employment relationships, Clients, and Fuel Suppliers through isolated and cursor-paginated Company registries, while removed or terminated records remain historically true but unavailable for normal operations.

### Story 2.1: Approve the Pilot Personal-Data Gate

**Requirements:** NFR7; AR55

As a Master Administrator,
I want the rules for using real CPF and CNPJ data approved before pilot entry,
So that the pilot has an explicit legal and operational protection boundary.

**Acceptance Criteria:**

**Given** real CPF/CNPJ data has not yet been entered
**When** the pilot is prepared
**Then** an approved document defines purpose, legal basis, authorized access, retention, disposal, and incident responsibility
**And** the pilot-readiness checklist blocks authorization to enter real documents until approval.

**Given** development or automated testing
**When** registry fixtures are created
**Then** only synthetic CPF/CNPJ values are used
**And** fixtures are explicitly separated from production runtime data.

**Given** a CPF or CNPJ value is syntactically valid
**When** the application receives it
**Then** the system does not claim to classify whether it belongs to a real person or entity
**And** compliance with the gate is verified operationally through approval evidence and pilot procedure.

### Story 2.2: Protect CPF and CNPJ Technically

**Requirements:** FR9, FR14, FR15; NFR4, NFR6, NFR7, NFR13; AR22, AR51, AR55

As a Master Administrator,
I want CPF and CNPJ values encrypted, masked, and equality-safe,
So that registry workflows can use documents without unnecessary exposure.

**Acceptance Criteria:**

**Given** a CPF or CNPJ is submitted
**When** it passes format and checksum validation
**Then** the normalized value is encrypted with versioned AES-256-GCM
**And** a normalized HMAC-SHA-256 digest is stored for equality and uniqueness checks.

**Given** encryption keys exist outside the database
**When** a document is encrypted
**Then** its key version is recorded
**And** the design supports future key rotation.

**Given** an authorized list or selector is displayed
**When** a document is included
**Then** it is masked
**And** plaintext is never returned unnecessarily.

**Given** an authorized Master Administrator opens a create, edit, or detail workflow
**When** full disclosure is required
**Then** the backend explicitly authorizes the operation
**And** plaintext is exposed only through that protected response.

**Given** a document is used for active uniqueness
**When** another active record of the same registry and Company has the same normalized digest
**Then** creation is rejected with a stable conflict code
**And** ciphertext is never compared or exposed.

**Given** a document appears in application processing
**When** URLs, cursors, tokens, logs, telemetry, errors, or request correlation are generated
**Then** the plaintext document is excluded
**And** complete request bodies containing documents are not logged.

**Given** encryption, decryption, masking, or hashing fails
**When** the request is processed
**Then** the operation fails safely without partial persistence
**And** cryptographic details are not exposed.

**Given** the security behavior is tested
**When** unit and PostgreSQL integration suites run
**Then** they cover normalization, validation, encryption round trips, masking, equality digests, scoped uniqueness, key versions, unauthorized disclosure, and log sanitization.
**And** no test fixture requires a real personal document.

### Story 2.3: Register and Find Clients

**Requirements:** FR6, FR7, FR14; NFR2, NFR6, NFR12, NFR13, NFR14, NFR18; AR25, AR26, AR30, AR32, AR33, AR34, AR39, AR42, AR43

As a Master Administrator,
I want to register and find Clients in the selected Company,
So that reusable contracting parties are available for Project creation.

**Acceptance Criteria:**

**Given** an authenticated Session with a selected Company
**When** the administrator submits a valid individual or legal-entity Client
**Then** the Client is created inside the trusted Corporation and Company scope
**And** the operational payload cannot override either scope identifier.

**Given** a Client is created
**When** the entity type is individual
**Then** a valid CPF and full name are required
**And** trade name, phone, email, and address remain optional.

**Given** a Client is created
**When** the entity type is legal entity
**Then** a valid CNPJ and legal name are required
**And** trade name, phone, email, and address remain optional.

**Given** an active Client already has the same normalized document digest in the selected Company
**When** another active Client is submitted
**Then** creation is rejected with a stable scoped uniqueness conflict
**And** no plaintext document is included in the error.

**Given** the same normalized document belongs to a Client in another Company or Corporation
**When** a new Client is created in the selected Company
**Then** the independent record is permitted
**And** neither record becomes visible across scope.

**Given** Clients exist in the selected Company
**When** the administrator opens the Client registry
**Then** the dashboard displays a cursor-paginated table backed by persisted data
**And** documents are masked in the table.

**Given** the Client registry supports search, filters, and sorting
**When** the query changes
**Then** cursor traversal resets
**And** the normalized query and trusted scope are bound to every returned cursor.

**Given** a malformed, stale-query, or foreign-scope cursor
**When** a Client page is requested
**Then** the API returns the canonical stable cursor-validation error
**And** no records from another scope are exposed.

**Given** a valid Client detail is requested
**When** it belongs to the selected Company
**Then** authorized detail may disclose the full document
**And** a foreign-scope or absent identifier returns the same non-disclosing not-found response.

**Given** Client create, list, or detail is loading, empty, invalid, unauthorized, conflicted, successful, or failed
**When** the dashboard renders the state
**Then** it uses the existing visual system with understandable recovery behavior
**And** no mock Client record or unvalidated metric remains in production.

**Given** the Client feature contract is complete
**When** OpenAPI and Kubb generation run
**Then** the dashboard consumes the generated client through a server-only adapter and view model
**And** unexpected generated drift fails CI.

**Given** Client behavior is tested
**When** unit, PostgreSQL integration, and Playwright suites run
**Then** they cover creation variants, optional fields, scoped uniqueness, cross-scope isolation, masking, authorized detail, cursor traversal, invalid cursors, empty state, validation, and conflict recovery.
**And** the generated OpenAPI contract is used end to end.

### Story 2.4: Register and Find Fuel Suppliers

**Requirements:** FR6, FR7, FR15; NFR2, NFR6, NFR12, NFR13, NFR14, NFR18; AR12, AR25, AR26, AR30, AR32, AR33, AR39, AR42, AR43

As a Master Administrator,
I want to register and find Fuel Suppliers in the selected Company,
So that eligible suppliers can later be associated with Project-specific fuel terms.

**Acceptance Criteria:**

**Given** an authenticated Session with a selected Company
**When** the administrator submits a valid individual or legal-entity Fuel Supplier
**Then** the Supplier is created inside the trusted Corporation and Company scope
**And** the registry type is fixed to fuel supply in the MVP.

**Given** a Fuel Supplier is an individual
**When** it is created
**Then** a valid CPF and full name are required
**And** allowed optional contact and address fields follow the documented contract.

**Given** a Fuel Supplier is a legal entity
**When** it is created
**Then** a valid CNPJ and legal name are required
**And** allowed optional contact and address fields follow the documented contract.

**Given** an active Fuel Supplier already has the same normalized document digest in the selected Company
**When** another active Fuel Supplier is submitted
**Then** creation is rejected with a stable scoped uniqueness conflict.
**And** no duplicate active Supplier is persisted.

**Given** a Client in the selected Company has the same normalized CPF or CNPJ
**When** a Fuel Supplier is registered
**Then** creation is permitted because Client and Fuel Supplier are separate aggregates
**And** neither registry shares mutable base records.

**Given** a same-document Fuel Supplier exists in another Company or Corporation
**When** the selected Company registers its own Supplier
**Then** creation is permitted within its independent scope
**And** foreign data remains inaccessible.

**Given** Fuel Suppliers exist
**When** the administrator uses the registry
**Then** the dashboard supports persisted cursor pagination, search, allowlisted filtering, deterministic sorting, masked documents, and authorized detail
**And** cursor semantics match the canonical pagination contract.

**Given** a Fuel Supplier is inactive or removed
**When** an operational selector is requested
**Then** the Supplier is excluded
**And** historical access does not restore selection eligibility.

**Given** the fixed Fuel Type catalog is initialized
**When** reference seeds run
**Then** Diesel S10 and Diesel S500 exist deterministically
**And** development fixture resets do not duplicate or mutate those identities.

**Given** the Fuel Supplier feature is rendered
**When** loading, empty, validation, conflict, unauthorized, success, or error conditions occur
**Then** the interface provides understandable state and recovery
**And** no generic supplier categories or mock-derived fields are exposed.

**Given** Fuel Supplier behavior is tested
**When** contract, PostgreSQL integration, and Playwright suites run
**Then** they cover entity variants, separate Client/Supplier identity, scoped uniqueness, cross-scope isolation, active selectors, canonical pagination, fixed Fuel Types, masking, detail authorization, and frontend states.
**And** no generic supplier category is introduced.

### Story 2.5: Remove Clients and Fuel Suppliers From Operational Use

**Requirements:** FR8, FR14, FR15; NFR5, NFR8, NFR9, NFR11, NFR13, NFR18; AR7, AR10, AR11, AR52, AR53

As a Master Administrator,
I want to remove Clients and Fuel Suppliers that should no longer be used,
So that current operations remain clean without corrupting historical relationships.

**Acceptance Criteria:**

**Given** an active Client or Fuel Supplier in the selected Company with no blocking current Project relationship
**When** the administrator requests removal and confirms the irreversible action
**Then** the record becomes unavailable for normal registries and operational selectors
**And** the removal captures trusted `actorUserId` and the server transaction instant.

**Given** the record has existing historical relationships
**When** it is removed
**Then** those relationships continue to reference the same preserved record
**And** no historical Project, agreement, or detail is rewritten.

**Given** a record has no history and is otherwise eligible for removal
**When** removal succeeds
**Then** it is still treated as an irreversible lifecycle action in the MVP
**And** no restore command or dashboard action is offered.

**Given** a removed Client or Fuel Supplier document is no longer reserved by another active record of the same registry and Company
**When** a new active record is created with that document
**Then** reuse is permitted
**And** prior historical references remain attached to the removed record.

**Given** a removed record is requested through an operational selector or current registry
**When** the query executes
**Then** it is excluded by the explicit current-state handler
**And** historical handlers remain separate.

**Given** a removed record identifier is requested directly
**When** the request is for operational use
**Then** it fails safely as unavailable
**And** historical detail is exposed only through an explicit authorized historical path.

**Given** a Client is the current contracting Client of any `PLANNED`, `ACTIVE`, or `PAUSED` Project
**When** removal is attempted
**Then** the command is rejected until every affected Project selects another eligible Client
**And** the API returns a stable conflict containing only authorized affected Project identifiers and the replacement action.

**Given** a Fuel Supplier has a current Fuel Agreement on any `PLANNED`, `ACTIVE`, or `PAUSED` Project
**When** removal is attempted
**Then** the command is rejected until every affected agreement is ended through its owning Project workflow
**And** no Supplier, agreement, Fuel Type, or effective price history changes.

**Given** a Client or Fuel Supplier is referenced only by terminal or otherwise closed historical relationships
**When** removal is attempted
**Then** those historical references do not block removal
**And** the record disappears from operational use while remaining available through authorized history.

**Given** two requests attempt removal or identifier reuse concurrently
**When** they execute
**Then** database constraints and transaction behavior produce a consistent committed result
**And** conflicts never create two active records with the same scoped identifier.

**Given** the dashboard performs removal
**When** the command succeeds or conflicts
**Then** it revalidates the affected registry, preserves unrelated table state, and shows a proportional confirmation or recovery message
**And** it does not simulate deletion locally before backend confirmation.

**Given** operational removal is tested
**When** integration and Playwright suites run
**Then** they cover records with history, records without history, irreversible behavior, selector exclusion, historical preservation, identifier reuse, concurrency, cross-scope protection, and recovery states.
**And** removed records never return to operational selectors.

### Story 2.6: Register Persons and Company Employments

**Requirements:** FR6, FR7, FR9; NFR2, NFR6, NFR8, NFR9, NFR11, NFR12, NFR13, NFR14, NFR18; AR5, AR7, AR10, AR22, AR25, AR30, AR43, AR47

As a Master Administrator,
I want to register a Person and establish their Employment in the selected Company,
So that the Company has an accurate workforce registry for future responsibilities and allocations.

**Acceptance Criteria:**

**Given** an authenticated Session with a selected Company
**When** the administrator submits a valid CPF, Person name, Company registration number, and admission data
**Then** the system creates or reuses the Corporation-scoped Person
**And** creates the Company-owned Employment and its first open Employment Period atomically.

**Given** no Person with the normalized CPF exists in the authenticated Corporation
**When** registration succeeds
**Then** one Person identity is created with encrypted CPF and equality digest
**And** that identity is not visible to another Corporation.

**Given** the Person already exists in the authenticated Corporation
**When** a different Company in the same Corporation creates an Employment
**Then** the same Person identity is reused
**And** an independent Company Employment is created.

**Given** the same CPF exists in another Corporation
**When** the selected Corporation registers the Person
**Then** an independent Person identity is permitted
**And** no cross-Corporation reference is created.

**Given** an active Employment already exists for the same Person and selected Company
**When** duplicate Employment creation is attempted
**Then** the operation is rejected with a stable conflict
**And** no duplicate open Employment Period is created.

**Given** a Company registration number is supplied
**When** it is persisted
**Then** its active uniqueness is enforced inside the selected Company according to the contract
**And** terminated historical Employments retain their original value.

**Given** an Employee has no Project allocation
**When** the Employment remains active
**Then** the Employee appears as available for future Project selection
**And** no synthetic allocation or role is inferred.

**Given** Employees exist in the selected Company
**When** the administrator opens the workforce registry
**Then** the dashboard presents a persisted cursor-paginated table with search, allowlisted filters, deterministic sorting, masked CPF, current Employment state, and current availability
**And** no mock role, current Project, or status is invented.

**Given** a Person or Employment detail is requested
**When** it belongs to the trusted scope
**Then** the response separates Person identity, current Employment state, and Employment Period data
**And** foreign-scope and absent records share non-disclosing behavior.

**Given** Person and Employment registration is tested
**When** contract, PostgreSQL integration, and Playwright suites run
**Then** they cover new Person creation, same-Corporation reuse, cross-Corporation independence, duplicate active Employment, atomic rollback, masked lists, authorized detail, availability without allocation, pagination, and tenant isolation.
**And** Person and Employment identities remain distinct.

### Story 2.7: Maintain Admission and Rehire Periods

**Requirements:** FR10; NFR5, NFR8, NFR9, NFR11, NFR13; AR7, AR10, AR11, AR52, AR53

As a Master Administrator,
I want to maintain distinct Employment admission and rehire periods,
So that workforce availability changes without rewriting prior employment history.

**Acceptance Criteria:**

**Given** an active Employment with one open Employment Period
**When** its current state is requested
**Then** exactly one open period determines active Employment
**And** every closed period remains immutable.

**Given** a previously terminated Employment in the selected Company
**When** the administrator submits valid rehire data
**Then** the existing Person and Employment identities are reused
**And** a new open Employment Period begins at the server transaction instant.

**Given** a prior Employment Period is closed
**When** rehire occurs
**Then** the prior period is not reopened or edited
**And** the new period is independently attributable and queryable.

**Given** an Employment already has an open period
**When** rehire is attempted
**Then** the command is rejected with a stable current-state conflict
**And** no additional period is created.

**Given** two concurrent rehire commands target the same terminated Employment
**When** they execute
**Then** database constraints permit at most one new open period
**And** the losing command receives a safe conflict.

**Given** an Employment belongs to another Company or Corporation
**When** rehire is attempted from the selected workspace
**Then** the operation fails without revealing foreign existence
**And** no period changes.

**Given** rehire succeeds
**When** operational selectors and the workforce registry are refreshed
**Then** the Employee becomes active and available unless another valid condition restricts selection
**And** historical periods remain visible only through explicit detail history.

**Given** admission and rehire are displayed
**When** the administrator views Employment detail
**Then** each period shows its admission instant or date, termination data when present, and current or closed state
**And** closed history is not offered as an editable current record.

**Given** period behavior is tested
**When** PostgreSQL integration and frontend tests run
**Then** they cover first admission, rehire, duplicate open-period prevention, concurrent rehire, immutable closed periods, current selector behavior, historical detail, and cross-scope protection.
**And** closed periods are never reopened by test setup.

## Epic 3: Register Machines and Preserve Meter History

The Master Administrator can register Machines and maintain trustworthy monotonic Meter Readings so equipment is ready for later allocation and lifecycle operations.

### Story 3.1: Register and Find Machines

**Requirements:** FR6, FR7, FR17; NFR2, NFR8, NFR9, NFR12, NFR13, NFR14, NFR16, NFR18; AR8, AR9, AR10, AR25, AR30, AR32, AR33, AR43

As a Master Administrator,
I want to register and find Machines owned by the selected Company,
So that the Company has trustworthy equipment available for future Project allocation.

**Acceptance Criteria:**

**Given** an authenticated Session with a selected Company
**When** the administrator submits a Machine with name, description, fixed type, manufacturer, model, identifiers, and initial Meter Reading
**Then** the Machine, first Machine Ownership Period, identifiers, and initial confirmed Meter Reading are created atomically
**And** Corporation and Company ownership come only from trusted Session context.

**Given** a Machine is registered
**When** its type is supplied
**Then** only `YELLOW_LINE` or `WHITE_LINE` is accepted
**And** the free-text model describes the specific equipment form without creating another type catalog.

**Given** Machine identifiers are supplied
**When** validation runs
**Then** at least one of plate or Company tag is required
**And** both may be stored when present.

**Given** an active Machine in the selected Company already uses the submitted normalized plate or Company tag
**When** registration is attempted
**Then** the command is rejected with a stable scoped identifier conflict
**And** no partial Machine, ownership period, identifier, or Meter Reading remains.

**Given** the same plate or tag exists under active ownership in another Company or Corporation
**When** a Machine is registered in the selected Company
**Then** uniqueness follows the approved Company ownership scope
**And** no foreign Machine information is disclosed.

**Given** an initial Meter Reading is submitted
**When** it is validated
**Then** it must be a non-negative decimal represented without binary floating-point persistence
**And** it is recorded as the first confirmed reading with trusted actor and server transaction instant.

**Given** Machines exist in the selected Company
**When** the administrator opens the Machine registry
**Then** the dashboard displays a persisted cursor-paginated table with search, allowlisted filters, deterministic sorting, current identifiers, type, manufacturer, model, latest confirmed Meter Reading, and availability
**And** it excludes mock fields and operational metrics not required by the product.

**Given** search, filters, or sorting change
**When** another Machine page is requested
**Then** cursor traversal resets
**And** the new opaque cursor is bound to normalized query and trusted scope.

**Given** a malformed, stale-query, or foreign-scope cursor
**When** the list endpoint receives it
**Then** the canonical cursor-validation error is returned
**And** no foreign records are exposed.

**Given** a Machine detail is requested
**When** it belongs to the selected Company
**Then** current registration, ownership, identifiers, latest Meter Reading, and availability are returned through a view model
**And** absent and foreign-scope identifiers share non-disclosing behavior.

**Given** Machine registration or listing is loading, empty, invalid, unauthorized, conflicted, successful, or failed
**When** the dashboard renders
**Then** it provides an understandable stable-layout state and safe recovery
**And** uses generated server-only API clients through the frontend adapter boundary.

**Given** Machine registration is tested
**When** unit, real-PostgreSQL integration, OpenAPI generation, frontend, and Playwright suites run
**Then** they cover both fixed types, plate-only, tag-only, both identifiers, missing identifiers, scoped conflicts, numeric precision, atomic rollback, pagination, isolation, and UI states.
**And** generated clients remain the dashboard transport authority.

### Story 3.2: Maintain a Monotonic Meter Reading Chain

**Requirements:** FR18; NFR5, NFR8, NFR9, NFR11, NFR13, NFR16; AR8, AR9, AR10, AR11, AR43, AR52, AR53

As a Master Administrator,
I want confirmed Machine Meter Readings to remain trustworthy and correctable only in safe cases,
So that future allocation, fueling, maintenance, and RDO evidence can rely on one non-decreasing history.

**Acceptance Criteria:**

**Given** a Machine has a latest confirmed Meter Reading
**When** a new reading is recorded by an eligible operation
**Then** the new value must be greater than or equal to the latest confirmed value
**And** PostgreSQL-backed concurrency protection enforces the monotonic result.

**Given** a lower reading than the latest confirmed value
**When** an ordinary reading command is attempted
**Then** the command is rejected with a stable semantic error
**And** the existing reading chain remains unchanged.

**Given** two concurrent commands attempt to append readings to the same Machine
**When** they execute
**Then** transaction isolation and constraints produce one valid ordered chain
**And** no decreasing or ambiguously ordered committed sequence is possible.

**Given** an initial or ownership-transfer Meter Reading has never been referenced by an allocation, shift, fueling, maintenance, or other evidence record
**When** an authorized correction supplies a valid new value and reason
**Then** the correction is permitted if the resulting reading chain remains non-decreasing
**And** actor, transaction instant, old value, new value, and reason are preserved.

**Given** an initial or transfer Meter Reading is already referenced
**When** correction is attempted
**Then** the command is rejected as immutable
**And** the original reading and references remain unchanged.

**Given** a corrected reading would exceed a later confirmed value or fall below a prior confirmed value
**When** validation runs
**Then** the correction is rejected
**And** no audit or reading state is partially committed.

**Given** an ordinary confirmed reading
**When** update or deletion is attempted
**Then** the operation is unavailable in the MVP
**And** changes must occur only through an explicitly permitted correction command.

**Given** Meter Reading values cross the API boundary
**When** they are serialized or submitted
**Then** they use normalized decimal strings
**And** persistence uses non-negative `numeric(14,2)`.

**Given** the current Machine state is requested
**When** the owning handler responds
**Then** the latest confirmed reading is explicit
**And** historical readings are returned only through the dedicated historical detail path.

**Given** a Meter Reading command targets a Machine outside the selected Company or authenticated Corporation
**When** it executes
**Then** the operation fails without revealing foreign existence
**And** no reading is appended or corrected.

**Given** reading and correction behavior is tested
**When** real-PostgreSQL integration and concurrency suites run
**Then** they cover increasing and equal readings, decreasing rejection, concurrent append, correctable unreferenced readings, referenced immutability, neighbor-bound validation, decimal precision, auditing, and tenant isolation.
**And** every committed reading chain remains non-decreasing.

## Epic 4: Create a Complete and Consistent Project

The Master Administrator can complete the guided Project wizard with identity, commercial baseline, accountability, Weekly Schedule, Break Templates, optional resources, and Project-specific fuel terms, producing exactly one valid `PLANNED` Project or no committed data.

### Story 4.1: Run a Non-Resumable Local Project Wizard

**Requirements:** FR26; NFR13, NFR14, NFR18; AR19, AR32, AR33, AR35, AR36, AR37, AR38, AR39, AR41, AR42

As a Master Administrator,
I want to complete Project setup through one guided browser workflow,
So that I can review a complete Project before any backend record is created.

**Acceptance Criteria:**

**Given** the administrator starts Project creation in a selected Company
**When** the wizard opens
**Then** it reuses the existing accessible visual shell and approved interaction components
**And** initializes a new browser-local wizard session and idempotency key.

**Given** the wizard is open
**When** the administrator enters valid values and moves between steps
**Then** values remain available for the current open workflow
**And** no Project draft or partial relationship is persisted by the backend.

**Given** the administrator attempts to advance
**When** the current step contains invalid required values
**Then** only that step is blocked
**And** readable field-level validation is displayed without invoking backend business rules as frontend authority.

**Given** the current step is valid
**When** the administrator advances or returns to a prior step
**Then** navigation preserves entered values
**And** visible focus and keyboard behavior move predictably.

**Given** the administrator closes or explicitly cancels the wizard before final submission
**When** the confirmation completes
**Then** all local wizard state and the wizard-session idempotency key are discarded
**And** reopening Project creation starts from the beginning.

**Given** the browser page is refreshed, navigated away, or the workflow is otherwise abandoned
**When** the wizard is opened again
**Then** no prior draft is restored
**And** no backend Project or relationship exists from the abandoned session.

**Given** the selected Company changes while the wizard is open
**When** the new workspace becomes active
**Then** the wizard is cancelled and all subordinate state is cleared
**And** values from the prior Company cannot be submitted under the new scope.

**Given** the wizard displays selectable entities
**When** Clients, Employees, Machines, or Fuel Suppliers are loaded
**Then** data comes through server queries, frontend adapters, and generated server-only clients
**And** Client Components never receive credentials or infer Company scope.

**Given** the wizard is displayed on supported desktop and mobile layouts
**When** the administrator navigates, validates, reviews, or cancels
**Then** text, controls, dialogs, and step content remain usable without overlap
**And** existing visual styling is preserved without retaining mock-only fields.

**Given** wizard-shell behavior is tested
**When** frontend unit and Playwright suites run
**Then** they cover step navigation, current-step validation, value preservation, keyboard operation, cancellation, refresh abandonment, Company change, no backend draft, and responsive layouts.
**And** abandoned workflows leave no persisted Project data.

### Story 4.2: Capture Project Identity and Commercial Baseline

**Requirements:** FR22; NFR13, NFR15, NFR16, NFR18; AR8, AR9, AR37, AR38, AR40, AR59

As a Master Administrator,
I want to enter the Project's identity, location, contract reference, budget, and planned dates,
So that the Project has the minimum cadastral and commercial baseline required for planning.

**Acceptance Criteria:**

**Given** the administrator is on the Project identity step
**When** valid data is entered
**Then** the step captures Project name, required address, optional coordinates, optional contract number, approved budget, planned start date, and planned end date.
**And** every value remains editable before final submission.

**Given** the Project name or address is blank
**When** the administrator attempts to advance
**Then** the step remains active
**And** the missing fields receive readable validation.

**Given** coordinates are omitted
**When** the step is validated
**Then** omission is accepted
**And** no placeholder latitude or longitude is generated.

**Given** coordinates are provided
**When** validation runs
**Then** latitude and longitude must be valid geographic decimal values
**And** their API representation does not introduce binary floating-point persistence errors.

**Given** a contract number is omitted
**When** validation runs
**Then** omission is accepted.
**And** no placeholder contract number is generated.

**Given** a contract number matches another Project in the Company
**When** the wizard is finalized later
**Then** duplication is permitted
**And** the normalized contract number remains available for Project search.

**Given** an approved budget is submitted
**When** it crosses the API boundary
**Then** it uses a normalized decimal string with BRL two-decimal precision
**And** it remains cadastral reference without triggering cost calculations.

**Given** the approved budget is exactly `"0.00"`
**When** the step is validated
**Then** the value is accepted as a non-negative cadastral reference
**And** a negative value or scale beyond two decimal places is rejected rather than silently rounded.

**Given** the planned end date precedes the planned start date
**When** the step is validated
**Then** advancement is blocked
**And** the date relationship receives a clear validation message.

**Given** planned dates are submitted
**When** they are represented in the contract and persistence
**Then** they use civil `YYYY-MM-DD` dates
**And** server-local time cannot shift either date.

**Given** the administrator reviews the wizard
**When** identity and baseline values are displayed
**Then** the formatted view is derived from the current local command model
**And** the administrator can navigate directly back to this step to edit it.

**Given** identity and baseline behavior is tested
**When** frontend and API schema tests run
**Then** they cover required fields, optional coordinates, coordinate validation, optional non-unique contract number, decimal budget precision, date ordering, civil-date serialization, and review editing.
**And** no test treats budget as calculated cost.

### Story 4.3: Select the Client and Project Responsibilities

**Requirements:** FR23; NFR2, NFR9, NFR11, NFR12, NFR13, NFR18; AR10, AR30, AR37, AR38

As a Master Administrator,
I want to assign the current Client, Manager, and Technical Responsibilities,
So that the Project starts with valid commercial and accountable ownership.

**Acceptance Criteria:**

**Given** the administrator opens the accountability step
**When** selectable Clients are requested
**Then** only active Clients from the selected Company are returned
**And** removed, inactive, historical, sibling-Company, and foreign-Corporation Clients are excluded.

**Given** selectable Managers and Technical Responsibilities are requested
**When** the Employee selectors load
**Then** only active Employments from the selected Company are returned
**And** operational Project allocation availability does not restrict Manager or Technical Responsibility eligibility.

**Given** the administrator configures accountability
**When** the step is validated
**Then** exactly one active Client, exactly one current Manager, and at least one current Technical Responsibility are required
**And** duplicate Technical Responsibility selections are rejected.

**Given** an Employee is already a Manager or Technical Responsibility on other Projects
**When** the Employee is selected
**Then** selection remains permitted
**And** no operational allocation exclusivity is consumed.

**Given** the same Employee is selected as Manager and Technical Responsibility
**When** the accountability step is validated
**Then** the relationships remain distinct and valid
**And** each role is represented explicitly in the aggregate command.

**Given** a selected Client or Employee becomes inactive, removed, terminated, or foreign to the selected Company before final submission
**When** final backend validation runs
**Then** Project creation is rejected without partial persistence
**And** the structured conflict identifies the affected in-scope resource and accountability step.

**Given** a selector is searched or paginated
**When** additional results are requested
**Then** it follows the canonical cursor contract
**And** documents remain masked.

**Given** a foreign or stale selector cursor is submitted
**When** the backend validates it
**Then** a stable validation error is returned
**And** foreign entity existence is not disclosed.

**Given** the administrator reviews accountability
**When** selected entities are displayed
**Then** the view uses safe names and masked identifiers where needed
**And** provides an edit action that returns to the accountability step.

**Given** accountability behavior is tested
**When** frontend, contract, and PostgreSQL integration tests run
**Then** they cover required cardinality, multi-Project responsibilities, role independence from allocations, duplicate prevention, eligibility changes before submission, scoped selectors, masked documents, and safe conflicts.
**And** every accepted accountability set has one Manager and at least one Technical Responsibility.

### Story 4.4: Configure the Weekly Schedule and Break Templates

**Requirements:** FR24; NFR13, NFR15, NFR18; AR8, AR37, AR38, AR59

As a Master Administrator,
I want to configure the Project's default weekly working windows and suggested breaks,
So that future field shifts have a clear operational baseline without forcing actual RDO behavior.

**Acceptance Criteria:**

**Given** the administrator opens the schedule step
**When** the default week is configured
**Then** all seven days are available for independent working or non-working configuration
**And** the system does not infer a mandatory rest day.

**Given** a day is marked as working
**When** its operating window is entered
**Then** exactly one start time and one end time are required
**And** both times must form a valid same-day window.

**Given** an end time is equal to or earlier than the start time
**When** the default working-day window is validated
**Then** the day is invalid
**And** a cross-midnight default window is rejected in the MVP.

**Given** all seven days are marked non-working
**When** the administrator attempts to advance
**Then** validation fails
**And** at least one working day is required.

**Given** any subset from one through seven working days has valid windows
**When** the step is validated
**Then** the Weekly Schedule is accepted
**And** no automatic overtime or rest-day rule is calculated.

**Given** the administrator adds a Break Template
**When** valid data is entered
**Then** a non-blank name and positive duration in integer minutes are required
**And** the template is treated only as a future shift-closure suggestion.

**Given** zero Break Templates are configured
**When** the step is validated
**Then** the schedule remains valid.
**And** no default Break Template is generated.

**Given** a Break Template duration or label is edited or removed before submission
**When** the wizard state updates
**Then** only the local aggregate command changes
**And** no backend schedule revision or break record exists yet.

**Given** Break Templates are configured
**When** schedule validation runs
**Then** they are not required to fit at predetermined clock times within the default window
**And** they do not divide, shorten, or otherwise alter the operating window.

**Given** future RDO compatibility is considered
**When** the schedule command model is produced
**Then** it can later support actual shifts crossing midnight and edited actual breaks without changing the default same-day schedule semantics
**And** no RDO workflow is implemented in this story.

**Given** schedule and break behavior is tested
**When** frontend and contract tests run
**Then** they cover one through seven working days, all-non-working rejection, valid windows, equal/end-before-start rejection, optional breaks, positive integer duration, edit/remove behavior, and no inferred overtime or RDO logic.
**And** every accepted default window remains within one civil day.

### Story 4.5: Configure Optional Initial Employee Mobilization

**Requirements:** FR12, FR25; NFR2, NFR9, NFR12, NFR13, NFR16, NFR18; AR8, AR9, AR30, AR31, AR37, AR38, AR59

As a Master Administrator,
I want to optionally select Employees and their initial work terms during Project creation,
So that the Project can reserve eligible workers without making Employee mobilization mandatory.

**Acceptance Criteria:**

**Given** the administrator reaches Employee mobilization
**When** no Employee is selected
**Then** the wizard remains valid
**And** Project creation is not blocked.

**Given** Employee candidates are requested
**When** the selector loads
**Then** it returns active Employments from the selected Company that are eligible for a new open operational allocation
**And** it excludes a Person already operationally allocated anywhere in the Corporation.

**Given** an Employee is selected for initial allocation
**When** allocation terms are entered
**Then** free-text job role, expected daily workload from 1 through 1,440 integer minutes, compensation mode, non-negative BRL compensation value, and non-negative BRL overtime rate are required
**And** compensation mode is limited to daily, hourly, weekly, fortnightly, or monthly.

**Given** compensation or overtime values are submitted
**When** validation runs
**Then** `"0.00"` is accepted and scale beyond two decimal places is rejected
**And** values are never silently rounded.

**Given** a selected Employee becomes unavailable, terminated, inactive, or foreign before final submission
**When** final backend validation runs
**Then** the conflict identifies the affected Employee and Employee mobilization subsection
**And** unrelated valid wizard values remain available.

**Given** the Employee selector uses search or pagination
**When** more results are requested
**Then** it follows canonical cursor semantics and trusted scope
**And** Company changes invalidate every loaded Employee and selection.

**Given** Employee mobilization is tested
**When** frontend, contract, and PostgreSQL integration tests run
**Then** they cover an empty selection, required terms, compensation modes, Corporation-wide Person exclusivity, pagination, stale eligibility, and conflict mapping
**And** Employee mobilization remains optional.

### Story 4.6: Configure Optional Initial Machine Mobilization

**Requirements:** FR19, FR25; NFR2, NFR9, NFR12, NFR13, NFR16, NFR18; AR8, AR9, AR30, AR31, AR37, AR38

As a Master Administrator,
I want to optionally select Machines during Project creation,
So that the Project can reserve eligible equipment from a confirmed Meter Reading without making Machine mobilization mandatory.

**Acceptance Criteria:**

**Given** the administrator reaches Machine mobilization
**When** no Machine is selected
**Then** the wizard remains valid
**And** Project creation is not blocked.

**Given** Machine candidates are requested
**When** the selector loads
**Then** it returns active Machines currently owned by the selected Company with no open Project allocation and no blocking lifecycle condition
**And** each candidate exposes its latest confirmed Meter Reading safely.

**Given** a Machine is selected
**When** the initial allocation command is prepared
**Then** its allocation start reading references the latest confirmed Meter Reading
**And** no registration or ownership change is implied.

**Given** a selected Machine becomes allocated, transferred, retired, blocked, or foreign before final submission
**When** final backend validation runs
**Then** the conflict identifies the affected Machine and Machine mobilization subsection
**And** unrelated valid wizard values remain available.

**Given** the Machine selector uses search or pagination
**When** more results are requested
**Then** it follows canonical cursor semantics and trusted scope
**And** Company changes invalidate every loaded Machine and selection.

**Given** Machine mobilization is tested
**When** frontend, contract, and PostgreSQL integration tests run
**Then** they cover an empty selection, current ownership, allocation eligibility, latest-reading continuity, pagination, stale eligibility, and conflict mapping
**And** Machine mobilization remains optional.

### Story 4.7: Configure Optional Project Fuel Agreements

**Requirements:** FR16, FR25; NFR2, NFR9, NFR12, NFR13, NFR16, NFR18; AR8, AR9, AR12, AR30, AR31, AR37, AR38, AR59

As a Master Administrator,
I want to optionally configure Project-specific Fuel Suppliers, Fuel Types, and initial prices,
So that fuel terms belong to the Project without creating Company-wide product or price assumptions.

**Acceptance Criteria:**

**Given** the administrator reaches fuel configuration
**When** no Fuel Agreement is added
**Then** the wizard remains valid
**And** Project creation is not blocked.

**Given** Fuel Supplier candidates are requested
**When** the selector loads
**Then** only active Fuel Suppliers from the selected Company are returned
**And** suppliers from another Company cannot be associated.

**Given** a Fuel Agreement is added
**When** it is configured
**Then** one active Fuel Supplier and at least one of Diesel S10 or Diesel S500 are selected
**And** each selected Fuel Type has a positive BRL-per-liter price represented with four decimal places.

**Given** a fuel price is `"0.0000"`, negative, or has scale beyond four decimal places
**When** validation runs
**Then** the price is rejected
**And** no silent rounding or default price is applied.

**Given** the same Fuel Supplier is selected
**When** agreements for different Projects are created
**Then** Fuel Types and prices remain Project-specific
**And** no Company-wide product or price assumption is created.

**Given** the same Supplier and Fuel Type are duplicated inside the same new Project command
**When** the step is validated
**Then** duplication is rejected with a stable field-level validation code
**And** the dashboard preserves the entries so the administrator can choose the single intended price.

**Given** a selected Fuel Supplier becomes inactive, removed, or foreign before final submission
**When** final backend validation runs
**Then** the conflict identifies the affected Supplier and fuel subsection
**And** unrelated valid wizard values are preserved in the browser.

**Given** the Fuel Supplier selector uses search or pagination
**When** more results are requested
**Then** they follow canonical cursor semantics and trusted scope
**And** Company changes invalidate every loaded Supplier and agreement.

**Given** fuel configuration is tested
**When** frontend, contract, and PostgreSQL integration tests run
**Then** they cover no agreements, same-Company Suppliers, fixed Fuel Types, four-decimal prices, duplicate agreements, Project-specific terms, pagination, stale eligibility, and conflict mapping
**And** Fuel Agreements remain optional.

### Story 4.8: Finalize the Project Aggregate Atomically and Idempotently

**Requirements:** FR16, FR22, FR23, FR24, FR25, FR26; NFR1, NFR2, NFR8, NFR9, NFR10, NFR11, NFR13, NFR14, NFR16; AR10, AR11, AR24, AR25, AR26, AR28, AR29, AR31, AR43, AR47, AR59

As a Master Administrator,
I want the API to finalize the complete Project command atomically and idempotently,
So that either one valid `PLANNED` Project and all selected relationships are created or nothing is committed.

**Acceptance Criteria:**

**Given** the aggregate command reaches the API
**When** request validation runs
**Then** the body may not exceed 1 MiB
**And** it permits at most 200 Employee allocations, 100 Machine allocations, 20 Technical Responsibilities, 10 Fuel Agreements, and 10 Break Templates.

**Given** the encoded request body is exactly 1 MiB and every collection is exactly at its documented maximum
**When** request validation runs
**Then** the request is accepted for domain validation
**And** rejection occurs only when the body or a collection is greater than its inclusive limit.

**Given** the request exceeds any body or collection limit
**When** it is validated
**Then** the command is rejected before domain mutation
**And** a stable validation code identifies the relevant limit.

**Given** a finalization command is accepted
**When** the Projects service executes
**Then** trusted Corporation, selected Company, User, Session, and role come from request context
**And** all Project identity, baseline, Client, responsibility, schedule, break, Employee, Machine, and fuel data is revalidated inside one transaction.

**Given** all required and selected relationships remain valid
**When** the transaction commits
**Then** exactly one `PLANNED` Project, initial Project Baseline, current Client period, one Manager tenure, Technical Responsibilities, Weekly Schedule revision, Break Templates, optional allocations, optional Fuel Agreements, and initial effective prices are persisted
**And** no actual production start is recorded.

**Given** optional mobilization collections are empty
**When** finalization commits
**Then** the Project is still created successfully
**And** Client, Manager, at least one Technical Responsibility, and valid Weekly Schedule remain mandatory.

**Given** any validation, ownership, availability, uniqueness, temporal, or persistence rule fails
**When** finalization executes
**Then** the complete transaction rolls back
**And** no Project, idempotency completion, allocation, responsibility, schedule, or agreement is partially committed.

**Given** the same scoped `Idempotency-Key` and canonical payload are submitted after a successful commit
**When** the retry is processed
**Then** the original successful result is returned
**And** no duplicate Project or relationship is created.

**Given** the same scoped `Idempotency-Key` is submitted with a different canonical payload
**When** the request is processed
**Then** a `409` idempotency conflict is returned
**And** the original result and aggregate remain unchanged.

**Given** concurrent identical finalization requests use the same key and payload
**When** they execute
**Then** one transaction creates the aggregate
**And** the other request safely waits for or recovers the committed result.

**Given** finalization or an eligibility conflict completes
**When** the API returns its canonical response
**Then** success or authorized affected resource identifiers are represented through stable response codes and `details.resources`
**And** completed idempotency records remain retained for 30 days.

**Given** aggregate finalization is tested
**When** unit, real-PostgreSQL transaction and concurrency, and OpenAPI suites run
**Then** they cover successful full and minimal aggregates, every request limit, complete rollback, eligibility races, same-key replay, key-payload mismatch, concurrent submission, and cross-scope rejection
**And** every successful scenario commits exactly one Project aggregate.

### Story 4.9: Submit the Wizard and Recover Finalization Conflicts

**Requirements:** FR26; NFR10, NFR12, NFR13, NFR14, NFR18; AR19, AR25, AR26, AR28, AR30, AR32, AR33, AR38, AR42

As a Master Administrator,
I want the dashboard to submit the complete wizard and preserve my work when a recoverable conflict occurs,
So that I can correct only the affected step without creating duplicate Projects.

**Acceptance Criteria:**

**Given** every wizard step is locally valid
**When** the administrator submits the final review
**Then** the dashboard sends one aggregate command through a Server Action
**And** includes the wizard-session `Idempotency-Key`.

**Given** one or more selected Employees, Machines, Clients, or Fuel Suppliers changed eligibility
**When** the API returns a structured finalization conflict
**Then** the frontend adapter maps the stable code and authorized `details.resources`
**And** identifies the affected wizard step or subsection.

**Given** a recoverable conflict reaches the dashboard
**When** it is rendered
**Then** valid local values remain intact and the wizard navigates to the affected step
**And** behavior does not depend on parsing the error message.

**Given** a request fails before a committed result is known
**When** the administrator retries the same unchanged wizard session
**Then** the same idempotency key and canonical payload are reused
**And** duplicate submission cannot create another Project.

**Given** finalization succeeds
**When** the dashboard receives the result
**Then** it clears local wizard state, navigates to the authorized Project view, and revalidates the Project registry
**And** the completed wizard key is not reused for a new Project.

**Given** the Project appears in the registry
**When** it is listed or searched
**Then** it uses canonical cursor pagination and selected Company scope
**And** the optional non-unique contract number is searchable.

**Given** dashboard submission and recovery are tested
**When** frontend unit and Playwright suites run
**Then** they cover initial submission, affected-step mapping, preserved values, unchanged retry, successful cleanup, registry appearance, and Company-scope changes
**And** generated clients remain server-only.

### Epic 4 Security and Completeness Acceptance Addendum

The following acceptance requirements are normative for the corresponding Story 4.x criteria above and must remain synchronized with the dedicated story files:

- **Story 4.1:** disclose the memory-only loss model; confirm dirty in-app exits; capture an immutable expected Company precondition; protect exit during unknown outcome; test keyboard/focus/screen-reader behavior, 200% zoom, 320 CSS pixels, and a cross-tab Company switch.
- **Story 4.2:** enforce trimmed NFC text maxima of 160 code points for Project name, 500 for address, and 120 for contract number; reject unsafe controls; cap budget at 16 integral plus two fractional digits; store paired coordinates as canonical `numeric(9,6)` values with geographic bounds.
- **Story 4.3:** require 1-20 Technical Responsibilities unique by Employment; keep Manager, Technical Responsibility, and allocation roles independent; revalidate Client and Employment scope/lifecycle at commit; return subsection-specific conflicts and prove selection/finalization races.
- **Story 4.4:** model schedule values as timezone-free wall clock, reject `24:00`, use half-open `[start,end)` intervals, disallow implicit overnight windows, and bound Break Template names to 120 NFC code points and durations to 1-1440 minutes without inventing clock placement.
- **Story 4.5:** bound `jobRole` to 120 NFC code points and money to `numeric(18,2)` capacity; preserve explicit selections across paginated views; enforce Corporation Person exclusivity independently from accountability; prove concurrent allocations with deterministic database barriers.
- **Story 4.6:** require the submitted reading id to remain the latest confirmed reading at commit; preserve paginated selections; report a specific authorized stale-reading conflict; prove allocation and reading races atomically.
- **Story 4.7:** pin the immutable catalog to `fuel-types:v1` with `diesel-s10` and `diesel-s500`; treat seed inconsistency as configuration failure; cap prices to positive `numeric(18,4)` values; distinguish Supplier and Fuel Type conflicts without deriving budget, consumption, inventory, or Machine rules.
- **Story 4.8:** require `Idempotency-Key` and the non-authoritative `X-Expected-Company-Id` precondition; accept only JSON; apply the exact body/collection limits and 10 attempts/minute per trusted Session/Company; use versioned canonicalization, completed-result idempotency, closed error discriminators, executable PostgreSQL enforcement mechanisms, three bounded serializable attempts, and deterministic concurrency tests.
- **Story 4.9:** disable authentication auto-refresh for finalization; send the expected Company only as a header; use a closed action-result union; preserve and route multiple conflicts; avoid lookups of revoked data; freeze unknown outcomes for manual identical retry; isolate all state/cache/navigation by Company epoch and ignore late responses.

These additions do not authorize backend drafts, browser persistence, automatic post-refresh recovery, Break Template clock placement, outbox/events, budget calculations, fuel-to-Machine compatibility, or new labor rules.

## Epic 5: Mobilize Resources and Control Project Operation

The Master Administrator can allocate, reallocate, release, terminate, transfer, or retire operational resources, reserve them during planning, explicitly start real production, pause and reactivate operation, and safely move a Project into an irreversible terminal state.

### Story 5.1: Allocate an Employee With Effective Work Terms

**Requirements:** FR12, FR27; NFR2, NFR5, NFR8, NFR9, NFR11, NFR13, NFR16; AR7, AR8, AR9, AR10, AR11, AR43, AR53, AR59

As a Master Administrator,
I want to allocate an eligible Employee to a `PLANNED` or `ACTIVE` Project with effective work terms,
So that the Project reserves the worker and future operational evidence uses the correct conditions.

**Acceptance Criteria:**

**Given** an active Employment in the selected Company and an eligible `PLANNED` or `ACTIVE` Project
**When** the administrator submits an allocation
**Then** the command requires free-text job role, expected daily workload from 1 through 1,440 integer minutes, compensation mode, non-negative BRL compensation value, and non-negative BRL overtime rate
**And** trusted Corporation and Company scope come only from the Session.

**Given** compensation terms are submitted
**When** validation runs
**Then** compensation mode is limited to daily, hourly, weekly, fortnightly, or monthly
**And** compensation value and overtime rate use normalized decimal strings persisted as `numeric(18,2)`.

**Given** compensation value or overtime rate is exactly `"0.00"`
**When** validation runs
**Then** the value is accepted
**And** negative values or scale beyond two decimal places are rejected without silent rounding.

**Given** the Project is `PLANNED`
**When** allocation succeeds
**Then** the Employee is immediately reserved for that Project
**And** the planned start date does not delay or automatically release the allocation.

**Given** the Project is `ACTIVE`
**When** allocation succeeds
**Then** the Employee becomes operationally assigned from the server transaction instant
**And** no backdated or scheduled start is accepted.

**Given** the same Person has another open operational Employee Allocation in any Company of the authenticated Corporation
**When** a new allocation is attempted
**Then** the command is rejected with a stable availability conflict
**And** the foreign Project or sibling Company is not disclosed beyond authorized conflict detail.

**Given** the same Person has an active Employment or Project allocation in another Corporation
**When** allocation occurs in the authenticated Corporation
**Then** that independent Corporation does not block the command
**And** no cross-Corporation relationship is created.

**Given** the Employee is a current Manager or Technical Responsibility on one or more Projects
**When** an operational allocation is submitted
**Then** those accountability relationships do not consume exclusivity
**And** only another open operational allocation can block the command.

**Given** the Employee, Employment, or Project becomes inactive, terminal, removed, terminated, or foreign before commit
**When** the transaction revalidates eligibility
**Then** no allocation is created
**And** a stable scoped error identifies the safe recovery action.

**Given** two commands concurrently allocate the same Person to different Projects in the Corporation
**When** they execute
**Then** database constraints and transaction behavior allow one winner
**And** the losing command receives a safe conflict without an overlapping period.

**Given** allocation succeeds
**When** current selectors and Project detail are refreshed
**Then** the Employee is unavailable for another operational allocation in the Corporation
**And** the open period exposes its effective terms without mutating permanent Person or Employment identity.

**Given** Employee allocation is tested
**When** unit, real-PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover both eligible Project states, every required term, decimal precision, planned reservation, Corporation-wide exclusivity, cross-Corporation independence, responsibility exceptions, races, and tenant isolation.
**And** every Person has at most one open operational allocation per Corporation.

### Story 5.2: Release an Employee From a Project

**Requirements:** FR13, FR27, FR29; NFR5, NFR8, NFR9, NFR11, NFR13; AR7, AR10, AR11, AR43, AR52, AR53

As a Master Administrator,
I want to release an operationally allocated Employee with immediate effect,
So that the Employee becomes available while prior participation remains true.

**Acceptance Criteria:**

**Given** an Employee has one open operational allocation in the selected Company
**When** the administrator releases the Employee with a non-blank reason
**Then** the current allocation period closes at the server transaction instant
**And** trusted actor and reason are recorded.

**Given** release succeeds
**When** current availability is queried
**Then** the Employee becomes available for another eligible Project
**And** the closed allocation remains immutable and historically inspectable.

**Given** the allocation is already closed or the Employee is no longer active
**When** release is attempted
**Then** the command fails with a stable current-state conflict
**And** no period is changed.

**Given** release races with reallocation, termination, or another allocation command
**When** the commands execute
**Then** one valid lifecycle outcome commits
**And** no successful release leaves another overlapping open period.

**Given** Employee release is tested
**When** real-PostgreSQL transaction and concurrency, frontend, and Playwright suites run
**Then** they cover successful release, already-closed state, termination races, availability, actor and reason, and historical preservation
**And** the Corporation retains at most one open allocation for the Person.

### Story 5.3: Reallocate an Employee Between Projects

**Requirements:** FR13; NFR2, NFR5, NFR8, NFR9, NFR11, NFR13, NFR16; AR7, AR8, AR9, AR10, AR11, AR43, AR53, AR58, AR59

As a Master Administrator,
I want to move an operationally allocated Employee to another eligible Project,
So that source and destination participation change atomically without an overlap.

**Acceptance Criteria:**

**Given** an Employee has one open operational allocation and an eligible destination Project in the same Company
**When** the administrator confirms reallocation with effective destination role, workload, compensation terms, and reason
**Then** the source period closes and a destination period opens atomically at one transaction instant
**And** no unallocated gap or overlap is committed.

**Given** an eligible destination Project belongs to another Company in the same Corporation where the Person has an active Employment
**When** the command explicitly supplies `destinationCompanyId` and `destinationProjectId`
**Then** Corporation-wide Person exclusivity remains enforced
**And** both identifiers are treated as command targets validated against the authenticated Corporation, not as trusted request scope.

**Given** `destinationCompanyId` belongs to another Corporation, is inactive, or does not own `destinationProjectId`
**When** reallocation is attempted
**Then** the command is rejected without revealing foreign existence
**And** the source allocation remains open.

**Given** the destination Company has no active Employment for the Person
**When** reallocation is attempted
**Then** the command is rejected
**And** the source allocation remains open.

**Given** the Employee previously worked on the destination Project
**When** the Employee returns
**Then** a new allocation period is created
**And** the prior closed period is not reopened or edited.

**Given** destination terms differ from the source
**When** reallocation commits
**Then** the new period stores its own effective role, workload, compensation mode, compensation value, and overtime rate
**And** source terms remain attached to the source period.

**Given** the source allocation is already closed, the destination is terminal, or the Employee is no longer active
**When** reallocation is attempted
**Then** the command fails with a stable current-state conflict
**And** no period is partially changed.

**Given** concurrent release, reallocation, termination, or competing allocation commands target the same Person
**When** they execute
**Then** one valid lifecycle outcome commits
**And** the Corporation never has two open operational allocations for that Person.

**Given** Employee reallocation is shown in the dashboard
**When** a recoverable conflict occurs
**Then** valid destination terms and reason are preserved
**And** UI behavior maps stable codes rather than message text.

**Given** Employee reallocation is tested
**When** real-PostgreSQL transaction and concurrency, frontend, and Playwright suites run
**Then** they cover same-Company move, eligible cross-Company move, missing destination Employment, return to a prior Project, destination terms, rollback, races, and historical preservation
**And** no successful movement creates an overlap or reopens a closed period.

### Story 5.4: Change Effective Employee Terms on the Same Project

**Requirements:** FR12; NFR5, NFR8, NFR9, NFR11, NFR13, NFR16; AR7, AR8, AR9, AR10, AR11, AR43, AR53, AR59

As a Master Administrator,
I want to change an allocated Employee's effective role, workload, or compensation terms,
So that future operational evidence uses new terms while prior terms remain historically accurate.

**Acceptance Criteria:**

**Given** an Employee has one open allocation on an eligible Project
**When** the administrator submits changed role, workload, compensation mode, compensation value, or overtime rate with a reason
**Then** the current period closes and a replacement period opens on the same Project at one server transaction instant
**And** the prior period remains immutable.

**Given** replacement terms are submitted
**When** validation runs
**Then** every required effective term follows the same rules as initial allocation
**And** decimal values retain BRL two-decimal precision.

**Given** a replacement workload is outside 1 through 1,440 minutes or a monetary value has excessive scale
**When** validation runs
**Then** the command is rejected
**And** no current allocation period is closed.

**Given** submitted terms are identical to the current period
**When** the change is attempted
**Then** the API rejects the no-op with a stable semantic response
**And** no duplicate period is created.

**Given** the allocation is closed, the Employee is terminated, or the Project is terminal
**When** a term change is attempted
**Then** the command fails with a stable current-state conflict
**And** current and historical periods remain unchanged.

**Given** a term change races with release, reallocation, or termination
**When** the commands execute
**Then** one valid lifecycle result commits
**And** no overlapping replacement period is created.

**Given** effective-term changes are tested
**When** real-PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover each mutable term, multiple terms, no-op rejection, precision, invalid current state, races, current detail, and history
**And** exactly one allocation period remains open when the Employee stays assigned.

### Story 5.5: Terminate an Employment Safely

**Requirements:** FR11; NFR5, NFR8, NFR9, NFR11, NFR13, NFR18; AR7, AR10, AR11, AR26, AR43, AR52, AR53

As a Master Administrator,
I want to terminate an Employment when operational responsibilities permit it,
So that unavailable workers leave current operations while their complete history remains trustworthy.

**Acceptance Criteria:**

**Given** an active Employment with no protected Project responsibility
**When** the administrator confirms immediate termination
**Then** the open Employment Period closes at the server transaction instant
**And** trusted `actorUserId` and the required termination reason are recorded.

**Given** the Employee has one open operational Project Allocation
**When** termination is otherwise valid
**Then** the allocation closes atomically at the same transaction boundary
**And** its effective role, workload, compensation, costs, events, and future RDO references remain attached to the closed period.

**Given** the Employee is the current Manager of any non-terminal Project
**When** termination is attempted
**Then** the command is rejected
**And** the structured conflict identifies only the in-scope Project relationship and required corrective action.

**Given** the Employee holds a current Technical Responsibility
**When** termination would leave a non-terminal Project with no current Technical Responsibility
**Then** the command is rejected
**And** no Employment or allocation period closes.

**Given** the Employee holds a Technical Responsibility but another current responsibility remains
**When** termination is confirmed
**Then** every current Technical Responsibility held through that Employment closes atomically with the Employment and any open operational allocation
**And** the transaction commits only if every affected non-terminal Project retains at least one other current Technical Responsibility.

**Given** an Employment is already terminated
**When** termination is requested again
**Then** the API returns a stable current-state conflict
**And** the original closed period remains unchanged.

**Given** concurrent termination, allocation, reallocation, or responsibility changes target the same Employee
**When** they execute
**Then** transaction isolation and database constraints produce one valid committed outcome
**And** no open allocation survives a successful termination.

**Given** termination succeeds
**When** current lists and selectors are queried
**Then** the Employee is unavailable for new responsibilities and allocations
**And** Person, Employment, Employment Period, and prior allocation history remain inspectable through authorized detail.

**Given** the dashboard submits termination
**When** validation or responsibility conflicts occur
**Then** valid form data is preserved and the interface explains the necessary corrective action using stable codes
**And** no backend message text is parsed to choose behavior.

**Given** termination is tested
**When** unit, real-PostgreSQL integration, concurrency, and Playwright suites run
**Then** they cover unallocated termination, allocation closure, Manager blocking, last-Technical-Responsibility blocking, already-terminated state, rollback, selector exclusion, historical preservation, and tenant isolation
**And** every successful termination leaves no open Employment Period.

### Story 5.6: Allocate a Machine to a Project

**Requirements:** FR19, FR27; NFR2, NFR8, NFR9, NFR11, NFR13, NFR16; AR7, AR8, AR9, AR10, AR11, AR43

As a Master Administrator,
I want to allocate an eligible Machine to a `PLANNED` or `ACTIVE` Project,
So that the asset is reserved with a trustworthy starting Meter Reading.

**Acceptance Criteria:**

**Given** an active Machine currently owned by the selected Company and an eligible `PLANNED` or `ACTIVE` Project
**When** the administrator submits an allocation
**Then** the Machine Allocation opens at the server transaction instant
**And** references the Machine's latest confirmed Meter Reading as its starting evidence.

**Given** the Project is `PLANNED`
**When** allocation succeeds
**Then** the Machine is immediately unavailable to other Projects
**And** no planned date automatically releases it.

**Given** the Project is `ACTIVE`
**When** allocation succeeds
**Then** the Machine becomes currently assigned to that Project
**And** no registration, identifier, ownership, or Meter Reading value is changed by allocation.

**Given** the Machine already has an open Project allocation
**When** another allocation is attempted
**Then** the command is rejected with a stable availability conflict
**And** no overlapping allocation period is created.

**Given** the Machine has been transferred, retired, belongs to another Company, has a blocking open shift, or has a pending final Meter Reading
**When** allocation is attempted
**Then** the operation fails without exposing foreign data
**And** current Machine state remains unchanged.

**Given** the latest confirmed Meter Reading changes before allocation commits
**When** transactional validation runs
**Then** allocation uses the correct committed latest reading or returns a safe conflict
**And** it never records a stale or decreasing start boundary.

**Given** two Projects concurrently attempt to allocate the same Machine
**When** the commands execute
**Then** database constraints produce one winner
**And** the losing request receives a safe conflict.

**Given** allocation succeeds
**When** Project and Machine current views are refreshed
**Then** both show the open relationship and start reading
**And** the Machine is excluded from other allocation selectors.

**Given** Machine allocation is tested
**When** unit, real-PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover planned and active Projects, reading continuity, ownership scope, lifecycle blockers, stale reading races, double allocation, selector exclusion, and unchanged registration.
**And** every successful allocation starts from a confirmed Meter Reading.

### Story 5.7: Reallocate or Release a Machine

**Requirements:** FR19; NFR2, NFR5, NFR8, NFR9, NFR11, NFR13, NFR16; AR7, AR8, AR9, AR10, AR11, AR43, AR52, AR53, AR60

As a Master Administrator,
I want to move or release an allocated Machine with the correct final-reading behavior,
So that availability changes without breaking Meter Reading continuity or prior Project history.

**Acceptance Criteria:**

**Given** a Machine has one open Project allocation and no active shift requiring immediate closure evidence
**When** the administrator releases it after the relevant shift has already been closed with a final Meter Reading
**Then** the allocation closes using the confirmed reading continuity already established by that shift
**And** no duplicate final reading is required.

**Given** a Machine is released or reallocated in the middle of an open shift
**When** the command is submitted
**Then** a valid final Meter Reading is required
**And** the value must be greater than or equal to the latest confirmed reading.

**Given** shift and pending-reading state is outside the MVP RDO module
**When** Machine movement eligibility is evaluated
**Then** the Fleet domain queries an explicit operational-status port
**And** the default MVP implementation reports no open shift or pending reading while remaining replaceable by future RDO work.

**Given** the operating shift has ended but its required final Meter Reading is still pending
**When** release or reallocation is attempted
**Then** the command is blocked until the pending reading is confirmed
**And** no destination allocation opens.

**Given** the source allocation is eligible for release
**When** the administrator confirms release with a reason
**Then** the source allocation closes at the server transaction instant
**And** the Machine becomes available without changing ownership.

**Given** an eligible destination Project in the same owning Company
**When** the administrator confirms reallocation with a reason
**Then** source closure and destination opening occur atomically
**And** the destination starts from the correct latest confirmed Meter Reading.

**Given** a destination Project belongs to another Company
**When** reallocation is attempted without an ownership transfer
**Then** the command is rejected
**And** the source allocation remains open.

**Given** the Machine previously participated in the destination Project
**When** it returns
**Then** a new allocation period is created
**And** the prior period remains closed and immutable.

**Given** a final Meter Reading is supplied
**When** the transaction commits
**Then** the reading is appended once to the monotonic chain and associated with the source operational boundary
**And** the destination starts from that same confirmed continuity point.

**Given** a lower reading, terminal destination, retired or transferred Machine, closed source allocation, or foreign resource is detected
**When** the command executes
**Then** the transaction rolls back completely
**And** a stable scoped error describes the safe correction.

**Given** concurrent release, reallocation, retirement, transfer, or reading commands target the same Machine
**When** they execute
**Then** one consistent lifecycle result commits
**And** the Machine never has overlapping allocations or a broken reading chain.

**Given** Machine movement is rendered in the dashboard
**When** final reading is conditionally required
**Then** the form requests it only for the applicable operational condition
**And** preserves valid destination and reason fields after recoverable conflicts.

**Given** Machine release and reallocation are tested
**When** real-PostgreSQL transaction and concurrency, frontend, and Playwright suites run
**Then** they cover closed-shift reuse, mid-shift required reading, pending-reading blocker, release, same-Company move, cross-Company rejection, return to prior Project, monotonic continuity, rollback, and races.
**And** every successful move preserves one continuous reading chain.

### Story 5.8: Transfer Machine Ownership Between Companies

**Requirements:** FR20; NFR2, NFR5, NFR8, NFR9, NFR11, NFR13, NFR16; AR5, AR7, AR10, AR11, AR52, AR53, AR58, AR60

As a Master Administrator,
I want to transfer a Machine permanently to another Company in the same Corporation,
So that ownership changes while prior Company and Project history remains true.

**Acceptance Criteria:**

**Given** a Machine is currently owned by the selected source Company
**When** the administrator submits an active `destinationCompanyId`
**Then** the destination is eligible for transfer
**And** the identifier is treated only as the command target, while trusted Corporation and source Company context still come from the Session.

**Given** a `destinationCompanyId` belongs to another Corporation, is inactive, or equals the current owner
**When** transfer is attempted
**Then** the command is rejected with a safe validation or semantic response
**And** foreign Company existence is not disclosed.

**Given** the Machine has an open Project allocation
**When** transfer is attempted
**Then** the command is rejected with a stable conflict
**And** ownership, identifiers, registration, and readings remain unchanged.

**Given** the future operational-status port reports an open shift or pending final Meter Reading
**When** transfer is attempted
**Then** the command is rejected with a stable blocker response
**And** the MVP does not create a shift workflow to satisfy this check.

**Given** no RDO or shift module is installed in the MVP
**When** the operational-status port is queried
**Then** its default implementation reports no open shift and no pending final Meter Reading
**And** later RDO work can replace the port without changing transfer semantics.

**Given** the Machine is eligible for transfer
**When** the administrator confirms the command with the required reason
**Then** the current Machine Ownership Period closes and a destination ownership period opens at one server transaction instant
**And** trusted actor and reason are recorded atomically.

**Given** the transfer flow is open
**When** the administrator chooses to keep the current Machine registration
**Then** name, description, type, manufacturer, and model carry into current state without rewriting prior ownership history
**And** no artificial duplicate Machine is created.

**Given** the administrator chooses to update permitted Machine details during transfer
**When** valid values are supplied
**Then** current registration reflects the accepted values
**And** prior ownership periods, Project allocations, and Meter Readings remain unchanged; the MVP does not create a separate version history for registration fields.

**Given** destination identifiers are supplied or retained
**When** transfer validation runs
**Then** at least plate or Company tag remains present
**And** each active identifier is unique within the destination Company.

**Given** a destination identifier conflicts with another active Machine
**When** transfer is attempted
**Then** the complete transaction rolls back
**And** the source Company remains the current owner.

**Given** an optional transfer Meter Reading is submitted
**When** it is valid
**Then** it creates a new confirmed reading in the monotonic chain
**And** a lower value than the current latest reading rejects the transfer.

**Given** no transfer Meter Reading is supplied
**When** no operational condition requires a new confirmed reading
**Then** transfer may proceed using the existing latest reading
**And** no synthetic reading is created.

**Given** transfer succeeds
**When** current registries and selectors are queried
**Then** the Machine disappears from the source Company's current registry and becomes available in the destination Company's current registry
**And** prior source ownership and Project records remain inspectable through history.

**Given** the former owning Company requests Machine history after transfer
**When** authorized history is queried from that workspace
**Then** it may inspect only ownership periods, allocations, readings, and participation belonging to its historical scope
**And** it cannot inspect private current registration or operations belonging only to the destination Company.

**Given** a stale source Company request races with transfer
**When** it attempts to mutate the Machine after ownership changes
**Then** scoped ownership checks reject the stale operation
**And** the destination's current state is not overwritten.

**Given** ownership transfer is rendered in the dashboard
**When** the command succeeds or conflicts
**Then** the interface confirms the destination and irreversible effect, preserves valid form input on recoverable conflict, and clears stale source workspace state
**And** it does not expose destination data outside the authenticated Corporation.

**Given** transfer behavior is tested
**When** PostgreSQL integration, concurrency, and Playwright suites run
**Then** they cover allocation blockers, the future operational-status port, same-Corporation enforcement, optional detail changes, identifier conflicts, optional meter entry, monotonic rejection, rollback, stale requests, registry movement, and historical preservation
**And** exactly one current ownership period remains after success.

### Story 5.9: Retire a Machine Permanently

**Requirements:** FR21; NFR2, NFR5, NFR8, NFR9, NFR11, NFR13, NFR18; AR7, AR10, AR11, AR52, AR53, AR60

As a Master Administrator,
I want to retire a Machine permanently when it leaves service,
So that it cannot return to operational use while every prior record remains valid.

**Acceptance Criteria:**

**Given** a Machine is currently owned by the selected Company
**When** it has no open Project allocation
**Then** allocation state does not block retirement
**And** eligibility is revalidated inside the retirement transaction.

**Given** any open allocation exists
**When** retirement is attempted
**Then** the command is rejected with a stable scoped conflict
**And** no Machine, ownership, identifier, or historical state changes.

**Given** the future operational-status port reports an open shift or pending final Meter Reading
**When** retirement is attempted
**Then** the command is rejected with a stable blocker response
**And** the MVP does not implement shift closure through this story.

**Given** no RDO or shift module is installed in the MVP
**When** the operational-status port is queried
**Then** its default implementation reports no open shift and no pending final Meter Reading
**And** later RDO work can replace the port without changing retirement semantics.

**Given** the Machine is eligible
**When** the administrator confirms retirement with a non-blank reason
**Then** retirement takes effect immediately at the server transaction instant
**And** trusted `actorUserId`, reason, and terminal state are recorded.

**Given** retirement succeeds
**When** current registries, allocation selectors, or transfer selectors are queried
**Then** the Machine is excluded permanently
**And** no restore, reactivation, new allocation, transfer, or ordinary Meter Reading command is permitted.

**Given** a retired Machine has prior ownership, Project allocation, Meter Reading, maintenance, fueling, or future RDO references
**When** historical detail is requested
**Then** every reference remains valid and inspectable
**And** retirement does not rewrite or delete prior records.

**Given** a retired Machine's plate or Company tag becomes eligible for reuse under the active-identifier rules
**When** another Machine is registered
**Then** reuse may be permitted in the relevant Company scope
**And** historical records continue referencing the retired Machine identity.

**Given** retirement has already occurred
**When** retirement is requested again
**Then** the command returns a stable terminal-state conflict
**And** the original retirement actor, instant, and reason remain immutable.

**Given** concurrent retirement, transfer, allocation, or reading commands target the same Machine
**When** they execute
**Then** one consistent lifecycle outcome commits
**And** a successfully retired Machine cannot retain or acquire an open operational relationship.

**Given** a Machine from another Company or Corporation is targeted
**When** retirement is attempted
**Then** the request fails without revealing foreign existence
**And** no lifecycle state changes.

**Given** the dashboard presents retirement
**When** the administrator initiates the action
**Then** it uses proportional irreversible confirmation and displays blockers or success with safe next actions
**And** current registry data is revalidated only after backend confirmation.

**Given** retirement is tested
**When** unit, real-PostgreSQL integration, concurrency, and Playwright suites run
**Then** they cover allocation blockers, the future operational-status port, reason validation, terminal irreversibility, selector exclusion, identifier reuse, historical preservation, concurrent commands, and tenant isolation
**And** no test restores a retired Machine.

### Story 5.10: Activate a Planned Project Explicitly

**Requirements:** FR28; NFR5, NFR8, NFR9, NFR11, NFR13, NFR15, NFR18; AR7, AR10, AR11, AR43, AR53

As a Master Administrator,
I want to activate a valid `PLANNED` Project when real production begins,
So that the system records the actual start independently of contractual dates.

**Acceptance Criteria:**

**Given** a `PLANNED` Project in the selected Company
**When** the administrator requests activation
**Then** the backend revalidates the current active Client, exactly one Manager, at least one Technical Responsibility, and valid Weekly Schedule
**And** optional operational Employee, Machine, and Fuel Agreement collections may remain empty.

**Given** all activation invariants are valid
**When** activation commits
**Then** the Project status becomes `ACTIVE`
**And** actual production start is recorded using the server transaction instant interpreted in `America/Sao_Paulo` business time.

**Given** the planned start date is in the future or past
**When** activation occurs
**Then** the Project activates immediately
**And** no automatic alignment, backdating, or rejection is inferred from the planned date.

**Given** the Project has valid open Employee or Machine allocations created while `PLANNED`
**When** activation occurs
**Then** those allocations remain open without being recreated
**And** their original effective start remains preserved.

**Given** the Client, Manager, Technical Responsibility, or Weekly Schedule becomes invalid before activation
**When** activation is attempted
**Then** the command is rejected with structured scoped details
**And** the Project remains `PLANNED`.

**Given** the Project is already `ACTIVE`, `PAUSED`, `COMPLETED`, or `CANCELLED`
**When** activation is requested
**Then** the API returns a stable lifecycle conflict
**And** no second actual production start is recorded.

**Given** two activation commands execute concurrently
**When** they target the same `PLANNED` Project
**Then** at most one transition commits
**And** the other receives the committed current-state result or a safe conflict.

**Given** activation succeeds
**When** the dashboard refreshes
**Then** status and actual start are visible in Project detail and registry
**And** no production, progress, cost, or RDO metric is invented.

**Given** activation is tested
**When** real-PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover required invariants, zero operational resources, planned-date independence, retained reservations, stale-accountability rejection, duplicate activation, timestamp behavior, and tenant isolation.
**And** actual production start is recorded only once.

### Story 5.11: Pause and Reactivate a Project

**Requirements:** FR29; NFR5, NFR8, NFR9, NFR11, NFR13, NFR18; AR7, AR10, AR11, AR43, AR53

As a Master Administrator,
I want to pause and later reactivate an active Project,
So that temporary operational interruption does not silently release or restore resources.

**Acceptance Criteria:**

**Given** an `ACTIVE` Project in the selected Company
**When** the administrator pauses it
**Then** the Project status becomes `PAUSED` at the server transaction instant
**And** current Employee and Machine allocations remain open by default.

**Given** a Project is `PAUSED`
**When** a resource is explicitly released or reallocated through its owning command
**Then** that resource's allocation changes normally
**And** pause does not prevent an intentional movement.

**Given** a `PAUSED` Project still satisfies current Client, Manager, Technical Responsibility, and Weekly Schedule invariants
**When** the administrator reactivates it
**Then** the Project returns to `ACTIVE`
**And** only allocations still open on that Project remain assigned.

**Given** a resource was released or moved during pause
**When** the Project is reactivated
**Then** the resource is not automatically restored
**And** a new explicit allocation is required to return it.

**Given** required accountability or schedule invariants become invalid during pause
**When** reactivation is attempted
**Then** the command is rejected with structured corrective details
**And** the Project remains `PAUSED`.

**Given** a `PLANNED`, `COMPLETED`, or `CANCELLED` Project
**When** pause is attempted
**Then** a stable lifecycle conflict is returned
**And** status remains unchanged.

**Given** an `ACTIVE`, `PLANNED`, `COMPLETED`, or `CANCELLED` Project
**When** reactivation is attempted without being `PAUSED`
**Then** a stable lifecycle conflict is returned
**And** no lifecycle history entry is added.

**Given** concurrent pause, reactivation, or terminal-transition commands target the same Project
**When** they execute
**Then** one valid state transition commits
**And** the Project cannot enter contradictory states.

**Given** pause or reactivation succeeds
**When** the dashboard refreshes
**Then** current status and retained resources are clear
**And** released resources are not presented as automatically recoverable.

**Given** pause and reactivation are tested
**When** transaction, concurrency, frontend, and Playwright suites run
**Then** they cover retained allocations, explicit release during pause, non-restoration, invariant rejection, invalid source states, concurrent transitions, and scoped access.
**And** reactivation never recreates an allocation implicitly.

### Story 5.12: Complete or Cancel a Project Safely

**Requirements:** FR30; NFR5, NFR8, NFR9, NFR11, NFR13, NFR18; AR7, AR10, AR11, AR43, AR52, AR53, AR60

As a Master Administrator,
I want to complete or cancel an eligible Project permanently,
So that terminal work is closed without leaving active operational relationships.

**Acceptance Criteria:**

**Given** a `PLANNED` Project
**When** cancellation is requested
**Then** the backend may evaluate it for transition to `CANCELLED`
**And** a direct transition from `PLANNED` to `COMPLETED` is rejected.

**Given** an `ACTIVE` or `PAUSED` Project
**When** completion or cancellation is requested
**Then** the backend revalidates terminal-state eligibility inside the transaction
**And** either `COMPLETED` or `CANCELLED` may be selected when all corresponding blockers are clear.

**Given** the Project has an open shift
**When** terminal transition is attempted
**Then** the command is rejected with a stable blocker code
**And** the Project status remains unchanged.

**Given** the Project has a pending final Machine Meter Reading or unresolved operational work
**When** terminal transition is attempted
**Then** the command is rejected
**And** no allocation or lifecycle state is silently closed.

**Given** shifts and unresolved operational work are outside the MVP RDO module
**When** terminal eligibility is evaluated
**Then** the Projects domain queries an explicit operational-status port
**And** the default MVP implementation reports no future-RDO blocker while remaining replaceable without changing lifecycle semantics.

**Given** the Project has any open Employee or Machine Allocation
**When** terminal transition is attempted
**Then** the command is rejected
**And** the administrator must explicitly release or reallocate each resource first.

**Given** no blocker remains and the requested transition is valid
**When** the administrator confirms completion
**Then** status becomes `COMPLETED` at the server transaction instant
**And** trusted actor and required reason are recorded.

**Given** no blocker remains and the requested transition is valid
**When** the administrator confirms cancellation
**Then** status becomes `CANCELLED` at the server transaction instant
**And** trusted actor and required reason are recorded.

**Given** a Project is `COMPLETED` or `CANCELLED`
**When** activation, pause, reactivation, allocation, responsibility mutation that violates terminal rules, or another terminal transition is attempted
**Then** the operation is rejected with a stable terminal-state conflict
**And** the terminal status remains irreversible.

**Given** terminal transition succeeds
**When** current selectors and registries are queried
**Then** the Project remains available for authorized detail and history but is excluded from selectors requiring an operationally eligible Project
**And** prior Clients, responsibilities, baselines, schedules, allocations, and fuel terms remain intact.

**Given** two terminal or lifecycle commands race
**When** they execute
**Then** one consistent state commits
**And** no Project can be both completed and cancelled or return to a non-terminal state.

**Given** the dashboard presents terminal actions
**When** the administrator initiates completion or cancellation
**Then** it uses proportional irreversible confirmation, displays blockers with safe next actions, and revalidates only after backend confirmation
**And** it preserves understandable terminal-state presentation.

**Given** completion and cancellation are tested
**When** real-PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover every blocker, each terminal outcome, source-state rules, irreversibility, selector behavior, historical preservation, races, reasons, and tenant isolation.
**And** no terminal Project returns to an operational state.

## Epic 6: Evolve Operations Without Rewriting History

The Master Administrator can revise consequential Project baselines, Clients, Managers, Technical Responsibilities, Weekly Schedules, Break Templates, and Project Fuel Agreements through effective history and can inspect preserved Project, Employee, and Machine records.

### Story 6.1: Revise the Project Budget and Planned Dates

**Requirements:** FR31; NFR5, NFR8, NFR9, NFR11, NFR13, NFR15, NFR16; AR7, AR8, AR9, AR10, AR11, AR43, AR52, AR53, AR59

As a Master Administrator,
I want to revise the Project's approved budget or planned dates without overwriting prior values,
So that current planning remains accurate while earlier baselines stay historically true.

**Acceptance Criteria:**

**Given** a `PLANNED` Project in the selected Company
**When** the administrator corrects the approved budget or planned dates before activation
**Then** the current initial Project Baseline is updated without creating a post-activation revision
**And** the correction does not alter activation history or actual production start.

**Given** an `ACTIVE` or `PAUSED` Project
**When** the administrator submits a new approved budget, planned start date, or planned end date
**Then** a non-blank reason is required
**And** a new effective Project Baseline revision is created at the server transaction instant.

**Given** a new Project Baseline revision is created
**When** it becomes current
**Then** the previously current baseline remains immutable and historically available
**And** the new revision stores trusted `actorUserId`, instant, reason, and changed values.

**Given** only one baseline field changes
**When** the revision is created
**Then** the complete effective baseline remains queryable for the new period
**And** unchanged values are carried forward without losing their prior history.

**Given** the revised planned end date precedes the revised planned start date
**When** validation runs
**Then** the command is rejected with a stable field error
**And** no baseline revision is created.

**Given** the revised budget is submitted
**When** it crosses the API boundary
**Then** it uses a normalized decimal string and BRL two-decimal persistence
**And** no cost, progress, earned-value, or forecast calculation is triggered.

**Given** the revised budget is exactly `"0.00"`
**When** validation runs
**Then** it is accepted as non-negative
**And** a negative value or scale beyond two decimal places is rejected without silent rounding.

**Given** planned dates are revised
**When** they are persisted and displayed
**Then** they remain civil dates interpreted independently of server-local time
**And** activation history and actual production start remain unchanged.

**Given** a `COMPLETED` or `CANCELLED` Project
**When** a baseline revision is attempted
**Then** the command is rejected with a terminal-state conflict
**And** all existing baselines remain unchanged.

**Given** two baseline revisions execute concurrently
**When** they target the same current Project baseline
**Then** one valid revision becomes current
**And** the other receives a safe stale-state conflict without overwriting history.

**Given** revision succeeds
**When** Project current detail and history are queried
**Then** current detail uses the latest baseline
**And** history presents original and intervening revisions in deterministic order.

**Given** baseline revision is tested
**When** unit, real-PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover `PLANNED` correction, post-activation revision, reason requirement, partial-field change, date validation, decimal precision, terminal rejection, races, current view, and history.
**And** exactly one Project Baseline remains current.

### Story 6.2: Correct or Replace the Current Project Client

**Requirements:** FR32; NFR2, NFR5, NFR8, NFR9, NFR11, NFR12, NFR13, NFR18; AR7, AR10, AR11, AR30, AR43, AR52, AR53

As a Master Administrator,
I want to correct or replace the Client associated with a Project,
So that the current contracting party is accurate without erasing earlier relationships.

**Acceptance Criteria:**

**Given** a `PLANNED` Project in the selected Company
**When** the administrator selects another active same-Company Client
**Then** the current setup association is replaced without creating an additional historical Client period
**And** the Project retains exactly one current Client.

**Given** an `ACTIVE` or `PAUSED` Project
**When** the administrator replaces the current Client
**Then** a non-blank reason is required
**And** the current Project Client period closes while a new one opens at the same server transaction instant.

**Given** replacement commits
**When** Project current detail is queried
**Then** it returns the newly current Client
**And** prior Client periods remain immutable and historically visible.

**Given** the selected Client is inactive, removed, belongs to another Company or Corporation, or does not exist
**When** correction or replacement is attempted
**Then** the command fails without revealing foreign existence
**And** the current Client relationship remains unchanged.

**Given** the selected Client is already current
**When** replacement is submitted without a meaningful change
**Then** the API rejects the no-op with a stable semantic response
**And** no duplicate period is created.

**Given** a `COMPLETED` or `CANCELLED` Project
**When** Client correction or replacement is attempted
**Then** the operation is rejected under terminal-state rules
**And** Client history remains unchanged.

**Given** concurrent Client replacement commands target the same Project
**When** they execute
**Then** at most one new current Client period commits from the prior version
**And** the other command receives a safe stale-state conflict.

**Given** the Client selector is used
**When** it searches or paginates
**Then** only active selected-Company Clients are returned through canonical cursor pagination
**And** documents remain masked.

**Given** a replacement conflict reaches the dashboard
**When** the selected Client became unavailable
**Then** the valid reason and unrelated form state are preserved
**And** the interface maps the stable code to a safe reselection action.

**Given** Client correction and replacement are tested
**When** PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover planned correction, post-activation period replacement, reason, no-op rejection, eligibility, terminal state, concurrent change, current detail, history, masking, and tenant isolation.
**And** exactly one Project Client period remains current.

### Story 6.3: Replace the Current Project Manager

**Requirements:** FR33; NFR2, NFR5, NFR8, NFR9, NFR11, NFR13, NFR18; AR7, AR10, AR11, AR43, AR52, AR53

As a Master Administrator,
I want to replace the current Project Manager with dated history,
So that management can change while exactly one current Manager remains.

**Acceptance Criteria:**

**Given** a non-terminal Project in the selected Company
**When** the administrator selects a different active same-Company Employee as Manager
**Then** the current Manager tenure closes and a new tenure opens at one server transaction instant
**And** exactly one current Manager remains.

**Given** a Manager change occurs after activation
**When** the command is submitted
**Then** a non-blank reason is required
**And** trusted actor, instant, and reason are recorded.

**Given** the selected Manager already manages other Projects
**When** the change is validated
**Then** selection remains permitted
**And** Manager tenure does not consume operational allocation exclusivity.

**Given** the selected Employee is terminated, inactive, belongs to another Company or Corporation, or does not exist
**When** Manager replacement is attempted
**Then** it fails without revealing foreign existence
**And** the current Manager remains unchanged.

**Given** an Employee is operationally allocated to another Project
**When** the Employee is selected as Manager
**Then** the Manager tenure may still be created
**And** the Employee's operational allocation is unchanged.

**Given** a `COMPLETED` or `CANCELLED` Project
**When** Manager replacement is attempted
**Then** the operation is rejected unconditionally in the MVP
**And** MVP history remains immutable.

**Given** concurrent Manager replacements or Employment termination commands target the same current Manager
**When** they execute
**Then** database constraints and transaction validation preserve exactly one current Manager
**And** losing commands receive safe conflicts.

**Given** Manager replacement succeeds
**When** Project current detail and history are queried
**Then** current detail shows the open Manager
**And** history shows every prior Manager tenure in deterministic order.

**Given** Manager replacement is tested
**When** real-PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover replacement, multiple-Project eligibility, operational-allocation independence, invalid Employees, termination races, terminal state, current cardinality, and history
**And** every non-terminal Project retains exactly one current Manager.

### Story 6.4: Maintain Technical Responsibilities

**Requirements:** FR33; NFR2, NFR5, NFR8, NFR9, NFR11, NFR13, NFR18; AR7, AR10, AR11, AR43, AR52, AR53

As a Master Administrator,
I want to add or end Technical Responsibilities with dated history,
So that accountability can evolve while every non-terminal Project retains at least one responsible Employee.

**Acceptance Criteria:**

**Given** an active same-Company Employee is added as a Technical Responsibility
**When** the command commits
**Then** a new open Technical Responsibility period is created
**And** the Employee may retain responsibilities on other Projects.

**Given** an Employee is operationally allocated to another Project
**When** the Employee is selected as a Technical Responsibility
**Then** the responsibility may still be created
**And** the operational allocation remains unchanged.

**Given** an existing current Technical Responsibility is ended
**When** at least one other current responsibility remains
**Then** the selected period closes at the server transaction instant
**And** prior responsibility history remains immutable.

**Given** ending a Technical Responsibility would leave a non-terminal Project with none
**When** the command is attempted
**Then** it is rejected with a stable invariant conflict
**And** no responsibility period closes.

**Given** the selected Employee is terminated, inactive, belongs to another Company or Corporation, or does not exist
**When** a responsibility command is attempted
**Then** it fails without revealing foreign existence
**And** current responsibilities remain unchanged.

**Given** a responsibility change occurs after activation
**When** the command is submitted
**Then** a non-blank reason and trusted actor are recorded
**And** the server transaction instant defines the period boundary.

**Given** a `COMPLETED` or `CANCELLED` Project
**When** a current responsibility mutation is attempted
**Then** the operation is rejected under terminal-state rules
**And** existing responsibility history remains immutable.

**Given** concurrent responsibility changes or Employment termination target the same Project
**When** they execute
**Then** transaction validation preserves at least one current Technical Responsibility
**And** losing commands receive safe conflicts.

**Given** responsibility changes succeed
**When** current detail and history are queried
**Then** current detail shows only open responsibilities
**And** history shows every prior period in deterministic order.

**Given** Technical Responsibility maintenance is tested
**When** real-PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover add, end, last-responsibility blocking, multiple-Project eligibility, allocation independence, termination races, terminal state, and history
**And** every non-terminal Project retains at least one current Technical Responsibility.

### Story 6.5: Revise the Weekly Schedule and Break Templates

**Requirements:** FR34; NFR5, NFR8, NFR9, NFR11, NFR13, NFR15, NFR18; AR7, AR8, AR10, AR11, AR43, AR52, AR53

As a Master Administrator,
I want to revise the Project's Weekly Schedule and suggested breaks,
So that future shifts use current defaults while prior operational contexts keep the defaults that applied to them.

**Acceptance Criteria:**

**Given** a `PLANNED` Project
**When** the administrator edits the Weekly Schedule or Break Templates
**Then** the current initial schedule revision is updated without creating an additional effective period
**And** no production or shift history is implied.

**Given** an `ACTIVE` or `PAUSED` Project
**When** a valid schedule change is submitted
**Then** a new effective Weekly Schedule revision is created at the server transaction instant
**And** the prior revision closes and remains immutable.

**Given** a post-activation schedule revision
**When** the command is submitted
**Then** a non-blank reason and trusted actor are recorded with the server transaction instant
**And** the revision applies only to future shifts.

**Given** the revised schedule is validated
**When** working days are configured
**Then** at least one day has exactly one valid same-day start and end window
**And** one through seven working days are permitted without inferring a rest day.

**Given** an end time is equal to or earlier than its start time
**When** validation runs
**Then** the revision is rejected
**And** no schedule or Break Template revision is partially persisted.

**Given** zero or more Break Templates are submitted
**When** validation runs
**Then** each present template requires a non-blank name and positive integer-minute duration
**And** templates remain suggestions that do not divide the default window.

**Given** a prior or future RDO or operational context references an earlier schedule revision
**When** a new revision is created
**Then** the reference remains attached to its original effective defaults
**And** the earlier revision is not rewritten.

**Given** a `COMPLETED` or `CANCELLED` Project
**When** schedule revision is attempted
**Then** the operation is rejected with a terminal-state conflict
**And** existing revisions remain unchanged.

**Given** concurrent schedule revisions target the same current revision
**When** they execute
**Then** one new revision becomes current
**And** the other command receives a safe stale-state conflict.

**Given** revision succeeds
**When** current Project configuration and history are displayed
**Then** current configuration uses the latest revision
**And** history exposes prior schedules and Break Templates without offering closed revisions as current editable state.

**Given** schedule revision is tested
**When** PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover planned correction, active and paused revision, valid day counts, invalid windows, optional breaks, effective future application, prior-context preservation, terminal rejection, races, and history.
**And** exactly one Weekly Schedule revision remains current.

### Story 6.6: Maintain Project Fuel Agreements and Effective Prices

**Requirements:** FR16; NFR2, NFR5, NFR8, NFR9, NFR11, NFR12, NFR13, NFR16, NFR18; AR7, AR8, AR9, AR10, AR11, AR12, AR25, AR30, AR32, AR33, AR42, AR43, AR52, AR53, AR59

As a Master Administrator,
I want to maintain Project Fuel Agreements and effective Fuel prices after Project creation,
So that current supply terms can change without overwriting the prices and agreements that applied before.

**Acceptance Criteria:**

**Given** a `PLANNED`, `ACTIVE`, or `PAUSED` Project in the selected Company
**When** the administrator adds a Fuel Agreement
**Then** one active same-Company Fuel Supplier and at least one fixed Fuel Type are required
**And** every selected Fuel Type receives one positive initial BRL-per-liter price with exactly supported four-decimal precision.

**Given** the Fuel Supplier is inactive, removed, belongs to another Company or Corporation, or does not exist
**When** an agreement command is attempted
**Then** the command fails without revealing foreign existence
**And** no agreement or effective price is partially persisted.

**Given** the Project already has a current Fuel Agreement for the selected Fuel Supplier
**When** another agreement is added for the same Supplier
**Then** the command is rejected with a stable conflict directing the administrator to maintain the existing agreement
**And** at most one current agreement exists for each Project and Fuel Supplier pair.

**Given** Diesel S10 or Diesel S500 is added to a current Fuel Agreement
**When** the Fuel Type is not already current for that agreement
**Then** a current Fuel Type relationship and its initial effective price open at the same server transaction instant
**And** existing Fuel Types and price histories remain unchanged.

**Given** the same Supplier and Fuel Type are submitted more than once in one command
**When** validation runs
**Then** the command is rejected with a stable field-level validation code
**And** duplicate entries are not silently normalized.

**Given** a current Fuel Type price exists on a non-terminal Project
**When** the administrator submits a different positive price with a non-blank reason
**Then** the current effective price period closes and a new period opens at one server transaction instant
**And** trusted actor, reason, old price, and new price remain historically queryable.

**Given** a submitted Fuel price is zero, negative, or has scale beyond four decimal places
**When** validation runs
**Then** the command is rejected without silent rounding
**And** the current effective price remains unchanged.

**Given** a submitted Fuel price equals the current price
**When** an update is attempted
**Then** the API rejects the no-op with a stable semantic response
**And** no duplicate effective price period is created.

**Given** a current Fuel Agreement must no longer be operational
**When** the administrator ends it with a non-blank reason
**Then** the agreement and every current Fuel Type and price period close atomically at the server transaction instant
**And** all prior agreement and price history remains immutable and inspectable.

**Given** a Fuel Agreement has ended
**When** the Supplier is evaluated for operational removal
**Then** that closed agreement no longer blocks removal
**And** its historical Project relationship remains valid.

**Given** a `COMPLETED` or `CANCELLED` Project
**When** an agreement, Fuel Type, or effective price mutation is attempted
**Then** the command is rejected with a stable terminal-state conflict
**And** existing Fuel history remains unchanged.

**Given** concurrent commands update the same current price or end the same agreement
**When** they execute
**Then** one valid lifecycle result commits
**And** losing commands receive a safe stale-state conflict without overlapping effective periods.

**Given** Fuel Suppliers are searched or paginated for an agreement
**When** the selector loads
**Then** only active selected-Company Fuel Suppliers are returned through canonical cursor pagination
**And** CPF/CNPJ remains masked.

**Given** a recoverable agreement or price conflict reaches the dashboard
**When** it is rendered
**Then** valid form input and unrelated Project state are preserved
**And** the interface maps stable codes to reselection, correction, or refresh actions without parsing message text.

**Given** Fuel Agreement maintenance is tested
**When** contract, real-PostgreSQL integration, concurrency, frontend, and Playwright suites run
**Then** they cover agreement creation after the wizard, fixed Fuel Types, effective price updates, no-op rejection, precision, ending agreements, terminal Projects, races, pagination, masking, and tenant isolation
**And** every successful price change preserves one non-overlapping effective history.

### Story 6.7: Inspect Project History

**Requirements:** FR35; NFR2, NFR5, NFR6, NFR11, NFR12, NFR13, NFR14, NFR18; AR25, AR30, AR32, AR33, AR42, AR43, AR52

As a Master Administrator,
I want to inspect preserved history from a Project detail view,
So that I can understand prior commercial, accountability, schedule, and allocation context.

**Acceptance Criteria:**

**Given** an authorized Project detail in the selected Company
**When** the administrator opens its history
**Then** the dashboard displays prior Clients, Manager tenures, Technical Responsibilities, Project Baselines, Weekly Schedules, Employee Allocations, Machine Allocations, and Project Fuel Agreement price history
**And** each collection is ordered deterministically by effective period or revision.

**Given** a Project history collection may grow without a fixed bound
**When** it is requested
**Then** it uses canonical cursor pagination bound to normalized query, ordering, Corporation, selected Company, and authorized history scope
**And** cursor tampering fails without disclosing foreign records.

**Given** a Project historical relationship is closed, removed, or inactive
**When** it is displayed
**Then** it is clearly identified as historical
**And** no operational selector or mutation action treats it as current.

**Given** a historical revision includes actor and reason
**When** authorized details are rendered
**Then** safe actor identity, effective instant, and reason are displayed where required
**And** credentials, token material, encryption details, and internal database metadata are excluded.

**Given** current Project detail and Project history are implemented
**When** frontend code requests them
**Then** separate server queries, handlers, response models, adapters, and view models are used
**And** historical DTOs are not reused as operational selector models.

**Given** Project history is loading, empty, paginating, unauthorized, unavailable, or failed
**When** the dashboard renders
**Then** it remains understandable and preserves stable layout
**And** no consolidated report or export is introduced.

**Given** Project history is tested
**When** contract, real-PostgreSQL integration, frontend, and Playwright suites run
**Then** they cover every required Project timeline, deterministic ordering, pagination, actor and reason visibility, cursor tampering, and tenant isolation
**And** no historical Project relationship becomes operationally selectable.

### Story 6.8: Inspect Employee History

**Requirements:** FR35; NFR2, NFR5, NFR6, NFR11, NFR12, NFR13, NFR14, NFR18; AR25, AR30, AR32, AR33, AR42, AR43, AR52

As a Master Administrator,
I want to inspect preserved Employment and Employee Allocation history,
So that I can understand where and under which terms a Person worked without restoring prior eligibility.

**Acceptance Criteria:**

**Given** an authorized Employee detail
**When** the administrator opens its history
**Then** the dashboard displays Employment Periods and prior Employee Allocations with effective role, workload, compensation terms, Project, actor, reason where required, and dates
**And** Corporation and Company visibility follows the authorized workspace.

**Given** Employee history contains closed or terminated periods
**When** they are displayed
**Then** they are clearly historical and immutable
**And** they never become current Employment or allocation selector entries.

**Given** Employee history includes CPF context
**When** it is rendered
**Then** the document remains masked by default
**And** full disclosure requires the explicit authorized detail boundary.

**Given** an Employee history collection may grow without a fixed bound
**When** another page is requested
**Then** canonical cursor pagination binds query, ordering, Corporation, selected Company, and authorized Person scope
**And** malformed or foreign cursors return safe validation failures.

**Given** current Employee detail and Employee history are implemented
**When** frontend code requests them
**Then** separate server queries, handlers, response models, adapters, and view models are used
**And** closed Employment or allocation DTOs are not reused by operational selectors.

**Given** Employee history belongs only to another Company or Corporation
**When** an identifier or cursor is manipulated
**Then** access fails without disclosing foreign existence
**And** no partial timeline is returned.

**Given** Employee history is tested
**When** contract, real-PostgreSQL integration, frontend, and Playwright suites run
**Then** they cover Employment Periods, allocation terms, pagination, masking, actors and reasons, current-versus-history separation, cursor tampering, and tenant isolation
**And** no historical Employee record becomes operationally selectable.

### Story 6.9: Inspect Machine History

**Requirements:** FR35; NFR2, NFR5, NFR11, NFR12, NFR13, NFR14, NFR18; AR25, AR30, AR32, AR33, AR42, AR43, AR52

As a Master Administrator,
I want to inspect preserved Machine ownership, allocation, Meter Reading, correction, and retirement history,
So that I can trace the asset without treating former ownership or participation as current.

**Acceptance Criteria:**

**Given** an authorized Machine detail
**When** the administrator opens its history
**Then** the dashboard displays Machine Ownership Periods, prior Project Allocations, confirmed Meter Readings, permitted reading corrections, and retirement state
**And** every collection is ordered deterministically.

**Given** a Machine was transferred, released, retired, or corrected
**When** the history is displayed
**Then** prior Companies, Projects, values, actors, reasons, and effective instants remain visible where authorized
**And** historical Companies or Projects do not become current association options.

**Given** a former owning Company requests history after a Machine transfer
**When** its authorized workspace loads the Machine timeline
**Then** it can inspect only ownership, allocation, reading, and participation records belonging to its historical scope
**And** the destination Company's private current registration and operations are not disclosed.

**Given** a Machine history collection may grow without a fixed bound
**When** another page is requested
**Then** canonical cursor pagination binds query, ordering, Corporation, selected Company, and authorized Machine scope
**And** malformed or foreign cursors return safe validation failures.

**Given** current Machine detail and Machine history are implemented
**When** frontend code requests them
**Then** separate server queries, handlers, response models, adapters, and view models are used
**And** historical ownership or allocation DTOs are not reused by operational selectors.

**Given** Machine history belongs to another Company or Corporation
**When** an identifier or cursor is manipulated
**Then** access fails without disclosing foreign existence
**And** no partial timeline is returned.

**Given** Machine history is loading, empty, paginating, unauthorized, unavailable, or failed
**When** the dashboard renders
**Then** it remains understandable and preserves stable layout
**And** no consolidated report or export is introduced.

**Given** Machine history is tested
**When** contract, real-PostgreSQL integration, frontend, and Playwright suites run
**Then** they cover ownership, allocations, readings, corrections, retirement, pagination, actor and reason visibility, cursor tampering, and tenant isolation
**And** no historical Machine record becomes operationally selectable.
