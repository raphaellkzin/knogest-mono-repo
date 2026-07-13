---
title: 'Move work creation into the table header'
type: 'refactor'
created: '2026-07-13'
status: 'done'
route: 'one-shot'
---

# Move work creation into the table header

## Intent

**Problem:** The work-creation action was visually detached from the listing controls, unlike the employee registry, making the page hierarchy inconsistent.

**Approach:** Keep the existing creation wizard and place its trigger in the table toolbar beside search, without adding statistic cards.

## Suggested Review Order

- The toolbar now groups search and creation as one table-level action area.
  [`projects-registry.tsx:32`](../../main-web-app/src/features/projects/components/projects-registry.tsx#L32)

- The existing wizard trigger is reused, preserving the creation flow and its behavior.
  [`projects-registry.tsx:55`](../../main-web-app/src/features/projects/components/projects-registry.tsx#L55)
