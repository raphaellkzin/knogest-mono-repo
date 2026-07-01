# Sprint Change Proposal: Epic 4 Security and Completeness Hardening

**Date:** 2026-07-01
**Status:** Approved and applied
**Scope:** Moderate — Product Owner/Developer coordination
**Baseline:** `9e243e12f17379cc0db8ccc69aa4dacb715d16e6`

## 1. Issue Summary

A multi-discipline review of all Epic 4 stories in `ready-for-dev` found material ambiguity at the Project creation trust boundary. The stories described the intended workflow but did not completely specify stale selected-Company behavior across tabs, executable database enforcement for cross-row invariants, canonical idempotency bytes, a closed conflict contract, multiple-conflict recovery, numeric/text capacity, or deterministic concurrency proof.

The most concrete failure path was a wizard opened in Company A while another tab changes the persisted Session to Company B. The existing dashboard transport can refresh an invalid Session and retry a request. Without a mutation-specific expected-workspace precondition and disabled auto-refresh, the final POST could be replayed under a different trusted Company than the wizard that composed it.

## 2. Impact Analysis

### Epic and story impact

Epic 4 remains viable and keeps its existing nine stories and order. Stories 4.1-4.7 need bounded domain inputs and explicit stale-resource behavior. Story 4.8 needs the authoritative security, idempotency, transaction, error, and database-enforcement contracts. Story 4.9 needs scope-safe submission and measurable recovery UX.

No later epic is invalidated. Epic 5 and Epic 6 consume stronger Project invariants but require no present story reordering. All Epic 4 stories remain `ready-for-dev`; `epic-4` remains `in-progress`.

### Artifact conflicts

- **PRD:** no conflict. MVP goals and functional scope are unchanged.
- **Epics:** acceptance criteria require a synchronized security/completeness addendum.
- **Architecture:** selected-Company preconditions, idempotency canonicalization, error details, transaction bounds, and PostgreSQL mechanisms require explicit decisions.
- **UX:** the story amendments make loss disclosure, dirty exit confirmation, multiple conflicts, unknown outcome, accessibility, and late-response behavior testable. A separate UX artifact change is unnecessary because the dedicated stories own these interaction contracts.
- **Code/infrastructure:** no code is changed by this proposal. Future Story 4.8/4.9 implementation will add headers, route rate limiting, migrations/triggers/indexes, generated contracts, and tests.

## 3. Recommended Approach

Use **Direct Adjustment** within Epic 4. This is lower risk than rollback or MVP reduction because implementation has not begun for these ready-for-dev stories, the product outcome is unchanged, and each finding fits an existing story boundary.

- **Effort:** Medium. Documentation changes are immediate; implementation effort is concentrated in Stories 4.8 and 4.9.
- **Risk after change:** Medium-low. Database concurrency and cross-tab authentication remain intrinsically sensitive, but now have closed contracts and deterministic tests.
- **Timeline impact:** no epic re-sequencing; expect additional implementation/test effort in finalization and recovery.

Rejected alternatives:

- Rollback is not useful because no Epic 4 implementation is being reverted.
- MVP reduction does not address authorization or atomicity risk.
- Backend/browser drafts, automatic post-refresh recovery, outbox/events, budget calculations, Break Template clock placement, and new labor/fuel compatibility rules are outside the approved scope.

## 4. Detailed Change Proposals

### Stories 4.1-4.7

**Before:** non-resumable workflow and domain fragments were described, but several loss, capacity, selection, stale-resource, and concurrency edges were implicit.

**After:** each story contains a mandatory hardening amendment with exact text/decimal/cardinality bounds, workspace expectations, safe conflict discrimination, paginated-selection behavior where relevant, and deterministic boundary/race tests.

**Rationale:** malformed or stale inputs must fail predictably before the aggregate transaction and remain recoverable without leaking tenant data.

### Story 4.8

**Before:** finalization required idempotency and serializable atomicity, while canonical hashing, error structures, transaction bounds, and several database constraints were described at a conceptual level.

**After:** finalization requires `X-Expected-Company-Id` as a non-authoritative precondition; versioned canonical bytes; completed-result idempotency; closed field/resource unions; strict JSON/body/collection/rate limits; three bounded serializable attempts; and an invariant matrix mapping composite foreign keys, partial unique indexes, row checks, and deferred constraint triggers to tests.

**Rationale:** the implementation must not rely on impossible cross-row `CHECK` constraints or underspecified replay behavior.

### Story 4.9

**Before:** the dashboard preserved one conflict or unknown result but did not fully close cross-tab refresh, multiple conflicts, revoked data, late responses, or post-loss guidance.

**After:** the final POST disables auth auto-refresh, sends the immutable expected Company header, consumes a closed action-result union, presents all authorized conflicts, freezes unknown outcomes for identical manual retry, isolates state by Company epoch, and ignores late prior-Company responses.

**Rationale:** browser recovery must remain useful without becoming an authorization authority or promising persistence that does not exist.

### Epics and architecture

**Before:** the high-level artifacts did not include the full trust-boundary and enforcement decisions.

**After:** `epics.md` mirrors the per-story hardening requirements and `architecture.md` records the finalization security contract.

## 5. Implementation Handoff

### Classification and owners

- **Moderate change.** Product Owner maintains acceptance parity and scope; Developer implements Stories 4.1-4.9; Architect reviews Story 4.8 migrations, canonicalization, transaction policy, and cross-tab trust boundary.
- QA must use real PostgreSQL barriers/latches for concurrency and Playwright/component tests for Company epoch, unknown outcome, multiple conflicts, accessibility, and single-flight behavior.

### Sequencing

1. Implement bounded local fragments and common fixtures in Stories 4.1-4.7.
2. Implement Story 4.8's route, schema, persistence, constraints, canonicalization, idempotency, transaction policy, errors, and generated contracts.
3. Implement Story 4.9's Server Action, disabled mutation refresh, recovery union, registry/detail reads, Company isolation, and browser tests.
4. Run contract drift, migration review, real-PostgreSQL concurrency, frontend accessibility, and end-to-end verification before closing Epic 4.

### Success criteria

- The dedicated story files and Epic 4 acceptance addendum are semantically aligned.
- No request can change Company through a refresh/replay path.
- Same-key replay and divergent payload behavior are deterministic.
- Every cross-row invariant has an executable PostgreSQL mechanism and a deterministic test.
- Conflict details are closed, authorized, multi-resource capable, and message-independent.
- Unknown outcomes remain retryable in memory without implying drafts or automatic recovery.
- Existing Stories 4.1-4.9 remain `ready-for-dev`; no product code or unrelated local change is modified by this course correction.

## Checklist Record

- [x] Trigger and evidence identified from the Epic 4 multi-discipline review and current Session refresh behavior.
- [x] Epic 4 and future-epic impact assessed; no new/reordered epic required.
- [x] PRD, epics, architecture, UX implications, testing, and documentation assessed.
- [x] Direct Adjustment selected; rollback and MVP reduction rejected.
- [x] Detailed artifact changes and exclusions documented.
- [x] User approval recorded by the explicit instruction to implement the plan.
- [x] Product Owner, Developer, Architect, and QA handoff responsibilities defined.
