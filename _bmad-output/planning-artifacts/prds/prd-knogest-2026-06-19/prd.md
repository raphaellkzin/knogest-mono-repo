---
title: Knogest
status: final
created: 2026-06-19
updated: 2026-06-19
---

# PRD: Knogest

## 0. Document Purpose

This PRD defines the product requirements for the Knogest internal pilot. It is written for the product owner and downstream UX, architecture, epic, story, and implementation workflows. Requirements are grouped by capability and use the vocabulary in the Glossary. Technical mechanisms and implementation decisions are preserved separately in `addendum.md`.

The completed brainstorming session is the canonical product source. Where `app.md` or an earlier frontend specification conflicts with a later brainstorming decision, the later decision governs.

## 1. Vision

Knogest is a robust but simple operational ecosystem for earthworks project management. It gives a Corporation a trustworthy view of its Companies, Projects, Persons, Machines, Clients, and Fuel Suppliers so managers can allocate resources and make decisions that directly affect project performance.

The pilot does not yet calculate production, progress, cost consumption, or completion forecasts. Its purpose is to establish the complete and historically reliable operational foundation those capabilities will consume when the future RDO workflow begins collecting field evidence.

The product succeeds by replacing fragmented or mutable records with a coherent operating model: every action occurs inside a trusted Corporation and Company context, current resources are easy to use, and prior participation remains historically true after transfers, terminations, revisions, or deletion.

## 2. Target User

### 2.1 Primary User

The MVP serves one **Master Administrator**, who operates the internal pilot, has unrestricted access to the Corporation, and is the final acceptance authority.

### 2.2 Jobs To Be Done

- Establish a complete real-world Corporation and its Companies without direct database manipulation.
- Switch safely among Companies while remaining inside the authenticated Corporation.
- Register and maintain the people, employment relationships, Clients, Fuel Suppliers, and Machines required by operations.
- Create a fully configured Project through a guided workflow without leaving partial records.
- Reserve, allocate, reallocate, or release Employees and Machines while understanding their current availability.
- Preserve trustworthy history when responsibilities, ownership, employment, allocation, schedules, Clients, budgets, or dates change.
- Activate and control Project lifecycle states without creating operational contradictions.
- Prepare data that a future mobile RDO can use without redesigning the domain foundation.

### 2.3 Non-Users in the MVP

- Additional corporation administrators.
- Managers with Company or Project access grants.
- Read-only managers.
- Field Reporters using the future mobile application.
- External Clients and Fuel Suppliers.

### 2.4 Key User Journeys

- **UJ-1. Master Administrator enters the correct Company workspace.** The administrator accesses the Corporation domain, authenticates, sees available Companies, selects one, and receives a workspace containing only that Company's operational records. Switching Company explicitly changes the workspace and never mixes records.
- **UJ-2. Master Administrator prepares a Company for operations.** Inside the selected Company, the administrator registers Employees, Clients, Fuel Suppliers, and Machines, verifies their current availability, and uses paginated tables to find and maintain records.
- **UJ-3. Master Administrator creates a Project atomically.** The administrator completes the guided Project wizard, reviews required responsibilities and operational defaults, optionally allocates resources and fuel terms, and submits once. The Project appears as `PLANNED` only when every selected relationship is valid; abandoning the wizard creates nothing.
- **UJ-4. Master Administrator mobilizes and starts a Project.** The administrator reserves Employees and Machines while the Project is `PLANNED`, resolves any availability conflicts, and explicitly activates the Project when real production is to begin.
- **UJ-5. Master Administrator changes operations without rewriting history.** The administrator reallocates a person or Machine, replaces a Manager or Client, revises a baseline, terminates employment, transfers ownership, or retires an asset. Current state changes immediately while every prior period remains available for historical use.

## 3. Glossary

