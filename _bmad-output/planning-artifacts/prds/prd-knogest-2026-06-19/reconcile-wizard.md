# Input Reconciliation: Work Creation Wizard Specification

## Reusable Intent

The PRD preserves the guided flow, per-step validation, value retention while open, responsive progress, review-before-submit, failure recovery, and deterministic reset expectations.

## Material Conflicts

- The existing wizard specification is frontend-only and inserts local records; the PRD requires backend atomic and idempotent finalization.
- Its three small steps do not cover the complete Project aggregate required by FR-22 through FR-26.
- Its local `status` and `progress` fields do not represent the canonical `PLANNED` lifecycle or deferred production intelligence.
- Its instruction to ask before backend integration is superseded by this approved MVP PRD.

## Required Follow-Up

- Re-specify the frontend wizard against the final backend contract while preserving the existing accessible wizard engine and visual shell.
