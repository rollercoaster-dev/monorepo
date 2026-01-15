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
import type {
  VerifyCredentialRequestDto,
  VerifyBakedImageRequestDto,
} from "../dtos/verify.dto.js";
import { logger } from "../../utils/logging/logger.service.js";
import { unbake } from "../../services/baking/baking.service.js";

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
    const credentialType = typeof credential === "string" ? "JWT" : "JSON-LD";

    logger.debug("Starting credential verification", {
      credentialType,
      hasOptions: !!options,
    });

    // Convert DTO options to verification service options
    // Note: The DTO deliberately exposes only safe options via the API.
    // Internal options (keyId, verificationMethodResolver, acceptedProofTypes,
    // maxProofAge) are not exposed to prevent abuse and maintain security.
    const verificationOptions: VerificationOptions | undefined = options
      ? {
          // Skip flags - allow callers to disable specific verification steps
          skipProofVerification: options.skipProofVerification,
          skipStatusCheck: options.skipStatusCheck,
          skipTemporalValidation: options.skipTemporalValidation,
          skipIssuerVerification: options.skipIssuerVerification,
          // Tolerance and exception handling
          clockTolerance: options.clockTolerance,
          allowExpired: options.allowExpired,
          allowRevoked: options.allowRevoked,
        }
      : undefined;

    try {
      // Call the verification service with proper type handling
      // The credential has been validated by Zod - it's either a string (JWT)
      // or a JSON-LD credential object that satisfies the schema
      let result;
      if (typeof credential === "string") {
        // JWT credential - pass string directly
        result = await verify(credential, verificationOptions);
      } else {
        // JSON-LD credential - the Zod schema validates structure,
        // and passthrough() allows additional properties, making it
        // compatible with Record<string, unknown>
        result = await verify(
          credential as Record<string, unknown>,
          verificationOptions,
        );
      }

      logger.debug("Credential verification completed", {
        status: result.status,
        isValid: result.isValid,
        credentialId: result.credentialId,
        issuer: result.issuer,
        durationMs: result.metadata?.durationMs,
      });

      return result;
    } catch (error) {
      // Log the error with full context for debugging
      logger.error("Credential verification failed with exception", {
        credentialType,
        hasOptions: !!options,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Re-throw to let the router handle the HTTP response
      throw error;
    }
  }

  /**
   * Verify a baked image credential
   *
   * Extracts an Open Badges credential from a baked image (PNG or SVG)
   * and performs complete verification including:
   * - Image extraction (unbaking)
   * - Proof/signature verification
   * - Issuer verification
   * - Temporal validation
   * - Status check (revocation)
   *
   * @param request - The verification request containing base64 image data and options
   * @returns Complete verification result with extraction metadata
   */
  async verifyBakedImage(
    request: VerifyBakedImageRequestDto,
  ): Promise<VerificationResult> {
    const { image, options } = request;

    logger.debug("Starting baked image credential verification", {
      imageLength: image.length,
      hasOptions: !!options,
    });

    try {
      // Decode base64 image data
      // Handle both raw base64 and data URI formats
      const base64Data = image.includes(",") ? image.split(",")[1] : image;
      const imageBuffer = Buffer.from(base64Data, "base64");

      logger.debug("Decoded image data", {
        bufferSize: imageBuffer.length,
      });

      // Extract credential from baked image
      const unbakeResult = await unbake(imageBuffer);

      logger.debug("Unbake completed", {
        found: unbakeResult.found,
        sourceFormat: unbakeResult.sourceFormat,
        credentialType: unbakeResult.credential
          ? typeof unbakeResult.credential
          : undefined,
      });

      // If no credential found, return error result
      if (!unbakeResult.found || !unbakeResult.credential) {
        logger.warn("No credential found in baked image", {
          sourceFormat: unbakeResult.sourceFormat,
        });

        return {
          isValid: false,
          status: "invalid",
          checks: {
            proof: [],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [
              {
                check: "extraction",
                description: "Extract credential from baked image",
                passed: false,
                error: "No credential data found in image",
              },
            ],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 0,
            extractionAttempted: true,
            extractionSucceeded: false,
            sourceFormat: unbakeResult.sourceFormat,
          },
        };
      }

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

      // Verify the extracted credential
      const credential = unbakeResult.credential as Record<string, unknown>;
      const verificationResult = await verify(credential, verificationOptions);

      // Add extraction metadata to the result
      const enhancedResult: VerificationResult = {
        ...verificationResult,
        metadata: {
          ...verificationResult.metadata,
          extractionAttempted: true,
          extractionSucceeded: true,
          sourceFormat: unbakeResult.sourceFormat,
        },
      };

      logger.debug("Baked credential verification completed", {
        status: enhancedResult.status,
        isValid: enhancedResult.isValid,
        sourceFormat: unbakeResult.sourceFormat,
        durationMs: enhancedResult.metadata?.durationMs,
      });

      return enhancedResult;
    } catch (error) {
      // Log the error with full context
      logger.error("Baked credential verification failed with exception", {
        imageLength: image.length,
        hasOptions: !!options,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // If it's an extraction/format error, return structured error
      if (
        error instanceof Error &&
        error.message.includes("Unsupported image format")
      ) {
        return {
          isValid: false,
          status: "invalid",
          checks: {
            proof: [],
            status: [],
            temporal: [],
            issuer: [],
            schema: [],
            general: [
              {
                check: "extraction",
                description: "Extract credential from baked image",
                passed: false,
                error:
                  "Unsupported image format - unable to extract credential",
              },
            ],
          },
          verifiedAt: new Date().toISOString(),
          metadata: {
            durationMs: 0,
            extractionAttempted: true,
            extractionSucceeded: false,
          },
        };
      }

      // Re-throw for other errors
      throw error;
    }
  }
}
