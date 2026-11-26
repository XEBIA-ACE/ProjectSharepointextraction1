# Implementation Plan: US-007

## Technical Context
- Accepted impact analysis (sha256:095b3e00638cd45a6ad538edb3fdd1bf82d9afe6fd6aea43e3dcabe6dc2e657b)
- Implement only against Accepted impact analysis (revision 1) (fingerprint sha256:095b3e00638cd45a6ad538edb3fdd1bf82d9afe6fd6aea43e3dcabe6dc2e657b)
- Resolve or explicitly accept the following implementation-readiness items:
  - Are there any admin POST endpoints that must be exempted from CSRF enforcement for technical or backward-compatibility reasons (e.g., machine-to-machine APIs), and if so, how are they identified and justified?
  - Are there performance or rate-limiting considerations for CSRF checks on high-throughput admin POST endpoints that might influence where and how the checks are implemented (e.g., at gateway vs application layer)?
  - Assume GET and other idempotent methods under /api/admin/* are out of scope for CSRF protection unless they are already covered by other requirements.
  - Assume a standard error schema (code, message, timestamp in UTC, correlation_id, path) is already defined elsewhere and this story focuses on ensuring CSRF 403 responses conform to it.
  - Assume correlation IDs are already generated and propagated through the system, and the change is to ensure they are included in CSRF denial responses and corresponding logs.
  - Assume that non-admin flows and public APIs either have separate CSRF requirements or are intentionally out of scope for this change, so behavior there must remain backward compatible.
  - Assume that the UI or clients interacting with admin POST endpoints can be updated, if necessary, to send the required CSRF header and handle same-site cookies, within the same epic or related work.
  - Assume the platform supports same-site cookies and custom headers in the current browser/client environment and that this CSRF pattern is acceptable from a security-review standpoint.
  - Assume the system already has an authenticated administrator concept and role guards, and this story only adds CSRF protection on top of existing authn/z for admin POST routes.
  - Assume there is an established admin API namespace resembling /api/admin/*, and all relevant admin POST operations are routed through it.
  - Assume there is an existing logging and monitoring infrastructure capable of receiving structured security logs, and only schema and content changes are required for CSRF denials.
  - Assume there is no requirement to persist CSRF denial events beyond normal logging retention policies; any advanced auditing or incident-response integration is handled by other stories.
  - How is the CSRF token generated, bound (to user, session, device), rotated, and invalidated, and are there existing libraries or services that must be used?
  - How will client applications (web UI, admin consoles, API consumers) be updated to obtain and send the CSRF token header along with the same-site cookie, and is there existing client-side infrastructure for this?
  - Is there a canonical, versioned definition of the standard error schema, including exact field names, types, and allowed values for code and message?
  - No code-level information is available to confirm the current implementation of admin routes or whether a CSRF mechanism already exists.
  - No codebase evidence was available (grounding provider is None); every impact listed is inferred from the requirement text, not measured.
  - No codebase evidence: the project's grounding provider is None, so this impact analysis was inferred by the model from the requirement text alone
  - No concrete list of endpoints under /api/admin/* is provided, so uniform enforcement coverage cannot be verified.
  - No details on the existing error-handling framework or how the standard error schema is currently implemented are available.
  - No information on existing client applications’ handling of CSRF tokens (cookies and headers) is available, so compatibility and required updates cannot be assessed.
  - No samples of current logging configuration or correlation ID propagation are provided, so the exact changes needed for CSRF denials are unknown.
  - Should CSRF denial events trigger any security alerts or metrics thresholds, and if so, what constitutes normal vs anomalous volume?
  - Should CSRF tokens differ between admin and non-admin contexts, or is a shared token acceptable from a security perspective?
  - What exact paths constitute the admin POST surface—does it include only literal /api/admin/* endpoints or also other admin-related paths and subdomains?
  - What is the exact format and propagation mechanism for correlation IDs, and are there existing logging standards that CSRF denial logs must comply with?
  - Which existing components implement each acceptance criterion?
  - Which fields are considered PII or sensitive in this domain, so that implementers know exactly what must be excluded from error responses and logs?

## Contract Changes
- INFERRED: all admin POST endpoints under an /api/admin/*-style namespace require CSRF validation using same-site cookie + header — change required
- INFERRED: HTTP POST only for admin routes — change required
- INFERRED: application publishes structured denial logs/events — change required
- INFERRED: introduction or modification of a CSRF token data model (token value, validity, binding to user/session, expiry). — change required
- INFERRED: standardized error response payload for 403 denials containing only code, message, UTC timestamp, correlation_id, and path, with explicit exclusion of PII or other sensitive fields. — change required
- INFERRED: log entry schema for CSRF-denied admin POSTs including correlation_id and request path while omitting PII and other sensitive data. — change required

## Security and Quality
- US-007-ac-1: Enforce CSRF protection on authenticated admin POSTs so that missing or invalid CSRF cookie/header combinations result in a 403 response using the agreed standard error schema and containing no sensitive data; ensure this logic does not interfere with role guards or other authn/z flows that are out of scope.
- US-007-ac-2: Ensure that authenticated admin POSTs with a valid CSRF token (in a same-site cookie and matching custom header) are allowed to proceed and return a 2xx response when the underlying operation succeeds, without introducing regressions in existing admin workflows.
- US-007-ac-3: Ensure that every admin POST denied due to CSRF failure produces a structured, security-appropriate log record including the correlation_id and request path but explicitly excluding PII or other sensitive content, and that these logs integrate with the organization’s monitoring/alerting practices.
- US-007-ac-4: Ensure that CSRF checks are consistently and uniformly applied across all admin POST endpoints under the inferred /api/admin/* namespace, avoiding any bypasses or inconsistencies between endpoints.
- Validate credential and personal-data handling against the story's acceptance criteria

## Verification Plan
- **US-007-ac-1**: Given an authenticated administrator, When making a POST to /api/admin/* without the CSRF header or cookie, Then the response is 403 with the standard error schema (code, message, timestamp in UTC, correlation_id, path) and no sensitive data (EP-001-R5, EP-001-R3).
- **US-007-ac-2**: Given an authenticated administrator, When making a POST to /api/admin/* with a valid CSRF token in a same-site cookie and matching custom header, Then the response is successful (2xx) (EP-001-R5).
- **US-007-ac-3**: Given any denied admin POST due to CSRF, When the response is returned, Then a structured log entry is recorded with the correlation_id and request path and without PII (EP-001-R6).
- **US-007-ac-4**: Given multiple POST endpoints under /api/admin/*, When requests are made, Then CSRF checks are applied uniformly across all of them (EP-001-R5).
- **IMPACT**: US-007-ac-1: Create automated tests (unit, integration, and/or API tests) that, for authenticated admin users, exercise POST requests under the admin namespace without CSRF header and/or cookie and assert 403 responses with the exact standard error schema fields (code, message, UTC timestamp, correlation_id, path) and verify absence of sensitive data.
- **IMPACT**: US-007-ac-2: Create automated tests that, for authenticated admin users, send POST requests under the admin namespace with a valid CSRF token in a same-site cookie plus matching custom header and assert successful 2xx responses, verifying that valid tokens do not cause erroneous denials or regressions.
- **IMPACT**: US-007-ac-3: Create tests that trigger CSRF-denied admin POSTs and verify that a structured log entry is emitted containing the correlation_id and request path and no PII or sensitive attributes, potentially via log-capture or mock logging sinks.
- **IMPACT**: US-007-ac-4: Create coverage across multiple distinct admin POST endpoints under the admin namespace to confirm that CSRF checks are enforced uniformly (both for valid and invalid/missing tokens), with no endpoint-specific bypasses or divergent behavior.

## Provenance
- Policy version: `ace-spec-format/v1`
- Accepted impact analysis revision: `1`
- Accepted impact analysis: `sha256:095b3e00638cd45a6ad538edb3fdd1bf82d9afe6fd6aea43e3dcabe6dc2e657b`
- Repository baseline commit: `49198c8301190b914b6907286628aca0b68616a9`