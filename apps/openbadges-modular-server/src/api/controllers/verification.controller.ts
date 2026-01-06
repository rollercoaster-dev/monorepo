/**
 * Verification Controller
 *
 * Handles credential verification requests via the API.
 * Supports both JSON-LD and JWT credential formats.
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0
 * @see https://www.w3.org/TR/vc-data-model-2.0/
 */

import { verify } from "../../services/verification/verification.service.js";
import type {
  VerificationOptions,
  VerificationResult,
} from "../../services/verification/types.js";
import type { VerifyCredentialRequestDto } from "../dtos/verify.dto.js";
import { logger } from "../../utils/logging/logger.service.js";

/**
 * Controller for credential verification operations
 */
export class VerificationController {
  /**
   * Verify a credential
   *
   * Accepts a credential in JSON-LD or JWT format and performs
   * complete verification including:
   * - Proof/signature verification
   * - Issuer verification
   * - Temporal validation (issuance, expiration)
   * - Status check (revocation)
   *
   * @param request - The verification request containing the credential and options
   * @returns Complete verification result with detailed checks
   */
  async verifyCredential(
    request: VerifyCredentialRequestDto,
  ): Promise<VerificationResult> {
    const { credential, options } = request;

    logger.debug("Starting credential verification", {
      credentialType: typeof credential === "string" ? "JWT" : "JSON-LD",
      hasOptions: !!options,
    });

    // Convert DTO options to verification service options
    const verificationOptions: VerificationOptions | undefined = options
      ? {
          skipProofVerification: options.skipProofVerification,
          skipStatusCheck: options.skipStatusCheck,
          skipTemporalValidation: options.skipTemporalValidation,
          skipIssuerVerification: options.skipIssuerVerification,
          clockTolerance: options.clockTolerance,
          allowExpired: options.allowExpired,
          allowRevoked: options.allowRevoked,
        }
      : undefined;

    // Call the verification service
    // The credential can be a string (JWT) or an object (JSON-LD)
    const result = await verify(
      credential as Record<string, unknown> | string,
      verificationOptions,
    );

    logger.debug("Credential verification completed", {
      status: result.status,
      isValid: result.isValid,
      credentialId: result.credentialId,
      issuer: result.issuer,
      durationMs: result.metadata?.durationMs,
    });

    return result;
  }
}
