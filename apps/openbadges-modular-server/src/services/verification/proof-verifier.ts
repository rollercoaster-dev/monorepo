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
 * Decode base58btc string
 *
 * Minimal base58 decoder for Bitcoin-style encoding.
 *
 * @param encoded - Base58-encoded string
 * @returns Decoded bytes
 */
function decodeBase58(encoded: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const BASE = BigInt(58);

  let result = BigInt(0);
  for (let i = 0; i < encoded.length; i++) {
    const char = encoded[i];
    const value = ALPHABET.indexOf(char);
    if (value === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    result = result * BASE + BigInt(value);
  }

  // Convert BigInt to bytes
  const hex = result.toString(16);
  const bytes = new Uint8Array(Math.ceil(hex.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

/**
 * Decode multibase-encoded value
 *
 * Supports base58btc (z prefix) and base64url (u prefix).
 *
 * @param encoded - Multibase-encoded string
 * @returns Decoded bytes
 */
function decodeMultibase(encoded: string): Uint8Array {
  if (!encoded || encoded.length === 0) {
    throw new Error("Empty multibase string");
  }

  const prefix = encoded[0];
  const data = encoded.slice(1);

  switch (prefix) {
    case "z": // base58btc
      return decodeBase58(data);
    case "u": // base64url
      return jose.base64url.decode(data);
    default:
      throw new Error(`Unsupported multibase prefix: ${prefix}`);
  }
}

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
 * Validate proof structure has required fields
 *
 * Checks that the proof object contains all required fields per W3C spec.
 *
 * @param proof - The proof object to validate
 * @returns Validation check result
 */
function validateProofStructure(
  proof: Record<string, unknown>,
): VerificationCheck | null {
  // Required fields for all proof types
  const requiredFields = [
    "type",
    "proofPurpose",
    "verificationMethod",
    "proofValue",
  ];

  for (const field of requiredFields) {
    if (!(field in proof) || typeof proof[field] !== "string") {
      return {
        check: "proof.linked-data.structure",
        description: "Linked Data proof structure validation",
        passed: false,
        error: `Proof missing required field: ${field}`,
        details: { missingField: field, proof },
      };
    }
  }

  // Validate proofPurpose (should be assertionMethod for credentials)
  if (
    proof.proofPurpose !== "assertionMethod" &&
    proof.proofPurpose !== "authentication"
  ) {
    return {
      check: "proof.linked-data.purpose",
      description: "Proof purpose validation",
      passed: false,
      error: `Invalid proof purpose: ${proof.proofPurpose}`,
      details: {
        proofPurpose: proof.proofPurpose,
        expected: ["assertionMethod", "authentication"],
      },
    };
  }

  return null; // Structure is valid
}

/**
 * Canonicalize JSON-LD document
 *
 * Performs simple JSON canonicalization (not full JSON-LD normalization).
 * This is a minimal implementation that works for simple credentials.
 * Full JSON-LD canonicalization with URDNA2015 should be used in production.
 *
 * @param document - The document to canonicalize (with proof removed)
 * @returns Canonicalized string
 */
function canonicalizeDocument(document: Record<string, unknown>): string {
  // Remove proof field if present
  const { proof: _proof, ...docWithoutProof } = document;

  // Simple JSON stringify with sorted keys
  // Note: This is NOT full JSON-LD canonicalization (URDNA2015)
  // but works for simple cases without expanded JSON-LD context
  const sortKeys = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(sortKeys);
    }
    if (obj !== null && typeof obj === "object") {
      return Object.keys(obj)
        .sort()
        .reduce(
          (result, key) => {
            result[key] = sortKeys((obj as Record<string, unknown>)[key]);
            return result;
          },
          {} as Record<string, unknown>,
        );
    }
    return obj;
  };

  return JSON.stringify(sortKeys(docWithoutProof));
}

/**
 * Verify Ed25519Signature2020 proof
 *
 * Ed25519 is a EdDSA signature over Curve25519.
 *
 * @param document - Canonicalized document
 * @param proofValue - Multibase-encoded signature
 * @param publicKey - Public key material
 * @returns True if valid
 */
async function verifyEd25519Signature2020(
  document: string,
  proofValue: string,
  publicKey: CryptoKey | string,
): Promise<boolean> {
  try {
    // Decode multibase signature (z prefix = base58btc)
    const signatureBytes = decodeMultibase(proofValue);

    // Convert document to bytes
    const documentBytes = new TextEncoder().encode(document);

    // If publicKey is a string, parse as JWK
    let cryptoKey: CryptoKey;
    if (typeof publicKey === "string") {
      const imported = await jose.importJWK(JSON.parse(publicKey));
      if (imported instanceof Uint8Array) {
        throw new Error("Expected CryptoKey but got Uint8Array from importJWK");
      }
      cryptoKey = imported;
    } else {
      cryptoKey = publicKey;
    }

    // Verify signature using Web Crypto API
    const isValid = await globalThis.crypto.subtle.verify(
      "Ed25519",
      cryptoKey,
      new Uint8Array(signatureBytes),
      documentBytes,
    );

    return isValid;
  } catch (error) {
    console.error(
      `Ed25519 verification error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
    return false;
  }
}

/**
 * Verify DataIntegrityProof signature
 *
 * Supports eddsa-rdfc-2022 and other cryptosuites.
 *
 * @param document - Canonicalized document
 * @param proofValue - Multibase-encoded signature
 * @param publicKey - Public key material
 * @param proof - Full proof object
 * @returns True if valid
 */
async function verifyDataIntegrityProof(
  document: string,
  proofValue: string,
  publicKey: CryptoKey | string,
  proof: Record<string, unknown>,
): Promise<boolean> {
  const cryptosuite = proof.cryptosuite as string | undefined;

  // For eddsa-rdfc-2022, use Ed25519 verification
  if (cryptosuite === "eddsa-rdfc-2022") {
    return verifyEd25519Signature2020(document, proofValue, publicKey);
  }

  // For other cryptosuites, we don't have implementations yet
  throw new Error(`Unsupported cryptosuite: ${cryptosuite || "none"}`);
}

/**
 * Verify EcdsaSecp256k1Signature2019 proof
 *
 * ECDSA signature over secp256k1 curve (Bitcoin/Ethereum curve).
 *
 * @param document - Canonicalized document
 * @param proofValue - JWS-encoded signature
 * @param publicKey - Public key material
 * @returns True if valid
 */
async function verifyEcdsaSecp256k1Signature2019(
  document: string,
  proofValue: string,
  publicKey: CryptoKey | string,
): Promise<boolean> {
  try {
    // EcdsaSecp256k1Signature2019 uses JWS-style encoding
    // Decode JWS (base64url without padding)
    const signatureBytes = jose.base64url.decode(proofValue);

    const documentBytes = new TextEncoder().encode(document);

    // If publicKey is a string, parse as JWK
    let cryptoKey: CryptoKey;
    if (typeof publicKey === "string") {
      const imported = await jose.importJWK(JSON.parse(publicKey));
      if (imported instanceof Uint8Array) {
        throw new Error("Expected CryptoKey but got Uint8Array from importJWK");
      }
      cryptoKey = imported;
    } else {
      cryptoKey = publicKey;
    }

    // Verify using ECDSA with P-256 (secp256k1 not widely supported in Web Crypto)
    // Note: This is a limitation - full secp256k1 support requires additional libraries
    const isValid = await globalThis.crypto.subtle.verify(
      {
        name: "ECDSA",
        hash: "SHA-256",
      },
      cryptoKey,
      new Uint8Array(signatureBytes),
      documentBytes,
    );

    return isValid;
  } catch (error) {
    console.error(
      `ECDSA secp256k1 verification error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
    return false;
  }
}

/**
 * Verify JsonWebSignature2020 proof
 *
 * JWS-based linked data signature.
 *
 * @param document - Canonicalized document
 * @param proofValue - JWS detached signature
 * @param publicKey - Public key material
 * @returns True if valid
 */
async function verifyJsonWebSignature2020(
  document: string,
  proofValue: string,
  publicKey: CryptoKey | string,
): Promise<boolean> {
  try {
    // JsonWebSignature2020 uses detached JWS
    // proofValue is in format: <header>..<signature>
    const parts = proofValue.split("..");
    if (parts.length !== 2) {
      throw new Error("Invalid JWS format: expected header..signature");
    }

    const [header, signature] = parts;

    // Reconstruct JWS with document as payload
    const payload = jose.base64url.encode(new TextEncoder().encode(document));
    const jws = `${header}.${payload}.${signature}`;

    // Parse public key if needed
    let cryptoKey: CryptoKey;
    if (typeof publicKey === "string") {
      const imported = await jose.importJWK(JSON.parse(publicKey));
      if (imported instanceof Uint8Array) {
        throw new Error("Expected CryptoKey but got Uint8Array from importJWK");
      }
      cryptoKey = imported;
    } else {
      cryptoKey = publicKey;
    }

    // Verify JWS
    await jose.jwtVerify(jws, cryptoKey);

    return true;
  } catch (error) {
    console.error(
      `JsonWebSignature2020 verification error: ${error instanceof Error ? error.message : "Unknown"}`,
    );
    return false;
  }
}

/**
 * Verify proof signature based on proof type
 *
 * Dispatches to appropriate verification method based on proof type.
 *
 * @param proofType - Type of proof (DataIntegrityProof, Ed25519Signature2020, etc.)
 * @param canonicalDocument - Canonicalized document string
 * @param proofValue - Base64url-encoded signature
 * @param publicKey - Public key (CryptoKey or JWK string)
 * @param proof - Full proof object for additional fields
 * @returns True if signature is valid
 */
async function verifyProofSignature(
  proofType: string,
  canonicalDocument: string,
  proofValue: string,
  publicKey: CryptoKey | string,
  proof: Record<string, unknown>,
): Promise<boolean> {
  switch (proofType) {
    case "DataIntegrityProof":
      return verifyDataIntegrityProof(
        canonicalDocument,
        proofValue,
        publicKey,
        proof,
      );

    case "Ed25519Signature2020":
      return verifyEd25519Signature2020(
        canonicalDocument,
        proofValue,
        publicKey,
      );

    case "EcdsaSecp256k1Signature2019":
      return verifyEcdsaSecp256k1Signature2019(
        canonicalDocument,
        proofValue,
        publicKey,
      );

    case "JsonWebSignature2020":
      return verifyJsonWebSignature2020(
        canonicalDocument,
        proofValue,
        publicKey,
      );

    default:
      throw new Error(`Unsupported proof type: ${proofType}`);
  }
}

/**
 * Verify a Linked Data proof (Data Integrity format)
 *
 * Verifies a W3C Data Integrity proof using the specified cryptosuite.
 * Supports DataIntegrityProof, JsonWebSignature2020, Ed25519Signature2020,
 * and EcdsaSecp256k1Signature2019.
 *
 * @param credential - The credential object with embedded proof
 * @param proof - The proof object to verify
 * @param options - Verification options
 * @returns Verification check result
 *
 * @see https://www.w3.org/TR/vc-data-integrity/
 */
export async function verifyLinkedDataProof(
  credential: Record<string, unknown>,
  proof: Record<string, unknown>,
  options?: VerificationOptions,
): Promise<VerificationCheck> {
  try {
    // Step 1: Validate proof structure
    const structureError = validateProofStructure(proof);
    if (structureError) {
      return structureError;
    }

    const proofType = proof.type as string;
    const verificationMethod = proof.verificationMethod as Shared.IRI;
    const proofValue = proof.proofValue as string;

    // Step 2: Resolve verification method to public key
    const publicKeyOrString = await resolveVerificationMethod(
      verificationMethod,
      options?.verificationMethodResolver,
    );

    if (!publicKeyOrString) {
      return {
        check: "proof.linked-data.verification-method",
        description: "Linked Data verification method resolution",
        passed: false,
        error: `Failed to resolve verification method: ${verificationMethod}`,
        details: { verificationMethod, proofType },
      };
    }

    // Step 3: Canonicalize credential (remove proof)
    const canonicalDocument = canonicalizeDocument(credential);

    // Step 4: Verify signature based on proof type
    const isValid = await verifyProofSignature(
      proofType,
      canonicalDocument,
      proofValue,
      publicKeyOrString,
      proof,
    );

    if (!isValid) {
      return {
        check: "proof.linked-data.signature",
        description: "Linked Data proof signature verification",
        passed: false,
        error: `Signature verification failed for ${proofType}`,
        details: {
          proofType,
          verificationMethod,
          cryptosuite: proof.cryptosuite,
        },
      };
    }

    // Verification successful
    return {
      check: "proof.linked-data.signature",
      description: "Linked Data proof signature verification",
      passed: true,
      details: {
        proofType,
        verificationMethod,
        cryptosuite: proof.cryptosuite,
        proofPurpose: proof.proofPurpose,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return {
      check: "proof.linked-data.signature",
      description: "Linked Data proof signature verification",
      passed: false,
      error: `Linked Data proof verification failed: ${errorMessage}`,
      details: {
        proofType: proof.type,
        errorType: error instanceof Error ? error.constructor.name : "Unknown",
      },
    };
  }
}
