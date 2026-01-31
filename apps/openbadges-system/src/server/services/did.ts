/**
 * DID (Decentralized Identifier) Service
 *
 * Generates DIDs using did:key and did:web methods, manages Ed25519 keypairs,
 * and creates DID Documents following W3C DID Core specification.
 */

import {
  generateKeyPair,
  createPublicKey,
  randomBytes,
  scryptSync,
  createCipheriv,
  createDecipheriv,
  sign as cryptoSign,
  createPrivateKey,
} from 'crypto'
import { promisify } from 'util'

const generateKeyPairAsync = promisify(generateKeyPair)

// =============================================================================
// Private Key Encryption Utilities
// =============================================================================

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32 // 256 bits for AES-256
const SALT_LENGTH = 16
const IV_LENGTH = 12 // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16

/**
 * Derives an encryption key from the master secret using scrypt
 */
function deriveKey(masterSecret: string, salt: Buffer): Buffer {
  return scryptSync(masterSecret, salt, KEY_LENGTH)
}

/**
 * Encrypts a private key using AES-256-GCM
 *
 * Format: base64(salt:iv:authTag:ciphertext)
 */
export function encryptPrivateKey(privateKey: string, masterSecret: string): string {
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  const key = deriveKey(masterSecret, salt)

  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })

  const encrypted = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Combine salt, iv, authTag, and ciphertext
  const combined = Buffer.concat([salt, iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * Decrypts a private key encrypted with encryptPrivateKey
 *
 * @throws Error if decryption fails (wrong key or corrupted data)
 */
export function decryptPrivateKey(encryptedData: string, masterSecret: string): string {
  const combined = Buffer.from(encryptedData, 'base64')

  const salt = combined.subarray(0, SALT_LENGTH)
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
  const authTag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
  )
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH)

  const key = deriveKey(masterSecret, salt)

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  })
  decipher.setAuthTag(authTag)

  return decipher.update(ciphertext) + decipher.final('utf8')
}

/**
 * Gets the master encryption secret from environment
 * @throws Error if DID_ENCRYPTION_SECRET is not set
 */
export function getEncryptionSecret(): string {
  const secret = process.env.DID_ENCRYPTION_SECRET
  if (!secret) {
    throw new Error(
      'DID_ENCRYPTION_SECRET environment variable is required for private key encryption'
    )
  }
  if (secret.length < 32) {
    throw new Error('DID_ENCRYPTION_SECRET must be at least 32 characters')
  }
  return secret
}

// =============================================================================
// Base58 Encoding Utilities
// =============================================================================

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Encodes bytes to base58-btc format (Bitcoin alphabet)
 */
function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''

  // Convert bytes to a big integer
  let num = BigInt(0)
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    if (byte === undefined) break
    num = num * BigInt(256) + BigInt(byte)
  }

  // Convert to base58
  let result = ''
  while (num > 0) {
    const remainder = num % BigInt(58)
    num = num / BigInt(58)
    result = BASE58_ALPHABET[Number(remainder)] + result
  }

  // Preserve leading zeros
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    if (byte === undefined || byte !== 0) break
    result = BASE58_ALPHABET[0] + result
  }

  return result
}

/**
 * Encodes bytes with multibase prefix 'z' (base58-btc)
 */
function encodeMultibase(bytes: Uint8Array): string {
  return 'z' + encodeBase58(bytes)
}

// =============================================================================
// Types
// =============================================================================

export interface KeyPair {
  publicKey: string // PEM format (SPKI)
  privateKey: string // PEM format (PKCS8)
  publicKeyBytes: Uint8Array // Raw bytes for DID generation
}

export interface DIDDocument {
  '@context': string[]
  id: string
  verificationMethod: VerificationMethod[]
  authentication: string[]
  assertionMethod: string[]
}

export interface VerificationMethod {
  id: string
  type: string
  controller: string
  publicKeyJwk: PublicKeyJwk
}

