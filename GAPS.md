# SCAFFOLD-SVC-001 – Open gaps (need human input)

1. **Spec inconsistency**: `scaffold_setup`/`test_plan` AC-1 describe an *Account Management Service* (Node.js, Express, OAuth2/JWT), while the tech stack, AGENTS.md and endpoints describe the Java/Spring *Claims & Case Management Service*. This scaffold follows the latter.
2. **Database**: PostgreSQL vs SQL Server undecided; PostgreSQL driver used as placeholder. Env: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.
3. **Broker**: Kafka vs RabbitMQ undecided; Kafka client placeholder (`BROKER_BOOTSTRAP_SERVERS`). Outbox not implemented.
4. **Workflow library**: Spring Statemachine vs lightweight library undecided; none added.
5. **GET /health schema**: embedded OpenAPI / `references/SVC-001.md` not available; `{"status":"UP"}` taken from the task text.
6. **Authentication/RBAC**: mechanism undefined; only `/health` is public, all else requires auth (placeholder HTTP basic).
7. **C4 classes and other endpoints** (claims, documents, triage, etc.) are intentionally not implemented.
8. **AC-1 test obligation** is the (inconsistent) scaffold statement; `HealthControllerTest` covers the health endpoint only.
9. Build/tests were not executed in this environment (no approved Java/Maven run).

Env vars: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `BROKER_BOOTSTRAP_SERVERS`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `POLICY_SERVICE_URL`, `CUSTOMER_SERVICE_URL`, `DOCUMENT_SERVICE_URL`, `NOTIFICATION_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `RULES_ENGINE_URL`, `SERVER_PORT`, `OTEL_TRACE_SAMPLING`.
