---
baseline_commit: 96102b62dea8d9f9ea02e901411f2c5f5ffbcb09
---

# Story 1.1: Provision the Pilot Workspace Through the CLI

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authorized operator,
I want to provision the pilot Corporation and its administration through a CLI,
so that the Master Administrator can use Knogest without direct database manipulation.

## Acceptance Criteria

1. **Given** the existing dashboard and API repositories are checked out for development  
   **When** the initial pilot foundation is prepared  
   **Then** Node.js `22.22.3`, pnpm, dashboard port `3000`, API port `3333`, PostgreSQL 16, and the deterministic Corporation host are configured consistently  
   **And** both repositories remain physically independent with generated contract artifacts isolated from manually maintained source.

2. **Given** an empty PostgreSQL 16 development or test database  
   **When** the Organization and Auth foundation migrations are applied  
   **Then** the minimum Corporation, Domain, User, Session, Company, and required reference-seed schema is created through reviewed migrations  
   **And** no shared or test environment depends on `prisma db push` or a synthesized schema.

3. **Given** the foundation commands and migrations are committed  
   **When** CI runs  
   **Then** it verifies version pinning, architecture checks, lint, formatting, type checking, applicable tests, migrations, contract generation drift, and application builds  
   **And** the test database is recreated and migrated at its documented execution boundary.

4. **Given** the required foundation migrations have been applied  
   **When** the operator provides a Corporation, normalized Domain, Master Administrator credentials, and zero to three initial Companies  
   **Then** the system creates the requested records atomically  
   **And** returns safe identifiers without displaying password or credential material.

5. **Given** a Corporation is provisioned without a Company  
   **When** the command completes  
   **Then** the Corporation remains valid  
   **And** Companies may be added later through the administrative CLI.

6. **Given** a Domain is submitted  
   **When** it is persisted  
   **Then** its host is normalized consistently  
   **And** a Domain already assigned to another Corporation is rejected without partial creation.

7. **Given** a Master Administrator email  
   **When** the User is created  
   **Then** the normalized email is unique inside that Corporation  
   **And** the same email may independently exist in another Corporation.

8. **Given** a password is provided  
   **When** the User is persisted  
   **Then** it is hashed with Argon2id  
   **And** neither plaintext nor sensitive values appear in logs or command output.

9. **Given** any validation, uniqueness, or persistence failure  
   **When** provisioning is attempted  
   **Then** the transaction is rolled back completely  
   **And** the CLI reports a safe actionable error.

10. **Given** the CLI executes an administrative operation  
    **When** it changes application state  
    **Then** it invokes the same application services and validation boundaries used by runtime workflows  
    **And** it never writes operational data directly through Prisma.

11. **Given** the provisioning behavior is tested  
    **When** the integration suite runs  
    **Then** it uses a real migrated PostgreSQL database  
    **And** covers successful provisioning, empty Company state, duplicate Domain, scoped email uniqueness, rollback, and secret-safe output.

## Tasks / Subtasks

- [x] Reconcile and pin the development foundation (AC: 1, 3)
  - [x] Pin Node.js `22.22.3` at the repository level and add matching `engines` declarations to both application packages; retain pnpm `10.33.0` and committed lockfiles.
  - [x] Keep Next.js on port `3000`, Fastify on `3333`, and PostgreSQL 16 in the existing independent application topology coordinated by `start-dev.sh`.
  - [x] Add a deterministic local host such as `piloto.localhost` to typed environment configuration and examples; do not derive Corporation scope from an environment variable at runtime.
  - [x] Reconcile the Kubb dependency set onto one exact compatible major/version and preserve generated output under `main-web-app/src/generated`.
  - [x] Add reproducible API OpenAPI generation and dashboard Kubb generation/drift checks without hand-editing generated files.
  - [x] Add CI for version checks, architecture checks, formatting, lint, typecheck, unit/integration tests, migration deployment, generation drift, and builds for both applications.

