/**
 * Key Management Types
 *
 * Type definitions for cryptographic key management, including JWK (JSON Web Key)
 * and JWKS (JSON Web Key Set) formats per RFC 7517, key pair handling, and
 * key rotation configuration.
 *
 * These types support the Open Badges 3.0 credential signing workflow with
 * asymmetric key pairs (RSA, EC) and key lifecycle management.
 */

/**
 * Supported key algorithms for badge signing
 *
 * - RS256: RSA Signature with SHA-256 (RSASSA-PKCS1-v1_5)
 * - RS384: RSA Signature with SHA-384
 * - RS512: RSA Signature with SHA-512
 * - ES256: ECDSA with P-256 curve and SHA-256
 * - ES384: ECDSA with P-384 curve and SHA-384
 * - ES512: ECDSA with P-521 curve and SHA-512
 * - EdDSA: Edwards-curve Digital Signature Algorithm (Ed25519/Ed448)
 */
export type KeyAlgorithm =
  | 'RS256'
  | 'RS384'
  | 'RS512'
  | 'ES256'
  | 'ES384'
  | 'ES512'
  | 'EdDSA';

/**
 * Key type identifiers per RFC 7517 Section 6.1
 */
export type KeyType = 'RSA' | 'EC' | 'OKP';

/**
 * Key use identifiers per RFC 7517 Section 4.2
 */
export type KeyUse = 'sig' | 'enc';

/**
 * Key operations per RFC 7517 Section 4.3
 */
export type KeyOperation =
  | 'sign'
  | 'verify'
  | 'encrypt'
  | 'decrypt'
  | 'wrapKey'
  | 'unwrapKey'
  | 'deriveKey'
  | 'deriveBits';

/**
 * Elliptic curve identifiers for EC and OKP key types
 */
export type EllipticCurve =
  | 'P-256'
  | 'P-384'
  | 'P-521'
  | 'Ed25519'
  | 'Ed448'
  | 'X25519'
  | 'X448';

/**
 * Key status for lifecycle management
 */
export type KeyStatus = 'active' | 'inactive' | 'compromised' | 'expired';

/**
 * JSON Web Key (JWK) - RFC 7517
 *
 * Represents a cryptographic key in JSON format. This interface supports
 * RSA, EC, and OKP (Octet Key Pair) key types commonly used for
 * signing Open Badges credentials.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7517
 */
export interface JWK {
  /**
   * Key type identifier (required)
   * - "RSA": RSA key pair
   * - "EC": Elliptic Curve key pair
   * - "OKP": Octet Key Pair (for Ed25519, X25519, etc.)
   */
  kty: KeyType;

  /**
   * Public key use (optional)
   * - "sig": Signature verification
   * - "enc": Encryption
   */
  use?: KeyUse;

  /**
   * Key operations (optional)
   * Identifies the operations for which the key is intended
   */
  key_ops?: KeyOperation[];

  /**
   * Algorithm intended for use with the key (optional)
   * When present, must match the algorithm used in JWT headers
   */
  alg?: KeyAlgorithm;

  /**
   * Key ID (optional but recommended)
   * Used to match a specific key, especially during key rotation
   */
  kid?: string;

  /**
   * X.509 URL (optional)
   * URI referring to a resource for an X.509 public key certificate
   */
  x5u?: string;

  /**
   * X.509 certificate chain (optional)
   * Chain of one or more PKIX certificates as base64-encoded DER
   */
  x5c?: string[];

  /**
   * X.509 certificate SHA-1 thumbprint (optional)
   */
  x5t?: string;

  /**
   * X.509 certificate SHA-256 thumbprint (optional)
   */
  'x5t#S256'?: string;

  // RSA key parameters (present when kty === 'RSA')

  /**
   * RSA modulus (base64url encoded)
   */
  n?: string;

  /**
   * RSA public exponent (base64url encoded)
   */
  e?: string;

  /**
   * RSA private exponent (base64url encoded, private key only)
   */
  d?: string;

  /**
   * RSA first prime factor (base64url encoded, private key only)
   */
  p?: string;

  /**
   * RSA second prime factor (base64url encoded, private key only)
   */
  q?: string;

  /**
   * RSA first factor CRT exponent (base64url encoded, private key only)
   */
  dp?: string;

