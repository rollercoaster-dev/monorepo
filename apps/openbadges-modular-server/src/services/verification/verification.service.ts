/**
 * Unified Verification Service
 *
 * Orchestrates complete verification of Open Badges 3.0 credentials by combining:
 * - Cryptographic proof verification (JWT/Linked Data)
 * - Issuer verification (DID resolution, JWKS)
 * - Temporal validation (expiration checks)
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0
 * @see https://www.w3.org/TR/vc-data-model-2.0/
 */

import type { Shared } from "openbadges-types";
import { verifyJWTProof } from "./proof-verifier.js";
import { verifyIssuer } from "./issuer-verifier.js";
import type {
  VerificationCheck,
  VerificationChecks,
  VerificationOptions,
  VerificationResult,
  VerificationStatus,
} from "./types.js";

/**
 * Verify expiration date of a credential
 *
 * Checks if credential has expired based on expirationDate field.
 * Supports clock tolerance for temporal validation.
 *
 * @param credential - Credential object to check
 * @param options - Verification options
 * @returns Verification check result
 */
function verifyExpiration(
  credential: Record<string, unknown>,
  options?: VerificationOptions,
): VerificationCheck {
  const expirationDate = credential.expirationDate as string | undefined;

  // If no expiration date, credential does not expire
  if (!expirationDate) {
    return {
      check: "temporal.expiration",
      description: "Credential expiration validation",
      passed: true,
      details: {
        hasExpiration: false,
      },
    };
  }

  try {
    const expiration = new Date(expirationDate);

    // Check if date is valid
    if (isNaN(expiration.getTime())) {
      return {
        check: "temporal.expiration",
        description: "Credential expiration validation",
        passed: false,
        error: `Invalid expiration date format: ${expirationDate}`,
      };
    }

    const now = new Date();

    // Apply clock tolerance if specified (in seconds)
    const clockToleranceMs = (options?.clockTolerance ?? 0) * 1000;
    const adjustedNow = new Date(now.getTime() - clockToleranceMs);

    const isExpired = expiration < adjustedNow;

    // Check if expired credentials are allowed
    if (isExpired && options?.allowExpired) {
      return {
        check: "temporal.expiration",
        description: "Credential expiration validation",
        passed: true,
        details: {
          expirationDate: expirationDate,
          isExpired: true,
          allowExpired: true,
        },
      };
    }

    if (isExpired) {
      return {
        check: "temporal.expiration",
        description: "Credential expiration validation",
        passed: false,
        error: `Credential expired on ${expirationDate}`,
        details: {
          expirationDate: expirationDate,
          currentTime: now.toISOString(),
          clockTolerance: options?.clockTolerance,
        },
      };
    }

    return {
      check: "temporal.expiration",
      description: "Credential expiration validation",
      passed: true,
      details: {
        expirationDate: expirationDate,
        expiresIn: Math.floor((expiration.getTime() - now.getTime()) / 1000),
      },
    };
  } catch (_error) {
    return {
      check: "temporal.expiration",
      description: "Credential expiration validation",
      passed: false,
      error: `Invalid expiration date format: ${expirationDate}`,
    };
  }
}

/**
 * Verify issuance date of a credential
 *
 * Checks if credential's issuance date is valid (not in the future).
 *
 * @param credential - Credential object to check
 * @param options - Verification options
 * @returns Verification check result
 */