export interface PublicKeyJwk {
  kty: string
  crv: string
  x: string
}

export interface UserDIDData {
  did: string
  didMethod: 'key' | 'web'
  publicKey: string
  privateKey: string
  didDocument: DIDDocument
}

// =============================================================================
// DID Service
// =============================================================================

export class DIDService {
  /**
   * Generates an Ed25519 key pair for DID operations
   *
   * @returns KeyPair with PEM strings and raw public key bytes
   * @throws Error if key generation fails
   */
  async generateEd25519KeyPair(): Promise<KeyPair> {
    const { publicKey, privateKey } = await generateKeyPairAsync('ed25519', {
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    })

    // Extract raw public key bytes for DID generation
    const publicKeyObject = createPublicKey(publicKey)
    const publicKeyJwk = publicKeyObject.export({ format: 'jwk' }) as {
      kty: string
      crv: string
      x: string
    }

    // The 'x' field in JWK is base64url-encoded (RFC 7517), not standard base64
    const publicKeyBytes = Buffer.from(publicKeyJwk.x, 'base64url')

    return {
      publicKey,
      privateKey,
      publicKeyBytes: new Uint8Array(publicKeyBytes),
    }
  }

  /**
   * Generates a did:key identifier from an Ed25519 public key
   *
   * Format: did:key:z<multibase-encoded-public-key>
   * The multicodec prefix for Ed25519 is 0xed01
   *
   * @param publicKeyBytes - Raw Ed25519 public key bytes (32 bytes)
   * @returns did:key identifier
   */
  generateDidKey(publicKeyBytes: Uint8Array): string {
    // Ed25519 multicodec prefix: 0xed 0x01
    const multicodecPrefix = new Uint8Array([0xed, 0x01])

    // Combine prefix and public key
    const multicodecKey = new Uint8Array(multicodecPrefix.length + publicKeyBytes.length)
    multicodecKey.set(multicodecPrefix)
    multicodecKey.set(publicKeyBytes, multicodecPrefix.length)

    // Encode with multibase (base58-btc, prefix 'z')
    const encoded = encodeMultibase(multicodecKey)

    return `did:key:${encoded}`
  }

  /**
   * Generates a did:web identifier from a domain and optional path
   *
   * Format: did:web:<domain> or did:web:<domain>:<path>
   * The domain is URL-encoded and colons in paths replace slashes
   *
   * @param domain - Domain name (e.g., "badges.example.com")
   * @param path - Optional path (e.g., "user/alice" becomes "user:alice")
   * @returns did:web identifier
   */
  generateDidWeb(domain: string, path?: string): string {
    // URL-encode the domain (per did:web spec)
    const encodedDomain = encodeURIComponent(domain)

    if (path) {
      // Convert path slashes to colons (did:web convention)
      const encodedPath = path.split('/').map(encodeURIComponent).join(':')
      return `did:web:${encodedDomain}:${encodedPath}`
    }

    return `did:web:${encodedDomain}`
  }

  /**
   * Creates a DID Document for a given DID
   *
   * @param did - The DID identifier
   * @param publicKey - Public key in PEM format
   * @returns DID Document following W3C DID Core spec
   */
  createDidDocument(did: string, publicKey: string): DIDDocument {
    // Extract public key in JWK format for the DID Document
    const publicKeyObject = createPublicKey(publicKey)
    const publicKeyJwk = publicKeyObject.export({ format: 'jwk' }) as {
      kty: string
      crv: string
      x: string
    }

    // Extract method-specific identifier from DID (e.g., "z..." for did:key, domain for did:web)
    const didParts = did.split(':')
    const methodSpecificId = didParts[2] ?? 'key-1'
    const verificationMethodId = `${did}#${methodSpecificId}`

    const verificationMethod: VerificationMethod = {
      id: verificationMethodId,
      type: 'JsonWebKey2020',
      controller: did,
      publicKeyJwk: {
        kty: publicKeyJwk.kty,
        crv: publicKeyJwk.crv,
        x: publicKeyJwk.x,
      },
    }

    return {
      '@context': ['https://www.w3.org/ns/did/v1', 'https://w3id.org/security/suites/jws-2020/v1'],
      id: did,
      verificationMethod: [verificationMethod],
      authentication: [verificationMethodId],
      assertionMethod: [verificationMethodId],
    }
  }