- **Corporation** — The SaaS tenant and primary security boundary. It owns Domains, Users, Sessions, Companies, and corporation-scoped Persons.
- **Domain** — A unique normalized host or subdomain that resolves the Corporation before authentication.
- **Company** — An operational ownership boundary within a Corporation. It owns Projects, Employments, Clients, Fuel Suppliers, and current Machine ownership.
- **Master Administrator** — The only MVP User role. It can operate every Company in its Corporation.
- **Session** — A revocable authenticated browser session that carries Corporation and selected Company context.
- **Person** — A natural person identified by CPF within one Corporation.
- **Employment** — A Company's relationship with a Person, including Company registration number and current employment status.
- **Employment Period** — A dated admission-to-termination period for an Employment.
- **Employee** — A Person acting through an active Employment in a Company.
- **Employee Allocation** — A dated operational assignment of an Employment to a Project, including the effective job role, daily workload, compensation mode, compensation value, and overtime rate.
- **Client** — A Company-owned individual or legal entity that contracts Projects.
- **Fuel Supplier** — A Company-owned individual or legal entity that may supply fuel to Projects.
- **Machine** — A metered operational asset identified by plate or Company tag and classified as `YELLOW_LINE` or `WHITE_LINE`.
- **Machine Ownership Period** — A dated period during which one Company owns a Machine.
- **Meter Reading** — An immutable confirmed hour-meter value in a Machine's monotonic reading history.
- **Project** — A Company-owned earthworks operation with commercial, technical, time, schedule, and resource configuration.
- **Project Baseline** — The effective approved budget and planned start/end dates for a Project.
- **Weekly Schedule** — The Project's required default working pattern, with one same-day start and end time for each configured working day.
- **Break Template** — An optional named and duration-based suggestion for future RDO closure.
- **Manager Tenure** — A dated period identifying the single current Project Manager.
- **Technical Responsibility** — A dated Project relationship with an eligible Employee; every Project requires at least one current responsible engineer.
- **Project Allocation** — Either an Employee Allocation or Machine allocation that reserves the resource for one Project.
- **Project Fuel Agreement** — A Project-specific relationship selecting a Fuel Supplier, available Fuel Types, and their effective price histories.
- **Fuel Type** — A fixed system reference value for a supported fuel product.
- **PLANNED** — Project state for configured and potentially mobilized work that has not begun real production.
- **ACTIVE** — Project state indicating real production has begun.
- **PAUSED** — Reversible Project state in which operation stops but allocations remain reserved unless explicitly released.
- **COMPLETED** — Terminal Project state for successfully closed work.
- **CANCELLED** — Terminal Project state for abandoned work.
- **RDO** — Future Daily Operational Report and field workflow; not implemented in this MVP.

## 4. Features

### 4.1 Corporation Authentication and Company Context

**Description:** The Master Administrator signs in through the Corporation's Domain. Authentication first establishes Corporation scope, then allows selection of an available Company. All operational capabilities require a trusted selected Company. Realizes UJ-1.

#### FR-1: Resolve Corporation from Domain

The system must resolve exactly one active Corporation from the normalized request host before accepting login credentials.

**Consequences:**

- Unknown or inactive Domains cannot authenticate a User.
- Corporation scope cannot be supplied through an operational request body or route parameter.

#### FR-2: Authenticate Master Administrator

The Master Administrator can authenticate with an email unique inside the resolved Corporation and a valid password.

**Consequences:**

- The same normalized email may identify independent Users in different Corporations.
- Authentication failure does not reveal whether a User exists.

#### FR-3: Maintain Revocable Session

The system must maintain a renewable, revocable Session for an authenticated Master Administrator.

**Consequences:**

- Logout revokes the current Session.
- Administrative password reset revokes every Session belonging to the User.
- Reuse of a superseded refresh credential is rejected and handled as a compromised Session.
- Access credentials expire after 15 minutes, refresh idle expiration is 7 days, and absolute Session lifetime is 30 days.
- Refresh credentials rotate on every use and are held in a host-only `Secure`, `HttpOnly`, `SameSite=Lax` cookie.

