# Pilot Readiness Checklist

This checklist blocks real CPF/CNPJ entry until the personal-data gate is
complete and approved.

## Personal-Data Gate

- [ ] Pilot personal-data gate approval artifact is complete.
- [ ] Approver, approval timestamp, and approval scope are recorded.
- [ ] Purpose, legal basis, authorized access, retention, disposal, and incident
  responsibility are recorded.
- [ ] Technical CPF/CNPJ protections from Story 2.2 are implemented and
  verified.
- [ ] Operators understand that CPF/CNPJ checksum validity is only format
  validation, not proof of real-world identity.

## Authorization Decision

Real CPF/CNPJ entry status: `blocked-pending-approval`

Real CPF/CNPJ values must not be entered until every item in this checklist is
complete and the status is changed to `approved-for-real-document-entry` by the
authorized approver.

## Fixture Boundary

- Development fixtures are disposable and separate from immutable reference
  seeds.
- Fixtures, examples, OpenAPI examples, Playwright tests, Prisma seeds, logs,
  snapshots, and committed documentation must not contain real CPF/CNPJ values.
- Synthetic CPF/CNPJ examples must be explicitly labeled as synthetic.
