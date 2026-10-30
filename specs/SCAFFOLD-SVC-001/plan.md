# Implementation Plan: SCAFFOLD-SVC-001

## Technical Context
- Technology stack: IBM CICS Transaction Server for z/OS, COBOL (LGACUS01, LGACDB01, LGACVS01), PL/I (LGUPDB01-PLI), IBM Db2 for z/OS (EXEC SQL), VSAM KSDS (EXEC CICS WRITE/READ), CICS Syncpoint API (two-phase commit), IBM z/OS Connect EE (RESTful API facade), CICS COMMAREA (inter-program data exchange), IBM RACF (transaction-level authorization), IBM Z System Logger / CICS Journal (audit logging), DB2 Native Encryption (PII at rest), IBM Data Privacy Passports (VSAM PII protection), IBM Z WLM (HIGH priority service class).
- Platform: backend.
- Set up the project skeleton for this stack: dependency manifest, entrypoint, and linting/formatting config.
- Add environment-based configuration loading (no hardcoded secrets or endpoints).
- Add a health-check endpoint so the service can be verified as running locally.
- Existing class (C4): LGACUS01 (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): LGCMAREA (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): LGACDB01 (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): LGACVLD01 (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): BD5CRED01 (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): CustomerEntity (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): CustomerSecureEntity (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): DuplicateCheckService (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): LGACDB02 (see [references/SVC-001.md](./references/SVC-001.md))
- Existing class (C4): LGACDB03 (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: POST /api/v1/customers/registrations -- Orchestrates the end-to-end atomic customer registration workflow. Captures, validates, and persists new customer demographic data (name, address, date of birth, optional phone numbers) across DB2 CUSTOMER table, DB2 CUSTOMER_SECURE table, and VSAM KSDSCUST file within a single CICS-managed two-phase commit transaction boundary. Performs duplicate detection, generates BD5 security credentials, and applies compensating rollback logic on partial failure. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: GET /api/v1/customers/registrations/{transactionId}/status -- Retrieves the status of a previously submitted customer registration transaction. Useful for async or long-running registration scenarios where the caller needs to poll for completion or failure details. (see [references/SVC-001.md](./references/SVC-001.md))
- Existing API endpoint: GET /health -- Returns the health status of the CustomerRegistrationService and its downstream dependencies (DB2, VSAM KSDSCUST, CICS transaction manager). Used by load balancers, API gateways, and monitoring systems. (see [references/SVC-001.md](./references/SVC-001.md))

## Contract Changes
- No material API, event, or data contract change is evidenced.

## Security and Quality
- Validate credential and personal-data handling against the story's acceptance criteria.
- The scaffolded service must start successfully and its health-check endpoint must respond, using only environment-based configuration.

## Verification Plan
- **AC-1**: Scaffold the User Service (business) per its approved architecture. Technology stack: Node.js with TypeScript (Express/Fastify) or Java Spring Boot, bcrypt / Argon2 (password hashing), JWT (jsonwebtoken / jjwt) for token coordination, TypeORM / Hibernate (ORM with Repository Pattern), PostgreSQL (primary write store) with read replicas (CQRS query path), Redis 7.x (OTP tokens, idempotency keys, session data, profile cache), Apache Kafka / RabbitMQ (Transactional Outbox event publishing), Debezium or scheduled outbox poller (CDC for outbox processing), Flyway / Liquibase (schema migrations), MapStruct / class-transformer (DTO mapping), Docker + Kubernetes (EKS/GKE/AKS), OpenTelemetry (distributed tracing). Responsibilities: Handle email-based and mobile-based user registration flows using the Strategy Pattern (EmailRegistrationStrategy, MobileRegistrationStrategy); Validate credential format (email regex, mobile E.164 format) and enforce uniqueness constraints; Hash and securely store user passwords using bcrypt/Argon2; never persist plaintext credentials; Coordinate OTP generation and email verification token issuance, storing tokens in Redis with TTL; Enforce idempotency for registration requests using idempotency keys cached in Redis; Manage full account lifecycle: creation, verification, profile update, soft-delete/deactivation; Implement CQRS: separate Command Handlers (register, update, deactivate) and Query Handlers (profile retrieval) with read-replica and Redis cache for query path; Publish domain events (UserRegistered, AccountVerified, AccountUpdated) to the Event Bus via Transactional Outbox Pattern; Expose user identity and profile APIs for consumption by Wishlist Service and Product & Catalog Service via the API Gateway; Maintain audit trail entries for all account mutations (written to outbox and consumed by Audit & Logging Service); Encrypt PII fields (email, mobile) at rest using AES-256 before persistence; Apply input sanitization on all incoming DTOs to prevent injection attacks. Ground the generated spec in this service's own C3/C4 diagrams and API spec already on file in Architecture, not just this summary.
- **Expected evidence**: test result for AC-1

## Traceability
| Criterion | Functional Spec Ref | Accepted Impact Hash |
|-----------|--------------------|-----------------------|
| AC-1 | spec_functional | not set |
