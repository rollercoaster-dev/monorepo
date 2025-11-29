/**
 * Key Management Type Definitions
 *
 * Type definitions for cryptographic key management following RFC 7517 (JSON Web Key)
 * and supporting Open Badges 3.0 credential signing requirements.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7517
 */

// =============================================================================
// Key Algorithm Types
// =============================================================================

/**
 * Supported key algorithms for digital signatures
 */
export type KeyAlgorithm = 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512' | 'EdDSA';

/**
 * Key type identifiers as defined in RFC 7517
 * - RSA: RSA key pair
 * - EC: Elliptic Curve key pair
 * - OKP: Octet Key Pair (for Ed25519, X25519)
 */
export type KeyType = 'RSA' | 'EC' | 'OKP';

/**
 * Elliptic curve identifiers for EC and OKP key types
 */
export type KeyCurve = 'P-256' | 'P-384' | 'P-521' | 'Ed25519' | 'Ed448' | 'X25519' | 'X448';

/**
 * Key usage types as defined in RFC 7517
 * - sig: Key is used for signatures
 * - enc: Key is used for encryption
 */
export type KeyUse = 'sig' | 'enc';

/**
 * Key operations as defined in RFC 7517
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

// =============================================================================
// Key Status and Lifecycle
// =============================================================================

/**
 * Key lifecycle status
 */
export type KeyStatus = 'active' | 'inactive' | 'revoked' | 'expired';

// =============================================================================
// JSON Web Key (JWK) - RFC 7517
// =============================================================================

/**
 * Base JWK parameters common to all key types (RFC 7517 Section 4)
 */
export interface JWKBase {
  /** Key Type (RFC 7517 Section 4.1) */
  kty: KeyType;
  /** Public Key Use (RFC 7517 Section 4.2) */
  use?: KeyUse;
  /** Key Operations (RFC 7517 Section 4.3) */
  key_ops?: KeyOperation[];
  /** Algorithm (RFC 7517 Section 4.4) */
  alg?: KeyAlgorithm;
  /** Key ID (RFC 7517 Section 4.5) */
  kid?: string;
  /** X.509 URL (RFC 7517 Section 4.6) */
  x5u?: string;
  /** X.509 Certificate Chain (RFC 7517 Section 4.7) */
  x5c?: string[];
  /** X.509 Certificate SHA-1 Thumbprint (RFC 7517 Section 4.8) */
  x5t?: string;
  /** X.509 Certificate SHA-256 Thumbprint (RFC 7517 Section 4.9) */
  'x5t#S256'?: string;
}

/**
 * RSA Public Key parameters (RFC 7518 Section 6.3.1)
 */
export interface RSAPublicKey extends JWKBase {
  kty: 'RSA';
  /** Modulus (Base64urlUInt-encoded) */
  n: string;
  /** Exponent (Base64urlUInt-encoded) */
  e: string;
}

/**
 * RSA Private Key parameters (RFC 7518 Section 6.3.2)
 */
export interface RSAPrivateKey extends RSAPublicKey {
  /** Private Exponent (Base64urlUInt-encoded) */
  d: string;
  /** First Prime Factor (Base64urlUInt-encoded) */
  p?: string;
  /** Second Prime Factor (Base64urlUInt-encoded) */
  q?: string;
  /** First Factor CRT Exponent (Base64urlUInt-encoded) */
  dp?: string;
  /** Second Factor CRT Exponent (Base64urlUInt-encoded) */
  dq?: string;
  /** First CRT Coefficient (Base64urlUInt-encoded) */
  qi?: string;
}

/**
 * Elliptic Curve Public Key parameters (RFC 7518 Section 6.2.1)
 */
export interface ECPublicKey extends JWKBase {
  kty: 'EC';
  /** Curve identifier */
  crv: 'P-256' | 'P-384' | 'P-521';
  /** X Coordinate (Base64urlUInt-encoded) */
  x: string;
  /** Y Coordinate (Base64urlUInt-encoded) */
  y: string;
}

/**
 * Elliptic Curve Private Key parameters (RFC 7518 Section 6.2.2)
 */
export interface ECPrivateKey extends ECPublicKey {
  /** ECC Private Key (Base64urlUInt-encoded) */
  d: string;
}

/**
 * Octet Key Pair Public Key parameters (RFC 8037)
 * Used for Ed25519, Ed448, X25519, X448 curves
 */
export interface OKPPublicKey extends JWKBase {
  kty: 'OKP';
  /** Curve identifier */
  crv: 'Ed25519' | 'Ed448' | 'X25519' | 'X448';
  /** Public Key (Base64url-encoded) */
  x: string;
}

/**
 * Octet Key Pair Private Key parameters (RFC 8037)
 */
export interface OKPPrivateKey extends OKPPublicKey {
  /** Private Key (Base64url-encoded) */
  d: string;
}

/**
 * Union type for all public JWK types
 */
export type JWKPublic = RSAPublicKey | ECPublicKey | OKPPublicKey;

/**
 * Union type for all private JWK types
 */
export type JWKPrivate = RSAPrivateKey | ECPrivateKey | OKPPrivateKey;

/**
 * Union type for any JWK (public or private)
 */
export type JWK = JWKPublic | JWKPrivate;

// =============================================================================
// JSON Web Key Set (JWKS) - RFC 7517 Section 5
// =============================================================================

