/**
 * Proof Verification Service
 *
 * Implements cryptographic proof verification for Open Badges 3.0 credentials
 * supporting both JWT (VC-JWT) and Linked Data (Data Integrity) proof formats.
 *
 * @see https://www.w3.org/TR/vc-data-model-2.0/#proofs-signatures
 * @see https://www.w3.org/TR/vc-jose-cose/
 * @see https://www.w3.org/TR/vc-data-integrity/
 */

import * as jose from "jose";
import type {
  VerificationCheck,
  VerificationOptions,
  VerificationMethodResolver,
} from "./types.js";
import type { Shared } from "openbadges-types";

// =============================================================================
// Helper Functions (defined first to avoid no-use-before-define)
// =============================================================================

/**
 * Resolve a did:key identifier to a public key
 *
 * Implements did:key resolution according to RFC 9278.
 * Extracts the multibase-encoded public key from the DID.
 *
 * @param didKey - The did:key identifier
 * @returns Public key as CryptoKey or null
 */
async function resolveDidKey(_didKey: string): Promise<CryptoKey | null> {
  // TODO: Implement full did:key resolution
  // For now, return null to indicate resolution not yet implemented
  // This will be implemented in a future issue covering DID resolution
  console.warn(`did:key resolution not yet implemented: ${_didKey}`);
  return null;
}

/**
 * Resolve a did:web identifier to a public key
 *
 * Implements did:web resolution by fetching the DID document from
 * the web domain specified in the DID.
 *
 * @param didWeb - The did:web identifier
 * @returns Public key as CryptoKey or null
 */
async function resolveDidWeb(_didWeb: string): Promise<CryptoKey | null> {
  // TODO: Implement full did:web resolution
  // For now, return null to indicate resolution not yet implemented
  // This will be implemented in a future issue covering DID resolution
  console.warn(`did:web resolution not yet implemented: ${_didWeb}`);
  return null;
}

/**
 * Resolve a JWKS endpoint to a public key
 *
 * Fetches the JWKS from the specified URL and extracts the appropriate key.
 *
 * @param jwksUrl - URL of the JWKS endpoint
 * @returns Public key as CryptoKey or null
 */
