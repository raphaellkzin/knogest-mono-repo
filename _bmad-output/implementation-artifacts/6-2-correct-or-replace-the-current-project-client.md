# Story 6.2: Correct or Replace the Current Project Client

Status: ready-for-dev

<!-- Note: Validated against the bmad-create-story checklist before handoff. -->

## Story

As a Master Administrator,
I want to correct or replace the Client associated with a Project,
so that the current contracting party is accurate without erasing earlier relationships.

## Acceptance Criteria

1. **Given** a `PLANNED` Project in the selected Company, **when** a different eligible Client is selected, **then** the existing open setup association is updated without creating another historical Client period and exactly one current Client remains.
2. **Given** an `ACTIVE` or `PAUSED` Project, **when** a different eligible Client is selected, **then** a trimmed non-blank reason is required and the current `ProjectClientPeriod` closes while a successor opens at the same server transaction instant.
3. **Given** replacement commits, **when** current detail and dedicated history are queried, **then** detail returns the new Client and all earlier periods remain immutable and appear in deterministic `effectiveFrom` plus `id` order.
4. **Given** the selected Client is inactive, removed, foreign to the selected Company/Corporation, or missing, **when** replacement is attempted, **then** the response does not disclose foreign existence and the current relationship is unchanged.
5. **Given** the selected Client is already current, **when** the command is submitted, **then** a stable semantic no-op response is returned and no duplicate period is created.
6. **Given** a `COMPLETED` or `CANCELLED` Project, **when** correction/replacement is attempted, **then** a stable terminal conflict is returned and Client history is unchanged.
7. **Given** concurrent commands replace the same current Client, **when** they race, **then** at most one successor commits from the expected period and the loser receives a safe stale-state conflict.
8. **Given** the Client selector searches or paginates, **when** results are returned, **then** only active, non-removed selected-Company Clients appear through canonical cursor pagination and CNPJ/CPF remains masked.
9. **Given** a recoverable conflict reaches the dashboard, **when** the Client became unavailable or stale, **then** entered reason and unrelated form state remain and the stable response maps to a safe reselection action.
10. **Given** a foreign or missing Project is targeted, **when** replacement is attempted, **then** existence is not disclosed and no Client period changes.
11. **Given** the feature is tested, **when** real-PostgreSQL, concurrency, frontend, and Playwright suites run, **then** they cover planned correction, effective replacement, reason, no-op, eligibility, terminal state, races, current/history, masking, cursor behavior, tenant isolation, and exactly one open Client period.

## Tasks / Subtasks

- [ ] Define Client-period audit and command contracts (AC: 1-6, 10)
  - [ ] Extend `ProjectClientPeriod` in a forward migration with trusted actor and nullable reason; preserve scoped composite foreign keys, half-open periods, and the existing partial unique current-period index.
  - [ ] Add a strict command containing `clientId` and optional `reason`; require reason according to authoritative lifecycle state inside the service, not client-supplied status.
  - [ ] Define stable no-op, ineligible/unavailable, terminal, stale-state, and workspace conflict categories in the canonical envelope. Foreign/missing resources must not be identified in structured details.
- [ ] Implement lifecycle-aware Client replacement (AC: 1-7, 10)
  - [ ] Add `POST /api/v1/projects/:projectId/client-replacements` with Company-scoped Fastify/OpenAPI contracts and generated Kubb client.
  - [ ] In one serializable transaction, reread Session/Company/role, scoped Project/current period, and active/non-removed Client eligibility; capture one server instant.
  - [ ] For `PLANNED`, conditionally update the single setup period; for `ACTIVE`/`PAUSED`, conditionally close the expected period and open its successor at the same instant.
  - [ ] Reject terminal/no-op/ineligible targets before persistence and translate concurrent conditional/constraint failures into stable conflicts without leaking database details.
- [ ] Add selector, current detail, history, and recovery UX (AC: 3, 8-9)
  - [ ] Reuse the canonical Commercial Client endpoint for the selector with selected-Company active filters and masked document view; do not build an unbounded bespoke list.
  - [ ] Extend Project current detail with the current Client and expose Client periods through the dedicated cursor-paginated history handler/DTO introduced with Epic 6 history work.
  - [ ] Add the replacement form to Project detail, require reason after activation, preserve inputs after recoverable failures, and revalidate only after confirmed success.