#### FR-4: Select and Change Company

The Master Administrator can list available Companies and select or change the active Company.

**Consequences:**

- A Corporation with no Companies remains a valid authenticated empty state.
- Every selection validates Company ownership by the authenticated Corporation.
- Changing Company replaces the operational Company context for subsequent requests.

#### FR-5: Provision Pilot Administration

An authorized operator can provision Corporations, Domains, Master Administrators, and Companies and can reset a Master Administrator password through an internal administrative interface.

**Out of Scope:**

- Company deactivation or restoration.
- Public password recovery.
- Browser-based Company or User administration.

### 4.2 Company Registries and Lists

**Description:** The selected Company provides searchable, sortable, cursor-paginated registries for Employees, Clients, Fuel Suppliers, Machines, and Projects. Current operational selections exclude deleted or inactive records. Realizes UJ-2.

#### FR-6: Paginate Unbounded Lists

Every table or unbounded collection must use the canonical cursor-pagination contract.

**Consequences:**

- Filters, search, sort, selected Company, and authenticated scope are bound to cursor validity.
- Invalid, malformed, foreign-scope, or stale-query cursors return a safe validation error.
- Responses indicate whether another page exists and provide an opaque next cursor when applicable.

#### FR-7: Isolate Company Registries

The system must return and mutate only records owned by the selected Company and authenticated Corporation.

**Consequences:**

- Sibling Companies cannot select or associate each other's Employees, Clients, Fuel Suppliers, Machines, or Projects.
- Historical lookup does not grant current operational selection rights.

#### FR-8: Remove Records from Operational Use

The Master Administrator can remove eligible registry records from current operational use.

**Consequences:**

- Records with history remain preserved but disappear from normal lists and selectors.
- Historical deletion is irreversible in the MVP.
- An eligible identifier may be reused by a new active record without changing historical references.

### 4.3 Workforce Registry and Employment Lifecycle

**Description:** Workforce identity is recognized at Corporation level while each Company owns its Employments. Operational terms belong to dated Employee Allocations rather than mutable Person fields. Realizes UJ-2 and UJ-5.

#### FR-9: Register Corporation Person and Company Employment

The Master Administrator can register a Person using CPF and name and create a Company Employment using a Company registration number.

**Consequences:**

- CPF identifies one Person inside a Corporation.
- One Person may hold active Employments in multiple Companies of the same Corporation.
- The same CPF in another Corporation is independent.

#### FR-10: Maintain Employment Periods

The system must preserve admission, termination, and rehire as distinct Employment Periods.

**Consequences:**

- An active Employee may remain unallocated and available.
- Rehire reuses the same Person and Employment identity while creating a new period.
- Prior periods cannot be reopened or overwritten.

#### FR-11: Terminate Employment Safely

The Master Administrator can terminate an Employment with immediate effect when Project responsibility invariants remain valid.

**Consequences:**

- Any open Employee Allocation is closed transactionally.
- Termination is rejected while the Employee is a current Project Manager.
- Termination is rejected if removal would leave an active Project without a Technical Responsibility.
- The Employee becomes unavailable for new operational selection while all history remains.

#### FR-12: Allocate Employee with Effective Terms

The Master Administrator can allocate an active Employment to a `PLANNED` or `ACTIVE` Project with required free-text job role, expected daily workload, compensation mode, compensation value, and overtime rate.

**Consequences:**

- One Person may have only one open operational Employee Allocation across the Corporation.
- Changing an effective term closes the current allocation period and creates another.
- Management and Technical Responsibility do not consume operational exclusivity.
- Compensation mode is one of daily, hourly, weekly, fortnightly, or monthly; compensation value and overtime rate use BRL with two decimal places.

#### FR-13: Reallocate Employee

The Master Administrator can move an operational Employee between eligible Projects with immediate effect and a reason.

**Consequences:**

- The source period closes and a destination period opens atomically.
- Returning to a prior Project creates a new period.
- Costs, events, and future RDO references remain attached to their original periods.

