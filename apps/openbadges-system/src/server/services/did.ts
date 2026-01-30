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
}

// Export singleton instance
export const didService = new DIDService()
