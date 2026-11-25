# Implementation Plan: SCAFFOLD-SVC-001

## Technical Context
- Technology stack: Java 17, Spring Boot, Spring Web MVC/REST, Spring Data JPA, Spring Security, Spring Statemachine or lightweight workflow library, PostgreSQL or SQL Server, Kafka or RabbitMQ client (for domain events via outbox pattern), Redis client for caching, OpenTelemetry SDK for tracing and metrics.
- Platform: backend.
- Set up the project skeleton for this stack: dependency manifest, entrypoint, and linting/formatting config.
- Add environment-based configuration loading (no hardcoded secrets or endpoints).
- Add a health-check endpoint so the service can be verified as running locally.
- Add a database connection helper for the stack's datastore, configured via environment variables.
- Existing class (C4): Claim (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): Draft (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): Investigation (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): InvestigationTask (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): SettlementRecommendation (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): FraudEvaluation (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): ClaimSubmissionController (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): TriageAssignmentController (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): InvestigationController (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): SettlementController (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: GET /health -- Returns basic health status of the Claims & Case Management Service. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: POST /api/v1/claims/drafts -- Create a new claim draft in Draft state for an authenticated Policyholder or Agent. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: PUT /api/v1/claims/drafts/{draftId} -- Update an existing claim draft using optimistic locking via draftRevision. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: POST /api/v1/claims/drafts/{draftId}/submit -- Convert a valid Draft claim into Submitted state, assign claim number, emit events, and trigger confirmation. Enforces idempotent submission via Idempotency-Key header retained 24h. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: GET /api/v1/claims/{claimId} -- Retrieve a submitted claim with basic details including triage and assignment state. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: POST /api/v1/documents -- Attach supporting documents to a claim. Stores metadata and returns document identifier. Actual content upload may be handled via multipart or pre-signed URL. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: GET /api/v1/triage/queues/unassigned -- Return claims currently in UNASSIGNED_TRIAGE for analysts, with server-side pagination and filtering. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: POST /api/v1/triage/assignments/manual -- Manually assign an UNASSIGNED_TRIAGE claim to an investigator by an authorized Analyst. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: POST /api/v1/triage/assignments/bulk -- Perform bulk assignment of claims to investigators with pre-validation and optional dry-run. Enforces RBAC triage:assign and optimistic concurrency. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: POST /api/v1/triage/escalations -- Set a claim to escalated state with timestamp in UTC, optionally reassigning to an escalation-capable investigator. Suspends auto-routing while escalated. Supervisor-only. (see [references/SVC-001.md](./references/SVC-001.md))

## Contract Changes
- No material API, event, or data contract change is evidenced.

## Security and Quality
- Validate credential and personal-data handling against the story's acceptance criteria
- The scaffolded service must start successfully and its health-check endpoint must respond, using only environment-based configuration.

## Verification Plan
- **AC-1**: Scaffold the Account Management Service (business) per its approved architecture. Technology stack: Node.js, OAuth 2.0, JWT, PostgreSQL, Express.js. Responsibilities: User authentication and authorization; Account registration and management; OAuth 2.0 flow management; Token generation and validation. Ground the generated spec in this service's own C3/C4 diagrams and API spec already on file in Architecture, not just this summary.

## Evidence and Traceability
- Expected evidence: test result for AC-1.
- Clause traceability:
  - Clause AC-1 traces to acceptance criterion AC-1.
- Traceability matrix:
  - Criterion AC-1 is linked to functional spec reference `spec_functional`.
- Accepted impact hash: null (no accepted impact revision recorded).
