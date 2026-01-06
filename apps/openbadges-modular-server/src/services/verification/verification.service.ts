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
import { logger } from "../../utils/logging/logger.service.js";
import { verifyJWTProof } from "./proof-verifier.js";
import { verifyIssuer } from "./issuer-verifier.js";
import type {
  ProofType,
  ProofVerificationResult,
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

  const expiration = new Date(expirationDate);

  // Check if date is valid (new Date() returns Invalid Date, not throws)
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

  const issued = new Date(issuanceDate);

  // Check if date is valid (new Date() returns Invalid Date, not throws)
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
 * For JWT credentials, extracts from JWT header's `kid` field if present,
 * otherwise falls back to the issuer DID.
 * For Linked Data credentials, extracts from proof.verificationMethod.
 *
 * @param credential - Credential to extract verification method from
 * @param isJWT - Whether this is a JWT credential
 * @param jwtHeader - Optional parsed JWT header (for kid extraction)
 * @returns Verification method IRI or null if not found
 */
function extractVerificationMethod(
  credential: Record<string, unknown>,
  isJWT: boolean,
  jwtHeader?: Record<string, unknown>,
): Shared.IRI | null {
  if (isJWT) {
    // For JWT, prefer kid from header, fall back to issuer DID
    if (jwtHeader && typeof jwtHeader.kid === "string") {
      return jwtHeader.kid as Shared.IRI;
    }
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
 * Proof object extracted from a credential
 */
interface ExtractedProof {
  /** Index in the original proof array (0 for single proof) */
  index: number;
  /** The proof object itself */
  proof: Record<string, unknown>;
  /** Proof type */
  type: ProofType | undefined;
  /** Verification method from the proof */
  verificationMethod: Shared.IRI | undefined;
}

/**
 * Extract all proofs from a credential
 *
 * Handles both single proof and proof array formats as per W3C VC Data Model 2.0.
 *
 * @param credential - Credential to extract proofs from
 * @returns Array of extracted proofs (empty for JWT credentials)
 */
function extractProofs(credential: Record<string, unknown>): ExtractedProof[] {
  const proofField = credential.proof;

  // No proof field - return empty array
  if (!proofField) {
    return [];
  }

  // Single proof (object)
  if (!Array.isArray(proofField) && typeof proofField === "object") {
    const proof = proofField as Record<string, unknown>;
    return [
      {
        index: 0,
        proof,
        type:
          typeof proof.type === "string"
            ? (proof.type as ProofType)
            : undefined,
        verificationMethod:
          typeof proof.verificationMethod === "string"
            ? (proof.verificationMethod as Shared.IRI)
            : undefined,
      },
    ];
  }

  // Multiple proofs (array)
  if (Array.isArray(proofField)) {
    return proofField.map((proof, index) => {
      const proofObj = proof as Record<string, unknown>;
      return {
        index,
        proof: proofObj,
        type:
          typeof proofObj.type === "string"
            ? (proofObj.type as ProofType)
            : undefined,
        verificationMethod:
          typeof proofObj.verificationMethod === "string"
            ? (proofObj.verificationMethod as Shared.IRI)
            : undefined,
      };
    });
  }

  return [];
}

/**
 * Extract proof type from credential
 *
 * For JWT credentials, returns undefined (JWT uses envelope format).
 * For Linked Data credentials, extracts from proof.type.
 * For credentials with multiple proofs, returns the type of the first proof.
 *
 * @param credential - Credential to extract proof type from
 * @param isJWT - Whether this is a JWT credential
 * @returns Proof type or undefined
 */
function extractProofType(
  credential: Record<string, unknown>,
  isJWT: boolean,
): ProofType | undefined {
  if (isJWT) {
    // JWT uses VC-JWT envelope format, not embedded proof type
    return undefined;
  }

  const proofs = extractProofs(credential);
  return proofs.length > 0 ? proofs[0].type : undefined;
}

/**
 * Validate credential has required type fields
 *
 * Per OB 3.0 spec, credentials should have VerifiableCredential and
 * OpenBadgeCredential in their type array.
 *
 * @param credential - Credential to validate
 * @returns Validation result
 */
function validateCredentialType(
  credential: Record<string, unknown>,
): VerificationCheck {
  const type = credential.type;

  if (!type) {
    return {
      check: "schema.type",
      description: "Credential type validation",
      passed: false,
      error: "Credential missing required 'type' field",
    };
  }

  const types = Array.isArray(type) ? type : [type];
  const hasVerifiableCredential = types.includes("VerifiableCredential");
  const hasOpenBadgeCredential = types.includes("OpenBadgeCredential");

  if (!hasVerifiableCredential) {
    return {
      check: "schema.type",
      description: "Credential type validation",
      passed: false,
      error: "Credential must include 'VerifiableCredential' type",
      details: { types },
    };
  }

  // OpenBadgeCredential is recommended but not strictly required
  return {
    check: "schema.type",
    description: "Credential type validation",
    passed: true,
    details: {
      types,
      hasVerifiableCredential,
      hasOpenBadgeCredential,
    },
  };
}

/**
 * Create an error verification result
 *
 * Helper function to create consistent error results.
 *
 * @param checks - Verification checks performed
 * @param verifiedAt - Timestamp of verification
 * @param errorMessage - Error message
 * @param startTime - Start time for duration calculation
 * @param credentialId - Optional credential ID
 * @param issuer - Optional issuer IRI
 * @returns Error verification result
 */
function createErrorResult(
  checks: VerificationChecks,
  verifiedAt: string,
  errorMessage: string,
  startTime: number,
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
    metadata: {
      durationMs: Date.now() - startTime,
    },
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
    general: [],
  };

  try {
    // Determine if credential is JWT or JSON-LD
    const isJWT = typeof credential === "string";
    let credentialObj: Record<string, unknown>;
    let jwtHeader: Record<string, unknown> | undefined;

    if (isJWT) {
      // Parse JWT header and payload
      const parts = credential.split(".");
      if (parts.length !== 3) {
        checks.proof.push({
          check: "proof.format",
          description: "JWT format validation",
          passed: false,
          error: "Invalid JWT format",
        });

        logger.warn("Verification failed: Invalid JWT format", {
          check: "proof.format",
        });

        return createErrorResult(
          checks,
          verifiedAt,
          "Invalid JWT format",
          startTime,
        );
      }

      try {
        // Parse JWT header for kid extraction
        jwtHeader = JSON.parse(
          Buffer.from(parts[0], "base64url").toString("utf-8"),
        );
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

        logger.warn("Verification failed: Failed to parse JWT", {
          check: "proof.format",
        });

        return createErrorResult(
          checks,
          verifiedAt,
          "Failed to parse JWT",
          startTime,
        );
      }
    } else {
      credentialObj = credential;
    }

    // Step 0: Schema Validation (credential type check)
    const typeCheck = validateCredentialType(credentialObj);
    checks.schema.push(typeCheck);

    if (!typeCheck.passed) {
      logger.warn("Verification failed: Invalid credential type", {
        check: typeCheck.check,
        error: typeCheck.error,
        credentialId: credentialObj.id,
      });

      return createErrorResult(
        checks,
        verifiedAt,
        typeCheck.error || "Invalid credential type",
        startTime,
        credentialObj.id as Shared.IRI | undefined,
      );
    }

    // Extract issuer, verification method, and proof type
    const issuer = extractIssuer(credentialObj);
    const verificationMethod = extractVerificationMethod(
      credentialObj,
      isJWT,
      jwtHeader,
    );
    const proofType = extractProofType(credentialObj, isJWT);

    if (!issuer) {
      checks.issuer.push({
        check: "issuer.extraction",
        description: "Extract issuer from credential",
        passed: false,
        error: "No issuer found in credential",
      });

      logger.warn("Verification failed: Missing issuer", {
        check: "issuer.extraction",
        credentialId: credentialObj.id,
      });

      return createErrorResult(
        checks,
        verifiedAt,
        "Missing issuer",
        startTime,
        credentialObj.id as Shared.IRI | undefined,
      );
    }

    // For JWT credentials, verification method is required upfront (from kid or issuer)
    // For linked data credentials, verification method comes from each proof object
    if (isJWT && !verificationMethod) {
      checks.proof.push({
        check: "proof.verification-method",
        description: "Extract verification method from JWT credential",
        passed: false,
        error: "No verification method found in JWT credential",
      });

      logger.warn("Verification failed: Missing verification method", {
        check: "proof.verification-method",
        credentialId: credentialObj.id,
        issuer,
      });

      return createErrorResult(
        checks,
        verifiedAt,
        "Missing verification method",
        startTime,
        credentialObj.id as Shared.IRI | undefined,
        issuer,
      );
    }

    // Step 1: Proof Verification (must happen first)
    // Tracks per-proof results for multi-proof credentials
    const proofResults: ProofVerificationResult[] = [];
    let totalProofs = 0;
    let passedProofs = 0;

    if (!options?.skipProofVerification) {
      if (isJWT) {
        // JWT credentials have a single proof in the envelope
        const proofCheck = await verifyJWTProof(
          credential as string,
          verificationMethod,
          options,
        );
        checks.proof.push(proofCheck);
        totalProofs = 1;
        passedProofs = proofCheck.passed ? 1 : 0;

        proofResults.push({
          index: 0,
          proofType: "jwt",
          passed: proofCheck.passed,
          verificationMethod,
          error: proofCheck.error,
          check: proofCheck,
        });
      } else {
        // Linked Data credentials may have multiple proofs
        const proofs = extractProofs(credentialObj);
        totalProofs = proofs.length;

        if (proofs.length === 0) {
          checks.proof.push({
            check: "proof.linked-data.missing",
            description: "Linked Data proof presence",
            passed: false,
            error: "Credential has no proof field",
          });
        } else {
          // Verify each proof
          for (const extractedProof of proofs) {
            // TODO: #309 Implement Linked Data proof verification
            // For now, mark as not implemented but track the proof
            const proofCheck: VerificationCheck = {
              check: `proof.linked-data.${extractedProof.index}`,
              description: `Linked Data proof verification (proof ${extractedProof.index + 1}/${proofs.length})`,
              passed: false,
              error: "Linked Data proof verification not yet implemented",
              details: {
                proofIndex: extractedProof.index,
                proofType: extractedProof.type,
                verificationMethod: extractedProof.verificationMethod,
              },
            };

            checks.proof.push(proofCheck);

            proofResults.push({
              index: extractedProof.index,
              proofType: extractedProof.type ?? "jwt",
              passed: proofCheck.passed,
              verificationMethod: extractedProof.verificationMethod,
              error: proofCheck.error,
              check: proofCheck,
            });

            if (proofCheck.passed) {
              passedProofs++;
            }
          }

          // Apply proof policy
          const proofPolicy = options?.proofPolicy ?? "all";
          const proofPassed =
            proofPolicy === "all"
              ? passedProofs === totalProofs
              : passedProofs > 0;

          // Add a summary check for multi-proof credentials
          if (proofs.length > 1) {
            checks.proof.push({
              check: "proof.policy",
              description: `Multi-proof policy check (${proofPolicy})`,
              passed: proofPassed,
              details: {
                policy: proofPolicy,
                totalProofs,
                passedProofs,
                requiredToPass: proofPolicy === "all" ? totalProofs : 1,
              },
              error: proofPassed
                ? undefined
                : `Proof policy '${proofPolicy}' not satisfied: ${passedProofs}/${totalProofs} proofs passed`,
            });
          }
        }
      }
    }

    // Steps 2 & 3: Issuer Verification and Temporal Validation (parallel)
    // These are independent checks that don't depend on each other
    // Note: Promise.all automatically wraps non-promise values
    const [issuerChecks, issuanceCheck, expirationCheck] = await Promise.all([
      // Step 2: Issuer Verification
      options?.skipIssuerVerification ? [] : verifyIssuer(issuer),
      // Step 3a: Temporal Validation - Issuance Date
      options?.skipTemporalValidation
        ? null
        : verifyIssuanceDate(credentialObj, options),
      // Step 3b: Temporal Validation - Expiration
      options?.skipTemporalValidation
        ? null
        : verifyExpiration(credentialObj, options),
    ]);

    // Add results to checks
    checks.issuer.push(...issuerChecks);
    if (issuanceCheck) checks.temporal.push(issuanceCheck);
    if (expirationCheck) checks.temporal.push(expirationCheck);

    // Determine overall status
    const allChecks = [
      ...checks.proof,
      ...checks.issuer,
      ...checks.temporal,
      ...checks.status,
      ...checks.schema,
      ...checks.general,
    ];

    const hasFailures = allChecks.some((check) => !check.passed);
    const status: VerificationStatus = hasFailures ? "invalid" : "valid";
    const durationMs = Date.now() - startTime;

    // Log verification result (without sensitive credential data)
    if (hasFailures) {
      const failedChecks = allChecks
        .filter((c) => !c.passed)
        .map((c) => c.check);
      logger.warn("Verification completed with failures", {
        credentialId: credentialObj.id,
        issuer,
        status,
        failedChecks,
        durationMs,
      });
    } else {
      logger.debug("Verification completed successfully", {
        credentialId: credentialObj.id,
        issuer,
        status,
        durationMs,
      });
    }

    return {
      status,
      isValid: status === "valid",
      checks,
      credentialId: credentialObj.id as Shared.IRI | undefined,
      issuer,
      proofType,
      verificationMethod,
      proofResults: proofResults.length > 0 ? proofResults : undefined,
      totalProofs: totalProofs > 0 ? totalProofs : undefined,
      passedProofs: totalProofs > 0 ? passedProofs : undefined,
      verifiedAt,
      metadata: {
        durationMs,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    checks.general.push({
      check: "verification.error",
      description: "Verification process error",
      passed: false,
      error: errorMessage,
    });

    logger.error("Verification failed with unexpected error", {
      error: errorMessage,
      durationMs: Date.now() - startTime,
    });

    return createErrorResult(checks, verifiedAt, errorMessage, startTime);
  }
}