- [x] Introduce the Organization/Auth foundation through forward migrations (AC: 2, 4-8)
  - [x] Replace the placeholder persistence model with singular Prisma models mapped to plural `snake_case` tables for `Corporation`, `Domain`, `Company`, `User`, and `Session`; use UUID v4 identifiers and `timestamptz` for real instants.
  - [x] Carry `corporationId` on Domain, Company, User, and Session; reserve nullable `companyId` on Session for the two-stage Company context used by later stories.
  - [x] Store normalized Domain hosts globally uniquely, normalized User emails uniquely per Corporation, `MASTER_ADMIN` as the only current role, password hashes rather than passwords, and active/inactive state needed by host and login eligibility.
  - [x] Define Session fields needed by Stories 1.2-1.5: user/corporation/optional-company ownership, refresh hash/version, creation, last-use, idle/absolute expiry, revocation timestamp/reason, and rotation/reuse state without storing plaintext credentials.
  - [x] Add composite relations and database constraints that prevent Corporation/Company ownership divergence; preserve compatibility for future RLS without enabling it in this story.
  - [x] Add a new reviewed migration rather than rewriting the committed initial migration; shared/test workflows must use `prisma migrate deploy`, never `prisma db push`.

- [x] Separate immutable reference data from disposable development fixtures (AC: 2, 3)
  - [x] Replace the current production-like `admin@adm.com` seed with separate deterministic reference-data and development-fixture entry points.
  - [x] Keep reference seeds idempotent and free of operator credentials; development fixtures may use synthetic credentials but must be explicitly disposable and excluded from production workflows.
  - [x] Document and automate creation/reset/migration of the isolated PostgreSQL test database at the integration-suite boundary.

- [x] Implement shared Organization/Auth application boundaries (AC: 4-10)
  - [x] Create Organization and Auth modules following `controller -> service -> handler -> Prisma`; handlers alone may use Prisma, including transaction-scoped handler contexts.
  - [x] Centralize Domain/email normalization and password hashing in reusable server-only utilities; use Argon2id with versioned parameters and a rehash-capable representation.
  - [x] Define stable application errors for invalid input, duplicate Domain, duplicate Corporation-scoped email, persistence conflict, and unexpected failure; sanitize all details before CLI rendering.
  - [x] Ensure provisioning is one transaction spanning Corporation, Domain, User, and zero-to-three Companies, with no partial identifiers or records on failure.

- [x] Add the administrative CLI as a thin application-service adapter (AC: 4-10)
  - [x] Add `main-api/scripts/admin-cli.ts` and a package script invoked as `pnpm admin -- <command>`; support `provision` and `company:add` in this story.
  - [x] Parse and validate CLI input before invoking services: Corporation name, Domain host, Master Administrator email/password, and zero-to-three initial Company names for `provision`; Corporation identifier and Company name for `company:add`.
  - [x] Use an explicit trusted administrative execution context and call the same Organization/Auth services that runtime adapters will use; the CLI must never import the Prisma client or query models.
  - [x] Emit only safe created identifiers and outcomes. Never echo passwords, hashes, tokens, cookie values, complete payloads, or database errors; send failures to stderr and return a non-zero exit code.

- [x] Prove the foundation with automated checks (AC: 1-11)
  - [x] Add unit tests for host/email normalization, CLI input validation, password hash verification, and secret redaction.
  - [x] Add real-PostgreSQL integration tests for migrations, successful provisioning with zero and three Companies, later Company addition, duplicate Domain, per-Corporation email uniqueness, and composite ownership constraints.
  - [x] Force a mid-command validation/constraint failure and prove complete transaction rollback with no leaked secret in logs/stdout/stderr.
  - [x] Add architecture checks forbidding Prisma imports from controllers, services, and `scripts/admin-cli.ts`.
  - [x] Run formatting checks, lint, typecheck, unit tests, PostgreSQL integration tests, migration deployment, OpenAPI/Kubb generation and drift checks, and production builds.

## Dev Notes

### Developer Context

- This is the foundation story for all later work. Deliver a working vertical administrative path, not only a schema or collection of utilities.
- The current API is a template: Prisma has only `User(id, username, password)`, the migration creates only that table, and the seed creates `admin@adm.com` with password `1234`. These are placeholders to replace through forward evolution, not accepted product behavior.
- `main-api/src/modules/auth` currently authenticates a globally unique `username`, issues a four-hour JWT, and does not persist Sessions or tenant scope. Story 1.1 creates the persistence and service primitives but does not implement browser login; that belongs to Story 1.2.
- The current `main-web-app` uses NextAuth and generated login clients. Do not remove or redesign the login UI in this story. Only reconcile the shared toolchain and generation pipeline needed for later replacement.
- The repositories remain physically independent. Do not create a shared runtime TypeScript package; OpenAPI is the only application contract shared between them.

