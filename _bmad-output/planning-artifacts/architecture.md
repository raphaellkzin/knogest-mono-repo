---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md
  - _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/addendum.md
  - _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/.decision-log.md
  - _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/reconcile-app.md
  - _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/reconcile-brainstorming.md
  - _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/reconcile-wizard.md
  - _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/reconcile-pagination.md
  - _bmad-output/brainstorming/brainstorming-session-2026-06-18-010627.md
  - _bmad-output/implementation-artifacts/spec-work-creation-wizard.md
  - _bmad-output/implementation-artifacts/spec-document-canonical-cursor-pagination.md
  - main-api/docs/PAGINATION.md
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-06-19'
project_name: 'knogest'
user_name: 'Bigalien'
date: '2026-06-19'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
The MVP contains 35 functional requirements across eight capability groups:

- Corporation authentication, revocable sessions, and selected Company context
- Company-scoped registries and cursor-paginated lists
- Corporation-level Person identity and Company employment lifecycle
- Separate Client and Fuel Supplier registries
- Machine ownership, allocation, retirement, and monotonic metering
- Atomic and idempotent Project creation wizard
- Project mobilization and guarded lifecycle transitions
- Effective-dated Project, Employee, and Machine history

The dashboard and backend are both MVP deliverables. The existing frontend provides the visual system, interaction shell, and reusable components, but its mock data, cards, fields, metrics, and local behaviors are not product requirements or API contracts. Only validated product artifacts determine functional scope.

**Non-Functional Requirements:**
The 18 NFRs make tenant isolation, sensitive-data protection, transactional consistency, concurrency safety, idempotency, historical integrity, stable API errors, cursor pagination, numeric precision, and timezone correctness architectural drivers.

CPF/CNPJ handling requires encryption, equality-safe hashing, masking, restricted disclosure, and exclusion from logs, credentials, and cursors. Purpose, legal basis, access, retention, and disposal rules must be documented before real pilot data is entered.

**Scale & Complexity:**
Although the initial deployment serves one Corporation, up to three Companies, one Master Administrator, and multiple Projects, the system has high domain and data-integrity complexity. Scale is driven by relational invariants and temporal history rather than user volume.

- Primary domain: Multi-tenant full-stack operational web application
- Complexity level: High
- Estimated architectural components: 10 logical components
- Real-time collaboration: Not required
- Offline operation: Not required in the MVP
- External integrations: None required for the pilot

### Technical Constraints & Dependencies

- Existing styled Next.js dashboard and reusable Project wizard shell
- Existing backend foundation and module conventions
- PostgreSQL with the established data-access layer
- Shared-schema multi-tenancy with trusted Corporation and Company context
- Host-based Corporation resolution before authentication
- Short-lived access credentials and persisted rotating Sessions
- Administrative CLI for provisioning and password reset
- Canonical cursor-pagination contract for every unbounded collection
- Atomic, idempotent Project finalization with no persisted draft
- UTC persistence with `America/Sao_Paulo` as MVP business time
- Decimal-safe persistence for money, fuel prices, workloads, and meter readings
- Fixed Fuel Type catalog containing Diesel S10 and Diesel S500
- Existing frontend mocks must be replaced or removed during integration and cannot define backend behavior
- Wizard collection limits and request-size limits must be decided before FR-26 implementation

### Cross-Cutting Concerns Identified

- Corporation and Company isolation across every authenticated operation
- Trusted request context propagation through all application layers
- Authorization boundaries that remain compatible with future scoped roles
- Temporal periods, revisions, and immutable historical references
- Concurrency-safe allocation, ownership, responsibility, and identifier uniqueness
- Transaction boundaries spanning multiple domain modules
- Idempotency and recoverable conflict responses for browser retries
- Soft deletion without restoring records or exposing them to selectors
- Sensitive Brazilian personal and commercial identifier protection
- Stable API envelopes, validation codes, Swagger contracts, and cursor semantics
- Frontend recovery for loading, empty, validation, conflict, and terminal states
- Future RDO compatibility without implementing RDO behavior in the MVP

## Starter Template Evaluation

### Primary Technology Domain

Brownfield full-stack TypeScript web application with an independent REST API and server-mediated dashboard integration.

### Existing Technical Foundation

**Dashboard:**

- Next.js 16.2.9 with App Router
- React 19.2.4 and TypeScript
- Tailwind CSS 4, Base UI, shadcn, and Lucide
- React Hook Form and Zod
- Server Actions and server-only API clients
- OpenAPI-generated clients through Kubb
- Existing responsive visual system and reusable operational components

**Backend:**

- Fastify 5.8.5 with TypeScript
- Prisma ORM 7.8 and PostgreSQL through `@prisma/adapter-pg`
- Zod validation and Swagger/OpenAPI
- Argon2 password hashing and Fastify JWT
- Vitest, ESLint, Prettier, and architecture checks
- Layered module convention: controller -> service -> handler -> Prisma

### Starter Options Considered

1. **Reinitialize the dashboard with `create-next-app`: Rejected.**
   The existing dashboard already uses the current App Router foundation, approved styling, reusable forms, tables, layouts, and server-only API boundaries.

2. **Reinitialize the backend from a Fastify starter: Rejected.**
   The backend already provides the required runtime, persistence adapter, validation, Swagger, testing, and enforced module layering.

3. **Preserve and reconcile the existing repositories: Selected conditionally.**
   The project is brownfield at the foundation level and greenfield at the Knogest domain level. Existing infrastructure will be evolved in place after a vertical foundation proof verifies that its security, contract, persistence, and frontend integration assumptions work together.

### Selected Starter: Existing Knogest Foundations

**Rationale for Selection:**

The repositories already establish compatible current-generation technology choices. The architectural work lies in tenant-aware domain modeling, session reconciliation, API contracts, transactional invariants, and replacing frontend mocks, not in generating new applications.

Existing foundations are useful assets but are not treated as validated architecture merely because they exist. Product requirements, domain invariants, executable contracts, and passing tests remain authoritative.

**Initialization Command:**

No project initialization command is permitted. Existing repositories remain authoritative.

Local setup continues through each repository's existing `pnpm install` and documented development commands.

**Architectural Decisions Provided by the Existing Foundation:**

**Language & Runtime:**

- TypeScript across frontend and backend
- One exact Node.js 22 release pinned consistently in development, CI, and deployment
- ESM-compatible Prisma 7 configuration
- pnpm as package manager

**Styling Solution:**

- Preserve the existing dashboard styling and component system
- Treat current visual organization as the UI reference
- Treat mock fields, cards, metrics, local records, and inferred actions as non-authoritative hypotheses
- Retain a screen element only when it traces to a validated capability, journey, or acceptance criterion

**Build Tooling:**

- Next.js build pipeline for the dashboard
- TypeScript compilation for the Fastify API
- Prisma migrations and generated client
- OpenAPI-to-Kubb generation for frontend API clients

**Testing Framework:**

- Preserve Vitest for backend unit and integration tests
- Use real PostgreSQL integration tests for transactions, constraints, concurrency, and tenant isolation
- Add frontend tests for loading, empty, error, unauthorized, conflict, and pagination states
- Add full-stack E2E coverage for authentication, Company selection, cursor pagination, and idempotent Project creation
- Verify OpenAPI generation is reproducible and produces no unexpected diff

**Code Organization:**

