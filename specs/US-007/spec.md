# Feature Specification: US-007

## User Story
As an Administrator, I want admin POST operations to require a valid CSRF token via same-site cookie and header, so that forged requests are prevented while legitimate actions succeed.

## Scope and Behavior
For all authenticated administrator POST requests to endpoints under /api/admin/*, the system enforces CSRF protection using a same-site cookie plus matching custom header token. If the required CSRF cookie or header is missing or invalid, the request is denied with HTTP 403 and a standardized, non-sensitive error payload, and a structured, non-PII log entry referencing the correlation_id and request path is recorded. If both cookie and header contain a valid, matched CSRF token, the POST is allowed to proceed and may return a successful 2xx response if the underlying operation succeeds. This CSRF behavior is applied consistently across all admin POST endpoints within the /api/admin/* namespace.

In scope: CSRF enforcement for admin POST requests, use of the standard error schema on CSRF-related 403 responses, consistent enforcement across all /api/admin/* POST endpoints, and observability/logging for CSRF denials.

Out of scope: role guard and authorization logic, and transport security headers.

## User Scenarios & Acceptance Criteria
- **US-007-ac-1**: Given an authenticated administrator, When making a POST to /api/admin/* without the CSRF header or cookie, Then the response is 403 with the standard error schema (code, message, timestamp in UTC, correlation_id, path) and no sensitive data (EP-001-R5, EP-001-R3).
- **US-007-ac-2**: Given an authenticated administrator, When making a POST to /api/admin/* with a valid CSRF token in a same-site cookie and matching custom header, Then the response is successful (2xx) (EP-001-R5).
- **US-007-ac-3**: Given any denied admin POST due to CSRF, When the response is returned, Then a structured log entry is recorded with the correlation_id and request path and without PII (EP-001-R6).
- **US-007-ac-4**: Given multiple POST endpoints under /api/admin/*, When requests are made, Then CSRF checks are applied uniformly across all of them (EP-001-R5).

## Functional Requirements
- FR-US-007-001 (US-007-ac-1): For any authenticated administrator making an HTTP POST request to an endpoint under the /api/admin/* namespace without providing the required CSRF token via either the CSRF same-site cookie or the custom CSRF header, the system SHALL respond with HTTP status code 403 and a response body that conforms exactly to the agreed standard error schema: fields code, message, timestamp (in UTC), correlation_id, and path, and SHALL NOT include any sensitive data beyond those fields. (Trace: EP-001-R5, EP-001-R3).
- FR-US-007-002 (US-007-ac-2): For any authenticated administrator making an HTTP POST request to an endpoint under the /api/admin/* namespace with a valid CSRF token present in a same-site cookie and a matching value in the custom CSRF header, the system SHALL NOT deny the request due to CSRF and SHALL allow the underlying admin operation to execute so that, if that operation completes successfully, the API response is an HTTP 2xx status code. (Trace: EP-001-R5). Note: The acceptance criterion does not specify the exact 2xx code or response body, only that the response is successful (2xx).
- FR-US-007-003 (US-007-ac-3): For every admin POST request under /api/admin/* that is denied due to a CSRF failure (including missing or invalid CSRF cookie and/or header), when the 403 response is returned, the system SHALL emit a structured log entry that includes at least the correlation_id associated with the request and the request path, and SHALL explicitly exclude PII or other sensitive information from that log entry, in alignment with organizational logging standards. (Trace: EP-001-R6). Ambiguity: The specific log sink, log format, and full schema are not defined here and must be aligned with existing logging infrastructure.
- FR-US-007-004 (US-007-ac-4): The CSRF validation behavior described in FR-US-007-001, FR-US-007-002, and FR-US-007-003 SHALL be applied uniformly to all HTTP POST endpoints under the /api/admin/* namespace, such that there are no admin POST endpoints in this namespace that bypass or implement a different CSRF enforcement mechanism, unless explicitly exempted by separate requirements. (Trace: EP-001-R5). Ambiguity: The exact list of endpoints under /api/admin/* is not defined in this story and must be confirmed elsewhere.

## API, Event, and Data Contracts
- API: INFERRED: all admin POST endpoints under an /api/admin/*-style namespace require CSRF validation using same-site cookie + header (INFERRED: HTTP POST only for admin routes).
- Event: INFERRED: application publishes structured denial logs/events to an INFERRED: security/operations monitoring stream or log sink receiving CSRF denial events with correlation IDs.
- Data: INFERRED: introduction or modification of a CSRF token data model (token value, validity, binding to user/session, expiry).
- Data: INFERRED: standardized error response payload for 403 denials containing only code, message, UTC timestamp, correlation_id, and path, with explicit exclusion of PII or other sensitive fields.
- Data: INFERRED: log entry schema for CSRF-denied admin POSTs including correlation_id and request path while omitting PII and other sensitive data.

## Success Criteria & Test Obligations
- **US-007-ac-1**: Given an authenticated administrator, When making a POST to /api/admin/* without the CSRF header or cookie, Then the response is 403 with the standard error schema (code, message, timestamp in UTC, correlation_id, path) and no sensitive data (EP-001-R5, EP-001-R3).
- **US-007-ac-2**: Given an authenticated administrator, When making a POST to /api/admin/* with a valid CSRF token in a same-site cookie and matching custom header, Then the response is successful (2xx) (EP-001-R5).
- **US-007-ac-3**: Given any denied admin POST due to CSRF, When the response is returned, Then a structured log entry is recorded with the correlation_id and request path and without PII (EP-001-R6).
- **US-007-ac-4**: Given multiple POST endpoints under /api/admin/*, When requests are made, Then CSRF checks are applied uniformly across all of them (EP-001-R5).
- **IMPACT**: US-007-ac-1: Create automated tests (unit, integration, and/or API tests) that, for authenticated admin users, exercise POST requests under the admin namespace without CSRF header and/or cookie and assert 403 responses with the exact standard error schema fields (code, message, UTC timestamp, correlation_id, path) and verify absence of sensitive data.
- **IMPACT**: US-007-ac-2: Create automated tests that, for authenticated admin users, send POST requests under the admin namespace with a valid CSRF token in a same-site cookie plus matching custom header and assert successful 2xx responses, verifying that valid tokens do not cause erroneous denials or regressions.
- **IMPACT**: US-007-ac-3: Create tests that trigger CSRF-denied admin POSTs and verify that a structured log entry is emitted containing the correlation_id and request path and no PII or sensitive attributes, potentially via log-capture or mock logging sinks.
- **IMPACT**: US-007-ac-4: Create coverage across multiple distinct admin POST endpoints under the admin namespace to confirm that CSRF checks are enforced uniformly (both for valid and invalid/missing tokens), with no endpoint-specific bypasses or divergent behavior.

## Gaps and Unresolved Items
- No codebase evidence was available (grounding provider is None); every impact listed is inferred from the requirement text, not measured.
- No code-level information is available to confirm the current implementation of admin routes or whether a CSRF mechanism already exists.
- No concrete list of endpoints under /api/admin/* is provided, so uniform enforcement coverage cannot be verified.
- No details on the existing error-handling framework or how the standard error schema is currently implemented are available.
- No samples of current logging configuration or correlation ID propagation are provided, so the exact changes needed for CSRF denials are unknown.
- No information on existing client applications’ handling of CSRF tokens (cookies and headers) is available, so compatibility and required updates cannot be assessed.
- Open question: What exact paths constitute the admin POST surface—does it include only literal /api/admin/* endpoints or also other admin-related paths and subdomains?
- Open question: Is there a canonical, versioned definition of the standard error schema, including exact field names, types, and allowed values for code and message?
- Open question: How is the CSRF token generated, bound (to user, session, device), rotated, and invalidated, and are there existing libraries or services that must be used?
- Open question: Should CSRF tokens differ between admin and non-admin contexts, or is a shared token acceptable from a security perspective?
- Open question: Are there any admin POST endpoints that must be exempted from CSRF enforcement for technical or backward-compatibility reasons (e.g., machine-to-machine APIs), and if so, how are they identified and justified?
- Open question: Should CSRF denial events trigger any security alerts or metrics thresholds, and if so, what constitutes normal vs anomalous volume?
- Open question: What is the exact format and propagation mechanism for correlation IDs, and are there existing logging standards that CSRF denial logs must comply with?
- Open question: Which fields are considered PII or sensitive in this domain, so that implementers know exactly what must be excluded from error responses and logs?
- Open question: Which existing components implement each acceptance criterion?

## Provenance
- Policy version: `ace-spec-format/v1`
- Accepted impact analysis revision: `1`
- Accepted impact analysis: `sha256:095b3e00638cd45a6ad538edb3fdd1bf82d9afe6fd6aea43e3dc2e657b`
- Repository baseline commit: `49198c8301190b914b6907286628aca0b68616a9`