---
baseline_commit: f275c1d5d6310f3064aeabe6ed7eebca73e5e514
---

# Story 2.1: Approve the Pilot Personal-Data Gate

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Master Administrator,
I want the rules for using real CPF and CNPJ data approved before pilot entry,
so that the pilot has an explicit legal and operational protection boundary.

## Acceptance Criteria

1. **Given** real CPF/CNPJ data has not yet been entered  
   **When** the pilot is prepared  
   **Then** an approved document defines purpose, legal basis, authorized access, retention, disposal, and incident responsibility  
   **And** the pilot-readiness checklist blocks authorization to enter real documents until approval.

2. **Given** development or automated testing  
   **When** registry fixtures are created  
   **Then** only synthetic CPF/CNPJ values are used  
   **And** fixtures are explicitly separated from production runtime data.

3. **Given** a CPF or CNPJ value is syntactically valid  
   **When** the application receives it  
   **Then** the system does not claim to classify whether it belongs to a real person or entity  
   **And** compliance with the gate is verified operationally through approval evidence and pilot procedure.

## Tasks / Subtasks

- [x] Create the pilot personal-data approval artifact and readiness gate (AC: 1, 3)
  - [x] Add a repository documentation artifact outside runtime source directories that records the approved pilot boundary for real CPF/CNPJ usage: purpose, legal basis, authorized access, retention, disposal, incident responsibility, approver, approval timestamp, and scope.
  - [x] Add or update the pilot-readiness checklist so the system is not considered authorized for real CPF/CNPJ entry until that approval artifact is complete.
  - [x] Make the checklist language operationally explicit: syntactic validity is not proof that a CPF/CNPJ belongs to a real person or company.
  - [x] Keep this gate as an operational acceptance condition; do not create a speculative consent workflow, legal-case management module, or runtime compliance portal in this story.

- [x] Separate synthetic fixtures from production runtime data (AC: 2)
  - [x] Review all seed, fixture, integration, E2E, and documentation examples that may contain CPF/CNPJ-like values.
  - [x] Ensure development fixtures are clearly disposable and separate from immutable system reference seeds.
  - [x] Add a visible warning near fixture generation that test CPF/CNPJ values must be synthetic and must not be copied from pilot data.
  - [x] Do not put real documents in README examples, snapshots, generated OpenAPI examples, Playwright fixtures, Prisma seeds, logs, or committed docs.

- [x] Add minimal enforcement hooks for future registry implementation (AC: 1-3)
  - [x] Add a small documented guardrail/check that registry stories must verify before accepting real document entry in pilot configuration or operational runbooks.
  - [x] Ensure the guardrail is reusable by Stories 2.2, 2.3, 2.4, and 2.6 without each story inventing different compliance language.
  - [x] If code-level configuration is added, keep it outside document plaintext and avoid runtime claims that the application can determine whether a syntactically valid document is real.

- [x] Prove the gate behavior with focused checks (AC: 1-3)
  - [x] Add documentation/checklist validation that fails when the approval artifact is absent, incomplete, or lacks approval evidence.
  - [x] Add tests or static checks ensuring committed fixtures/examples contain only approved synthetic CPF/CNPJ values.
  - [x] Add reviewer guidance that a valid checksum is only format validation, not real-world identity verification.

## Dev Notes

### Developer Context

- Epic 2 introduces registries that will handle CPF/CNPJ in Clients, Fuel Suppliers, Persons, and Company Employments. This story establishes the non-code gate that must exist before any real pilot document is entered.
- This is deliberately not a product feature for end users. The deliverable is approval evidence, readiness blocking, fixture separation, and unambiguous developer/operator guidance.
- Story 2.2 will implement the cryptographic and masking foundation. Do not implement encryption, HMAC digests, or registry persistence here unless needed only to support a lightweight gate check.
- Current repository state already has Epic 1 foundations for Corporation, Company, User, Session, selected Company context, and administrative CLI. The only untracked file observed before this story was `.nvmrc`; preserve unrelated user changes.

### Technical Requirements

- Real CPF/CNPJ entry is unauthorized until approval evidence exists and the pilot-readiness checklist marks the gate as approved.
- Synthetic fixture values must be deterministic enough for tests, but they must be labeled as synthetic and separated from production runtime data.
- A valid CPF/CNPJ checksum means the input is structurally valid only. The application must not claim to know whether the number belongs to a real person or entity.
- Compliance evidence is operational: approval artifact, checklist status, and pilot procedure. Do not model legal truth as an application-side database assertion in this story.
- Documentation must avoid committing real pilot names, documents, passwords, tokens, cookies, access credentials, or complete request bodies.