/**
 * JSON Web Key Set containing multiple keys
 */
export interface JWKS {
  /** Array of JWK objects */
  keys: JWKPublic[];
}

// =============================================================================
// Key Pair Types
// =============================================================================

/**
 * A cryptographic key pair with both public and private components
 */
export interface KeyPair {
  /** Unique identifier for the key pair */
  id: string;
  /** Public key in PEM format */
  publicKey: string;
  /** Private key in PEM format */
  privateKey: string;
  /** Key type identifier */
  keyType: KeyType;
  /** Algorithm used for signing */
  algorithm: KeyAlgorithm;
  /** Current status of the key */
  status: KeyStatus;
  /** Creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last rotation timestamp (ISO 8601) */
  rotatedAt?: string;
  /** Expiration timestamp (ISO 8601) */
  expiresAt?: string;
}

/**
 * Key pair with JWK representation
 */
export interface KeyPairWithJWK extends KeyPair {
  /** Public key in JWK format */
  publicJwk: JWKPublic;
  /** Private key in JWK format */
  privateJwk: JWKPrivate;
}

// =============================================================================
// Key Rotation Configuration
// =============================================================================

/**
 * Configuration for automatic key rotation
 */
export interface KeyRotationConfig {
  /** Enable automatic key rotation */
  enabled: boolean;
  /** Rotation interval in days */
  rotationIntervalDays: number;
  /** Number of days before expiration to start using new key */
  overlapPeriodDays: number;
  /** Maximum number of old keys to retain */
  retainedKeyCount: number;
  /** Preferred algorithm for new keys */
  preferredAlgorithm: KeyAlgorithm;
  /** Preferred key type for new keys */
  preferredKeyType: KeyType;
}

/**
 * Default key rotation configuration
 */
export const DEFAULT_KEY_ROTATION_CONFIG: KeyRotationConfig = {
  enabled: false,
  rotationIntervalDays: 90,
  overlapPeriodDays: 7,
  retainedKeyCount: 3,
  preferredAlgorithm: 'RS256',
  preferredKeyType: 'RSA',
};

// =============================================================================
// Key Generation Options
// =============================================================================

/**
 * Options for key pair generation
 */
export interface KeyGenerationOptions {
  /** Key type to generate */
  keyType: KeyType;
  /** Algorithm for the key */
  algorithm: KeyAlgorithm;
  /** RSA modulus length (for RSA keys, default: 2048) */
  modulusLength?: number;
  /** Curve name (for EC and OKP keys) */
  curve?: KeyCurve;
  /** Optional key ID (will be generated if not provided) */
  keyId?: string;
  /** Optional expiration time in days */
  expiresInDays?: number;
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a JWK is an RSA key
 */
export function isRSAKey(jwk: JWK): jwk is RSAPublicKey | RSAPrivateKey {
  return jwk.kty === 'RSA';
}

/**
 * Type guard to check if a JWK is an EC key
 */
export function isECKey(jwk: JWK): jwk is ECPublicKey | ECPrivateKey {
  return jwk.kty === 'EC';
}

/**
 * Type guard to check if a JWK is an OKP key
 */
export function isOKPKey(jwk: JWK): jwk is OKPPublicKey | OKPPrivateKey {
  return jwk.kty === 'OKP';
}

/**
 * Type guard to check if a JWK is a private key
 */
export function isPrivateKey(jwk: JWK): jwk is JWKPrivate {
  return 'd' in jwk;
}

// =============================================================================
// File Storage Types
// =============================================================================

/**
 * JSON format for key file storage (minimal, without JWK)
 *
 * This is the format used when persisting keys to disk via OB_SIGNING_KEY.
 * JWKs are regenerated on load to keep the file format simple.
 */
export interface KeyFileFormat {
  id: string;
  publicKey: string;
  privateKey: string;
  keyType: KeyType;
  algorithm: KeyAlgorithm;
  createdAt: string;
}

/** Valid key types for file storage */
const VALID_KEY_TYPES = ['RSA', 'EC', 'OKP'] as const;

/** Valid algorithms for file storage */
const VALID_ALGORITHMS = [
  'RS256',
  'RS384',
  'RS512',
  'ES256',
  'ES384',
  'ES512',
  'EdDSA',
] as const;

/**
 * Validates an ISO 8601 date string
 */
function isValidISO8601(date: string): boolean {
  const parsed = Date.parse(date);
  return !isNaN(parsed);
}

/**
 * Type guard to validate KeyFileFormat structure
 *
 * Validates:
 * - Required string fields (id, publicKey, privateKey, createdAt)
 * - keyType is one of: RSA, EC, OKP
 * - algorithm is one of: RS256, RS384, RS512, ES256, ES384, ES512, EdDSA
 * - createdAt is a valid ISO 8601 date string
 */
export function isValidKeyFileFormat(data: unknown): data is KeyFileFormat {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.publicKey === 'string' &&
    typeof obj.privateKey === 'string' &&
    typeof obj.keyType === 'string' &&
    VALID_KEY_TYPES.includes(obj.keyType as (typeof VALID_KEY_TYPES)[number]) &&
    typeof obj.algorithm === 'string' &&
    VALID_ALGORITHMS.includes(
      obj.algorithm as (typeof VALID_ALGORITHMS)[number]
    ) &&
    typeof obj.createdAt === 'string' &&
    isValidISO8601(obj.createdAt)
  );
}
