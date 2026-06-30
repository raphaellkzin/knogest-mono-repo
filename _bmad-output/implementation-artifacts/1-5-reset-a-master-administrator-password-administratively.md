---
baseline_commit: 96102b62dea8d9f9ea02e901411f2c5f5ffbcb09
---

# Story 1.5: Reset a Master Administrator Password Administratively

Status: in-progress

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an authorized operator,
I want to reset a Master Administrator password through the CLI,
so that access can be recovered without a public password-recovery workflow or direct database editing.

## Acceptance Criteria

1. **Given** an authorized operator supplies a Corporation identifier, Master Administrator identifier or normalized email, and a valid replacement password  
   **When** the reset command is executed  
   **Then** the target User is resolved only inside the specified Corporation  
   **And** a same-email User in another Corporation cannot be affected.

2. **Given** a valid replacement password  
   **When** the reset is committed  
   **Then** the new value is stored as an Argon2id hash using current versioned parameters  
   **And** the plaintext password is never logged, persisted, or echoed.

3. **Given** the target User has one or more active Sessions  
   **When** the password reset succeeds  
   **Then** every persisted Session belonging to that User is revoked atomically with the password change  
   **And** existing access and refresh credentials can no longer renew or access security-sensitive routes.

4. **Given** the target Corporation or User is absent  
   **When** reset is attempted  
   **Then** the CLI returns a safe failure without exposing unrelated Corporation data  
   **And** no password or Session record changes.

5. **Given** password validation, hashing, persistence, or Session revocation fails  
   **When** the command executes  
   **Then** the transaction rolls back completely  
   **And** the prior password and Session state remain consistent.

6. **Given** the CLI performs the reset  
   **When** application state changes  
   **Then** it invokes the Auth application service and shared validation, audit, and transaction behavior  
   **And** it never updates the User or Session tables directly through Prisma.

7. **Given** a successful administrative reset  
   **When** the security event is recorded  
   **Then** it includes the acting administrative context, target User identifier, transaction instant, operation, and outcome  
   **And** contains no password, hash, credential, CPF, CNPJ, or token material.

8. **Given** the reset behavior is tested  
   **When** the PostgreSQL integration suite runs  
   **Then** it covers scoped User resolution, successful reset, all-Session revocation, rollback, cross-Corporation protection, subsequent old-password rejection, new-password login, and secret-safe output  
   **And** the test invokes the same Auth service used by the CLI.

## Tasks / Subtasks

- [ ] Confirm the administrative/Auth prerequisite chain (AC: 1-8)
  - [ ] Require Story 1.1's `pnpm admin -- <command>` adapter, trusted administrative context, scoped User schema, versioned Argon2id service, transaction-aware handlers, safe output, and architecture checks.
  - [ ] Reuse Stories 1.2-1.3 login verification, Session revocation, persisted-state guard, security-event logging, and real-PostgreSQL harness; do not create CLI-specific password or Session logic.
  - [ ] Treat Story 1.4 as context continuity only; password reset revokes all Sessions regardless of selected Company.

- [ ] Define a secret-safe reset command boundary (AC: 1, 2, 4, 6)
  - [ ] Add `pnpm admin -- password:reset --corporation <uuid> (--user <uuid> | --email <email>)`; require exactly one User selector and reject ambiguous/malformed combinations before service invocation.
  - [ ] Read and confirm the replacement password through a hidden interactive prompt by default. Support protected stdin for automation only; never accept plaintext through CLI arguments, environment variables, config files, shell history, or command output.
  - [ ] Keep stdin/prompt handling in the CLI adapter and pass the replacement value only in memory to the Auth command. Clear references where practical and never serialize the command object.
  - [ ] Render a generic safe not-found failure for missing Corporation/User and non-zero exit status. Successful output contains only safe Corporation/User identifiers and outcome.

