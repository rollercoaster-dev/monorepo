/**
 * Key Storage Service
 *
 * Handles loading cryptographic key pairs from environment variables.
 */

import { randomUUID } from 'crypto';
import type { KeyPairWithJWK, KeyType, KeyAlgorithm } from './types';
import { keyPairToJWK, generateRSAKeyPair } from './key-generator';

// =============================================================================
// Environment Variable Loading
// =============================================================================

/**
 * Decodes a potentially base64-encoded PEM key
 */
function decodePemKey(value: string): string {
  const trimmed = value.trim();

  // If it starts with PEM header, it's raw PEM
  if (trimmed.startsWith('-----BEGIN')) {
    return trimmed;
  }

  // Try base64 decode
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
    if (decoded.includes('-----BEGIN') && decoded.includes('-----END')) {
      return decoded;
    }
  } catch {
    // Not valid base64
  }

  throw new Error('Invalid key format: must be PEM or base64-encoded PEM');
}

/**
 * Detects key type from PEM content
 */
function detectKeyType(privateKeyPem: string): KeyType {
  // Ed25519 keys in PKCS#8 are ~48 bytes, RSA 2048 are ~1200+ bytes
  const base64Content = privateKeyPem
    .replace(/-----BEGIN[^-]+-----/, '')
    .replace(/-----END[^-]+-----/, '')
    .replace(/\s/g, '');

  const keySize = Buffer.from(base64Content, 'base64').length;
  return keySize < 100 ? 'OKP' : 'RSA';
}

/**
 * Loads a key pair from environment variables
 *
 * Environment variables:
 * - KEY_PRIVATE: Private key in PEM or base64-encoded PEM
 * - KEY_PUBLIC: Public key in PEM or base64-encoded PEM
 *
 * @returns KeyPairWithJWK if both keys are present, null otherwise
 */
export function loadKeyPairFromEnv(): KeyPairWithJWK | null {
  const privateKeyRaw = process.env['KEY_PRIVATE'];
  const publicKeyRaw = process.env['KEY_PUBLIC'];

  if (!privateKeyRaw && !publicKeyRaw) {
    return null;
  }

  if (!privateKeyRaw || !publicKeyRaw) {
    throw new Error('Both KEY_PRIVATE and KEY_PUBLIC must be set together');
  }

  const privateKey = decodePemKey(privateKeyRaw);
  const publicKey = decodePemKey(publicKeyRaw);

  const keyType = detectKeyType(privateKey);
  const algorithm: KeyAlgorithm = keyType === 'OKP' ? 'EdDSA' : 'RS256';
  const keyId = process.env['KEY_ID'] || randomUUID();

  const { publicJwk, privateJwk } = keyPairToJWK(
    publicKey,
    privateKey,
    keyType,
    algorithm,
    keyId
  );

  return {
    id: keyId,
    publicKey,
    privateKey,
    keyType,
    algorithm,
    status: 'active',
    createdAt: new Date().toISOString(),
    publicJwk,
    privateJwk,
  };
}

// =============================================================================
// Active Key Management
// =============================================================================

let cachedActiveKey: KeyPairWithJWK | null = null;

/**
 * Gets the active signing key
 *
 * Priority:
 * 1. Cached key
 * 2. Environment variables (KEY_PRIVATE + KEY_PUBLIC)
 * 3. Auto-generate (if KEY_AUTO_GENERATE=true)
 */
export async function getActiveKey(): Promise<KeyPairWithJWK> {
  if (cachedActiveKey) {
    return cachedActiveKey;
  }

  // Try env vars
  const envKey = loadKeyPairFromEnv();
  if (envKey) {
    cachedActiveKey = envKey;
    return envKey;
  }

  // Auto-generate if enabled
  if (process.env['KEY_AUTO_GENERATE'] === 'true') {
    const generated = await generateRSAKeyPair({ algorithm: 'RS256' });
    cachedActiveKey = generated;
    return generated;
  }

  throw new Error(
    'No signing key available. Set KEY_PRIVATE/KEY_PUBLIC or KEY_AUTO_GENERATE=true'
  );
}

/**
 * Clears the cached key (for testing)
 */
export function clearKeyCache(): void {
  cachedActiveKey = null;
}
