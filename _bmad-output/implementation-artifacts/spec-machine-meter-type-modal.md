---
title: 'Machine meter type and operational registration modal'
type: 'feature'
created: '2026-07-11'
status: 'done'
baseline_commit: '0f781cc'
context:
  - 'main-web-app/CLAUDE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Machines currently store only a numeric reading, so the registry cannot distinguish hour-meter readings from distance readings. Its creation dialog also diverges from the operational modal pattern used by employees and commercial registries.

**Approach:** Persist an immutable machine meter type, expose it across the Fleet contract, and rebuild the creation dialog with the shared operational modal anatomy.

## Boundaries & Constraints

**Always:** Require plate or company tag; require `HOUR_METER` or `ODOMETER` on create; keep readings decimal strings over the API and `numeric(14,2)` in persistence; preserve the user's uncommitted commercial-registry edit.

**Ask First:** Changes to an existing machine's meter type or any conversion between hours and kilometres.

**Never:** Add a meter unit to individual reading commands, change allocation/RDO rules, or add structural masks for plate and company tag.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| New hour-meter machine | `meterType=HOUR_METER`, valid tag/plate and decimal | Atomic registration and displayed `h` value | Validation feedback preserves form values |
| New odometer machine | `meterType=ODOMETER`, valid tag/plate and decimal | Atomic registration and displayed `km` value | Validation feedback preserves form values |
| Missing/invalid meter type | Omitted or unsupported enum | Request rejected before persistence | Stable validation error |
| Later reading command | Existing machine with either type | Reading remains in its machine's immutable unit | Unit cannot be supplied or changed |

</frozen-after-approval>

## Code Map

- `main-api/prisma/schema.prisma` and migrations -- Fleet persistence invariants.
- `main-api/src/modules/fleet/**` -- DTO, OpenAPI, service and view models.
- `main-web-app/src/features/machines/**` -- generated-client adapter, modal, registry and detail presentation.

## Tasks & Acceptance

**Execution:**
- [x] Persist and expose immutable machine meter type, then regenerate Prisma/OpenAPI/Kubb artifacts.
- [x] Move machine creation to `OperationsModal` and `FormSection` with a fixed action footer and accessible meter selector.
- [x] Format displayed readings using their persisted unit and cover API/UI paths with focused tests.
- [x] Update Fleet story context to preserve the invariant for current and future reading work.

**Acceptance Criteria:**
- Given a valid machine create request, when it contains either supported meter type, then the machine and initial reading are committed atomically and every returned registry/detail view contains that type.
- Given a registered machine, when a reading is displayed, then its decimal value is rendered in Brazilian format with `h` or `km` derived from the machine.
- Given the creation modal, when users submit, cancel, switch meter type, or encounter an error, then its fixed footer, labels, focusable selector, and form recovery follow the established operational modal pattern.

## Design Notes

`meterType` belongs to `Machine`, not `MachineMeterReading`: a machine has one immutable measurement basis, while the reading chain retains only values and audit metadata. This prevents mixed-unit chains without duplicating data.

## Verification

**Commands:**
- `pnpm --dir main-api db:generate && pnpm --dir main-api generate:openapi && pnpm --dir main-web-app generate:api` -- generated artifacts match contracts.
- `pnpm --dir main-api typecheck && pnpm --dir main-api test && pnpm --dir main-web-app typecheck && pnpm --dir main-web-app test` -- type and focused behavior coverage pass.