- [ ] Prove relationship integrity (AC: 1-11)
  - [ ] Add DTO/service and real-PostgreSQL tests for lifecycle matrix, audit, immutable closed periods, eligibility, non-enumeration, tenant isolation, and exactly one current Client.
  - [ ] Add barrier-based concurrent replacement tests and assert winner/loser behavior without sleeps.
  - [ ] Add frontend schema/action/selector tests and Playwright coverage; regenerate/check Prisma, OpenAPI, Kubb, types, tests, and builds.

## Dev Notes

### Developer Context

- `PLANNED` is a setup correction and updates the one existing open association. After activation, replacement is temporal and never rewrites history.
- Client eligibility must be read authoritatively at commit time. A selector result is not authorization or a concurrency guarantee.
- Masking and non-enumeration are separate requirements: mask documents in valid selector rows and return generic unavailable behavior for foreign/missing identifiers.

### Architecture Compliance

- Projects owns the Project-to-Client period; Commercial owns Client eligibility and lookup. Reuse its public query/service boundary rather than duplicating Client rules.
- Use Session-derived tenant scope, one server timestamp, half-open periods, serializable execution, bounded `P2034` retry, partial unique current-row enforcement, and stable error translation.
- Keep current detail and history as separate named contracts. Every unbounded collection uses canonical opaque cursor pagination.
- OpenAPI is authoritative and Kubb output is generated/server-only. Do not manually edit generated Prisma/Kubb artifacts or upgrade pinned dependencies.

### Current Files to Reconcile and Preserve

- `main-api/prisma/schema.prisma`: `ProjectClientPeriod` has temporal fields but lacks actor/reason. Extend via a new migration; preserve the current-period unique index and scoped FKs in the existing Projects aggregate migration.
- `main-api/src/modules/projects/{projects.dto.ts,projects.service.ts,projects.controller.ts}`: add a separate replacement slice while preserving finalization/list/detail behavior and existing transaction/scope helpers.
- `main-api/src/modules/commercial`: reuse active/non-removed, Company-scoped Client semantics and masked list contract; do not couple Projects to a controller handler.
- `main-web-app/src/features/projects/projects.server.ts`: wizard options fetch up to 100 Clients and are unsuitable as the canonical replacement selector for an unbounded collection; add cursor-backed adapter behavior.
- `main-web-app/src/features/projects/{projects-schema.ts,projects.actions.ts}` and `components/project-detail.tsx`: add a dedicated form/action and stable conflict mapping without disturbing wizard state.
- `main-web-app/src/app/home/obras/[projectId]/page.tsx`: preserve authorization/error semantics when composing detail, history, and selector data.

### Previous Story Intelligence

- Story 6.1 establishes the common audit migration, Projects mutation transaction pattern, current/history separation, and lifecycle conflict vocabulary. Reuse those decisions instead of creating a second mechanism.
- The existing wizard masks Client documents and scopes the initial association; replacement must preserve those protections while switching to cursor-backed selection.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-62-Correct-or-Replace-the-Current-Project-Client]
- [Source: _bmad-output/planning-artifacts/prds/prd-knogest-2026-06-19/prd.md#FR-32-Replace-Current-Client]
- [Source: _bmad-output/planning-artifacts/architecture.md#Temporal-Modeling]
- [Source: _bmad-output/planning-artifacts/architecture.md#Current-and-Historical-Queries]
- [Source: _bmad-output/implementation-artifacts/6-1-revise-the-project-budget-and-planned-dates.md]
- [Source: main-api/prisma/schema.prisma#ProjectClientPeriod]
- [Source: main-api/src/modules/projects/projects.service.ts]
- [Source: main-web-app/src/features/projects/projects.server.ts]

## Dev Agent Record

### Agent Model Used

OpenAI Codex (GPT-5)

### Debug Log References

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.

### File List