  /**
   * Generates complete DID data for a user
   *
   * This method generates a keypair, creates the DID identifier, and creates the DID Document.
   *
   * @param userId - User ID for did:web path (optional)
   * @param method - DID method to use ('key' or 'web')
   * @param domain - Domain for did:web (required if method is 'web')
   * @returns Complete DID data ready for storage
   * @throws Error if method is 'web' but domain is not provided
   */
  async generateUserDID(
    userId: string,
    method: 'key' | 'web',
    domain?: string
  ): Promise<UserDIDData> {
    // Generate Ed25519 keypair
    const keyPair = await this.generateEd25519KeyPair()

    // Generate DID based on method
    let did: string
    if (method === 'key') {
      did = this.generateDidKey(keyPair.publicKeyBytes)
    } else {
      // method === 'web'
      if (!domain) {
        throw new Error('Domain is required for did:web method')
      }
      // Use user ID as path for did:web
      did = this.generateDidWeb(domain, `users/${userId}`)
    }

    // Create DID Document
    const didDocument = this.createDidDocument(did, keyPair.publicKey)

    return {
      did,
      didMethod: method,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      didDocument,
    }
  }

  /**
   * Sign data using Ed25519 private key
   *
   * @param data - Data to sign (as Uint8Array)
   * @param privateKeyPem - Private key in PEM format
   * @returns Signature as Uint8Array
   */
  sign(data: Uint8Array, privateKeyPem: string): Uint8Array {
    const privateKey = createPrivateKey(privateKeyPem)
    const signature = cryptoSign(null, data, privateKey)
    return new Uint8Array(signature)
  }

  /**
   * Get signing key for a user
   *
   * Fetches the user's encrypted private key from the database,
   * decrypts it, and returns it along with the verification method IRI.
   *
   * @param userId - User ID
   * @param getUserById - Function to fetch user record
   * @returns Private key PEM and verification method IRI
   * @throws Error if user not found, has no DID, or decryption fails
   */
  async getSigningKey(
    userId: string,
    getUserById: (id: string) => Promise<{
      did?: string
      didMethod?: 'key' | 'web'
      didPrivateKey?: string
      didDocument?: string
    } | null>
  ): Promise<{ privateKey: string; verificationMethod: string }> {
    // Fetch user record
    const user = await getUserById(userId)
    if (!user) {
      throw new Error(`User not found: ${userId}`)
    }

    if (!user.did || !user.didPrivateKey || !user.didDocument) {
      throw new Error(`User ${userId} does not have a DID configured`)
    }

    // Decrypt private key
    const encryptionSecret = getEncryptionSecret()
    const privateKey = decryptPrivateKey(user.didPrivateKey, encryptionSecret)

    // Extract verification method from DID document
    let didDocument: DIDDocument
    try {
      didDocument = JSON.parse(user.didDocument)
    } catch (error) {
      throw new Error(`Invalid DID Document JSON for user ${userId}`)
    }

    // Get verification method ID
    const verificationMethods = didDocument.verificationMethod
    if (!verificationMethods || verificationMethods.length === 0) {
      throw new Error(`DID Document has no verification methods`)
    }

    const firstMethod = verificationMethods[0]
    if (!firstMethod) {
      throw new Error(`DID Document verification method is invalid`)
    }

    const verificationMethod = firstMethod.id

    return {
      privateKey,
      verificationMethod,
    }
  }
}

// Export singleton instance
export const didService = new DIDService()