- [ ] Implement the shared administrative password-reset service (AC: 1-7)
  - [ ] Add a typed `ResetMasterAdministratorPasswordCommand` containing trusted actor context, target Corporation, exactly one target User selector, and opaque replacement password.
  - [ ] Normalize email through the existing utility, resolve an active `MASTER_ADMIN` only under `corporationId`, and never perform a global email lookup followed by an ownership check.
  - [ ] Validate the replacement with the canonical server password policy, then hash using the current versioned Argon2id parameters. Do not compare with or disclose the prior hash unless policy explicitly rejects password reuse in a future requirement.
  - [ ] Use one database transaction and transaction instant to update the target password hash and revoke every non-revoked Session owned by `{ corporationId, userId }` with an administrative-password-reset reason.
  - [ ] Reuse the Session bulk-revocation handler/service introduced for lifecycle security. The CLI and any future adapter must invoke the same Auth application service.
  - [ ] Roll back the password change if Session revocation, audit persistence required by the established boundary, or any other transaction step fails; never leave new password plus active old Sessions or vice versa.

- [ ] Make reset immediately invalidate every credential (AC: 3, 5, 8)
  - [ ] Ensure all refresh attempts observe revoked Session state and fail without rotation; reuse attempts cannot resurrect a Session.
  - [ ] Ensure security-sensitive routes reject an otherwise valid pre-reset access JWT through persisted Session validation established by Story 1.3.
  - [ ] Revoke Sessions across every selected Company and browser/device for the User, without affecting another User or same-email User in a sibling Corporation.
  - [ ] Permit a new login with the replacement password to create a new independent Corporation-scoped Session; the old password must return the same generic login failure as unknown credentials.

- [ ] Record safe administrative security evidence (AC: 4, 6, 7)
  - [ ] Emit the established structured security event with trusted administrative actor identifier/type, target Corporation/User identifiers, server transaction instant, stable `admin.password-reset` operation, and success/failure outcome.
  - [ ] Redact password, hash, credentials, cookie/token values, email where not needed, full command objects, database errors, CPF/CNPJ, and complete input streams from logs and telemetry.
  - [ ] Keep audit/security behavior in the application service or shared port, not in the CLI alone, so every adapter receives the same evidence and redaction.
  - [ ] Do not introduce a generic enterprise audit-log platform in this story; use the scoped security-event mechanism approved by the architecture.

- [ ] Harden CLI errors and architecture boundaries (AC: 2, 4-7)
  - [ ] Map validation, absent target, conflict, hashing, transaction, and unexpected failures to stable safe CLI outcomes without stack traces or Prisma details in normal output.
  - [ ] Send failures to stderr, success to stdout, and set deterministic exit codes suitable for operator automation. Password prompt/confirmation mismatch fails before any database call.
  - [ ] Extend architecture checks to forbid Prisma imports from `scripts/admin-cli.ts` and any CLI command adapter; only Auth handlers access User/Session persistence.
  - [ ] Document operator usage with placeholders only. Never commit a real or example plaintext pilot password to README, fixtures, snapshots, scripts, or shell examples.

- [ ] Prove reset atomicity, isolation, and secret safety (AC: 1-8)
  - [ ] Unit-test CLI selector exclusivity, UUID/email normalization, hidden prompt/stdin adapter, password-policy mapping, safe exit/output rendering, and redaction.
  - [ ] Add real-PostgreSQL integration tests for lookup by User ID and email, same email in two Corporations, successful hash replacement, zero/one/many Session revocation, every selected Company, inactive/absent targets, and unaffected sibling Users.
  - [ ] Force failures after hashing and between password update/revocation to prove the prior hash and all Session states roll back together.
  - [ ] Verify pre-reset access and refresh credentials fail after commit, old-password login fails generically, new-password login succeeds, and the new Session is not accidentally revoked.
  - [ ] Capture stdout, stderr, structured logs, errors, snapshots, process arguments used by tests, and persisted rows to assert neither replacement password nor hash/token material leaks.
  - [ ] Invoke both the service directly and the real CLI adapter while asserting they share the same application command; run architecture, formatting, lint, typecheck, integration, and build checks.