function verifyIssuanceDate(
  credential: Record<string, unknown>,
  options?: VerificationOptions,
): VerificationCheck {
  const issuanceDate = credential.issuanceDate as string | undefined;

  // issuanceDate is required in Open Badges 3.0
  if (!issuanceDate) {
    return {
      check: "temporal.issuance",
      description: "Credential issuance date validation",
      passed: false,
      error: "Credential missing required issuanceDate field",
    };
  }

  try {
    const issued = new Date(issuanceDate);

    // Check if date is valid
    if (isNaN(issued.getTime())) {
      return {
        check: "temporal.issuance",
        description: "Credential issuance date validation",
        passed: false,
        error: `Invalid issuance date format: ${issuanceDate}`,
      };
    }

    const now = new Date();

    // Apply clock tolerance if specified (in seconds)
    const clockToleranceMs = (options?.clockTolerance ?? 0) * 1000;
    const adjustedNow = new Date(now.getTime() + clockToleranceMs);

    const isFuture = issued > adjustedNow;

    if (isFuture) {
      return {
        check: "temporal.issuance",
        description: "Credential issuance date validation",
        passed: false,
        error: `Credential issuance date ${issuanceDate} is in the future`,
        details: {
          issuanceDate: issuanceDate,
          currentTime: now.toISOString(),
          clockTolerance: options?.clockTolerance,
        },
      };
    }

    return {
      check: "temporal.issuance",
      description: "Credential issuance date validation",
      passed: true,
      details: {
        issuanceDate: issuanceDate,
        age: Math.floor((now.getTime() - issued.getTime()) / 1000),
      },
    };
  } catch (_error) {
    return {
      check: "temporal.issuance",
      description: "Credential issuance date validation",
      passed: false,
      error: `Invalid issuance date format: ${issuanceDate}`,
    };
  }
}

/**
 * Extract issuer IRI from credential
 *
 * Handles both string and object issuer formats from OB 3.0 spec.
 *
 * @param credential - Credential to extract issuer from
 * @returns Issuer IRI or null if not found
 */
function extractIssuer(credential: Record<string, unknown>): Shared.IRI | null {
  const issuer = credential.issuer;

  if (!issuer) {
    return null;
  }

  // Issuer can be a string (IRI) or an object with id field
  if (typeof issuer === "string") {
    return issuer as Shared.IRI;
  }

  if (typeof issuer === "object" && issuer !== null && "id" in issuer) {
    const issuerId = (issuer as Record<string, unknown>).id;
    if (typeof issuerId === "string") {
      return issuerId as Shared.IRI;
    }
  }

  return null;
}

/**
 * Extract verification method from credential
 *
 * For JWT credentials, uses the issuer as the verification method.
 * For Linked Data credentials, extracts from proof.verificationMethod.
 *
 * @param credential - Credential to extract verification method from
 * @param isJWT - Whether this is a JWT credential
 * @returns Verification method IRI or null if not found
 */
function extractVerificationMethod(
  credential: Record<string, unknown>,
  isJWT: boolean,
): Shared.IRI | null {
  if (isJWT) {
    // For JWT, verification method is typically the issuer DID
    return extractIssuer(credential);
  }

  // For Linked Data, check proof.verificationMethod
  const proof = credential.proof as Record<string, unknown> | undefined;
  if (proof && typeof proof.verificationMethod === "string") {
    return proof.verificationMethod as Shared.IRI;
  }

  return null;
}

/**
 * Create an error verification result
 *
 * Helper function to create consistent error results.
 *
 * @param checks - Verification checks performed
 * @param verifiedAt - Timestamp of verification
 * @param errorMessage - Error message
 * @param credentialId - Optional credential ID
 * @param issuer - Optional issuer IRI
 * @returns Error verification result
 */
function createErrorResult(
  checks: VerificationChecks,
  verifiedAt: string,
  errorMessage: string,
  credentialId?: Shared.IRI,
  issuer?: Shared.IRI,
): VerificationResult {
  return {
    status: "error",
    isValid: false,
    checks,
    credentialId,
    issuer,
    verifiedAt,
    error: errorMessage,
  };
}

/**
 * Verify a credential (JWT or Linked Data format)
 *
 * Performs complete verification workflow:
 * 1. Proof verification (cryptographic signature)
 * 2. Issuer verification (DID resolution, JWKS)
 * 3. Temporal validation (issuance, expiration)
 *
 * @param credential - Credential to verify (JSON-LD object or JWT string)
 * @param options - Verification options
 * @returns Complete verification result
 */
