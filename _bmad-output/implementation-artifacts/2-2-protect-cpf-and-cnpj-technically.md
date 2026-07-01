---
baseline_commit: f275c1d5d6310f3064aeabe6ed7eebca73e5e514
---

# Story 2.2: Protect CPF and CNPJ Technically

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want CPF and CNPJ values encrypted, masked, and equality-safe,
so that registry workflows can use documents without unnecessary exposure.

## Acceptance Criteria

1. **Given** a CPF or CNPJ is submitted  
   **When** it passes format and checksum validation  
   **Then** the normalized value is encrypted with versioned AES-256-GCM  
   **And** a normalized HMAC-SHA-256 digest is stored for equality and uniqueness checks.

2. **Given** encryption keys exist outside the database  
   **When** a document is encrypted  
   **Then** its key version is recorded  
   **And** the design supports future key rotation.

3. **Given** an authorized list or selector is displayed  
   **When** a document is included  
   **Then** it is masked  
   **And** plaintext is never returned unnecessarily.

4. **Given** an authorized Master Administrator opens a create, edit, or detail workflow  
   **When** full disclosure is required  
   **Then** the backend explicitly authorizes the operation  
   **And** plaintext is exposed only through that protected response.

5. **Given** a document is used for active uniqueness  
   **When** another active record of the same registry and Company has the same normalized digest  
   **Then** creation is rejected with a stable conflict code  
   **And** ciphertext is never compared or exposed.

6. **Given** a document appears in application processing  
   **When** URLs, cursors, tokens, logs, telemetry, errors, or request correlation are generated  
   **Then** the plaintext document is excluded  
   **And** complete request bodies containing documents are not logged.

7. **Given** encryption, decryption, masking, or hashing fails  
   **When** the request is processed  
   **Then** the operation fails safely without partial persistence  
   **And** cryptographic details are not exposed.

8. **Given** the security behavior is tested  
   **When** unit and PostgreSQL integration suites run  
   **Then** they cover normalization, validation, encryption round trips, masking, equality digests, scoped uniqueness, key versions, unauthorized disclosure, and log sanitization.  
   **And** no test fixture requires a real personal document.

## Tasks / Subtasks

- [x] Confirm Story 2.1 gate and document-data boundaries (AC: 1-8)
  - [x] Treat real CPF/CNPJ entry as unauthorized until the pilot personal-data approval artifact and checklist are complete.
  - [x] Use only synthetic CPF/CNPJ values in unit, integration, E2E, fixtures, examples, and snapshots.
  - [x] Preserve the distinction between syntactic/checksum validity and real-world identity verification.

- [x] Build canonical CPF/CNPJ normalization, validation, and masking utilities (AC: 1, 3, 4, 8)
  - [x] Add shared security utilities for `normalizeCpf`, `normalizeCnpj`, `validateCpfChecksum`, `validateCnpjChecksum`, and document type detection/validation.
  - [x] Normalize to digit-only canonical strings before encryption, HMAC, masking, or uniqueness checks.
  - [x] Implement stable masking for list/selector responses: CPF and CNPJ masks expose only the approved minimal visible digits.
  - [x] Return full plaintext only through explicitly authorized detail/create/edit response paths; do not include plaintext in general DTOs.

- [x] Implement versioned encryption and equality digest services (AC: 1, 2, 5, 7)
  - [x] Add a `sensitive-document` security service under `main-api/src/lib/security` using AES-256-GCM for confidentiality and HMAC-SHA-256 for equality digests.
  - [x] Load encryption and HMAC keys from typed environment configuration outside the database; validate key presence, length/encoding, and active key version at startup.
  - [x] Persist ciphertext, IV/nonce, auth tag, key version, normalized digest, and document type in downstream registry tables; never persist normalized plaintext.
  - [x] Use distinct key material or domain-separated derivation for encryption and HMAC. Do not reuse JWT, refresh, or password secrets for document protection.
  - [x] Design the stored shape so future key rotation can decrypt by recorded key version and re-encrypt without changing equality semantics.

- [x] Define safe persistence and conflict behavior for active uniqueness (AC: 5, 7)
  - [x] Establish reusable schema guidance for registry models: Company-owned rows carry `corporationId` and `companyId`; active uniqueness is scoped by `{ corporationId, companyId, registry type, document digest }`.
  - [x] Use PostgreSQL constraints or partial unique indexes where Prisma cannot express the required active-only uniqueness; translate constraint violations to stable domain conflict codes.
  - [x] Compare only normalized HMAC digests for equality. Never compare ciphertext, masked values, formatted strings, or plaintext.
  - [x] Fail the full transaction if encryption, hashing, validation, or constraint translation fails.