## Dev Notes

### Developer Context

- This is account recovery for the internal pilot, not a public forgot-password feature. Do not add email delivery, recovery tokens, browser forms, Company/User administration screens, or self-service password changes.
- Story 1.1 defines the administrative CLI as a thin outer adapter and creates the password/transaction foundations. This story adds one command to that adapter; it does not create a privileged database path.
- Story 1.3 establishes current-Session revocation and immediate persisted-state enforcement. Generalize/reuse it for all Sessions owned by the target User.
- The current repository still contains a template User with global `username/password` and direct login behavior. Implement the prior foundation before this story; do not reset that placeholder model and call the acceptance criteria complete.

### Technical Requirements

- User resolution is always scoped by trusted target `corporationId` plus either User ID or normalized email. Same-email Users in other Corporations are independent.
- The replacement is stored only as the current versioned Argon2id encoded hash. Plaintext exists transiently in memory and must never reach persistence, logs, argv, environment, output, fixtures, or snapshots.
- Password update and all-Session revocation are one atomic PostgreSQL transaction using one server transaction instant.
- All Sessions for the User are revoked regardless of current `companyId`, device, refresh version, or apparent access JWT expiry. Already revoked Sessions may remain historically revoked without changing the original reason unless the domain model records the reset event separately.
- The new password creates no Session by itself. A subsequent normal domain-scoped login creates a fresh Session and still requires Company selection according to Stories 1.2/1.4.
- Do not add password-history requirements, forced periodic changes, public recovery, permanent account lockout, or operator bypass of password policy without an approved requirement.

### CLI and Application Interface Contracts

- Operator command: `pnpm admin -- password:reset --corporation <uuid> --user <uuid>` or `--email <email>`. Exactly one of `--user`/`--email` is required.
- Replacement password input comes from a hidden prompt with confirmation or protected stdin for non-interactive automation. `--password`, password environment variables, and plaintext config inputs are prohibited.
- The CLI creates a trusted administrative actor context from the existing Story 1.1 boundary and calls the Auth public application service. It never imports Prisma or generated persistence models.
- Service result contains only safe target identifiers, transaction instant, revoked Session count, and outcome as needed by the operator; errors remain stable and sanitized.

### Architecture Compliance

- CLI is an outer adapter parallel to HTTP controllers: `CLI -> Auth public service -> Auth handlers -> Prisma`. Password utility, validation, transaction, revocation, audit, and errors are shared application boundaries.
- Handlers alone query/update User and Session. The service coordinates one transaction-scoped handler context and owns the reset invariant.
- Use UUIDs, `timestamptz`, canonical normalization, global safe error handling for HTTP consumers, and structured request/operation correlation appropriate to CLI execution.
- Do not manually edit generated Prisma artifacts or the committed initial migration; add forward schema/migration changes only if the prior Session foundation lacks required revocation/audit fields.

### Current Files to Reconcile and Preserve

- Expected foundation surfaces are `main-api/scripts/admin-cli.ts`, Auth public/service/handlers, shared password/security-event utilities, transaction-aware handler context, Prisma User/Session schema and migrations, package scripts, architecture checks, and integration helpers.
- The current repository has no administrative CLI yet because Story 1.1 is not implemented. Do not create a standalone reset script against `app.prisma`; implement the prerequisite shared CLI/service foundation first.
- Preserve existing app startup, Prisma adapter cleanup, independent API build, deterministic test database, and secret-safe logging configuration.
- No frontend source should change for this story.

### Testing Requirements