- Preserve Next.js App Router, Server Actions, and server-only API access
- Preserve backend controller -> service -> handler -> Prisma layering
- Extend backend modules around Organization, Auth, Workforce, Commercial, Fleet, and Projects
- Keep the backend OpenAPI document as the executable dashboard contract
- Add a frontend application adapter or view-model layer between generated clients and presentation components
- Do not permit frontend models, screens, or mock records to define backend contracts

**Development Experience:**

- Preserve lint, typecheck, format, build, migration, seed, and generation scripts
- Align Kubb package versions before relying on generated clients
- Reject manually maintained duplicate API models
- Pin toolchain versions through repository and CI configuration

### Conditional Adoption Gates

The existing foundation is accepted only after one vertical proof demonstrates:

1. Reproducible installation, lint, typecheck, test, and build for both repositories.
2. PostgreSQL persistence for Corporation, Domain, Company, User, membership or access, and persisted Session.
3. Backend-owned login, rotating refresh, revocation, and refresh-reuse detection.
4. Corporation resolution from the trusted host and selected Company validation, including negative cross-scope tests.
5. One canonical cursor-paginated endpoint documented through OpenAPI.
6. A generated Kubb client consumed through the frontend application boundary without duplicate types.
7. One real dashboard screen backed by persisted data with loading, empty, error, unauthorized, and recovery behavior.
8. Integration and E2E tests proving the complete slice.

Mocks may remain only as test fixtures after a capability is integrated.

### Foundation Reconciliation Required

- Replace the placeholder `User` schema with the Knogest tenant model
- Make the backend the sole authority for Sessions and credential rotation
- Reconcile or replace the current frontend NextAuth session behavior so it does not become a second session authority
- Align pagination helpers, response types, validation, Swagger, and request context
- Define temporal periods using explicit non-overlapping interval semantics
- Enforce temporal, uniqueness, allocation, and idempotency invariants in PostgreSQL where possible
- Establish the backend OpenAPI document as the generated-client source of truth
- Remove or replace mock dashboard behavior as each validated capability is integrated
- Define navigation, Company-context visibility, URL state, conflict recovery, and accessible asynchronous states
- Create a capability-to-journey-to-state-to-contract-to-acceptance inventory for frontend integration

### Product Value Gate

Foundation work must be delivered through vertical slices and identify the observable pilot failure it prevents. Infrastructure work without a direct relationship to a validated requirement, integrity gate, or real administrator workflow is not part of the MVP.

Administrative provisioning of Corporations, Domains, Master Administrators, and Companies remains CLI-only in the MVP.

**Note:** The first implementation story reconciles and proves the existing foundations. It must not regenerate either application or expand into completing a generalized platform.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Shared-schema tenant and Company isolation without PostgreSQL RLS in the MVP
- Database-enforced temporal, ownership, uniqueness, and concurrency invariants
- Backend-owned authentication, persisted Session rotation, and trusted Company context
- Backend OpenAPI ownership, generated dashboard clients, stable errors, and idempotent commands

**Important Decisions (Shape Architecture):**

- Server-first dashboard integration through a same-origin Next.js BFF
- View-model isolation between generated transport contracts and presentation components
- Existing frontend visuals remain authoritative for presentation, while validated product artifacts remain authoritative for behavior
- Deterministic local and test environments using the same pinned runtime and real PostgreSQL migrations

**Deferred Decisions (Post-MVP):**

- PostgreSQL Row-Level Security, while preserving schema and request-context compatibility
- Production hosting, ingress, orchestration, scaling, observability, secrets, and deployment topology
- Cloudflare Workers with OpenNext for the dashboard and Rancher/K3s for the API remain probable investigation directions, not current architectural commitments
- Future scoped roles, asynchronous processing, RDO capabilities, and operational analytics

### Data Architecture

**Database and ORM:**

- Use PostgreSQL 16 as the pilot database and Prisma ORM 7 through `@prisma/adapter-pg` as the typed application data-access foundation.
- Use one database and one shared application schema for all Corporations.
- PostgreSQL migrations are the persistence authority. Prisma schema and generated migrations may be supplemented with reviewed manual SQL whenever Prisma cannot express a required invariant.
- Do not use `prisma db push` against shared or deployment environments.

**Tenant and Ownership Isolation:**

- Every tenant-owned row carries `corporationId`.
- Every Company-owned row carries both `corporationId` and `companyId`.
- Repositories and handlers receive trusted scope explicitly and never accept it from an operational request body.
- Composite foreign keys and unique keys include ownership scope where practical, preventing relationships from crossing Corporation or Company boundaries.
- PostgreSQL Row-Level Security is deferred beyond the MVP. The schema and request context must remain compatible with adding RLS later, but no MVP correctness claim depends on it.
- MVP defense in depth consists of trusted context, mandatory scoped queries, composite relationships, constraints, and negative cross-scope integration tests.

**Temporal Modeling:**

- Business periods use half-open interval semantics: `[effectiveFrom, effectiveTo)`.
- `effectiveTo = null` represents the single open current period.
- Closed periods are immutable and are never reopened.
- Immediate lifecycle commands use a server-generated transaction timestamp.
- Ordinary scheduling and backdating are unsupported in the MVP.
- PostgreSQL partial unique indexes and exclusion constraints may enforce one open period and prevent overlap where the invariant can be expressed relationally.

**Identifiers and Numeric Types:**

- Use UUID v4 primary identifiers.
- Store real instants as PostgreSQL `timestamptz`.
- Store civil planning dates as PostgreSQL `date`.
- Store workload and durations as integer minutes.
- Store BRL monetary values as `numeric(18,2)`.
- Store fuel prices as `numeric(18,4)`.
- Store Meter Readings as non-negative `numeric(14,2)`.
- Application and API boundaries transport decimals as normalized decimal strings where number serialization could lose precision.

**Consistency and Transactions:**

- Database constraints are the final guarantee for ownership, uniqueness, open-period exclusivity, monotonic evidence boundaries, and idempotency.
- Services and handlers still validate proactively to produce domain-specific errors.
- Critical concurrent commands use transactions with an isolation and locking strategy appropriate to the invariant; operations that require `SERIALIZABLE` behavior use bounded retry for serialization failures.
- Constraint violations are translated into stable application conflict codes rather than exposing database details.

**Migrations, Seeds, and Indexing:**

- Migrations are forward, reviewed, repeatable, and deployed through `prisma migrate deploy`.
- Separate immutable system reference seeds from disposable development fixtures.
- Diesel S10 and Diesel S500 are deterministic system reference records.
- Indexes follow endpoint search, filtering, deterministic ordering, cursor boundaries, ownership scope, and current-record predicates.

**Caching:**

- No distributed or application-level cache is introduced for operational data in the MVP.
- Correctness and predictable invalidation take priority over reducing database reads at pilot scale.

### Authentication & Security

**Authentication Authority:**

- Fastify is the sole authority for authentication, Session persistence, credential rotation, revocation, Company context, and authorization.
- Remove NextAuth from the dashboard. Its independent JWT session must not coexist with the backend Session model.
- Next.js acts as a same-origin Backend-for-Frontend and presentation layer, not as an authentication authority.
- Dashboard-to-API calls occur through server-only adapters and preserve the original normalized host through trusted proxy configuration.

**Credential Model:**