### 4.4 Client and Fuel Supplier Registries

**Description:** Clients and Fuel Suppliers are separate Company-owned aggregates. Either may represent an individual or legal entity, even when the same CPF or CNPJ appears once in each registry. Realizes UJ-2.

#### FR-14: Register Client

The Master Administrator can register an active Client with entity type, normalized CPF/CNPJ, and full or legal name.

**Consequences:**

- CPF/CNPJ is unique among active Clients of the selected Company.
- Trade name, phone, email, and address are optional.
- A Client may contract multiple Projects of its owning Company.

#### FR-15: Register Fuel Supplier

The Master Administrator can register an active Fuel Supplier with entity type, normalized CPF/CNPJ, and full or legal name.

**Consequences:**

- CPF/CNPJ is unique among active Fuel Suppliers of the selected Company.
- The same document may identify one Client and one Fuel Supplier.
- Supplier categories other than fuel are not represented in the MVP.

#### FR-16: Configure Project Fuel Agreement

The Master Administrator can link an active Fuel Supplier to a Project, select one or more fixed Fuel Types, and maintain an effective price history per selected Fuel Type.

**Consequences:**

- The Fuel Supplier and Project must belong to the same Company.
- The same Fuel Supplier may provide different Fuel Types or prices to different Projects.
- Updating a price creates a new effective price rather than overwriting a prior value.
- The pilot Fuel Type catalog contains Diesel S10 and Diesel S500; price uses BRL per liter with four decimal places.

### 4.5 Machine Registry, Metering, and Ownership

**Description:** Every Machine is metered and historically owned. Project movement, Company ownership transfer, and permanent retirement are distinct operations. Realizes UJ-2 and UJ-5.

#### FR-17: Register Machine

The Master Administrator can register a Machine with name, description, fixed type, manufacturer, model, at least one identifier, and initial Meter Reading.

**Consequences:**

- Fixed type is either `YELLOW_LINE` or `WHITE_LINE`.
- At least plate or Company tag is required; both may be supplied.
- Each supplied identifier is unique among active Machines of the owning Company.
- The free-text model identifies the specific equipment form.

#### FR-18: Preserve Monotonic Meter History

The system must preserve confirmed Meter Readings as a non-decreasing sequence.

**Consequences:**

- Ordinary operations cannot reduce or overwrite the latest confirmed reading.
- An unreferenced initial or transfer reading may be corrected with actor, reason, old value, and new value.
- A referenced reading is immutable in the MVP.

#### FR-19: Allocate and Reallocate Machine

The Master Administrator can allocate an eligible Machine to one `PLANNED` or `ACTIVE` Project at a time and can move it between eligible Projects with immediate effect.

**Consequences:**

- Allocation begins from a confirmed Meter Reading.
- Reallocation closes the source period and opens the destination period atomically.
- Reallocation does not alter Machine registration or Company ownership.

#### FR-20: Transfer Machine Ownership

The Master Administrator can permanently transfer a Machine to another Company in the same Corporation.

**Consequences:**

- Transfer requires no open Project allocation, open shift, or pending final Meter Reading.
- A new Machine Ownership Period begins while prior ownership and Project history remain unchanged.
- The transfer flow may update destination identifiers and Machine details.
- An entered transfer meter value creates a new confirmed Meter Reading.

#### FR-21: Retire Machine

The Master Administrator can permanently retire a Machine with reason and immediate effective date.

**Consequences:**

- Retirement requires no open allocation, open shift, or pending final Meter Reading.
- The Machine permanently disappears from operational selection.
- Every prior ownership, allocation, meter, maintenance, fueling, and future RDO reference remains valid.

### 4.6 Atomic Project Wizard

**Description:** Project creation is one guided, non-resumable session. The browser retains values while the wizard is open, but the backend persists nothing until final submission. Realizes UJ-3.

#### FR-22: Capture Required Project Identity and Baseline

