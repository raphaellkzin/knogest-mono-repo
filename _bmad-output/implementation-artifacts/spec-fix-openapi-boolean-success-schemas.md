---
title: 'Fix OpenAPI boolean success schemas'
type: 'bugfix'
created: '2026-07-02'
status: 'in-review'
baseline_commit: '55ee5f44a53f0d8b22cb32cd3d45a545d8824429'
context:
  - '{project-root}/main-web-app/docs/API_CLIENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Project and fuel-type response schemas declare boolean constants without an explicit boolean type. Fastify emits untyped single-value enums, causing Kubb to generate string-only Zod enums that reject the API's real boolean `success` values and make `/home/obras` fail with HTTP 500.

**Approach:** Add the missing OpenAPI boolean type at the backend schema source, regenerate the canonical OpenAPI document and all Kubb clients, and verify the generated runtime validators accept boolean literals.

## Boundaries & Constraints

**Always:** Change source route schemas before regenerating artifacts; preserve the response wire format and existing literal semantics; include both success and error envelopes for Projects and the affected Fuel Types success response; preserve unrelated generated output.

**Ask First:** Any dependency upgrade, OpenAPI version change, or expansion beyond the identified untyped boolean constants.

**Never:** Manually patch files under `main-web-app/src/generated`; coerce API booleans into strings; remove client response validation; change endpoint payload shapes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Project success | API returns `{ success: true, message, data }` | Generated schema uses `z.literal(true)` and accepts the response | A non-boolean success value remains rejected |
| Project error | API returns `{ success: false, ... }` | Generated error schema uses `z.literal(false)` | A string `"false"` remains rejected |
| Fuel type success | API returns `{ success: true, message, data }` | Generated schema uses `z.literal(true)` and accepts the response | A string `"true"` remains rejected |

</frozen-after-approval>

## Code Map

- `main-api/src/modules/projects/projects.controller.ts` -- defines the shared success and error OpenAPI response envelopes used by all Project endpoints.
- `main-api/src/modules/commercial/commercial.controller.ts` -- defines the inline Fuel Types success response schema.
- `main-api/artifacts/openapi.json` -- canonical generated OpenAPI 3.0.3 document consumed by the frontend.
- `main-web-app/kubb.config.ts` -- configures Kubb TypeScript, client, and Zod generation from the canonical document.
- `main-web-app/src/generated` -- generated models, clients, and runtime validators; regeneration output only.

## Tasks & Acceptance

**Execution:**
- [x] `main-api/src/modules/projects/projects.controller.ts` -- add `type: "boolean"` to the `true` and `false` response constants so OpenAPI preserves their primitive type.
- [x] `main-api/src/modules/commercial/commercial.controller.ts` -- add `type: "boolean"` to the Fuel Types success constant for the same contract consistency.
- [x] `main-api/artifacts/openapi.json` -- regenerate from Fastify and confirm affected properties contain both boolean type and boolean enum values.
- [x] `main-web-app/src/generated` -- regenerate with Kubb and confirm affected schemas use boolean literals rather than string enums.

**Acceptance Criteria:**
- Given the corrected backend schemas, when OpenAPI is generated, then every affected `success` property is represented as a boolean enum rather than an untyped enum.
- Given the regenerated OpenAPI artifact, when Kubb generation runs, then no generated schema contains `success: z.enum(["true"])` or `success: z.enum(["false"])`.
- Given an actual Projects list response with boolean `success: true`, when `getApiV1ProjectsQueryResponseSchema.parse` runs, then validation succeeds.
- Given all generated files are current, when drift and validation checks run, then they complete successfully without unrelated source edits.

## Spec Change Log

## Design Notes

OpenAPI 3.0 represents the Fastify `const` constraint as a single-value `enum`. Kubb can preserve that literal as `z.literal(true|false)` only when the schema also carries `type: "boolean"`; therefore the durable correction belongs in the route schema, upstream of both generators.

## Verification

**Commands:**
- `pnpm --dir main-api generate:openapi` -- expected: canonical artifact regenerates successfully.
- `pnpm --dir main-web-app generate:api` -- expected: Kubb clients regenerate successfully.
- `pnpm --dir main-api check:openapi` -- expected: no OpenAPI drift.
- `pnpm --dir main-web-app validate:api` -- expected: canonical OpenAPI validates.
- `pnpm --dir main-web-app check:api` -- expected: no generated-client drift.
- `rg -n 'success.*z\.enum\(\["(true|false)"\]\)' main-web-app/src/generated/zod` -- expected: no matches.
