/**
 * Proof Signing Service
 *
 * Implements cryptographic proof signing for Open Badges 3.0 credentials
 * using Ed25519 and JWS signatures.
 *
 * @see https://www.w3.org/TR/vc-data-model-2.0/#proofs-signatures
 * @see https://www.w3.org/TR/vc-data-integrity/
 */

import { sign as cryptoSign, createPrivateKey } from 'crypto'
import type { OB3, Shared } from 'openbadges-types'

// =============================================================================
// Base58 Encoding for Multibase
// =============================================================================

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Encodes bytes to base58-btc format (Bitcoin alphabet)
 */
function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''

  let num = BigInt(0)
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]
    if (byte === undefined) break
    num = num * BigInt(256) + BigInt(byte)
  }

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
// JSON Canonicalization
// =============================================================================

/**
 * Canonicalize JSON document
 *
 * Simple JSON canonicalization (not full JSON-LD normalization).
 * Sorts keys recursively to ensure deterministic serialization.
 *
 * @param document - Document to canonicalize (with proof removed)
 * @returns Canonicalized string
 */
function canonicalizeDocument(document: Record<string, unknown>): string {
  // Remove proof field if present
  const { proof: _proof, ...docWithoutProof } = document

  const sortKeys = (obj: unknown): unknown => {
    if (Array.isArray(obj)) {
      return obj.map(sortKeys)
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj)
        .sort()
        .reduce(
          (result, key) => {
            result[key] = sortKeys((obj as Record<string, unknown>)[key])
            return result
          },
          {} as Record<string, unknown>
        )
    }
    return obj
  }

  return JSON.stringify(sortKeys(docWithoutProof))
}

// =============================================================================
// ProofService
// =============================================================================

export interface SignCredentialOptions {
  proofType?: 'Ed25519Signature2020' | 'DataIntegrityProof'
  cryptosuite?: 'eddsa-rdfc-2022'
  proofPurpose?: 'assertionMethod' | 'authentication'
}

export class ProofService {
  /**
   * Sign a credential with Ed25519Signature2020
   *
   * @param credential - The credential to sign (without proof)
   * @param privateKeyPem - Private key in PEM format
   * @param verificationMethod - DID verification method IRI
   * @param options - Signing options
   * @returns Signed credential with embedded proof
   */
  async signCredential(
    credential: OB3.VerifiableCredential,
    privateKeyPem: string,
    verificationMethod: string,
    options: SignCredentialOptions = {}
  ): Promise<OB3.VerifiableCredential> {
    const {
      proofType = 'Ed25519Signature2020',
      cryptosuite,
      proofPurpose = 'assertionMethod',
    } = options

    // Canonicalize the credential (remove proof if present)
    const canonicalDocument = canonicalizeDocument(credential as Record<string, unknown>)

    // Sign the canonical document using Ed25519
    const documentBytes = Buffer.from(canonicalDocument, 'utf8')
    const privateKey = createPrivateKey(privateKeyPem)

    const signatureBuffer = cryptoSign(null, documentBytes, privateKey)
    const signatureBytes = new Uint8Array(signatureBuffer)

    // Encode signature as multibase (base58-btc with 'z' prefix)
    const proofValue = encodeMultibase(signatureBytes)

    // Build proof object
    const proof: OB3.Proof = {
      type: proofType,
      created: new Date().toISOString() as Shared.DateTime,
      verificationMethod: verificationMethod as Shared.IRI,
      proofPurpose,
      proofValue,
    }

    // Add cryptosuite for DataIntegrityProof
    if (proofType === 'DataIntegrityProof' && cryptosuite) {
      proof.cryptosuite = cryptosuite
    }

    // Return credential with proof
    return {
      ...credential,
      proof,
    }
  }

  /**
   * Sign a credential with JsonWebSignature2020 (detached JWS)
   *
   * @param credential - The credential to sign (without proof)
   * @param privateKeyPem - Private key in PEM format
   * @param verificationMethod - DID verification method IRI
   * @param options - Signing options
   * @returns Signed credential with embedded proof
   */
  async signCredentialWithJWS(
    credential: OB3.VerifiableCredential,
    privateKeyPem: string,
    verificationMethod: string,
    options: SignCredentialOptions = {}
  ): Promise<OB3.VerifiableCredential> {
    // Import jose for JWS operations
    const jose = await import('jose')

    const { proofPurpose = 'assertionMethod' } = options

    // Canonicalize the credential
    const canonicalDocument = canonicalizeDocument(credential as Record<string, unknown>)

    // Import private key as JWK
    const privateKey = await jose.importPKCS8(privateKeyPem, 'EdDSA')

    // Create JWS with detached payload
    const encoder = new TextEncoder()
    const payload = encoder.encode(canonicalDocument)

    // Sign using compact JWS
    const jws = await new jose.CompactSign(payload)
      .setProtectedHeader({ alg: 'EdDSA', b64: false, crit: ['b64'] })
      .sign(privateKey)

    // Extract header and signature for detached JWS format
    const [header, , signature] = jws.split('.')
    const proofValue = `${header}..${signature}`

    // Build proof object
    const proof: OB3.Proof = {
      type: 'JsonWebSignature2020',
      created: new Date().toISOString() as Shared.DateTime,
      verificationMethod: verificationMethod as Shared.IRI,
      proofPurpose,
      proofValue,
    }

    return {
      ...credential,
      proof,
    }
  }
}

// Export singleton instance
export const proofService = new ProofService()
