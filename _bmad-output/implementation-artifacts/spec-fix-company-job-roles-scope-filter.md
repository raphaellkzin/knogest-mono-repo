---
title: 'Fix company job-role listing scope filter'
type: 'bugfix'
created: '2026-07-13'
status: 'in-progress'
baseline_commit: '2b6d871'
context:
  - '{project-root}/main-api/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `GET /api/v1/job-roles` forwards authentication-only `actorUserId` and `sessionId` fields into Prisma's `JobRole` filter, which rejects them and makes the Employees page fail with a 500 response.

**Approach:** Filter the job-role catalog only by its persisted company scope and cover the authenticated route with an integration regression test.

## Boundaries & Constraints

**Always:** Keep job roles scoped by authenticated `corporationId` and `companyId`, preserve response fields and ordering, and retain company isolation.

**Ask First:** Any change to authorization rules, job-role schema, OpenAPI contracts, generated clients, or frontend behavior.

**Never:** Persist user/session identifiers on `JobRole`, weaken company scoping, or modify unrelated committed frontend work.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Authenticated listing | Valid JWT contains company, user, and session IDs | API returns the active company's roles in name/id order | No Prisma validation error |
| Other-company catalog entry | Same Corporation, different active company | Entry is absent from the response | No cross-company data exposure |

</frozen-after-approval>

## Code Map

- `main-api/src/modules/workforce/handlers/workforce.handler.ts` -- applies the persisted `JobRole` company filter.
- `main-api/tests/integration/workforce/workforce-registry.test.ts` -- provisions authenticated company data and verifies Workforce routes.

## Tasks & Acceptance

**Execution:**
- [ ] `main-api/src/modules/workforce/handlers/workforce.handler.ts` -- use only `corporationId` and `companyId` in the Prisma `where` input.
- [ ] `main-api/tests/integration/workforce/workforce-registry.test.ts` -- add an authenticated list-job-roles regression and company-isolation assertion.

**Acceptance Criteria:**
- Given an authenticated company request, when `GET /api/v1/job-roles` runs, then it returns 200 rather than a Prisma validation failure.
- Given roles exist in two companies of one Corporation, when one company lists roles, then only its own role is returned.

## Spec Change Log

## Verification

**Commands:**
- `pnpm --dir main-api test:integration -- workforce-registry.test.ts` -- expected: Workforce registry integration suite passes.
- `pnpm --dir main-api typecheck` -- expected: TypeScript validation passes.
- `pnpm --dir main-api lint` -- expected: lint and architecture checks pass.
