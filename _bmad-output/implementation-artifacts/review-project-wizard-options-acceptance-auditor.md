# Acceptance Auditor Review Prompt

Audit the current working-tree diff from baseline commit `d77150400de651cde4c3806b728faf0355d66d53` against:

- `_bmad-output/implementation-artifacts/spec-project-wizard-options-safe-api-errors.md`
- `_bmad-output/implementation-artifacts/4-3-select-the-client-and-project-responsibilities.md`
- `_bmad-output/implementation-artifacts/4-7-configure-optional-project-fuel-agreements.md`

Read the repository as needed. Verify every task, acceptance criterion, frozen boundary, and verification claim. Pay particular attention to:

- Supported generated query parameters for Clients, Employees, and Fuel Suppliers.
- Existing backend active-only predicates and selected-Company scope.
- Safe `name` and masked-document view-model mapping.
- Preservation of `ApiClientError` imports, `instanceof`, `message`, `status`, `code`, and `data`.
- Proof that raw Axios request/response/configuration and bearer credentials are no longer retained through `cause`.
- Whether tests, typecheck, and lint actually prove the stated behavior.

Return findings with severity, evidence (`path:line`), classification suggestion (`intent_gap`, `bad_spec`, `patch`, `defer`, or `reject`), and the smallest safe remediation.
