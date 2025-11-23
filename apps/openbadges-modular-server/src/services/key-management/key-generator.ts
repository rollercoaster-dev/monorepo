/**
 * Key Generation Service
 *
 * Generates cryptographic key pairs for RSA and EdDSA algorithms
 * following RFC 7517 (JSON Web Key) specifications.
 */

import { generateKeyPair, randomUUID, createPublicKey, createPrivateKey } from 'crypto';
import { promisify } from 'util';
import type {
  KeyPair,
  KeyPairWithJWK,
  KeyGenerationOptions,
  KeyAlgorithm,
  KeyType,
  RSAPublicKey,
  RSAPrivateKey,
  OKPPublicKey,
  OKPPrivateKey,
  JWKPublic,
  JWKPrivate,
} from './types';

const generateKeyPairAsync = promisify(generateKeyPair);

// =============================================================================
// Constants
// =============================================================================

/**
 * Default RSA modulus length for key generation.
 * 2048 bits is the minimum secure size per NIST recommendations.
 * Consider 3072+ for keys used beyond 2030.
 */
const DEFAULT_RSA_MODULUS_LENGTH = 2048;

/**
 * Minimum RSA modulus length for security compliance
 */
const MIN_RSA_MODULUS_LENGTH = 2048;

/**
 * Supported RSA algorithms for digital signatures
 */
const SUPPORTED_RSA_ALGORITHMS = new Set(['RS256', 'RS384', 'RS512']);

// =============================================================================
// Internal Helper Functions (defined first to avoid use-before-define)
// =============================================================================

/**
 * Converts RSA PEM keys to JWK format
 */
function rsaKeyPairToJWK(
  publicKeyPem: string,
  privateKeyPem: string,
  algorithm: KeyAlgorithm,
  keyId: string
): { publicJwk: RSAPublicKey; privateJwk: RSAPrivateKey } {
  // Import keys as KeyObject instances
  const publicKeyObject = createPublicKey(publicKeyPem);
  const privateKeyObject = createPrivateKey(privateKeyPem);

  // Export as JWK
  const publicJwkRaw = publicKeyObject.export({ format: 'jwk' }) as {
    kty: string;
    n: string;
    e: string;
  };
  const privateJwkRaw = privateKeyObject.export({ format: 'jwk' }) as {
    kty: string;
    n: string;
    e: string;
    d: string;
    p?: string;
    q?: string;
    dp?: string;
    dq?: string;
    qi?: string;
  };

  const publicJwk: RSAPublicKey = {
    kty: 'RSA',
    n: publicJwkRaw.n,
    e: publicJwkRaw.e,
    kid: keyId,
    alg: algorithm,
    use: 'sig',
  };

  const privateJwk: RSAPrivateKey = {
    kty: 'RSA',
    n: privateJwkRaw.n,
    e: privateJwkRaw.e,
    d: privateJwkRaw.d,
    p: privateJwkRaw.p,
    q: privateJwkRaw.q,
    dp: privateJwkRaw.dp,
    dq: privateJwkRaw.dq,
    qi: privateJwkRaw.qi,
    kid: keyId,
    alg: algorithm,
    use: 'sig',
  };

  return { publicJwk, privateJwk };
}

/**
 * Converts EdDSA PEM keys to JWK format
 */
function eddsaKeyPairToJWK(
  publicKeyPem: string,
  privateKeyPem: string,
  keyId: string
): { publicJwk: OKPPublicKey; privateJwk: OKPPrivateKey } {
  // Import keys as KeyObject instances
  const publicKeyObject = createPublicKey(publicKeyPem);
  const privateKeyObject = createPrivateKey(privateKeyPem);

  // Export as JWK
  const publicJwkRaw = publicKeyObject.export({ format: 'jwk' }) as {
    kty: string;
    crv: string;
    x: string;
  };
  const privateJwkRaw = privateKeyObject.export({ format: 'jwk' }) as {
    kty: string;
    crv: string;
    x: string;
    d: string;
  };

  const publicJwk: OKPPublicKey = {
    kty: 'OKP',
    crv: 'Ed25519',
    x: publicJwkRaw.x,
    kid: keyId,
    alg: 'EdDSA',
    use: 'sig',
  };

  const privateJwk: OKPPrivateKey = {
    kty: 'OKP',
    crv: 'Ed25519',
    x: privateJwkRaw.x,
    d: privateJwkRaw.d,
    kid: keyId,
    alg: 'EdDSA',
    use: 'sig',
  };

  return { publicJwk, privateJwk };
}

// =============================================================================
// RSA Key Generation
// =============================================================================

/**
 * Generates an RSA key pair for digital signatures
 *
 * @param options - Key generation options
 * @returns Promise resolving to a KeyPairWithJWK
 * @throws Error if key generation fails
 */