The wizard must capture Project name, required address, optional coordinates, optional non-unique contract number, approved budget, planned start date, and planned end date.

**Consequences:**

- Planned end cannot precede planned start.
- Budget is cadastral reference only in the MVP.
- Contract number is searchable but not unique.

#### FR-23: Capture Required Project Accountability

The wizard must select one active Client, one current Manager, and at least one Technical Responsibility from the selected Company.

**Consequences:**

- Manager and Technical Responsibilities must reference active Employees of the Project's Company.
- One Manager may manage multiple Projects.
- One technical engineer may hold responsibility for multiple Projects.
- Neither relationship consumes operational allocation exclusivity.

#### FR-24: Capture Required Weekly Schedule

The wizard must create a valid Weekly Schedule and may create zero or more Break Templates.

**Consequences:**

- At least one working day has one same-day start and end time.
- All seven days may be configured as working days; no rest day is inferred.
- Each working day has only one default operating window.
- Break Templates are suggestions and do not divide the default operating window.

#### FR-25: Capture Optional Mobilization

The wizard may allocate zero or more Employees, Machines, and Project Fuel Agreements.

**Consequences:**

- Omitting all operational resources and Fuel Suppliers does not block creation.
- Every included relationship is revalidated at final submission.

#### FR-26: Finalize Project Atomically and Idempotently

The Master Administrator can submit the complete wizard once to create one `PLANNED` Project and every selected relationship atomically.

**Consequences:**

- Closing, refreshing, or abandoning the wizard before submission creates nothing and requires restarting.
- A repeated submission with the same wizard idempotency key returns the original result.
- Any validation or availability failure rolls back the entire aggregate.
- Resource conflicts identify only the conflicting resources so the browser can preserve valid wizard values and return to the affected step.

### 4.7 Project Mobilization and Lifecycle

**Description:** A Project separates contractual planning, resource mobilization, real production start, temporary pause, and terminal closure. Realizes UJ-4 and UJ-5.

#### FR-27: Reserve Resources While Planned

The Master Administrator can open Employee and Machine allocations while a Project is `PLANNED`.

**Consequences:**

- Reserved resources are unavailable to other Projects under normal exclusivity rules.
- The system does not automatically release resources because a planned start date passes.

#### FR-28: Activate Project Explicitly

The Master Administrator can transition a valid `PLANNED` Project to `ACTIVE` and record its actual production start.

**Consequences:**

- Activation does not occur automatically from a planned date.
- Activation does not require an operational Employee or Machine.
- Client, Manager, at least one Technical Responsibility, and valid Weekly Schedule remain mandatory.

#### FR-29: Pause and Reactivate Project

The Master Administrator can pause an `ACTIVE` Project and later reactivate it.

**Consequences:**

- Pause retains current Employee and Machine allocations by default.
- Individual resources may be explicitly released or reallocated while paused.
- Reactivation never restores resources that were released or moved.

#### FR-30: Complete or Cancel Project Safely

The Master Administrator can transition an eligible Project to terminal `COMPLETED` or `CANCELLED` state.

**Consequences:**

- Terminal transition rejects open shifts, pending final meter readings, unresolved operational work, or open allocations.
- Terminal Projects reject new operational allocations.
- Terminal state is irreversible in the MVP.

### 4.8 Effective Project History

**Description:** Setup fields may change normally while `PLANNED`. Once production begins, consequential commercial and operational changes create effective history rather than rewriting prior context. Realizes UJ-5.

#### FR-31: Revise Project Baseline

The Master Administrator can revise approved budget or planned dates after activation by supplying a reason.

**Consequences:**

- A new effective Project Baseline is created.
- Original and intervening baselines remain available historically.

#### FR-32: Replace Current Client

The Master Administrator can correct a Client during `PLANNED` setup or replace the contracting Client after activation with a reason.

**Consequences:**

- Post-activation replacement closes the current Project Client period and creates another.
- Prior Client relationships remain historically visible.