- Access credentials are signed JWTs with a 15-minute lifetime.
- Refresh credentials are opaque cryptographically random values with a 7-day idle expiration and 30-day absolute Session lifetime.
- Store only a cryptographic hash of each refresh credential.
- Refresh rotation atomically consumes the current credential and creates its replacement.
- Reuse of a consumed refresh credential revokes the entire Session and rejects further renewal.
- Access claims include `userId`, `corporationId`, optional selected `companyId`, `sessionId`, and role.
- Every authenticated request validates the persisted Session state in addition to JWT validity where the route's security sensitivity requires immediate revocation.

**Cookie Boundary:**

- Browser credentials use host-only cookies with the `__Host-` prefix, `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/`.
- Do not set a cookie `Domain` attribute.
- Clear both credentials on logout, invalid Session, absolute expiration, or detected refresh reuse.
- Cookie-authenticated mutation endpoints validate trusted origin in addition to relying on `SameSite`.
- Internal Next.js server-to-server API requests may use the access credential as a Bearer token without exposing it to Client Components.

**Two-Stage Company Context:**

- Login resolves the Corporation from the normalized host and creates a Corporation-scoped Session without a selected Company.
- A Corporation-scoped access token may only list eligible Companies, select or change Company, refresh, and logout.
- Company selection validates that the Company belongs to the authenticated Corporation and is accessible to the User.
- Selection updates persisted Session context and issues a replacement access credential containing `companyId`.
- Operational routes require trusted Corporation and selected Company claims and reject scope divergence without revealing foreign record existence.

**Frontend Security Boundary:**

- Client Components never receive API access or refresh credentials.
- Server Actions and server-only adapters perform authenticated calls and controlled refresh.
- `proxy.ts` may use cookie presence for navigation convenience, but it is never an authorization boundary.
- Pages and actions revalidate authentication through the server-side application boundary.
- Security headers and CSP remain enabled and are updated only through reviewed configuration.

**Password and Recovery:**

- Passwords use Argon2id with versioned parameters and opportunistic rehash after successful authentication when parameters change.
- Authentication responses remain generic to prevent account enumeration.
- The administrative CLI is the only MVP password-reset interface.
- Administrative password reset revokes every active Session for the User.

**Rate Limiting and Abuse Controls:**

- Apply rate limiting to login and refresh by normalized host and source IP.
- Avoid permanent account lockout in the MVP.
- Security events such as repeated login failure, refresh reuse, invalid host, and cross-scope access attempts are logged without credentials, CPF, CNPJ, or token material.

**Sensitive Documents:**

- Persist CPF/CNPJ ciphertext using versioned AES-256-GCM encryption with managed keys outside the database.
- Persist a normalized HMAC-SHA-256 digest for equality checks and active uniqueness.
- Support key rotation by recording the encryption key version.
- Mask documents in lists and selectors.
- Full values are available only to authorized Master Administrator create, edit, and detail workflows.
- Never include CPF/CNPJ in tokens, cursors, URLs, telemetry, or application logs.

**Authorization:**

- The MVP implements only `MASTER_ADMIN`.
- Authorization context and service boundaries must not assume that every future role has Corporation-wide access.
- Future Company and Project grants are deferred but remain representable without replacing the Session or request-context model.

### API & Communication Patterns

**Protocol and Versioning:**

- Use REST over JSON under `/api/v1`.
- Do not introduce GraphQL, WebSockets, message brokers, or asynchronous domain-event infrastructure in the MVP.
- Future breaking HTTP contract changes create `/api/v2`; do not version through custom request headers.

**OpenAPI Ownership:**

- Fastify route schemas generate the canonical OpenAPI document.
- The backend publishes the generated OpenAPI document as a versioned build artifact.
- The dashboard never edits its OpenAPI copy manually.
- Kubb generates TypeScript models, Zod schemas, and server-only clients from that artifact.
- Pin every Kubb package to one exact compatible version.
- CI regenerates OpenAPI and dashboard clients and fails when an unexpected uncommitted diff exists.
- Manually duplicated API request or response models are prohibited.

**Frontend Communication Boundary:**

- Use the flow `Component -> Server Action or server query -> application adapter/view model -> generated Kubb client -> API`.
- Client Components never import generated clients or the low-level HTTP client.
- Server Actions validate UI input shape, invoke the API, and adapt responses; they do not reproduce business rules.
- Business validation, authorization, transaction control, and conflict decisions remain in the Fastify application.
- The frontend application adapter translates transport DTOs into display-oriented models and recovery states.

**Response Envelope:**

- Successful responses use:

```json
{
  "success": true,
  "message": "Success",
  "data": {}
}
```

- Error responses use:

```json
{
  "success": false,
  "code": "STABLE_MACHINE_CODE",
  "message": "Human-readable message",
  "details": {},
  "requestId": "uuid"
}
```

- UI logic branches on `code`, never localized `message`.
- `details.fields` carries field-validation information.
- `details.resources` carries resource-level conflicts such as unavailable Employees or Machines.
- Error details expose only information permitted within the authenticated scope.

**HTTP Status Semantics:**

- `400 Bad Request`: malformed input, unsupported query, or invalid cursor
- `401 Unauthorized`: missing, expired, revoked, or invalid authentication
- `403 Forbidden`: authenticated User lacks permission for the operation
- `404 Not Found`: absent or foreign-scope resource, without disclosing foreign existence
- `409 Conflict`: concurrency, current-state, uniqueness, idempotency, or allocation conflict
- `422 Unprocessable Entity`: validly shaped command violates semantic business rules
- `429 Too Many Requests`: rate limit exceeded

**Idempotency:**

- Commands identified by the contract as retry-sensitive require an `Idempotency-Key` header.
- Project wizard finalization always requires one.
- Scope an idempotency record to Session, Corporation, selected Company, HTTP operation, and key.
- Persist a canonical request hash and the completed response reference.
- Repeating the key with the same canonical payload returns the original result.
- Repeating the key with a different payload returns `409 Conflict`.
- Concurrent execution produces one winner while other requests wait for or recover the committed result.
- Retain completed MVP idempotency records for 30 days.

**Request Correlation:**

- Every incoming dashboard and API request receives a UUID `requestId`.
- Preserve the identifier through Next.js server boundaries, Fastify logs, errors, and outbound response headers.
- Never include credentials or sensitive documents in correlation metadata.

**Pagination:**

- Every table and unbounded collection follows `main-api/docs/PAGINATION.md`.
- Cursor payloads remain opaque, versioned, deterministic, and bound to normalized query and trusted scope.
- Fixed immutable catalogs with a documented maximum of 100 records may use a bounded non-paginated contract.

**Project Wizard Contract Limits:**

- Maximum HTTP request body: 1 MiB
- Maximum initial operational Employee allocations: 200
- Maximum initial Machine allocations: 100
- Maximum Technical Responsibilities: 20
- Maximum Project Fuel Agreements: 10
- Maximum Break Templates: 10

These are contract validation limits, not pilot targets. Increasing them requires an explicit contract and performance review.

### Frontend Architecture

**Rendering and Data Flow:**

- Use React Server Components by default.
- Use Client Components only for browser interaction, local form state, dialogs, interactive tables, and controls.
- Initial page reads execute on the server.
- Mutations and subsequent cursor-page requests use Server Actions through the frontend application boundary.
- Do not add React Query or another client-side server-state cache in the MVP.

**Feature Layering:**

```text
page
-> feature component
-> server action or server query
-> application adapter / view model
-> generated Kubb client
```

- Components consume display-oriented view models, not transport DTOs.
- Application adapters map stable API codes and data into presentation state.
- Adapters contain no domain authorization or business invariants.

**State Ownership:**