- [x] Sanitize document handling across API, logs, cursors, and telemetry (AC: 3, 4, 6, 7)
  - [x] Add or update redaction helpers so CPF/CNPJ plaintext, normalized digits, ciphertext, auth tags, HMAC keys, and complete request bodies are excluded from logs and error metadata.
  - [x] Ensure cursor payloads and query hashes never contain plaintext documents; if a document-search feature appears later, hash only validated normalized query state and bind it to trusted scope.
  - [x] Ensure request correlation includes safe operation/scope metadata only.
  - [x] Map crypto failures to sanitized application errors without algorithm internals, keys, IVs, auth tags, database details, or raw document values.

- [x] Expose protected disclosure contracts for downstream registry stories (AC: 3, 4, 6)
  - [x] Define DTO conventions: list/selector responses carry masked documents only; protected detail response may include full plaintext when authorized.
  - [x] Ensure OpenAPI schemas distinguish masked document fields from protected plaintext fields.
  - [x] Ensure generated Kubb consumers cannot accidentally receive plaintext in table/list view models.
  - [x] Do not introduce Client or Fuel Supplier registry endpoints in this story except as test harnesses; Story 2.3 owns Client behavior.

- [x] Prove crypto, disclosure, uniqueness, and sanitization behavior (AC: 1-8)
  - [x] Unit-test CPF/CNPJ normalization, checksum validation, invalid formats, masking, digest determinism, digest key separation, encryption round trips, wrong-key/wrong-tag failure, and key-version metadata.
  - [x] PostgreSQL-test active scoped uniqueness with same digest in same Company rejected and same digest in another Company/Corporation permitted.
  - [x] Force encryption, decryption, digest, and transaction failures to prove rollback and sanitized errors.
  - [x] Assert logs, errors, request IDs, URLs, cursors, telemetry fields, snapshots, and persisted rows contain no plaintext CPF/CNPJ.

## Dev Notes

### Developer Context

- This story creates the cross-cutting sensitive-document foundation required by Client, Fuel Supplier, Person, and Employment workflows. It should be reusable and boringly strict.
- Current backend already has `main-api/src/lib/security/password.ts`, refresh credential utilities, and normalization helpers for host/email. Extend `lib/security`; do not bury document crypto inside `commercial`, `workforce`, controllers, or Prisma middleware.
- Current `main-api/prisma/schema.prisma` has Corporation, Domain, Company, User, and Session. It has no Client/Fuel Supplier/Person document models yet. This story should define reusable persistence shape and may add minimal supporting model pieces only if needed for integration tests.
- Story 2.3 will apply this foundation to Clients. Keep Client registry behavior out of this story unless a thin test-only fixture is needed.

### Technical Requirements

- CPF/CNPJ normalization is digit-only and must occur before validation, encryption, HMAC, masking, persistence, and uniqueness checks.
- AES-256-GCM output must include ciphertext, IV/nonce, auth tag, and key version. Use fresh random IV/nonce per encryption.
- HMAC-SHA-256 digest uses the normalized document and registry/domain separation sufficient to prevent accidental cross-purpose comparisons.
- Keys live outside the database in typed environment configuration. Database rows record key version, not key material.
- Masked values are the default for lists/selectors. Full plaintext is exceptional and must be tied to an explicitly authorized backend operation.
- Plaintext, normalized digits, keys, IVs when unsafe, auth tags, full request bodies, ciphertext, and digest internals must not appear in logs, URLs, cursors, telemetry, token claims, request correlation, error details, or frontend durable state.

### Architecture Compliance

- Fastify remains the business validation and authorization authority. Server Actions and frontend adapters may validate UI shape but must not reproduce cryptographic or authorization decisions.
- Controllers own schemas and response status; services coordinate authorization, transactions, and outcomes; handlers own persistence. Controllers/services must not import Prisma clients directly.
- `main-api/src/lib/security` owns document encryption, HMAC, normalization, masking, and redaction helpers when reusable across domains.
- PostgreSQL constraints are the final guarantee for uniqueness; services produce domain-specific conflicts and handlers translate database constraint violations.
- Generated Prisma and Kubb artifacts are never edited manually.

### Current Files to Reconcile and Preserve

- Expected backend surfaces include `main-api/src/lib/security/**`, `main-api/src/lib/config/env.ts`, `main-api/prisma/schema.prisma`, forward migrations, security unit tests, and integration test helpers.
- Existing `main-api/src/lib/security/normalization.ts` currently covers host/email only; add document normalization without weakening those functions.
- Existing `main-api/src/lib/utils/cursor-pagination.ts` still uses standard Base64 and unbound JSON. Do not put document plaintext into this cursor path; Story 2.3 must align pagination before Client lists ship.
- Frontend production code should not need changes in this story except generated contract types if a minimal protected-disclosure contract is exposed.

### Testing Requirements

- Unit tests are mandatory for deterministic CPF/CNPJ validation, masking, HMAC, encryption/decryption, key-version handling, wrong-key/tag failure, and sanitization helpers.
- PostgreSQL integration tests are mandatory for scoped uniqueness and rollback behavior because mock tests cannot prove database constraints or transaction boundaries.
- Test fixtures must use synthetic documents only and should fail loudly if real-looking fixture policy is violated.
- Secret-safety assertions should scan stdout/stderr/log capture/error payloads/snapshots/persisted rows for raw and normalized document values.