#### FR-33: Replace Manager and Technical Responsibilities

The Master Administrator can replace the current Manager and add or end Technical Responsibilities while preserving dated history.

**Consequences:**

- Exactly one current Manager exists.
- At least one current Technical Responsibility remains for a non-terminal Project.

#### FR-34: Revise Operational Baseline

The Master Administrator can revise the Weekly Schedule and Break Templates after activation.

**Consequences:**

- A new effective schedule revision applies to future shifts.
- Prior RDO or operational contexts remain associated with their effective defaults.

#### FR-35: Inspect Entity History

The Master Administrator can inspect preserved history from Project, Employee, and Machine detail views.

**Consequences:**

- Project detail exposes prior Clients, Managers, Technical Responsibilities, Project Baselines, Weekly Schedules, and Project Allocations.
- Employee detail exposes Employment Periods and prior Employee Allocations.
- Machine detail exposes Machine Ownership Periods, prior Project Allocations, and Meter Readings.
- Consolidated historical reporting and export are not included in the MVP.

## 5. Cross-Cutting Non-Functional Requirements

### 5.1 Security and Isolation

- **NFR-1:** Every authenticated operation must derive Corporation, User, role, Session, and selected Company from trusted authentication context.
- **NFR-2:** Cross-Corporation and cross-Company access attempts must fail without disclosing foreign record existence.
- **NFR-3:** Passwords and session credentials must never be stored in plaintext.
- **NFR-4:** CPF, CNPJ, credentials, and sensitive authentication data must be excluded from application logs.
- **NFR-5:** Critical historical records must identify the acting User and capture a reason where the requirement specifies one.
- **NFR-6:** CPF/CNPJ must be masked in lists and selectors and may be shown in full only in authorized create, edit, and detail flows for the Master Administrator.
- **NFR-7:** Purpose, legal basis, retention, and authorized access for real personal data must be documented before pilot data entry.

### 5.2 Consistency and Reliability

- **NFR-8:** Multi-record state transitions must be atomic.
- **NFR-9:** Concurrent attempts to violate allocation, responsibility, ownership, or active-identifier uniqueness must produce one winner and a safe conflict response.
- **NFR-10:** Project finalization retries must not create duplicate Projects or relationships.
- **NFR-11:** Current-state queries and historical-state queries must be explicit and must not make historical records operationally selectable.

### 5.3 API and List Behavior

- **NFR-12:** All application tables and unbounded collections must use the canonical cursor-pagination contract.
- **NFR-13:** Validation and conflict responses must use stable machine-readable error codes and field/resource details suitable for dashboard recovery.
- **NFR-14:** API contracts used by the dashboard must be documented and testable before a module is considered complete.

### 5.4 Time and Numeric Integrity

- **NFR-15:** Real instants must be stored independently of server-local time and interpreted using `America/Sao_Paulo` business time in the MVP.
- **NFR-16:** Money, fuel price, workload minutes, and Meter Readings must use precision that cannot introduce binary floating-point rounding into persisted business values.

### 5.5 Pilot Operability

- **NFR-17:** The pilot must support one Corporation, up to three Companies, and multiple Projects without configuration changes or direct database editing.
- **NFR-18:** Empty, loading, validation, conflict, and terminal states must be understandable to the Master Administrator without backend knowledge.

## 6. Non-Goals

- Implementing the mobile application or any RDO capture workflow.
- Calculating production, physical progress, cost consumption, earned value, remaining time, or completion forecasts.
- Recording fueling events, maintenance events, DSS, machine checklists, employee attendance, photos, or daily activity summaries.
- Managing non-master Users, roles, Company grants, or Project grants.
- Creating or deactivating Companies through the dashboard.
- Supporting suppliers other than Fuel Suppliers.
- Implementing a generic audit-log or event-sourcing platform.
- Restoring historically deleted records.
- Supporting configurable time zones or business time outside `America/Sao_Paulo`.
- Scheduling or backdating reallocations, terminations, transfers, or retirements.
- Supporting parallel open shifts for one Project.

