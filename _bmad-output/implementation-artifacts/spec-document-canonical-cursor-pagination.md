---
title: "Document Canonical Cursor Pagination"
type: "chore"
created: "2026-06-19"
status: "done"
route: "one-shot"
---

# Document Canonical Cursor Pagination

## Intent

**Problem:** The backend had partial cursor helpers but no authoritative pagination contract, and its shared types and Swagger shape disagreed.

**Approach:** Define one implementable cursor-pagination specification for all unbounded lists, connect it to backend guidance, and gate module implementation until shared runtime infrastructure is aligned.

## Suggested Review Order

**Canonical Contract**

- Start with the compatibility gate and applicability boundary.
  [`PAGINATION.md:3`](../../main-api/docs/PAGINATION.md#L3)

- Confirm canonical request parameters and invalidation behavior.
  [`PAGINATION.md:11`](../../main-api/docs/PAGINATION.md#L11)

- Review response ownership and the `pageInfo` envelope.
  [`PAGINATION.md:28`](../../main-api/docs/PAGINATION.md#L28)

**Cursor Integrity**

- Inspect the strict Base64URL cursor representation.
  [`PAGINATION.md:61`](../../main-api/docs/PAGINATION.md#L61)

- Verify deterministic query and trusted-scope binding.
  [`PAGINATION.md:88`](../../main-api/docs/PAGINATION.md#L88)

- Check exact ascending and descending boundary semantics.
  [`PAGINATION.md:109`](../../main-api/docs/PAGINATION.md#L109)

**Module Adoption**

- Follow layer ownership and conditional tenancy rules.
  [`PAGINATION.md:122`](../../main-api/docs/PAGINATION.md#L122)

- Apply the list-handler convention without double envelopes.
  [`MODULE_PATTERN.md:46`](../../main-api/docs/MODULE_PATTERN.md#L46)

- Validate strict query keys, limits, and sorting names.
  [`VALIDATION.md:29`](../../main-api/docs/VALIDATION.md#L29)

**Supporting Guidance**

- Make pagination guidance mandatory for backend agents.
  [`AGENTS.md:16`](../../main-api/AGENTS.md#L16)

- Surface the new required architecture document.
  [`README.MD:12`](../../main-api/README.MD#L12)

- Track runtime alignment separately from this documentation change.
  [`deferred-work.md:3`](deferred-work.md#L3)