- The URL owns search, allowlisted filters, sorting, and stable detail navigation state.
- Changing search, filter, or sorting resets cursor traversal.
- Loaded cursor pages and backward-navigation history remain in memory for the current table interaction.
- Zustand is restricted to ephemeral UI preferences such as sidebar visibility and density.
- Do not place authenticated scope, business entities, API responses, wizard payloads, or server-state caches in Zustand.
- Selecting or changing Company clears subordinate table pages, selections, forms, view models, and Project navigation state.
- The selected Company remains visibly identifiable in the application shell.

**Forms and Validation:**

- Use React Hook Form and Zod for interactive form state and immediate format feedback.
- Frontend validation improves usability but never replaces backend validation.
- Server validation codes map back to fields and recovery actions without parsing message text.
- Recoverable errors preserve valid user input.

**Project Wizard:**

- Reuse the existing accessible wizard engine and approved visual shell.
- Wizard state exists only while the browser workflow remains open.
- Closing, refreshing, or abandoning the wizard discards the state and requires restarting.
- Advancing validates only the current step.
- Final submission sends one aggregate command and one wizard-session `Idempotency-Key`.
- No step creates or updates a backend Project draft.
- A resource conflict preserves valid values, identifies affected resources, and navigates to the corresponding step.

**Navigation and URLs:**

- Important registry and detail URLs are reloadable and shareable when authorized.
- URLs never carry CPF, CNPJ, access credentials, refresh credentials, or Company scope.
- Company scope comes exclusively from the authenticated Session.
- Deep links that no longer match the selected Company fail safely and provide a route back to a valid workspace.

**Mock and Scope Governance:**

- Existing styling, layout composition, and reusable interaction components are retained.
- Mock data may remain only as test fixtures.
- Production mocks are removed as each module receives real integration.
- A screen, card, metric, field, column, filter, or action remains only if traceable to a validated capability, journey, or acceptance criterion.
- The MVP dashboard does not expose production, progress, calculated cost, RDO, field alerts, or "Machines in the field" metrics because those capabilities are outside the accepted scope.

**Required UI States:**

- Each capability defines loading, empty, error, unauthorized, conflict, success, and terminal behavior where applicable.
- Async states preserve stable layout dimensions and do not disorient the user.
- Conflict and validation states explain the next safe action.
- Terminal actions use proportional confirmation and preserve inspectable history.

**Accessibility and Responsive Behavior:**

- Keyboard navigation, visible focus, semantic dialog behavior, readable validation, and responsive layouts are acceptance requirements.
- The existing visual system remains the presentation authority, while product contracts remain the behavioral authority.

**Frontend Testing:**

- Use Vitest and React Testing Library for adapters, forms, view models, and interactive components.
- Use Playwright for login, Company selection, cursor tables, conflict recovery, terminal actions, and the Project wizard.
- Tests must not treat existing mock behavior as the expected production contract.

### Infrastructure & Deployment

**Scope of This Decision:**

- Infrastructure design in the MVP architecture covers development, automated testing, and continuous integration only.
- Production architecture is explicitly deferred.
- No current design may assume a production container platform, public network topology, CDN, ingress controller, managed database, or cloud vendor.

**Development Topology:**

- Pin Node.js `22.22.3` consistently across the dashboard, API, developer environment, and CI.
- Use the committed pnpm lockfiles and exact versions for architecture-sensitive generation tooling.
- Run `main-web-app` on `localhost:3000`.
- Run `main-api` on `localhost:3333`.
- Run PostgreSQL 16 through the repository's Docker Compose development topology.
- The browser communicates only with Next.js. Next.js performs server-to-server API calls as the same-origin BFF boundary.
- Use a deterministic local Corporation host such as `piloto.localhost` so host-based Corporation resolution is exercised during development.
- Forward only a normalized, trusted host value from the BFF to the API.

**Development Authentication Configuration:**

- Development may use environment-specific cookie names and transport flags required by local HTTP.
- Development cookie relaxation is configuration-only and must not weaken the production contract of host-only `__Host-*`, `Secure`, `HttpOnly`, `SameSite=Lax`, and `Path=/`.
- Authentication and Company-selection tests must exercise the same Session rotation, trusted host, and backend authorization paths used by the application.

**Test Environment:**

- Use a separate PostgreSQL test database that is recreated for each test execution boundary.
- Apply real migrations to the test database; do not synthesize an alternate test schema.
- Use real PostgreSQL integration tests for tenant isolation, transactions, constraints, temporal invariants, idempotency, and concurrent allocation.
- Playwright starts or connects to the dashboard, API, and test database as one deterministic full-stack environment.
- Test fixtures are explicit and disposable. Immutable system reference data is seeded separately.

**Continuous Integration:**

- Use the same pinned Node.js and pnpm versions as local development.
- Run repository architecture checks, lint, formatting checks, type checking, unit tests, PostgreSQL integration tests, OpenAPI generation, Kubb generation, generation-drift checks, and production builds.
- Run full-stack Playwright coverage for the critical pilot journeys.
- Fail CI when generated OpenAPI or dashboard client artifacts differ unexpectedly from committed artifacts.
- Do not make CI depend on unreconciled production infrastructure.

**Production Direction, Not Commitment:**

- The probable dashboard direction is Cloudflare Workers through OpenNext.
- The probable API direction is a distributed environment managed through Rancher and K3s.
- These directions are recorded for future compatibility review only.
- Production decisions must later validate runtime compatibility, domains and trusted host forwarding, cookie behavior, ingress and TLS termination, secret management, migration execution, database availability, observability, backup and recovery, and scaling.

### Decision Impact Analysis

**Implementation Sequence:**

1. Pin and reconcile the toolchain, repository checks, local services, and test database lifecycle.
2. Establish Corporation, Domain, Company, User, Session, and trusted request-context persistence.
3. Implement backend-owned login, refresh rotation, logout, host resolution, and Company selection.
4. Establish tenant-safe repository patterns, composite ownership constraints, temporal primitives, and negative isolation tests.
5. Standardize response envelopes, stable errors, request correlation, cursor pagination, OpenAPI generation, Kubb generation, and idempotency.
6. Prove one real registry as a complete backend-to-dashboard vertical slice.
7. Implement the remaining Company-scoped registries and lifecycle operations.
8. Implement Project creation, initial optional resource allocation, mobilization, lifecycle transitions, and effective-dated history.
9. Complete pilot E2E journeys and remove production mock behavior from every integrated capability.

**Cross-Component Dependencies:**

- Host resolution and persisted Session context establish the trusted Corporation and Company scope required by every operational module.
- Composite ownership relationships and scoped repositories protect Workforce, Commercial, Fleet, and Project data before role expansion or future RLS.
- Temporal primitives are shared by employment, machine ownership, Project allocation, management responsibility, and lifecycle history.
- Canonical OpenAPI generation is a prerequisite for generated dashboard clients and stable frontend adapters.
- Stable error codes and structured conflict details are prerequisites for preserving form and wizard state during recovery.
- Idempotency storage and transaction behavior are prerequisites for atomic Project wizard finalization.
- Deterministic host, cookie, database, and BFF behavior in development are prerequisites for meaningful authentication and isolation tests.
- Production topology remains independent of MVP correctness; it must preserve these contracts when selected later.

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**

Twelve areas require explicit consistency across implementation agents: naming, module boundaries, test placement, API contracts, temporal and numeric formats, frontend state ownership, validation, errors, loading states, logging, retries, and tenant security.