async function resolveJWKS(_jwksUrl: string): Promise<CryptoKey | null> {
  try {
    // Create remote JWKS - returns a function for jose.jwtVerify
    // However, we can't use it directly here without a key ID
    // This needs to be refactored when we implement full JWKS support
    console.warn(`JWKS resolution requires key ID: ${_jwksUrl}`);
    return null;
  } catch (error) {
    console.error(
      `Failed to create remote JWKS: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return null;
  }
}

/**
 * Resolve a verification method IRI to a public key
 *
 * Supports multiple resolution strategies:
 * - Custom resolver function (if provided in options)
 * - DID resolution (did:key, did:web)
 * - JWKS endpoint resolution
 *
 * @param verificationMethod - IRI of the verification method
 * @param customResolver - Optional custom resolver function
 * @returns Public key material (CryptoKey or JWK string) or null if resolution fails
 */
export async function resolveVerificationMethod(
  verificationMethod: Shared.IRI,
  customResolver?: VerificationMethodResolver,
): Promise<CryptoKey | string | null> {
  // Use custom resolver if provided
  if (customResolver) {
    try {
      return await customResolver(verificationMethod);
    } catch (error) {
      console.error(
        `Custom verification method resolver failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  // Parse the verification method IRI
  const vmString = String(verificationMethod);

  // Handle did:key resolution (RFC 9278)
  if (vmString.startsWith("did:key:")) {
    try {
      return await resolveDidKey(vmString);
    } catch (error) {
      console.error(
        `DID key resolution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  // Handle did:web resolution
  if (vmString.startsWith("did:web:")) {
    try {
      return await resolveDidWeb(vmString);
    } catch (error) {
      console.error(
        `DID web resolution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  // Handle JWKS endpoint resolution
  if (vmString.startsWith("http://") || vmString.startsWith("https://")) {
    try {
      return await resolveJWKS(vmString);
    } catch (error) {
      console.error(
        `JWKS resolution failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return null;
    }
  }

  // Unsupported verification method format
  console.error(`Unsupported verification method format: ${vmString}`);
  return null;
}

// =============================================================================
// Exported Functions
// =============================================================================

/**
 * Verify a JWT-based proof (VC-JWT format)
 *
 * Verifies the cryptographic signature of a JWT credential using the
 * verification method specified in the credential.
 *
 * @param jwtString - The JWT credential as a compact serialized string
 * @param verificationMethod - IRI of the verification method to use
 * @param options - Verification options
 * @returns Verification check result
 *
 * @see https://www.w3.org/TR/vc-jose-cose/#securing-with-jose
 */
export async function verifyJWTProof(
  jwtString: string,
  verificationMethod: Shared.IRI,
  options?: VerificationOptions,
): Promise<VerificationCheck> {
  try {
    // Decode JWT header to inspect algorithm and key ID
    const protectedHeader = jose.decodeProtectedHeader(jwtString);

    // Validate required header fields
    if (!protectedHeader.alg) {
      return {
        check: "proof.jwt.algorithm",
        description: "JWT proof algorithm validation",
        passed: false,
        error: "JWT missing 'alg' header parameter",
      };
    }

    // Validate typ header for VC-JWT
    if (protectedHeader.typ && protectedHeader.typ !== "JWT") {
      // W3C VC-JWT spec allows "JWT" or omission
      if (
        protectedHeader.typ !== "vc+jwt" &&
        protectedHeader.typ !== "vc+ld+jwt"
      ) {
        return {
          check: "proof.jwt.type",
          description: "JWT type header validation",
          passed: false,
          error: `Unexpected JWT typ header: ${protectedHeader.typ}`,
          details: { typ: protectedHeader.typ },
        };
      }
    }

    // Resolve verification method to public key
    const publicKeyOrString = await resolveVerificationMethod(
      verificationMethod,
      options?.verificationMethodResolver,
    );

    if (!publicKeyOrString) {
      return {
        check: "proof.jwt.verification-method",
        description: "JWT verification method resolution",
        passed: false,
        error: `Failed to resolve verification method: ${verificationMethod}`,
        details: { verificationMethod },
      };
    }

    // Convert string keys to JWK if needed
    const publicKey =
      typeof publicKeyOrString === "string"
        ? (JSON.parse(publicKeyOrString) as jose.JWK)
        : publicKeyOrString;

    // Verify JWT signature
    const { payload } = await jose.jwtVerify(jwtString, publicKey, {
      algorithms: [protectedHeader.alg],
    });

    // Check proof creation time if maxProofAge is specified
    if (options?.maxProofAge !== undefined) {
      const now = Math.floor(Date.now() / 1000);
      const iat = payload.iat;

      if (typeof iat === "number") {
        const proofAge = now - iat;
        if (proofAge > options.maxProofAge) {
          return {
            check: "proof.jwt.age",
            description: "JWT proof age validation",
            passed: false,
            error: `Proof age ${proofAge}s exceeds maximum ${options.maxProofAge}s`,
            details: {
              proofAge,
              maxProofAge: options.maxProofAge,
              issuedAt: iat,
            },
          };
        }
      }
    }

    return {
      check: "proof.jwt.signature",
      description: "JWT proof signature verification",
      passed: true,
      details: {
        algorithm: protectedHeader.alg,
        keyId: protectedHeader.kid,
        verificationMethod,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      check: "proof.jwt.signature",
      description: "JWT proof signature verification",
      passed: false,
      error: `JWT verification failed: ${errorMessage}`,
      details: {
        verificationMethod,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
      },
    };
  }
}

/**
 * Verify a Linked Data proof (Data Integrity format)
 *
 * Verifies a W3C Data Integrity proof using the specified cryptosuite.
 * Supports EdDSA and other standard cryptosuites.
 *
 * @param credential - The credential object with embedded proof
 * @param proof - The proof object to verify
 * @param options - Verification options
 * @returns Verification check result
 *
 * @see https://www.w3.org/TR/vc-data-integrity/
 */
export async function verifyLinkedDataProof(
  _credential: Record<string, unknown>,
  proof: Record<string, unknown>,
  _options?: VerificationOptions,
): Promise<VerificationCheck> {
  // TODO: Implement Linked Data proof verification
  // This requires:
  // 1. JSON-LD normalization (canonicalization)
  // 2. Cryptosuite-specific signature verification
  // 3. Proof purpose validation
  //
  // This will be implemented after DID resolution is complete,
  // as it depends on resolving verification methods from DID documents.

  return {
    check: "proof.linked-data.signature",
    description: "Linked Data proof signature verification",
    passed: false,
    error: "Linked Data proof verification not yet implemented",
    details: {
      proofType: proof.type,
      cryptosuite: proof.cryptosuite,
    },
  };
}