### Architecture Compliance

- Product and architecture documentation remain outside runtime source directories.
- Separate immutable system reference seeds from disposable development fixtures.
- Development and automated tests use synthetic personal/company documents only.
- Logs, telemetry, request correlation, URLs, cursors, tokens, errors, and snapshots must not include CPF/CNPJ plaintext.
- The gate is a prerequisite for downstream registry stories, not a replacement for the cryptographic controls in Story 2.2.

### Current Files to Reconcile and Preserve

- Expected documentation/checklist surfaces are under `_bmad-output/implementation-artifacts`, `_bmad-output/planning-artifacts`, `docs`, or root README/runbook-style files if already present.
- Expected fixture surfaces include `main-api/prisma/seeds/development-fixtures.ts`, `main-api/prisma/seeds/reference-data.ts`, `main-api/tests/**`, and `main-web-app/tests/**`.
- Do not edit generated Prisma or Kubb output manually.
- No production UI is required for this story.

### Testing Requirements

- Static/documentation validation should prove the approval artifact has all required sections and approval evidence.
- Fixture checks should fail on unlabeled or non-synthetic CPF/CNPJ examples once document fixture helpers exist.
- If no automated documentation checker exists yet, add a minimal script or test near existing repository checks rather than burying this as a manual-only convention.
- No real PostgreSQL registry persistence is required by this story unless the implementation introduces a runtime gate flag; if it does, cover it with integration tests.

### Previous Story Intelligence

- Story 1.4 established that operational work requires trusted selected Company context. Epic 2 registries must continue that rule once they handle Company-owned data.
- Story 1.5 emphasized secret-safe operator output and no sensitive values in logs/fixtures/snapshots. Apply the same discipline to CPF/CNPJ examples.
- Story 1.1 separated deterministic reference seeds from disposable development fixtures; use that distinction for document data.

### Git Intelligence Summary

- Recent history includes `epico 1`, the backend foundation baseline, and pagination documentation. There is no existing approved personal-data gate artifact to preserve.
- Current `sprint-status.yaml` has Epic 2 and Stories 2.1-2.3 in backlog before this story creation.

### Latest Technical Information

- Node.js `crypto` in the active v22 line documents `createCipheriv`, HMAC, random bytes, and authenticated cipher tag APIs needed by Story 2.2; this story should only reference those controls as future implementation requirements. [Source: https://nodejs.org/docs/latest-v22.x/api/crypto.html]
- Prisma transactions remain the expected mechanism for downstream atomic registry writes, but this gate should not introduce database writes unless a concrete runtime gate flag is intentionally added. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]

### Project Structure Notes

- Keep compliance/runbook artifacts out of `main-api/src` and `main-web-app/src` unless executable checks are needed.
- Keep production runtime data and development fixtures visibly separate. Synthetic examples belong in tests/fixtures/seeds, never in user-facing pilot data.
- No UX artifact exists for this gate; downstream registry UI stories should cite this story as a prerequisite rather than duplicating policy language.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-21-Approve-the-Pilot-Personal-Data-Gate]
- [Source: _bmad-output/planning-artifacts/architecture.md#Pilot-Personal-Data-Gate]
- [Source: _bmad-output/planning-artifacts/architecture.md#Sensitive-Documents]
- [Source: _bmad-output/planning-artifacts/architecture.md#Migrations-Seeds-and-Indexing]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md]
- [Source: _bmad-output/implementation-artifacts/1-5-reset-a-master-administrator-password-administratively.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- Added template-blocking compliance artifact and readiness checklist under `docs/compliance`.
- Added personal-data gate validator and unit coverage for checklist/artifact/fixture scanning.
- Added development fixture warning to keep synthetic documents separate from runtime pilot data.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Personal-data approval, fixture separation, syntactic-validation limits, and downstream registry prerequisites were reconciled.
- Implemented template-blocking pilot personal-data gate; real CPF/CNPJ entry remains unauthorized until real approval evidence is filled.
- Added a reusable validation command, `pnpm check:personal-data-gate`, plus unit coverage for the gate and synthetic fixture policy.
- Tests were not executed by the agent per user instruction; commands are listed in the final handoff.

### File List

- docs/compliance/pilot-personal-data-gate.md
- docs/compliance/pilot-readiness-checklist.md
- main-api/package.json
- main-api/prisma/seeds/development-fixtures.ts
- main-api/scripts/validate-personal-data-gate.ts
- main-api/src/lib/security/personal-data-gate.ts
- main-api/tests/personal-data-gate.test.ts

### Change Log

- 2026-07-01: Added pilot personal-data gate, readiness checklist, fixture boundary validation, and test coverage.