  /**
   * RSA second factor CRT exponent (base64url encoded, private key only)
   */
  dq?: string;

  /**
   * RSA first CRT coefficient (base64url encoded, private key only)
   */
  qi?: string;

  // EC key parameters (present when kty === 'EC')

  /**
   * Elliptic curve identifier
   */
  crv?: EllipticCurve;

  /**
   * EC x coordinate (base64url encoded)
   */
  x?: string;

  /**
   * EC y coordinate (base64url encoded, not used for OKP)
   */
  y?: string;
}

/**
 * JSON Web Key Set (JWKS) - RFC 7517 Section 5
 *
 * A set of JWKs, typically exposed at a .well-known endpoint
 * for credential verification.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7517#section-5
 */
export interface JWKS {
  /**
   * Array of JWK values
   */
  keys: JWK[];
}

/**
 * Cryptographic key pair for signing operations
 *
 * Contains both the private key (for signing) and public key (for verification).
 * The public key is also represented as a JWK for easy publication.
 */
export interface KeyPair {
  /**
   * Unique identifier for the key pair
   */
  id: string;

  /**
   * Algorithm used with this key pair
   */
  algorithm: KeyAlgorithm;

  /**
   * Private key in PEM format (PKCS#8)
   * Used for signing credentials - keep secure!
   */
  privateKey: string;

  /**
   * Public key in PEM format (SPKI)
   * Used for signature verification
   */
  publicKey: string;

  /**
   * Public key as JWK for JWKS endpoint
   */
  publicKeyJwk: JWK;

  /**
   * Current status of the key pair
   */
  status: KeyStatus;

  /**
   * Timestamp when the key pair was created (ISO 8601)
   */
  createdAt: string;

  /**
   * Timestamp when the key pair expires (ISO 8601, optional)
   */
  expiresAt?: string;

  /**
   * Timestamp when the key was last used for signing (ISO 8601)
   */
  lastUsedAt?: string;
}

/**
 * Configuration for automatic key rotation
 *
 * Key rotation is a security best practice that limits the exposure
 * if a key is compromised and ensures compliance with security policies.
 */
export interface KeyRotationConfig {
  /**
   * Whether automatic key rotation is enabled
   */
  enabled: boolean;

  /**
   * Interval between key rotations in days
   * Recommended: 90 days for high-security, 365 days for standard use
   */
  rotationIntervalDays: number;

  /**
   * Number of days to keep old keys active after rotation
   * Allows verification of credentials signed with previous keys
   */
  overlapPeriodDays: number;

  /**
   * Maximum number of keys to retain in history
   * Older keys are removed after this limit is reached
   */
  maxKeyHistory: number;

  /**
   * Default algorithm for newly generated keys
   */
  defaultAlgorithm: KeyAlgorithm;

  /**
   * Key size in bits (for RSA keys)
   * Recommended: 2048 minimum, 4096 for high security
   */
  rsaKeySize?: number;

  /**
   * Elliptic curve (for EC keys)
   */
  ecCurve?: EllipticCurve;

  /**
   * Whether to automatically generate a new key on startup if none exists
   */
  autoGenerateOnStartup: boolean;

  /**
   * Cron expression for rotation check schedule (optional)
   * Example: "0 0 * * *" for daily at midnight
   */
  rotationSchedule?: string;
}

/**
 * Key generation options for creating new key pairs
 */
export interface KeyGenerationOptions {
  /**
   * Algorithm for the key pair
   */
  algorithm: KeyAlgorithm;

  /**
   * Key size in bits (for RSA)
   */
  keySize?: number;

  /**
   * Elliptic curve (for EC/OKP)
   */
  curve?: EllipticCurve;

  /**
   * Custom key ID (auto-generated if not provided)
   */
  keyId?: string;

  /**
   * Expiration time in days from creation
   */
  expiresInDays?: number;
}

/**
 * Result of key rotation operation
 */
export interface KeyRotationResult {
  /**
   * The newly created active key pair
   */
  newKey: KeyPair;

  /**
   * The previously active key (now in overlap period)
   */
  previousKey?: KeyPair;

  /**
   * Keys that were removed during rotation
   */
  removedKeys: string[];

  /**
   * Timestamp of the rotation (ISO 8601)
   */
  rotatedAt: string;
}