### Technical Requirements

- Node.js is fixed at `22.22.3`; pnpm and architecture-sensitive generation packages must use exact compatible versions. The locally installed Node version may differ and must not become the committed contract.
- PostgreSQL 16 and Prisma ORM 7 with `@prisma/adapter-pg` remain mandatory. Migration history is authoritative; never use `prisma db push` for shared or test databases.
- Use `Corporation` as the tenant/security boundary. Company is an operational ownership boundary inside a Corporation, not a replacement for tenant scope.
- Normalize hosts by trimming, lowercasing, removing an allowed port, rejecting schemes/paths/credentials/wildcards, and applying one canonical hostname representation before lookup or uniqueness checks.
- Normalize email by trimming and lowercasing for equality/uniqueness while retaining a safe display value only if the schema explicitly separates it.
- Password material must exist only long enough to validate and hash it. Logs, CLI output, errors, fixtures, snapshots, and generated artifacts must contain no plaintext credential.
- Do not add Redis, distributed caching, queues, event buses, GraphQL, WebSockets, RLS, production deployment configuration, browser Company/User administration, or public password recovery.

### Architecture Compliance

- Backend dependencies follow `controller -> service -> handler -> Prisma`. CLI is an outer adapter parallel to controllers and invokes services; it is not a privileged persistence layer.
- Modules are owned by domain: Corporation/Domain/Company in `organization`, credentials/Users/Sessions in `auth`. Cross-module creation uses explicit public service boundaries and a shared transaction context.
- Controllers and services must not import generated Prisma types or use `app.prisma`. Generated Prisma and Kubb files are never manually edited.
- New filenames use `kebab-case`; exported domain types use `PascalCase`; JSON and TypeScript fields use `camelCase`; SQL tables/columns/constraints use descriptive `snake_case` mappings.
- Centralize typed environment parsing. Application code must not read arbitrary `process.env` values.
- Preserve the current Fastify route prefix `/api/v1`, canonical response direction, request correlation direction, and CSP/security configuration unless a required foundation change is explicitly covered here.

### File Structure Requirements

- Expected new/expanded backend areas: `src/modules/organization`, `src/modules/auth`, `src/lib/security`, `src/lib/request-context`, `prisma/migrations`, `prisma/seeds`, `scripts/admin-cli.ts`, contract-generation scripts, and `tests/integration/{organization,auth}`.
- Existing files requiring careful reconciliation include `prisma/schema.prisma`, `prisma/seed.ts`, `src/db/prisma.db.ts`, `src/lib/config/env.ts`, `src/lib/plugins/prisma.plugin.ts`, `src/modules/auth/*`, both package manifests/lockfiles, `kubb.config.ts`, environment examples, and `start-dev.sh`.
- Do not edit `src/db/generated/prisma/**` or `main-web-app/src/generated/**` manually. Regenerate them from their owning schemas.
- Keep user-authored changes already present in `start-dev.sh`, `app.md`, and `main-web-app/pnpm-workspace.yaml`; reconcile only overlapping lines necessary for this story.

### Testing Requirements

- Unit tests remain colocated with the code under test. Cross-module/database tests live under `main-api/tests/integration` and run against a freshly migrated PostgreSQL 16 test database.
- Tests must assert database state after both success and failure, not only return values.
- Capture CLI stdout, stderr, application logs, and thrown errors in secret-safety tests and assert that plaintext passwords/hashes never appear.
- Exercise concurrency/constraint behavior where Domain or email uniqueness can race; one command wins and the other receives a stable safe conflict without partial records.
- CI must detect version drift, forbidden imports, unexpected generated-contract changes, and migration failures.

### Latest Technical Information

