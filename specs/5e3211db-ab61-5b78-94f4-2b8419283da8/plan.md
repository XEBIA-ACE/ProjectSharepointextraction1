# Implementation Plan: 5e3211db-ab61-5b78-94f4-2b8419283da8

## Technical Context
- Codebase grounding snapshot (ae246fe2f5b81296)
- unresolved reference (component:Accordion_fragment_1)
- unresolved reference (component:Promise)
- unresolved reference (component:createOtpRouter)
- unresolved reference (component:verifyOtp)
- unresolved reference (component:
§{main_sources}§/New_Prompt_UMS-develop/BACKEND/src/services/otp.service.ts)
- Accepted impact analysis (sha256:9b9415238864f97332713ae224612d66902199f4de009b105ac03aab64f8eb11)
- Implement only against Accepted impact analysis (revision 1) (fingerprint sha256:9b9415238864f97332713ae224612d66902199f4de009b105ac03aab64f8eb11)
- Resolve or explicitly accept the following implementation-readiness items:
  - Candidate verification could not confidently judge the selected focus object for this requirement
  - Candidate verification was uncertain about the selected focus object: The requirement targets an OTP service method named verifyOtp with specific security behaviors, and the selected object is a Typescript Method named verifyOtp, which is plausible but not guaranteed to be the correct implementation point among several similarly named candidates. Other verifyOtp methods and functions in the list could represent different layers (e.g., controller vs service), so without more context we cannot be sure this specific one is the intended match.
  - Do any API endpoints or message handlers outside the measured transactions indirectly rely on verifyOtp semantics for security controls?
  - How are OTP_MAX_ATTEMPTS and account state flags wired into the data model backing VerifyOtpRequest and VerifyOtpSuccessResponse?
  - Intra-method logic (branching, comparisons, timing-safe operations) is not available from CAST, so behavioral acceptance criteria cannot be structurally verified.
  - No additional callers or database objects beyond those listed by CAST participate in verifyOtp(1001)'s blast radius.
  - No-match classification (all acceptance criteria unmapped): Initial classification (net-new capability) has a noted caveat: The capability described is detailed but still fairly standard for OTP flows, and the searches only used very literal and specific terms, leaving room for alternate naming like a more generic verification function or differently named constants. This creates some doubt that there is truly no related implementation in the codebase, though there is no concrete evidence that it exists.
  - Requirement traceability incomplete for S5-AC1, S5-AC2, S5-AC3, S5-AC4, S5-AC5, S5-AC6, S5-AC7, S5-AC8, S5-AC9, S5-AC10
  - Transaction graphs were not expanded, limiting visibility into end-to-end request flows and external API exposure.

## Contract Changes
- verifyOtp(1001) interacts with three database-level objects: VerifyOtpRequest, VerifyOtpSuccessResponse, and verifyOtp, indicating that OTP verification changes are persisted and may affect request and response records. — change required

## Security and Quality
- Changes to verifyOtp(1001) must preserve or improve brute-force protection, enforce account state validation to prevent enumeration, and use constant-time comparison for passcodes. Any modification should be carefully tested for error-path correctness (422, 404, 409, 410) because multiple caller methods and transactions depend on this behavior.
- Preserve the availability, reliability, and observability constraints grounded by ae246fe2f5b81296

## Verification Plan
- **S5-AC1**: Given an OTP request exists for a user with a valid, non-expired passcode and the user account is active, when verifyOtp() is called with the correct passcode, then the method returns success with verified_at timestamp set to current time, verified column set to true, and outcome/error_code fields in the response.
- **S5-AC2**: Given an OTP request exists and the user account is locked, when verifyOtp() is called with a valid passcode, then the method returns 422 ACCOUNT_STATE_INVALID error without incrementing attempt_count.
- **S5-AC3**: Given an OTP request exists and the user account is marked for deletion, when verifyOtp() is called with a valid passcode, then the method returns 422 ACCOUNT_STATE_INVALID error without incrementing attempt_count.
- **S5-AC4**: Given an OTP request exists with attempt_count at OTP_MAX_ATTEMPTS - 1 (default 4), when verifyOtp() is called with an incorrect passcode, then the method increments attempt_count to OTP_MAX_ATTEMPTS and returns 409 OTP_LOCKED on the next verification attempt.
- **S5-AC5**: Given an OTP request exists with attempt_count at OTP_MAX_ATTEMPTS (default 5), when verifyOtp() is called with any passcode, then the method returns 409 OTP_LOCKED without further incrementing attempt_count.
- **S5-AC6**: Given an OTP request exists with attempt_count below OTP_MAX_ATTEMPTS, when verifyOtp() is called with an incorrect passcode, then the method increments attempt_count by 1 and returns 422 INVALID_PASSCODE.
- **S5-AC7**: Given an OTP request exists with attempt_count below OTP_MAX_ATTEMPTS, when verifyOtp() is called with a correct passcode, then the method uses crypto.timingSafeEqual to compare the provided passcode against the stored OTP code.
- **S5-AC8**: Given an OTP request does not exist for the provided user_id, when verifyOtp() is called, then the method returns 404 with appropriate error response.
- **S5-AC9**: Given an OTP request exists but has expired, when verifyOtp() is called with a correct passcode, then the method returns 410 EXPIRED_OTP.
- **S5-AC10**: Given an OTP request exists but has expired, when verifyOtp() is called with an incorrect passcode, then the method returns 410 EXPIRED_OTP without incrementing attempt_count.
- **IMPACT**: Regression tests are required for all six transactions involving verifyOtp, covering success, locked, deleted, invalid, missing, and expired OTP scenarios, as well as boundary conditions around attempt_count and OTP_MAX_ATTEMPTS.