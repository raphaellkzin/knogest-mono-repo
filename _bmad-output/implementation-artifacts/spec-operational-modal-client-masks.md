---
title: 'Reusable operational modal and commercial registration masks'
type: 'feature'
created: '2026-07-11'
status: 'done'
baseline_commit: '18f6775af99fbbc65e058da9724aad5cc8af0200'
context:
  - '{project-root}/main-web-app/AGENTS.md'
  - '{project-root}/main-web-app/docs/STYLING.md'
  - '{project-root}/main-web-app/docs/COMPONENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The employee creation form is the newer, better-organized form pattern, but it is locally implemented and undocumented. Client and fuel-supplier registration still use a generic dialog, mix person-specific fields, and leave Brazilian identifiers and contact data unformatted.

**Approach:** Establish the employee modal composition as the documented operational-form standard, extract only its reusable visual primitives, and apply that standard to the shared commercial-registry form. The browser preserves a separate draft for each person type while the API keeps its current normalization and validation authority.

## Boundaries & Constraints

**Always:** Use `OperationsModal`, shared UI primitives and official tokens; preserve the existing server-action/API payload contract; apply the shared commercial form to both clients and fuel suppliers; meet WCAG AA, visible focus, keyboard navigation and 44px touch targets; preserve common contact/address fields and PF/PJ-specific drafts when changing type.

**Ask First:** Any API/database change, a new visual documentation route/Storybook, or changing legal validation rules.

**Never:** Duplicate CPF/CNPJ validation in the client; mask free-text names, email or address; lose typed data on PF/PJ switching; alter commercial business rules or generated API clients manually.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Individual registration | PF selected; CPF and full name supplied | CPF mask, individual-only fields, current payload | Existing API validation message remains authoritative |
| Legal-entity registration | PJ selected; CNPJ, legal name and trade name supplied | CNPJ mask and legal-entity-only fields | Existing API validation message remains authoritative |
| Type switch | User has entered data for both PF/PJ or shared fields | Separate PF/PJ drafts restore; shared fields stay populated; inactive fields are absent from submission | No destructive clearing |
| Formatted input | Typing/pasting document, telephone or CEP | Non-digits removed and output capped/formatted progressively | Native required/email constraints remain available |

</frozen-after-approval>

## Code Map

- `main-web-app/src/components/ui/operations-modal.tsx` -- official operational modal shell.
- `main-web-app/src/features/employees/components/employees-page.tsx` -- reference creation form to align with the shell and shared section primitive.
- `main-web-app/src/features/commercial-registry/components/registry-page.tsx` -- shared client/fuel-supplier creation form.
- `main-web-app/src/features/commercial-registry/commercial-registry.actions.ts` -- current `FormData` to API payload boundary.
- `main-web-app/docs/STYLING.md` and `main-web-app/docs/COMPONENTS.md` -- official visual and component documentation.

## Tasks & Acceptance

**Execution:**
- [x] Create shared form-section and Brazilian input-mask utilities, migrating the employee CPF mask to the common utility and retaining standalone unit tests.
- [x] Update the employee creation surface to use `OperationsModal` and the common section primitive without changing job-role behavior.
- [x] Rebuild the commercial creation modal with the same header/body/footer shape, person-type control, identification/contact/address sections, UF select and accessibility metadata.
- [x] Maintain controlled drafts for PF and PJ-specific values plus shared values; render and submit only the active type's identity fields.
- [x] Add documentation for the modal anatomy, section composition, feedback, responsive/accessible behavior and appropriate use.
- [x] Add mask and registration-form interaction coverage; run frontend static checks, tests and formatting/diff checks.

**Acceptance Criteria:**
- Given an administrator opens employee, client or fuel-supplier creation, when the modal renders, then each uses the documented operational modal shell, visible labels, scrollable body and a clear primary submission action.
- Given the administrator selects PF or PJ, when the form changes type, then the document label/mask and required identity fields match the type and prior drafts are restored when returning.
- Given a valid CPF, CNPJ, Brazilian phone or CEP is typed or pasted, when the input changes, then it has the documented progressive format, numeric input mode and digit limit.
- Given a commercial form is submitted, when the action receives `FormData`, then the API payload format remains unchanged and no inactive-type identity field is included.
- Given the official documentation is consulted, when an engineer needs a creation modal, then it describes and points to the reusable modal and form-section pattern rather than a feature-local implementation.

## Design Notes

The reusable unit is deliberately small: `OperationsModal` remains the shell and a semantic form section supplies the repeatable grouping. Business-specific fields and server-action state remain in their features, avoiding a generic form framework that would obscure distinct flows.

PF and PJ draft state is separate because their document and legal identity fields have incompatible meanings. Contact and address are shared state. A UF select is more reliable and legible than an unconstrained state text field in a Brazilian operational form.

## Verification

**Commands:**
- `pnpm --dir main-web-app typecheck` -- expected: no TypeScript errors.
- `pnpm --dir main-web-app lint` -- expected: no lint errors.
- `pnpm --dir main-web-app test` -- expected: all unit/component tests pass.
- `pnpm --dir main-web-app format:check` -- expected: formatting passes.
- `git diff --check` -- expected: no whitespace errors.

## Suggested Review Order

**Commercial registration flow**

- Controls PF/PJ drafts, submission boundaries, masked inputs and fixed footer behavior.
  [`registry-page.tsx:223`](../../main-web-app/src/features/commercial-registry/components/registry-page.tsx#L223)

- Shows the unmistakable selected person type and type-specific identification fields.
  [`registry-page.tsx:307`](../../main-web-app/src/features/commercial-registry/components/registry-page.tsx#L307)

**Reusable modal anatomy**

- Provides the scrollable body and fixed action footer used by operational forms.
  [`operations-modal.tsx:31`](../../main-web-app/src/components/ui/operations-modal.tsx#L31)

- Applies the shared shell and footer to the employee registration reference.
  [`employees-page.tsx:151`](../../main-web-app/src/features/employees/components/employees-page.tsx#L151)

**Formatting and safety**

- Centralizes capped CPF, CNPJ, phone, CEP and international-prefix normalization.
  [`brazilian-input-mask.ts:1`](../../main-web-app/src/lib/brazilian-input-mask.ts#L1)

- Verifies type switching, active-only submission and reset-on-cancel behavior.
  [`registry-page.test.tsx:35`](../../main-web-app/src/features/commercial-registry/components/registry-page.test.tsx#L35)