- Node.js `22.22.3` is the architecture-pinned LTS release; do not silently upgrade the major or substitute the developer machine's version. [Source: https://nodejs.org/en/blog/release/v22.22.3]
- Prisma 7 requires a driver adapter for direct database connections; retain `@prisma/adapter-pg` and review underlying `pg` pool/timeouts explicitly. [Source: https://docs.prisma.io/docs/guides/upgrade-prisma-orm/v7]
- Prisma migration history remains the source of truth and applied migrations should not be rewritten. [Source: https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/migration-histories]

### Project Structure Notes

- The architecture target tree is ahead of the repository. Migrate only the Organization/Auth foundation needed by this vertical slice; do not perform an unrelated bulk reorganization.
- Existing backend docs use `tenantId` examples. For Knogest, the concrete trusted tenant key is `corporationId`; Company-owned data additionally carries `companyId`.
- There is no committed CI workflow and no API-owned `main-api/artifacts/openapi.json` yet. Establish ownership and reproducibility here rather than treating the dashboard's current copied OpenAPI file as canonical.
- No standalone UX specification exists. The dashboard is the presentation reference; this story has no new browser UI.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-11-Provision-the-Pilot-Workspace-Through-the-CLI]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-5-Provision-Pilot-Administration]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#Cross-Cutting-Non-Functional-Requirements]
- [Source: _bmad-output/planning-artifacts/architecture.md#Existing-Technical-Foundation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication--Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure--Deployment]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation-Patterns--Consistency-Rules]
- [Source: main-api/AGENTS.md]
- [Source: main-api/docs/ARCHITECTURE.md]
- [Source: main-api/docs/MODULE_PATTERN.md]
- [Source: main-api/docs/TENANCY.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- 2026-06-30: RED confirmed for missing normalization/password modules and administrative command parser; GREEN after implementations.
- 2026-06-30: Fresh PostgreSQL 16 database recreated and both forward migrations deployed; 6 provisioning integration scenarios passed.
- 2026-06-30: Full API/dashboard format, lint, typecheck, contract drift, test, and production build gates passed.

### Implementation Plan

- Pin and automate the independent application foundation and canonical contract pipeline.
- Introduce the Organization/Auth schema and service boundaries through a forward migration.
- Deliver provisioning as a secret-safe CLI adapter and prove invariants against migrated PostgreSQL.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Current implementation, architecture deltas, dependency boundaries, and test requirements were reconciled before development.
- Node/pnpm/PostgreSQL/Kubb contracts and a provider-neutral CI entrypoint were added.
- Corporation, Domain, Company, User, and Session persistence plus transaction-safe provisioning were implemented.
- Reference seeds, disposable fixtures, safe CLI commands, OpenAPI/Kubb generation, and database-backed tests are complete.

### File List

- .nvmrc
- scripts/ci.sh
- scripts/verify-foundation.mjs
- main-api/.env.example
- main-api/README.MD
- main-api/artifacts/openapi.json
- main-api/docker-compose.dev.yml
- main-api/package.json
- main-api/pnpm-lock.yaml
- main-api/prisma/schema.prisma
- main-api/prisma/seed.ts
- main-api/prisma/migrations/20260630190000_organization_auth_foundation/migration.sql
- main-api/prisma/seeds/development-fixtures.ts
- main-api/prisma/seeds/reference-data.ts
- main-api/scripts/admin-cli.ts
- main-api/scripts/check-architecture.mjs
- main-api/scripts/check-openapi-drift.ts
- main-api/scripts/generate-openapi.ts
- main-api/scripts/reset-test-database.mjs
- main-api/scripts/run-integration-tests.sh
- main-api/src/lib/config/env.ts
- main-api/src/lib/plugins/prisma.plugin.ts
- main-api/src/lib/security/normalization.test.ts
- main-api/src/lib/security/normalization.ts
- main-api/src/lib/security/password.test.ts
- main-api/src/lib/security/password.ts
- main-api/src/lib/utils/handler.dto.ts
- main-api/src/modules/auth/auth-foundation.service.ts
- main-api/src/modules/auth/auth.service.ts
- main-api/src/modules/auth/handlers/auth-foundation.handler.ts
- main-api/src/modules/organization/admin-command.test.ts
- main-api/src/modules/organization/admin-command.ts
- main-api/src/modules/organization/handlers/organization.handler.ts
- main-api/src/modules/organization/organization.service.ts
- main-api/tests/integration/organization/provisioning.test.ts
- main-api/tests/setup-integration-env.ts
- main-api/vitest.config.ts
- main-api/vitest.integration.config.ts
- main-web-app/.env.example
- main-web-app/kubb.config.ts
- main-web-app/package.json
- main-web-app/pnpm-lock.yaml
- main-web-app/scripts/check-api-drift.mjs
- main-web-app/src/actions/auth/session.actions.ts
- main-web-app/src/lib/auth/options.ts
- main-web-app/src/generated/** (regenerated)

## Change Log

- 2026-06-30: Implemented and validated the complete Story 1.1 provisioning foundation; status moved to review.
