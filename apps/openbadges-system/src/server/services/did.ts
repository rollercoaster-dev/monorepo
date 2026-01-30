/**
 * DID (Decentralized Identifier) Service
 *
 * Generates DIDs using did:key and did:web methods, manages Ed25519 keypairs,
 * and creates DID Documents following W3C DID Core specification.
 */

import { generateKeyPair, createPublicKey } from 'crypto'
import { promisify } from 'util'

const generateKeyPairAsync = promisify(generateKeyPair)

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

    // The 'x' field in JWK is the base64url-encoded public key
    const publicKeyBytes = Buffer.from(publicKeyJwk.x, 'base64')

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

    const verificationMethodId = `${did}#${did.split(':')[2]}`

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
}

// Export singleton instance
export const didService = new DIDService()