### Naming Patterns

**Database Naming Conventions:**

- Prisma models use singular `PascalCase`, such as `ProjectAllocation`.
- PostgreSQL tables use plural `snake_case`, such as `project_allocations`, through Prisma `@@map`.
- Prisma fields use `camelCase`; PostgreSQL columns use `snake_case` through Prisma `@map`.
- Foreign-key fields end in `Id`, such as `companyId` and `employeeId`.
- SQL indexes and constraints use descriptive `snake_case` names containing the table, relevant fields or purpose, and suffix, such as `project_allocations_company_employee_open_uq`.
- Generated Prisma artifacts are never edited manually.

**API Naming Conventions:**

- REST resources use plural `kebab-case`, such as `/api/v1/project-allocations/:id`.
- Route parameters use Fastify `:parameter` syntax and `camelCase` names.
- Query parameters and JSON fields use `camelCase`.
- Standard protocol headers retain their canonical names, such as `Idempotency-Key`.
- Custom application headers are introduced only through the documented API contract.

**Code Naming Conventions:**

- Components, classes, schemas represented as types, and exported domain types use `PascalCase`.
- Functions, methods, local variables, object fields, and hooks use `camelCase`.
- Global immutable constants use `UPPER_SNAKE_CASE`.
- Boolean names begin with `is`, `has`, `can`, or `should`.
- New source filenames use `kebab-case`.
- Backend files retain explicit layer suffixes, such as `project-allocation.controller.ts`, `project-allocation.service.ts`, and `create-project-allocation.handler.ts`.
- Server Actions use command-oriented names, such as `createEmployeeAction`.
- Server queries use query-oriented names, such as `getEmployeesQuery`.

### Structure Patterns

**Project Organization:**

- Backend modules are organized by domain: Organization, Auth, Workforce, Commercial, Fleet, and Projects.
- The mandatory backend dependency flow is `controller -> service -> handler -> Prisma`.
- Controllers own HTTP schemas, request extraction, response status, and invocation of application services.
- Services coordinate use cases, authorization decisions, transactions, and domain outcomes.
- Handlers own persistence operations and may use Prisma through the approved handler context.
- Controllers and services do not import Prisma clients or generated Prisma types.
- Unit tests are colocated with the file under test using `*.test.ts`.
- Cross-module and database integration tests reside under `tests/integration`.
- Full-stack browser tests reside in the dashboard Playwright test area.
- Frontend application code is organized by feature rather than by generic technical type.
- The mandatory frontend dependency flow is `page -> feature -> server action or server query -> application adapter/view model -> generated client`.

**File Structure Patterns:**

- Reusable visual primitives remain under `components/ui`.
- Domain-specific components, actions, queries, adapters, schemas, and view models remain inside their owning feature.
- Shared utilities enter `lib` only after demonstrating cross-feature reuse and having no domain ownership.
- Environment parsing remains centralized and typed; application code does not read arbitrary environment variables directly.
- Kubb output remains under `src/generated` and is never manually edited.
- Prisma-generated output remains in its configured generated directory and is never manually edited.
- Product and architecture documentation remains outside runtime source directories.
- Mock records may exist only as explicit test fixtures, never as production data providers.

### Format Patterns

**API Response Formats:**

- Successful responses use `{ success, message, data }`.
- Error responses use `{ success: false, code, message, details, requestId }`.
- UI decisions branch on stable `code` values and structured details, never on localized message text.
- `details.fields` represents field-validation failures.
- `details.resources` represents scoped resource conflicts.
- Every unbounded collection follows the canonical `PAGINATION.md` contract.
- Collections return arrays, including when empty.

**Data Exchange Formats:**

- JSON field names use `camelCase`.
- Real instants use ISO 8601 strings with an explicit offset and are normalized to UTC at persistence boundaries.
- Civil dates use `YYYY-MM-DD`.
- Durations and workloads use integer minutes.
- Precision-sensitive decimal values cross API boundaries as normalized decimal strings.
- Booleans use JSON `true` and `false`.
- Optional absence uses explicit `null` when the contract defines a nullable field.
- Required fields are never silently omitted.
- A single resource is represented as an object, never as a one-element array.
- CPF and CNPJ never appear in URLs, cursors, logs, tokens, telemetry, or unrestricted error details.

### Communication Patterns

**Event System Patterns:**

- The MVP introduces no asynchronous domain-event bus, message queue, or event-driven integration.
- Domain state changes occur synchronously inside the owning command and transaction boundary.
- Future events must use past-tense domain names, versioned payloads, and an outbox-compatible publication boundary, but no speculative event infrastructure is created now.

**State Management Patterns:**

- Zustand contains ephemeral presentation preferences only.
- URLs own search, allowlisted filters, sorting, and stable detail navigation.
- Server data remains owned by the backend and server rendering boundary.
- Frontend mutations revalidate affected server data instead of maintaining independent durable client copies.
- Company changes clear subordinate selections, pagination history, forms, view models, and Project navigation.
- Wizard state is local to the open workflow and is discarded when abandoned.
- Business rules and authorization are never reproduced as frontend state transitions.

**Logging Patterns:**

- Application logs are structured and include `requestId`, operation, trusted scope identifiers, outcome, and safe timing metadata.
- Logs use stable operation names rather than interpolated free-form descriptions.
- Expected validation and domain conflicts use an appropriate non-error level; unexpected failures use error level with a sanitized cause.
- Credentials, cookie values, token material, CPF, CNPJ, encryption plaintext, and complete request bodies are never logged.

### Process Patterns

**Error Handling Patterns:**

- A global Fastify error handler converts application, validation, constraint, and unexpected failures into the canonical error envelope.
- Controllers do not repeat generic `try/catch` response formatting.
- Request-boundary validation handles shape, primitive format, limits, and allowlisted query values.
- Services and handlers enforce authorization, lifecycle, temporal, ownership, and concurrency rules.
- Constraint violations are translated into stable domain conflict codes.
- Foreign-scope and absent records share non-disclosing not-found behavior.
- Recoverable frontend failures preserve valid input and map structured errors to fields, resources, or safe next actions.
- Error boundaries protect page and feature rendering failures without replacing expected form and command error handling.

**Loading and Recovery Patterns:**

- Every applicable capability defines loading, empty, error, unauthorized, conflict, success, and terminal states.
- Initial route loading uses server-compatible route or component loading boundaries.
- Button and form pending states remain local to the action and prevent duplicate submission.
- Layout dimensions remain stable while data is loading.
- Automatic retries are limited to safe reads and commands protected by the required idempotency contract.
- Authentication refresh uses one controlled server-side path and never creates parallel refresh loops in Client Components.

**Testing and Change Patterns:**

- Relevant bug fixes include a regression test at the lowest layer capable of proving the failure.
- Tenant-owned features include negative cross-Company and cross-Corporation tests.
- Constraint and transaction behavior is tested against real PostgreSQL.
- Generated-contract drift, forbidden imports, and layer violations fail CI.
- Pattern exceptions require an explicit architecture update rather than becoming precedent through an isolated code change.

### Enforcement Guidelines

**All AI Agents MUST:**

- Follow existing domain boundaries and approved dependency directions.
- Reuse canonical schemas, response contracts, pagination helpers, and generated clients instead of creating parallel representations.
- Keep trusted Corporation and Company scope outside operational request payloads.
- Add tests proportional to the affected invariant and blast radius.
- Treat frontend mocks as test fixtures or visual references, never as requirements.
- Never manually edit generated Prisma or Kubb artifacts.
- Preserve historical records and use lifecycle commands rather than destructive persistence shortcuts.
- Stop and update the architecture when a necessary implementation conflicts with an approved pattern.

