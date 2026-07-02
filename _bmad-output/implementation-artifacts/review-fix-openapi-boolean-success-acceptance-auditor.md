# Acceptance Auditor Review Prompt

Audit the complete change since baseline `55ee5f43ae29518cb062a285aa96e54ea295223c` against:

- `_bmad-output/implementation-artifacts/spec-fix-openapi-boolean-success-schemas.md`
- `main-web-app/docs/API_CLIENTS.md`

Inspect the tracked diff with:

```sh
git diff 55ee5f43ae29518cb062a285aa96e54ea295223c -- main-api/src/modules/projects/projects.controller.ts main-api/src/modules/commercial/commercial.controller.ts main-api/artifacts/openapi.json
```

Also inspect the regenerated ignored files under `main-web-app/src/generated`. Report only concrete violations of acceptance criteria, frozen constraints, or context rules. Include file and line, severity, and remediation.
