/**
 * Key Storage Service
 *
 * Handles loading cryptographic key pairs from environment variables.
 */

import { randomUUID } from 'crypto';
import * as fs from 'fs';
import type { KeyPairWithJWK, KeyType, KeyAlgorithm, KeyFileFormat } from './types';
import { isValidKeyFileFormat } from './types';
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
// File-based Loading
// =============================================================================

/**
 * Loads a key pair from a JSON file
 *
 * @param filePath - Absolute or relative path to the key file
 * @returns KeyPairWithJWK loaded from the file
 * @throws Error if file doesn't exist, is unreadable, or has invalid format
 */
export async function loadKeyPairFromFile(
  filePath: string
): Promise<KeyPairWithJWK> {
  let content: string;
  try {
    content = await fs.promises.readFile(filePath, 'utf-8');
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`Key file not found: ${filePath}`);
    }
    if (code === 'EACCES') {
      throw new Error(`Permission denied reading key file: ${filePath}`);
    }
    throw new Error(`Failed to read key file: ${(error as Error).message}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error(`Invalid JSON in key file: ${filePath}`);
  }

  if (!isValidKeyFileFormat(data)) {
    throw new Error(`Invalid key file format: ${filePath}`);
  }

  const { publicJwk, privateJwk } = keyPairToJWK(
    data.publicKey,
    data.privateKey,
    data.keyType,
    data.algorithm,
    data.id
  );

  return {
    id: data.id,
    publicKey: data.publicKey,
    privateKey: data.privateKey,
    keyType: data.keyType,
    algorithm: data.algorithm,
    status: 'active',
    createdAt: data.createdAt,
    publicJwk,
    privateJwk,
  };
}

/**
 * Saves a key pair to a JSON file
 *
 * The file is written with restricted permissions (0o600) since it contains
 * the private key.
 *
 * @param keyPair - The key pair to save
 * @param filePath - Path where the key file should be written
 * @throws Error if the file cannot be written
 */
export async function saveKeyPairToFile(
  keyPair: KeyPairWithJWK,
  filePath: string
): Promise<void> {
  const fileData: KeyFileFormat = {
    id: keyPair.id,
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    keyType: keyPair.keyType,
    algorithm: keyPair.algorithm,
    createdAt: keyPair.createdAt,
  };

  try {
    await fs.promises.writeFile(filePath, JSON.stringify(fileData, null, 2), {
      encoding: 'utf-8',
      mode: 0o600,
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error(`Directory does not exist for key file: ${filePath}`);
    }
    if (code === 'EACCES') {
      throw new Error(`Permission denied writing key file: ${filePath}`);
    }
    throw new Error(`Failed to write key file: ${(error as Error).message}`);
  }
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
 * 3. File path (OB_SIGNING_KEY)
 * 4. Auto-generate (if KEY_AUTO_GENERATE=true)
 *    - If OB_SIGNING_KEY is set, saves generated key to that path
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

  // Try file path from OB_SIGNING_KEY
  const keyFilePath = process.env['OB_SIGNING_KEY'];
  if (keyFilePath) {
    try {
      const fileKey = await loadKeyPairFromFile(keyFilePath);
      cachedActiveKey = fileKey;
      return fileKey;
    } catch (error) {
      // File doesn't exist - fall through to auto-generate if enabled
      if (!(error instanceof Error) || !error.message.includes('not found')) {
        throw error;
      }
    }
  }

  // Auto-generate if enabled
  if (process.env['KEY_AUTO_GENERATE'] === 'true') {
    const generated = await generateRSAKeyPair({ algorithm: 'RS256' });

    // Save to file if OB_SIGNING_KEY is set
    if (keyFilePath) {
      await saveKeyPairToFile(generated, keyFilePath);
    }

    cachedActiveKey = generated;
    return generated;
  }

  throw new Error(
    'No signing key available. Set KEY_PRIVATE/KEY_PUBLIC, OB_SIGNING_KEY, or KEY_AUTO_GENERATE=true'
  );
}

/**
 * Clears the cached key (for testing)
 */
export function clearKeyCache(): void {
  cachedActiveKey = null;
}