## 7. MVP Scope

### 7.1 In Scope

- P0 platform foundation: tenancy, host resolution, Master Administrator authentication, renewable Sessions, Company selection, administrative provisioning, API contracts, and pagination.
- P1 Company registries: workforce, Employments, Clients, Fuel Suppliers, Fuel Types, Machines, ownership, and meter history.
- P2 Project aggregate: atomic wizard, `PLANNED` mobilization, responsibilities, schedules, resources, fuel terms, and lifecycle transitions.
- P3 historical operations: rehire, termination, reallocation, transfer, retirement, responsibility changes, Client replacement, and baseline revisions.
- Integration of the existing dashboard with completed backend capabilities.

### 7.2 Out of Scope for MVP

- Every capability listed under Non-Goals.
- External customer onboarding, billing, subscription management, and public launch operations.
- Formal service-level guarantees beyond what is needed to operate the internal pilot.

## 8. Success Metrics

### Primary

- **SM-1: Complete real operation registration.** The pilot owner can provision one Corporation, configure one to three Companies, populate required registries, create at least one complete real `PLANNED` Project, reserve resources, and activate it without direct database intervention. Validates FR-1 through FR-35.
- **SM-2: Product-owner acceptance.** The pilot owner explicitly accepts that every brainstorm-defined MVP workflow is represented and usable for the real operation.

### Integrity Gates

- **SM-3: Zero scope leakage.** Isolation tests and pilot use reveal no cross-Corporation or cross-Company record exposure. Validates FR-1, FR-4, FR-7 and NFR-1 through NFR-4.
- **SM-4: Zero inconsistent committed aggregates.** Failure, retry, and concurrency tests leave no partial Project, duplicate Project, overlapping exclusive allocation, invalid responsibility set, or decreasing meter chain. Validates FR-12, FR-18, FR-19, FR-26, FR-30 and NFR-8 through NFR-11.
- **SM-5: Zero corrective database edits.** Pilot completion requires no manual SQL correction to establish or repair supported current state.

### Counter-Metrics

- **SM-C1: Feature count is not success.** Deferred RDO, production, user-management, and generalized procurement capabilities must not be pulled into the pilot merely to increase breadth.
- **SM-C2: Data entry volume is not success.** The pilot should use enough real records to validate behavior, not maximize record counts.

## 9. Risks and Mitigations

- **Tenant leakage:** Mitigate through trusted request context, scoped persistence access, database ownership constraints, and adversarial isolation tests.
- **Temporal model complexity:** Mitigate by using explicit lifecycle commands, immediate effective timestamps, immutable closed periods, and module-level invariants.
- **Wizard/backend mismatch:** The existing frontend wizard is narrower and local-only; reconcile it against FR-22 through FR-26 before integration acceptance.
- **Concurrency conflicts:** Mitigate with database constraints, transactions, idempotency, and structured conflict recovery.
- **Premature future scope:** Maintain the Non-Goals and require an explicit PRD change before implementing RDO, analytics, additional roles, or generic suppliers.
- **Sensitive Brazilian identifiers:** Resolve masking, retention, and access rules before pilot data containing real CPF/CNPJ is entered.

## 10. Dependencies

- Existing styled web dashboard and its Project wizard shell.
- Existing backend application foundation and module conventions.
- PostgreSQL persistence and the established data-access layer.
- Canonical cursor-pagination contract and API envelope documentation.
- Administrative access to run provisioning and password-reset commands.
- Fixed Fuel Type seed values and business definitions.

## 11. Open Questions

No product questions remain open. Architecture must define Project wizard collection and payload limits before implementing FR-26, using real pilot scale and performance constraints.

## 12. Assumptions Index

- No unresolved product assumptions were introduced in this draft. Items requiring product-owner decisions are listed explicitly under Open Questions.
