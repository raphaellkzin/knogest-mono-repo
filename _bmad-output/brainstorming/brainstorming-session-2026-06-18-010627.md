---
stepsCompleted: [1, 2]
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
ideas_generated: []
context_file: 'app.md'
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

**[Provisioning Invariant #23]: Corporation Starts with a Company**
_Concept_: A corporation cannot enter operational use without at least one company. Provisioning creates the corporation, its initial domain mapping, its administrator, and its first company as one atomic onboarding operation before the first login is possible.
_Novelty_: This eliminates an unusable authenticated state in which the restricted corporation token has no company to select and no permission to create one.

**[Architecture Decision #10]: Company-Owned, Corporation-Visible Clients**
_Concept_: Each client belongs to exactly one company and may be linked only to projects owned by that company. Corporation-level overview endpoints may aggregate clients across all companies in the authenticated corporation for read-only visibility, but sibling companies gain no ownership or association rights.
_Novelty_: Authorization distinguishes aggregate visibility from resource ownership, allowing corporate insight without weakening company-level domain boundaries or enabling accidental cross-company reuse.