**Pattern Enforcement:**

- Backend architecture scripts enforce forbidden persistence dependencies.
- ESLint, formatting, TypeScript, and repository checks enforce source consistency.
- OpenAPI and Kubb regeneration checks enforce contract ownership.
- PostgreSQL integration tests enforce relational and tenant invariants.
- Playwright enforces critical cross-application workflows and recovery states.
- Architecture changes are reviewed in this document before exceptions become reusable patterns.

### Pattern Examples

**Good Examples:**

```text
POST /api/v1/project-allocations
create-project-allocation.handler.ts
ProjectAllocation -> project_allocations
companyId -> company_id
createEmployeeAction -> employee adapter -> generated client
```

```json
{
  "success": false,
  "code": "EMPLOYEE_ALREADY_ALLOCATED",
  "message": "The employee is not available for this allocation.",
  "details": {
    "resources": [{ "resourceId": "uuid", "field": "employeeId" }]
  },
  "requestId": "uuid"
}
```

**Anti-Patterns:**

- A controller importing Prisma and executing a query directly
- A Client Component importing a generated API client
- A second handwritten interface duplicating an OpenAPI-generated request type
- Deriving Company scope from a request body, URL, or browser store
- Comparing an API error message string to choose frontend behavior
- Adding a dashboard metric because it exists in mock data
- Retrying Project creation without an idempotency key
- Editing a closed temporal period or physically deleting referenced history

## Project Structure & Boundaries

### Complete Project Directory Structure

```text
knogest-renew/
├── main-api/
│   ├── artifacts/
│   │   └── openapi.json
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── seeds/
│   │   │   ├── reference-data.ts
│   │   │   └── development-fixtures.ts
│   │   └── schema.prisma
│   ├── scripts/
│   │   ├── check-architecture.mjs
│   │   ├── generate-openapi.ts
│   │   └── admin-cli.ts
│   ├── src/
│   │   ├── db/
│   │   │   ├── generated/
│   │   │   └── prisma.db.ts
│   │   ├── lib/
│   │   │   ├── config/
│   │   │   │   └── env.ts
│   │   │   ├── errors/
│   │   │   │   ├── app-error.ts
│   │   │   │   ├── error-codes.ts
│   │   │   │   └── error-handler.ts
│   │   │   ├── idempotency/
│   │   │   │   ├── idempotency.service.ts
│   │   │   │   └── request-hash.ts
│   │   │   ├── pagination/
│   │   │   │   ├── cursor-codec.ts
│   │   │   │   ├── cursor-query.ts
│   │   │   │   └── pagination.dto.ts
│   │   │   ├── request-context/
│   │   │   │   ├── request-context.ts
│   │   │   │   └── trusted-scope.ts
│   │   │   ├── security/
│   │   │   │   ├── document-crypto.ts
│   │   │   │   ├── document-hash.ts
│   │   │   │   ├── origin-validation.ts
│   │   │   │   └── password.ts
│   │   │   ├── plugins/
│   │   │   ├── responses/
│   │   │   └── validation/
│   │   ├── modules/
│   │   │   ├── organization/
│   │   │   │   ├── controllers/
│   │   │   │   ├── dto/
│   │   │   │   ├── handlers/
│   │   │   │   ├── services/
│   │   │   │   └── organization.public.ts
│   │   │   ├── auth/
│   │   │   │   ├── controllers/
│   │   │   │   ├── dto/
│   │   │   │   ├── handlers/
│   │   │   │   ├── services/
│   │   │   │   └── auth.public.ts
│   │   │   ├── workforce/
│   │   │   │   ├── controllers/
│   │   │   │   ├── dto/
│   │   │   │   ├── handlers/
│   │   │   │   ├── services/
│   │   │   │   └── workforce.public.ts
│   │   │   ├── commercial/
│   │   │   │   ├── controllers/
│   │   │   │   ├── dto/
│   │   │   │   ├── handlers/
│   │   │   │   ├── services/
│   │   │   │   └── commercial.public.ts
│   │   │   ├── fleet/
│   │   │   │   ├── controllers/
│   │   │   │   ├── dto/
│   │   │   │   ├── handlers/
│   │   │   │   ├── services/
│   │   │   │   └── fleet.public.ts
│   │   │   └── projects/
│   │   │       ├── controllers/
│   │   │       ├── dto/
│   │   │       ├── handlers/
│   │   │       ├── services/
│   │   │       └── projects.public.ts
│   │   ├── routes/
│   │   │   └── v1-routes.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   │   ├── fixtures/
│   │   ├── helpers/
│   │   └── integration/
│   │       ├── auth/
│   │       ├── organization/
│   │       ├── workforce/
│   │       ├── commercial/
│   │       ├── fleet/
│   │       └── projects/
│   ├── compose.yaml
│   ├── package.json
│   └── tsconfig.json
├── main-web-app/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/
│   │   │   ├── home/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── company-selection/
│   │   │   ├── employees/
│   │   │   ├── machines/
│   │   │   ├── clients/
│   │   │   ├── fuel-suppliers/
│   │   │   └── projects/
│   │   │       ├── actions/
│   │   │       ├── adapters/
│   │   │       ├── components/
│   │   │       ├── queries/
│   │   │       ├── schemas/
│   │   │       ├── view-models/
│   │   │       └── projects.test.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   └── ui/
│   │   ├── generated/
│   │   │   ├── clients/
│   │   │   ├── models/
│   │   │   └── zod/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   ├── auth/
│   │   │   └── utils.ts
│   │   ├── stores/
│   │   └── proxy.ts
│   ├── tests/
│   │   ├── e2e/
│   │   │   ├── authentication.spec.ts
│   │   │   ├── company-selection.spec.ts
│   │   │   ├── registries.spec.ts
│   │   │   └── project-wizard.spec.ts
│   │   ├── fixtures/
│   │   └── helpers/
│   ├── package.json
│   └── tsconfig.json
├── _bmad-output/
│   ├── brainstorming/
│   ├── implementation-artifacts/
│   └── planning-artifacts/
├── start-dev.sh
└── README.md
```

The tree defines intended ownership and target locations. Existing files are migrated incrementally during vertical slices rather than through an unrelated bulk reorganization.

### Architectural Boundaries

**API Boundaries:**

- The repositories remain physically independent and do not share a runtime TypeScript package.
- The canonical OpenAPI artifact is the only application contract shared between the API and dashboard.
- Public HTTP routes exist only under `/api/v1`.
- The browser communicates only with the Next.js BFF; generated API clients are server-only.
- Trusted Corporation and Company scope enters application services through backend request context, never through operational payloads.
- No external service integration is included in the MVP.

**Component Boundaries:**

- Next.js pages own routing, parameter extraction, and feature composition.
- Feature components own domain-specific presentation and interaction.
- Shared `components/ui` primitives contain no Knogest business behavior.
- Server Actions and server queries form the dashboard's mutation and read boundary.
- Adapters convert generated transport DTOs into presentation view models.
- Client Components cannot import generated API clients, credentials, or backend transport infrastructure.

**Service Boundaries:**