export async function generateRSAKeyPair(
  options: Partial<KeyGenerationOptions> = {}
): Promise<KeyPairWithJWK> {
  const algorithm: KeyAlgorithm = options.algorithm ?? 'RS256';
  const modulusLength = options.modulusLength ?? DEFAULT_RSA_MODULUS_LENGTH;
  const keyId = options.keyId ?? randomUUID();

  if (!SUPPORTED_RSA_ALGORITHMS.has(algorithm)) {
    throw new Error(`Unsupported RSA algorithm: ${algorithm}. Supported: RS256, RS384, RS512`);
  }

  if (modulusLength < MIN_RSA_MODULUS_LENGTH) {
    throw new Error(
      `RSA modulus length must be at least ${MIN_RSA_MODULUS_LENGTH} bits. Got: ${modulusLength}`
    );
  }

  const { publicKey, privateKey } = await generateKeyPairAsync('rsa', {
    modulusLength,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const now = new Date().toISOString();
  const expiresAt = options.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  // Convert to JWK format
  const { publicJwk, privateJwk } = rsaKeyPairToJWK(publicKey, privateKey, algorithm, keyId);

  return {
    id: keyId,
    publicKey,
    privateKey,
    keyType: 'RSA',
    algorithm,
    status: 'active',
    createdAt: now,
    expiresAt,
    publicJwk,
    privateJwk,
  };
}

// =============================================================================
// EdDSA Key Generation
// =============================================================================

/**
 * Generates an EdDSA (Ed25519) key pair for digital signatures
 *
 * @param options - Key generation options
 * @returns Promise resolving to a KeyPairWithJWK
 * @throws Error if key generation fails
 */
export async function generateEdDSAKeyPair(
  options: Partial<KeyGenerationOptions> = {}
): Promise<KeyPairWithJWK> {
  const keyId = options.keyId ?? randomUUID();

  const { publicKey, privateKey } = await generateKeyPairAsync('ed25519', {
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const now = new Date().toISOString();
  const expiresAt = options.expiresInDays
    ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  // Convert to JWK format
  const { publicJwk, privateJwk } = eddsaKeyPairToJWK(publicKey, privateKey, keyId);

  return {
    id: keyId,
    publicKey,
    privateKey,
    keyType: 'OKP',
    algorithm: 'EdDSA',
    status: 'active',
    createdAt: now,
    expiresAt,
    publicJwk,
    privateJwk,
  };
}

// =============================================================================
// Generic Key Generation
// =============================================================================

/**
 * Generates a key pair based on the provided options
 *
 * @param options - Key generation options specifying key type and algorithm
 * @returns Promise resolving to a KeyPairWithJWK
 * @throws Error if the key type/algorithm combination is not supported
 */
export async function generateKeyPairFromOptions(
  options: KeyGenerationOptions
): Promise<KeyPairWithJWK> {
  const { keyType, algorithm } = options;

  if (keyType === 'RSA') {
    if (!['RS256', 'RS384', 'RS512'].includes(algorithm)) {
      throw new Error(`Invalid algorithm ${algorithm} for RSA key type`);
    }
    return generateRSAKeyPair(options);
  }

  if (keyType === 'OKP') {
    if (algorithm !== 'EdDSA') {
      throw new Error(`Invalid algorithm ${algorithm} for OKP key type. Use EdDSA.`);
    }
    return generateEdDSAKeyPair(options);
  }

  throw new Error(`Unsupported key type: ${keyType}. Supported: RSA, OKP`);
}

// =============================================================================
// Key Conversion Utilities
// =============================================================================

/**
 * Extracts the public JWK from a KeyPairWithJWK
 *
 * @param keyPair - The key pair containing JWK representations
 * @returns The public JWK
 */
export function extractPublicJWK(keyPair: KeyPairWithJWK): JWKPublic {
  return keyPair.publicJwk;
}

/**
 * Converts a KeyPairWithJWK to a KeyPair (without JWK)
 *
 * @param keyPairWithJwk - The key pair with JWK representations
 * @returns KeyPair without JWK fields
 */
export function keyPairWithJWKToKeyPair(keyPairWithJwk: KeyPairWithJWK): KeyPair {
  const { publicJwk: _publicJwk, privateJwk: _privateJwk, ...keyPair } = keyPairWithJwk;
  return keyPair;
}

/**
 * Converts PEM keys to JWK format based on key type
 *
 * @param publicKeyPem - Public key in PEM format
 * @param privateKeyPem - Private key in PEM format
 * @param keyType - Type of key (RSA or OKP)
 * @param algorithm - Algorithm used for the key
 * @param keyId - Key ID for the JWK
 * @returns Promise resolving to public and private JWKs
 */
export function keyPairToJWK(
  publicKeyPem: string,
  privateKeyPem: string,
  keyType: KeyType,
  algorithm: KeyAlgorithm,
  keyId: string
): { publicJwk: JWKPublic; privateJwk: JWKPrivate } {
  if (keyType === 'RSA') {
    return rsaKeyPairToJWK(publicKeyPem, privateKeyPem, algorithm, keyId);
  }

  if (keyType === 'OKP') {
    return eddsaKeyPairToJWK(publicKeyPem, privateKeyPem, keyId);
  }

  throw new Error(`Unsupported key type for JWK conversion: ${keyType}`);
}
