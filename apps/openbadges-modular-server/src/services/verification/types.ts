/**
 * Verification Service Type Definitions
 *
 * This file defines TypeScript types for the verification service
 * supporting Open Badges 3.0 verification (JWT and Linked Data proofs).
 *
 * @see https://www.imsglobal.org/spec/ob/v3p0
 * @see https://www.w3.org/TR/vc-data-model-2.0/
 */

import type { Shared } from "openbadges-types";

/**
 * Overall verification status enumeration
 * Represents the final result of the verification process
 */
export type VerificationStatus =
  | "valid"
  | "invalid"
  | "indeterminate"
  | "error";

/**
 * Proof type identifier for OB 3.0 verification
 * Supports W3C Data Integrity proofs and legacy linked-data signatures
 *
 * Note: JWT-based credentials use the VC-JWT envelope format (typ: "vc+jwt")
 * rather than an embedded proof type, so are handled separately from this enum.
 *
 * @see https://www.w3.org/TR/vc-data-integrity/
 * @see https://www.w3.org/TR/vc-jose-cose/ (for JWT/JOSE envelope format)
 */
export type ProofType =
  | "DataIntegrityProof"
  | "JsonWebSignature2020"
  | "Ed25519Signature2020"
  | "EcdsaSecp256k1Signature2019";

/**
 * Individual verification check result
 * Represents the outcome of a single verification step
 */
export interface VerificationCheck {
  /** Unique identifier for the check type */
  check: string;

  /** Human-readable description of the check */
  description: string;

  /** Whether this check passed */
  passed: boolean;

  /** Error message if the check failed */
  error?: string;

  /** Additional details about the check result */
  details?: Record<string, unknown>;
}

/**
 * Collection of verification checks performed during verification
 * Groups checks by category for structured reporting
 */
export interface VerificationChecks {
  /** Proof/signature verification checks */
  proof: VerificationCheck[];

  /** Credential status checks (revocation, suspension) */
  status: VerificationCheck[];

  /** Temporal validity checks (issuance, expiration) */
  temporal: VerificationCheck[];

  /** Issuer validation checks */
  issuer: VerificationCheck[];

  /** Schema and structure validation checks */
  schema: VerificationCheck[];

  /** General verification errors (unexpected failures) */
  general: VerificationCheck[];
}

/**
 * Options for configuring the verification process
 */
export interface VerificationOptions {
  /** Skip proof verification (useful for testing) */
  skipProofVerification?: boolean;

  /** Skip status check (revocation list lookup) */
  skipStatusCheck?: boolean;

  /** Skip temporal validation (expiration/not-before) */
  skipTemporalValidation?: boolean;

  /** Skip issuer verification (DID resolution, profile validation) */
  skipIssuerVerification?: boolean;

  /** Clock tolerance in seconds for temporal checks */
  clockTolerance?: number;

  /** Specific key ID to use for verification */
  keyId?: string;

  /** Custom verification method resolver */
  verificationMethodResolver?: VerificationMethodResolver;

  /** Accept expired credentials (for historical verification) */
  allowExpired?: boolean;

  /** Accept revoked credentials (for audit purposes) */
  allowRevoked?: boolean;

  /** Proof formats to accept (defaults to all supported) */
  acceptedProofTypes?: ProofType[];

  /** Maximum age of proof creation timestamp in seconds */
  maxProofAge?: number;
}

/**
 * Function type for resolving verification methods to public keys
 */
export type VerificationMethodResolver = (
  verificationMethod: Shared.IRI,
) => Promise<CryptoKey | string | null>;

/**
 * Cryptographic key material for verification
 */
export interface VerificationKeyMaterial {
  /** Key identifier */
  id: Shared.IRI;

  /** Key type (e.g., 'RSA', 'Ed25519', 'EC') */
  type: string;

  /** Controller of the key */
  controller?: Shared.IRI;

  /** Public key in various formats */
  publicKey: CryptoKey | string;

  /** Algorithm associated with the key */
  algorithm?: string;
}

/**
 * Complete verification result
 * Contains the overall status and detailed check results
 */
export interface VerificationResult {
  /** Overall verification status */
  status: VerificationStatus;

  /**
   * Whether the credential is valid
   * Invariant: isValid === (status === 'valid')
   */
  isValid: boolean;

  /** Detailed verification checks by category */
  checks: VerificationChecks;

  /** Credential ID that was verified */
  credentialId?: Shared.IRI;

  /** Issuer of the credential */
  issuer?: Shared.IRI;

  /** Proof type used in the credential */
  proofType?: ProofType;

  /** Verification method used */
  verificationMethod?: Shared.IRI;

  /** Timestamp when verification was performed */
  verifiedAt: string;

  /** Error message if verification failed */
  error?: string;

  /** Additional metadata about the verification */
  metadata?: VerificationMetadata;
}

/**
 * Additional metadata about the verification process
 */
export interface VerificationMetadata {
  /** Duration of verification in milliseconds */
  durationMs?: number;

  /** Version of the verifier */
  verifierVersion?: string;

  /** Cryptosuite used for verification */
  cryptosuite?: string;

  /** Algorithm used for signature verification */
  algorithm?: string;

  /** Whether the credential was found in a cache */
  cached?: boolean;

  /** Additional context-specific metadata */
  [key: string]: unknown;
}

/**
 * Input for batch verification operations
 */
export interface BatchVerificationInput {
  /** Credential to verify (JSON-LD object or compact JWT string) */
  credential: Record<string, unknown> | string;

  /** Optional verification options for this credential */
  options?: VerificationOptions;
}

/**
 * Result of batch verification operations
 */
export interface BatchVerificationResult {
  /** Total number of credentials verified */
  total: number;

  /** Number of valid credentials (status === 'valid') */
  valid: number;

  /** Number of invalid credentials (status === 'invalid') */
  invalid: number;

  /** Number of indeterminate results (status === 'indeterminate') */
  indeterminate: number;

  /** Number of errors during verification (status === 'error') */
  errors: number;

  /** Individual verification results */
  results: VerificationResult[];

  /** Timestamp when batch verification completed */
  completedAt: string;
}