- Backend dependencies follow `controller -> service -> handler -> Prisma`.
- Domain modules never import another module's controllers or private handlers.
- Cross-domain operations use explicit public services or ports exported from `*.public.ts`.
- Public domain boundaries exchange identifiers and explicit command/result types, not persistence models.
- The Projects service coordinates atomic Project creation and receives participating operations from Organization, Workforce, Commercial, and Fleet through their public boundaries.
- Participating persistence operations receive the same transaction context when one use case spans modules.

**Data Boundaries:**

- Each domain owns writes to its tables and lifecycle records.
- Handlers are the only module layer permitted to access Prisma.
- Shared-schema ownership is enforced through trusted scope, scoped queries, composite relationships, and database constraints.
- No application cache, duplicate read model, frontend persistence store, or secondary database is introduced in the MVP.
- Temporal records are modified only through lifecycle commands that preserve closed history.

### Requirements to Structure Mapping

**Feature Mapping:**

- Corporation, Domain, and Company administration live in backend `organization`.
- Login, Users, Sessions, refresh rotation, logout, authorization, and Company selection live in backend `auth` and frontend `auth` or `company-selection`.
- Person identity, Company Employment, availability, dismissal, and Employee Project allocation live in backend `workforce` and frontend `employees`.
- Client and Fuel Supplier registries live in backend `commercial` and frontend `clients` or `fuel-suppliers`.
- Machine registration, ownership transfer, retirement, Meter Readings, availability, and Project allocation live in backend `fleet` and frontend `machines`.
- Projects, lifecycle, shifts, break templates, responsibilities, fuel agreements, initial allocations, and atomic wizard finalization live in backend and frontend `projects`.
- Registry search, filters, sorting, and cursor tables use shared pagination infrastructure while remaining owned by the relevant feature.
- Critical administrator journeys live in `main-web-app/tests/e2e`.

**Cross-Cutting Concerns:**

- Request scope and correlation live in `main-api/src/lib/request-context`.
- Stable application errors and global formatting live in `main-api/src/lib/errors`.
- Cursor encoding, query binding, and response metadata live in `main-api/src/lib/pagination`.
- Idempotency ownership and canonical request hashing live in `main-api/src/lib/idempotency`.
- Document encryption, equality hashing, password hashing, and origin checks live in `main-api/src/lib/security`.
- API transport and backend Session access live in `main-web-app/src/lib/api` and `main-web-app/src/lib/auth`.
- Visual primitives and application shell remain in frontend `components/ui` and `components/layout`.

### Integration Points

**Internal Communication:**

- Fastify controllers validate transport shape and invoke owning services.
- Services coordinate public domain ports and handlers.
- Handlers execute scoped persistence through Prisma.
- Next.js pages and features invoke server queries or Server Actions.
- Server boundaries invoke adapters and generated Kubb clients.
- Company-context changes invalidate every subordinate frontend feature state.

**External Integrations:**

- None are part of the MVP.
- PostgreSQL is infrastructure owned by the API, not an external business integration.
- Future integrations receive dedicated adapters and cannot be called directly from domain or presentation code.

**Data Flow:**

```text
Browser interaction
-> Next.js page or Client Component
-> Server Action or server query
-> frontend adapter
-> generated Kubb client
-> Fastify controller
-> owning service
-> owning handler or explicit public domain port
-> Prisma transaction
-> PostgreSQL
```

Responses return through the same boundaries, with transport DTOs converted into frontend view models before presentation.

### File Organization Patterns

**Configuration Files:**

- Each repository retains its own package, TypeScript, lint, build, and environment configuration.
- Typed environment parsing is centralized per repository.
- OpenAPI generation belongs to the API; Kubb generation belongs to the dashboard.
- Production deployment configuration is deliberately absent until the production architecture is selected.

**Source Organization:**

- Source is organized by domain on the backend and feature on the frontend.
- Shared directories accept only genuinely cross-cutting code.
- Existing files move into the target structure only when their vertical slice is implemented or reconciled.
- Generated sources remain isolated and replaceable.

**Test Organization:**

- Unit tests are colocated as `*.test.ts` or `*.test.tsx`.
- PostgreSQL integration tests live under `main-api/tests/integration`.
- Playwright journeys live under `main-web-app/tests/e2e`.
- Fixtures and helpers used only by tests remain outside production source directories.
- Every tenant-owned feature includes negative scope tests.

**Asset Organization:**

- Static dashboard assets live under `main-web-app/public`.
- Feature-specific imported assets remain with their owning feature when bundling requires source imports.
- The API does not serve dashboard assets.
- No production mock payload is stored as a runtime asset.

### Development Workflow Integration

**Development Server Structure:**

- Local development starts PostgreSQL, Fastify, and Next.js as independent services.
- `start-dev.sh` may coordinate convenience startup without merging application ownership.
- The deterministic local Corporation host exercises the BFF and trusted-host path.

**Build Process Structure:**

- The API validates architecture, type checks, tests, builds, and produces the canonical OpenAPI artifact.
- The dashboard consumes OpenAPI, regenerates Kubb artifacts, checks drift, type checks, tests, and builds.
- Integration and E2E jobs apply real migrations to isolated PostgreSQL databases.

**Deployment Structure:**

- The independent repositories and HTTP contract permit separate future deployment.
- No current directory or build assumption commits the dashboard to Cloudflare or the API to Rancher/K3s.
- Future production design must preserve the BFF, trusted-host, Session, contract-generation, migration, and observability boundaries defined here.

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:**

- Next.js, Fastify, Prisma, PostgreSQL, OpenAPI, and Kubb form a compatible contract-driven stack with independent application ownership.
- Backend-owned Sessions and the Next.js BFF establish one authentication authority without exposing credentials to Client Components.
- Shared-schema multi-tenancy is consistently protected through trusted request context, scoped persistence, composite ownership relationships, database constraints, and negative isolation tests.
- Temporal history, transactional commands, idempotency, and structured conflict responses support the Project, Workforce, Commercial, and Fleet requirements without requiring event sourcing or asynchronous infrastructure.
- Development and testing decisions exercise the same critical host, Session, database, and API boundaries while leaving production deployment intentionally undecided.

**Pattern Consistency:**

- Naming conventions distinguish PostgreSQL storage names, Prisma models, TypeScript code, and JSON contracts without ambiguity.
- Backend and frontend dependency directions support the selected security and contract boundaries.
- Error, pagination, date, decimal, logging, retry, and state-management rules are consistent with the NFRs.
- Generated artifacts have one owner and cannot become competing handwritten contracts.
- Mock governance prevents the existing dashboard from silently expanding product scope.

**Structure Alignment:**

- Every backend domain owns its persistence and exposes only explicit public operations to other domains.
- The Projects domain can coordinate the atomic wizard while participating domains retain ownership of their invariants.
- Frontend feature boundaries support server-first data access, view-model adaptation, and isolated interactive state.
- Test locations match the required unit, real-PostgreSQL integration, and full-stack E2E responsibilities.
- The two applications remain independently buildable and deployable through the OpenAPI boundary.

### Requirements Coverage Validation

**Feature Coverage:**