### Previous Story Intelligence

- Story 2.1 requires approval evidence before real document entry and prohibits treating checksum validity as proof of real identity.
- Story 1.4 established trusted selected Company context. Document uniqueness for Company-owned registries must use trusted `{ corporationId, companyId }`, never payload-supplied scope.
- Story 1.5 emphasized secret-safe output and service-level redaction; reuse that posture for sensitive documents.

### Git Intelligence Summary

- Recent commits show the Epic 1 foundation and a standalone pagination documentation commit. There is no committed sensitive-document service yet.
- Current worktree before story creation had only `.nvmrc` untracked. Preserve unrelated changes.

### Latest Technical Information

- Node.js v22 crypto documents `createCipheriv`, `createDecipheriv`, `getAuthTag`, `setAuthTag`, `randomBytes`, and `createHmac`; implement AES-256-GCM with authenticated tags and fresh random IV/nonce per encryption. [Source: https://nodejs.org/docs/latest-v22.x/api/crypto.html]
- Prisma transactions support atomic command boundaries; use transactions for persistence that combines document protection, record creation, and uniqueness/conflict handling. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]
- Fastify route schemas are the canonical request/response validation source and should generate OpenAPI for downstream Kubb consumers. [Source: https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/]

### Project Structure Notes

- Prefer `main-api/src/lib/security/sensitive-document.ts` and adjacent tests for reusable document protection.
- Domain modules such as `commercial` and `workforce` should consume the service rather than define parallel encryption or masking.
- If manual SQL is required for partial active uniqueness, keep it in reviewed forward migrations and document the Prisma limitation in the story implementation notes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-22-Protect-CPF-and-CNPJ-Technically]
- [Source: _bmad-output/planning-artifacts/architecture.md#Sensitive-Documents]
- [Source: _bmad-output/planning-artifacts/architecture.md#Tenant-and-Ownership-Isolation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error-Handling-Patterns]
- [Source: _bmad-output/implementation-artifacts/2-1-approve-the-pilot-personal-data-gate.md]
- [Source: main-api/src/lib/security/normalization.ts]
- [Source: main-api/prisma/schema.prisma]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Added document normalization/checksum/masking helpers under `main-api/src/lib/security`.
- Added AES-256-GCM/HMAC sensitive-document service, redaction helpers, and safe DTO conventions.
- Added typed environment configuration for versioned document encryption/HMAC keys.
- Added Prisma harness table and migration with active partial uniqueness index for scoped digest conflicts.
- Added PostgreSQL integration harness service/handler for transaction, uniqueness, rollback, and no-plaintext persistence checks.
- Added idempotent synthetic seed rows for the sensitive-document harness.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- CPF/CNPJ normalization, AES-256-GCM encryption, HMAC equality, key-version metadata, masking, disclosure, scoped uniqueness, rollback, and sanitization guardrails were reconciled.
- Implemented reusable CPF/CNPJ normalization, checksum validation, type detection, masking, encryption, HMAC equality, disclosure DTOs, and redaction helpers.
- Added required versioned key environment configuration and `.env.example` documentation; local untracked `.env` was not edited.
- Added a minimal sensitive-document PostgreSQL harness for active scoped uniqueness without introducing Client or Fuel Supplier endpoints.
- Added development seed data that exercises masked output, encrypted storage, same-document cross-company allowance, and same-document cross-registry allowance using explicitly synthetic CPF/CNPJ values.
- Tests were not executed by the agent per user instruction; commands are listed in the final handoff.

### File List

- main-api/.env.example
- main-api/prisma/migrations/20260701023000_sensitive_document_protection/migration.sql
- main-api/prisma/schema.prisma
- main-api/prisma/seed.ts
- main-api/prisma/seeds/development-fixtures.ts
- main-api/prisma/seeds/sensitive-document-development-data.ts
- main-api/src/lib/config/env.ts
- main-api/src/lib/security/document.ts
- main-api/src/lib/security/document.test.ts
- main-api/src/lib/security/sensitive-document.ts
- main-api/src/lib/security/sensitive-document.test.ts
- main-api/src/lib/utils/appError.ts
- main-api/src/lib/utils/jsonResponse.ts
- main-api/src/lib/utils/swaggerSchemas.ts
- main-api/src/modules/security/handlers/sensitive-document-harness.handler.ts
- main-api/src/modules/security/sensitive-document-harness.service.ts
- main-api/tests/integration/security/sensitive-document-harness.test.ts
- main-api/tests/setup-env.ts
- main-api/tests/setup-integration-env.ts

### Change Log

- 2026-07-01: Added sensitive CPF/CNPJ foundation, versioned crypto config, safe disclosure DTOs, redaction helpers, PostgreSQL uniqueness harness, and synthetic harness seed data.
