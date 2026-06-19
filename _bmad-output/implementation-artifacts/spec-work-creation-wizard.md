---
title: 'Work creation wizard'
type: 'feature'
created: '2026-06-19'
status: 'in-review'
baseline_commit: '478ab7312e9bba9852f42f36bb8e44a2aad8b94d'
context:
  - '{project-root}/PRODUCT.md'
  - '{project-root}/main-web-app/docs/STYLING.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The work creation modal presents all six fields at once even though the product has a dormant wizard-capable base modal. Users need a compact, guided flow that remains legible on desktop, tablet, and mobile.

**Approach:** Convert only “Nova obra” to a three-step wizard using the approved KnoGest operational shell: identification, initial situation, and review. Reuse and harden the typed base form modal while preserving the local-data behavior and all other resource modals.

## Boundaries & Constraints

**Always:** Keep the official mineral/teal tokens and existing typography; validate only the active data step before advancing; preserve values while navigating; expose labeled desktop steps and compact mobile progress; keep keyboard focus visible; reset after close or successful creation; retain the current local list insertion behavior.

**Ask First:** Any backend/API integration, persistence beyond local state, schema changes outside this UI, or visual redesign beyond the approved wizard direction.

**Never:** Change employee, machine, or supplier creation flows; add dependencies; ship generated mock images; introduce a parallel modal design system; use rainbow step colors, decorative shadows, oversized radii, or a full-screen desktop modal.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Identification | Missing name or location | Stay on step 1 and focus the first invalid field | Show a clear Portuguese inline error |
| Initial situation | Required status missing | Stay on step 2 | Show a clear Portuguese inline error |
| Progress boundary | Blank, 0, or 100 | Accept and advance | N/A |
| Progress invalid | Negative, above 100, or non-numeric | Stay on step 2 | Explain the accepted 0–100 range |
| Review | Optional values empty | Display “Não informado” | N/A |
| Creation | Valid review submitted | Prepend the work row, close, and reset | Keep modal open on submission failure |
| Reopen | Wizard was previously closed on any step | Open cleanly at step 1 | N/A |

</frozen-after-approval>

## Code Map

- `main-web-app/src/components/ui/operations-modal.tsx` -- canonical operational dialog shell and scroll container.
- `main-web-app/src/components/modals/BaseFormModal.tsx` -- typed React Hook Form wizard engine.
- `main-web-app/src/components/pages/company/company-resource-page.tsx` -- resource configuration, local records, and work creation entry point.

## Tasks & Acceptance

**Execution:**
- [x] `main-web-app/src/components/ui/operations-modal.tsx` -- expose modal size and body-class APIs so the wizard can own scrolling and an anchored footer without changing existing consumers.
- [x] `main-web-app/src/components/modals/BaseFormModal.tsx` -- compose the operational shell; add typed step navigation helpers, accessible responsive progress, per-step validation, focus management, loading controls, and deterministic reset.
- [x] `main-web-app/src/components/pages/company/company-resource-page.tsx` -- render a dedicated work wizard with Zod validation, three field/review steps, edit actions, and existing local row insertion; leave generic resource creation intact.

**Acceptance Criteria:**
- Given the work list, when “Nova obra” opens, then step 1 appears in the official operational modal and no other resource modal changes.
- Given an intermediate step, when the user navigates back or edits a review section, then entered values remain unchanged.
- Given desktop or tablet width, when the wizard opens, then all three labeled steps are visible; given mobile width, then “Etapa X de 3” and a compact progress bar replace them.
- Given valid data on the review step, when “Criar obra” is activated, then the new row appears first and the next open starts cleanly at step 1.
- Given keyboard-only use, when navigating and advancing, then focus order, visible focus, validation focus, and dialog semantics remain usable.

## Spec Change Log

## Design Notes

The generated mock is a north star, not an asset. Keep the title and description constant, use teal only for completed/current progress and the primary action, use 10px-scale rounding, and anchor the action footer while the step body scrolls. The review should be a semantic summary with lightweight dividers rather than nested cards.

## Verification

**Commands:**
- `npm run typecheck` -- expected: no TypeScript errors.
- `npm run lint` -- expected: no ESLint errors.
- `npm run build` -- expected: successful Next.js production build.

**Manual checks (if no CLI):**
- Inspect the full flow at mobile, tablet, and desktop widths, including validation, backward navigation, review edits, creation, close/reopen reset, and keyboard focus.
