# Input Reconciliation: Canonical Cursor Pagination Specification

## Coverage

PRD FR-6 and NFR-10 through NFR-12 require the canonical cursor contract for every table and unbounded collection. `addendum.md` preserves cursor opacity, versioning, Base64URL encoding, deterministic sorting, query and scope binding, response page information, and validation behavior.

## Gaps

- Runtime alignment tasks identified by the pagination specification remain implementation work rather than PRD requirements.
- Endpoint-specific filter and sort allowlists must be defined by each module during architecture and story creation.
- Fixed bounded reference catalogs may opt out only when their hard maximum and non-paginated contract are explicit.
