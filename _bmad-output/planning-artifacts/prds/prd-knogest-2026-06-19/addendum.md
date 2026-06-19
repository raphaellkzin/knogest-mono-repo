---
title: Knogest PRD Addendum
status: final
created: 2026-06-19
updated: 2026-06-19
---

# Knogest PRD Addendum

This addendum preserves technical direction, source reconciliation, and future-depth decisions that should inform architecture without turning the PRD into an implementation specification.

## 1. Source Precedence and Reconciliation

1. The completed brainstorming session is the canonical source for product behavior.
2. `app.md` supplies original ecosystem vision and future RDO context, but later scope removals and refinements prevail.
3. The frontend work-creation wizard specification describes an existing local three-step UI. It does not define the final backend Project aggregate and must be reconciled against PRD FR-22 through FR-26.
4. The canonical cursor-pagination specification governs backend list contracts and is not restated in full here.
5. `annot.md` is intentionally excluded from PRD inputs.

## 2. Initial Architecture Direction

- Use one PostgreSQL database and shared schema for all Corporations.
- Carry `corporationId` on tenant-owned records and both `corporationId` and `companyId` on Company-owned records.
- Resolve Corporation from the normalized host before login.
- Persist revocable rotating Sessions; issue short-lived access credentials containing trusted Corporation, selected Company, User, and role claims.
- Treat Company change as a Session transition that issues replacement credentials.
- Organize backend ownership around Auth/Organization, Workforce, Commercial, Fleet, and Projects modules.
- Keep controllers responsible for transport and outer response envelopes; keep application handlers responsible for domain decisions and transactions.
- Pass trusted scope explicitly into repositories and handlers.
- Use composite relationships, partial unique indexes, transactions, and explicit commands to enforce ownership and temporal exclusivity.
- Store business instants in UTC and interpret them with `America/Sao_Paulo` in the MVP.

## 3. Canonical Pagination Direction

- All unbounded application lists use cursor pagination.
- Cursors are opaque, versioned, unpadded Base64URL values.
- Cursor payloads bind deterministic sort position, normalized query parameters, and trusted tenant/Company scope.
- Supported request fields include validated limit, cursor, optional search, allowlisted filters, sort field, and sort direction.
- Responses expose collection data and `pageInfo.hasNextPage` plus `pageInfo.nextCursor` inside the standard API response envelope.
- Invalid cursor shape, scope, filter fingerprint, or ordering returns a stable validation error.

## 4. Project Transaction Boundary

- The Project wizard generates one idempotency key per browser wizard session.
- Finalization validates the current authenticated scope, required Project fields, responsibility eligibility, active Client, schedule, optional allocations, and optional Project Fuel Agreements inside one transaction.
- A successful commit creates the `PLANNED` Project and all selected relationships.
- A conflict rolls back everything and returns only the conflicting resource identifiers needed for browser recovery.
- Leaving the wizard before finalization creates no backend draft.

## 5. Temporal Integrity Direction

- Employment, allocation, Machine ownership, management, technical responsibility, Client relationship, price, and baseline history use effective dated periods or revisions.
- Ordinary commands take effect immediately using server timestamps; scheduling and backdating are deferred.
- Closed periods are immutable and never reopened.
- Current state is derived from one open period or latest effective revision, while historical records remain explicit.
- Deletion removes current operational eligibility but never rewrites referenced history.

## 6. Future RDO Compatibility

The MVP does not implement RDO, but its model must remain compatible with these accepted future rules:

- A Project has at most one open shift at a time, though multiple sequential shifts may belong to one business date.
- An actual shift may cross midnight and belongs to the business date on which it starts.
- Break Templates are suggestions; closure confirms, edits, removes, or adds actual break instances.
- Net worked time equals actual shift duration minus confirmed breaks.
- Employee overtime aggregates net time across all shifts for the Person and business date, then compares it once with the effective daily workload.
- Machine shift participation preserves start and final Meter Readings and their continuity.

## 7. Deferred Architecture Decisions

- Access credentials last 15 minutes; refresh idle expiration is 7 days; absolute Session lifetime is 30 days; refresh rotates on every use in a host-only `Secure`, `HttpOnly`, `SameSite=Lax` cookie.
- Persist CPF/CNPJ encrypted, maintain a normalized keyed hash for equality and active uniqueness, mask by default, exclude from logs/tokens/cursors, and restrict full display to authorized create/edit/detail flows. Document purpose, legal basis, and retention before entering real pilot data.
- Compensation modes are fixed as daily, hourly, weekly, fortnightly, and monthly; monetary terms use BRL with two decimal places.
- A future Company job-role catalog, if operational vocabulary later becomes stable enough to justify one.
- Pilot Fuel Type catalog is Diesel S10 and Diesel S500; Project prices use BRL per liter with four decimal places.
- Architecture owner must define wizard resource-count and request-size limits before implementing FR-26.
- Historical dashboard inspection is limited to Project, Employee, and Machine detail views; consolidated reporting and export are deferred.
- Generic audit log, broader roles, and mobile offline synchronization.

## 8. Landscape Context

Current construction products reinforce the value of connected office/field data, digital daily records, resource visibility, traceability, and offline mobile operation. This supports the future Knogest ecosystem direction while leaving those field capabilities outside the internal pilot:

- [Sienge Construpoint](https://sienge.com.br/construpoint/)
- [Mobuss Diario de Obras](https://www.mobussconstrucao.com.br/modulo/diario-de-obras/)