export async function verify(
  credential: Record<string, unknown> | string,
  options?: VerificationOptions,
): Promise<VerificationResult> {
  const startTime = Date.now();
  const verifiedAt = new Date().toISOString();

  // Initialize verification checks structure
  const checks: VerificationChecks = {
    proof: [],
    status: [],
    temporal: [],
    issuer: [],
    schema: [],
  };

  try {
    // Determine if credential is JWT or JSON-LD
    const isJWT = typeof credential === "string";
    let credentialObj: Record<string, unknown>;

    if (isJWT) {
      // Parse JWT payload to extract credential
      const parts = credential.split(".");
      if (parts.length !== 3) {
        checks.proof.push({
          check: "proof.format",
          description: "JWT format validation",
          passed: false,
          error: "Invalid JWT format",
        });

        return createErrorResult(checks, verifiedAt, "Invalid JWT format");
      }

      try {
        const payload = JSON.parse(
          Buffer.from(parts[1], "base64url").toString("utf-8"),
        );
        credentialObj = payload.vc || payload;
      } catch (_error) {
        checks.proof.push({
          check: "proof.format",
          description: "JWT payload parsing",
          passed: false,
          error: "Failed to parse JWT payload",
        });

        return createErrorResult(checks, verifiedAt, "Failed to parse JWT");
      }
    } else {
      credentialObj = credential;
    }

    // Extract issuer and verification method
    const issuer = extractIssuer(credentialObj);
    const verificationMethod = extractVerificationMethod(credentialObj, isJWT);

    if (!issuer) {
      checks.issuer.push({
        check: "issuer.extraction",
        description: "Extract issuer from credential",
        passed: false,
        error: "No issuer found in credential",
      });

      return createErrorResult(
        checks,
        verifiedAt,
        "Missing issuer",
        credentialObj.id as Shared.IRI | undefined,
      );
    }

    if (!verificationMethod) {
      checks.proof.push({
        check: "proof.verification-method",
        description: "Extract verification method from credential",
        passed: false,
        error: "No verification method found in credential",
      });

      return createErrorResult(
        checks,
        verifiedAt,
        "Missing verification method",
        credentialObj.id as Shared.IRI | undefined,
        issuer,
      );
    }

    // Step 1: Proof Verification
    if (!options?.skipProofVerification) {
      if (isJWT) {
        const proofCheck = await verifyJWTProof(
          credential as string,
          verificationMethod,
          options,
        );
        checks.proof.push(proofCheck);
      } else {
        // Linked Data proof verification not yet implemented
        checks.proof.push({
          check: "proof.linked-data",
          description: "Linked Data proof verification",
          passed: false,
          error: "Linked Data proof verification not yet implemented",
        });
      }
    }

    // Step 2: Issuer Verification
    const issuerChecks = await verifyIssuer(issuer);
    checks.issuer.push(...issuerChecks);

    // Step 3: Temporal Validation
    if (!options?.skipTemporalValidation) {
      const issuanceCheck = verifyIssuanceDate(credentialObj, options);
      const expirationCheck = verifyExpiration(credentialObj, options);

      checks.temporal.push(issuanceCheck, expirationCheck);
    }

    // Determine overall status
    const allChecks = [
      ...checks.proof,
      ...checks.issuer,
      ...checks.temporal,
      ...checks.status,
      ...checks.schema,
    ];

    const hasFailures = allChecks.some((check) => !check.passed);
    const status: VerificationStatus = hasFailures ? "invalid" : "valid";

    return {
      status,
      isValid: status === "valid",
      checks,
      credentialId: credentialObj.id as Shared.IRI | undefined,
      issuer,
      verificationMethod,
      verifiedAt,
      metadata: {
        durationMs: Date.now() - startTime,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    checks.proof.push({
      check: "verification.error",
      description: "Verification process error",
      passed: false,
      error: errorMessage,
    });

    return createErrorResult(checks, verifiedAt, errorMessage);
  }
}
