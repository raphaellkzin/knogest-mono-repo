---
title: 'Company Job Roles and Confirmed Project Allocation'
type: 'feature'
created: '2026-07-11'
status: 'done'
baseline_commit: '5591a0a78a1d6c724cf264005e1a8003d1d3a90e'
context:
  - '{project-root}/main-api/AGENTS.md'
  - '{project-root}/main-web-app/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Employee functions are currently free text on every project allocation, while employee registration has no predefined function. Payments and daily workload are silently defaulted in the Project wizard instead of being consciously set for the work assignment.

**Approach:** Give each Company a managed function catalog and a current function per Employment. Project allocations explicitly confirm the current function, preserve its name as historical context, and continue to capture workload and payment terms per Project.

## Boundaries & Constraints

**Always:** Functions are Company-scoped, active-only for new use, normalized for duplicate prevention, and preserved in historical allocation snapshots. Employee creation requires an active function; a function change requires a reason and does not rewrite an open allocation. Project creation, allocation, and reallocation must confirm the current Employment function while retaining workload, payment mode, compensation value, and overtime rate on the allocation. API contracts remain OpenAPI-generated and all tenant scope derives from the authenticated context.

**Ask First:** Expand the feature to role-based permissions, qualification/engineering eligibility, a periodic payroll ledger, or automatic propagation of a function change into Project allocations.

**Never:** Backfill missing functions as "Operacional"; alter historical allocation labels after a catalog rename; allow an inactive or foreign function for a new Employment/allocation; introduce a separate client-side API contract.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Create employee | Active Company function selected or created inline | Person, Employment, initial role period, and valid role selection are persisted | Duplicate/invalid/inactive role returns stable validation/conflict response |
| Change function | Active Employment with a new active Company function and reason | Current role period closes; new one opens; open allocation keeps prior snapshot and requires reconfirmation | Same, foreign, inactive, or terminated target is rejected without mutation |
| Finalize Project | Allocation includes current confirmed role-period id and payment terms | API snapshots the confirmed role name and creates the allocation atomically | Stale/missing role confirmation returns resource conflict for the Team wizard step |
| Existing Employment | Migrated row has no role period | Visible as function pending and cannot enter a new operational allocation | Existing history stays readable and unchanged |

</frozen-after-approval>

## Code Map

- `main-api/prisma/schema.prisma` and a forward migration -- Company role catalog, Employment role periods, allocation confirmation reference, and legacy-safe migration.
- `main-api/src/modules/workforce/*` -- role catalog and Employment role lifecycle DTOs, controllers, services, handlers, and employee response models.
- `main-api/src/modules/projects/*` -- confirmed role-period validation, idempotent command shape, OpenAPI schema, and allocation snapshots.
- `main-web-app/src/features/employees/*` and `src/app/home/configuracoes/page.tsx` -- role management, employee registration selection/quick create, and role visibility.
- `main-web-app/src/features/projects/*` -- Team-step confirmation and visible work/payment terms.
- `main-api/tests/integration/workforce/*`, `main-web-app/src/features/projects/projects-schema.test.ts`, and `main-web-app/tests/e2e/*` -- contract, integration, and journey coverage.

## Tasks & Acceptance

**Execution:**

- [x] `main-api/prisma/schema.prisma` and `main-api/prisma/migrations/` -- add the scoped catalog and role-period model, preserve legacy Employments as pending, and retain allocation role snapshots.
- [x] `main-api/src/modules/workforce/` -- implement role catalog CRUD, role assignment/change lifecycle, active-role validation, normalized uniqueness, and enriched employee DTOs.
- [x] `main-api/src/modules/projects/` -- replace free-text allocation role input with a confirmed role-period id; validate it transactionally and snapshot the current role label.
- [x] `main-api/artifacts/openapi.json` and `main-web-app/src/generated/` -- regenerate canonical transport contract and clients after backend route changes.
- [x] `main-web-app/src/app/home/configuracoes/page.tsx` and employee feature files -- create accessible Company-role management plus required role selection during employee registration.
- [x] `main-web-app/src/features/projects/` -- render confirmed function details alongside workload and payment inputs; preserve valid values and return a Team conflict for stale roles.
- [x] tests -- cover DTO contract changes and decimal validation; full browser/integration coverage remains for CI with a real database/browser.