- Corporation resolution, authentication, renewable Sessions, Company selection, and administrative provisioning are covered by Organization, Auth, request context, security infrastructure, and the administrative CLI.
- Company registries, operational removal, cursor lists, and scope isolation are covered by domain ownership, pagination infrastructure, soft-deletion rules, and scoped selectors.
- Person identity, Employments, employment periods, effective allocation terms, termination, and reallocation are covered by Workforce temporal modeling and transactional lifecycle commands.
- Clients, Fuel Suppliers, fixed Fuel Types, and Project-specific effective prices are covered by Commercial and Projects boundaries.
- Machine registration, identifier uniqueness, Meter Readings, allocation, ownership transfer, and retirement are covered by Fleet constraints and lifecycle commands.
- The complete non-resumable Project wizard, responsibilities, Weekly Schedule, Break Templates, optional mobilization, atomic finalization, and idempotency are covered.
- Planned reservation, activation, pause, reactivation, completion, cancellation, revisions, and detail history are covered through explicit Project lifecycle and temporal records.

**Functional Requirements Coverage:**

- FR-1 through FR-5 map to Organization, Auth, trusted host resolution, persisted Sessions, and service-backed CLI commands.
- FR-6 through FR-8 map to canonical pagination, scoped repositories, active selectors, and irreversible operational removal with preserved history.
- FR-9 through FR-13 map to corporation-level Person identity and Company-owned effective Employment and Employee Allocation periods.
- FR-14 through FR-16 map to separate Client and Fuel Supplier aggregates and Project-owned Fuel Agreements with effective prices.
- FR-17 through FR-21 map to Fleet ownership, identifiers, monotonic Meter Readings, allocation, transfer, and retirement.
- FR-22 through FR-26 map to the aggregate Project command, validated limits, one transaction, and idempotent finalization.
- FR-27 through FR-30 map to explicit Project status commands and guarded resource behavior.
- FR-31 through FR-35 map to effective Project revisions and dedicated historical detail queries.

**Non-Functional Requirements Coverage:**

- NFR-1 through NFR-4 are supported by trusted authentication scope, non-disclosing failures, hashed credentials, sensitive-data encryption, and sanitized logging.
- NFR-5 is supported by mandatory audit attribution on critical historical changes.
- NFR-6 and NFR-7 are supported by masked document views, restricted disclosure, encryption, and a mandatory pilot data-protection document.
- NFR-8 through NFR-11 are supported by transactions, constraints, concurrency strategies, idempotency, immutable history, and separate current/historical query paths.
- NFR-12 through NFR-14 are supported by canonical cursor pagination, stable error contracts, OpenAPI ownership, generated clients, and contract tests.
- NFR-15 and NFR-16 are supported by `timestamptz`, `America/Sao_Paulo` business interpretation, civil dates, integer minutes, PostgreSQL numeric types, and decimal-string API boundaries.
- NFR-17 and NFR-18 are supported by CLI provisioning, shared-schema tenant design, multiple Company support, explicit interface states, and full-stack pilot tests.

### Implementation Readiness Validation

**Decision Completeness:**

- Critical technology, tenancy, persistence, temporal, authentication, authorization, API, frontend, testing, and local infrastructure decisions are documented.
- Versions are fixed for architecture-sensitive runtime and framework dependencies.
- Deferred production, RLS, roles, RDO, and asynchronous processing decisions are explicitly separated from MVP correctness.
- Wizard request and resource limits are defined before FR-26 implementation.

**Structure Completeness:**

- Target directories, module ownership, public boundaries, generated artifacts, tests, scripts, and configuration responsibilities are defined.
- Requirements map to backend modules, frontend features, and cross-cutting infrastructure.
- Data and control flow is traceable from browser interaction to PostgreSQL and back.
- Existing files can migrate incrementally through vertical slices without requiring a disruptive repository rewrite.

**Pattern Completeness:**

- Naming, dependency direction, transport formats, state ownership, logging, errors, loading, retries, security, testing, and generated-code rules are explicit.
- Good examples and prohibited anti-patterns are documented.
- CI and architecture checks provide enforceable validation points.
- Pattern exceptions require an architecture decision rather than becoming accidental precedent.

### Gap Analysis Results

**Critical Gaps:**

- None remain.

**Important Gaps Resolved During Validation:**

1. Critical historical mutations must record `actorUserId`, the effective transaction instant, and `reason` whenever the product contract requires one.
2. Current-state and historical-state access must use separate named query or handler paths. Closed, inactive, deleted, transferred, retired, or terminated records never enter operational selectors unless a contract explicitly requests history.
3. The administrative CLI must invoke the same application services, validation, transaction, audit, and Session-revocation behavior used by HTTP workflows. It must not write operational state through direct Prisma commands.
4. Before entering real CPF or CNPJ data, the pilot must have an approved data-protection document covering purpose, legal basis, authorized access, retention, disposal, and incident responsibility.

**Nice-to-Have Gaps:**

- Production runtime and network architecture
- PostgreSQL RLS implementation
- Advanced observability, backup, and recovery design
- Future scoped roles and grants
- RDO, mobile synchronization, and asynchronous processing

These items are explicitly deferred and do not block the internal MVP pilot.

### Validation Issues Addressed

**Audit Attribution:**

- Every critical lifecycle command carries trusted `actorUserId`.
- The server records the transaction instant.
- Commands requiring justification reject an absent or blank reason.
- Audit fields belong to the relevant domain history rather than a speculative generic audit platform.

**Current and Historical Queries:**

- Operational selectors and registry queries use explicit active/current predicates.
- Historical detail uses dedicated handlers and response models.
- Historical access never changes current eligibility or grants association rights.

**Administrative CLI Boundary:**

- CLI commands compose application services through an authenticated administrative execution context.
- Provisioning and password reset use the same invariants as runtime operations.
- Password reset revokes every Session for the affected User.
- Direct database access remains limited to migrations, deterministic reference seeds, and disposable development fixtures.

**Pilot Personal-Data Gate:**

- Real personal or company documents cannot be entered until the protection document is approved.
- Development and automated tests use synthetic documents.
- The gate is an operational acceptance condition, not an optional future policy.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**

- Product requirements, not frontend mocks, control scope and backend contracts.
- Tenant isolation and historical integrity are designed as database-backed invariants.
- One authentication authority controls revocable Sessions and selected Company context.
- Atomic and idempotent Project creation has a clear cross-domain transaction boundary.
- OpenAPI generation provides an executable and enforceable dashboard contract.
- Development and test environments are designed to prove the pilot's principal failure modes.

**Areas for Future Enhancement:**

- Select and validate production topology.
- Add PostgreSQL RLS as another isolation layer.
- Define production secrets, observability, backups, recovery, and deployment controls.
- Extend authorization to Company and Project grants.
- Add RDO, mobile, operational calculations, and asynchronous integration only through future product and architecture revisions.

### Implementation Handoff

**AI Agent Guidelines:**

- Follow all architectural decisions and approved patterns in this document.
- Implement through vertical slices that deliver observable pilot workflows.
- Respect domain ownership and public module boundaries.
- Use generated contracts and do not duplicate API types.
- Prove tenant isolation, transactions, history, and recovery behavior with the prescribed test layer.
- Do not infer requirements from existing dashboard mock content.
- Escalate any conflict between implementation reality and this architecture before introducing a new precedent.

**First Implementation Priority:**

Reconcile the existing foundations through one vertical proof:

1. Pin the toolchain and make repository checks reproducible.
2. Replace placeholder persistence with Corporation, Domain, Company, User, and Session foundations.
3. Implement trusted host resolution, backend-owned login, refresh rotation, logout, and Company selection.
4. Publish one canonical cursor-paginated endpoint through OpenAPI.
5. Generate and consume its Kubb client through a frontend adapter.
6. Render one persisted dashboard registry with all required states.
7. Prove the complete slice through real PostgreSQL integration tests and Playwright.
