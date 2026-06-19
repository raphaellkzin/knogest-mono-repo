---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - app.md
session_topic: 'Define the Knogest product, prioritize the backend and web MVP, and establish the initial multi-tenant architecture'
session_goals: 'Produce a prioritized MVP scope, product decisions, initial architecture, critical questions, and an execution plan'
selected_approach: 'progressive-flow'
techniques_used:
  - 'First Principles Thinking'
  - 'Ecosystem Thinking'
  - 'Solution Matrix'
  - 'Decision Tree Mapping'
ideas_generated: 100
context_file: 'app.md'
session_continued: true
continuation_date: '2026-06-19'
technique_execution_complete: true
facilitation_notes: 'The user consistently refined operational invariants, reduced premature scope, and favored explicit temporal history over mutable state.'
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Bigalien
**Date:** 2026-06-18

## Session Overview

**Topic:** Define the Knogest product, prioritize the backend and web MVP, and establish the initial multi-tenant architecture.
**Goals:** Produce a prioritized MVP scope, product decisions, initial architecture, critical questions, and an execution plan.

### Context Guidance

Knogest is a SaaS ecosystem for earthworks project management. A corporation can contain multiple companies, while projects connect the operational resources that will later feed daily operational reports (RDOs). The mobile application and RDO workflow are part of the product vision but are outside the immediate MVP scope.

### Session Setup

The MVP frontend, styling, and required pages already exist. The backend and its business rules are also prepared for the addition of controllers. The immediate implementation focus is therefore the backend application surface and the foundational multi-tenant architecture.

The initial MVP serves only the corporation administrator and includes corporation login, company selection, and management of companies, employees, machines/equipment, and projects. Backend list endpoints use cursor-based pagination.

Projects are operational aggregates rather than merely cadastral records. They must link participating employees and machines/equipment, schedules, working arrangements, and other operational configuration needed by the future RDO workflow. RDO implementation is deferred because the mobile RDO will later feed production, cost, progress, fueling, and maintenance data into the broader ecosystem.

In addition to the fields already identified, each project requires a contract number, project manager, and owner. The exact representation and lifecycle rules for project manager and owner remain architectural and product questions for the session.

## Technique Selection

**Approach:** Progressive Technique Flow
**Journey Design:** Systematic development from product fundamentals to an actionable implementation plan.

**Progressive Techniques:**

- **Phase 1 - Exploration:** First Principles Thinking to identify the essential truths, actors, boundaries, and value of the product.
- **Phase 2 - Pattern Recognition:** Ecosystem Thinking to map relationships among corporations, companies, projects, operational resources, and the future RDO workflow.
- **Phase 3 - Development:** Solution Matrix to compare and decide multi-tenancy, authentication, domain modeling, controllers, and API contract alternatives.
- **Phase 4 - Action Planning:** Decision Tree Mapping to turn decisions into a prioritized MVP sequence with dependencies, tests, and completion criteria.

**Journey Rationale:** The product already has an implemented MVP frontend and a backend foundation with business rules. The session therefore needs to clarify the domain and product boundaries first, then expose ecosystem relationships, make architectural decisions explicitly, and finally produce an executable backend plan without prematurely designing the deferred mobile application.

## Technique Execution Notes

### Phase 1 - First Principles Thinking