**Acceptance Criteria:**

- Given a Company administrator creates or selects a role, when a new employee is saved, then the employee has exactly one current function period and the list/detail show it.
- Given a role is renamed or deactivated, when historical allocation detail is viewed, then its confirmed function label remains unchanged; deactivated roles are unavailable to new use.
- Given an open allocation and a subsequent Employee function change, when the Project is viewed or changed, then its original role remains historical and the new role needs explicit reconfirmation.
- Given a Project wizard employee selection, when the administrator has not confirmed the displayed function, then the Team step cannot submit; once confirmed, workload and payment terms are required and persisted with the allocation.
- Given an Employment without a current function period, when selected for a new operational allocation, then it is rejected/disabled with a clear remediation message.

## Design Notes

- Settings is the administrative source of truth; employee registration exposes a short inline create path without making the user leave the form.
- The Team step uses an expanded selected-employee row: immutable function label with a confirmation control, followed by editable workload and payment terms. This makes the allocation conditions visible rather than hiding defaults.

## Verification

**Commands:**

- `pnpm --dir main-api typecheck && pnpm --dir main-api lint && pnpm --dir main-api test` -- API compiles, lints, and tests pass.
- `pnpm --dir main-web-app typecheck && pnpm --dir main-web-app lint && pnpm --dir main-web-app test` -- dashboard contract/UI tests pass.
- `pnpm --dir main-api generate:openapi && pnpm --dir main-web-app generate:api` -- OpenAPI and generated clients have no unexpected drift.
- relevant integration and Playwright suites -- role lifecycle and wizard confirmation pass against the real database/browser flow.

## Suggested Review Order

**Data lifecycle and safety**

- Defines the company catalog, effective role history, and immutable allocation reference.
  [schema.prisma:356](../../main-api/prisma/schema.prisma#L356)

- Creates the forward-only database constraints without inventing roles for existing workers.
  [migration.sql:1](../../main-api/prisma/migrations/20260711120000_company_job_roles/migration.sql#L1)

- Validates the role before creating an Employment and manages effective role transitions.
  [workforce.handler.ts:254](../../main-api/src/modules/workforce/handlers/workforce.handler.ts#L254)

**API contract and allocation validation**

- Exposes catalog management and explicit employee-function changes through the Workforce API.
  [workforce.controller.ts:286](../../main-api/src/modules/workforce/workforce.controller.ts#L286)

- Requires a current active role-period confirmation and snapshots its label atomically.
  [projects.service.ts:153](../../main-api/src/modules/projects/projects.service.ts#L153)

- Makes confirmed role periods part of the typed Project command.
  [projects.dto.ts:96](../../main-api/src/modules/projects/projects.dto.ts#L96)

**Operational interface**

- Makes function confirmation and allocation payment terms visible and editable in the Team step.
  [project-wizard.tsx:299](../../main-web-app/src/features/projects/components/project-wizard.tsx#L299)

- Provides central function management with rename and safe deactivation actions.
  [job-roles-settings.tsx:4](../../main-web-app/src/features/job-roles/job-roles-settings.tsx#L4)

- Shows current/pending functions and supports creating a missing catalog option during registration.
  [employees-page.tsx:148](../../main-web-app/src/features/employees/components/employees-page.tsx#L148)

**Contract and regression coverage**

- Regenerated API contract reflects role-period confirmation and catalog routes.
  [openapi.json:3792](../../main-api/artifacts/openapi.json#L3792)

- DTO regression cases require a valid function when creating an employee.
  [workforce.dto.test.ts:7](../../main-api/src/modules/workforce/workforce.dto.test.ts#L7)
