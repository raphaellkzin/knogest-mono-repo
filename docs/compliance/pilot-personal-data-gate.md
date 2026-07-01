# Pilot Personal-Data Gate

Status: `blocked-pending-approval`

This artifact defines the operational boundary for using real CPF and CNPJ
values in the internal pilot. Real personal or company document entry remains
unauthorized until every approval field below is completed and the
pilot-readiness checklist marks the gate as approved.

## Scope

- Applies to CPF and CNPJ values entered in Client, Fuel Supplier, Person, and
  Company Employment workflows.
- Applies only to the internal Knogest pilot.
- Does not authorize copying production or third-party datasets into
  development, automated tests, examples, logs, snapshots, or fixtures.

## Purpose

Validate the pilot's registry workflows with the minimum real document data
needed for operational acceptance after technical safeguards are in place.

## Legal Basis

Pending real approval. The approver must record the legal basis before any real
CPF or CNPJ is entered.

## Authorized Access

Pending real approval. Access must be limited to the Master Administrator and
explicitly approved operators needed for the pilot.

## Retention

Pending real approval. The approver must define the retention period and
deletion trigger before real CPF or CNPJ entry.

## Disposal

Pending real approval. The approver must define how pilot CPF/CNPJ data will be
deleted or anonymized at the end of the retention period.

## Incident Responsibility

Pending real approval. The approver must name the person or role responsible
for incident triage, notification, and remediation.

## Approval Evidence

- Approver: `PENDING_REAL_APPROVAL`
- Approval timestamp: `PENDING_REAL_APPROVAL`
- Approval scope: `PENDING_REAL_APPROVAL`

## Operational Limits

- CPF/CNPJ checksum validity proves only syntactic structure.
- The application must never claim that a syntactically valid CPF/CNPJ belongs
  to a real person or company.
- Compliance is verified through this approval artifact, the readiness
  checklist, and the pilot operating procedure.
- Development and automated tests must use only synthetic CPF/CNPJ values.