- PostgreSQL integration coverage is mandatory. Mock tests cannot prove scoped same-email resolution, transaction rollback, or all-Session revocation.
- Verify stored hash with the shared password service and assert it differs from plaintext/previous hash without printing either value in failure messages.
- Failure injection must occur after at least one transactional write would have happened, proving rollback rather than only pre-validation.
- Authentication verification after reset must use the canonical login/Session path, including persisted revocation checks; no test-only bypass or direct token issuance.
- Secret scans/assertions cover stdout, stderr, structured logs, thrown errors, test snapshots, persisted database fields, and command arguments.

### Previous Story Intelligence

- Story 1.4 confirms selected Company is Session context, not User identity. Reset therefore revokes every Session for the User across all Companies and does not alter Company records.
- Story 1.3 requires a reusable persisted Session revocation service, stable revocation reasons, security events, and immediate access/refresh rejection. Extend that boundary with bulk User revocation rather than duplicating it.
- Story 1.1 specifies `pnpm admin -- <command>`, service reuse, safe output, no direct Prisma access, and transaction-aware handlers. Preserve those conventions exactly.

### Git Intelligence Summary

- Git history contains only the template/foundation baseline; there is no existing operational reset contract to preserve.
- Existing user changes in `start-dev.sh`, `app.md`, and `main-web-app/pnpm-workspace.yaml` are unrelated and must not be overwritten or reformatted.

### Latest Technical Information

- The installed `argon2` package supports Argon2id encoded hashes whose parameters travel with the hash; keep the application's explicit versioned policy and verify through the shared service rather than parsing hashes in the CLI. [Source: https://github.com/ranisalt/node-argon2]
- RFC 9106 specifies Argon2id and parameter-selection guidance; use the approved application parameters established in Story 1.1 rather than silently inheriting changing library defaults. [Source: https://www.rfc-editor.org/rfc/rfc9106]
- Prisma interactive transactions provide atomic rollback and explicit PostgreSQL isolation; keep password hashing outside or carefully bounded around the database transaction so locks are not held during unnecessary expensive work, while revalidating the target before commit. [Source: https://www.prisma.io/docs/orm/prisma-client/queries/transactions]

### Project Structure Notes

- The architecture's target Auth module/CLI files may not exist until Story 1.1. Add this vertical command within those established locations and avoid a second scripts hierarchy.
- No standalone UX artifact applies; this is intentionally CLI-only.
- If hidden prompt support requires a dependency, prefer a small maintained package already compatible with Node `22.22.3`; otherwise use Node readline/TTY primitives behind an injectable adapter and ensure the terminal does not echo input.

### References

- [Source: _bmad-output/implementation-artifacts/1-4-select-and-change-the-active-company-workspace.md]
- [Source: _bmad-output/implementation-artifacts/1-1-provision-the-pilot-workspace-through-the-cli.md]
- [Source: _bmad-output/planning-artifacts/epics.md#Story-15-Reset-a-Master-Administrator-Password-Administratively]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-5-Provision-Pilot-Administration]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-3-Maintain-Revocable-Session]
- [Source: _bmad-output/planning-artifacts/architecture.md#Password-and-Recovery]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication--Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service-Boundaries]
- [Source: main-api/AGENTS.md]

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Scoped identity, secret-safe input, transactional all-Session revocation, rollback, and CLI/application boundaries were reconciled.
- Implemented `password:reset` administrative command parsing with scoped Corporation target and exactly one User selector.
- Added hidden TTY prompt support plus protected stdin support for replacement password input; plaintext password arguments remain forbidden.
- Added shared Auth application service flow for scoped Master Administrator password reset and all-Session revocation.
- Documented safe operator usage without committed plaintext example passwords.
- Validation not completed in this run because the user explicitly requested to run tests themselves.

### File List

- main-api/scripts/admin-cli.ts
- main-api/src/modules/organization/admin-command.ts
- main-api/src/modules/auth/auth.service.ts
- main-api/src/modules/auth/handlers/login.handler.ts
- main-api/README.MD