**[Product Value #1]: Operational Decision System**
_Concept_: Knogest transforms a slow and inefficient corporation into one that can formulate strategies, optimize resources, and gain a clearer view of the business. Its fundamental value is better operational decision-making rather than merely digitizing records.
_Novelty_: Employee, machine, company, and project data are treated as the foundation for operational intelligence that will become richer when the future RDO workflow starts feeding the ecosystem.

**[Product Value #2]: Project Trajectory Control**
_Concept_: The primary decision problem is understanding whether actual project progress and accumulated cost remain compatible with the approved budget and remaining delivery time. Knogest should make the project's current trajectory visible early enough for the corporation to intervene.
_Novelty_: The product is oriented toward forward-looking project health and corrective action, instead of limiting itself to retrospective cost and activity reporting.

#### Phase 1 Transition

First Principles Thinking was intentionally concluded early at the user's request. Two foundations carry forward: Knogest exists to improve operational decisions, and its central decision problem is the relationship among project progress, consumed budget, and remaining time.

### Phase 2 - Ecosystem Thinking

**[Domain Boundary #3]: Strict Company Resource Boundary**
_Concept_: A corporation is the tenant and security boundary, while each company is an operational ownership boundary. Every project belongs to exactly one company and may allocate only employees and machines/equipment owned by that same company.
_Novelty_: Tenant isolation alone is insufficient; the domain enforces a second invariant that prevents resources from leaking or being assigned across sibling companies inside the same corporation.

**[Domain Rule #4]: Manager as Project Assignment**
_Concept_: The project manager must be an employee of the project's company who is already allocated to that project. The manager is therefore a domain role within project staffing, not an unconstrained text field or an MVP application user.
_Novelty_: Tying management to the project assignment preserves company ownership invariants and prepares the model for future role-based access without coupling operational roles to authentication prematurely.

**[Domain Actor #5]: External Project Owner**
_Concept_: The project owner is the external client or contracting party for whom the company performs the work. This actor is outside the corporation's user, employee, and company hierarchy but remains commercially associated with the project.
_Novelty_: Separating the client from internal actors avoids overloading employee or company concepts and leaves room for one client to commission multiple projects over time.

**[Domain Model #6]: Reusable Client Registry**
_Concept_: External clients are first-class, reusable records rather than text embedded in a project. A client may contract multiple projects, and each project references its contracting client as the project owner.
_Novelty_: The model preserves customer identity across projects, enabling future portfolio history, commercial analysis, and contact reuse without duplicating client data in every project.

**[Operational Lifecycle #7]: Exclusive Temporal Allocation**
_Concept_: By default, an employee or machine/equipment item may have only one active project allocation at a time. A resource may be temporarily reassigned without erasing its original participation, or permanently removed from a project, but every cost, event, interference, and historical contribution already recorded for the project must persist.
_Novelty_: Project participation is modeled as a temporal lifecycle with active, suspended/reassigned, resumed, and ended states rather than a deletable many-to-many link. This supports exclusive current allocation while preserving an immutable operational history for future RDO, costing, and audit needs.

#### Phase 2 Transition

The ecosystem now has explicit ownership and lifecycle boundaries: the corporation is the tenant; companies own their projects, employees, and machines; projects may use only resources from their owning company; managers are allocated employees; external clients are reusable across projects; and operational allocations are exclusive, temporal, and historically persistent.

### Phase 3 - Solution Matrix

**[Architecture Decision #8]: Shared-Schema Tenant Isolation**
_Concept_: All corporations share one PostgreSQL database and schema. Every tenant-owned record carries a trusted `corporationId`, request context propagates that identifier from authentication, handlers apply it to every tenant-aware query and mutation, and composite indexes and constraints reinforce isolation at the database level.
_Novelty_: The design keeps MVP operations and Prisma migrations simple while using defense in depth across authentication context, application persistence boundaries, and relational constraints instead of relying on frontend filtering.

**[Architecture Decision #9]: Host-Resolved Tenant Context**
_Concept_: The normalized request hostname resolves through a globally readable, uniquely indexed corporation-domain record before login. Authentication then finds the user within that corporation, signs `userId` and `corporationId` into the JWT, and creates a request-scoped authenticated context that flows from controller to service to handler.
_Novelty_: Tenant identity originates from the corporation's configured domain or subdomain rather than a client-supplied body or arbitrary header. Domain resolution and login are explicit pre-tenant exceptions; all authenticated operations use the signed corporation context.

**[Architecture Decision #10]: Company-Scoped Client Registry**
_Concept_: Each client belongs to exactly one company and may contract multiple projects only within that company. Client lookups and project assignment validate both `corporationId` and `companyId`, preventing reuse by sibling companies in the same corporation.
_Novelty_: The reusable registry preserves customer history without weakening the strict company ownership boundary already applied to projects, employees, and equipment.

**[Data Lifecycle #11]: History-Aware Soft Deletion**
_Concept_: Records with operational or relational history are soft-deleted, retaining referential integrity while disappearing from every normal operation that could select or allocate them. Default handlers filter `deletedAt IS NULL`; historical reads may resolve deleted records explicitly, while records with no history may be physically deleted.
_Novelty_: Deletion behavior depends on historical participation, combining clean operational interfaces with durable audit and reporting consistency instead of applying either unconditional hard deletion or unconditional archival.

**[Superseded Decision #12]: Validated Record Restoration**
_Concept_: Record restoration was initially considered and then explicitly rejected by the user.
_Novelty_: Preserving this revision records the decision path while deferring to the irreversible deletion rule below.

**[Data Lifecycle #13]: Irreversible Historical Soft Delete**
_Concept_: Once a record with history is soft-deleted, it remains available only for referential integrity, audit, and historical reporting. It disappears from every normal selection and operation and cannot be restored through the application.
_Novelty_: The system preserves historical truth without carrying the operational complexity and conflict handling required by restoration workflows.

**[Data Integrity #14]: Active-Record Identifier Reuse**
_Concept_: Identifiers such as machine plate or tag may be reused by a new record after the previous record has been irreversibly soft-deleted. Uniqueness applies only to active records, while historical relationships continue pointing to the deleted record's stable identifier.
_Novelty_: PostgreSQL partial unique indexes scoped to `deletedAt IS NULL` allow operational identity reuse without rewriting or conflating historical entities.

**[Architecture Decision #15]: Immutable Allocation Periods**
_Concept_: Employee and machine participation is represented by dated allocation periods. Reassignment ends the current period with a reason and creates a new active period in the destination project; returning creates another period in the original project rather than reopening or overwriting old data.
_Novelty_: A partial unique index permits only one open allocation per resource while immutable periods reconstruct exactly where the resource was over time and provide stable references for future RDO and cost records.

**[Domain Model #16]: Separate Management and Operational Assignment**
_Concept_: Project management responsibility is distinct from operational labor allocation. An employee may manage multiple projects concurrently, while every non-management operational allocation remains temporally exclusive; its job role may differ across periods and when returning to a previous project. Machines follow the same exclusive temporal allocation rule but never participate through the management relationship.
_Novelty_: Separating managerial responsibility from physical workforce allocation resolves the apparent conflict between multi-project oversight and the rule that a resource cannot be operationally active in two projects at once.

**[Domain Rule #17]: Single Current Manager with Tenure History**
_Concept_: Each project has exactly one current manager, but the same employee may concurrently manage multiple projects belonging to their company. Changing managers ends the previous manager's dated tenure and creates a new one, preserving the full management history.
_Novelty_: A project-level unique open tenure enforces singular accountability without imposing operational allocation exclusivity on managerial oversight.

**[Domain Model #18]: Non-Exclusive Technical Responsibility**
_Concept_: A project's technical engineers must be registered employees of the owning company, but they may be responsible for any number of simultaneous projects. Technical responsibility is a separate many-to-many relationship and does not consume the employee's exclusive operational allocation.
_Novelty_: Managerial, technical, and operational participation remain explicit relationship types with different cardinality and concurrency rules instead of being compressed into a generic project-member role.

**[Cost Integrity #19]: Versioned Employment Terms**
_Concept_: An operational employee allocation period snapshots the job role, work schedule, payment mode, compensation value, and overtime rate effective during that period. Any change ends the current period and opens a new one with the new terms.
_Novelty_: Future labor cost calculations use historically correct terms rather than mutable employee or project fields, preserving cost truth across role changes, raises, transfers, and returns.

**[Equipment Integrity #20]: Shift-Aware Metered Allocation**
_Concept_: Every machine allocation period begins from a confirmed hour-meter reading. Ending or transferring an allocation during an active shift requires an immediate final reading; after the shift has ended, the RDO closing reading may complete the source allocation and provide the reference for reassignment.
_Novelty_: Meter requirements follow the operational timing of the shift instead of forcing duplicate readings. The model can temporarily represent a post-shift allocation closure awaiting its authoritative RDO meter while still requiring immediate evidence for mid-shift movement.

**[API Boundary #21]: Token-Scoped Selected Company**
_Concept_: After authentication, the active company is stored in the signed JWT together with `userId` and `corporationId`. Changing companies calls a dedicated authenticated routine that validates the requested company belongs to the corporation and is accessible to the user, then issues a replacement token containing the new `companyId`; operational routes never receive company context through their URL or request body.
_Novelty_: The selected workspace is sealed into request authentication and cannot drift between routes. Company switching becomes an explicit session transition, and every handler receives both tenant and company scope from trusted signed context.

**[Authentication Flow #22]: Two-Stage Session Scope**
_Concept_: Login issues a corporation-scoped JWT containing `userId` and `corporationId` but no active company. This bootstrap token may only list available companies, select/change company, and end the session; successful company selection replaces it with an operational JWT that also contains `companyId`.
_Novelty_: The absence or presence of signed company context creates an explicit authorization boundary between workspace bootstrap and company operations instead of relying on frontend navigation state.

**[Product Boundary #23]: Valid Empty Corporation State**
_Concept_: A corporation may be onboarded and authenticated without any company records. Its corporation-scoped session remains valid and the company-selection experience returns an empty state; end-user company creation is intentionally deferred beyond the MVP.
_Novelty_: Corporation identity and authentication are decoupled from operational workspace provisioning, allowing future company-creation workflows without forcing placeholder companies during onboarding.

**[Operations Decision #24]: Administrative Provisioning CLI**
_Concept_: The MVP includes an internal, idempotent CLI for provisioning corporations, domains, administrator users, and companies without exposing public management controllers. CLI commands reuse application services and handlers so validation, transactions, hashing, and tenant invariants remain consistent with the API.
_Novelty_: Internal onboarding remains repeatable and controlled while the user-facing company creation workflow is deferred, avoiding direct database manipulation as a normal operational process.

**[MVP Domain #25]: Company-Scoped Multi-Project Suppliers**
_Concept_: Supplier backend support is part of the MVP. A supplier belongs to exactly one company and may be linked to multiple projects owned by that company, but can never be selected or shared by sibling companies in the corporation.
_Novelty_: Suppliers are reusable operational partners with explicit project participation rather than duplicated project fields, while preserving the same strict company ownership invariant as clients and resources.

**[Cost Integrity #26]: Effective-Dated Fuel Pricing**
_Concept_: Each supplier fuel offering has an append-only price history with an `effectiveFrom` timestamp. Updating a price creates a new effective record instead of overwriting the previous value, and future fueling records resolve or reference the price valid at the event time.
_Novelty_: Cost calculations remain historically stable while the operational interface can still expose a simple current price for each fuel type.

**[Reference Data #27]: System Fuel Catalog**
_Concept_: Fuel types are fixed, globally managed system reference data. Companies cannot create or rename fuel types; a supplier selects the supported catalog entries and maintains its own effective-dated price history for each one.
_Novelty_: A shared canonical catalog prevents spelling and unit fragmentation while supplier availability and pricing remain correctly isolated by company.

**[MVP Boundary #28]: Operational Foundation Before Production Intelligence**
_Concept_: The first MVP covers only the records, relationships, allocation rules, and operational configuration required for a project to function. Contracted quantities, production targets, progress calculation, cost projection, and other data that actively feeds project performance are deferred to the next phase alongside RDO evolution.
_Novelty_: The architecture prepares stable inputs for future operational intelligence without pretending the initial administrative foundation can already deliver production analytics.

**[Project Scope #29]: Budget as Cadastral Data**
_Concept_: The project's approved budget value is included in the MVP as a decimal monetary field for administrative reference. The MVP does not calculate budget consumption, forecast overruns, or derive financial progress from this value.
_Novelty_: Capturing the baseline now supports future cost intelligence without expanding the current scope into incomplete financial analytics.

**[Project Scope #30]: Planned Date Baseline**
_Concept_: Each project stores planned start and planned end dates in the MVP, with validation that the end does not precede the start. These fields are administrative baselines only; delay, remaining-time, and forecast calculations are deferred.
_Novelty_: Time expectations are captured at project creation without prematurely introducing scheduling analytics or production dependencies.

**[Reliability Decision #31]: Atomic Allocation Conflict Handling**
_Concept_: Allocation and reassignment commands run transactionally and are reinforced by database constraints that prevent more than one active operational period per employee or machine. Concurrent attempts never use last-write-wins: one succeeds and the conflicting request receives a safe `409 Conflict` response.
_Novelty_: Exclusivity remains true under retries and race conditions, moving correctness from frontend availability checks into transactional and relational guarantees.

**[Product Workflow #32]: Single-Session Atomic Project Wizard**
_Concept_: Project creation is a guided multi-step workflow in which resource allocation is part of setup, but intermediate steps remain client-side and are never persisted as a resumable draft. Leaving, refreshing, or abandoning the wizard cancels it; final submission creates the project and all initial relationships in one atomic backend transaction.
_Novelty_: The system avoids orphaned drafts and cleanup jobs while retaining a structured setup experience. A project exists only after the complete operational configuration passes final validation.

**[Failure Recovery #33]: Correctable Finalization Conflicts**
_Concept_: If project finalization detects that selected employees or machines became unavailable during the wizard, the atomic transaction rolls back and returns `409 Conflict` with structured identifiers for only the conflicting resources. The frontend preserves wizard state, returns to the affected allocation step, and allows replacement before resubmission.
_Novelty_: Concurrency safety does not force the administrator to repeat valid setup work, balancing strict allocation guarantees with a recoverable user workflow.

**[Reliability Decision #34]: Idempotent Project Finalization**
_Concept_: The frontend generates a unique idempotency key for each project wizard session and includes it in final submission. The backend scopes the key to the authenticated corporation and company, stores the completed result, and returns that same result for retries instead of creating duplicate projects or allocations.
_Novelty_: Network timeouts, retries, and double submission become safe across a complex aggregate transaction without relying on fragile frontend button state.

**[Project Lifecycle #35]: Explicit Project State Machine**
_Concept_: Projects transition among `ACTIVE`, `PAUSED`, `COMPLETED`, and `CANCELLED`. Pause is reversible, completion and cancellation are terminal, and terminal projects reject new operational allocations; successful wizard finalization creates the project directly as `ACTIVE`.
_Novelty_: Lifecycle changes are domain commands with guarded transitions rather than unrestricted status field updates, making downstream allocation and RDO behavior predictable.

**[Project Lifecycle #36]: Clean Terminal Transition**
_Concept_: A project may become `COMPLETED` or `CANCELLED` only after all operational pending work is resolved. The command rejects open shifts, pending final machine meter readings, and unclosed active allocations, then performs the terminal transition transactionally.
_Novelty_: Terminal status certifies operational closure rather than merely changing a label, preventing stranded resources and incomplete historical boundaries.

**[Project Lifecycle #37]: Paused Project Retains Resources**
_Concept_: Transitioning a project to `PAUSED` stops project operation without ending employee or machine allocation periods. Its resources remain actively reserved by the paused project and therefore unavailable for selection by other projects.
_Novelty_: Pause preserves the assembled operational team and fleet by default, distinguishing temporary inactivity from resource release or project termination.

**[Project Lifecycle #38]: Explicit Release During Pause**
_Concept_: While a project is paused, an administrator may explicitly reassign individual employees or machines. The command ends each selected resource's current allocation period in the paused project and opens a new period in the destination project under normal exclusivity, meter, and transaction rules.
_Novelty_: Resources remain reserved by default but can be selectively mobilized without resuming or terminating the paused project.

**[Project Lifecycle #39]: Non-Reversing Reactivation**
_Concept_: Reactivating a paused project preserves only the resources whose allocation periods are still active there. Previously reassigned resources never return automatically; bringing one back requires a new explicit allocation that rechecks current availability and creates a new period.
_Novelty_: Project status changes never rewrite resource history or override commitments made while the project was paused.

**[Work Schedule #40]: Project Schedule as RDO Default**
_Concept_: The project stores a standard weekly schedule with working days and one or more daily time intervals as the default operational template. A future RDO may override the actual shift start, breaks, and end without rewriting the project's default schedule.
_Novelty_: Planned schedule and observed shift time remain separate sources of truth, allowing defaults to reduce daily entry while preserving real-world exceptions.

**[Labor Terms #41]: Allocation-Specific Daily Workload**
_Concept_: Each employee allocation period records the expected daily workload in minutes alongside its role and compensation terms. Future overtime calculations compare actual RDO time against the workload effective for that allocation period, and changing the workload creates a new period.
_Novelty_: Overtime entitlement follows the employee's project-specific agreement rather than assuming every worker shares the project's opening hours or a mutable employee-wide value.

**[Scope Removal #42]: No Fixed Overtime Rule**
_Concept_: Fixed or guaranteed project-wide overtime is removed from the product scope. The project has no fixed-overtime field, and overtime may arise only from actual worked time exceeding the daily workload defined in the employee's effective allocation terms.
_Novelty_: Removing automatic overtime avoids hidden labor costs and keeps future calculations grounded in actual RDO attendance and explicit employee agreements.

**[Labor Calculation #43]: Actual-Time Overtime Formula**
_Concept_: Future overtime equals the positive difference between confirmed worked minutes and the daily workload stored in the employee's effective allocation period. Confirmed worked minutes equal shift duration minus confirmed break durations, and compensation uses the allocation period's overtime rate.
_Novelty_: The calculation combines actual daily evidence with versioned employment terms, avoiding both project-wide assumptions and retroactive recalculation from current values.

**[Work Schedule #44]: Configurable Break Templates**
_Concept_: Project configuration includes named break templates such as lunch with a default duration stored in minutes. A future RDO instantiates these templates for the shift, and the operator confirms the breaks and durations used before shift closure; confirmed values feed worked-time and overtime calculations.
_Novelty_: Reusable defaults reduce field entry without treating planned breaks as unquestionable facts, preserving the RDO as the source of actual daily time.

**[Future RDO Rule #45]: Editable Actual Breaks**
_Concept_: When closing a shift, the operator may change the duration of a project-default break, remove a break that did not occur, or add an exceptional break. The RDO stores the resulting confirmed break instances as historical facts independent of later project template changes.
_Novelty_: Defaults accelerate routine entry while the daily record remains faithful to field reality and produces defensible worked-time calculations.

**[Project Scope #46]: Required Address with Optional Coordinates**
_Concept_: Every project requires a textual address, while latitude and longitude are optional decimal fields in the MVP. Coordinates may be added later without blocking initial project setup when precise geolocation is unavailable.
_Novelty_: The model supports immediate operational identification and future map or field-location capabilities without making external geocoding a prerequisite for project creation.

**[Project Scope #47]: Non-Unique Contract Reference**
_Concept_: Contract number is a searchable project reference but is not unique within a company. Multiple active or historical projects may carry the same contract number, so the field receives a normal lookup index rather than a uniqueness constraint.
_Novelty_: The system reflects real contracting structures in which one commercial contract may cover multiple operational projects.

**[Project Scope #48]: Optional Contract Number**
_Concept_: Contract number may be omitted when finalizing the project wizard. When supplied, it remains a searchable, non-unique reference and does not determine project identity or lifecycle.
_Novelty_: Operational setup is not blocked when formal contracting information is unavailable or not applicable.

**[Project Invariant #49]: Required Company Client**
_Concept_: Project finalization requires an active client owned by the authenticated company. The backend validates corporation and company scope and rejects deleted, foreign, or missing client references within the atomic wizard transaction.
_Novelty_: Every operational project begins with explicit commercial ownership while preserving strict company isolation.

**[Project Invariant #50]: Required Technical Responsibility**
_Concept_: Project finalization requires at least one active technical engineer in addition to the single current manager. Every selected engineer must be an active employee of the authenticated company, while each may remain responsible for multiple projects concurrently.
_Novelty_: An active project cannot exist without explicit technical accountability, but technical responsibility remains independent from exclusive operational workforce allocation.

**[API Contract #51]: Canonical Cursor-Paginated Lists**
_Concept_: Every endpoint that powers an application table or returns an unbounded collection uses a shared cursor contract with validated `limit`, opaque `cursor`, optional search and allowlisted filters/sorting. Responses return `data` plus `pageInfo.hasNextPage` and `pageInfo.nextCursor` inside the standard API envelope; corporation and selected company always come from JWT context.
_Novelty_: A single documented contract aligns backend handlers, Swagger schemas, and frontend pagination behavior while binding cursors to deterministic ordering and the filters that created them.

**[Labor Model #52]: Stable Employee Identity and Allocation Terms**
_Concept_: An employee's CPF, name, and registration number are stable company-owned identity fields. Job role, expected daily workload, compensation mode, compensation value, and overtime rate belong to each dated operational allocation period rather than to the employee record itself.
_Novelty_: The employee remains the same person across projects while every assignment preserves the exact operational and economic terms effective during that period, preventing later transfers or compensation changes from rewriting historical labor data.

**[Employee Lifecycle #53]: Employment Status Independent of Allocation**
_Concept_: An active employee may remain registered with the company without any project allocation and is then available for future assignment. Company termination deactivates the employee, ends any current operational allocation, removes the employee from future selections, and preserves the employee identity and every project, cost, event, and responsibility history; an employee with no current project is simply deactivated without an allocation closure.
_Novelty_: Employment status and project participation are separate lifecycles, so being unallocated does not imply termination and leaving the company does not erase the employee's historical contribution.

**[Employee Lifecycle #54]: Responsibility-Safe Termination**
_Concept_: Employee termination is rejected when the employee is the current project manager or when removing the employee's technical responsibility would leave an active project without a technical engineer. The administrator must first appoint a replacement; after all responsibility invariants are satisfied, termination transactionally closes any operational allocation and deactivates the employee.
_Novelty_: Offboarding cannot silently invalidate active projects, and replacement histories remain explicit instead of being inferred from destructive relationship removal.

**[Employee Lifecycle #55]: Rehire Through New Employment Period**
_Concept_: Rehiring a former employee in the same company reactivates the existing employee identity and creates a new dated employment period rather than creating a duplicate employee record. Previous admission, termination, allocation, responsibility, and compensation histories remain closed and unchanged.
_Novelty_: A stable employee identity connects multiple employment tenures while preserving each tenure as a distinct historical fact, avoiding duplicate CPF records and retroactive changes to prior work.

**[Labor Boundary #56]: Corporation-Wide Physical Work Exclusivity**
_Concept_: A person identified by CPF may hold separate active employment registrations and registration numbers in multiple companies of the same corporation. However, that person may have only one active operational project allocation across the entire corporation, even when the competing projects belong to different companies; allocations in another corporation are independent and do not conflict.
_Novelty_: Operational exclusivity follows the physical person within the tenant rather than an individual company employee record, while corporation isolation prevents one customer's workforce policy from constraining another customer's records.

**[Labor Architecture #57]: Corporation Person with Company Employment**
_Concept_: Labor identity is modeled in layers: a corporation-scoped person stores CPF and name; each company-owned employment stores its registration number and current status; dated employment periods preserve admission, termination, and rehire; operational allocations reference the applicable employment while enforcing one open allocation per corporation person. The same CPF in another corporation resolves to an independent tenant-owned person.
_Novelty_: The model supports multiple legitimate company employments without duplicating identity inside a corporation, and it gives the database a stable key for corporation-wide physical work exclusivity without crossing tenant boundaries.

**[Equipment Lifecycle #58]: Effective-Dated Intercompany Ownership Transfer**
_Concept_: A machine may be permanently transferred between companies of the same corporation. Ownership is represented by immutable dated periods rather than an overwritten company field; prior project allocations and ownership periods continue referencing the original company, while only the current owning company may select the machine for new operations.
_Novelty_: Corporate assets can move between legal or operational companies without falsifying the ownership context of historical projects, costs, meter readings, maintenance, or future RDO events.

**[Equipment Invariant #59]: Operationally Clean Ownership Transfer**
_Concept_: Intercompany machine transfer requires the machine to have no active project allocation, no open operational shift, and no pending final hour-meter reading. Existing participation must be explicitly closed under normal allocation and meter rules before ownership can change; the ownership command never performs an implicit operational closure.
_Novelty_: Asset ownership and field movement remain separate domain operations, preventing administrative transfer from bypassing RDO evidence, allocation history, or meter continuity.

**[Equipment Lifecycle #60]: Irreversible Asset Retirement**
_Concept_: A machine that permanently leaves the corporation through sale, loss, disposal, or another patrimonial reason is retired with a required reason and effective date. Retirement requires no active allocation, open shift, or pending final meter, permanently removes the machine from operational selection, and preserves all ownership, project, cost, maintenance, meter, and RDO history.
_Novelty_: External asset exit is represented as a terminal business event rather than deletion, distinguishing it from an internal ownership transfer while retaining complete historical evidence.

**[MVP Boundary #61]: Audit-Ready Without Full Audit Log**
_Concept_: A general-purpose administrative audit log is deferred beyond the MVP. The MVP architecture nevertheless keeps consequential state changes behind explicit domain commands and preserves dated lifecycle records and reasons so a future audit mechanism can observe operations without redesigning core workflows.
_Novelty_: Audit scope is controlled without sacrificing future traceability; the system avoids premature event infrastructure while preventing opaque direct updates from becoming entrenched.

**[Governance Foundation #62]: Actor Attribution on Critical History**
_Concept_: Critical lifecycle records created in the MVP store the authenticated actor through `createdByUserId`; records that are explicitly closed also store `endedByUserId` and a domain-appropriate reason. A generic event table and before/after snapshots remain deferred.
_Novelty_: The minimum useful chain of responsibility is captured at the source of each transition, allowing future auditing to build on trustworthy actor data without forcing an event-sourcing or universal logging subsystem into the MVP.

**[Commercial Registry #63]: Individual and Legal-Entity Partners**
_Concept_: Both clients and suppliers may be registered as either individuals or legal entities. Each record carries an explicit entity type and a normalized, validated CPF or CNPJ appropriate to that type, while remaining owned and selectable only within its company.
_Novelty_: Commercial relationships reflect real contracting scenarios without weakening company isolation or forcing individual counterparties into legal-entity-shaped data.

**[Commercial Architecture #64]: Separate Client and Supplier Aggregates**
_Concept_: Client and supplier remain independent company-owned aggregates even when the same CPF or CNPJ appears in both registries. Identity and contact data may therefore exist once in each context; project ownership references a client, while fuel offerings and supplier-project participation reference a supplier.
_Novelty_: The MVP favors explicit domain boundaries over a generalized business-partner abstraction, allowing client and supplier rules to evolve independently without role polymorphism or cross-context lifecycle coupling.

**[Commercial Integrity #65]: Active Document Uniqueness per Registry**
_Concept_: Normalized CPF or CNPJ is unique among active records within the same company and commercial registry. The same document may independently identify one active client and one active supplier, may be registered by another company, and may be reused by a replacement record after an older historical record is irreversibly soft-deleted.
_Novelty_: Partial uniqueness prevents accidental duplicates where they are operationally ambiguous while respecting independent business roles, company ownership, and historical identifier reuse.

**[Commercial Scope #66]: Minimal Counterparty Registration**
_Concept_: Client and supplier creation requires only entity type, a valid normalized CPF or CNPJ, and the corresponding full name or legal name. Trade name, phone, email, and address are optional in the MVP.
_Novelty_: The commercial registry captures sufficient legal identity for project and supplier operations without blocking setup on secondary contact information that may be completed later.

**[Supplier Model #67]: Project-Specific Supply Agreements**
_Concept_: A supplier registration declares the categories of products or services it can offer, such as fuel, parts, or mechanical workshop services, including newly registered offering types. Linking the supplier to a project creates a project-specific supply agreement that selects the actual products available to that project and stores their effective prices; the same supplier may therefore provide S10 diesel to one project and S500 diesel to another. This supersedes the supplier-level price ownership described in decision #26.
_Novelty_: Supplier capability is separated from negotiated project scope and pricing, reflecting that availability and commercial terms vary by project without duplicating the supplier identity.

**[Supplier Reference Data #68]: Extensible Company Supply Types**
_Concept_: The system seeds common supply types such as fuel, parts, and mechanical workshop services, while each company may create additional types for its own suppliers. Every supplier requires at least one active supply type; company-created types remain company-scoped and, once referenced, may be deactivated but not deleted.
_Novelty_: Familiar defaults reduce setup effort while company-owned extensions accommodate local procurement models without fragmenting other companies' terminology or breaking historical agreements.

**[MVP Scope Correction #69]: Fuel Suppliers Only**
_Concept_: The MVP supplier domain supports only fuel suppliers. Generic supply types, custom company types, parts suppliers, workshops, and other product or service catalogs are deferred; decisions #67 and #68 remain future design direction only where they describe non-fuel extensibility.
_Novelty_: Narrowing the aggregate to the only supplier workflow needed by the first operational release avoids generalized procurement infrastructure before RDO and cost flows can use it.

**[Fuel Supply Model #70]: Project-Owned Fuel Availability and Pricing**
_Concept_: An MVP supplier has no category or product configuration beyond its commercial identity because every supplier is implicitly a fuel supplier. A project-supplier agreement selects one or more entries from the fixed system fuel catalog and keeps an effective-dated price history for each selection; fuel availability and price may differ for the same supplier across projects.
_Novelty_: Product scope and negotiated terms live at the point where they are operationally true, while the reusable supplier record remains stable and free of project-specific assumptions.

**[Project Wizard #71]: Optional Initial Operational Resources**
_Concept_: Project creation does not require fuel suppliers, operational employee allocations, or machine allocations. Their wizard steps may be completed or skipped, and each resource can be linked later; the client, one current manager, and at least one technical engineer remain mandatory project responsibilities but do not consume exclusive operational allocations.
_Novelty_: A project can be established before mobilization or procurement is complete without weakening its commercial and technical accountability requirements.

**[Project Wizard #72]: Required Weekly Schedule Baseline**
_Concept_: Atomic project finalization requires a valid standard weekly schedule. The schedule defines the project's default working days and time intervals before the project becomes active, while future RDOs may record different actual shift times without mutating that baseline.
_Novelty_: Every active project begins with an operational time reference even when mobilization resources are added later, enabling consistent defaults without confusing planned and actual work.

**[Work Schedule #73]: Optional Break Templates**
_Concept_: A required weekly project schedule may contain zero break templates. Named default breaks and their durations can be configured when useful, but their absence does not block project finalization or activation.
_Novelty_: Operational hours remain a mandatory baseline while break defaults stay proportional to the project's reality and do not invent pauses for schedules that manage them differently.

**[Future RDO Time Model #74]: Intraday Defaults and Cross-Midnight Actual Shifts**
_Concept_: Every interval in the project's standard weekly schedule starts and ends on the same calendar day. An actual RDO shift stores full start and end timestamps and may cross midnight, such as 07:00 to 01:00 the next day; confirmed break instances occur within that real interval and are commonly entered after the break has ended. Worked time and overtime use actual shift duration minus confirmed breaks, compared with the employee allocation's effective daily workload.
_Novelty_: Simple planning constraints do not distort field reality: overnight work is represented as one continuous operational shift instead of being split at midnight, and retrospectively confirmed breaks remain part of the same defensible time calculation.

**[Time Convention #75]: Fixed Brazil Business Time Zone**
_Concept_: The MVP interprets every company, project schedule, RDO business date, shift, and break using the IANA time zone `America/Sao_Paulo`, regardless of the company's or project's physical Brazilian location. Real instants are stored in UTC and converted at application boundaries; configurable company time zones are deferred.
_Novelty_: One explicit business-time convention avoids implicit server-local behavior and premature configuration while UTC persistence preserves a migration path if international or regional time-zone requirements emerge.

**[Work Schedule #76]: Seven-Day Schedule Without Mandatory Rest Day**
_Concept_: A valid project weekly schedule may mark all seven days as working days; the system does not require or infer a weekly rest day. In the current scope, weekend work alone does not create overtime: future overtime remains based on confirmed net worked time compared with the daily workload effective in each employee allocation.
_Novelty_: The schedule describes the project's operating pattern without imposing a labor-policy assumption that may differ among companies, keeping compensation calculations tied to explicit allocation terms.

**[Work Schedule #77]: One Daily Window with Suggested Breaks**
_Concept_: Each working day in the standard weekly schedule has exactly one start time and one end time on that same day, superseding the multiple-daily-interval possibility in decision #40. Preconfigured breaks do not split or constrain that window: at RDO closure, the operator may confirm, change, remove, or add break instances according to what actually occurred.
_Novelty_: A simple daily operating window keeps project setup predictable while suggested breaks reduce repetitive entry without becoming false operational evidence.

**[Future RDO Model #78]: Multiple Project Shifts per Business Date**
_Concept_: A project may create and close multiple distinct RDO shifts for the same business date, including parallel or sequential day and night operations. Each shift stores its own actual timestamps, confirmed breaks, participating employees, machines, meter evidence, and closure state; the project's single daily schedule window remains only a default.
_Novelty_: The planning model stays compact while actual operations can represent multi-shift projects without merging separate crews, equipment usage, or field confirmations into one oversized daily record.

**[Future Labor Calculation #79]: Daily Aggregation Across Shifts**
_Concept_: When the same corporation person participates in multiple project shifts assigned to one business date, the system sums net confirmed worked time across those shifts and compares the aggregate once against the daily workload effective in the person's operational allocation. A shift crossing midnight belongs to the business date on which it started.
_Novelty_: Splitting field work among RDOs cannot suppress overtime, and overnight operations retain one stable accounting date instead of dividing labor at the calendar boundary.

**[Future RDO Invariant #80]: One Open Project Shift at a Time**
_Concept_: A project may have multiple shifts assigned to the same business date only sequentially. At most one shift can be open for a project at any instant, the next shift may begin only after the current one is closed, and overlapping or parallel project shifts are deferred; this refines decision #78 by removing its parallel-shift possibility.
_Novelty_: A single open operational context simplifies field responsibility, resource participation, meter continuity, and closure while retaining the ability to record distinct day and night shifts on one date.

**[Authorization Roadmap #81]: Master Admin MVP with Scoped Future Roles**
_Concept_: Each corporation has a master administrator with unrestricted corporation access and the future ability to create other users. Planned roles include additional corporation administrators, managers with write access to selected companies and projects, read-only managers scoped to selected companies and projects, and project-specific field reporters who operate only through the mobile application. The MVP implements only master-administrator operation; user management and the additional roles are deferred, but authorization boundaries must not assume every future user has corporation-wide access.
_Novelty_: Immediate authentication stays narrow while the access model anticipates both company and project grants, preventing today's all-powerful administrator shortcut from becoming tomorrow's authorization architecture.

**[Authentication Scope #82]: CLI-Only Master Password Recovery**
_Concept_: The MVP does not implement public forgot-password, email delivery, or password-reset controllers. An authorized operator resets the corporation master administrator's credentials through the administrative CLI, using the same application validation and password-hashing services as normal authentication.
_Novelty_: The critical account remains recoverable without introducing an email subsystem or public recovery attack surface before end-user account management enters product scope.

**[Authentication Architecture #83]: Rotating Session with Selected Company**
_Concept_: The MVP uses a short-lived access token carrying `userId`, `corporationId`, current `companyId` when selected, and role claims, plus a rotating refresh token held in a secure `HttpOnly` cookie and bound to a persisted server-side session. Company selection or change updates the session and issues replacement tokens; logout revokes the session, and password change or administrative reset revokes every session for that user.
_Novelty_: Company context survives secure renewal without trusting browser-supplied tenant scope, while rotation and server-side revocation contain stolen tokens and support immediate account recovery controls.

**[Authentication Identity #84]: Corporation-Scoped User Email**
_Concept_: A normalized login email is unique within a corporation rather than across the entire platform. Host resolution first establishes the corporation, after which authentication resolves the user by the composite identity `corporationId + normalizedEmail`; the same email may belong to independent accounts in other corporations.
_Novelty_: Login identity follows the tenant boundary and avoids coupling unrelated customers through a global email namespace.

**[Canonical Provisioning Correction #85]: Empty Corporation Remains Valid**
_Concept_: Decision #23, which permits an authenticated corporation with no company, remains canonical. The later duplicated statement titled `Corporation Starts with a Company` is explicitly superseded: MVP provisioning does not require an initial company, and the corporation-scoped session may display an empty company-selection state until operators provision one through the CLI.
_Novelty_: The session record now resolves its internal contradiction without forcing placeholder operational data or exposing end-user company creation prematurely.

**[MVP Boundary #86]: No Company Deactivation Workflow**
_Concept_: The administrative CLI provisions corporations, domains, master administrators, and companies for the MVP but does not implement company deactivation, restoration, or closure workflows. Their effects on active projects, selected-company sessions, and historical access are deferred to a later product decision.
_Novelty_: Provisioning enables the required operating state without prematurely defining a high-impact company lifecycle that the first release does not need.

**[Equipment Invariant #87]: Mandatory Hour Meter**
_Concept_: Every machine or equipment item supported by the MVP is hour-metered. A machine cannot opt out of meter tracking, and its allocation, shift participation, reassignment, ownership transfer, and retirement follow the shared meter continuity rules.
_Novelty_: One mandatory evidence model removes ambiguous unmetered branches and establishes consistent foundations for utilization, fueling, maintenance, and cost calculations.

**[Equipment Integrity #88]: Initial and Monotonic Meter History**
_Concept_: Machine creation requires a confirmed initial hour-meter reading that becomes the first immutable meter-history record. Each later valid reading must be greater than or equal to the latest confirmed value; exceptional meter replacement or correction workflows are deferred and cannot be simulated through ordinary updates.
_Novelty_: Utilization begins from an explicit baseline and normal operations cannot silently move cumulative machine time backward.

**[Equipment Registration #89]: Plate-or-Tag Operational Identity**
_Concept_: Machine creation requires a name, description, type, manufacturer, model, and initial hour-meter reading, plus at least one company-unique operational identifier: plate or tag. A machine may carry both identifiers; each supplied identifier is normalized and unique among active machines of the owning company, while year and serial number remain optional.
_Novelty_: The registry supports both road-registered and internally tagged equipment without inventing a universal code, while preserving unambiguous field selection and meter provenance.

**[Equipment Reference Data #90]: Embedded Two-Value Machine Type**
_Concept_: The MVP machine type is a closed model enum with exactly two values representing `Linha Amarela` and `Linha Branca`. Companies cannot create additional machine types in this phase; manufacturer and model remain required textual machine fields.
_Novelty_: The classification reflects the immediate fleet distinction without introducing catalog administration before the product needs finer equipment taxonomy.

**[Equipment Semantics #91]: Specific Equipment Form in Model**
_Concept_: Within the fixed yellow-line or white-line classification, the required free-text `model` field identifies the specific equipment form, such as excavator, wheel loader, motor grader, truck, or another description. The MVP does not maintain a separate catalog of equipment forms.
_Novelty_: Broad fleet classification remains consistent while the model field accommodates operational vocabulary without adding another reference-data workflow.

**[Equipment Transfer #92]: Optional Destination-Side Registration Review**
_Concept_: Temporary reallocation between projects never changes machine registration data. During a permanent intercompany ownership transfer, the administrator is offered an optional review of identifiers and other machine fields for the destination company; destination uniqueness rules still apply. An entered hour-meter value creates a new confirmed reading greater than or equal to the latest reading and never overwrites meter history.
_Novelty_: Operational movement stays lightweight, while permanent ownership change can adapt company-specific identification and capture an updated meter checkpoint without falsifying prior registration or utilization evidence.

**[Equipment Correction #93]: Unreferenced Meter Correction Window**
_Concept_: An erroneous initial or ownership-transfer meter reading may be corrected only while no allocation, shift, subsequent reading, or other operational record references or follows it. The correction records actor, reason, old value, and new value; once depended upon, the reading is immutable and later historical adjustment requires a future dedicated workflow.
_Novelty_: Early data-entry mistakes remain recoverable without allowing corrections to invalidate an established chain of utilization evidence.

**[Temporal Scope #94]: Immediate Server-Timestamped Lifecycle Commands**
_Concept_: MVP employee reallocations and terminations, machine reallocations, ownership transfers, and asset retirements take effect when their commands successfully commit, using server-generated timestamps. Future scheduling and ordinary backdating are not supported; retrospective correction requires a separately designed exceptional workflow.
_Novelty_: Temporal exclusivity is enforced against one authoritative present, avoiding ambiguous races and historical rewrites while preserving dated periods for future reporting.

**[Project Lifecycle #95]: Explicit Planned State Before Activation**
_Concept_: Successful project-wizard finalization creates the project as `PLANNED`, superseding the direct-to-`ACTIVE` rule in decision #35. `PLANNED` represents an operationally configured project that has not begun execution; activation is an explicit domain command rather than an automatic consequence of the planned start date.
_Novelty_: Future projects remain distinguishable from work in progress, while administrators retain control over the real operational start instead of relying on calendar automation.

**[Project Mobilization #96]: Resource Reservation During Planning**
_Concept_: A `PLANNED` project may open operational employee and machine allocations, and those resources remain unavailable to every other project under the normal exclusivity rules. Premature or prolonged reservation is treated as an operational management decision rather than a system error. Activating the project records its actual production start timestamp, regardless of the planned start date, and means production is expected to begin immediately.
_Novelty_: The system supports real pre-start mobilization without weakening resource guarantees, while separating contractual planning dates from the administrator's explicit declaration that productive execution has begun.

**[Project Activation #97]: No Minimum Operational Resource Count**
_Concept_: Transition from `PLANNED` to `ACTIVE` does not require an operational employee or machine allocation. The project must retain its mandatory client, current manager, technical engineer, and valid weekly schedule, but activation may proceed with zero exclusive resources and records the administrator-declared actual production start.
_Novelty_: Activation expresses business commencement without embedding assumptions about whether production starts through owned labor, machines, third parties, or resources allocated immediately afterward.

**[Project Baseline #98]: Revision History After Activation**
_Concept_: While a project is `PLANNED`, its approved budget and planned start and end dates may be edited normally. Once `ACTIVE`, changing those values requires a reason and creates a new effective baseline revision rather than overwriting the prior one; future production and trajectory calculations use the revision effective for their intended analysis while preserving the original plan and every amendment.
_Novelty_: Contractual or planning changes remain possible without erasing the target against which earlier operational decisions and performance were understood.

**[Project Commercial History #99]: Effective Client Replacement**
_Concept_: While a project remains `PLANNED` and has no operational history, an incorrectly selected client may be replaced as setup correction. Once `ACTIVE`, a legitimate contracting-client change requires a reason, closes the current company-client period, and creates a new immediately effective period; prior client relationships remain immutable and visible historically.
_Novelty_: The project exposes one current owner without erasing contractual succession or treating a substantive post-start change as a harmless field edit.

**[Project Schedule History #100]: Effective Operational Baseline Revisions**
_Concept_: While a project is `PLANNED`, its weekly schedule and suggested break templates may be edited as setup data. Once `ACTIVE`, a change creates a new effective operational-baseline revision for future shifts; previously created or closed RDOs remain associated with the schedule and break defaults effective when their operational context was created.
_Novelty_: Administrators can evolve normal working patterns without retroactively changing the defaults, confirmations, or labor calculations that shaped earlier field records.

## Technique Execution Results

**First Principles Thinking:**

- **Interactive Focus:** Product value and the central decision problem around progress, budget, and remaining time.
- **Key Breakthroughs:** Knogest is an operational decision system rather than a cadastral application, while production intelligence remains downstream of RDO data.

**Ecosystem Thinking:**

- **Building on Previous:** Mapped corporation, company, project, people, machines, clients, and suppliers as distinct ownership and participation boundaries.
- **Key Breakthroughs:** Company-owned resources, corporation-wide person identity, temporal allocations, and reusable but isolated commercial records.

**Solution Matrix:**

- **Interactive Focus:** Compared and refined multi-tenancy, authentication, lifecycle, wizard, scheduling, supplier, and historical-integrity alternatives.
- **Key Breakthroughs:** Shared-schema isolation, token-scoped selected company, rotating sessions, atomic project creation, explicit state machines, and effective-dated histories.

**Decision Tree Mapping Preparation:**

- **Developed Foundation:** Defined prerequisites, conflicts, terminal states, deferred capabilities, and implementation boundaries needed to construct an executable MVP sequence.

**Overall Creative Journey:** The session moved from product purpose into precise domain invariants and architectural consequences. The user repeatedly narrowed generalized ideas to the smallest operationally truthful MVP while preserving paths for RDO, production intelligence, broader authorization, and auditability.

### Creative Facilitation Narrative

The collaboration was strongest when an apparently simple field exposed a temporal or ownership rule. Employee identity became corporation person plus company employment; machine movement separated project reallocation, company transfer, and retirement; and project setup evolved into a planned-state aggregate with explicit activation and versioned baselines.

### Session Highlights

**User Creative Strengths:** Clear operational intuition, willingness to revise earlier decisions, and strong preference for preserving historical truth.
**AI Facilitation Approach:** One decision at a time, alternating product, architecture, lifecycle, security, UX, and edge-case perspectives.
**Breakthrough Moments:** Corporation-wide physical-work exclusivity, project-specific fuel pricing, single-open-shift semantics, and `PLANNED` resource reservation.
**Energy Flow:** Sustained and decisive through 100 collaboratively accepted ideas.

## Idea Organization and Prioritization

### Thematic Organization

1. **Product and MVP Boundary:** Knogest begins as the trustworthy operational foundation for future progress, cost, and remaining-time intelligence. RDO, production, calculated cost, and forecasting remain downstream capabilities.
2. **Tenant and Session Foundation:** A shared PostgreSQL schema isolates corporations through trusted host resolution and signed request context. The selected company belongs to a rotating server-side session rather than route parameters or browser state.
3. **Workforce Identity and History:** Corporation people, company employments, employment periods, responsibilities, and exclusive operational allocations represent distinct lifecycles.
4. **Fleet Integrity:** Mandatory meter history, company ownership periods, project allocations, intercompany transfer, and retirement preserve machine identity without overwriting evidence.
5. **Project Aggregate:** Atomic wizard finalization creates a `PLANNED` project with required commercial, managerial, technical, address, schedule, budget, and date baselines; resources and fuel suppliers remain optional.
6. **Commercial and Fuel Context:** Clients and fuel suppliers are separate company-owned registries. Fuel availability and effective pricing belong to each project-supplier agreement.
7. **Future RDO Time Model:** One open shift per project, sequential shifts on the same business date, actual cross-midnight timestamps, confirmed breaks, and person-day labor aggregation guide later mobile work.
8. **Reliability and Historical Truth:** Transactions, database constraints, idempotency, structured conflicts, cursor pagination, irreversible historical soft deletion, and actor attribution protect shared behavior.

### Breakthrough Concepts

- **Corporation person plus company employment:** permits legitimate multi-company employment while enforcing one physical operational allocation per corporation.
- **`PLANNED` as mobilization:** planned projects may reserve resources; activation explicitly records the real production start.
- **Three machine movements:** project reallocation, intercompany ownership transfer, and terminal retirement are separate commands.
- **Project-owned fuel terms:** the supplier is reusable, while products and price histories vary by project.
- **Versioned truth after activation:** budget, dates, client, schedule, and break defaults evolve through effective revisions rather than destructive updates.

### Canonical Conflict Resolutions

- A corporation may exist with zero companies; the duplicated `Corporation Starts with a Company` fragment is superseded by decision #85.
- Clients remain company-scoped and are not exposed through corporation-wide aggregate client access in the MVP; the duplicated corporation-visible client fragment is superseded by the strict company boundary.
- Supplier-level fuel pricing is superseded by project-supplier fuel pricing.
- Project creation now produces `PLANNED`, not `ACTIVE`.
- Standard schedules use one daily window, not multiple daily intervals.
- Multiple shifts may occur on one business date only sequentially, never in parallel for one project.

### Prioritization Results

**P0 - Platform Foundation**

- Shared-schema tenant enforcement and trusted request context.
- Host-resolved login, persisted rotating sessions, company selection/change, refresh, logout, and revocation.
- Administrative provisioning and master-password-reset CLI.
- Standard API envelope, cursor pagination, validation, conflict, and idempotency contracts.

**P1 - Company Registries**

- Corporation people, company employments, and employment periods.
- Company clients and fuel suppliers.
- Fixed fuel catalog.
- Machines, ownership periods, and meter readings.
- Cursor-paginated CRUD and active-record selection behavior for each registry.

**P2 - Project Aggregate and Mobilization**

- Project wizard and `PLANNED` lifecycle.
- Client, manager, technical engineers, address, contract reference, budget, dates, schedule, and optional break defaults.
- Optional employee, machine, and fuel-supplier project setup.
- Exclusive allocations, project-specific fuel products and prices, activation, pause, reactivation, completion, and cancellation guards.

**P3 - Historical Lifecycle Operations**

- Employee rehire, responsibility-safe termination, and reallocation.
- Machine reallocation, transfer, retirement, and safe meter correction.
- Manager/client tenure changes and post-activation baseline revisions.
- Operational schedule revisions and historical selection reads.

**Deferred Beyond the MVP**

- RDO/mobile implementation, production, calculated costs, progress, forecasting, maintenance, fueling events, generic suppliers, full audit log, end-user company lifecycle, public password recovery, and non-master user management.

## Initial Architecture

### Runtime Boundaries

- **Auth and Tenant Context:** resolves corporation from host, authenticates the user, loads the persisted session, and exposes trusted `userId`, `corporationId`, `companyId`, role, and session identifiers.
- **Organization:** owns corporations, domains, companies, master users, and administrative CLI workflows.
- **Workforce:** owns corporation people, company employments, employment periods, responsibilities, and operational employee allocations.
- **Fleet:** owns machines, company ownership periods, meter readings, operational allocations, transfers, and retirement.
- **Commercial:** owns clients, fuel suppliers, the fixed fuel catalog, and project-supplier fuel terms.
- **Projects:** owns project identity, state transitions, baseline revisions, schedules, breaks, manager tenures, technical responsibilities, wizard finalization, and aggregate orchestration.

### Persistence Rules

- Every tenant record carries `corporationId`; every company-owned record also carries `companyId`.
- Composite foreign keys and indexes include ownership scope where practical so foreign-company relationships cannot be persisted accidentally.
- Partial unique indexes enforce active identifiers and one open temporal period where PostgreSQL can express the invariant directly.
- Cross-aggregate commands use database transactions; expected exclusivity races become structured `409 Conflict` responses.
- Historical periods are closed and replaced, never reopened or overwritten.
- Real instants are stored in UTC and interpreted with `America/Sao_Paulo` business time in the MVP.

### Application Rules

- Controllers own transport parsing and the outer HTTP envelope.
- Handlers/use cases own authorization decisions, domain validation, transactions, and response data.
- Repositories receive trusted scope explicitly and never infer tenant or company from client payloads.
- Domain commands replace generic field updates for activation, pause, allocation, reassignment, termination, transfer, retirement, and revision creation.
- The project wizard submits one idempotent aggregate command; no project or allocation draft is persisted before finalization.

## Action Planning

### Phase P0 - Platform Foundation

1. Reconcile the schema and auth implementation with the canonical tenant/session decisions.
2. Implement host resolution, login bootstrap, rotating refresh sessions, company selection/change, logout, and global session revocation.
3. Implement idempotent provisioning and password-reset CLI commands.
4. Align validation, error envelopes, cursor pagination, Swagger, and idempotency primitives.
5. Add tenant-isolation, company-scope, refresh-reuse, revocation, and pagination contract tests.

**Completion Criteria:** No authenticated company operation can execute without trusted corporation and selected-company context; cross-tenant probes fail; session rotation and revocation are tested; CLI provisioning is repeatable.

### Phase P1 - Company Registries

1. Add corporation-person, company-employment, and employment-period schema and handlers.
2. Add client and fuel-supplier registries with normalized active CPF/CNPJ uniqueness.
3. Seed the fixed fuel catalog.
4. Add machine, ownership-period, and immutable meter-reading schema and handlers.
5. Deliver cursor-paginated list, create, update, history-aware delete, and selection endpoints with Swagger coverage.

**Completion Criteria:** Every registry is isolated by corporation and company, deleted historical records are unselectable, identifier conflicts are deterministic, and machine meters cannot move backward.

### Phase P2 - Project Aggregate

1. Add project state, baseline, schedule, break, manager, technical-responsibility, allocation, supplier-agreement, and fuel-price structures.
2. Implement wizard validation and atomic idempotent finalization into `PLANNED`.
3. Implement employee and machine availability queries and conflict-safe allocation commands.
4. Implement project supplier/product/price configuration.
5. Implement activation, pause, reactivation, completion, and cancellation commands with transition guards.

**Completion Criteria:** A valid wizard either creates the entire planned aggregate once or creates nothing; concurrent resource conflicts return actionable `409` details; project transitions preserve every allocation and responsibility invariant.

### Phase P3 - Historical Operations

1. Implement employee rehire, termination, manager replacement, technical-responsibility changes, and reassignment.
2. Implement machine reassignment, ownership transfer, retirement, and unreferenced meter correction.
3. Implement client changes and effective budget/date/schedule baseline revisions.
4. Add historical read models needed by the dashboard without making deleted records operationally selectable.

**Completion Criteria:** Every consequential change preserves prior periods, records actor and reason where required, and cannot create overlapping ownership, employment, responsibility, or operational allocation state.

### Recommended Delivery Rhythm

- Build each phase as a vertical backend slice: migration, domain command, handler, controller, Swagger contract, unit tests, and integration tests.
- Connect the already implemented dashboard after each P1/P2 module stabilizes rather than waiting for every backend module.
- Run explicit concurrency tests for allocation and idempotency paths before considering P2 complete.

## Critical Open Questions

Resolve these immediately before their owning phase rather than blocking P0 as a whole:

1. Access-token lifetime, refresh-token lifetime, idle expiration, absolute session expiration, and cookie host/domain policy.
2. Exact company, corporation-domain, and master-administrator fields required by CLI provisioning.
3. CPF/CNPJ validation library, encryption or masking policy, and LGPD retention/access expectations.
4. Allowed compensation modes, monetary currency/precision, and overtime-rate representation in employee allocation terms.
5. Job-role representation: free text, fixed system values, or company-owned catalog.
6. Exact fixed fuel catalog entries, units, decimal precision, and price effective-time granularity.
7. Maximum wizard collection sizes and API payload limits for initial employees, machines, engineers, and suppliers.
8. Which dashboard historical views are required in the MVP versus data preservation only.

## Session Summary and Insights

### Key Achievements

- Converted an initially broad earthworks-management idea into a bounded backend and dashboard MVP.
- Established a multi-tenant architecture with a second strict company ownership boundary.
- Defined temporal domain models for labor, fleet, project responsibility, commercial ownership, and baselines.
- Produced a prioritized implementation path with measurable completion criteria.

### Session Reflection

The strongest organizing principle is that current operational state must be easy to query while historical truth must never depend on mutable current fields. The MVP should therefore invest first in trusted scope, explicit commands, temporal periods, and relational constraints; future RDO and production intelligence can then consume stable operational facts instead of forcing a data-model rewrite.

**[Provisioning Invariant #23]: Corporation Starts with a Company**
_Concept_: A corporation cannot enter operational use without at least one company. Provisioning creates the corporation, its initial domain mapping, its administrator, and its first company as one atomic onboarding operation before the first login is possible.
_Novelty_: This eliminates an unusable authenticated state in which the restricted corporation token has no company to select and no permission to create one.

**[Architecture Decision #10]: Company-Owned, Corporation-Visible Clients**
_Concept_: Each client belongs to exactly one company and may be linked only to projects owned by that company. Corporation-level overview endpoints may aggregate clients across all companies in the authenticated corporation for read-only visibility, but sibling companies gain no ownership or association rights.
_Novelty_: Authorization distinguishes aggregate visibility from resource ownership, allowing corporate insight without weakening company-level domain boundaries or enabling accidental cross-company reuse.

## Session Completion

The brainstorming workflow is complete with 100 collaboratively accepted decisions organized into eight architectural themes and four prioritized delivery phases. Canonical conflict resolutions in the organization section supersede the two legacy fragments immediately above.

**Final Outcomes:**

- Prioritized backend and dashboard MVP scope.
- Explicit product and lifecycle decisions.
- Initial shared-schema multi-tenant architecture.
- Critical open questions assigned to their owning phases.
- Executable P0-P3 delivery plan with completion criteria.

**Recommended Continuation:** Begin P0 by reconciling the existing backend schema and authentication implementation against the tenant/session contract, then convert the resulting gap analysis into implementation stories.
