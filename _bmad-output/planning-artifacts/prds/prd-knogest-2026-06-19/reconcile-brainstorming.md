# Input Reconciliation: Completed Brainstorming

## Coverage

The PRD captures the accepted MVP boundary, tenant and Company isolation, authentication scope, temporal workforce and fleet models, commercial registries, Project wizard, Project lifecycle, resource reservation, baselines, schedules, fuel pricing, deletion, pagination, and deferred RDO compatibility.

## Canonical Conflict Handling

- Empty Corporation is valid; mandatory initial Company is superseded.
- Clients are Company-scoped in the MVP; corporation-wide aggregate Client visibility is superseded.
- Project creation produces `PLANNED`, not `ACTIVE`.
- Project fuel terms supersede supplier-level fuel pricing.
- One daily schedule window supersedes multiple schedule intervals.
- Sequential shifts supersede parallel Project shifts.

## Gaps

- The seven brainstorming Open Questions are preserved in PRD section 11 and must be triaged before finalization or assigned an owner and revisit condition.
- Full future RDO detail is intentionally moved to `addendum.md` because it is outside the MVP.
