# Edge Case Hunter Review Prompt

Use the `bmad-review-edge-case-hunter` skill against the current working-tree diff from baseline commit `d77150400de651cde4c3806b728faf0355d66d53`.

Inspect every branch and boundary affected by:

- `main-web-app/src/features/projects/projects.server.ts`
- `main-web-app/src/lib/api/server-client.ts`
- `main-web-app/src/lib/api/api-client-error.ts`
- `main-web-app/src/lib/api/api-client-error.test.ts`

Focus on Commercial versus Workforce query-contract differences, active-record eligibility, error-envelope shapes, JavaScript `Error` semantics, compatibility of existing imports and `instanceof`, and any remaining path by which Axios request headers or bearer tokens could be retained or logged. Report only unhandled edge cases with severity, evidence, and a minimal fix direction.
